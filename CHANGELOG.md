# Changelog

**English** | [Español](CHANGELOG.es.md) · [Back to the project](README.md)

## v0.18.0 · One input owner per presentation

- attach disables iframe pointer/focus and negotiates hiding every internal control, including Restart. Directly opened HTML retains its interaction.
- bindInput configures clicks, keyboard and buttons once per host, respecting fields, links and custom controls without duplicate actions.
- Official example: four slides, three animations, intermediate text, backward navigation and external resets. activeAnimation supports context-aware controls.
- Advance while painting, skip and last-moment/host separation retained. Bilingual guides and input/focus checks updated.


## v0.17.0 · Default advancement while painting

- `advance` completes the playing stage and starts the next; in the last stage it shows the end without also advancing the host. Right arrow and click use this behavior.
- `advanceWhenIdle()` / `advance-wait` retains the discard-while-painting alternative. `skip` still shows an end without playing the next stage.
- Controller, example, bilingual guides and tests updated. Existing presentations require re-exported HTML and the updated controller.


## v0.16.0 · Editor drafts and embedding

- API/CLI/MCP `review` creates a self-contained, preloaded editor with optional browser opening.
- Integrated export ZIP includes controller, two-animation/slide example and bilingual instructions.
- Protocol v1 supports advance, skip, back, restart, finish, pause and state; per-stage checkpoints and discarded advances while painting.
- Final hover restart informs the host and restores the image's turn; source window, origin and channel checks.
- Documentation and export selector updated in existing languages.

## Unreleased

- English/Spanish documentation: READMEs, manual, technical guides, gallery and changelog with language navigation. The interface remained in Spanish in that initial documentation commit.
- Code and documentation under MIT, with LICENSE and package.json metadata. Example images retain separate conditions.
- Seven MP4 recordings: example 6 featured in the README and a gallery of additional videos with links back to the project.

## v0.15.0

- Self-contained `app/` with editor, languages, styles, embedded example, bilingual instructions, MIT and resource notices. The previous entry redirects to `app/index.html`.
- Two versioned ZIPs: editor and complete (editor + API, CLI, MCP, schema and guides), built with `npm run package` or Node without external dependencies. Reproducible allowlisted packaging and SHA256SUMS.txt; ignored artifacts in `dist/`.
- Automation, tests and example generator updated to share `app/src/` and `app/demo/demo-data.js`. English/Spanish documentation and download instructions updated.
- Both ZIPs verified after extraction: offline editor in four languages, Worker/base, playback, standalone HTML and actual API/CLI/MCP from the complete package.

## v0.14.0

- New project clears canvas, playback, selections and calculations; creates an initial view and an emitter-free stage using personal defaults. Image-free drafts can be saved/reopened; playback and export require a colored image.
- Shared warning for New, Open and example reload. Cancel retains work; downloading keeps the dialog open for later confirmation. Collective drafts and unfinished drawings are protected. Invalid files and preparation failures retain the previous project.
- Local preferences for startup, images/base, propagation, points, camera/highlight, timing and background. Example by default, optional empty startup; save/cancel, factory reset requiring confirmation and JSON import/export. Existing projects, example and automation retain their values.
- Four languages with 461 keys each. Preference, replacement and draft tests; offline review, blocked storage and 192 layout cases. Bilingual manual/references updated; explanatory tutorial retained as a future idea.

## v0.13.1

- Layout review for Spanish, English, French and German: wrapping headings, controls and dialogs, readable tool labels at narrow widths, aligned comparison canvases and full selected values below selectors when needed.
- Desktop panels use the actual header height; small or short windows allow scrolling. Exported controls wrap long captions and remain scrollable without resizing the artwork.
- Removed duplicate editor script/catalog and language-style loading. Added regression checks for labels, selected values, long captions and stable exported canvas size.
- Offline Chrome review: 384 cases across four languages and twelve viewport sizes, plus editor, highlight, standalone export and core/automation regressions. User guide and verification record updated in both languages.

## v0.13.0

