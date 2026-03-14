/**
 * Prolog-driven validation: rules fire, JS collects violations.
 *
 * The validation rules are in Prolog. The data checks use JS foreign
 * predicates. Violations are collected via another foreign predicate.
 * The proof IS the audit trail.
 *
 * Run:  npx tsx examples/06-validation.ts
 *
 * Output:
 *   Validating order: {customer: "acme", items: [...], total: 150}
 *   VIOLATION: acme — credit_check — insufficient credit
 *   VIOLATION: acme — stock_check — item widget_c out of stock
 *   2 violations found
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  const order = {
    customer: 'acme',
    items: ['widget_a', 'widget_b', 'widget_c'],
    total: 150,
  };

  const creditLimits: Record<string, number> = { acme: 100, globex: 500 };
  const stock: Record<string, number> = { widget_a: 10, widget_b: 5, widget_c: 0 };

  const violations: Array<{ customer: string; rule: string; detail: string }> = [];

  pl.registerForeign('order_customer', 1, (c) => c === order.customer);
  pl.registerForeign('order_total', 1, (t) => (t as number) === order.total);
  pl.registerForeign('order_item', 1, (item) => order.items.includes(item as string));
  pl.registerForeign('credit_limit', 2, (customer, limit) => {
    return creditLimits[customer as string] === (limit as number);
  });
  pl.registerForeign('in_stock', 1, (item) => (stock[item as string] ?? 0) > 0);
  pl.registerForeign('emit_violation', 3, (customer, rule, detail) => {
    violations.push({
      customer: customer as string,
      rule: rule as string,
      detail: detail as string,
    });
    return true;
  });

  pl.consult(`
    validate_order :-
      order_customer(C),
      check_credit(C),
      check_stock(C).

    check_credit(C) :-
      order_total(T),
      credit_limit(C, Limit),
      ( T > Limit ->
        emit_violation(C, credit_check, 'insufficient credit')
      ; true ).

    check_stock(C) :-
      order_item(Item),
      ( \\+ in_stock(Item) ->
        atom_concat('item ', Item, Msg1),
        atom_concat(Msg1, ' out of stock', Msg),
        emit_violation(C, stock_check, Msg)
      ; true ),
      fail.
    check_stock(_).
  `);

  console.log(`Validating order: ${JSON.stringify(order)}`);
  pl.query('validate_order').first();

  for (const v of violations) {
    console.log(`VIOLATION: ${v.customer} — ${v.rule} — ${v.detail}`);
  }
  console.log(`${violations.length} violations found`);

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
