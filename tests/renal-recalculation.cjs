#!/usr/bin/env node
'use strict';
/* Special kidney function must estimate the labelled clearance and select that regimen. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { AMUEngine } = require('../amu-engine.js');

const root = path.resolve(__dirname, '..');
const database = JSON.parse(fs.readFileSync(path.join(root, 'amu-database.json'), 'utf8'));
const passage = database.fixtures.find(fixture => fixture.id === 'source_c_1_1_5_cefepime').equationPassages.join('\n');
const policy = database.policies.quantity.physiologicalRenalAssumption;

function grab(source, name) {
  const start = source.indexOf('function ' + name);
  assert.ok(start >= 0, name);
  let depth = 0, seen = false;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') { depth++; seen = true; }
    else if (source[i] === '}') depth--;
    if (seen && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unclosed ' + name);
}

const integration = fs.readFileSync(path.join(root, 'amu-integration.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'amu-ui.js'), 'utf8');
const decisions = new Function(
  'engine', 'automaticDemand', 'calculationScope', 'currentFetchedDrugs', 'drugMatchesCuratedAgent',
  [grab(integration, 'ordinaryRenalScreen'), grab(integration, 'normalRenalDefaults'), grab(integration, 'ruleCondition'), grab(integration, 'activeCalculation'), 'return {activeCalculation, normalRenalDefaults};'].join('\n')
);

const label = {
  id: 'renal-recalc-label',
  set_id: 'renal-recalc-set',
  indications_and_usage: ['Examplemycin is indicated for zygomycosis.'],
  dosage_and_administration: [
    'Zygomycosis in adults with creatinine clearance greater than 60 mL/min: 2 g IV every 8 hours.',
    'Zygomycosis in adults with creatinine clearance 30 to 60 mL/min: 1 g IV every 12 hours.',
    'Zygomycosis in adults with creatinine clearance less than 30 mL/min: 500 mg IV every 24 hours.',
    passage
  ]
};
const provenance = {
  sourceId: 'openfda',
  status: 'retrieved',
  sourceUrl: 'https://api.fda.gov/drug/label.json?search=id:renal-recalc-label',
  labelId: label.id,
  setId: label.set_id
};
const context = { indication: 'zygomycosis', treatment_intent: 'treatment' };

function doseOf(result) {
  return (result.regimens || []).map(record => record.dose.sourceText + ' ' + record.schedule.sourceText);
}

(async () => {
  assert.strictEqual(policy.maximumScreenValue, 130);
  assert.strictEqual(policy.minimumScreenValue, 90);
  assert.ok(!/function activeCalculation\(\) \{\s*return null;/.test(integration), 'clearance selection is still stubbed');
  assert.match(ui, /Augmented renal clearance \(eGFR >130\)/);
  assert.match(ui, /Intermittent HD: /);
  assert.match(ui, /do NOT apply the <30 reductions/);
  assert.match(integration, /Renal-adjusted label regimen/);

  const engine = new AMUEngine(database);
  await engine.validate();
  const adult = { age: 40, weight: 70, serum_creatinine: 2, creatinine_steady_state: true, dialysis: 'none' };
  const male = await engine.calculate({ calculationId: 'cockcroft_gault', patient: { ...adult, cockcroft_coefficient: 'male' }, label, provenance });
  const female = await engine.calculate({ calculationId: 'cockcroft_gault', patient: { ...adult, cockcroft_coefficient: 'female' }, label, provenance });
  assert.strictEqual(male.status, 'resolved');
  assert.ok(Math.abs(male.value - (70 * (140 - 40)) / (72 * 2)) < 1e-9);
  assert.ok(Math.abs(female.value - male.value * 0.85) < 1e-9);
  const entered = await engine.calculate({ calculationId: 'cockcroft_gault', patient: { ...adult, cockcroft_coefficient: 'male', crcl: 22 }, label, provenance });
  assert.strictEqual(entered.status, 'provided');
  assert.strictEqual(entered.value, 22);
  const dialysis = await engine.calculate({ calculationId: 'cockcroft_gault', patient: { ...adult, cockcroft_coefficient: 'male', dialysis: 'hd' }, label, provenance });
  assert.strictEqual(dialysis.status, 'unavailable');
  assert.strictEqual(dialysis.reason, 'no_dialysis');

  async function analyzed(patient) {
    return engine.analyze({ label, provenance, patient, clinicalContext: context });
  }
  const ordinary = await analyzed({ age: 40, weight: 70, dialysis: 'none', egfr: 100, crcl: null });
  assert.deepStrictEqual(doseOf(ordinary), ['2 g every 8 hours']);
  const low = await analyzed({ age: 40, weight: 70, dialysis: 'none', egfr: 89, crcl: null });
  const high = await analyzed({ age: 40, weight: 70, dialysis: 'none', egfr: 131, crcl: null });
  for (const result of [low, high]) {
    assert.strictEqual(result.status, 'unresolved');
    assert.deepStrictEqual(result.regimens, []);
    assert.ok(result.unresolved.some(record => (record.missingFields || []).includes('crcl')));
  }
  const adjusted = await analyzed({ age: 40, weight: 70, dialysis: 'none', egfr: 40, crcl: male.value });
  assert.deepStrictEqual(doseOf(adjusted), ['1 g every 12 hours']);
  assert.ok(adjusted.normalRegimens.some(record => record.dose.sourceText === '2 g' && record.schedule.sourceText === 'every 8 hours'));
  assert.strictEqual(adjusted.renalSelection.adjusted, true);
  assert.ok(Math.abs(adjusted.renalSelection.metrics[0].value - male.value) < 1e-9);

  const api = decisions({ database }, { scope: 'same', required: ['crcl'], renalFields: ['crcl'] }, () => 'same', [], () => false);
  const base = { age: 40, weight: 70, dialysis: 'none', egfr: 100, crcl: null, serum_creatinine: null };
  assert.strictEqual(api.normalRenalDefaults(base), true);
  assert.strictEqual(api.normalRenalDefaults({ ...base, egfr: 89 }), false);
  assert.strictEqual(api.normalRenalDefaults({ ...base, egfr: 131 }), false);
  assert.strictEqual(api.normalRenalDefaults({ ...base, dialysis: 'hd' }), false);
  assert.strictEqual(api.activeCalculation(base), null);
  assert.strictEqual(api.activeCalculation({ ...base, egfr: 40 }).id, 'cockcroft_gault');
  assert.strictEqual(api.activeCalculation({ ...base, egfr: 140 }).id, 'cockcroft_gault');
  assert.strictEqual(api.activeCalculation({ ...base, egfr: 40, dialysis: 'hd' }), null);
  assert.strictEqual(api.activeCalculation({ ...base, serum_creatinine: 1.2 }).id, 'cockcroft_gault');

  const pediatric = decisions(
    { database },
    { scope: 'same', required: ['indexed_clearance'], renalFields: ['indexed_clearance'] },
    () => 'same',
    [{ genericName: 'Cefdinir' }],
    (drug, name) => drug.genericName.toLowerCase() === name.toLowerCase()
  );
  assert.strictEqual(pediatric.activeCalculation({ age: 8, weight: 25, dialysis: 'none', egfr: 40, indexed_clearance: null, serum_creatinine: null }).id, 'cefdinir_label_pediatric_clearance');

  const sourceWeight = decisions(
    { database },
    { scope: 'same', required: ['crcl'], renalFields: ['crcl'] },
    () => 'same',
    [{ genericName: 'Adefovir' }],
    (drug, name) => drug.genericName.toLowerCase() === name.toLowerCase()
  );
  assert.strictEqual(sourceWeight.activeCalculation({ ...base, egfr: 40 }).id, 'cockcroft_gault_source_weight');
  engine.dispose();
  console.log('renal recalculation checks passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
