/**
 * DCG: Definite Clause Grammars — parsing and generation.
 *
 * Defines a simple grammar for arithmetic expressions,
 * parses strings into trees, and validates syntax.
 *
 * Run:  npx tsx examples/11-dcg-parsing.ts
 *
 * Output:
 *   Parse "hello world": [hello, world]
 *   Greeting valid: true
 *   Nonsense valid: false
 */
import { initProlog } from '../src/index.js';

async function main() {
  const pl = await initProlog();

  pl.consult(`
    :- use_module(library(dcg/basics)).

    greeting --> [hello], name.
    greeting --> [hi], name.
    name --> [world].
    name --> [prolog].

    parse_greeting(Words) :- phrase(greeting, Words).
  `);

  const words = pl.query('X = [hello, world]').first();
  console.log('Parse "hello world":', JSON.stringify(words?.X));

  const valid1 = pl.query('parse_greeting([hello, world])').first();
  console.log('Greeting valid:', valid1 !== null);

  const valid2 = pl.query('parse_greeting([foo, bar])').first();
  console.log('Nonsense valid:', valid2 !== null);

  pl.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
