# Bundle 1.2.1 — remove the missing guidance-file startup dependency

The complete package now includes every application file. Treatment guidance is bundled into the integration script, and HTML no longer requires a separate guidance asset. Added missing-file/stale-HTML startup checks and a source synchronization check. Database 1.2.0, interpreter 1.1.0 and source matching rules remain unchanged. See `INSTALL-1.2.1.md`.

# AMU 1.2.0 — context-first source ROIs

Added ROI planning before declarative extraction, structural HTML/SPL heading and embedded-table handling, broader physiological vocabulary with explicit units, current allergy assessment in worker requests, source-region inspection and unmatched-pattern export/import. Existing first-line guidance and prior GAS/FQ/aminoglycoside repairs are retained. Replace the four application files listed in `ROI-IMPLEMENTATION.md`.

# AMU 1.1.14 — infection-specific first-line guidance

Green frames now come from a validated database collection covering every existing pathogen/presentation view. Treatment preference remains visible independently of dose extraction; allergy, susceptibility and local formulation constraints govern product membership. Includes the cumulative 1.1.13 GAS/FQ/aminoglycoside repair. See `PATCH-NOTES-1.1.14.md` and `VALIDATION-1.1.14.md` for installation, coverage and limits.

# AMU 1.1.9 — matching performance and source formats

Replace **three files** beside the existing HTML: `amu-engine.js`, `amu-integration.js`, and the complete `amu-database.json`. Hard-refresh and confirm **database 1.1.9 / engine 1.0.6**. HTML, UI, resistance and feature-data files are unchanged from 1.1.8.

- Reused isolated workers with one-time database validation and compiled regex/pipeline plans. Identical pipeline configurations share validated/expanded stages. Unrelated formats are narrowed through their existing source-kind and label-identity recognition predicates; unsupported/dynamic recognition expressions retain full evaluation.
- Retained bounded source-only preparation caches keyed by actual source content and provenance. Patient/context-dependent renal expansion and selection run fresh. No patient-result cache/history is introduced. Database replacement and page reset/exit invalidate worker state.
- Cancelled obsolete queued/running analyses on filter changes. A short input debounce avoids starting work for each intermediate slider position. Active workers remain capped at two. Replaced repeated field-definition cloning and format-ID scanning with immutable lookups.
- Separated database initialization from bounded source preparation (3 seconds) and matching (2 seconds). Complex work remains isolated and terminable; no timeout falls back to an unrestricted normal dose.
- All **14 requested drug names already existed**. Preserved the 184-entry catalog and every reference collection. Added **four source formats** and 15 source-product audit fixtures; formats **92 → 96**, fixtures **270 → 285**. Existing extractor versions increased for the shared grammar/requirement changes.
- Added correlated prose alternatives and shared schedule/duration handling, single-dose wording, explicit branded tablet counts and verified tablet-strength equivalences. Selected trimethoprim, TMP–SMX, tetracycline, terbinafine, tinidazole, valganciclovir and IV vancomycin source cases now resolve more faithfully. Added a supported aminoglycoside severity input and guarded cystic-fibrosis-specific tobramycin and standalone vancomycin minimum-dose instructions.
- Preserved qualitative normal renal defaults, abnormal-metric/dialysis exclusions, local automatic renal estimators, source evidence, normal-dose strike-through and adjusted-dose display. `allowDoseCalculation:false` remains unchanged.

**Focused validation:** approximately **2.5× faster aggregate warm matching** in six controlled local comparisons; an unrelated-format/fixture growth check used 1,092 formats and 2,700 fixtures. A 17-card browser batch and rapid filter edits completed with no timeout notices. Existing source/renal/calculator/privacy checks and selected expansion cases passed. See VALIDATION.md for measurements and limits; these are not comprehensive clinical validation or guarantees for every device/future format.

**Still unsupported:** complete tigecycline/voriconazole phase/route joins; EPCLUSA component-to-duration linkage; typed drug-dose/interval equation projection, nomograms/monitoring, pediatric valganciclovir dose equations and half-dose instructions. These branches remain unresolved rather than emitting partial or guessed regimens. Some inhaled products still require direct lookup under the existing loader's route restrictions.

For future database expansion, prefer supported pipeline reuse. Where true of the source, put source-kind and label-identity restrictions in ordinary `all` recognition predicates; the engine derives its index from those existing expressions. Do not add unused routing metadata or broaden recognition to unrelated labels. Preserve source conditions and add focused positive/missing-input/negative fixtures. No per-drug JavaScript is needed for supported source shapes.
