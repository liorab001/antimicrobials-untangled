**Antimicrobials Untangled V1.18 — modular prototype**

Extract the ZIP and keep its files together. Serve the folder with any static web server, for example `python -m http.server 8000`, then visit `http://localhost:8000`. The page loads `amu-database.json` automatically.

For a direct local-file preview, open `index.html` and use **Import database JSON** to select `amu-database.json`. Browsers generally restrict automatic JSON loading on `file://`, so this import path is intentional. Internet access is still needed for the original styling/icon CDNs and live public APIs. In this managed browser, direct `file://` navigation was blocked by administrator policy; JSON file import was checked successfully on the served page.

| File | Responsibility |
| --- | --- |
| `index.html` | Extracted V1.18 markup, styles, page controls, consent gate, database status/import and generated-field container. |
| `amu-engine.js` | Interpreter version 1.0.2, with source scoping, table parsing, patient-axis and renal-column binding fixes. |
| `amu-database.json` | Your database plus missing V1.18 application reference collections, version 1.1.3. The source-backed formats now use scoped conditions, typed patient axes and explicit column bindings. |
| `amu-ui.js` | Search, navigation, FDA/NIH adapters, cards, patient/allergy warnings, source inspector and the retained legacy parsing helpers. |
| `amu-resistance.js` | Resistance dashboard, daily/forced literature polling, study counts, region/Gram filters and OA paper/abstract display. |
| `amu-integration.js` | Validated loading, dynamic branch fields, engine requests, in-memory result queue/cache, lossless result inspector and database-only application extension hooks. |
| `amu-feature-data.js` | V1.18 compatibility seed for UI data absent from the originally uploaded database. Database collections take precedence. |
| `FEATURE-AUDIT.md` | Feature coverage, intentional changes and focused validation limits. |
| `feature-manifest.json` | A file location for each of the 192 original named functions, migrated data bindings and source checksums. |
| `DATABASE-EXPANSION-PROMPT.md` | Reusable instructions for future database-only expansion. |

All 192 original named functions and all 87 original static element IDs are accounted for. This is a source coverage audit, not a claim that every possible clinical/search branch has been exercised. The live resistance page and resistance-aware drug-card warnings are retained.

Live label-regimen extraction now uses the supplied engine. The old extraction functions remain available for inspection but cannot silently supply a replacement dose when the new engine returns unresolved. Full results expose components, ordered steps, alternatives, source structure, conditions, exclusions, annotations and diagnostics. Legacy renal, pediatric, dialysis and weight-based references remain explicitly labelled app references.

For contextual label matching, select a presentation or enter an exact label indication, and supply treatment intent under **Database-defined branch fields**. New fields are generated from `fieldDefinitions`; missing values remain unknown. The existing page controls provide the original patient fields. Optional interpreter overrides are labelled separately; the legacy reference panels continue to use the original page controls.

Use **Import database JSON** for a complete replacement or **Reload database** after changing the served file. Validation runs before activation. A rejected bundle leaves the previous compatible database active. The originally supplied version 1.1.0 also imports successfully; its missing UI reference collections use the compatibility seed. No patient inputs or fetched labels are written to browser storage.

Compatible data-only expansion needs changes only to `amu-database.json`: formats, existing operations/pipelines, vocabularies, field definitions, presentation field lists and supported reference collections. New resistance regions and Gram groups are discovered from data. New advisory rules can use `patientAlertRules` and `riskBadgeRules`. A new interpreter operation, unsupported schema/protocol, new remote source adapter or new interactive feature can require code; the existing compatibility contract cannot promise otherwise.

The resistance percentages and five-year histories remain the original static reference benchmarks. Europe PMC refreshes literature metadata and total matching OA-study counts. It does not supply fresh resistance percentages, and a daily index check is not a count of studies published within the past 24 hours.

Dosing patch: engine 1.0.1 and database 1.1.2 restore source-cited dosage bullets, including scoped Penicillin V prose and cefepime tables. Treatment/prophylaxis follows the selected workflow; direct drug browsing does not invent a disease. Missing patient values produce labelled source options rather than matched regimens. eGFR is never substituted for CrCl. Only visible cards are queued, and completed visible results are retained.

Renal/display patch 1.1.3: the configured qualitative physiological assumption applies only when CrCl is absent, eGFR is at least 90, and no dialysis is selected. No numeric CrCl is invented. Below 90, unconfirmed CrCl-specific doses are removed from the summary and a direct CrCl is requested. Direct slider edits clear a stale override for that measurement. Severe eGFR reduction activates the same screening/ranking used by presets. Filtered dose summaries are deduplicated; full indications, conditions and citations remain in expandable evidence and interpreter records.
