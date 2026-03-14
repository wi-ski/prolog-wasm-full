/**
 * Basic Prolog queries from TypeScript.
 *
 * Run:  npx tsx examples/01-hello.ts
 *
 * Output:
 *   X = hello
 *   Members: a, b, c
 *   2 + 3 = 5
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  // Single result
  const r = pl.query('X = hello').first();
  console.log('X =', r?.X);

  // All solutions
  const members = pl.query('member(X, [a, b, c])').all();
  console.log('Members:', members.map(m => m.X).join(', '));

  // Arithmetic
  const sum = pl.query('X is 2 + 3').first();
  console.log('2 + 3 =', sum?.X);

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
