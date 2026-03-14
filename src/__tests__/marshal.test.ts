import { describe, it, expect, beforeAll } from 'vitest';
import { initProlog } from '../init.js';
import type { PrologFull } from '../types.js';

let pl: PrologFull;
beforeAll(async () => { pl = await initProlog(); });

describe('term marshaling — Prolog → JS', () => {
  it('marshals atoms to strings', () => {
    const r = pl.query('X = hello').first();
    expect(r!.X).toBe('hello');
  });

  it('marshals integers to numbers', () => {
    const r = pl.query('X = 42').first();
    expect(r!.X).toBe(42);
  });

  it('marshals floats to numbers', () => {
    const r = pl.query('X is 3.14').first();
    expect(typeof r!.X).toBe('number');
    expect(r!.X as number).toBeCloseTo(3.14, 2);
  });

  it('marshals empty list to empty array', () => {
    const r = pl.query('X = []').first();
    expect(r!.X).toEqual([]);
  });

  it('marshals list of atoms to array of strings', () => {
    const r = pl.query('X = [a, b, c]').first();
    expect(r!.X).toEqual(['a', 'b', 'c']);
  });

  it('marshals list of integers to array of numbers', () => {
    const r = pl.query('X = [1, 2, 3]').first();
    expect(r!.X).toEqual([1, 2, 3]);
  });

  it('marshals mixed list', () => {
    const r = pl.query('X = [hello, 42, 3.14]').first();
    expect(Array.isArray(r!.X)).toBe(true);
    const arr = r!.X as unknown[];
    expect(arr[0]).toBe('hello');
    expect(arr[1]).toBe(42);
  });

  it('marshals nested lists', () => {
    const r = pl.query('X = [[1,2],[3,4]]').first();
    expect(r!.X).toEqual([[1,2],[3,4]]);
  });

  it('marshals true/false atoms as strings via stock query', () => {
    const r1 = pl.query('X = true').first();
    expect(r1!.X).toBe('true');
    const r2 = pl.query('X = false').first();
    expect(r2!.X).toBe('false');
  });

  it('marshals pairs (Key-Value) as PrologCompound via stock query', () => {
    const r = pl.query('X = a-1').first();
    expect(r!.X).toBeDefined();
    const v = r!.X as any;
    expect(v.functor || v['-']).toBeDefined();
  });
});

describe('term marshaling — JS → Prolog (via foreign predicates)', () => {
  it('passes strings to Prolog as atoms', () => {
    const dispose = pl.registerForeign('js_get_name', 1, (name) => {
      return name === 'test_name';
    });
    pl.assertClause('check_name :- js_get_name(test_name)');
    expect(pl.query('check_name').first()).not.toBeNull();
    dispose();
  });

  it('passes integers to Prolog', () => {
    const dispose = pl.registerForeign('js_check_num', 1, (n) => {
      return (n as number) === 42;
    });
    expect(pl.query('js_check_num(42)').first()).not.toBeNull();
    expect(pl.query('js_check_num(99)').first()).toBeNull();
    dispose();
  });

  it('passes floats to Prolog', () => {
    const dispose = pl.registerForeign('js_check_float', 1, (f) => {
      return Math.abs((f as number) - 3.14) < 0.01;
    });
    expect(pl.query('js_check_float(3.14)').first()).not.toBeNull();
    dispose();
  });
});
