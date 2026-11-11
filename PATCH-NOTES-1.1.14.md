# Infection-specific first-line frames — 1.1.14

Database **1.1.14**, interpreter **1.0.7**. This cumulative bundle includes the GAS, fluoroquinolone and aminoglycoside repairs in 1.1.13.

## Install

Copy the application files from this bundle into the website directory together, including the new `amu-treatment-guidance.js`, then hard-refresh. The six changed application files relative to the original published source are `index.html`, `amu-engine.js`, `amu-ui.js`, `amu-integration.js`, `amu-database.json`, and `amu-treatment-guidance.js`. The unchanged feature-data and resistance modules are included for a complete application. Confirm database 1.1.14 and engine 1.0.7 in the database status bar. The original GitHub Pages deployment has not been changed.

## First-line behavior

The database now has an explicit guidance decision for **all 289 presentation views across 110 pathogen profiles**. Of the 180 clinical views, 156 contain sourced, qualified first-line choices or primary management; 24 explain why the broad context needs a more specific clinical/resistance decision or has no universal regimen. The 109 `all` views show a separate overview entry for each infection instead of treating one drug as universally preferred for the pathogen.

Green frames identify guideline treatment choices independently of label-dose extraction. S. aureus cellulitis/abscess separates drainage, MSSA choices and MRSA choices, with the relevant conditions visible. Pneumonia, bloodstream infection, bone infection and impetigo retain separate selections. Alternatives, complete combinations, sequential stages and required external components have distinct descriptions. Product cards with active allergy blocks, relevant contraindications or selected non-susceptible AST are not promoted into green groups. When no eligible product was retrieved, the sourced treatment names remain visible with an explicit missing-card notice; a regimen is not invented.

A generic data layer checks route and product constraints. Topical mupirocin can enter impetigo, for example, while local or inhaled products need their own explicit presentation mapping. Single-dose guideline pathways do not inherit conventional multi-day product schedules. The existing clinical/patient filter collection remains in place.

`referenceCollections.firstLineGuidance` owns preferences and citations. Its `maySupplyLabelDose:false` keeps it separate from source-dose rules. Validation rejects a missing future presentation, broken citation, unsupported applicability field or invalid product constraint before activating an imported database. The previous database remains active after a rejection. Future expansion instructions now require maintaining this collection and executing regression checks.

## How database expansion actually works

There are separate layers: ingredient/product retrieval; pathogen/presentation associations; source-format recognition and extraction; patient/context eligibility; summary rendering; and guideline treatment preference. Adding a drug name or a label layout covers only some of these layers. The existing source audit includes representative passages and provenance records, not a proof that every branch of the entire label works for every disease.

For the **same source, formulation, route, relevant indication and compatible patient inputs**, a previously supported dose should continue resolving regardless of how the user reached it. A regression there is a bug. Earlier failures involved shared dose grammar and scope rules, newly imposed global prerequisites, changing live product selection, and insufficient executable context-specific regression coverage. These can change behavior without changing the filter collection code.

A new context can legitimately have no matched FDA dose: the drug may be used off-label for that organism/site; the retrieved product may be a different route or formulation; a required patient value can be missing; or that source branch may still require unsupported extraction/join/calculation capabilities. These are separate from first-line preference. For example, the sampled IV ciprofloxacin nosocomial-pneumonia label names H. influenzae and K. pneumoniae; the separately sourced pseudomonal HAP reference must not be relabeled as that FDA indication.

Release coverage must therefore state the exact source/product, indications, routes, population and renal branches tested, preserve negative cases and report remaining gaps. The supplied executable tests protect the repaired workflows. They do not establish complete support for every current or future drug label.
