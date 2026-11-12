#!/usr/bin/env node
'use strict';
/*
 * Add ROI observations to a replacement database. Drafts stay disabled.
 *
 *   node tools/import-roi-patterns.cjs amu-database.json observations.json amu-database-next.json
 *
 * observations.json is one of:
 *   amu-roi-pattern-review/1   unmatched label patterns from the ROI inspector
 *   amu-roi-drug-queue/1       drug names to review later; this adds no formats
 *
 * A pattern draft recognizes only its structural fingerprint. This command
 * never sets roiPattern.status to "validated" and never enables a format.
 * Existing format IDs are preserved. Observations are test-only fixtures.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ACTIVATION = 'disabled_until_source_review_and_executable_tests';
const FORMAT_ID = /^[a-z][a-z0-9_]*$/;
const FINGERPRINT_ID = /^roi_[0-9a-f]{8}$/;

function fail(message) {
  const error = new Error(message);
  error.code = 'ROI_IMPORT';
  throw error;
}

function normHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function fingerprintOf(shape) {
  if (!shape || (shape.kind !== 'table.row' && shape.kind !== 'prose.clause') || !Array.isArray(shape.columns) || !shape.captures || typeof shape.captures !== 'object' || Array.isArray(shape.captures)) {
    fail('Each pattern needs a prose.clause or table.row shape with columns and captures.');
  }
  return 'roi_' + normHash(JSON.stringify({ kind: shape.kind, columns: shape.columns, captures: shape.captures }));
}

function bumpVersion(version) {
  const parts = String(version || '0.0.0').split('.').map(part => Number(part) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.slice(0, 3).join('.');
}

function inactiveDraft(format) {
  const status = format && format.documentation && format.documentation.roiPattern && format.documentation.roiPattern.status;
  return typeof status === 'string' && status !== 'validated';
}

function rejectPatientValues(value, pathName) {
  if (!value || typeof value !== 'object') return;
  if (Object.prototype.hasOwnProperty.call(value, 'patient')) fail('Pattern observations cannot contain patient values (' + pathName + ').');
  for (const key of Object.keys(value)) rejectPatientValues(value[key], pathName + '.' + key);
}

function draftFrom(database, pattern) {
  const shape = pattern.shape;
  const fingerprint = fingerprintOf(shape);
  if (pattern.fingerprint !== fingerprint) fail('Pattern fingerprint does not match its structural shape (' + (pattern.fingerprint || 'missing') + ').');
  if (typeof pattern.sourceText !== 'string' || !pattern.sourceText.trim() || pattern.sourceText.length > 20000) fail('Each pattern needs the public source passage that produced it.');
  const policy = database.lexicons && database.lexicons.roi;
  if (!policy || policy.enabled !== true || !policy.patternDraft || !Array.isArray(policy.sourceFields)) fail('Database ROI policy cannot build a pattern draft.');
  const reference = database.formats.find(format => format.processing && format.processing.pipelineRef === policy.patternDraft.pipelineRef && format.mode === 'extractor' && format.enabled);
  if (!reference) fail('Database has no enabled extractor for the ROI draft pipeline.');
  const draft = JSON.parse(JSON.stringify(reference));
  const scopeKind = shape.kind === 'table.row' ? 'table' : 'prose.clause';
  const sourceDocument = pattern.sourceIdentity && pattern.sourceIdentity.document_id || pattern.formatDraft && pattern.formatDraft.documentation && pattern.formatDraft.documentation.sourceDocument || null;
  draft.id = fingerprint;
  draft.version = 1;
  draft.enabled = false;
  draft.priority = 60;
  draft.recognition = { op: 'all', args: [
    { op: 'eq', left: { path: 'scope.kind' }, right: scopeKind },
    { op: 'eq', left: { path: 'features.roi.selected' }, right: true },
    { op: 'contains', left: { path: 'features.roi.fingerprints' }, right: fingerprint }
  ] };
  draft.applicability = { fieldRefs: [], missingValue: 'unresolved', conflictingValues: 'unresolved' };
  draft.output = Object.assign({}, draft.output, { mayCreateRegimen: false });
  draft.documentation = {
    summary: 'Unmatched ROI pattern draft. Recognition is limited to this structural fingerprint and stays disabled until source review and executable tests.',
    observedShape: { fingerprint, kind: shape.kind, columns: shape.columns, captures: shape.captures },
    sourceDocument,
    roiPattern: { status: policy.patternDraft.activation || ACTIVATION, fingerprint, maySupplyLabelDose: false }
  };
  draft.processing = Object.assign({}, draft.processing, { parameters: Object.assign({}, draft.processing.parameters, { selector: { nodeTypes: [shape.kind], withinSourceFields: policy.sourceFields, roiFingerprint: fingerprint } }) });
  if (!FORMAT_ID.test(draft.id) || !FINGERPRINT_ID.test(draft.id)) fail('Draft id is not a structural fingerprint.');
  if (draft.documentation.roiPattern.status === 'validated' || draft.enabled) fail('Importer cannot validate or enable a draft.');
  return draft;
}

function sameDraft(left, right) {
  const copy = value => {
    const clone = JSON.parse(JSON.stringify(value));
    clone.version = 0;
    if (clone.documentation) clone.documentation.sourceDocument = null;
    return clone;
  };
  return JSON.stringify(copy(left)) === JSON.stringify(copy(right));
}

function observationFixture(pattern, fingerprint) {
  const identity = pattern.sourceIdentity || {};
  const digest = crypto.createHash('sha256').update(JSON.stringify({
    fingerprint,
    document: identity.document_id || null,
    text: pattern.sourceText
  })).digest('hex').slice(0, 12);
  return {
    id: 'roi_obs_' + fingerprint.slice(4) + '_' + digest,
    kind: 'roi_pattern_observation',
    testOnly: true,
    embeddedSourceText: true,
    runtimeExtractionResult: 'not_asserted_by_this_database_file',
    maySupplyLabelDose: false,
    fingerprint,
    sourceDocument: identity.document_id || null,
    sourceText: pattern.sourceText,
    shape: { fingerprint, kind: pattern.shape.kind, columns: pattern.shape.columns, captures: pattern.shape.captures }
  };
}

function slug(name) {
  const text = String(name || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  if (!text || !/[a-z]/.test(text)) fail('Drug queue entries need a name.');
  return text;
}

function queueFixture(drug) {
  if (!drug || typeof drug.name !== 'string') fail('Each queued drug needs a name.');
  const name = drug.name.trim();
  if (!name || name.length > 200) fail('Each queued drug needs a name.');
  let sourceUrl = null;
  if (drug.sourceUrl != null && drug.sourceUrl !== '') {
    let url;
    try { url = new URL(drug.sourceUrl); } catch { fail('Drug queue source URL is not a URL: ' + name); }
    if (url.protocol !== 'https:') fail('Drug queue source URLs must be https: ' + name);
    sourceUrl = url.href;
  }
  return {
    id: 'roi_queue_' + slug(name),
    kind: 'roi_drug_queue',
    testOnly: true,
    embeddedSourceText: false,
    runtimeExtractionResult: 'not_asserted_by_this_database_file',
    maySupplyLabelDose: false,
    drugName: name,
    sourceUrl,
    status: 'awaiting_unmatched_pattern_export'
  };
}

function addFixture(database, fixture, summary) {
  if (database.fixtures.some(item => item.id === fixture.id)) return;
  database.fixtures.push(fixture);
  summary.fixtures += 1;
}

function importPatterns(database, observations, summary) {
  const patterns = observations.unmatchedPatterns;
  if (!Array.isArray(patterns)) fail('Pattern review is missing unmatchedPatterns.');
  rejectPatientValues(observations, '$');
  for (const pattern of patterns) {
    if (pattern && pattern.formatDraft && pattern.formatDraft.documentation && pattern.formatDraft.documentation.roiPattern && pattern.formatDraft.documentation.roiPattern.status === 'validated') {
      fail('Refusing to import a pattern marked validated. Enable a draft only after executable cases exist.');
    }
    const draft = draftFrom(database, pattern);
    const fixture = observationFixture(pattern, draft.id);
    const index = database.formats.findIndex(format => format.id === draft.id);
    if (index === -1) {
      database.formats.push(draft);
      summary.formats += 1;
    } else {
      const existing = database.formats[index];
      if (!inactiveDraft(existing) || existing.enabled) fail('Fingerprint ' + draft.id + ' already belongs to a live format.');
      if (!sameDraft(existing, draft)) {
        draft.version = existing.version + 1;
        draft.documentation.sourceDocument = existing.documentation && existing.documentation.sourceDocument || draft.documentation.sourceDocument;
        database.formats[index] = draft;
        summary.upgraded += 1;
      } else summary.duplicates += 1;
    }
    addFixture(database, fixture, summary);
  }
}

function importQueue(database, observations, summary) {
  if (!Array.isArray(observations.drugs) || !observations.drugs.length) fail('Drug queue needs a drugs array.');
  rejectPatientValues(observations, '$');
  const seen = new Set();
  for (const drug of observations.drugs) {
    const fixture = queueFixture(drug);
    if (seen.has(fixture.id)) fail('Drug queue repeats ' + fixture.drugName + '.');
    seen.add(fixture.id);
    const before = database.fixtures.length;
    addFixture(database, fixture, summary);
    if (database.fixtures.length === before) summary.duplicates += 1;
    else summary.queued += 1;
  }
}

async function importRoiPatterns(database, observations) {
  if (!database || database.databaseId !== 'amu-label-format-database' || !Array.isArray(database.formats) || !Array.isArray(database.fixtures)) fail('Database is not an AMU label-format database.');
  if (!observations || typeof observations !== 'object') fail('Observations must be a JSON object.');
  const next = JSON.parse(JSON.stringify(database));
  const before = new Map(next.formats.map(format => [format.id, JSON.stringify(format)]));
  const summary = { formats: 0, upgraded: 0, duplicates: 0, fixtures: 0, queued: 0, databaseVersion: next.databaseVersion };
  if (observations.reportType === 'amu-roi-drug-queue/1') importQueue(next, observations, summary);
  else if (observations.reportType === 'amu-roi-pattern-review/1' || Array.isArray(observations.unmatchedPatterns)) importPatterns(next, observations, summary);
  else fail('Unsupported observations. Use amu-roi-pattern-review/1 or amu-roi-drug-queue/1.');
  for (const format of next.formats) {
    const prior = before.get(format.id);
    if (prior !== undefined && prior !== JSON.stringify(format) && !inactiveDraft(format)) fail('Import changed a live format: ' + format.id);
  }
  if (summary.formats || summary.upgraded || summary.fixtures) {
    next.databaseVersion = bumpVersion(next.databaseVersion);
    summary.databaseVersion = next.databaseVersion;
  }
  const { AMUEngine } = require('../amu-engine.js');
  const engine = new AMUEngine(JSON.parse(JSON.stringify(next)));
  try { await engine.validate(); }
  finally { engine.dispose(); }
  return { database: next, summary };
}

async function main() {
  const [databasePath, observationsPath, outputPath] = process.argv.slice(2);
  if (!databasePath || !observationsPath || !outputPath) {
    console.error('Usage: node tools/import-roi-patterns.cjs <database.json> <observations.json> <output.json>');
    process.exit(1);
  }
  const source = path.resolve(databasePath);
  const output = path.resolve(outputPath);
  if (source === output) {
    console.error('Refusing to overwrite the source database. Write a replacement file.');
    process.exit(1);
  }
  try {
    const database = JSON.parse(fs.readFileSync(source, 'utf8'));
    const observations = JSON.parse(fs.readFileSync(path.resolve(observationsPath), 'utf8'));
    const result = await importRoiPatterns(database, observations);
    fs.writeFileSync(output, JSON.stringify(result.database) + '\n');
    const summary = result.summary;
    console.log('Database ' + database.databaseVersion + ' -> ' + summary.databaseVersion + '. Added ' + summary.formats + ' disabled format' + (summary.formats === 1 ? '' : 's') + ', upgraded ' + summary.upgraded + ', duplicate ' + summary.duplicates + ', test-only fixtures ' + summary.fixtures + ', queued drugs ' + summary.queued + '.');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) main();
else module.exports = { importRoiPatterns, fingerprintOf };
