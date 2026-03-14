import type {
  SWIPLModule, PLApi, term_t, atom_t, functor_t,
  module_t, predicate_t, qid_t, fid_t, WasmFnPtr,
} from './types.js';

export function createPLApi(em: SWIPLModule): PLApi {
  const N = 'number';
  const S = 'string';
  const B = 'boolean';

  function cc(name: string, ret: string | null, args: string[], vals: unknown[]): any {
    return em.ccall('PL_' + name, ret, args, vals);
  }

  return {
    new_term_ref: () => cc('new_term_ref', N, [], []) as term_t,
    new_term_refs: (n) => cc('new_term_refs', N, [N], [n]) as term_t,
    copy_term_ref: (to, from) => cc('copy_term_ref', null, [N, N], [to, from]),
    reset_term_refs: (after) => cc('reset_term_refs', null, [N], [after]),

    put_variable: (t) => cc('put_variable', null, [N], [t]),
    put_atom_chars: (t, s) => cc('put_atom_chars', N, [N, S], [t, s]),
    put_integer: (t, n) => !!cc('put_integer', N, [N, N], [t, n]),
    put_float: (t, f) => !!cc('put_float', N, [N, 'number'], [t, f]),
    put_nil: (t) => cc('put_nil', null, [N], [t]),
    put_term: (to, from) => cc('put_term', null, [N, N], [to, from]),
    put_chars: (t, flags, len, s) => {
      const ptr = em.stringToNewUTF8(s);
      const result = !!cc('put_chars', N, [N, N, N, N], [t, flags, len, ptr]);
      em._free(ptr);
      return result;
    },
    cons_list: (list, head, tail) => cc('cons_list', null, [N, N, N], [list, head, tail]),
    cons_functor_v: (t, f, args) => cc('cons_functor_v', null, [N, N, N], [t, f, args]),

    get_atom_chars(t) {
      const ptr = em._malloc(4);
      try {
        const ok = cc('get_atom_chars', N, [N, N], [t, ptr]);
        if (!ok) return null;
        const strPtr = em.getValue(ptr, 'i32');
        return em.UTF8ToString(strPtr);
      } finally { em._free(ptr); }
    },

    get_integer(t) {
      const ptr = em._malloc(4);
      try {
        const ok = cc('get_integer', N, [N, N], [t, ptr]);
        if (!ok) return null;
        return em.getValue(ptr, 'i32');
      } finally { em._free(ptr); }
    },

    get_float(t) {
      const ptr = em._malloc(8);
      try {
        const ok = cc('get_float', N, [N, N], [t, ptr]);
        if (!ok) return null;
        return em.getValue(ptr, 'double');
      } finally { em._free(ptr); }
    },

    get_chars(t, flags) {
      const ptr = em._malloc(4);
      try {
        const ok = cc('get_chars', N, [N, N, N], [t, ptr, flags]);
        if (!ok) return null;
        const strPtr = em.getValue(ptr, 'i32');
        return em.UTF8ToString(strPtr);
      } finally { em._free(ptr); }
    },

    get_list: (t, head, tail) => !!cc('get_list', N, [N, N, N], [t, head, tail]),
    get_head: (t, head) => !!cc('get_head', N, [N, N], [t, head]),
    get_tail: (t, tail) => !!cc('get_tail', N, [N, N], [t, tail]),
    get_nil: (t) => !!cc('get_nil', N, [N], [t]),

    get_compound_name_arity(t) {
      const namePtr = em._malloc(4);
      const arityPtr = em._malloc(4);
      try {
        const ok = cc('get_compound_name_arity', N, [N, N, N], [t, namePtr, arityPtr]);
        if (!ok) return null;
        const nameAtom = em.getValue(namePtr, 'i32') as atom_t;
        const arity = em.getValue(arityPtr, 'i32');
        const name = cc('atom_chars', S, [N], [nameAtom]) as string;
        return { name, arity };
      } finally { em._free(namePtr); em._free(arityPtr); }
    },

    get_arg: (index, t, a) => !!cc('get_arg', N, [N, N, N], [index, t, a]),

    unify: (a, b) => !!cc('unify', N, [N, N], [a, b]),
    unify_atom_chars: (t, s) => !!cc('unify_atom_chars', N, [N, S], [t, s]),
    unify_integer: (t, n) => !!cc('unify_integer', N, [N, N], [t, n]),
    unify_float: (t, f) => !!cc('unify_float', N, [N, 'number'], [t, f]),
    unify_nil: (t) => !!cc('unify_nil', N, [N], [t]),
    unify_list: (list, head, tail) => !!cc('unify_list', N, [N, N, N], [list, head, tail]),
    unify_bool: (t, v) => !!cc('unify_bool', N, [N, N], [t, v ? 1 : 0]),
    unify_string_chars: (t, s) => !!cc('unify_string_chars', N, [N, S], [t, s]),

    term_type: (t) => cc('term_type', N, [N], [t]) as number,
    is_variable: (t) => !!cc('is_variable', N, [N], [t]),
    is_atom: (t) => !!cc('is_atom', N, [N], [t]),
    is_integer: (t) => !!cc('is_integer', N, [N], [t]),
    is_float: (t) => !!cc('is_float', N, [N], [t]),
    is_string: (t) => !!cc('is_string', N, [N], [t]),
    is_compound: (t) => !!cc('is_compound', N, [N], [t]),
    is_list: (t) => !!cc('is_list', N, [N], [t]),
    is_pair: (t) => !!cc('is_pair', N, [N], [t]),

    new_atom: (s) => cc('new_atom', N, [S], [s]) as atom_t,
    atom_chars: (a) => cc('atom_chars', S, [N], [a]) as string,
    new_functor: (name, arity) => cc('new_functor', N, [N, N], [name, arity]) as functor_t,
    functor_name: (f) => cc('functor_name', N, [N], [f]) as atom_t,
    functor_arity: (f) => cc('functor_arity', N, [N], [f]) as number,

    predicate: (name, arity, mod) => cc('predicate', N, [S, N, S], [name, arity, mod ?? 'user']) as predicate_t,
    open_query: (mod, flags, pred, args) => cc('open_query', N, [N, N, N, N], [mod ?? 0, flags, pred, args]) as qid_t,
    next_solution: (qid) => !!cc('next_solution', N, [N], [qid]),
    close_query: (qid) => cc('close_query', null, [N], [qid]),
    cut_query: (qid) => cc('cut_query', null, [N], [qid]),
    exception: (qid) => cc('exception', N, [N], [qid]) as term_t,

    open_foreign_frame: () => cc('open_foreign_frame', N, [], []) as fid_t,
    close_foreign_frame: (fid) => cc('close_foreign_frame', null, [N], [fid]),
    discard_foreign_frame: (fid) => cc('discard_foreign_frame', null, [N], [fid]),

    register_foreign: (name, arity, fn, flags) =>
      !!cc('register_foreign', N, [S, N, N, N], [name, arity, fn, flags]),
    chars_to_term: (s, t) => !!cc('chars_to_term', N, [S, N], [s, t]),
    call: (t, m) => !!cc('call', N, [N, N], [t, m ?? 0]),

    halt: (status) => cc('halt', null, [N], [status]),
  };
}
