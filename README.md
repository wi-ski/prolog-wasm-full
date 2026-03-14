# prolog-wasm-full

**SWI-Prolog 10.1.4 in WebAssembly. Zero dependencies. One `npm install`.**

Write Prolog predicates in JavaScript. Load rules from strings. Solve constraints with CLP(FD). Query graphs. Validate data. All from TypeScript with full type safety.

```bash
npm install prolog-wasm-full
```

## Why not `swipl-wasm`?

|                                  | `swipl-wasm`                                          | `prolog-wasm-full`                                    |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| SWI-Prolog version               | 10.1.3                                                | **10.1.4**                                            |
| Runtime deps                     | yes                                                   | **zero**                                              |
| JS → Prolog predicates           | **impossible** (no addFunction, table not growable)   | **`registerForeign(name, arity, fn)`**                |
| `addFunction` / `removeFunction` | not exported                                          | **exported + `ALLOW_TABLE_GROWTH`**                   |
| `ccall`                          | not exported                                          | **exported**                                          |
| `wasmTable` / `wasmMemory`       | not exposed                                           | **exposed**                                           |
| Query API                        | `once()` / manual `next()` / `forEach` on Engine only | **`.first()`, `.all()`, `.forEach()` on every query** |
| CLP(FD)                          | requires file consult workaround                      | **`consult(string)` one-liner**                       |
| Term marshaling                  | opaque PrologCompound objects                         | **recursive JS ↔ Prolog conversion**                  |
| Consult from string              | manual FS.writeFile + call                            | **`consult(source)` one-liner**                       |
| emsdk                            | unknown                                               | **5.0.2** (latest)                                    |

## Quick start

```typescript
import { initProlog } from "prolog-wasm-full";

const pl = await initProlog();

// Query
const r = pl.query("member(X, [a, b, c])").all();
console.log(r.map((b) => b.X)); // ['a', 'b', 'c']

// Foreign predicate — JS function callable from Prolog
pl.registerForeign("is_admin", 1, (user) => user === "alice");
pl.query("is_admin(alice)").first(); // { X: 'alice' }
pl.query("is_admin(bob)").first(); // null (failed)

// Load rules from a string
pl.consult(`
  allowed(User, Action) :- is_admin(User), Action = anything.
  allowed(User, read) :- \\+ is_admin(User).
`);

// CLP(FD) constraint solving
pl.consult(`
  :- use_module(library(clpfd)).
  schedule(X, Y) :- [X, Y] ins 1..5, X + Y #= 7, X #< Y, label([X, Y]).
`);
pl.query("schedule(X, Y)").all();
// [{ X: 2, Y: 5 }, { X: 3, Y: 4 }]

pl.dispose();
```

## Examples

Every example is copy-paste-runnable:

```bash
git clone <repo> && cd prolog-wasm-full && npm install
npx tsx examples/01-hello.ts
```

| #   | Example                   | Feature                                                |
| --- | ------------------------- | ------------------------------------------------------ |
| 01  | `01-hello.ts`             | Basic queries, arithmetic, list operations             |
| 02  | `02-foreign-predicate.ts` | JS functions as Prolog predicates                      |
| 03  | `03-rules-engine.ts`      | Hot-reloadable rules with JS ground truth              |
| 04  | `04-clpfd-scheduling.ts`  | CLP(FD) constraint solving for scheduling              |
| 05  | `05-live-data.ts`         | Prolog queries your JS data layer live                 |
| 06  | `06-validation.ts`        | Rules-driven validation with violation collection      |
| 07  | `07-graph-query.ts`       | Path finding, reachability, graph queries              |
| 08  | `08-query-patterns.ts`    | first/all/forEach, findall, aggregate, limit, distinct |
| 09  | `09-dynamic-facts.ts`     | Assert, retract, hot-swap facts at runtime             |
| 10  | `10-clpb.ts`              | CLP(B) boolean constraints — SAT solving               |
| 11  | `11-dcg-parsing.ts`       | DCG grammars — parse and validate strings              |
| 12  | `12-tabling.ts`           | Tabling/memoization — fibonacci, cycle-safe graphs     |
| 13  | `13-raw-pl-api.ts`        | Raw PL\_\* C API — term construction, manual queries   |
| 14  | `14-worker-pool.ts`       | Multi-user worker pool with session routing            |

### Example output

