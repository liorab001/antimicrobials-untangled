#!/usr/bin/env node
'use strict';
/* Fingerprint-scoped ROI drafts, the disabled importer, and the drug queue. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const { importRoiPatterns, fingerprintOf } = require('../tools/import-roi-patterns.cjs');

const root = path.resolve(__dirname, '..');
const database = JSON.parse(fs.readFileSync(path.join(root, 'amu-database.json'), 'utf8'));
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout, URL, TextEncoder, TextDecoder, structuredClone });
vm.runInContext(fs.readFileSync(path.join(root, 'amu-engine.js'), 'utf8') + '\n;globalThis.__factory = engineFactory;', ctx);
const api = ctx.__factory(true);

const identity = { document_id: 'doc-examplemycin', genericName: 'examplemycin', sourceId: 'fixture', status: 'reference', testOnly: true };
const label = {
  identity,
  indications_and_usage: ['Examplemycin is indicated for zygomycosis.'],
  dosage_and_administration: [
    'Zygomycosis: 1.5 million international units every 6 hours.',
    'Zygomycosis: 250 mg every 8 hours for 7 days.',
    'Aspergillosis: 1.5 million international units every 6 hours.'
  ]
};

function analyze(db, source) {
  api.workerInit(JSON.parse(JSON.stringify(db)));
  return JSON.parse(JSON.stringify(api.workerRun({ kind: 'analyze', request: { label: source, patient: {}, clinicalContext: { indication: 'zygomycosis', treatment_intent: 'treatment' } } })));
}

function region(result, text) {
  const found = result.roi.regions.find(item => item.sourceText.includes(text));
  assert.ok(found, 'missing selected region: ' + text);
  return found;
}

async function rejects(fn, text) {
  try {
    await fn();
    assert.fail('expected failure: ' + text);
  } catch (error) {
    assert.match(error.message, new RegExp(text));
  }
}

(async () => {
  const originalIds = database.formats.map(format => format.id);
  const baseline = analyze(database, label);
  const oddRegion = region(baseline, 'million international units');
  const ordinary = region(baseline, '250 mg');
  const odd = baseline.roi.unmatchedPatterns.find(item => item.sourceText.includes('million international units'));
  assert.strictEqual(oddRegion.status, 'unmatched_pattern');
  assert.deepStrictEqual(oddRegion.matchedFormats, []);
  assert.strictEqual(oddRegion.indication, 'Zygomycosis');
  assert.ok(ordinary.matchedFormats.includes('scoped_numeric_dose_prose'));
  assert.ok(baseline.regimens.some(item => /250 mg/.test(item.dose.sourceText)));
  assert.ok(baseline.roi.skippedRegions.some(item => /Aspergillosis/.test(item.indication || '') && item.reason === 'different_or_unestablished_context'));

  const draft = odd.formatDraft;
  assert.strictEqual(draft.enabled, false);
  assert.strictEqual(draft.id, odd.fingerprint);
  assert.strictEqual(draft.output.mayCreateRegimen, false);
  assert.deepStrictEqual(draft.applicability.fieldRefs, []);
  assert.notStrictEqual(draft.documentation.roiPattern.status, 'validated');
  assert.strictEqual(draft.processing.parameters.selector.roiFingerprint, odd.fingerprint);
  assert.ok(draft.recognition.args.some(item => item.op === 'contains' && item.right === odd.fingerprint));
  assert.strictEqual(fingerprintOf(odd.shape), odd.fingerprint);
  assert.strictEqual(api.AMUEngine.version, '1.1.2');

  const tampered = JSON.parse(JSON.stringify({
    reportType: 'amu-roi-pattern-review/1',
    unmatchedPatterns: [odd]
  }));
  tampered.unmatchedPatterns[0].formatDraft.id = 'examplemycin_regimen';
  tampered.unmatchedPatterns[0].formatDraft.enabled = true;
  tampered.unmatchedPatterns[0].formatDraft.recognition = { op: 'eq', left: { path: 'scope.kind' }, right: 'prose.clause' };
  const already = database.formats.some(format => format.id === odd.fingerprint);
  const imported = await importRoiPatterns(database, tampered);
  const stored = imported.database.formats.find(format => format.id === odd.fingerprint);
  assert.ok(stored);
  assert.strictEqual(imported.summary.formats, already ? 0 : 1);
  const nextVersion = database.databaseVersion.replace(/\d+$/, n => String(Number(n) + 1));
  assert.strictEqual(imported.summary.databaseVersion, imported.summary.formats || imported.summary.upgraded || imported.summary.fixtures ? nextVersion : database.databaseVersion);
  assert.strictEqual(stored.enabled, false);
  assert.strictEqual(stored.output.mayCreateRegimen, false);
  assert.deepStrictEqual(stored.applicability.fieldRefs, []);
  assert.strictEqual(stored.processing.parameters.selector.roiFingerprint, odd.fingerprint);
  assert.ok(!imported.database.formats.some(format => format.id === 'examplemycin_regimen'));
  assert.deepStrictEqual(imported.database.formats.filter(format => format.id !== odd.fingerprint).map(format => format.id), originalIds.filter(id => id !== odd.fingerprint));
  for (const format of database.formats) {
    if (format.id === odd.fingerprint) continue;
    assert.strictEqual(JSON.stringify(imported.database.formats.find(item => item.id === format.id)), JSON.stringify(format));
  }
  const fixture = imported.database.fixtures.find(item => item.kind === 'roi_pattern_observation' && item.fingerprint === odd.fingerprint);
  assert.strictEqual(fixture.testOnly, true);
  assert.strictEqual(fixture.maySupplyLabelDose, false);
  assert.strictEqual(fixture.fingerprint, odd.fingerprint);

  const again = await importRoiPatterns(imported.database, tampered);
  assert.strictEqual(again.summary.formats, 0);
  assert.strictEqual(again.summary.duplicates, 1);
  assert.strictEqual(again.summary.fixtures, 0);
  assert.strictEqual(again.database.databaseVersion, imported.summary.databaseVersion);

  const broad = JSON.parse(JSON.stringify(imported.database));
  const existing = broad.formats.find(format => format.id === odd.fingerprint);
  existing.recognition = { op: 'eq', left: { path: 'scope.kind' }, right: 'prose.clause' };
  existing.processing.parameters.selector = { nodeTypes: ['prose.clause'] };
  const upgraded = await importRoiPatterns(broad, tampered);
  assert.strictEqual(upgraded.summary.upgraded, 1);
  assert.strictEqual(upgraded.database.formats.find(format => format.id === odd.fingerprint).version, 2);
  assert.strictEqual(upgraded.database.formats.find(format => format.id === odd.fingerprint).processing.parameters.selector.roiFingerprint, odd.fingerprint);

  const disabled = analyze(imported.database, label);
  assert.ok(disabled.regimens.some(item => /250 mg/.test(item.dose.sourceText)));
  assert.ok(!disabled.roi.regions.some(item => item.matchedFormats.includes(odd.fingerprint)));
  assert.strictEqual(region(disabled, 'million international units').status, 'unmatched_pattern');

  const forced = JSON.parse(JSON.stringify(imported.database));
  forced.formats.find(format => format.id === odd.fingerprint).enabled = true;
  const stillOff = analyze(forced, label);
  assert.ok(!stillOff.roi.regions.some(item => item.matchedFormats.includes(odd.fingerprint)));
  assert.ok(stillOff.regimens.some(item => /250 mg/.test(item.dose.sourceText)));

  const reviewed = JSON.parse(JSON.stringify(forced));
  const reviewedDraft = reviewed.formats.find(format => format.id === odd.fingerprint);
  reviewedDraft.documentation.roiPattern.status = 'validated';
  const scoped = analyze(reviewed, label);
  assert.ok(region(scoped, 'million international units').matchedFormats.includes(odd.fingerprint));
  assert.ok(!region(scoped, '250 mg').matchedFormats.includes(odd.fingerprint));
  assert.ok(scoped.regimens.some(item => /250 mg/.test(item.dose.sourceText)));
  assert.ok(scoped.roi.skippedRegions.some(item => /Aspergillosis/.test(item.indication || '') && item.reason === 'different_or_unestablished_context'));

  const queue = await importRoiPatterns(database, {
    reportType: 'amu-roi-drug-queue/1',
    drugs: [{ name: 'Vancomycin', sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/' }, { name: 'Examplemycin' }]
  });
  assert.strictEqual(queue.summary.formats, 0);
  assert.strictEqual(queue.summary.queued, 2);
  assert.strictEqual(queue.database.formats.length, database.formats.length);
  assert.ok(queue.database.fixtures.some(item => item.kind === 'roi_drug_queue' && item.drugName === 'Vancomycin' && item.testOnly === true && item.status === 'awaiting_unmatched_pattern_export'));
  assert.ok(!queue.database.formats.some(format => /vancomycin/i.test(format.id)));

  const collision = JSON.parse(JSON.stringify(database));
  collision.formats[0].id = odd.fingerprint;
  await rejects(() => importRoiPatterns(collision, tampered), 'live format');
  const validated = JSON.parse(JSON.stringify(tampered));
  validated.unmatchedPatterns[0].formatDraft.documentation.roiPattern = { status: 'validated' };
  await rejects(() => importRoiPatterns(database, validated), 'validated');
  const withPatient = JSON.parse(JSON.stringify(tampered));
  withPatient.patient = { weight: 70 };
  await rejects(() => importRoiPatterns(database, withPatient), 'patient');
  const mismatch = JSON.parse(JSON.stringify(tampered));
  mismatch.unmatchedPatterns[0].fingerprint = 'roi_00000000';
  await rejects(() => importRoiPatterns(database, mismatch), 'fingerprint');

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'amu-roi-'));
  const observationPath = path.join(directory, 'observations.json');
  const outputPath = path.join(directory, 'next.json');
  fs.writeFileSync(observationPath, JSON.stringify(tampered));
  const command = spawnSync(process.execPath, [path.join(root, 'tools/import-roi-patterns.cjs'), path.join(root, 'amu-database.json'), observationPath, outputPath], { encoding: 'utf8' });
  assert.strictEqual(command.status, 0, command.stderr);
  const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.strictEqual(written.databaseVersion, imported.summary.databaseVersion);
  assert.strictEqual(written.formats.find(format => format.id === odd.fingerprint).enabled, false);
  console.log('roi-import: ' + (written.formats.length - database.formats.length) + ' disabled fingerprint draft, queue and sibling-disease checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
