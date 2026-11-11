# Complete startup repair — bundle 1.2.1

Extract the complete ZIP. Copy these eight application files into the website directory together, replacing the existing copies:

- index.html
- amu-engine.js
- amu-feature-data.js
- amu-integration.js
- amu-ui.js
- amu-resistance.js
- amu-treatment-guidance.js
- amu-database.json

Then hard-refresh the browser. Keep the filenames exactly as supplied. No build step is needed to install the supplied files.

The previous four-file patch assumed the 1.1.14 dependency files were already installed. If `amu-treatment-guidance.js` was absent, database activation stopped. Bundle 1.2.1 includes all application dependencies and embeds the exact treatment-guidance implementation into `amu-integration.js`. The new HTML no longer requests the standalone guidance script. Stale HTML that still requests it can also start using the bundled implementation after that request fails.

The standalone guidance file remains included for compatibility and Node tests. After editing that source in future, run `node tools/bundle-treatment-guidance.cjs`; `--check` verifies that the startup bundle matches it. The existing guidance/database validation remains enforced.

Bundle version: 1.2.1 (`AMUApp.bundleVersion`). Database: 1.2.0. Interpreter: 1.1.0. This is a startup/packaging repair; the ROI rules and clinical database content are unchanged.
