/**
 * Multi-user worker pool: hot Prolog instances serving concurrent requests.
 *
 * 4 workers, each with a persistent SWI-Prolog WASM instance (~4 MB).
 * Requests route by userId for session affinity.
 *
 * Run:  npx tsx examples/14-worker-pool.ts
 *
 * Output:
 *   Pool ready: 4 workers
 *   [worker 0] alice  → members: [a, b, c]   (5ms)
 *   [worker 1] bob    → sum: 15              (2ms)
 *   ...
 *   All 8 requests completed
 */
import { Worker, isMainThread, parentPort } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

if (!isMainThread) {
  const { initProlog } = await import('../dist/index.js');
  let pl: Awaited<ReturnType<typeof initProlog>>;

  parentPort!.on('message', async (req: { id: number; userId: string; goal: string; vars: string[] }) => {
    if (!pl) {
      pl = await initProlog();
      pl.consult(`
        :- use_module(library(clpfd)).
        schedule(X, Y) :- [X, Y] ins 1..5, X + Y #= 7, X #< Y, label([X, Y]).
      `);
    }

    const t0 = performance.now();
    const results = pl.query(req.goal).all();
    const ms = (performance.now() - t0).toFixed(0);

    const output = results.map(r => {
      const vals = req.vars.map(v => `${v}=${r[v]}`);
      return vals.join(', ');
    }).join(' | ');

    parentPort!.postMessage({ id: req.id, userId: req.userId, output: output || 'no results', ms });
  });
} else {
  const POOL_SIZE = 4;
  const thisFile = fileURLToPath(import.meta.url);
  const tsxPath = 'tsx/esm';

  const workers: Worker[] = [];
  const pending = new Map<number, (r: any) => void>();
  let nextId = 0;

  for (let i = 0; i < POOL_SIZE; i++) {
    const w = new Worker(thisFile, { execArgv: ['--import', tsxPath] });
    w.on('message', (msg) => { const r = pending.get(msg.id); if (r) { pending.delete(msg.id); r(msg); } });
    w.on('error', (e) => console.error('Worker error:', e.message));
    workers.push(w);
  }

  function route(userId: string): number {
    return crypto.createHash('md5').update(userId).digest().readUInt32BE(0) % POOL_SIZE;
  }

  function solve(userId: string, goal: string, vars: string[]): Promise<any> {
    return new Promise(resolve => {
      const id = nextId++;
      pending.set(id, resolve);
      workers[route(userId)].postMessage({ id, userId, goal, vars });
    });
  }

  console.log(`Pool ready: ${POOL_SIZE} workers`);

  const requests = [
    { userId: 'alice', goal: 'member(X, [a, b, c])', vars: ['X'] },
    { userId: 'bob', goal: 'X is 5 + 10', vars: ['X'] },
    { userId: 'carol', goal: 'schedule(X, Y)', vars: ['X', 'Y'] },
    { userId: 'dave', goal: 'member(X, [1, 2, 3]), X > 1', vars: ['X'] },
    { userId: 'alice', goal: 'append([1,2], [3,4], X)', vars: ['X'] },
    { userId: 'bob', goal: 'length([a,b,c,d,e], N)', vars: ['N'] },
    { userId: 'carol', goal: 'between(1, 5, X)', vars: ['X'] },
    { userId: 'dave', goal: 'succ(3, X)', vars: ['X'] },
  ];

  const results = await Promise.all(requests.map(r => solve(r.userId, r.goal, r.vars)));

  for (const r of results) {
    const idx = route(r.userId);
    console.log(`[worker ${idx}] ${r.userId.padEnd(8)} → ${r.output.padEnd(30)} (${r.ms}ms)`);
  }

  console.log(`\nAll ${requests.length} requests completed`);
  for (const w of workers) w.terminate();
  process.exit(0);
}
