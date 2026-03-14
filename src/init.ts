import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { SWIPLModule, PrologFull } from './types.js';
import { createPLApi } from './pl-api.js';
import { createQueryHandle } from './query.js';
import { createRegisterForeign } from './foreign.js';

export async function initProlog(): Promise<PrologFull> {
  const req = createRequire(import.meta.url);
  const vendorDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'vendor');

  const initSWIPL = req(join(vendorDir, 'swipl-web.cjs')) as (opts: Record<string, unknown>) => Promise<SWIPLModule>;
  const em: SWIPLModule = await initSWIPL({
    arguments: ['-q'],
    locateFile: (path: string) => join(vendorDir, path),
  });

  if (typeof em.addFunction !== 'function') {
    throw new Error(
      'addFunction not available on WASM module. ' +
      'This binary was not built with EXPORTED_RUNTIME_METHODS including addFunction. ' +
      'Use the custom build from build/build.sh.'
    );
  }

  const pl = createPLApi(em);
  const stock = em.prolog;
  const foreignPtrs: number[] = [];
  let consultCounter = 0;

  return {
    em,
    pl,
    stock,

    query(goal: string) {
      return createQueryHandle(em, pl, goal);
    },

    consult(source: string) {
      const tmpPath = `/tmp/_pwf_${Date.now()}_${consultCounter++}.pl`;
      em.FS.writeFile(tmpPath, source);
      stock.call(`consult("${tmpPath}")`);
      em.FS.unlink(tmpPath);
    },

    assertClause(clause: string) {
      const trimmed = clause.trim();
      const withDot = trimmed.endsWith('.') ? trimmed : trimmed + '.';
      stock.call(`assert((${withDot.slice(0, -1)}))`);
    },

    registerForeign(name, arity, fn) {
      const { dispose, ptr } = createRegisterForeign(em, pl, name, arity, fn);
      foreignPtrs.push(ptr);
      return dispose;
    },

    dispose() {
      for (const ptr of foreignPtrs) {
        em.removeFunction(ptr);
      }
      foreignPtrs.length = 0;
    },
  };
}
