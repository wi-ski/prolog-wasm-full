import { describe, it, expect, beforeAll } from 'vitest';
import { initProlog } from '../init.js';
import type { PrologFull } from '../types.js';
import { PL_Q_NORMAL, CVT_ALL, BUF_STACK, REP_UTF8 } from '../types.js';

let pl: PrologFull;
beforeAll(async () => { pl = await initProlog(); });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Error handling', () => {
  it('query for undefined predicate returns null', () => {
    const r = pl.query('totally_undefined_pred_xyz(1)').first();
    expect(r).toBeNull();
  });

  it('query with syntax error returns null without crashing', () => {
    const r = pl.query('member(X, [1,2,3').first();
    expect(r).toBeNull();
  });

  it('exception in foreign predicate does not corrupt state', () => {
    const dispose = pl.registerForeign('err_throw', 0, () => { throw new Error('boom'); });
    const r1 = pl.query('err_throw').first();
    expect(r1).toBeNull();

    const r2 = pl.query('X = works_after_error').first();
    expect(r2).not.toBeNull();
    expect(r2!.X).toBe('works_after_error');
    dispose();
  });

  it('multiple failed queries in succession work fine', () => {
    for (let i = 0; i < 10; i++) {
      expect(pl.query('fail').first()).toBeNull();
    }
    const r = pl.query('X = ok').first();
    expect(r!.X).toBe('ok');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Raw PL_* API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Raw PL_* API', () => {
  it('new_term_ref creates a valid term reference', () => {
    const t = pl.pl.new_term_ref();
    expect(typeof t).toBe('number');
    expect(t).toBeGreaterThan(0);
  });

  it('put_integer / get_integer roundtrip', () => {
    const t = pl.pl.new_term_ref();
    pl.pl.put_integer(t, 42);
    expect(pl.pl.get_integer(t)).toBe(42);
  });

  it('put_float / get_float roundtrip', () => {
    const t = pl.pl.new_term_ref();
    pl.pl.put_float(t, 3.14);
    const v = pl.pl.get_float(t);
    expect(v).not.toBeNull();
    expect(v!).toBeCloseTo(3.14, 2);
  });

  it('put_atom_chars / get_atom_chars roundtrip', () => {
    const t = pl.pl.new_term_ref();
    pl.pl.put_atom_chars(t, 'hello');
    expect(pl.pl.get_atom_chars(t)).toBe('hello');
  });

  it('new_atom / atom_chars roundtrip', () => {
    const a = pl.pl.new_atom('test_atom');
    expect(pl.pl.atom_chars(a)).toBe('test_atom');
  });

  it('put_nil / get_nil', () => {
    const t = pl.pl.new_term_ref();
    pl.pl.put_nil(t);
    expect(pl.pl.get_nil(t)).toBe(true);
  });

  it('foreign frame open/close preserves terms', () => {
    const outer = pl.pl.new_term_ref();
    pl.pl.put_integer(outer, 100);

    const fid = pl.pl.open_foreign_frame();
    const inner = pl.pl.new_term_ref();
    pl.pl.put_integer(inner, 200);
    expect(pl.pl.get_integer(inner)).toBe(200);
    pl.pl.close_foreign_frame(fid);

    expect(pl.pl.get_integer(outer)).toBe(100);
  });

  it('discard_foreign_frame rolls back', () => {
    const fid = pl.pl.open_foreign_frame();
    const t = pl.pl.new_term_ref();
    pl.pl.put_integer(t, 999);
    pl.pl.discard_foreign_frame(fid);
  });

  it('manual open_query / next_solution / close_query', () => {
    const pred = pl.pl.predicate('member', 2, 'user');
    const args = pl.pl.new_term_refs(2);
    pl.pl.put_variable(args);
    pl.pl.chars_to_term('[10, 20, 30]', (args + 1) as any);

    const qid = pl.pl.open_query(null, PL_Q_NORMAL, pred, args);
    const results: number[] = [];
    while (pl.pl.next_solution(qid)) {
      const v = pl.pl.get_integer(args);
      if (v !== null) results.push(v);
    }
    pl.pl.close_query(qid);

    expect(results).toEqual([10, 20, 30]);
  });

  it('term_type correctly identifies term types', () => {
    const t = pl.pl.new_term_ref();
    pl.pl.put_integer(t, 5);
    expect(pl.pl.is_integer(t)).toBe(true);
    expect(pl.pl.is_atom(t)).toBe(false);
    expect(pl.pl.is_float(t)).toBe(false);

    pl.pl.put_atom_chars(t, 'hi');
    expect(pl.pl.is_atom(t)).toBe(true);
    expect(pl.pl.is_integer(t)).toBe(false);

    pl.pl.put_float(t, 1.5);
    expect(pl.pl.is_float(t)).toBe(true);
  });

  it('unify_integer succeeds and fails correctly', () => {
    const t = pl.pl.new_term_ref();
    pl.pl.put_variable(t);
    expect(pl.pl.unify_integer(t, 42)).toBe(true);
    expect(pl.pl.get_integer(t)).toBe(42);

    expect(pl.pl.unify_integer(t, 99)).toBe(false);
  });

  it('chars_to_term parses complex terms', () => {
    const t = pl.pl.new_term_ref();
    pl.pl.chars_to_term('foo(bar, 42, [1,2,3])', t);

    const info = pl.pl.get_compound_name_arity(t);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('foo');
    expect(info!.arity).toBe(3);

    const a1 = pl.pl.new_term_ref();
    pl.pl.get_arg(1, t, a1);
    expect(pl.pl.get_atom_chars(a1)).toBe('bar');

    const a2 = pl.pl.new_term_ref();
    pl.pl.get_arg(2, t, a2);
    expect(pl.pl.get_integer(a2)).toBe(42);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Advanced consult
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Advanced consult', () => {
  it('consult loads use_module directives', () => {
    pl.consult(':- use_module(library(lists)).');
    const r = pl.query('msort([3,1,2], X)').first();
    expect(r).not.toBeNull();
    expect(r!.X).toEqual([1, 2, 3]);
  });

  it('multiple consult calls accumulate predicates', () => {
    pl.consult('mc_a(1).');
    pl.consult('mc_b(2).');
    const r = pl.query('mc_a(X), mc_b(Y)').first();
    expect(r).not.toBeNull();
    expect(r!.X).toBe(1);
    expect(r!.Y).toBe(2);
  });

  it('consult with multiline rules', () => {
    pl.consult(`
      mc_fib(0, 0).
      mc_fib(1, 1).
      mc_fib(N, F) :-
        N > 1,
        N1 is N - 1,
        N2 is N - 2,
        mc_fib(N1, F1),
        mc_fib(N2, F2),
        F is F1 + F2.
    `);
    const r = pl.query('mc_fib(10, F)').first();
    expect(r!.F).toBe(55);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Lifecycle
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Lifecycle', () => {
  it('registerForeign + dispose cycle works multiple times', () => {
    for (let i = 0; i < 5; i++) {
      const dispose = pl.registerForeign(`lc_test_${i}`, 0, () => true);
      expect(pl.query(`lc_test_${i}`).first()).not.toBeNull();
      dispose();
    }
  });

  it('assert + retract + assert cycle', () => {
    pl.assertClause('lc_fact(1)');
    expect(pl.query('lc_fact(1)').first()).not.toBeNull();

    pl.stock.call('retract(lc_fact(1))');
    expect(pl.query('lc_fact(1)').first()).toBeNull();

    pl.assertClause('lc_fact(2)');
    expect(pl.query('lc_fact(X)').first()!.X).toBe(2);
  });

  it('query().all() on empty result set returns empty array', () => {
    const results = pl.query('member(X, [])').all();
    expect(results).toEqual([]);
  });

  it('query().forEach() on empty result set calls callback zero times', () => {
    let count = 0;
    pl.query('fail').forEach(() => count++);
    expect(count).toBe(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Complex term marshaling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Complex term marshaling', () => {
  it('deeply nested lists', () => {
    const r = pl.query('X = [[[1]], [[2, 3]]]').first();
    expect(r!.X).toEqual([[[1]], [[2, 3]]]);
  });

  it('large list (100 elements)', () => {
    const r = pl.query('numlist(1, 100, X)').first();
    expect(r).not.toBeNull();
    const xs = r!.X as number[];
    expect(xs.length).toBe(100);
    expect(xs[0]).toBe(1);
    expect(xs[99]).toBe(100);
  });

  it('negative numbers', () => {
    const r = pl.query('X is -42').first();
    expect(r!.X).toBe(-42);
  });

  it('zero', () => {
    const r = pl.query('X is 0').first();
    expect(r!.X).toBe(0);
  });

  it('large integers', () => {
    const r = pl.query('X is 2 ** 30').first();
    expect(r!.X).toBe(1073741824);
  });

  it('float precision', () => {
    const r = pl.query('X is 1.0 / 3.0').first();
    expect(typeof r!.X).toBe('number');
    expect(r!.X as number).toBeCloseTo(0.3333, 3);
  });

  it('mixed type list', () => {
    const r = pl.query('X = [hello, 42, 3.14, [], [nested]]').first();
    const xs = r!.X as unknown[];
    expect(xs[0]).toBe('hello');
    expect(xs[1]).toBe(42);
    expect(xs[3]).toEqual([]);
    expect(xs[4]).toEqual(['nested']);
  });

  it('compound term with 4+ args', () => {
    const r = pl.query('X = point(1, 2, 3, 4)').first();
    expect(r!.X).toBeDefined();
    const v = r!.X as any;
    expect(v.functor || v.args).toBeDefined();
  });
});