- French and German in the editor and standalone HTML, with 429 complete messages per language: controls, help, errors, accessibility, progress and playback.
- Regional detection including fr-CA and de-AT; selectors generated from four local catalogs. Repository documentation remains in English and Spanish.
- Key/placeholder checks for all four languages; complete state-preservation and standalone-export scenarios run per language. Full long-text and screen-size review remains the next delivery.

## v0.12.0

- English/Spanish editor with local catalogs, browser-language detection, remembered preference and live switching without changing project data, drafts, preview calculation or playback.
- Independent export language; standalone HTML embeds its controls and messages. File-chooser labels inside the editor are localized.
- Shared translation factory, fallback, placeholder checks and actual Chrome editor/export regression tests. French/German and a full long-text layout review remain separate deliveries.

## v0.11.0

- Multiple separate highlight rectangles per stage and initial view. Ctrl + drag adds; drawing in empty space replaces; selection, movement, eight resize handles and a deletion list. Removing the last disables highlighting.
- Outside treatment applies to the union without alpha accumulation in overlaps. Camera framing and separate lists survive linking/unlinking; transitions and standalone HTML support all rectangles.
- Format 10 reads formats 1–9; legacy highlightFrame alias retained. Schema, API, CLI, MCP and plan.png updated.
- 106 tests without a DOM, 29 automation tests and Chrome Canvas/editor/exported-HTML tests. Canvas focus no longer scrolls the page.

## v0.10.0

- L recommended (`protected`), retaining K and earlier methods. Format 9 preserves formats 1–8 appearance when opening.
- Darken (M) and Multiply (N) for colored-copy preparation; legacy literal copy retained for existing projects. Same parameters in API, CLI and MCP.
- Synchronized comparison, draggable thumbnail viewport, shared zoom and preserved framing on regeneration.
- Local Worker and halo blocks prioritize visible detail, global L support and stale-revision rejection. Off/yellow/green light with text, red on error; Apply/Download only for latest complete result.
- 100 tests without a DOM and 26 automation tests; actual Chrome Worker/Canvas/dialog checked, exactly matching full calculation.

## v0.9.1

- Optional matching after K: recover original color in every non-white base pixel, copy those pixels to the colored animation image, or do nothing (default).
- Post-scaling correction, including soft edges and warm paper. Originals remain unchanged; reversible settings, shared preview/export images.
- inkMatch shared by editor/API/CLI/MCP, preserving earlier projects. 94 tests without a DOM and 26 automation tests.

## v0.9.0

- Ink and lines (K) recommended for new bases: median background, gradual grays, fine-stroke protection and directional recovery. Local dependency-free JavaScript.
- Shared editor/API/CLI/MCP algorithm; ink/grayscale methods retained. Pigment-to-gray, sensitivity, thresholds, optional smoothing and paper controls.
- Editable format 8 reads 1–7 without changing earlier behavior. K example plan, schema and guides updated. Preview up to 400%.
- 88 tests without a DOM and 24 automation tests. Native Calvin/samurai comparison differs by at most one gray level from the prototype. Actual Chrome preparation yields identical API/CLI/MCP PNGs and standalone HTML export.

## v0.8.0

- Configurable initial-image generation: ink on paper, ink with soft grays and legacy desaturation.
- Explicit Images comparison, 100%/200% zoom, preview before applying and PNG download; closing without applying preserves the project.
- Pigment, sensitivity, gray-threshold and paper controls. Softness extended from 0 to 100%.
- Shared editor/automation transformation; format-7 projects read formats 1–6 without changing their previous desaturation.
- API/CLI prepare and MCP colorflow_prepare, without propagation or HTML; complete base, reference, comparison and report. Render also includes base.png without camera.
- Schema, guides, example plan and screenshot updated. 80 tests without a DOM, 88 in Chrome and 24 automation tests.

## v0.7.0

