import { describe, it, expect, beforeAll } from 'vitest';
import { initProlog } from '../init.js';
import type { PrologFull } from '../types.js';

let pl: PrologFull;
beforeAll(async () => {
  pl = await initProlog();
  pl.consult(':- use_module(library(clpfd)).');
});

describe('CLP(FD) constraint solving', () => {
  it('solves a simple constraint', () => {
    pl.consult(`
      simple_solve(X, Y) :-
        X in 1..5, Y in 1..5,
        X + Y #= 7, X #< Y,
        label([X, Y]).
    `);
    const r = pl.query('simple_solve(X, Y)').first();
    expect(r).not.toBeNull();
    expect((r!.X as number) + (r!.Y as number)).toBe(7);
    expect(r!.X as number).toBeLessThan(r!.Y as number);
  });

  it('enumerates all solutions', () => {
    pl.consult(`
      pair_solve(X, Y) :-
        X in 1..3, Y in 1..3,
        X #< Y,
        label([X, Y]).
    `);
    const results = pl.query('pair_solve(X, Y)').all();
    expect(results.length).toBe(3);
    const pairs = results.map(r => [r.X, r.Y]);
    expect(pairs).toContainEqual([1, 2]);
    expect(pairs).toContainEqual([1, 3]);
    expect(pairs).toContainEqual([2, 3]);
  });

  it('detects unsatisfiable constraints', () => {
    pl.consult(`
      unsat_solve(X) :-
        X in 1..3, X #> 10,
        label([X]).
    `);
    const r = pl.query('unsat_solve(X)').first();
    expect(r).toBeNull();
  });

  it('solves all_different (N-queens style)', () => {
    pl.consult(`
      queens(N, Qs) :-
        length(Qs, N),
        Qs ins 1..N,
        safe_queens(Qs),
        label(Qs).
      safe_queens([]).
      safe_queens([Q|Qs]) :- safe_queens(Qs, Q, 1), safe_queens(Qs).
      safe_queens([], _, _).
      safe_queens([Q|Qs], Q0, D0) :-
        Q0 #\\= Q,
        abs(Q0 - Q) #\\= D0,
        D1 #= D0 + 1,
        safe_queens(Qs, Q0, D1).
    `);
    const r = pl.query('queens(4, Qs)').first();
    expect(r).not.toBeNull();
    const qs = r!.Qs as number[];
    expect(qs.length).toBe(4);
    expect(new Set(qs).size).toBe(4);
  });

  it('integrates CLP(FD) with a foreign predicate', () => {
    const blocked = new Set([3, 7]);
    const dispose = pl.registerForeign('js_not_blocked', 1, (x) => {
      return !blocked.has(x as number);
    });

    pl.consult(`
      filtered_solve(X) :-
        X in 1..10,
        label([X]),
        js_not_blocked(X).
    `);
    const results = pl.query('findall(X, filtered_solve(X), Xs)').first();
    expect(results).not.toBeNull();
    const xs = results!.Xs as number[];
    expect(xs).not.toContain(3);
    expect(xs).not.toContain(7);
    expect(xs.length).toBe(8);
    dispose();
  });
});
