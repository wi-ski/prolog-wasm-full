/**
 * CLP(FD) constraint solving: meeting scheduling.
 *
 * 4 meetings, 5 time slots, no overlaps, some meetings must be before others.
 * Prolog's constraint solver finds all valid schedules.
 *
 * Run:  npx tsx examples/04-clpfd-scheduling.ts
 *
 * Output:
 *   Schedule 1: standup=1 design=2 review=3 retro=4
 *   Schedule 2: standup=1 design=2 review=3 retro=5
 *   ... (all valid schedules)
 *   Found N valid schedules
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  pl.consult(`
    :- use_module(library(clpfd)).

    schedule(Standup, Design, Review, Retro) :-
      Vars = [Standup, Design, Review, Retro],
      Vars ins 1..5,
      all_different(Vars),
      Standup #< Design,
      Design #< Review,
      label(Vars).
  `);

  const results = pl.query('schedule(S, D, R, T)').all();

  results.forEach((r, i) => {
    console.log(`Schedule ${i + 1}: standup=${r.S} design=${r.D} review=${r.R} retro=${r.T}`);
  });
  console.log(`Found ${results.length} valid schedules`);

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