- Local API/CLI to create, inspect, update, validate and render projects from images and JSON plans.
- Stdio MCP server with six tools, schema/guide resources, structured results and render cancellation.
- Strict JSON Schema with field-level validation; paths restricted to configured root and existing-output protection.
- Shared preparation/calculation/export with editor, retaining format 6 and offline HTML.
- Local-browser render, timing report, geometry plan and stage frames.
- Integration guides, example plan and MCP configuration reference.
- 21 new automation tests; 71 engine tests without a DOM and 79 in Chrome.

## v0.6.1

- Final ↻ Restart button appears on image hover and is accessible via Tab/Enter.
- Solid dark background, white text and light/dark double border distinguish it from artwork; highlighted keyboard focus.
- Returns to initial view without autoplay; stays visible at the end on devices without hover.
- Example presentation, guide and screenshot updated; 79 passing Chrome tests.

## v0.6.0

- Initial painting delay per stage, 0–60 seconds, default zero; available in General and multi-selection.
- First enabled point and complete brush path delayed without postponing camera/highlight; point dependencies retained.
- Duration/export account for delay, adding no wait to view-only/disabled stages.
- Exported image click acts as Right Arrow: starts/advances, preserves manual pause and does not restart at the end.
- Format 6 reads 1–5; example first transition .8 s and delay 1.2 s.
- 71 tests without a DOM and 79 Chrome tests.

## v0.5.0

- Individual stage activation retains data but skips painting/camera/timing when disabled.
- Ctrl + click multi-selection with group-only inspector, review and confirmation.
- Separate General/selection drafts; group identity retained through reordering/preparation.
- Presentation toolbar initially hidden; accessible logo and H toggle it without resizing canvas.
- Initial view retained when no stage is enabled.
- Format 5 reads 1–4.
- 61 tests without a DOM and 69 in Chrome; examples/screenshots updated.

## v0.4.0

- General panel before Inicio: uniform values black, mixed values purple, including effective point radii.
- Pending collective edits, per-parameter review and explicit confirmation; radius inheritance restored on application.
- View-only stages without emitters, additional hold and manual pauses.
- Gradual highlight rectangle/outside/transparency transitions.
- Default hatched, solid or transparent export background; no canvas border/shadow.
- Format 4 reads 1–3; examples/screenshots updated.
- 54 tests without a DOM and 62 in Chrome.

## v0.3.1

- Source, styles, examples, tests and documentation reorganized into separate folders.
- Short README with screenshot, quick start and guide links.
- Architecture, editable-format and resource-provenance documentation.
- Embedded-example generator and Node.js test runner without a DOM, both optional and dependency-free.
- Paths updated while retaining direct editor opening and standalone presentation.
- Editable format 3 and animation behavior unchanged.

## v0.3.0

- Rename stages by double-click, pencil or inspector; Enter saves, Escape cancels.
- Configurable initial view without painting, waiting for input and restored on restart.
- Zoom adjustable independently of camera rectangle.
- Optional highlighting, off by default, linked or separate rectangle.
- Normal, blurred, black, white, custom or real-alpha transparent outside.
- Radii with contrasting halos, distinct colors, selection and show-all option.
- Mouse handles for both wind-deformed radii and individual point values; stage inheritance by default.
- Format 3 reads 1–2; standalone export updated.
- 50 Chrome tests, including six highlight-mode pixel checks.

## v0.2.0

- Double-click removes a point when the Points tool is active.
- Point list with activation, arrow ordering, start mode and delay.
- Dependencies on previous enabled point; first enabled starts at zero, calculated timing displayed.
- At that version, stages without active emitters were automatically skipped.
- Neighbor hue resistance, reduced for neutral colors.
- Per-emitter maximum radius fades over the last 20%, deforms with wind and applies along the full brush path.
- Maximum-arrived-contribution blending retains faint edges across stages.
- Per-stage framing, preview, smooth camera transition during painting and full-page return.
- Standalone HTML updated; format 2 reads format 1.
- Expanded sequencing, radii, hue, camera and export tests.

## v0.1.0

First working version: image preparation, regions, simultaneous points, brush path, brightness/ink-driven propagation, wind, pauses, project saving and offline HTML export.
