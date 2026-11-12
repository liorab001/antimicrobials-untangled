# Context-first label matching — database 1.2.0 / engine 1.1.0

## Install

Use the **complete 1.2.1 bundle** and copy all eight application files together as listed in `INSTALL-1.2.1.md`, then hard-refresh. It includes the UI, resistance and feature-data dependencies. Treatment guidance is also embedded in the startup integration, so a missing standalone module does not prevent activation. The database remains 1.2.0 and requires interpreter 1.1.0 with the `roi/1` capability.

## Implemented sequence

1. Identify the requested disease and, when supplied, organism. Indications paragraphs can bind an organism to a disease even when the dose appears elsewhere. Semicolon/line-separated indications remain distinct. Explicitly incompatible organism statements are excluded.
2. Build source regions for dosing clauses and table rows. Include their heading ancestry, headers, captions, row/column span origins and linked footnotes. Explicit numbered section references remain inspectable and can bring a physiological adjustment section into the ROI. Source headings stop sibling disease regions from leaking into one another. A leading disease label in a dosing clause is explicit even when the amount is not a mass unit, so that clause cannot borrow another indication. Weight, age, renal and severity labels stay patient axes. Empty indication cells cannot borrow another disease.
3. Run existing declarative `formats` and `pipelines` against the selected source nodes. Broad table recognition is followed by selection of the relevant rows. Known general dosage sections can serve multiple source indications. Existing indication conflicts, organism exclusions and regimen requirements still run.
4. Extract dose, route, schedule, duration and source-bound physiological conditions. Numeric and enum comparisons retain source evidence. Keyword vocabulary, clinical filter rules and scope rules are in `lexicons.roi`, `patientAxisRules`, `roleRules` and `tokenGrammars`.
5. Evaluate the current patient inputs and existing allergy assessment. Source-only preparation may be cached; context selection and patient eligibility are recomputed. An allergy change invalidates the application result cache, including for a pinned product. Missing values do not establish a conditional branch.
6. Emit the source-backed bullet or a specific unresolved outcome. Results include `roi.regions`, selected/skipped reasons, source passages, structural fingerprints, matched format IDs, physiological mentions, parsed constraints and unmatched patterns. Each emitted regimen carries its ROI in `sourceStructure.roi`.

HTML/SPL headings and embedded tables are preserved structurally. Original fragments and offsets remain evidence; an embedded table is not flattened into a neighboring prose dose. Duplicate embedded/explicit tables retain the clinical heading and are normalized once.

## Vocabulary and units

Weight conditions recognize kg, kilograms, kilos, lb, lbs and pounds, including thresholds, ranges and unit-bearing headers. Pound comparison bounds convert to the existing kilogram input using 0.45359237 kg/lb. This does **not** calculate a patient drug dose. A dose written `mg per kilogram` keeps that basis in its source text.

Age conditions support numeric years/months/weeks/days in supported threshold/range structures. Renal aliases include CrCl, CLcr, Ccr, creatinine clearance and creatinine Cl. GFR, eGFR, indexed clearance and weight-normalized clearance remain distinct measures. Explicitly incompatible units remain unresolved. A bare “kidney function <30 mL/min” does not establish which renal metric was intended. The existing qualitative normal renal policy remains intact.

Child-Pugh classes and supported pregnancy branches are parsed locally. Allergy-dependent local regimens can read the existing class selections; the existing product allergy decision also blocks dose emission. Global contraindication/population passages are retained for review rather than indiscriminately imposing every population paragraph on every dose. Physiological language outside the supported rules still requires source review; recognized but unparsed branch qualifiers are not silently accepted.

## Add an observed pattern

Open a drug's **Label ROI and patterns** inspector. It shows the selected source passages and matched patterns. **Download unmatched label patterns** exports public source passages, their structural shapes and disabled format drafts. Runtime patient values are excluded.

Interpreter 1.1.2 binds each draft to the observed structural fingerprint. Recognition requires that fingerprint on the selected region, and the extractor's selector keeps only nodes with the same fingerprint. A heading, an empty indication cell, or a different disease does not inherit the draft. The draft stays disabled, borrows no patient-axis list from another format, and does not create a regimen. A draft whose `documentation.roiPattern.status` is anything other than `validated` is not executed, even if `enabled` is later flipped.

To add those observations to a complete replacement database:

```sh
node tools/import-roi-patterns.cjs amu-database.json amu-unmatched-label-patterns.json amu-database-next.json
```

The importer recomputes the fingerprint from the shape, rejects a mismatch, rewrites broad draft recognition, deduplicates pattern IDs, preserves previous live formats, records test-only source observations, increments the database patch version and validates the resulting database. It cannot set a draft to `validated` or enable it. Fill in the observable recognition/extraction rules, add executable positive, missing-input, boundary and incompatible-branch cases, then change that one draft to `validated` and `enabled`. Observation alone does not prove the clinical interpretation or manufacture a regimen.

A later drug list is a review queue, not a set of formats. It adds no dosing rules and does not dispatch on drug names:

```sh
node tools/import-roi-patterns.cjs amu-database.json drug-queue.json amu-database-next.json
```

```json
{ "reportType": "amu-roi-drug-queue/1", "drugs": [{ "name": "vancomycin", "sourceUrl": "https://dailymed.nlm.nih.gov/dailymed/" }] }
```

Each queued name still needs an unmatched-pattern export before a format exists. Patterns use the existing generic interpreter operations. A new supported composition normally requires JSON changes. A genuinely new primitive still requires an explicit capability/interpreter change. The implementation has no new drug-name dispatch. `node tests/roi-import.cjs` checks fingerprint scope, the disabled import, the drug queue and the sibling-disease boundary.

## Verification and limits

See `VALIDATION-1.2.0.md` and the machine-readable reports in `tests/`. Existing first-line guidance remains independent of source-dose matching. This is a reusable ROI implementation with representative source tests, not a claim that every current or future FDA layout, physiological sentence, table cross-reference, dose calculation or monitoring regimen is understood. Unsupported/ambiguous source patterns remain available for review and expansion. No patient drug-dose calculation or browser persistence was enabled.
