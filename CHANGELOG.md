# Changelog

**English** | [Español](CHANGELOG.es.md) · [Back to the project](README.md)

## Unreleased

- English/Spanish documentation: READMEs, manual, technical guides, gallery and changelog with language navigation. The interface remained in Spanish in that initial documentation commit.
- Code and documentation under MIT, with LICENSE and package.json metadata. Example images retain separate conditions.
- Seven MP4 recordings: example 6 featured in the README and a gallery of additional videos with links back to the project.

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
