declare const __brand: unique symbol;
type Ptr<Tag extends string> = number & { readonly [__brand]: Tag };

export type term_t = Ptr<'term_t'>;
export type atom_t = Ptr<'atom_t'>;
export type functor_t = Ptr<'functor_t'>;
export type module_t = Ptr<'module_t'>;
export type predicate_t = Ptr<'predicate_t'>;
export type qid_t = Ptr<'qid_t'>;
export type fid_t = Ptr<'fid_t'>;
export type engine_t = Ptr<'engine_t'>;

export type WasmFnPtr = number;

export interface SWIPLModule {
  ccall(ident: string, returnType: string | null, argTypes: string[], args: unknown[]): unknown;
  cwrap(ident: string, returnType: string | null, argTypes: string[]): Function;
  addFunction(fn: Function, sig: string): number;
  removeFunction(ptr: number): void;
  UTF8ToString(ptr: number, maxBytesToRead?: number): string;
  stringToNewUTF8(str: string): number;
  stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): void;
  lengthBytesUTF8(str: string): number;
  getValue(ptr: number, type: string): number;
  setValue(ptr: number, value: number, type: string): void;
  _malloc(size: number): number;
  _free(ptr: number): void;
  FS: {
    writeFile(path: string, data: string | Uint8Array): void;
    readFile(path: string, opts?: { encoding?: string }): string | Uint8Array;
    unlink(path: string): void;
    mkdir(path: string): void;
  };
  wasmTable: WebAssembly.Table;
  wasmMemory: WebAssembly.Memory;

  prolog: StockPrologApi;
}

export interface StockPrologApi {
  query(goal: string): StockQuery;
  call(goal: string): boolean;
  forEach(goal: string, cb: (bindings: Record<string, unknown>) => void): void;
  Engine: new () => StockEngine;
}

export interface StockQuery {
  once(): Record<string, unknown> & { success: boolean };
  next(): { done: boolean; value?: Record<string, unknown> };
  close(): void;
}

export interface StockEngine {
  close(): void;
  call(goal: string): boolean;
  query(goal: string): StockQuery;
  forEach(goal: string, cb: (bindings: Record<string, unknown>) => void): void;
}

// PL_* constants
export const PL_VARIABLE = 1;
export const PL_ATOM = 2;
export const PL_INTEGER = 3;
export const PL_RATIONAL = 4;
export const PL_FLOAT = 5;
export const PL_STRING = 6;
export const PL_TERM = 7;
export const PL_NIL = 8;
export const PL_BLOB = 9;
export const PL_LIST_PAIR = 10;
export const PL_FUNCTOR = 11;
export const PL_LIST = 12;
export const PL_CHARS = 13;
export const PL_DICT = 44;

// PL_Q_* flags for PL_open_query
export const PL_Q_NORMAL = 0x0002;
export const PL_Q_NODEBUG = 0x0004;
export const PL_Q_CATCH_EXCEPTION = 0x0008;
export const PL_Q_PASS_EXCEPTION = 0x0010;

// PL_register_foreign flags
export const PL_FA_NONDETERMINISTIC = 0x02;
export const PL_FA_VARARGS = 0x08;

// Foreign control values
export const PL_FIRST_CALL = 0;
export const PL_REDO = 1;
export const PL_PRUNED = 2;

// CVT_* for PL_get_chars
export const CVT_ATOM = 0x0001;
export const CVT_STRING = 0x0002;
export const CVT_LIST = 0x0004;
export const CVT_INTEGER = 0x0008;
export const CVT_FLOAT = 0x0010;
export const CVT_NUMBER = CVT_INTEGER | CVT_FLOAT;
export const CVT_ATOMIC = CVT_NUMBER | CVT_ATOM | CVT_STRING;
export const CVT_ALL = 0x00ff;
export const CVT_WRITE = 0x0800;
export const CVT_WRITEQ = 0x1000;

