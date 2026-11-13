#!/usr/bin/env node
'use strict';
/* Pathogen/disease ROI format structures and their open physiological slots. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { AMUEngine } = require('../amu-engine.js');

const root = path.resolve(__dirname, '..');
const database = JSON.parse(fs.readFileSync(path.join(root, 'amu-database.json'), 'utf8'));
const collection = database.referenceCollections.roiFormatStructures;
const queue = `
Abacavir
Acyclovir
Adefovir
Albendazole
Amantadine
Amikacin
Amoxicillin
Amoxicillin-clavulanate
Amphotericin B
Ampicillin
Ampicillin-sulbactam
Anidulafungin
Artemether-lumefantrine
Artesunate
Atazanavir
Atovaquone
Atovaquone-proguanil
Azithromycin
Aztreonam
Bacitracin
`.trim().split(/\n/);

assert.strictEqual(collection.reportType, 'amu-roi-format-structure/1');
assert.strictEqual(collection.maySupplyLabelDose, false);
assert.strictEqual(collection.mayCreateRegimen, false);
assert.strictEqual(collection.filterSlotSchema.bounds, null);
assert.deepStrictEqual(collection.session.completed.slice(0, 20), queue);
assert.strictEqual(collection.session.nextDrug, 'Baloxavir');

const crossings = collection.records.filter(record => record.kind === 'format_crossing');
const coverage = collection.records.filter(record => record.kind === 'drug_coverage');
assert.strictEqual(coverage.length, 20);
assert.ok(crossings.length > 0);
assert.ok(crossings.some(record => record.drugName === 'Abacavir' && record.pathogen.canonical === 'HIV-1' && record.disease.profileId === 'hiv_1_infection'));
assert.ok(crossings.some(record => record.drugName === 'Acyclovir' && record.disease.profileId === 'zoster' && record.diseaseBinding === 'named_in_region' && /herpes zoster/i.test(record.sourceExcerpt)));
assert.ok(!crossings.some(record => record.drugName === 'Acyclovir' && record.disease.profileId === 'zoster' && record.diseaseBinding === 'named_in_region' && /chickenpox/i.test(record.sourceExcerpt) && !/zoster/i.test(record.sourceExcerpt)));

const formats = new Map(database.formats.map(format => [format.id, format]));
for (const record of crossings) {
  assert.strictEqual(record.maySupplyLabelDose, false);
  assert.strictEqual(record.mayCreateRegimen, false);
  assert.ok(queue.includes(record.drugName));
  assert.ok(record.product && record.product.sourceUrl.startsWith('https://dailymed.nlm.nih.gov/'));
  for (const slot of record.filterSlots) {
    assert.strictEqual(slot.bounds, null);
    assert.ok(['open', 'metric_unresolved', 'not_in_dosing_region'].includes(slot.status));
    if (slot.field === 'crcl') assert.strictEqual(slot.unit, 'mL/min');
    if (slot.field === 'egfr') assert.strictEqual(slot.unit, 'mL/min/1.73m2');
    if (slot.field === 'gfr') assert.strictEqual(slot.unit, 'mL/min');
    assert.notStrictEqual(slot.field === 'crcl' && slot.concept === 'estimated_gfr', true);
  }
  const fields = record.filterSlots.map(slot => slot.field).filter(Boolean);
  assert.strictEqual(new Set(fields).size, fields.length);
  if (record.draftStatus === 'disabled_fingerprint_draft') {
    const draft = formats.get(record.fingerprint);
    assert.ok(draft, record.fingerprint);
    assert.strictEqual(draft.enabled, false);
    assert.notStrictEqual(draft.documentation.roiPattern.status, 'validated');
    assert.strictEqual(draft.output.mayCreateRegimen, false);
    assert.deepStrictEqual(draft.applicability.fieldRefs, []);
  }
}

const abacavir = formats.get('a_abacavir_300_bid');
assert.strictEqual(abacavir.enabled, true);
assert.strictEqual(abacavir.version, 2);

const engine = new AMUEngine(JSON.parse(JSON.stringify(database)));
const draft = database.formats.find(format => format.documentation && format.documentation.roiPattern && format.documentation.roiPattern.status !== 'validated');
assert.ok(draft);
engine.dispose();
console.log('roi-format-structure: ' + coverage.length + ' drugs, ' + crossings.length + ' pathogen-disease crossings, disabled drafts stay closed');
