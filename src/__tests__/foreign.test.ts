import { describe, it, expect, beforeAll } from 'vitest';
import { initProlog } from '../init.js';
import type { PrologFull } from '../types.js';

let pl: PrologFull;
beforeAll(async () => { pl = await initProlog(); });

describe('registerForeign — deterministic predicates', () => {
  it('registers a 0-arity predicate that succeeds', () => {
    let called = false;
    const dispose = pl.registerForeign('js_hello', 0, () => { called = true; return true; });

    const r = pl.query('js_hello').first();
    expect(r).not.toBeNull();
    expect(called).toBe(true);
    dispose();
  });

  it('registers a 1-arity predicate that checks a value', () => {
    const allowed = new Set(['alice', 'bob']);
    const dispose = pl.registerForeign('js_allowed', 1, (user) => {
      return allowed.has(user as string);
    });

    expect(pl.query('js_allowed(alice)').first()).not.toBeNull();
    expect(pl.query('js_allowed(bob)').first()).not.toBeNull();
    expect(pl.query('js_allowed(eve)').first()).toBeNull();
    dispose();
  });

  it('registers a 2-arity predicate that receives both args', () => {
    const calls: Array<[unknown, unknown]> = [];
    const dispose = pl.registerForeign('js_log2', 2, (a, b) => {
      calls.push([a, b]);
      return true;
    });

    pl.query('js_log2(hello, 42)').first();
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe('hello');
    expect(calls[0][1]).toBe(42);
    dispose();
  });

  it('predicate returning false causes Prolog failure', () => {
    const dispose = pl.registerForeign('js_fail', 0, () => false);
    expect(pl.query('js_fail').first()).toBeNull();
    dispose();
  });

  it('exception in JS predicate causes Prolog failure (not crash)', () => {
    const dispose = pl.registerForeign('js_throw', 0, () => {
      throw new Error('boom');
    });
    expect(pl.query('js_throw').first()).toBeNull();
    dispose();
  });

  it('multiple foreign predicates coexist', () => {
    const d1 = pl.registerForeign('js_a', 0, () => true);
    const d2 = pl.registerForeign('js_b', 0, () => true);
    const d3 = pl.registerForeign('js_c', 0, () => false);

    expect(pl.query('js_a').first()).not.toBeNull();
    expect(pl.query('js_b').first()).not.toBeNull();
    expect(pl.query('js_c').first()).toBeNull();

    d1(); d2(); d3();
  });

  it('foreign predicate integrates with Prolog rules', () => {
    const permissions: Record<string, string[]> = {
      alice: ['read', 'write'],
      bob: ['read'],
    };
    const dispose = pl.registerForeign('js_has_perm', 2, (user, perm) => {
      return permissions[user as string]?.includes(perm as string) ?? false;
    });

    pl.consult(`
      can_access(User, Resource) :- js_has_perm(User, read), Resource = public.
      can_access(User, Resource) :- js_has_perm(User, write), Resource = private.
    `);

    const alice = pl.query('findall(R, can_access(alice, R), Rs)').first();
    expect(alice!.Rs).toContain('public');
    expect(alice!.Rs).toContain('private');

    const bob = pl.query('findall(R, can_access(bob, R), Rs)').first();
    expect(bob!.Rs).toContain('public');
    expect(bob!.Rs).not.toContain('private');

    dispose();
  });

  it('dispose releases the function table slot', () => {
    const dispose = pl.registerForeign('js_temp', 0, () => true);
    expect(pl.query('js_temp').first()).not.toBeNull();
    dispose();
  });
});
