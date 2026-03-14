import { describe, it, expect, beforeAll } from 'vitest';
import { initProlog } from '../init.js';
import type { PrologFull } from '../types.js';

let pl: PrologFull;
beforeAll(async () => { pl = await initProlog(); });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLP(B) — Boolean constraint solving
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('CLP(B)', () => {
  beforeAll(() => {
    pl.consult(':- use_module(library(clpb)).');
  });

  it('sat/1 with labeling enumerates satisfying assignments', () => {
    pl.consult('clpb_and(X, Y) :- sat(X * Y), labeling([X, Y]).');
    const results = pl.query('clpb_and(X, Y)').all();
    expect(results.length).toBe(1);
    expect(results[0].X).toBe(1);
    expect(results[0].Y).toBe(1);
  });

  it('sat/1 OR enumerates all 3 satisfying assignments', () => {
    pl.consult('clpb_or(X, Y) :- sat(X + Y), labeling([X, Y]).');
    const results = pl.query('clpb_or(X, Y)').all();
    expect(results.length).toBe(3);
  });

  it('taut/2 detects tautologies', () => {
    const r = pl.query('taut(X + ~X, T)').first();
    expect(r).not.toBeNull();
    expect(r!.T).toBe(1);
  });

  it('taut/2 returns 0 for contradictions', () => {
    const r = pl.query('taut(X * ~X, T)').first();
    expect(r).not.toBeNull();
    expect(r!.T).toBe(0);
  });

  it('sat/1 with negation', () => {
    pl.consult('clpb_xor(X, Y) :- sat(X # Y), labeling([X, Y]).');
    const results = pl.query('clpb_xor(X, Y)').all();
    expect(results.length).toBe(2);
    const pairs = results.map(r => [r.X, r.Y]);
    expect(pairs).toContainEqual([0, 1]);
    expect(pairs).toContainEqual([1, 0]);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DCG — Definite Clause Grammars
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('DCG', () => {
  beforeAll(() => {
    pl.consult(`
      greeting --> [hello], target.
      greeting --> [hi], target.
      target --> [world].
      target --> [prolog].
    `);
  });

  it('phrase/2 parses a valid sentence', () => {
    const r = pl.query('phrase(greeting, [hello, world])').first();
    expect(r).not.toBeNull();
  });

  it('phrase/2 rejects an invalid sentence', () => {
    const r = pl.query('phrase(greeting, [foo, bar])').first();
    expect(r).toBeNull();
  });

  it('phrase/2 enumerates all valid parses via findall', () => {
    const r = pl.query('findall(S, phrase(greeting, S), Ss)').first();
    expect(r).not.toBeNull();
    const sentences = r!.Ss as unknown[];
    expect(sentences.length).toBe(4);
  });

  it('phrase/3 gives remainder', () => {
    const r = pl.query('phrase(greeting, [hello, world, extra], Rest)').first();
    expect(r).not.toBeNull();
    expect(r!.Rest).toEqual(['extra']);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tabling (memoization)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Tabling', () => {
  it('tabled fibonacci computes correctly', () => {
    pl.consult(`
      :- table tfib/2.
      tfib(0, 0). tfib(1, 1).
      tfib(N, F) :- N > 1, N1 is N-1, N2 is N-2, tfib(N1, F1), tfib(N2, F2), F is F1+F2.
    `);
    const r = pl.query('tfib(20, F)').first();
    expect(r).not.toBeNull();
    expect(r!.F).toBe(6765);
  });

  it('tabled predicate handles cycles without infinite loop', () => {
    pl.consult(`
      :- table treach/2.
      tedge(a, b). tedge(b, c). tedge(c, a). tedge(c, d).
      treach(X, Y) :- tedge(X, Y).
      treach(X, Y) :- tedge(X, Z), treach(Z, Y).
    `);
    const r = pl.query('findall(Y, treach(a, Y), Ys)').first();
    expect(r).not.toBeNull();
    const ys = r!.Ys as string[];
    expect(ys).toContain('b');
    expect(ys).toContain('c');
    expect(ys).toContain('d');
    expect(ys).toContain('a');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// solution_sequences
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('solution_sequences', () => {
  beforeAll(() => {
    pl.consult(':- use_module(library(solution_sequences)).');
    pl.consult('ss_num(1). ss_num(2). ss_num(3). ss_num(4). ss_num(5).');
    pl.consult('ss_dup(1). ss_dup(2). ss_dup(1). ss_dup(3). ss_dup(2). ss_dup(3).');
  });

  it('limit/2 restricts number of solutions', () => {
    const r = pl.query('findall(X, limit(3, ss_num(X)), Xs)').first();
    expect(r).not.toBeNull();
    expect(r!.Xs).toEqual([1, 2, 3]);
  });

  it('offset/2 skips initial solutions', () => {
    const r = pl.query('findall(X, offset(2, ss_num(X)), Xs)').first();
    expect(r).not.toBeNull();
    expect(r!.Xs).toEqual([3, 4, 5]);
  });

  it('distinct/2 removes duplicates', () => {
    const r = pl.query('findall(X, distinct(X, ss_dup(X)), Xs)').first();
    expect(r).not.toBeNull();
    expect(r!.Xs).toEqual([1, 2, 3]);
  });

  it('limit + offset combine for pagination', () => {
    const r = pl.query('findall(X, limit(2, offset(1, ss_num(X))), Xs)').first();
    expect(r).not.toBeNull();
    expect(r!.Xs).toEqual([2, 3]);
  });
});
