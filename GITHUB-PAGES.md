# Publish Antimicrobials Untangled with GitHub Pages

This package uses your uploaded application files unchanged: database **1.1.10**, engine **1.0.6**. The downloaded filenames have been corrected for hosting. No backend, build command or database-file selection is required.

1. Extract `AMU_GitHub_Pages_ready.zip` on your computer.
2. Create a GitHub repository, for example `antimicrobials-untangled`. GitHub Free supports Pages from public repositories. Pages sites are normally public, including sites whose source repository is private on eligible plans.
3. Open the repository's **Code** tab. Choose **Add file → Upload files** and upload the extracted files directly to the repository root. Upload the contents, not the ZIP or an enclosing folder. Commit the upload to `main`.
4. Go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose **main** and **/(root)**, then click **Save**.
5. Wait for the Pages deployment to complete. Open **Visit site** in the Pages settings. A project site's address is typically `https://YOUR-USERNAME.github.io/antimicrobials-untangled/`. GitHub documents that publication can take up to ten minutes.

The publishing folder should contain:

```text
index.html
amu-database.json
amu-engine.js
amu-feature-data.js
amu-integration.js
amu-ui.js
amu-resistance.js
.nojekyll
GITHUB-PAGES.md
```

The included `.nojekyll` file selects static-file publishing. Keep all application files together. In particular, use exactly `index.html` and `amu-database.json`, with matching lowercase spelling. The original browser-download suffixes `(2)` and `(4)` are not part of those hosting filenames.

## Automatic database loading

The existing integration automatically requests `./amu-database.json` when the page opens. This relative URL works under a GitHub project path. The file-import control is an optional local-file/recovery feature; hosted visitors do not need it.

For future compatible database expansions, replace `amu-database.json` in the same repository folder and commit. GitHub redeploys the changed files, and the application fetches the current JSON on its next page load. An already-open tab needs a reload; the app does not replace a patient's active filter state through background database polling.

Confirm the status bar shows **Database 1.1.10 · 102 formats · engine 1.0.6**. If automatic loading fails, check the JSON filename and location and open `https://YOUR-USERNAME.github.io/antimicrobials-untangled/amu-database.json` to confirm the file exists. Opening an HTML file directly from your computer uses `file://`, where browser restrictions can require manual JSON import. Use the HTTPS GitHub Pages URL.

A local HTTP check under `/amu/` verified automatic startup and reload with zero manual file selections. This is a project-path simulation, not an actual GitHub deployment. External service availability was not tested. The package preserves the application's temporary patient-state behavior and adds no storage.

## Separate typing/filter performance finding

The current UI rebuilds the card list on filter changes and formats complete interpreter results even inside closed details panels. In one controlled three-card render it generated about 3.56 million characters of result JSON and spent about 80 ms in the synchronous redraw. This is a client-side cost that hosting does not remove. No application code was changed in this hosting package.

Official references:

- [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Configuring the publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
