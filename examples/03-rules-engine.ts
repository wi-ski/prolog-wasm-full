/**
 * Rules engine: load rules from a string, query with JS data.
 *
 * Prolog handles the inference. JS provides the ground truth via
 * foreign predicates. Rules are hot-reloadable.
 *
 * Run:  npx tsx examples/03-rules-engine.ts
 *
 * Output:
 *   alice can access: ["dashboard", "settings"]
 *   bob can access: ["dashboard"]
 *   eve can access: []
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  const users: Record<string, { role: string }> = {
    alice: { role: 'admin' },
    bob: { role: 'viewer' },
    eve: { role: 'guest' },
  };

  pl.registerForeign('user_role', 2, (user, role) => {
    return users[user as string]?.role === role;
  });

  pl.consult(`
    can_access(User, dashboard) :- user_role(User, _).
    can_access(User, settings) :- user_role(User, admin).
    can_access(User, reports) :- user_role(User, admin).
    can_access(User, reports) :- user_role(User, viewer).
  `);

  for (const user of ['alice', 'bob', 'eve']) {
    const r = pl.query(`findall(R, can_access(${user}, R), Rs)`).first();
    console.log(`${user} can access: ${JSON.stringify(r?.Rs)}`);
  }

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
