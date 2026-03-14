/**
 * Raw PL_* API: low-level escape hatch for power users.
 *
 * Demonstrates direct term construction, foreign frames,
 * and manual query open/next/close via the C API wrappers.
 *
 * Run:  npx tsx examples/13-raw-pl-api.ts
 *
 * Output:
 *   Created term with integer: 42
 *   Read back: 42
 *   Created atom: hello (id: <number>)
 *   Manual query - X = 1
 *   Manual query - X = 2
 *   Manual query - X = 3
 */
import { initProlog } from '../src/index.js';
import { PL_Q_NORMAL, CVT_ALL, BUF_STACK, REP_UTF8 } from '../src/types.js';

async function main() {
  const pl = await initProlog();
  const api = pl.pl;

  // Direct term construction
  const t = api.new_term_ref();
  api.put_integer(t, 42);
  console.log('Created term with integer:', 42);
  const val = api.get_integer(t);
  console.log('Read back:', val);

  // Atom creation
  const atom = api.new_atom('hello');
  const chars = api.atom_chars(atom);
  console.log(`Created atom: ${chars} (id: ${atom})`);

  // Manual query: member(X, [1, 2, 3])
  const pred = api.predicate('member', 2, 'user');
  const args = api.new_term_refs(2);

  api.put_variable(args);
  api.chars_to_term('[1, 2, 3]', (args + 1) as any);

  const qid = api.open_query(null, PL_Q_NORMAL, pred, args);
  while (api.next_solution(qid)) {
    const x = api.get_chars(args, CVT_ALL | BUF_STACK | REP_UTF8);
    console.log('Manual query - X =', x);
  }
  api.close_query(qid);

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
