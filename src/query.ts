import type { SWIPLModule, PLApi, QueryHandle, term_t } from './types.js';
import { PL_Q_CATCH_EXCEPTION, CVT_ALL, BUF_STACK, REP_UTF8 } from './types.js';
import { termToJS } from './marshal.js';

/**
 * Ergonomic query handle. Wraps PL_open_query / PL_next_solution / PL_close_query
 * and the stock prolog.query API into a unified interface with .first(), .all(), .forEach().
 */
export function createQueryHandle(
  em: SWIPLModule,
  pl: PLApi,
  goal: string,
): QueryHandle {
  return {
    first(): Record<string, unknown> | null {
      const result = em.prolog.query(goal).once();
      if (!result.success) return null;
      const bindings: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(result)) {
        if (key === '$tag' || key === 'success') continue;
        bindings[key] = val;
      }
      return bindings;
    },

    all(): Record<string, unknown>[] {
      const results: Record<string, unknown>[] = [];
      const q = em.prolog.query(goal);
      let r = q.next();
      while (!r.done) {
        if (r.value) {
          const bindings: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(r.value)) {
            if (key === '$tag') continue;
            bindings[key] = val;
          }
          results.push(bindings);
        }
        r = q.next();
      }
      if (r.value) {
        const bindings: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(r.value)) {
          if (key === '$tag') continue;
          bindings[key] = val;
        }
        results.push(bindings);
      }
      q.close();
      return results;
    },

    forEach(cb: (bindings: Record<string, unknown>) => void): void {
      const q = em.prolog.query(goal);
      let r = q.next();
      while (!r.done) {
        if (r.value) {
          const bindings: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(r.value)) {
            if (key === '$tag') continue;
            bindings[key] = val;
          }
          cb(bindings);
        }
        r = q.next();
      }
      if (r.value) {
        const bindings: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(r.value)) {
          if (key === '$tag') continue;
          bindings[key] = val;
        }
        cb(bindings);
      }
      q.close();
    },

    close(): void {
      // no-op for the stock-based implementation
    },
  };
}
