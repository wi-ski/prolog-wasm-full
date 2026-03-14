import type { SWIPLModule, PLApi, ForeignFn, term_t } from './types.js';
import { termToJS, jsToTerm } from './marshal.js';

/**
 * Register a JS function as a deterministic Prolog foreign predicate.
 *
 * The JS function receives marshaled arguments (JS values) and returns
 * true (success) or false (failure). For unification, the function
 * receives the raw term_t refs as an additional parameter.
 *
 * Internally: addFunction creates a WASM table entry, PL_register_foreign
 * wires it to the Prolog predicate name.
 *
 * Foreign predicate C signature: int fn(term_t t0, int arity, void* context)
 * With PL_FA_VARARGS, SWI-Prolog passes (term_t first_arg, int arity, void*)
 * and the implementation reads args from first_arg + offset.
 */
export function createRegisterForeign(
  em: SWIPLModule,
  pl: PLApi,
  name: string,
  arity: number,
  fn: ForeignFn,
): { dispose: () => void; ptr: number } {
  const wrapper = (t0: number, _arity: number, _context: number): number => {
    try {
      const args: unknown[] = [];
      for (let i = 0; i < arity; i++) {
        args.push(termToJS(pl, (t0 + i) as term_t));
      }

      const result = fn(...args);
      return result === false ? 0 : 1;
    } catch {
      return 0;
    }
  };

  const sig = 'i' + 'i'.repeat(3);
  const ptr = em.addFunction(wrapper, sig);
  const PL_FA_VARARGS = 0x08;
  pl.register_foreign(name, arity, ptr, PL_FA_VARARGS);

  return {
    ptr,
    dispose: () => em.removeFunction(ptr),
  };
}

/**
 * Register a JS function as a foreign predicate that can UNIFY output arguments.
 *
 * The function receives term_t refs directly and can use pl.unify_* to bind them.
 * Returns true for success, false for failure.
 */
export function createRegisterForeignRaw(
  em: SWIPLModule,
  pl: PLApi,
  name: string,
  arity: number,
  fn: (pl: PLApi, ...terms: term_t[]) => boolean,
): { dispose: () => void; ptr: number } {
  const wrapper = (t0: number, _arity: number, _context: number): number => {
    try {
      const terms: term_t[] = [];
      for (let i = 0; i < arity; i++) {
        terms.push((t0 + i) as term_t);
      }
      return fn(pl, ...terms) ? 1 : 0;
    } catch {
      return 0;
    }
  };

  const sig = 'i' + 'i'.repeat(3);
  const ptr = em.addFunction(wrapper, sig);
  const PL_FA_VARARGS = 0x08;
  pl.register_foreign(name, arity, ptr, PL_FA_VARARGS);

  return {
    ptr,
    dispose: () => em.removeFunction(ptr),
  };
}
