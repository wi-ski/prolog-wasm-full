import type { PLApi, term_t } from './types.js';
import {
  PL_VARIABLE, PL_ATOM, PL_INTEGER, PL_FLOAT, PL_STRING,
  PL_NIL, PL_LIST_PAIR, PL_FUNCTOR, PL_DICT, PL_RATIONAL,
  CVT_ALL, BUF_STACK, REP_UTF8,
} from './types.js';

export function termToJS(pl: PLApi, t: term_t): unknown {
  const type = pl.term_type(t);

  switch (type) {
    case PL_VARIABLE:
      return undefined;

    case PL_ATOM: {
      const s = pl.get_atom_chars(t);
      if (s === 'true') return true;
      if (s === 'false') return false;
      return s;
    }

    case PL_INTEGER:
      return pl.get_integer(t);

    case PL_FLOAT:
      return pl.get_float(t);

    case PL_STRING:
      return pl.get_chars(t, CVT_ALL | BUF_STACK | REP_UTF8);

    case PL_NIL:
      return [];

    case PL_LIST_PAIR: {
      const result: unknown[] = [];
      const head = pl.new_term_ref();
      const tail = pl.new_term_ref();
      pl.copy_term_ref(tail, t);
      while (pl.get_list(tail, head, tail)) {
        result.push(termToJS(pl, head));
      }
      return result;
    }

    case PL_FUNCTOR: {
      const info = pl.get_compound_name_arity(t);
      if (!info) return null;
      if (info.name === '-' && info.arity === 2) {
        const a1 = pl.new_term_ref();
        const a2 = pl.new_term_ref();
        pl.get_arg(1, t, a1);
        pl.get_arg(2, t, a2);
        return [termToJS(pl, a1), termToJS(pl, a2)];
      }
      const args: unknown[] = [];
      const arg = pl.new_term_ref();
      for (let i = 1; i <= info.arity; i++) {
        pl.get_arg(i, t, arg);
        args.push(termToJS(pl, arg));
      }
      return { functor: info.name, args };
    }

    case PL_RATIONAL: {
      const s = pl.get_chars(t, CVT_ALL | BUF_STACK | REP_UTF8);
      return s;
    }

    case PL_DICT: {
      const s = pl.get_chars(t, CVT_ALL | BUF_STACK | REP_UTF8);
      return { dict: s };
    }

    default: {
      const s = pl.get_chars(t, CVT_ALL | BUF_STACK | REP_UTF8);
      return s ?? `<unknown type ${type}>`;
    }
  }
}

export function jsToTerm(pl: PLApi, value: unknown, t: term_t): void {
  if (value === undefined || value === null) {
    pl.put_variable(t);
  } else if (typeof value === 'boolean') {
    pl.put_atom_chars(t, value ? 'true' : 'false');
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      pl.put_integer(t, value);
    } else {
      pl.put_float(t, value);
    }
  } else if (typeof value === 'string') {
    pl.put_atom_chars(t, value);
  } else if (Array.isArray(value)) {
    pl.put_nil(t);
    for (let i = value.length - 1; i >= 0; i--) {
      const head = pl.new_term_ref();
      jsToTerm(pl, value[i], head);
      const newList = pl.new_term_ref();
      pl.cons_list(newList, head, t);
      pl.put_term(t, newList);
    }
  } else {
    pl.put_atom_chars(t, String(value));
  }
}
