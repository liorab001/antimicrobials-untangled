# Validation — database 1.2.0 / engine 1.1.0

**143 focused checks passed.**

| Suite | Passed |
| --- | ---: |
| Existing source/interpreter regressions | 54 |
| ROI structure, physiology and pattern-import checks | 39 |
| First-line data/selection checks | 19 |
| Existing browser workflows | 8 |
| ROI inspector, export, allergy and renal browser checks | 9 |
| First-line browser checks | 14 |

The ROI checks cover disease rows, changing context with a warm source cache, separate HTML headings, embedded/duplicate tables, numbered renal-section references, organism binding from indications, kg/kilogram/kilo and lb/lbs/pound bounds, unit-bearing headers, age in months, CrCl/creatinine-clearance/creatinine-Cl/Ccr aliases, distinct GFR/eGFR units, unspecified renal metrics, Child-Pugh and pregnancy branches, local and product allergy decisions, scoped footnotes, explicit weight-based dose text, unsupported source patterns, a validated disabled-pattern import, reuse across products and recalculation after patient changes. Unknown liver/allergy qualifiers remain unresolved in the tested structures.

The original 54 checks retain GAS guideline attribution, pseudomonal FQ/aminoglycoside cases, complete Levofloxacin renal sequences, renal boundaries/dialysis, missing inputs, AST exclusions and adult/pediatric scope protection.

Browser tests use frozen public API responses, Playwright and Chromium. External styling/font requests are blocked; minimal hidden-state CSS is supplied. The ROI browser suite verifies actual source-dose matching, inspector expansion, JSON download, disabled pattern drafts without patient inputs, allergy changes for a pinned card, restoration after clearing an allergy, a renal edit and rejection of an incompatible ROI database. All browser reports contain zero page errors.

Run from the application directory:

```sh
node tests/regression.cjs
node tests/roi.cjs
node tests/first-line.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/browser-smoke.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/roi-browser.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/first-line-browser.cjs
```

The 159 existing format IDs remain; patient field IDs, units and meanings are retained, with broader source aliases. First-line guidance remains separate from label extraction. Test snapshots and imported observations do not act as live dosing fallbacks. Patient drug-dose calculation remains disabled. These checks validate representative structures and regressions, not every FDA layout, physiological sentence or clinical use. See `ROI-IMPLEMENTATION.md` for scope and installation.
