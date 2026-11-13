#!/usr/bin/env node
'use strict';
/*
 * Collect ROI format structures for the next slice of the antimicrobial list.
 *
 *   node tools/collect-roi-format-structures.cjs --limit 20
 *   node tools/collect-roi-format-structures.cjs --limit 2 --dry-run
 *
 * Each drug is one public DailyMed SPL, chosen by openFDA generic name.
 * The ROI interpreter selects regions only for a pathogen/disease term that
 * the label actually uses. Physiological headings that are not a second
 * disease are crossed back onto that pathogen and disease.
 *
 * New shapes are imported as disabled fingerprint drafts. Nothing here
 * enables a draft, validates one, or stores a numeric physiological bound.
 * eGFR, GFR and CrCl stay separate fields. A missing CrCl is never filled.
 */

const fs = require('fs');
const path = require('path');
const { importRoiPatterns } = require('./import-roi-patterns.cjs');

const DRUGS = `
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
Doravirine
Doxycycline
Efavirenz
Eflornithine
Elbasvir
Elvitegravir
Emtricitabine
Enfuvirtide
Entecavir
Ertapenem
Erythromycin
Ethambutol
Famciclovir
Fidaxomicin
Flucloxacillin
Fluconazole
Flucytosine
Foscarnet
Fosfomycin
Ganciclovir
Gentamicin
Glecaprevir
Grazoprevir
Griseofulvin
Hydroxychloroquine
Imipenem-cilastatin
Indinavir
Iodoquinol
Isavuconazole
Isoniazid
Itraconazole
Ivermectin
Ketoconazole
Lamivudine
Ledipasvir
Lenacapavir
Letermovir
Levofloxacin
Linezolid
Lopinavir
Maraviroc
Mebendazole
Mefloquine
Melarsoprol
Meropenem
Meropenem-vaborbactam
Methenamine
Metronidazole
Micafungin
Miconazole
Miltefosine
Minocycline
Molnupiravir
Moxifloxacin
Mupirocin
Nafcillin
Neomycin
Nevirapine
Niclosamide
Nifurtimox
Nirmatrelvir-ritonavir
Nitrofurantoin
Nystatin
Ofloxacin
Oseltamivir
Oxacillin
Paromomycin
Peginterferon alfa
Penicillin G
Penicillin V
Pentamidine
Peramivir
Pibrentasvir
Piperacillin-tazobactam
Polymyxin B
Posaconazole
Praziquantel
Pretomanid
Primaquine
Pyrantel pamoate
Pyrazinamide
Pyrimethamine
Quinine
Quinupristin-dalfopristin
Raltegravir
Remdesivir
Ribavirin
Rifabutin
Rifampin
Rifapentine
Rifaximin
Rilpivirine
Ritonavir
Silver sulfadiazine
Sodium stibogluconate
Sofosbuvir
Spiramycin
Streptomycin
Stavudine
Sulfadiazine
Suramin
Tedizolid
Teicoplanin
Tenofovir
Terbinafine
Tetracycline
Tigecycline
Tinidazole
Tobramycin
Trimethoprim
Trimethoprim-sulfamethoxazole
Valacyclovir
Valganciclovir
Vancomycin
Velpatasvir
Voriconazole
Zanamivir
Zidovudine
`.trim().split(/\n/).map(name => name.trim()).filter(Boolean);

const SECTION_CODES = {
  indications_and_usage: '34067-9',
  dosage_and_administration: '34068-7',
  contraindications: '34070-3',
  use_in_specific_populations: '43684-0'
};
const AXIS_ROLES = new Set(['renal', 'weight', 'population', 'severity', 'surface_area']);
const MAX_TERMS = 6;
const MAX_PHYSIOLOGY_TERMS = 4;
const MAX_RECORDS = 30;

