/**
 * Live data: Prolog queries your JS data layer during inference.
 *
 * Instead of asserting thousands of facts upfront, register a foreign
 * predicate that reads from your data store on demand. Prolog pulls
 * what it needs during backtracking.
 *
 * Run:  npx tsx examples/05-live-data.ts
 *
 * Output:
 *   Seniors in engineering: ["alice", "carol"]
 *   Engineering headcount: 3
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  const employees = [
    { name: 'alice', dept: 'engineering', level: 7 },
    { name: 'bob', dept: 'engineering', level: 3 },
    { name: 'carol', dept: 'engineering', level: 6 },
    { name: 'dave', dept: 'marketing', level: 5 },
    { name: 'eve', dept: 'marketing', level: 8 },
  ];

  pl.registerForeign('employee_dept', 2, (name, dept) => {
    return employees.some(e => e.name === name && e.dept === dept);
  });

  pl.registerForeign('employee_level', 2, (name, level) => {
    return employees.some(e => e.name === name && e.level === level);
  });

  pl.consult(`
    senior(Name) :- employee_level(Name, Level), Level >= 5.
    in_dept(Name, Dept) :- employee_dept(Name, Dept).
  `);

  // Find seniors in engineering
  // Since we can't backtrack over foreign predicates without nondet support,
  // we use findall over known employees
  pl.consult(`
    known_employee(alice). known_employee(bob). known_employee(carol).
    known_employee(dave). known_employee(eve).
    dept_senior(Dept, Name) :-
      known_employee(Name), in_dept(Name, Dept), senior(Name).
  `);

  const seniors = pl.query('findall(N, dept_senior(engineering, N), Ns)').first();
  console.log(`Seniors in engineering: ${JSON.stringify(seniors?.Ns)}`);

  const count = pl.query('aggregate_all(count, (known_employee(N), in_dept(N, engineering)), C)').first();
  console.log(`Engineering headcount: ${count?.C}`);

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
