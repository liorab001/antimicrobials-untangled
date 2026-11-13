# Antimicrobials Untangled — Modular Informatics Prototype

**Antimicrobials Untangled** is an independent academic medical informatics portfolio project and client-side document-inspection sandbox created by **Lior Abecassis**. The application demonstrates a deterministic, zero-backend architecture for retrieving, normalizing, and inspecting structured clinical monograph text across **U.S. FDA (openFDA)** product labels, **NIH National Library of Medicine (NLM)** ingredient records, and **Europe PMC Open-Access** antimicrobial resistance literature.

## Regulatory & Non-Clinical Sandbox Notice

This repository and its hosted demonstration are built strictly as an **academic software portfolio** and **document-inspection sandbox**.

* **No Device Status**: Not a certified medical device under Regulation (EU) 2017/745 or MDCG 2019-11, and not offered as Non-Device CDS under FD&C Act § 520(o)(1)(E).
* **Non-Clinical Scope**: Never use this software to diagnose, treat, cure, prevent, or guide prescribing for any real patient.
* **Zero Dose Calculation**: Operates strictly as a monograph text-branch filter that never estimates clearance, converts eGFR into CrCl, or calculates a drug dose.
* **Experimental Text Parsing**: Summaries, branch highlights, and caution flags come from experimental client-side parsing that can omit or truncate official label text.
* **Sample Branch Filters**: Physiological inputs default to 40 years and 70 kg to filter label sentences in browser memory and must never describe a real person.

## Key Engineering & Informatics Features

* **Context-First ROI Engine**: Isolates disease and organism regions from FDA prose and HTML tables while preserving heading ancestry, cell spans, and footnotes.
* **Declarative Rule Database**: Evaluates 15 versioned capabilities and three-valued logic from JSON without format-specific engine branches or dynamic code execution.
* **Isolated Worker Pool**: Runs regular-expression tokenization and constraint matching inside bounded Web Workers or Node worker threads with strict timeout enforcement.
* **Tri-Scope Explorer**: Navigates across pathogen profiles, clinical syndromes, and drug groups while keeping first-line guideline metadata separate from label doses.
* **Provenance Lineage**: Binds every emitted regimen bullet to exact document IDs, physical table coordinates, and clickable source quotes in the Monograph Inspector.
* **Open-Access Surveillance**: Pairs static educational resistance illustrations with live Europe PMC Open-Access queries and per-record Creative Commons attribution.
* **Stateless Privacy Firewall**: Runs with zero backend, cookies, or storage, erasing transient state on tab exit and blocking multi-digit numbers or long search text.

## Declarative ROI Processing Pipeline

The interpreter engine processes retrieved monographs through a six-stage deterministic contract without executing arbitrary JavaScript strings or dispatching on drug names:

1. **Context Identification**: Matches the requested indication, treatment intent, and canonical organism while excluding incompatible species statements.
2. **ROI Construction**: Builds scoped source regions from dosing clauses, spanning table cells, ancestor headings, captions, and explicit section references.
3. **Pattern Recognition**: Executes declarative exclusion, overlay, and extractor pipelines against normalized source nodes without dispatching on drug names.
4. **Physiological Extraction**: Captures doses, schedules, routes, durations, and typed patient axes while keeping eGFR, GFR, and CrCl strictly distinct.
5. **Three-Valued Filtering**: Evaluates patient branch constraints and allergy filters using match, mismatch, and unresolved states so unknown facts never default.
6. **Provenance Emission**: Emits source-cited bullets or specific unresolved diagnostics, plus downloadable fingerprint drafts for unmatched label patterns.

## Repository Architecture

| Module | Version | Primary Role | Runtime Scope |
| :--- | :--- | :--- | :--- |
| `index.html` | 1.18 | UI shell and legal gate | Browser DOM |
| `amu-engine.js` | 1.1.2 | Declarative ROI interpreter | Web Worker and Node |
| `amu-database.json` | 1.3.11 | Rules and reference schemas | Engine and UI |
| `amu-integration.js` | 1.2.1 | State and worker bridge | Browser main thread |
| `amu-ui.js` | 20261113 | Search and card renderer | Browser main thread |
| `amu-resistance.js` | 20261112 | OA literature dashboard | Browser main thread |
| `amu-treatment-guidance.js` | 1.2.1 | First-line choice validator | Browser and Node |
| `amu-feature-data.js` | 1.18 | Compatibility reference seed | Browser main thread |
| `amu-styles.css` | 3.4.17 | Compiled Tailwind stylesheet | Browser DOM |

The modular bundle preserves all 192 original named functions and 87 static element IDs while delegating live label-regimen extraction to the isolated interpreter engine. Reference collections inside `amu-database.json` take precedence over the `amu-feature-data.js` compatibility seed, allowing new formats, vocabularies, branch fields, and alert rules to be added via data-only updates validated against JSON Schema Draft 2020-12 prior to activation.

## Local Development & Pattern Expansion

Serve the repository folder over HTTP so the browser loads `amu-database.json` automatically on startup:

```sh
python -m http.server 8000
```

When previewing `index.html` directly via the local file protocol, use the **Import database JSON** control in the top status bar to load `amu-database.json` manually.

To inspect or expand coverage for new or complex FDA monograph layouts, open a drug card's **Label ROI and patterns** inspector and export unmatched structural shapes as disabled format drafts (no runtime patient values are included). Use the repository CLI utilities to bind structural fingerprints, queue drug SPLs, and run verification suites:

```sh
node tools/import-roi-patterns.cjs amu-database.json amu-unmatched-label-patterns.json amu-database-next.json
node tools/collect-roi-format-structures.cjs --limit 20
node tests/roi-format-structure.cjs
node tests/roi-import.cjs
```

## Data Attributions & Open-Source License

* **U.S. FDA openFDA**: Supplies public drug monograph data under CC0 1.0, which must never be relied upon for clinical medical care decisions.
* **NIH NLM RxNav**: Provides public ingredient associations and terminology mappings without endorsement by the National Library of Medicine or NIH.
* **Europe PMC Open-Access**: Limits literature polling to open-access records and displays each article's creators, source link, and Creative Commons deed.
* **Static Surveillance Figures**: Displays developer-compiled educational resistance illustrations that are not official WHO GLASS or ECDC EARS-Net tables.
* **MIT Code License**: Releases source code free of charge under the MIT License, subject to national fault-based negligence laws and EU Directive 2024/2853.