function arg(name, fallback) {
  const index = process.argv.indexOf('--' + name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

function canonical(value) {
  return String(value || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function phrase(text, term) {
  const haystack = ' ' + canonical(text) + ' ';
  const needle = ' ' + canonical(term) + ' ';
  return needle.trim() !== '' && haystack.includes(needle);
}

function clip(value, limit) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= limit ? text : text.slice(0, limit - 1).trim() + '…';
}

function slug(name) {
  return canonical(name).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
}

function hash(text) {
  let hashValue = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hashValue ^= text.charCodeAt(i);
    hashValue = Math.imul(hashValue, 16777619);
  }
  return (hashValue >>> 0).toString(16).padStart(8, '0');
}

function bumpVersion(version) {
  const parts = String(version || '0.0.0').split('.').map(part => Number(part) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.slice(0, 3).join('.');
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { accept: 'application/json, application/xml, text/xml, */*' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
  return response.text();
}

function searchExpressions(name) {
  const parts = name.split('-').map(part => part.trim()).filter(Boolean);
  const quoted = parts.map(part => 'openfda.generic_name:"' + part.replace(/"/g, '') + '"').join(' AND ');
  const human = '(' + quoted + ') AND (openfda.product_type:"HUMAN PRESCRIPTION DRUG" OR openfda.product_type:"HUMAN OTC DRUG")';
  const loose = parts.map(part => 'openfda.generic_name:' + part.toLowerCase().split(/[^a-z0-9]+/).find(Boolean)).join(' AND ');
  return [human, quoted, loose];
}

function genericName(record) {
  return (record.openfda && record.openfda.generic_name || []).join(' ');
}

function scoreCandidate(name, record) {
  const generic = genericName(record).toLowerCase();
  const parts = name.toLowerCase().split('-').map(part => part.trim());
  if (!generic || !parts.every(part => generic.includes(part))) return -1;
  const productType = (record.openfda && record.openfda.product_type || []).join(' ');
  if (/veterinary|animal/i.test(productType) || /veterinary/i.test(generic)) return -1;
  const remainder = parts.reduce((text, part) => text.replace(part, ' '), generic);
  if (parts.length === 1 && /\band\b/i.test(remainder)) return -1;
  let score = 0;
  const route = (record.openfda && record.openfda.route || []).join(' ');
  if (/human/i.test(productType)) score += 5;
  if (/prescription/i.test(productType)) score += 2;
  if (/otc/i.test(productType)) score += 1;
  if (/\b(?:intravenous|intramuscular|oral)\b/i.test(route)) score += 4;
  if (/\b(?:respiratory|inhalation|ophthalmic)\b/i.test(route)) score -= 4;
  if (canonical(remainder).length <= 12) score += 8;
  else if (!/liposom|lipid|cholestryl/i.test(remainder)) score += 3;
  const doseLength = (record.dosage_and_administration || []).join('').length;
  if (doseLength < 40) score -= 6;
  else score += 3 + Math.min(doseLength / 4000, 5);
  const effective = Number(record.effective_time || 0);
  if (effective) score += Math.min(effective / 100000000, 2);
  const identityText = generic + ' ' + (record.openfda && record.openfda.brand_name || []).join(' ') + ' ' + (record.indications_and_usage || []).join(' ').slice(0, 500);
  if (/liposom|ambisome|lipid complex|cholestryl/i.test(identityText) && !/liposom|lipid/i.test(name)) score -= 8;
  return score;
}

async function chooseLabel(name) {
  for (const expression of searchExpressions(name)) {
    const url = 'https://api.fda.gov/drug/label.json?' + new URLSearchParams({ search: expression, limit: '15' });
    let body = null;
    try { body = await fetchText(url); } catch { continue; }
    if (!body) continue;
    const payload = JSON.parse(body);
    const ranked = (payload.results || []).map(record => ({ record, score: scoreCandidate(name, record) })).filter(item => item.score >= 0);
    ranked.sort((a, b) => b.score - a.score || String(b.record.effective_time || '').localeCompare(String(a.record.effective_time || '')));
    if (ranked.length) return ranked[0].record;
  }
  return null;
}

function tightenProse(xml) {
  // DailyMed pretty-printing inserts line breaks inside a paragraph. The ROI
  // clause splitter treats a nearby line break as a new clause, which separates
  // a disease label from its dose. Collapse whitespace inside text nodes only.
  return String(xml || '').replace(/>([^<]+)</g, (whole, text) => '>' + text.replace(/\s+/g, ' ') + '<');
}

function extractSections(xml) {
  const tokens = [...xml.matchAll(/<\/?section\b[^>]*>/gi)];
  const stack = [];
  const found = [];
  for (const token of tokens) {
    if (!token[0].startsWith('</')) stack.push(token.index);
    else if (stack.length) {
      const start = stack.pop();
      found.push({ depth: stack.length, xml: xml.slice(start, token.index + token[0].length) });
    }
  }
  const byCode = {};
  for (const section of found) {
    const inner = section.xml.slice(section.xml.indexOf('>') + 1);
    const nested = inner.search(/<section\b/i);
    const head = nested === -1 ? inner.slice(0, 2000) : inner.slice(0, nested);
    const code = (head.match(/<code\b[^>]*\bcode="([^"]+)"/i) || [])[1];
    if (!code || byCode[code]) continue;
    byCode[code] = section.xml;
  }
  return byCode;
}

async function loadStructuredLabel(name, summary) {
  const chosen = await chooseLabel(name);
  if (!chosen || !chosen.set_id) {
    summary.gaps.push('No human openFDA label matched ' + name + '.');
    return null;
  }
  const setId = chosen.set_id;
  const sourceUrl = 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=' + setId;
  const splUrl = 'https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/' + setId + '.xml';
  let xml = null;
  try { xml = await fetchText(splUrl); } catch (error) { summary.gaps.push('DailyMed SPL was not retrieved (' + error.message + ').'); }
  const sections = xml ? extractSections(xml) : {};
  const fields = {};
  for (const [field, code] of Object.entries(SECTION_CODES)) {
    if (sections[code]) fields[field] = [tightenProse(sections[code])];
    else if (Array.isArray(chosen[field]) && chosen[field].length) {
      fields[field] = chosen[field];
      summary.gaps.push(field + ' fell back to openFDA text because SPL section ' + code + ' was absent.');
    }
  }
  summary.gaps.push('One representative product was structured. Other routes, salts and combinations of this name were not.');
  if (!fields.dosage_and_administration || !fields.indications_and_usage) {
    summary.gaps.push('The matched label has no indications and dosage sections.');
    return null;
  }
  const openfda = chosen.openfda || {};
  return {
    label: {
      identity: {
        document_id: 'dailymed-' + setId,
        sourceId: 'dailymed',
        source: 'NIH DailyMed',
        status: 'retrieved',
        setId,
        labelId: String(chosen.id || ''),
        effectiveTime: String(chosen.effective_time || ''),
        sourceUrl,
        genericName: genericName(chosen) || name,
        brandName: (openfda.brand_name || []).join(', '),
        route: (openfda.route || []).join(', '),
        dosageForm: (openfda.dosage_form || []).join(', ')
      },
      ...fields
    },
    product: {
      setId,
      labelId: String(chosen.id || ''),
      genericName: genericName(chosen) || name,
      brandName: (openfda.brand_name || []).join(', '),
      route: (openfda.route || []).join(', '),
      dosageForm: (openfda.dosage_form || []).join(', '),
      effectiveTime: String(chosen.effective_time || ''),
      sourceUrl,
      splUrl
    }
  };
}

function compilePatterns(terms) {
  return terms.map(term => {
    try { return { term, expression: new RegExp(term.pattern.pattern, term.pattern.flags || '') }; }
    catch { return null; }
  }).filter(Boolean);
}

function binomialAliases(name) {
  const parts = canonical(name).split(' ').filter(Boolean);
  if (parts.length < 2 || parts[0].length < 3 || parts[1].length < 3) return [];
  return [parts[0][0] + '. ' + parts[1], parts[0][0] + ' ' + parts[1]];
}

function profileIndex(database) {
  return database.referenceCollections.pathogenProfiles.records.map(profile => ({
    profile,
    aliases: [profile.canonical, ...(profile.aliases || []), ...binomialAliases(profile.canonical)]
      .filter(alias => canonical(alias).length >= 3 && canonical(alias) !== 'flu')
  }));
}

function matchProfiles(text, index) {
  const matched = [];
  for (const entry of index) {
    let aliasUsed = '';
    for (const alias of entry.aliases) {
      if (phrase(text, alias) && canonical(alias).length > canonical(aliasUsed).length) aliasUsed = alias;
    }
    if (aliasUsed) matched.push({ profile: entry.profile, aliasUsed });
  }
  const specifics = new Set(matched.map(item => canonical(item.profile.canonical)));
  return matched.filter(item => !item.profile.aliases.some(alias => specifics.has(canonical(alias)) && canonical(alias) !== canonical(item.profile.canonical)));
}

function negativeClause(text) {
  return /should not be used|not (?:be )?used to treat|not indicated|do not use|contraindicated/i.test(text);
}

function negated(text, term) {
  const haystack = canonical(text);
  const needle = canonical(term);
  const at = haystack.indexOf(needle);
  if (at < 0) return false;
  const before = haystack.slice(Math.max(0, at - 48), at);
  return /\b(?:not|no|never|without|avoid)\b/.test(before);
}

function matchDiseases(text, profile) {
  const hits = [];
  for (const disease of profile.diseases || []) {
    if (disease.id === 'all') continue;
    const keywords = (disease.keywords || []).filter(keyword => keyword.length >= 4 && phrase(text, keyword) && !negated(text, keyword));
    if (!keywords.length) continue;
    const keyword = keywords.sort((a, b) => canonical(b).length - canonical(a).length)[0];
    hits.push({ id: disease.id, label: disease.label, keyword });
  }
  return hits.filter(hit => !hits.some(other => canonical(other.keyword).length > canonical(hit.keyword).length && phrase(other.keyword, hit.keyword)));
}

function diseaseContexts(clauses, index) {
  const contexts = [];
  const seen = new Set();
  for (const clause of clauses) {
    if (negativeClause(clause.text)) continue;
    for (const match of matchProfiles(clause.text, index)) {
      if (negated(clause.text, match.aliasUsed)) continue;
      const diseases = matchDiseases(clause.text, match.profile);
      const rows = diseases.length ? diseases : [{ id: null, label: null, keyword: match.aliasUsed }];
      for (const disease of rows) {
        const term = disease.keyword;
        const key = canonical(match.profile.canonical) + '|' + (disease.id || canonical(term));
        if (seen.has(key)) continue;
        seen.add(key);
        contexts.push({
          term,
          pathogen: { canonical: match.profile.canonical, alias: match.aliasUsed, status: 'profile_matched' },
          disease: {
            profileId: disease.id,
            label: disease.label,
            sourceText: clip(clause.text, 240),
            status: disease.id ? 'profile_keyword' : 'source_indication_only'
          }
        });
      }
    }
  }
  contexts.sort((a, b) => canonical(b.term).length - canonical(a.term).length);
  return contexts;
}

const SKIP_HEADING = /^(?:dosage(?: and)? administration|important administration instructions|directions|other information|inactive ingredients|questions or comments|storage and handling|how supplied|package label principal display panel)$/;

function headingContexts(nodes, index, nonClinical, patterns) {
  const contexts = [];
  const seen = new Set();
  for (const node of nodes) {
    if (node.kind !== 'section.heading' || node.source_field !== 'dosage_and_administration') continue;
    const text = String(node.text || '').replace(/^\d+(?:\.\d+)*\s+/, '').trim();
    if (!text || text.length > 180 || SKIP_HEADING.test(canonical(text))) continue;
    if (nonClinical && nonClinical.test(node.text)) continue;
    const profiles = matchProfiles(text, index);
    if (!profiles.length && patterns.some(item => item.expression.test(node.text))) continue;
    const key = canonical(text);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!profiles.length) {
      contexts.push({
        term: text,
        pathogen: { canonical: null, alias: null, status: 'not_named_in_source' },
        disease: { profileId: null, label: null, sourceText: clip(text, 240), status: 'source_indication_only' }
      });
      continue;
    }
    for (const match of profiles) {
      const diseases = matchDiseases(text, match.profile);
      const rows = diseases.length ? diseases : [{ id: null, label: null, keyword: text }];
      for (const disease of rows) {
        contexts.push({
          term: text,
          pathogen: { canonical: match.profile.canonical, alias: match.aliasUsed, status: 'profile_matched' },
          disease: {
            profileId: disease.id,
            label: disease.label,
            sourceText: clip(text, 240),
            status: disease.id ? 'profile_keyword' : 'source_indication_only'
          }
        });
      }
    }
  }
  return contexts;
}

function leadingDoseContexts(nodes) {
  const contexts = [];
  const seen = new Set();
  for (const node of nodes) {
    if (node.kind !== 'prose.clause' || node.source_field !== 'dosage_and_administration') continue;
    const match = String(node.text || '').match(/^([A-Z][A-Za-z][A-Za-z /-]{2,50}):\s+\S/);
    if (!match) continue;
    const term = match[1].trim();
    if (SKIP_HEADING.test(canonical(term)) || /^(?:reconstitute|caution|verify|note|warning|dosage|administer|preparation|important|dilute|shake)\b/i.test(term) || seen.has(canonical(term))) continue;
    seen.add(canonical(term));
    contexts.push({
      term,
      pathogen: { canonical: null, alias: null, status: 'not_named_in_source' },
      disease: { profileId: null, label: null, sourceText: clip(node.text, 240), status: 'source_indication_only' }
    });
  }
  return contexts;
}

function physiologyContexts(nodes, patterns, nonClinical) {
  const contexts = [];
  const seen = new Set();
  for (const node of nodes) {
    if (!['section.heading', 'table.caption'].includes(node.kind) || node.source_field !== 'dosage_and_administration') continue;
    const text = node.text || '';
    if (!text || text.length > 180) continue;
    if (nonClinical && nonClinical.test(text)) continue;
    if (canonical(text) === 'dosage and administration') continue;
    const hits = patterns.filter(item => item.expression.test(text));
    if (!hits.length) continue;
    const key = canonical(text);
    if (seen.has(key)) continue;
    seen.add(key);
    contexts.push({
      term: text,
      concepts: [...new Set(hits.map(hit => hit.term.id))]
    });
  }
  return contexts.slice(0, MAX_PHYSIOLOGY_TERMS);
}

function sharedConcepts(nodes, patterns) {
  const found = [];
  const seen = new Set();
  for (const node of nodes) {
    if (node.kind !== 'prose.clause' || node.source_field !== 'use_in_specific_populations') continue;
    for (const item of patterns) {
      const match = String(node.text || '').match(item.expression);
      if (!match || seen.has(item.term.id)) continue;
      seen.add(item.term.id);
      found.push({
        concept: item.term.id,
        field: item.term.field || null,
        status: 'not_in_dosing_region',
        bounds: null,
        evidence: clip(match[0], 160)
      });
    }
  }
  return found;
}

function slotForMention(mention, fields) {
  const field = mention.field || null;
  const definition = field ? fields[field] : null;
  return {
    slotId: field || mention.concept,
    concept: mention.concept,
    field,
    unit: definition ? definition.unit || null : null,
    status: field ? 'open' : 'metric_unresolved',
    bounds: null,
    evidence: clip(mention.sourceText, 160)
  };
}

function slotsFor(region, fields) {
  const slots = [];
  const seen = new Set();
  for (const mention of region.physiology || []) {
    const key = mention.concept + '|' + (mention.field || '');
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push(slotForMention(mention, fields));
  }
  const roles = new Set((region.shape && region.shape.columns || []).flat());
  for (const role of roles) {
    if (!AXIS_ROLES.has(role) || seen.has('role|' + role)) continue;
    const concept = role === 'population' ? 'age' : role === 'renal' ? 'renal_function' : role === 'surface_area' ? 'bsa' : role;
    const field = role === 'weight' ? 'weight' : role === 'surface_area' ? 'bsa' : null;
    if (slots.some(slot => slot.concept === concept || (field && slot.field === field))) continue;
    seen.add('role|' + role);
    slots.push({
      slotId: role + '_column',
      concept,
      field,
      unit: field && fields[field] ? fields[field].unit || null : null,
      status: field ? 'open' : 'metric_unresolved',
      bounds: null,
      evidence: 'column_role:' + role
    });
  }
  return slots;
}

function intentFor(term) {
  const text = canonical(term);
  const prevention = /\b(?:prophylaxis|prevention|prevent)\b/.test(text);
  const treatment = /\b(?:treatment|treat)\b/.test(text);
  if (prevention && !treatment) return 'prophylaxis';
  if (treatment && !prevention) return 'treatment';
  return undefined;
}

function crossingRecord(drugName, product, context, region, branchRole) {
  const pathogen = context.pathogen.canonical || 'unnamed';
  const disease = context.disease.profileId || canonical(context.disease.sourceText).slice(0, 48) || 'unspecified';
  const fingerprint = region.shape.fingerprint;
  return {
    id: 'rfs_' + slug(drugName) + '_' + hash([fingerprint, pathogen, disease, branchRole, product.setId].join('|')),
    kind: 'format_crossing',
    drugName,
    maySupplyLabelDose: false,
    mayCreateRegimen: false,
    branchRole,
    pathogen: context.pathogen,
    disease: context.disease,
    product: {
      setId: product.setId,
      labelId: product.labelId,
      genericName: product.genericName,
      brandName: product.brandName,
      route: product.route,
      dosageForm: product.dosageForm,
      effectiveTime: product.effectiveTime,
      sourceUrl: product.sourceUrl
    },
    selection: {
      term: context.term,
      indication: clip(region.indication, 180),
      reason: region.selectionReason || null,
      organisms: region.organisms || []
    },
    fingerprint,
    shape: {
      kind: region.shape.kind,
      columns: region.shape.columns,
      captures: region.shape.captures
    },
    regionStatus: region.status,
    matchedFormatIds: region.matchedFormats || [],
    draftStatus: ['unmatched_pattern', 'unsupported_or_ambiguous'].includes(region.status) ? 'disabled_fingerprint_draft' : 'existing_format_or_unresolved',
    filterSlots: null,
    sourceExcerpt: clip(region.sourceText, 240)
  };
}

function usableRegion(region) {
  return region && region.selected && region.hasRegimen && region.shape && region.shape.fingerprint && region.sourceText;
}

function diseasesNamed(text, index) {
  const found = [];
  for (const entry of index) {
    for (const disease of matchDiseases(text, entry.profile)) found.push({ canonical: entry.profile.canonical, id: disease.id });
  }
  return found;
}

function conflictingContext(region, context, index) {
  const text = [region.indication, region.sourceText].filter(Boolean).join(' ');
  const found = diseasesNamed(text, index);
  if (context.pathogen.canonical && matchProfiles(text, index).some(item => item.profile.canonical !== context.pathogen.canonical && !found.some(disease => disease.canonical === context.pathogen.canonical))) return true;
  if (!found.length) return false;
  if (!context.disease.profileId) return true;
  return !found.some(disease => disease.canonical === context.pathogen.canonical && disease.id === context.disease.profileId);
}

async function analyzeTerm(engine, label, term, organism, intent) {
  const clinicalContext = { indication: term };
  if (organism) clinicalContext.organism = organism;
  if (intent) clinicalContext.treatment_intent = intent;
  return engine.analyze({ label, patient: {}, clinicalContext });
}

async function collectDrug(engine, database, index, patterns, nonClinical, name) {
  const summary = { drugName: name, gaps: [], contexts: [], records: [], patterns: [] };
  const loaded = await loadStructuredLabel(name, summary);
  if (!loaded) {
    summary.coverage = {
      id: 'rfs_drug_' + slug(name), kind: 'drug_coverage', drugName: name, maySupplyLabelDose: false, mayCreateRegimen: false,
      product: null, contexts: [], sharedPhysiology: [], crossingCount: 0, newFingerprintCount: 0, gaps: summary.gaps
    };
    return summary;
  }
  const normalized = engine.normalizeLabel(loaded.label);
  const clauses = normalized.nodes.filter(node => node.kind === 'prose.clause' && node.source_field === 'indications_and_usage');
  let contexts = diseaseContexts(clauses, index).concat(headingContexts(normalized.nodes, index, nonClinical, patterns)).concat(leadingDoseContexts(normalized.nodes));
  if (!contexts.length) {
    const fallback = clauses.find(clause => clause.text && clause.text.length >= 12 && clause.text.length <= 160);
    if (fallback) {
      contexts = [{
        term: clip(fallback.text, 160),
        pathogen: { canonical: null, alias: null, status: 'not_named_in_source' },
        disease: { profileId: null, label: null, sourceText: clip(fallback.text, 240), status: 'source_indication_only' }
      }];
      summary.gaps.push('No pathogen profile alias was named in the indication clauses.');
    } else summary.gaps.push('No indication clause could be crossed with a pathogen or disease.');
  }
  const contextKey = context => [context.pathogen.canonical || '', context.disease.profileId || canonical(context.term)].join('|');
  const uniqueContexts = [];
  const contextSeen = new Set();
  for (const context of contexts) {
    const key = contextKey(context);
    if (contextSeen.has(key)) continue;
    contextSeen.add(key);
    uniqueContexts.push(context);
  }
  contexts = uniqueContexts.sort((a, b) => ((a.pathogen.canonical ? 0 : 2) + (a.disease.profileId ? 0 : 1)) - ((b.pathogen.canonical ? 0 : 2) + (b.disease.profileId ? 0 : 1)) || canonical(b.term).length - canonical(a.term).length);
  if (contexts.length > MAX_TERMS) {
    summary.gaps.push('Used ' + MAX_TERMS + ' of ' + contexts.length + ' pathogen-disease terms from this label.');
    contexts = contexts.slice(0, MAX_TERMS);
  }
  const seen = new Set();
  const seenShape = new Set();
  const remember = (context, result, branchRole) => {
    const regions = (result && result.roi && result.roi.regions || []).filter(usableRegion);
    if (result && result.diagnostics && result.diagnostics.some(item => item.code === 'REGEX_DEADLINE')) {
      const message = 'ROI analysis timed out for ' + context.term + '.';
      if (!summary.gaps.includes(message)) summary.gaps.push(message);
    }
    for (const region of regions) {
      if (conflictingContext(region, context, index)) continue;
      if (branchRole === 'primary_regimen' && region.indication && contexts.some(other => other !== context && canonical(region.indication) === canonical(other.term))) continue;
      const shapeKey = [region.shape.fingerprint, context.pathogen.canonical || '', context.disease.profileId || canonical(context.disease.sourceText)].join('|');
      if (branchRole === 'physiological_adjustment' && seenShape.has(shapeKey)) continue;
      const record = crossingRecord(name, loaded.product, context, region, branchRole);
      record.filterSlots = slotsFor(region, database.fieldDefinitions);
      const named = diseasesNamed([region.indication, region.sourceText].filter(Boolean).join(' '), index);
      record.diseaseBinding = named.some(disease => disease.canonical === context.pathogen.canonical && disease.id === context.disease.profileId) ? 'named_in_region' : 'product_context';
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      seenShape.add(shapeKey);
      summary.records.push(record);
      if (record.draftStatus === 'disabled_fingerprint_draft') {
        summary.patterns.push({
          fingerprint: region.shape.fingerprint,
          sourceText: region.sourceText.slice(0, 12000),
          shape: region.shape,
          sourceIdentity: { document_id: loaded.label.identity.document_id }
        });
      }
    }
  };
  for (const context of contexts) {
    summary.contexts.push({ term: context.term, pathogen: context.pathogen.canonical, disease: context.disease.profileId });
    const result = await analyzeTerm(engine, loaded.label, context.term, context.pathogen.canonical, intentFor(context.term));
    remember(context, result, 'primary_regimen');
  }
  if (!summary.records.some(record => record.branchRole === 'primary_regimen')) {
    const clause = normalized.nodes.find(node => node.kind === 'prose.clause' && node.source_field === 'dosage_and_administration' && /\d/.test(node.text || '') && String(node.text).trim().length >= 8);
    if (clause) {
      const context = {
        term: clause.text.replace(/^[^A-Za-z0-9]+/, '').replace(/\s+/g, ' ').trim().slice(0, 80),
        pathogen: { canonical: null, alias: null, status: 'not_named_in_source' },
        disease: { profileId: null, label: null, sourceText: clip(clause.text, 240), status: 'source_indication_only' }
      };
      summary.contexts.push({ term: context.term, pathogen: null, disease: null });
      summary.gaps.push('No profiled pathogen or disease heading selected a regimen. One dosage clause was used as its own context.');
      remember(context, await analyzeTerm(engine, loaded.label, context.term, null, intentFor(context.term)), 'primary_regimen');
    }
  }
  const physiological = physiologyContexts(normalized.nodes, patterns, nonClinical);
  for (const item of physiological) {
    const result = await analyzeTerm(engine, loaded.label, item.term, null, undefined);
    for (const context of contexts) remember({ ...context, term: item.term }, result, 'physiological_adjustment');
  }
  summary.records.sort((a, b) => (a.branchRole === b.branchRole ? 0 : a.branchRole === 'primary_regimen' ? -1 : 1) || (b.filterSlots.length - a.filterSlots.length));
  if (summary.records.length > MAX_RECORDS) {
    summary.gaps.push('Kept ' + MAX_RECORDS + ' of ' + summary.records.length + ' observed shape crossings.');
    summary.records = summary.records.slice(0, MAX_RECORDS);
  }
  const kept = new Set(summary.records.map(record => record.fingerprint));
  summary.patterns = summary.patterns.filter(pattern => kept.has(pattern.fingerprint));
  summary.coverage = {
    id: 'rfs_drug_' + slug(name),
    kind: 'drug_coverage',
    drugName: name,
    maySupplyLabelDose: false,
    mayCreateRegimen: false,
    product: loaded.product,
    contexts: summary.contexts,
    sharedPhysiology: sharedConcepts(normalized.nodes, patterns),
    crossingCount: summary.records.length,
    newFingerprintCount: new Set(summary.records.filter(record => record.draftStatus === 'disabled_fingerprint_draft').map(record => record.fingerprint)).size,
    gaps: summary.gaps
  };
  return summary;
}

function collectionShell(existing) {
  return existing && existing.reportType === 'amu-roi-format-structure/1' ? existing : {
    version: 1,
    reportType: 'amu-roi-format-structure/1',
    maySupplyLabelDose: false,
    mayCreateRegimen: false,
    description: 'Observed ROI shapes crossed with the pathogen and disease that selected them. Filter slots name a physiological metric and stay open: bounds remain null, and eGFR, GFR and CrCl are never treated as the same measurement.',
    filterSlotSchema: {
      bounds: null,
      statusValues: ['open', 'metric_unresolved', 'not_in_dosing_region'],
      rule: 'A later filter may fill bounds only from the cited source comparison, in the declared field unit. Do not convert eGFR or GFR into CrCl, and do not invent a number for a missing measurement.'
    },
    queue: DRUGS,
    session: { collectedOn: null, completed: [], nextIndex: 0, nextDrug: DRUGS[0] },
    records: []
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limit = Number(arg('limit', '20'));
  const root = path.resolve(__dirname, '..');
  const databasePath = path.join(root, 'amu-database.json');
  const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
  const { AMUEngine } = require('../amu-engine.js');
  const engine = new AMUEngine(JSON.parse(JSON.stringify(database)));
  const index = profileIndex(database);
  const physiology = compilePatterns(database.lexicons.roi.vocabulary.physiology);
  let nonClinical = null;
  try { nonClinical = new RegExp(database.lexicons.roi.nonClinicalHeading.pattern, database.lexicons.roi.nonClinicalHeading.flags || ''); }
  catch { nonClinical = null; }
  const existing = collectionShell(database.referenceCollections.roiFormatStructures);
  const completed = new Set(existing.session.completed || []);
  const only = arg('drugs', '');
  const pending = only
    ? only.split(',').map(name => name.trim()).filter(name => DRUGS.includes(name))
    : DRUGS.filter(name => !completed.has(name)).slice(0, limit);
  if (!pending.length) {
    console.log('ROI format queue is already complete.');
    engine.dispose();
    return;
  }
  console.log('Collecting ' + pending.length + ' drugs: ' + pending.join(', '));
  const gathered = [];
  for (const name of pending) {
    const started = Date.now();
    try {
      const summary = await collectDrug(engine, database, index, physiology, nonClinical, name);
      gathered.push(summary);
      console.log(name + ': ' + summary.records.length + ' crossings, ' + new Set(summary.patterns.map(item => item.fingerprint)).size + ' new shapes, ' + summary.gaps.length + ' gaps (' + (Date.now() - started) + ' ms)');
      for (const gap of summary.gaps) console.log('  gap: ' + gap);
    } catch (error) {
      gathered.push({ drugName: name, gaps: [error.message], records: [], patterns: [], coverage: {
        id: 'rfs_drug_' + slug(name), kind: 'drug_coverage', drugName: name, maySupplyLabelDose: false, mayCreateRegimen: false,
        product: null, contexts: [], sharedPhysiology: [], crossingCount: 0, newFingerprintCount: 0, gaps: [error.message]
      } });
      console.log(name + ': failed (' + error.message + ')');
    }
  }
  engine.dispose();
  const byFingerprint = new Map();
  for (const summary of gathered) for (const pattern of summary.patterns || []) if (!byFingerprint.has(pattern.fingerprint)) byFingerprint.set(pattern.fingerprint, pattern);
  const observations = { reportType: 'amu-roi-pattern-review/1', unmatchedPatterns: [...byFingerprint.values()] };
  if (dryRun) {
    const preview = gathered.map(summary => ({
      drug: summary.drugName,
      crossings: summary.records.length,
      newShapes: new Set((summary.patterns || []).map(item => item.fingerprint)).size,
      contexts: summary.contexts,
      gaps: summary.gaps,
      sample: (summary.records || []).slice(0, 4).map(record => ({
        branch: record.branchRole,
        pathogen: record.pathogen,
        disease: record.disease,
        status: record.regionStatus,
        slots: record.filterSlots,
        excerpt: record.sourceExcerpt
      }))
    }));
    console.log(JSON.stringify(preview, null, 2));
    return;
  }
  let next = database;
  let imported = { formats: 0, fixtures: 0, upgraded: 0, duplicates: 0, databaseVersion: database.databaseVersion };
  if (observations.unmatchedPatterns.length) {
    const result = await importRoiPatterns(database, observations);
    next = result.database;
    imported = result.summary;
  }
  const collection = collectionShell(next.referenceCollections.roiFormatStructures);
  const replacing = new Set(pending);
  collection.records = collection.records.filter(record => !replacing.has(record.drugName));
  const ids = new Set(collection.records.map(record => record.id));
  for (const summary of gathered) {
    if (summary.coverage && !ids.has(summary.coverage.id)) collection.records.push(summary.coverage);
    for (const record of summary.records || []) if (!ids.has(record.id)) { collection.records.push(record); ids.add(record.id); }
    if (!collection.session.completed.includes(summary.drugName)) collection.session.completed.push(summary.drugName);
  }
  const nextIndex = DRUGS.findIndex(name => !collection.session.completed.includes(name));
  collection.session.collectedOn = '2026-11-13';
  collection.session.nextIndex = nextIndex === -1 ? DRUGS.length : nextIndex;
  collection.session.nextDrug = nextIndex === -1 ? null : DRUGS[nextIndex];
  next.referenceCollections.roiFormatStructures = collection;
  const previousVersion = database.databaseVersion;
  if (next.databaseVersion === previousVersion) next.databaseVersion = bumpVersion(previousVersion);
  const checker = new (require('../amu-engine.js').AMUEngine)(JSON.parse(JSON.stringify(next)));
  checker.dispose();
  fs.writeFileSync(databasePath, JSON.stringify(next) + '\n');
  console.log('Database ' + previousVersion + ' -> ' + next.databaseVersion + '. Disabled drafts added ' + imported.formats + ', fixtures ' + imported.fixtures + ', crossings ' + gathered.reduce((sum, item) => sum + item.records.length, 0) + '. Next drug: ' + (collection.session.nextDrug || 'none') + '.');
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