// BUF_* for PL_get_chars
export const BUF_STACK = 0x00010000;
export const BUF_MALLOC = 0x00020000;

// REP_* for PL_get_chars
export const REP_UTF8 = 0x01000000;

export type Disposer = () => void;

export type ForeignFn = (...args: unknown[]) => boolean | void;

export interface PrologFull {
  em: SWIPLModule;
  pl: PLApi;
  stock: StockPrologApi;
  query(goal: string): QueryHandle;
  consult(source: string): void;
  assertClause(clause: string): void;
  registerForeign(name: string, arity: number, fn: ForeignFn): Disposer;
  dispose(): void;
}

export interface PLApi {
  new_term_ref(): term_t;
  new_term_refs(n: number): term_t;
  copy_term_ref(to: term_t, from: term_t): void;
  reset_term_refs(after: term_t): void;

  put_variable(t: term_t): void;
  put_atom_chars(t: term_t, s: string): void;
  put_integer(t: term_t, n: number): boolean;
  put_float(t: term_t, f: number): boolean;
  put_nil(t: term_t): void;
  put_term(to: term_t, from: term_t): void;
  put_chars(t: term_t, flags: number, len: number, s: string): boolean;
  cons_list(list: term_t, head: term_t, tail: term_t): void;
  cons_functor_v(t: term_t, f: functor_t, args: term_t): void;

  get_atom_chars(t: term_t): string | null;
  get_integer(t: term_t): number | null;
  get_float(t: term_t): number | null;
  get_chars(t: term_t, flags: number): string | null;
  get_list(t: term_t, head: term_t, tail: term_t): boolean;
  get_head(t: term_t, head: term_t): boolean;
  get_tail(t: term_t, tail: term_t): boolean;
  get_nil(t: term_t): boolean;
  get_compound_name_arity(t: term_t): { name: string; arity: number } | null;
  get_arg(index: number, t: term_t, a: term_t): boolean;

  unify(a: term_t, b: term_t): boolean;
  unify_atom_chars(t: term_t, s: string): boolean;
  unify_integer(t: term_t, n: number): boolean;
  unify_float(t: term_t, f: number): boolean;
  unify_nil(t: term_t): boolean;
  unify_list(list: term_t, head: term_t, tail: term_t): boolean;
  unify_bool(t: term_t, v: boolean): boolean;
  unify_string_chars(t: term_t, s: string): boolean;

  term_type(t: term_t): number;
  is_variable(t: term_t): boolean;
  is_atom(t: term_t): boolean;
  is_integer(t: term_t): boolean;
  is_float(t: term_t): boolean;
  is_string(t: term_t): boolean;
  is_compound(t: term_t): boolean;
  is_list(t: term_t): boolean;
  is_pair(t: term_t): boolean;

  new_atom(s: string): atom_t;
  atom_chars(a: atom_t): string;
  new_functor(name: atom_t, arity: number): functor_t;
  functor_name(f: functor_t): atom_t;
  functor_arity(f: functor_t): number;

  predicate(name: string, arity: number, module: string | null): predicate_t;
  open_query(module: module_t | null, flags: number, pred: predicate_t, args: term_t): qid_t;
  next_solution(qid: qid_t): boolean;
  close_query(qid: qid_t): void;
  cut_query(qid: qid_t): void;
  exception(qid: qid_t): term_t;

  open_foreign_frame(): fid_t;
  close_foreign_frame(fid: fid_t): void;
  discard_foreign_frame(fid: fid_t): void;

  register_foreign(name: string, arity: number, fn: WasmFnPtr, flags: number): boolean;
  chars_to_term(s: string, t: term_t): boolean;
  call(t: term_t, m: module_t | null): boolean;

  halt(status: number): void;
}

export interface QueryHandle {
  first(): Record<string, unknown> | null;
  all(): Record<string, unknown>[];
  forEach(cb: (bindings: Record<string, unknown>) => void): void;
  close(): void;
}
