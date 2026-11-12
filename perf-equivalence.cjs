#!/usr/bin/env node
/* Performance + result-equivalence check for the AMU engine.
 *
 *   node tests/perf-equivalence.cjs                              # timing + determinism
 *   node tests/perf-equivalence.cjs --baseline path/to/old-amu-engine.js   # also prove identical results
 *
 * Corpus: every `runtime_request` fixture in amu-database.json, each run under five patient contexts
 * (as supplied, CrCl 12, eGFR 45, eGFR 95, child 8 y / 25 kg), plus the roiSourceArchives labels.
 * Results are compared after removing the `processing` timing metadata. Exits 1 on any difference.
 * Uses only the embedded fixtures: no network, no browser, no patient data.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const root = path.resolve(__dirname, '..');
const enginePath = path.resolve(arg('engine') || path.join(root, 'amu-engine.js'));
const databasePath = path.resolve(arg('database') || path.join(root, 'amu-database.json'));
const baselinePath = arg('baseline') ? path.resolve(arg('baseline')) : null;
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

function loadWorkerApi(file) {            // runs the engine's isolated worker core in-process
  const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout, URL, TextEncoder, TextDecoder, structuredClone });
  vm.runInContext(fs.readFileSync(file, 'utf8') + '\n;globalThis.__factory = engineFactory;', ctx);
  return ctx.__factory(true);
}
const fields = database.fieldDefinitions;
const typed = (id, value) => ({ value, unit: fields[id] ? fields[id].unit : null, metric: id });
const contexts = [
  ['as-supplied', p => p],
  ['crcl-12', p => ({ ...p, crcl: typed('crcl', 12) })],
  ['egfr-45', p => ({ ...p, egfr: typed('egfr', 45) })],
  ['egfr-95', p => ({ ...p, egfr: typed('egfr', 95) })],
  ['child', p => ({ ...p, age: typed('age', 8), weight: typed('weight', 25) })]
];
const requests = [];
for (const f of database.fixtures.filter(f => f.kind === 'runtime_request'))
  for (const [name, fn] of contexts) requests.push({ id: f.id + '#' + name, request: { ...f.request, patient: fn(f.request.patient || {}) } });
const archiveContext = { 'didanosine-archive': 'HIV-1 infection', 'dec-filariasis': 'filariasis', 'dec-loiasis': 'loiasis' };
for (const r of (database.referenceCollections.roiSourceArchives || { records: [] }).records)
  for (const [name, fn] of contexts.slice(0, 3))
    requests.push({ id: r.id + '#' + name, request: { label: r.label, patient: fn({}), clinicalContext: { indication: archiveContext[r.id] || r.id, treatment_intent: 'treatment' } } });

function run(file) {
  const api = loadWorkerApi(file), results = new Map();
  let t = performance.now(); api.workerInit(JSON.parse(JSON.stringify(database))); const initMs = performance.now() - t;
  t = performance.now();
  for (const { id, request } of requests) {
    let body;
    try { body = JSON.parse(JSON.stringify(api.workerRun({ kind: 'analyze', request: JSON.parse(JSON.stringify(request)) }))); delete body.processing; }
    catch (error) { body = { error: error.code || error.message }; }
    results.set(id, crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'));
  }
  const firstPassMs = performance.now() - t;
  t = performance.now();
  for (const { request } of requests) { try { api.workerRun({ kind: 'analyze', request: JSON.parse(JSON.stringify(request)) }); } catch (e) { /* timing only */ } }
  return { initMs, firstPassMs, warmPassMs: performance.now() - t, results };
}
const fmt = ms => ms.toFixed(0).padStart(6) + ' ms';
console.log(`${requests.length} requests from ${databasePath}`);
const current = run(enginePath);
console.log(`engine   ${path.basename(enginePath)}: init${fmt(current.initMs)} | first pass${fmt(current.firstPassMs)} | warm pass${fmt(current.warmPassMs)}`);
let failures = 0;
const again = run(enginePath);
const unstable = [...current.results].filter(([id, h]) => again.results.get(id) !== h).length;
console.log(`determinism: ${unstable === 0 ? 'identical on a second run' : unstable + ' results changed between two identical runs'}`);
failures += unstable;
if (baselinePath) {
  const baseline = run(baselinePath);
  console.log(`baseline ${path.basename(baselinePath)}: init${fmt(baseline.initMs)} | first pass${fmt(baseline.firstPassMs)} | warm pass${fmt(baseline.warmPassMs)}`);
  const different = [...baseline.results].filter(([id, h]) => current.results.get(id) !== h).map(([id]) => id);
  console.log(`equivalence: ${different.length === 0 ? 'all ' + requests.length + ' results identical to the baseline' : different.length + ' DIFFER, e.g. ' + different.slice(0, 5).join(', ')}`);
  failures += different.length;
}
process.exit(failures ? 1 : 0);
