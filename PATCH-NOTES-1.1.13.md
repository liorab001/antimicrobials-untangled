# GAS, fluoroquinolone and aminoglycoside repair — 1.1.13

Database **1.1.13**, interpreter **1.0.7**. Based on the published GitHub source at `6d1928bd00f817d8e074e2eb3a0b1d4373e8a1c4`, checked against the uploads. The uploaded database and engine matched that version; the published UI/integration contained newer performance work, which this patch preserves.

## Install

Replace these five application files together: `index.html`, `amu-engine.js`, `amu-ui.js`, `amu-integration.js`, and the complete `amu-database.json`. Keep the other existing application files. Hard-refresh once. Confirm `AMUApp.database.databaseVersion === '1.1.13'` and `AMUEngine.version === '1.0.7'` in the console. This bundle has not been deployed to GitHub Pages.

The HTML changes are script version URLs. The UI/integration changes provide generic product/route preferences, enforce the reference route, and let `AMU_debugRegimens()` accept a product ID. Patient-field collection, units, treatment-intent collection, renal estimators, worker cancellation and the published rendering optimizations remain intact. The JSON requires engine 1.0.7 so an older interpreter cannot silently ignore the new generic behavior.

## What changed

- GAS cellulitis/erysipelas shows the two IV adult IDSA references for Penicillin G and Cefazolin. They are labelled **guideline references**, with the actual guideline link; they are not claimed as retrieved FDA-label doses. The existing `skin_nec` ID remains the cellulitis selection. Necrotizing fasciitis now has a distinct presentation with IV Penicillin G plus IV Clindamycin and its combination qualification. An oral or depot product cannot satisfy that IV pathway.
- Repaired repeated-unit ranges, including `250 mg to 500 mg` and mixed mass units; `Dosed every 24 hours`, plural duration headings, and `every 8 h` are recognized. Local adult table scopes win over pediatric preface footnotes. Explicit source renal thresholds win over a redundant qualitative normal-function heading. Named disease rows take precedence over multi-disease captions, and blank indication cells cannot borrow unrelated indications.
- Added source formats for complete Levofloxacin renal sequences, transposed renal columns, Ofloxacin unit-dose tables, complete route-specific Delafloxacin alternatives, daily-total aminoglycoside division, and Streptomycin plague dosing. Quantities expressed per day remain daily totals, including their division schedule; no patient drug dose is calculated.
- Levofloxacin pseudomonal cUTI uses the label's 250-mg/10-day branch. Its 750-mg/5-day branch and blank sinusitis continuation rows are excluded. HAP CrCl 10–19 retains the complete 750-mg initial/500-mg every-48-hours sequence; CrCl 20–49 retains the different source schedule. The normal reference remains separate and struck through when replaced.
- Amikacin's two complete normal-source alternatives can be read without an invented monitoring-approval prerequisite. The existing optional schedule input narrows them. Genuine missing severity, route and eGFR-method inputs still remain unknown.
- Pseudomonal HAP includes the separately sourced IDSA/ATS Ciprofloxacin, Tobramycin and Amikacin references. The sampled Ciprofloxacin IV label restricts its nosocomial indication to **H. influenzae or K. pneumoniae**. Its existing organism guard is retained; an FDA-label Pseudomonas claim is not manufactured. Aminoglycoside HAP/VAP references retain the combination/TDM qualification and are not presented as monotherapy.
- An entered resistant AST for the selected organism/drug blocks the affected FQ/aminoglycoside match even when the organism's displayed name does not itself contain a resistance phenotype.

Formats **152 → 159**; test-only source audit fixtures **353 → 384**; field definitions **123 → 124**. All previous format IDs and fixtures remain. Existing extractors are versioned for the shared changes. The drug catalog/groups, directory, resistance benchmarks/history/settings, legacy references, renal estimator definitions and qualitative renal-assumption policy remain intact. `allowDoseCalculation:false` remains unchanged. Test snapshots are not a runtime dose fallback.

## Why the problem recurred

Stable filters are necessary, but the rest of the matching contract also has to stay stable. The app chooses among live product records by identity, route, available source structure and effective date. A drug-name search therefore does not guarantee the same manufacturer, formulation or label layout on every retrieval.

The shared grammar and scope rules had failure cases that rejected already-known doses. Later database additions also installed global requirements: for example, the Amikacin rule required a schedule and a monitoring flag across earlier formats. Those changes can break a previously supported drug without changing how any filter is collected. The fluoroquinolone source-audit anchors establish provenance; they are not executable regression tests for the actual product + presentation + organism + renal/route combination. The supplied validation notes also describe older, selected samples rather than these current workflows.

This patch fixes those shared mechanisms and supplies executable positive, negative, boundary and browser cases. Future database/parser changes should run them before release. A genuinely new label structure still needs support; no finite parser can guarantee every future label.

## Validation and limits

See `VALIDATION-1.1.13.md`, `tests/engine-results.json`, and `tests/browser-results.json`. Run `node tests/regression.cjs` from the application directory. The optional browser test needs Playwright and Chromium; `CHROMIUM_PATH=/usr/bin/chromium node tests/browser-smoke.cjs` was used here.

Coverage is representative, not a complete prescribing database or validation of every class member, formulation or patient branch. Aminoglycoside renal nomograms, subsequent TDM-guided adjustments, relative Ofloxacin renal-dose projection, and unsampled multi-route/renal joins are not newly enabled. The typed patient drug-dose/TDM projection capability is still absent and disabled. A missing supported source branch stays unresolved; standard dosing is not substituted for it. The new guideline entries are standard adult references and do not supply renal-adjusted or dialysis regimens.

Primary guideline sources reviewed on 2026-11-10: [IDSA 2014 SSTI](https://www.idsociety.org/globalassets/idsa/practice-guidelines/practice-guidelines-for-the-diagnosis-and-management-of-skin-and-soft-tissue-infections-2014-update-by-the-infectious-diseases-society-of-america.pdf), [IDSA/ATS 2016 HAP/VAP](https://www.idsociety.org/globalassets/idsa/practice-guidelines/management-of-adults-with-hospital-acquired-and-ventilator-associated-pneumonia-2016-clinical-practice-guidelines-by-the-infectious-diseases-society-of-america-and-the-american-thoracic-society.pdf). Exact FDA source IDs, URLs and archived dosing inputs are in the test snapshots and appended source-audit records.