```bash
$ npx tsx examples/01-hello.ts
X = hello
Members: a, b, c
2 + 3 = 5

$ npx tsx examples/02-foreign-predicate.ts
alice can read: true
alice can delete: false
bob can read: true
bob can write: false

$ npx tsx examples/03-rules-engine.ts
alice can access: ["settings", "reports"]
bob can access: ["reports"]
eve can access: []

$ npx tsx examples/04-clpfd-scheduling.ts
Schedule 1: standup=1 design=2 review=3 retro=4
Schedule 2: standup=1 design=2 review=3 retro=5
...
Found 20 valid schedules

$ npx tsx examples/07-graph-query.ts
Reachable from a: ["b", "c", "d", "e"]
Path a → e: ["a", "b", "d", "e"]
All paths a → d: [["a", "b", "d"], ["a", "c", "d"]]

$ npx tsx examples/08-query-patterns.ts
first(): X = a
all(): ["a", "b", "c"]
forEach(): a, b, c
findall: [1, 2, 3, 4, 5]
aggregate count: 3
aggregate max: 5
limit 2: ["a", "b"]
distinct: [1, 2, 3]

$ npx tsx examples/09-dynamic-facts.ts
Initial: ["alice", "bob"]
After adding carol: ["alice", "bob", "carol"]
After removing bob: ["alice", "carol"]
Rule: seniors = ["alice"]

$ npx tsx examples/10-clpb.ts
At-least-2-of-3 solutions:
  X=0 Y=1 Z=1
  X=1 Y=0 Z=1
  X=1 Y=1 Z=0
  X=1 Y=1 Z=1
Tautology check (X + ~X): true

$ npx tsx examples/11-dcg-parsing.ts
Parse "hello world": ["hello", "world"]
Greeting valid: true
Nonsense valid: false

$ npx tsx examples/12-tabling.ts
fib(10) = 55
fib(30) = 832040
Reachable from a: ["c", "d", "b"]

$ npx tsx examples/13-raw-pl-api.ts
Created term with integer: 42
Read back: 42
Created atom: hello (id: 689669)
Manual query - X = 1
Manual query - X = 2
Manual query - X = 3

$ npx tsx examples/14-worker-pool.ts
Pool ready: 4 workers
[worker 0] alice  → members: [a, b, c]   (5ms)
[worker 1] bob    → sum: 15              (2ms)
All 8 requests completed
```

## API Reference

### `initProlog(): Promise<PrologFull>`

Loads the WASM binary and returns the full API:

```typescript
const pl = await initProlog();
// pl.query(goal)           — ergonomic query with .first(), .all(), .forEach()
// pl.consult(source)       — load Prolog rules from a string
// pl.assertClause(clause)  — assert a single clause
// pl.registerForeign(...)  — register a JS function as a Prolog predicate
// pl.em                    — raw Emscripten module (addFunction, ccall, FS, ...)
// pl.pl                    — raw PL_* C API via ccall (60+ functions)
// pl.stock                 — stock swipl-wasm prolog object (query, call, forEach)
// pl.dispose()             — clean up
```

### `pl.query(goal)`

```typescript
pl.query("member(X, [1, 2, 3])").first(); // { X: 1 } or null
pl.query("member(X, [1, 2, 3])").all(); // [{ X: 1 }, { X: 2 }, { X: 3 }]
pl.query("member(X, [1, 2, 3])").forEach((r) => console.log(r.X));
```

### `pl.registerForeign(name, arity, fn): Disposer`

The killer feature. Register a JS function as a Prolog predicate. Prolog calls it during inference.

```typescript
const dispose = pl.registerForeign("check", 2, (user, action) => {
  return myDb.canDo(user as string, action as string);
});

// Now Prolog can call it:
pl.query("check(alice, read)").first(); // succeeds if myDb says so

// Use it in rules:
pl.consult(`
  allowed(User, Resource) :-
    check(User, read),
    Resource = public.
`);

dispose(); // releases the WASM function table slot
```

Arguments are automatically marshaled: atoms → strings, integers → numbers, floats → numbers, lists → arrays. Return `true` for success, `false` for failure.

### `pl.consult(source)`

Load Prolog rules from a string. Handles directives (`:- use_module(...)`) and clause definitions.

