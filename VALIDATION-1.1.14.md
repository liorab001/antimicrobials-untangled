# Validation — database 1.1.14 / engine 1.0.7

- 54 source/interpreter regression checks passed, retaining the GAS, FQ/aminoglycoside, source-scope, renal-sequence, AST and baseline-contract checks from 1.1.13.
- 19 first-line data and selection checks passed, including complete 289-view coverage, rejection of a future unclassified view, source validation, phenotype branches, missing dose/product behavior, contraindication/AST exclusion, exact local formulation boundaries and complete combination/sequence metadata.
- 8 existing workflow browser checks passed using frozen FDA responses. GAS now also includes the newly reachable oral first-line options; its two retained IV guideline cards still resolve. Pseudomonas HAP/cUTI, CrCl edits, missing renal inputs and generated schedule controls remain checked.
- 14 additional browser checks passed, including the reported S. aureus skin scenario, visible green border color, actual retrieved Cefazolin/Clindamycin cards, missing/empty product results, five infection-specific overview panels, topical Mupirocin isolation, pulmonary choices, required combinations/external components, treatment sequences, a no-universal-standard view, pinned allergy-blocked products and rejection of incomplete database imports without losing the active database.

Commands from the application directory:

```sh
node tests/regression.cjs
node tests/first-line.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/browser-smoke.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/first-line-browser.cjs
```

The browser scripts require Playwright and Chromium. They use archived public source responses; external style/font assets are blocked and minimal hidden-state CSS is supplied. The green-frame test checks computed border color, which is supplied directly and does not depend on the style CDN. Browser reports record zero runtime page errors.

The 159 existing extraction formats and all 124 field definitions are unchanged from the repaired 1.1.13 baseline. No patient drug-dose calculation was enabled. Source snapshots are test-only artifacts and are not a runtime fallback. Preferred names may be supplied by a guideline even when their FDA product or complete dose branch is not available.

This validates guidance classification and representative rendering/selection behavior. It is not an exhaustive clinical audit of every regimen or a claim of full label, pediatric, pregnancy, hepatic, renal/dialysis or monitoring coverage. Preference qualifiers and each dose's own source remain essential. Source links and review date are stored with the guidance data.
