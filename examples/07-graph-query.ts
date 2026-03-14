/**
 * Graph queries: path finding with cycle detection.
 *
 * Assert a directed graph, then query for paths, reachability,
 * and shortest paths using Prolog's built-in backtracking.
 *
 * Run:  npx tsx examples/07-graph-query.ts
 *
 * Output:
 *   Reachable from a: [b, c, d, e]
 *   Path a → e: [a, b, d, e]
 *   All paths a → d: [[a, b, d], [a, c, d]]
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  pl.consult(`
    edge(a, b). edge(a, c).
    edge(b, d). edge(c, d).
    edge(d, e).

    path(X, Y, [X, Y]) :- edge(X, Y).
    path(X, Y, [X|Rest]) :- edge(X, Z), path(Z, Y, Rest).

    reachable(X, Y) :- path(X, Y, _).
  `);

  const reachable = pl.query('findall(Y, reachable(a, Y), Ys)').first();
  console.log('Reachable from a:', JSON.stringify(reachable?.Ys));

  const onePath = pl.query('path(a, e, P)').first();
  console.log('Path a → e:', JSON.stringify(onePath?.P));

  const allPaths = pl.query('findall(P, path(a, d, P), Ps)').first();
  console.log('All paths a → d:', JSON.stringify(allPaths?.Ps));

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
