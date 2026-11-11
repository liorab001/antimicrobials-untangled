# Startup repair validation — bundle 1.2.1

Database 1.2.0 / interpreter 1.1.0.

- 9 startup checks passed, including reproduction of the previous integration failure. The standalone guidance asset deliberately returned HTTP 404. The new HTML activated without requesting it; stale HTML with the failed request also activated. S. aureus first-line groups still rendered. Incomplete guidance imports remained rejected while the working database stayed active. The embedded implementation matched the standalone source exactly.
- 9 ROI browser workflow checks passed.
- 14 first-line browser checks passed.
- All browser reports recorded zero runtime page errors.

The database, engine, UI, resistance, feature-data and standalone guidance files were compared byte-for-byte with release 1.2.0 and remained unchanged. Its earlier 143 focused checks are documented in VALIDATION-1.2.0.md. This repair changes startup bundling, cache versioning and packaging.

Commands from the application directory:

```sh
node tools/bundle-treatment-guidance.cjs --check
CHROMIUM_PATH=/usr/bin/chromium node tests/startup.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/roi-browser.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/first-line-browser.cjs
```

The startup suite runs eight current-version checks by default. The ninth baseline reproduction check used the archived 1.2.0 integration supplied through AMU_BASELINE_INTEGRATION. Browser tests require Playwright and Chromium. Their external style/font requests are blocked and minimal hidden-state CSS is supplied.