```typescript
pl.consult(`
  :- use_module(library(clpfd)).
  solve(X, Y) :- X in 1..10, Y in 1..10, X + Y #= 15, label([X, Y]).
`);
```

### `pl.assertClause(clause)`

Assert a single fact or rule dynamically.

```typescript
pl.assertClause("parent(tom, bob)");
pl.assertClause("ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y)");
```

### Raw PL\_\* API

For anything not covered by the ergonomic API — 60+ PL\_\* functions via ccall:

```typescript
const { pl, em } = await initProlog();

const t = pl.new_term_ref();
pl.put_integer(t, 42);
const n = pl.get_integer(t); // 42

const atom = pl.new_atom("hello");
pl.atom_chars(atom); // 'hello'

// Register foreign predicate at the C level
const ptr = em.addFunction((t0, arity, ctx) => 1, "iiii");
pl.register_foreign("my_pred", 2, ptr, 0x08);
```

### Raw Emscripten module

Full access to the WASM runtime:

```typescript
const { em } = await initProlog();
em.addFunction(fn, sig); // create function table entry
em.removeFunction(ptr); // release it
em.ccall(name, ret, args, vals); // call any C function
em.FS.writeFile(path, data); // virtual filesystem
em.wasmTable; // WebAssembly.Table (growable)
em.wasmMemory; // WebAssembly.Memory
```

## Available Libraries

Loaded via `consult(':- use_module(library(X)).')`:

| Library              | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `clpfd`              | Finite domain constraints (integers)                         |
| `clpr`               | Real-valued constraints                                      |
| `clpb`               | Boolean constraints (SAT)                                    |
| `lists`              | List operations (member, append, nth, ...)                   |
| `apply`              | Higher-order predicates (maplist, foldl, include, exclude)   |
| `assoc`              | Association lists (key-value maps)                           |
| `ordsets`            | Ordered set operations                                       |
| `pairs`              | Key-value pair operations                                    |
| `aggregate`          | Aggregation (count, sum, max, bag, set)                      |
| `dcg/basics`         | DCG grammar primitives                                       |
| `dcg/high_order`     | DCG higher-order rules                                       |
| `chr`                | Constraint Handling Rules                                    |
| `tabling`            | Tabling / memoization (built-in, use `:- table pred/arity.`) |
| `solution_sequences` | limit/2, offset/2, distinct/2, order_by/2                    |
| `persistency`        | Persistent predicates                                        |
| `xpath`              | XML/HTML querying                                            |
| `sgml`               | XML/HTML parsing                                             |
| `record`             | Named compound terms                                         |
| `option`             | Option list processing                                       |
| `debug`              | Debug messages                                               |

## FAQ

### How do I use this in a multi-user server?

Use `worker_threads`. Each worker holds a hot Prolog instance (~4 MB). See `examples/14-worker-pool.ts`.

```typescript
import { Worker } from "worker_threads";

// Worker script: init once, process requests forever
// Each pl.query() creates a fresh context — no state leaks
```

Cost: ~4 MB per worker (vs 25 MB for Z3). Context creation is microseconds. The WASM instance stays hot.

### Can two users share a worker?

Yes. `query()`, `consult()`, `assertClause()` all operate on the shared Prolog database, but each query call is independent. For full isolation, create separate contexts or use separate workers.

### Does this work in the browser?

The WASM binary works in browsers with `SharedArrayBuffer` support. The `initProlog()` loader currently uses Node.js APIs — a browser-compatible loader is planned.

### What about nondet (backtracking) foreign predicates?

The current `registerForeign` supports deterministic predicates only (succeed or fail, no backtracking). For predicates that need to generate multiple solutions, assert facts from JS and query them, or use `findall/3` with the deterministic predicate as a filter.

## Binary

Ships a custom SWI-Prolog 10.1.4 WASM binary built from source with:

- **`addFunction` / `removeFunction`** — dynamic foreign predicate registration from JS
- **`ALLOW_TABLE_GROWTH`** — growable function table
- **`ccall`** — ad-hoc C function calls
- **`wasmTable` / `wasmMemory`** — direct WASM introspection
- **emsdk 5.0.2** — latest Emscripten
- **PCRE2 10.47** — regex support
- **zlib 1.3.2** — compression

Build your own: `cd build && ./build.sh` (requires Docker)

## Tests

```bash
npm test          # 44 tests, ~330ms
npm run test:watch
```

## License

MIT
