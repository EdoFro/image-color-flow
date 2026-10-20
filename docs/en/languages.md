# Application languages

**English** | [Español](../idiomas.md)

[Back to the project](../../README.md)

## Choose a language

The editor offers **English**, **Español**, **Français** and **Deutsch** in the header and Images dialog. A saved preference takes priority; otherwise it looks for a supported browser language, including regional variants such as `en-GB`, `fr-CA` and `de-AT`. With no match it uses Spanish. The choice is remembered in `localStorage` when allowed; blocking storage does not prevent using the editor or switching languages during the session.

Switching preserves the project, stage/file names, selection, pending edits, comparison viewport and playback. It changes no parameters and invalidates no calculation. Included example names are project content and remain in Spanish too.

Export HTML lets you select a presentation language independently. Each opening proposes the current editor language. Output language is embedded in the standalone HTML rather than added to the project format. Older exports are not translated retroactively. Automation still exports Spanish by default.

File dialogs and other native system messages depend on the browser and operating system. Image-selection labels inside the editor are translated.

## Catalogs and additional languages

`src/i18n.js` provides `PaintI18n`. Catalogs are independent local scripts in `src/locales/`; no translation service or JSON request is used. Direct local opening and offline operation are preserved.

To add a language:

1. Copy a catalog, retain its keys and brace-delimited variables, translate values and change the `PaintI18n.register` language code. `_language_name` is the language's native name.
2. Load it before `src/app.js` in `index.html` and before the presentation builder in `automation/runner.html`.
3. Add the resource to the `automation/browser.mjs` allowlist and files copied by `scripts/ejecutar-pruebas-vista.mjs`. The server still exposes only enumerated assets.
4. Extend catalog, detection and browser checks. Selectors are built from registered catalogs, so no hand-written selector options are needed.
5. Review labels, help, accessibility, dialogs and exported HTML. Missing translations fall back to Spanish; this keeps the app usable but does not replace completing the catalog.

Static text uses `data-i18n`; accessible attributes use `data-i18n-aria-label` or `data-i18n-title`. Dynamic messages use `PaintI18n.t(key, variables)` and are assigned as text. User-authored names are neither translated nor interpreted as HTML. Codes, JSON keys and API fields retain their contracts.

## Verification

With local Node.js and Chrome/Edge:

```sh
node tests/i18n.test.mjs
node scripts/ejecutar-pruebas-vista.mjs --i18n
```

No external packages are required. Results and review limits are in [verification](verification.md).
