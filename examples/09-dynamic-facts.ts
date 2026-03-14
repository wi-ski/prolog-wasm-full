/**
 * Dynamic facts: assert, retract, and hot-swap at runtime.
 *
 * Shows how to build up a knowledge base incrementally,
 * query it, modify it, and query again — all without reloading.
 *
 * Run:  npx tsx examples/09-dynamic-facts.ts
 *
 * Output:
 *   Initial: [alice, bob]
 *   After adding carol: [alice, bob, carol]
 *   After removing bob: [alice, carol]
 *   Rule: seniors = [alice]
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  pl.assertClause('employee(alice, 7)');
  pl.assertClause('employee(bob, 3)');

  const initial = pl.query('findall(N, employee(N, _), Ns)').first();
  console.log('Initial:', JSON.stringify(initial?.Ns));

  pl.assertClause('employee(carol, 5)');
  const after_add = pl.query('findall(N, employee(N, _), Ns)').first();
  console.log('After adding carol:', JSON.stringify(after_add?.Ns));

  pl.stock.call('retract(employee(bob, 3))');
  const after_remove = pl.query('findall(N, employee(N, _), Ns)').first();
  console.log('After removing bob:', JSON.stringify(after_remove?.Ns));

  pl.consult('senior(Name) :- employee(Name, Level), Level >= 6.');
  const seniors = pl.query('findall(N, senior(N), Ns)').first();
  console.log('Rule: seniors =', JSON.stringify(seniors?.Ns));

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
