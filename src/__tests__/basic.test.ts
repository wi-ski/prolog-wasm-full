import { describe, it, expect, beforeAll } from 'vitest';
import { initProlog } from '../init.js';
import type { PrologFull } from '../types.js';

let pl: PrologFull;
beforeAll(async () => { pl = await initProlog(); });

describe('initialization', () => {
  it('initializes without error', () => {
    expect(pl).toBeDefined();
    expect(pl.em).toBeDefined();
    expect(pl.pl).toBeDefined();
    expect(pl.stock).toBeDefined();
  });

  it('exposes addFunction on the module', () => {
    expect(typeof pl.em.addFunction).toBe('function');
  });

  it('exposes ccall on the module', () => {
    expect(typeof pl.em.ccall).toBe('function');
  });

  it('exposes wasmTable on the module', () => {
    expect(pl.em.wasmTable).toBeDefined();
    expect(typeof pl.em.wasmTable.grow).toBe('function');
  });
});

describe('query API', () => {
  it('query().first() returns bindings for a single result', () => {
    const r = pl.query('X = hello').first();
    expect(r).not.toBeNull();
    expect(r!.X).toBe('hello');
  });

  it('query().first() returns null for failing query', () => {
    const r = pl.query('fail').first();
    expect(r).toBeNull();
  });

  it('query().all() returns all solutions', () => {
    const results = pl.query('member(X, [a, b, c])').all();
    expect(results.length).toBe(3);
    expect(results.map(r => r.X)).toEqual(['a', 'b', 'c']);
  });

  it('query().forEach() iterates all solutions', () => {
    const items: unknown[] = [];
    pl.query('member(X, [1, 2, 3])').forEach(r => items.push(r.X));
    expect(items).toEqual([1, 2, 3]);
  });

  it('query handles arithmetic evaluation', () => {
    const r = pl.query('X is 2 + 3').first();
    expect(r).not.toBeNull();
    expect(r!.X).toBe(5);
  });

  it('query handles unification', () => {
    const r = pl.query('append([1,2], [3,4], X)').first();
    expect(r).not.toBeNull();
    expect(r!.X).toEqual([1, 2, 3, 4]);
  });
});

describe('assert / retract', () => {
  it('assertClause adds a fact queryable immediately', () => {
    pl.assertClause('test_fact(42)');
    const r = pl.query('test_fact(X)').first();
    expect(r).not.toBeNull();
    expect(r!.X).toBe(42);
  });

  it('assertClause adds a rule', () => {
    pl.assertClause('test_double(X, Y) :- Y is X * 2');
    const r = pl.query('test_double(5, Y)').first();
    expect(r).not.toBeNull();
    expect(r!.Y).toBe(10);
  });

  it('stock.call retract removes a fact', () => {
    pl.assertClause('temp_fact(99)');
    expect(pl.query('temp_fact(99)').first()).not.toBeNull();
    pl.stock.call('retract(temp_fact(99))');
    expect(pl.query('temp_fact(99)').first()).toBeNull();
  });
});

describe('consult', () => {
  it('consult loads rules from a string', () => {
    pl.consult(`
      color(red).
      color(green).
      color(blue).
    `);
    const results = pl.query('color(X)').all();
    expect(results.length).toBe(3);
    expect(results.map(r => r.X)).toContain('red');
    expect(results.map(r => r.X)).toContain('green');
    expect(results.map(r => r.X)).toContain('blue');
  });

  it('consult loads rules with bodies', () => {
    pl.consult(`
      parent(tom, bob).
      parent(bob, ann).
      ancestor(X, Y) :- parent(X, Y).
      ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).
    `);
    const r = pl.query('findall(X, ancestor(tom, X), Xs)').first();
    expect(r).not.toBeNull();
    expect(r!.Xs).toContain('bob');
    expect(r!.Xs).toContain('ann');
  });
});

describe('findall', () => {
  it('findall collects all solutions into a list', () => {
    pl.consult(`num(1). num(2). num(3). num(4). num(5).`);
    const r = pl.query('findall(X, (num(X), X > 3), Xs)').first();
    expect(r).not.toBeNull();
    expect(r!.Xs).toEqual([4, 5]);
  });

  it('findall returns empty list when no solutions', () => {
    const r = pl.query('findall(X, (member(X, [1,2,3]), X > 10), Xs)').first();
    expect(r).not.toBeNull();
    expect(r!.Xs).toEqual([]);
  });

  it('aggregate_all counts solutions', () => {
    const r = pl.query('aggregate_all(count, member(_, [a,b,c,d,e]), Count)').first();
    expect(r).not.toBeNull();
    expect(r!.Count).toBe(5);
  });
});
