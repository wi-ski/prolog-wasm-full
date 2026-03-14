export { initProlog } from './init.js';
export type { PrologFull, PLApi, QueryHandle, ForeignFn, Disposer } from './types.js';
export type { SWIPLModule, StockPrologApi, StockQuery, StockEngine } from './types.js';
export type {
  term_t, atom_t, functor_t, module_t, predicate_t,
  qid_t, fid_t, engine_t, WasmFnPtr,
} from './types.js';

export { createPLApi } from './pl-api.js';
export { createQueryHandle } from './query.js';
export { createRegisterForeign, createRegisterForeignRaw } from './foreign.js';
export { termToJS, jsToTerm } from './marshal.js';

export {
  PL_VARIABLE, PL_ATOM, PL_INTEGER, PL_FLOAT, PL_STRING,
  PL_NIL, PL_LIST_PAIR, PL_FUNCTOR, PL_RATIONAL, PL_DICT,
  PL_Q_NORMAL, PL_Q_NODEBUG, PL_Q_CATCH_EXCEPTION, PL_Q_PASS_EXCEPTION,
  PL_FA_NONDETERMINISTIC, PL_FA_VARARGS,
  PL_FIRST_CALL, PL_REDO, PL_PRUNED,
  CVT_ATOM, CVT_STRING, CVT_LIST, CVT_INTEGER, CVT_FLOAT,
  CVT_NUMBER, CVT_ATOMIC, CVT_ALL, CVT_WRITE, CVT_WRITEQ,
  BUF_STACK, BUF_MALLOC, REP_UTF8,
} from './types.js';
