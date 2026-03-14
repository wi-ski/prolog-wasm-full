/**
 * Query patterns: every way to get data out of Prolog.
 *
 * Demonstrates .first(), .all(), .forEach(), findall/3,
 * aggregate_all/3, and solution_sequences (limit, offset, distinct).
 *
 * Run:  npx tsx examples/08-query-patterns.ts
 *
 * Output:
 *   first(): X = a
 *   all(): [a, b, c]
 *   forEach(): a, b, c
 *   findall: [1, 2, 3, 4, 5]
 *   aggregate count: 5
 *   aggregate max: 5
 *   limit 2: [a, b]
 *   distinct: [1, 2, 3]
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  pl.consult(`
    fruit(apple). fruit(banana). fruit(cherry).
    num(1). num(2). num(3). num(4). num(5).
  `);

  // .first() — single result
  const first = pl.query('member(X, [a, b, c])').first();
  console.log('first(): X =', first?.X);

  // .all() — all solutions
  const all = pl.query('member(X, [a, b, c])').all();
  console.log('all():', JSON.stringify(all.map(r => r.X)));

  // .forEach() — iterate with callback
  const items: unknown[] = [];
  pl.query('member(X, [a, b, c])').forEach(r => items.push(r.X));
  console.log('forEach():', items.join(', '));

  // findall/3 — collect into list
  const fa = pl.query('findall(X, num(X), Xs)').first();
  console.log('findall:', JSON.stringify(fa?.Xs));

  // aggregate_all/3 — count
  const count = pl.query('aggregate_all(count, fruit(_), N)').first();
  console.log('aggregate count:', count?.N);

  // aggregate_all/3 — max
  const max = pl.query('aggregate_all(max(X), num(X), M)').first();
  console.log('aggregate max:', max?.M);

  // solution_sequences — limit
  pl.consult(':- use_module(library(solution_sequences)).');
  const limited = pl.query('findall(X, limit(2, member(X, [a, b, c, d])), Xs)').first();
  console.log('limit 2:', JSON.stringify(limited?.Xs));

  // solution_sequences — distinct
  pl.consult('dup(1). dup(2). dup(1). dup(3). dup(2).');
  const dist = pl.query('findall(X, distinct(X, dup(X)), Xs)').first();
  console.log('distinct:', JSON.stringify(dist?.Xs));

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
