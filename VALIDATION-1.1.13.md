# Validation — database 1.1.13 / engine 1.0.7

54 focused engine checks passed; 0 failed. 8 browser checks passed with no uncaught page errors. Tests use synthetic patient inputs and frozen official-source snapshots captured on 2026-11-10. The initial reported workflows were also reproduced using live FDA retrieval. Browser regression responses are frozen for reproducibility; this is not an assertion of future API availability.

Run `node tests/regression.cjs`. Optional browser command: `CHROMIUM_PATH=/usr/bin/chromium node tests/browser-smoke.cjs` (Playwright required).

Engine coverage includes:

- JSON/embedded schema validation, interpreter compatibility and source-evidence lineage.
- Both GAS cellulitis references and both necrotizing-fasciitis components, correct reference attribution, and withholding outside the normal-function adult reference branch.
- Multiple current oral/IV Ciprofloxacin and Levofloxacin products; oral/IV Moxifloxacin; Ofloxacin; explicit Delafloxacin oral/IV alternatives and required route/MDRD inputs.
- Amikacin alternatives and optional schedule selection; Tobramycin/Gentamicin serious-infection daily totals with explicit division; normal Plazomicin cUTI and Streptomycin plague sources.
- Pseudomonal cUTI 250-mg/10-day Levofloxacin scope; HAP loading/maintenance preservation; CrCl 10, 19, 20, 49 and 50; unsupported CrCl 9; eGFR 90/89; direct CrCl precedence; missing CrCl with low eGFR; and a separate source HD branch.
- Ciprofloxacin CrCl 12 with its product's source interval and reference-only baseline; withholding normal Ofloxacin and aminoglycoside schedules when renal support is missing, including Plazomicin below its source range/HD.
- Resistant supplied AST, pediatric adult-regimen exclusion, and rejection of Moxifloxacin as a pseudomonal HAP option.
- IDSA/ATS HAP references for Ciprofloxacin, Tobramycin and Amikacin, including renal withholding and AST exclusion. The sampled Ciprofloxacin FDA label's narrower nosocomial indication remains enforced.
- A local adult table scope taking precedence over a pediatric preface footnote in Ceftazidime.

Browser coverage:

- GAS cellulitis: both cards resolve with guideline attribution
- GAS necrotizing fasciitis: two IV combination components; oral card excluded
- Pseudomonas HAP: systemic IV FQ/aminoglycoside cards resolve with source attribution
- CrCl 12: complete Levofloxacin sequence and superseded baseline render
- Missing CrCl with low eGFR: no unrestricted FQ baseline
- Pseudomonas cUTI: no 750-mg/5-day or blank-indication regimen
- Generated branch field edit invalidates and recalculates Amikacin
- No page errors, patient storage or patient parameters in source requests

Existing database identity/protocol and prior format/fixture IDs are retained. Resistance data/settings/history, legacy renal/HD/pediatric references, drug catalog/groups/directory, source renal-estimator definitions and the qualitative assumption policy were compared unchanged. No patient dose calculation was enabled. The published UI rendering/cache optimizations remain present.

A separate comparison ran the 71 supplied runtime-request fixtures through both uploaded and patched engines/databases. All emitted-regimen counts were preserved; one no-dose result changed from unresolved to none. This was a baseline comparison, not a claim that all old fixture assertions passed: some supplied no-dose assertions already disagreed with their uploaded runtime. They were not counted in the focused checks above.

Scope limits: these checks do not validate every drug, indication, product, pediatric/hepatic branch, equation or monitoring regimen. No new renal nomogram, TDM/relative-dose projection, or patient drug-dose equation was enabled. The new guideline entries do not supply renal-adjusted or dialysis doses. Complete interpreter records retain source conditions/evidence. Future source or rule changes must rerun the executable checks and add new source shapes when needed.
