/**
 * JS-implemented Prolog predicates: the killer feature.
 *
 * Registers a JS function as a Prolog predicate. Prolog calls it
 * during inference — your app's runtime state is queryable from rules.
 *
 * Run:  npx tsx examples/02-foreign-predicate.ts
 *
 * Output:
 *   alice can read: true
 *   alice can delete: false
 *   bob can read: true
 *   bob can write: false
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  const permissions: Record<string, string[]> = {
    alice: ['read', 'write'],
    bob: ['read'],
  };

  const dispose = pl.registerForeign('has_permission', 2, (user, perm) => {
    return permissions[user as string]?.includes(perm as string) ?? false;
  });

  for (const [user, perm] of [['alice', 'read'], ['alice', 'delete'], ['bob', 'read'], ['bob', 'write']]) {
    const r = pl.query(`has_permission(${user}, ${perm})`).first();
    console.log(`${user} can ${perm}: ${r !== null}`);
  }

  dispose();
  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
