#!/usr/bin/env node
'use strict';
/* Pathogen/disease ROI format structures and their open physiological slots. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { AMUEngine } = require('../amu-engine.js');
const { extractSections } = require('../tools/collect-roi-format-structures.cjs');

const root = path.resolve(__dirname, '..');
const database = JSON.parse(fs.readFileSync(path.join(root, 'amu-database.json'), 'utf8'));
const collection = database.referenceCollections.roiFormatStructures;
const first = `
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
const second = `
Baloxavir
Bedaquiline
Benznidazole
Bictegravir
Cabotegravir
Caspofungin
Cefazolin
Cefdinir
Cefepime
Cefiderocol
Cefixime
Cefotaxime
Cefotetan
Cefoxitin
Cefpodoxime
Ceftaroline
Ceftazidime
Ceftazidime-avibactam
Ceftolozane-tazobactam
Ceftriaxone
`.trim().split(/\n/);
const third = `
Cefuroxime
Cephalexin
Chloramphenicol
Chloroquine
Cidofovir
Ciprofloxacin
Clarithromycin
Clindamycin
Clofazimine
Clotrimazole
Colistin
Dalbavancin
Dapsone
Daptomycin
Darunavir
Demeclocycline
Dicloxacillin
Didanosine
Diethylcarbamazine
Dolutegravir
`.trim().split(/\n/);
const queue = first.concat(second, third);

assert.strictEqual(collection.reportType, 'amu-roi-format-structure/1');
assert.strictEqual(collection.maySupplyLabelDose, false);
assert.strictEqual(collection.mayCreateRegimen, false);
assert.strictEqual(collection.filterSlotSchema.bounds, null);
assert.deepStrictEqual(collection.session.completed.slice(0, 20), first);
assert.deepStrictEqual(collection.session.completed.slice(20, 40), second);
assert.deepStrictEqual(collection.session.completed.slice(40, 60), third);
assert.strictEqual(collection.session.nextDrug, 'Doravirine');

const crossings = collection.records.filter(record => record.kind === 'format_crossing');
const coverage = collection.records.filter(record => record.kind === 'drug_coverage');
assert.strictEqual(coverage.length, 60);
assert.ok(database.tokenGrammars.administered_unit_count.pattern.includes('troches?'));
const nested = extractSections('<section><code code="34067-9"/><title>1 INDICATIONS AND USAGE</title><text><paragraph>Parent indication Salmonella typhi.</paragraph></text><component><section><code code="34067-9"/><title>1.1 Typhoid</title><text><paragraph>Child only.</paragraph></text></section></component></section><section><code code="42229-5"/><title>DOSAGE AND ADMINISTRATION:</title><text><paragraph>Adults should receive 50 mg/kg/day.</paragraph></text></section>');
assert.ok(nested['34067-9'].includes('Parent indication'));
assert.ok(nested['34068-7'].includes('50 mg/kg/day'));
const ceftazidime = coverage.find(record => record.drugName === 'Ceftazidime');
const avibactam = coverage.find(record => record.drugName === 'Ceftazidime-avibactam');
assert.strictEqual(ceftazidime.product.genericName, 'CEFTAZIDIME');
assert.notStrictEqual(ceftazidime.product.setId, avibactam.product.setId);
const bictegravir = coverage.find(record => record.drugName === 'Bictegravir');
assert.strictEqual(bictegravir.product, null);
assert.ok(bictegravir.gaps.some(gap => /combination products/i.test(gap)));
assert.ok(!crossings.some(record => record.drugName === 'Bictegravir'));
assert.ok(crossings.length > 0);
assert.ok(crossings.some(record => record.drugName === 'Abacavir' && record.pathogen.canonical === 'HIV-1' && record.disease.profileId === 'hiv_1_infection'));
assert.ok(crossings.some(record => record.drugName === 'Acyclovir' && record.disease.profileId === 'zoster' && record.diseaseBinding === 'named_in_region' && /herpes zoster/i.test(record.sourceExcerpt)));
assert.ok(!crossings.some(record => record.drugName === 'Acyclovir' && record.disease.profileId === 'zoster' && record.diseaseBinding === 'named_in_region' && /chickenpox/i.test(record.sourceExcerpt) && !/zoster/i.test(record.sourceExcerpt)));
const chloramphenicol = coverage.find(record => record.drugName === 'Chloramphenicol');
assert.strictEqual(chloramphenicol.product.genericName, 'CHLORAMPHENICOL SODIUM SUCCINATE');
assert.ok(crossings.some(record => record.drugName === 'Chloramphenicol' && record.pathogen.canonical === 'Salmonella Typhi' && /50 mg\/kg\/day/i.test(record.sourceExcerpt)));
const clarithromycinRenal = crossings.find(record => record.drugName === 'Clarithromycin' && record.filterSlots.some(slot => slot.field === 'crcl'));
assert.ok(clarithromycinRenal);
assert.ok(clarithromycinRenal.filterSlots.some(slot => slot.field === 'crcl' && slot.unit === 'mL/min' && slot.bounds === null));
assert.ok(crossings.some(record => record.drugName === 'Clotrimazole' && record.pathogen.canonical === 'Candida albicans' && record.disease.profileId === 'oropharyngeal_candidiasis' && /one troche/i.test(record.sourceExcerpt)));
const colistin = coverage.find(record => record.drugName === 'Colistin');
assert.ok(/COLISTIMETHATE/.test(colistin.product.genericName));
assert.ok(colistin.gaps.some(gap => /colistimethate/i.test(gap)));
assert.ok(crossings.some(record => record.drugName === 'Colistin' && record.pathogen.canonical === 'Pseudomonas aeruginosa' && /mg\/kg/i.test(record.sourceExcerpt) && record.filterSlots.some(slot => slot.concept === 'renal_function' && slot.bounds === null)));
assert.ok(crossings.some(record => record.drugName === 'Dicloxacillin' && record.pathogen.alias === 'Staphylococcus' && record.pathogen.status === 'genus_named_in_source' && /125 mg every 6 hours/i.test(record.sourceExcerpt)));
const didanosine = coverage.find(record => record.drugName === 'Didanosine');
assert.ok(didanosine.product.sourceUrl.startsWith('https://dailymed.nlm.nih.gov/'));
assert.ok(crossings.some(record => record.drugName === 'Didanosine' && record.pathogen.canonical === 'HIV-1' && record.disease.profileId === 'hiv_1_infection' && record.filterSlots.some(slot => slot.field === 'crcl' && slot.bounds === null)));
const diethylcarbamazine = coverage.find(record => record.drugName === 'Diethylcarbamazine');
assert.strictEqual(diethylcarbamazine.product, null);
assert.ok(diethylcarbamazine.gaps.some(gap => /no human dosage label/i.test(gap)));
assert.ok(!crossings.some(record => record.drugName === 'Diethylcarbamazine'));
assert.ok(crossings.some(record => record.drugName === 'Dolutegravir' && record.pathogen.canonical === 'HIV-1' && record.disease.profileId === 'hiv_1_infection'));
assert.ok(!crossings.some(record => record.drugName === 'Ciprofloxacin' && /^ciprofloxacin$/i.test(record.selection.term)));

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
