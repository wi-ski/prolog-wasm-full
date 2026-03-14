/**
 * CLP(B): Boolean constraint solving — SAT in Prolog.
 *
 * Uses CLP(B) to solve boolean satisfiability problems.
 * labeling/1 enumerates all satisfying assignments.
 *
 * Run:  npx tsx examples/10-clpb.ts
 *
 * Output:
 *   At-least-2-of-3 solutions:
 *     X=0 Y=1 Z=1
 *     X=1 Y=0 Z=1
 *     X=1 Y=1 Z=0
 *     X=1 Y=1 Z=1
 *   Tautology check (X + ~X): true
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  pl.consult(`
    :- use_module(library(clpb)).
    at_least_2(X, Y, Z) :-
      sat(X*Y + X*Z + Y*Z),
      labeling([X, Y, Z]).
    is_taut(Expr) :- taut(Expr, 1).
  `);

  console.log('At-least-2-of-3 solutions:');
  pl.query('at_least_2(X, Y, Z)').forEach(r => {
    console.log(`  X=${r.X} Y=${r.Y} Z=${r.Z}`);
  });

  const taut = pl.query('is_taut(X + ~X)').first();
  console.log('Tautology check (X + ~X):', taut !== null);

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
