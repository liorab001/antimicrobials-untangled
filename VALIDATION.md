# Focused validation — database 1.1.9 / engine 1.0.6

Based on the previously delivered 1.1.8 files, themselves based on the user's uploaded 1.1.7 state. All original identifiers, collections, fixtures and source conditions are retained. Changes are shared performance/cancellation mechanisms and declarative source-format additions.

## Matching and growth measurements

The optimization was compared with engine 1.0.5 using the same 1.1.8 database, sources, synthetic patient examples and contexts. All six sampled outputs were data-equivalent after removing the new timing metadata, including source evidence, exclusions, diagnostics and normal references. Source-only repeat preparation was exercised. The quantified-recognition fallback was also compared with the previous engine.

| Source/context | Previous ms | New first-source ms | New warm-source ms |
| --- | ---: | ---: | ---: |
| amoxicillin | 466 | 278 | 166 |
| linezolid | 503 | 227 | 214 |
| penicillin-g-benzathine | 240 | 36 | 32 |
| piperacillin-tazobactam | 656 | 353 | 331 |
| piperacillin-tazobactam (CrCl 12) | 667 | 295 | 302 |
| voriconazole | 617 | 291 | 234 |

The aggregate warm-source time was approximately **2.5× faster** across these six local samples. Hardware, browser load and source complexity affect timing.

Synthetic growth check: **1092 formats**, **2700 fixtures**, roughly **8.1 MB** of compact JSON. Initial validated load: 633 ms; first source analysis: 245 ms; warm source: 166 ms. The 1,000 added formats were unrelated and identity-gated. The warm source performed the same 10096 recognition checks and produced the same clinical result as the ordinary bundle. This measures growth in unrelated formats and reference fixtures, not arbitrarily many applicable complex pipelines.

Browser queue check: **17 cards** from 18 supplied product records settled in **4.49 s**, with no timeout notices. After rapid renal-filter edits, the final batch settled in **4.60 s**. At most two workers were active; obsolete work was terminated. No uncaught page errors occurred. Controlled direct-browse contexts bypassed the existing disease-loader filter to isolate the real queue/interpreter/renderer. Live network reliability was not tested.

## Source expansion checks

- Explicit alternatives retain correlated schedules and shared duration: trimethoprim, BACTRIM, tetracycline; selected terbinafine and tinidazole courses resolve.
- Selected valganciclovir induction retains 900 mg/two 450-mg tablets and 21 days; unknown phase, low eGFR/missing CrCl and invalid tablet equivalence cannot resolve.
- Oral/IV vancomycin remain distinct. IV normal schedules resolve; renal/dialysis nomogram gaps and trimethoprim CrCl <15 cannot fall back to normal dosing.
- Tobramycin serious-infection daily quantity is distinct from a per-dose amount; missing severity is requested and cystic-fibrosis-specific dosing is not selected by default.
- Sampled valacyclovir, zanamivir and zidovudine branches retained; unsupported multi-phase/route/component-table joins remain unresolved rather than emitting partial regimens.
- Running analysis cancellation is immediate; subsequent work completes. Clearing transient state discards workers/source caches and the interpreter remains usable.

Fifteen product/route source samples cover the 14 requested names; vancomycin has separate oral and IV samples. Twelve samples resolve their selected adult source context; tigecycline, voriconazole and the EPCLUSA sample remain unresolved because the phase/route/component-to-duration linkage is not yet safely represented. A resolved sample does not imply every renal, dialysis, pediatric, hepatic or formulation branch is implemented.

## Preserved regression checks

- Uploaded baseline preserved: identity/protocol, all 270 prior fixtures and 92 format IDs, field types/units, fluoroquinolone expansion, resistance rates/histories/settings and legacy/guideline references. HTML, resistance and feature-data files unchanged.
- Normal renal boundary and cross-metric guards: eGFR 90 can use qualitative defaults; eGFR 89, abnormal CrCl or abnormal GFR cannot retain unrestricted normal amoxicillin dosing.
- MRSA label-reference exception cannot override a supplied resistant AST or ordinary-beta-lactam exclusion; unresolved neonatal linezolid exception does not become routine pediatric dosing.
- HAP/Pseudomonas with CrCl 12 retains cefepime-specific renal dosing; missing CrCl with low eGFR and HD cannot fall back to unrestricted normal dosing, including both sampled piperacillin/tazobactam products.
- Meropenem guideline reference has its own attribution and is withheld outside its normal-function adult branch.
- Invalid component-total arithmetic is rejected; direct patient drug-dose calculation remains disabled.

- MRSA skin: one linezolid 600 mg/12-hour labelled reference; no forced AST-name entry and no invented isolate susceptibility.
- Default amoxicillin: source adult options without GFR/CrCl requests or numerical renal values.
- GAS pharyngitis: Bicillin L-A 1,200,000 units as a single IM injection; other penicillin products remain separate.
- Pseudomonas HAP meropenem: separately identified IDSA/ATS reference, not an unrelated FDA-label dose.
- Pseudomonas HAP piperacillin–tazobactam: normal source dose/interval and required companion qualification. Manual calculation switch removed.
- Automatic CG: missing inputs named in the dose notice; existing age/weight reused, full-precision result selects the renal row and strikes through the normal reference.
- Relevant input edits invalidate/recalculate; entered CrCl takes precedence over the equation.
- Privacy: no web storage, no patient values in network requests, reset clears patient-derived state and reload does not restore equation inputs.

These are six grouped engine/preservation checks and eight browser checks, with cached FDA equation/source responses and controlled contexts. The resistance code, UI, feature-data and HTML were checked unchanged; resistance rates/histories/settings and other reference collections remain identical to 1.1.8. Live resistance polling, every navigator path and exhaustive clinical branches were not retested.

## Unsupported capabilities

- Patient drug-dose/interval equations, therapeutic monitoring/nomograms, pediatric valganciclovir BSA × clearance dosing and half-dose instructions require a validated typed dose-projection path; allowDoseCalculation remains false.
- Tigecycline/voriconazole multi-phase or multi-route source tables and EPCLUSA component-to-duration table joins are not silently reduced to one phase/component. Their unresolved branches remain explicit.
- Inhaled/local products may require direct lookup because the pre-existing syndrome loader filters inhaled/local routes.

No new drug-dose equation was enabled and `allowDoseCalculation:false` remains enforced. Existing source-verified renal estimators, direct-measurement precedence, full-precision matching, source validation and current-input activation were retained. No numerical CrCl is fabricated. Numerical patient/equation inputs remain local, temporary and unsaved; existing public-source searches can include drug/pathogen/syndrome terms.

The source IDs, official URLs and exact passages for the expansion are retained in the appended `testOnly` source-audit fixtures. Fixtures never supply retrieved FDA-label dosing evidence. New format rules run on the retrieved label supplied by the application.
