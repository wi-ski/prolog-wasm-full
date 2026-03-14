/**
 * Tabling (memoization): automatic caching for recursive predicates.
 *
 * Without tabling, naive fibonacci is exponential. With tabling,
 * it's linear. Also shows cycle-safe transitive closure.
 *
 * Run:  npx tsx examples/12-tabling.ts
 *
 * Output:
 *   fib(10) = 55
 *   fib(30) = 832040
 *   Reachable from a: [b, c, d]
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  pl.consult(`
    :- table fib/2.
    fib(0, 0).
    fib(1, 1).
    fib(N, F) :- N > 1, N1 is N - 1, N2 is N - 2, fib(N1, F1), fib(N2, F2), F is F1 + F2.
  `);

  const f10 = pl.query('fib(10, F)').first();
  console.log('fib(10) =', f10?.F);

  const f30 = pl.query('fib(30, F)').first();
  console.log('fib(30) =', f30?.F);

  pl.consult(`
    :- table reachable/2.
    edge(a, b). edge(b, c). edge(c, d). edge(d, b).
    reachable(X, Y) :- edge(X, Y).
    reachable(X, Y) :- edge(X, Z), reachable(Z, Y).
  `);

  const reach = pl.query('findall(Y, reachable(a, Y), Ys)').first();
  console.log('Reachable from a:', JSON.stringify(reach?.Ys));

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
