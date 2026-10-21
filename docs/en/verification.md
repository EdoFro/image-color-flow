# Project verification

**English** | [Español](../verificacion.md)

[Back to the project](../../README.md)

This is a translated record of checks performed during the versions below, including their limitations. Translating this record does not mean those tests were rerun. Where old results differ from current behavior, use the newest relevant version's entry.

## v0.18.0 · Exclusive host input

- Headless Chrome, offline local files and local HTTP: physical clicks on artwork, margins and an inactive image reach the host and command only its active animation. Three animations and four slides (introduction, explanation and intermediate slide) share one input binding.
- Tab and programmatic focus exclude attached iframes. Body inert and interaction:host negotiation checked; no internal controls/restart remain visible. The same HTML opened independently retains clicks, keyboard and hover restart without autoplay.
- Buttons with nested text, Enter and Space perform exactly one action. Links, text fields, editing arrows, native help and a custom excluded region do not advance. Image/sequence resets, backward slide navigation, advancement while painting and completing the last moment before slide changes checked.
- Rebinding/cleanup without duplicate input; iframe reattachment and attribute restoration on disconnect; wrong source/channel and iframe-originated input rejected. NOT_READY does not execute later; image errors and incompatible handshake exports report errors.
- Regressions: 106/106 engine/player, 29/29 automation, focused integration tests, 11 preferences, 467 keys per language; es/en/fr/de standalone interface/HTML and highlighting/restart passed. Example screenshot inspected. Reusable input scenario: tests/host-input-browser.mjs, called by tests/integration-browser.mjs.
- This version has not been integrated into the user's real presentation or tested on other engines/physical devices. The example does not replace a rehearsal with the real host navigation system.


## v0.17.0 · Advancement while painting

- 106/106 existing engine/player tests and 29/29 automation tests. Updated integration checks cover completing the current stage and playing the next, `skip` as a stopped checkpoint, and the `advanceWhenIdle` alternative. Original indices, accumulated paint, zero-duration stages and consuming the final stage before host advancement are checked.
- Chrome offline and local HTTP scenario: parent-page right arrow, image click and keyboard focus inside the iframe advance while painting. The last stage stops at its end without also revealing the next host element. `advance-wait` works through the controller and direct commands. The integrated HTML opened without a host supports the same gestures.
- Back, hover restart, two animations, intermediate explanation/slide change, source/channel validation, initialization errors and NOT_READY without later execution remain checked. Real API rendering generates updated helpers; both ZIPs remain reproducible and work after extraction.
- The user's real presentation was not changed or rehearsed; re-export its animations, update the controller and remove any host-side painting-state input guards.


## v0.16.0 · Drafts and embedding

- Existing checks: 106/106 engine/player tests, 29/29 automation tests, 11 preference tests and 467 keys in four languages. Focused integration tests cover manual checkpoints, skip/back/restart/finish, zero duration, ZIP CRC/Unicode, escaped self-contained editor JSON, file roots, API/CLI/MCP review and helper delivery.
- Headless Chrome: offline `file://` draft opening, name/radius edits, saved JSON inspection and ZIP export/extraction. Two three-stage animations, intermediate text and slide change; rapid advances discarded, explicit skip, back, Home/End, focus inside/outside iframe, hover restart without autoplay. Restart during another animation does not start both.
- Wrong-channel and wrong-source messages ignored. Local HTTP also checked; commands before readiness return NOT_READY without delayed execution, and image initialization failures report errors. Real Node rendering delivers HTML/controller/example from a workspace outside the installation.
- Reusable `tests/integration-browser.mjs` exports `runIntegrationBrowser(browser, outputDirectory)` for a Playwright-compatible test browser supplied by the environment. The local launcher adds no runtime library to the app or packages. Editor/example screenshots inspected.
- Existing interface and standalone export scenarios passed in es/en/fr/de. Both reproducible ZIPs work after isolated extraction (30 editor files, 50 complete files).
- The user's real presentation integration, other browser engines and physical devices remain untested. Normal-window opening is requested through a process launch; these checks opened the review file through the test browser.


## v0.15.0 · Portable application and two ZIPs

- 106/106 DOM-free cases, 29/29 automation tests, 11 preference tests and 461 translation keys per language. Chrome language/export, New/preferences, image preparation and highlight scenarios work using `app/`.
- `node tests/distribution.test.mjs`: two reproducible ZIPs, CRC32, file reconstruction, safe archive paths, included HTML resources, locally linked documentation, MIT/notices, 29 editor files and 46 complete-package files. Both contain identical `app/` files; API, CLI and the MCP resource work after extraction without the original repository.
- Additional extraction with Python's standard ZIP library: both archives pass integrity checks. Fixed timestamps and SHA256 sums; `dist/` contains both ZIPs and `SHA256SUMS.txt`.
- Additional test with both ZIPs actually extracted outside the repository: eight offline Chrome openings (two packages × four languages), embedded example and no HTTP resources. Both packages loaded a user image, generated L in a Worker, played/exported HTML and opened that HTML separately. Editor screenshot reviewed.
- From the extracted complete package: actual API (`create`, `prepare`, `render`), CLI (`validate`, `inspect`) and MCP over a stdio process (`initialize`, guide, seven tools and rendering). Compatibility `index.html` reaches `app/index.html`. These additional tests used a local harness and did not publish ZIPs to GitHub.

## v0.14.0 · New project and preferences

- 11 DOM-free preference tests: factory values, independent objects, ranges/increments/types/colors/thresholds, JSON, damaged/blocked storage, new projects/stages, explicitly permitted empty drafts and unchanged engine/existing files.
- `node scripts/ejecutar-pruebas-vista.mjs --projects` run in Chrome for es/en/fr/de: introductory example, empty New project, image-free save/reopen, cancel/download/confirm replacement, protected invalid drafts, preferences without project mutation, language switching with a draft, import/export and rejection of invalid files/late imports, new stages/points with inherited radii, Open/example protection and preservation after preparation failure.
- Additional offline headless Chrome and `file://` review: 192 cases (four languages, twelve viewports, example/empty/preferences/warning), no horizontal overflow or page errors; Escape retains work. Empty startup/reload, remembered values, return to the example's own settings and blocked storage verified. German screenshots reviewed. This matrix uses a local review harness, separate from repository commands.
- Regressions: 106/106 DOM-free engine/player cases, 29/29 automation tests, 461 complete keys per language; language/standalone HTML, image preparation and highlight scenarios pass. Other browser engines and physical devices were not reviewed.

## v0.13.1 · Long text and layout

- Additional headless Chrome review, direct `file://` opening and offline context: 384 cases, four languages (es/en/fr/de), eight screens per size: stage, initial view, General, change review, alignment, generated comparison, export dialog and standalone HTML.
- Twelve viewports: 1920 × 1080, 1440 × 900, 1280 × 720, 1024 × 768, 920 × 700, 901 × 650, 768 × 1024, 600 × 800, 390 × 844, 320 × 568, 1024 × 390 and 844 × 390. Long stage/file names and a continuous 180-character presentation caption. No horizontal overflow, clipped controls, overlapping selection help or page errors. Both comparison canvases retain matching vertical positions and heights.
- Screenshots reviewed for German canvas, comparison and exported controls. Restart stays inside the viewport at every size. Showing/hiding exported controls retains canvas dimensions and position.
- Repository regressions pass: `node tests/i18n.test.mjs`, `node scripts/ejecutar-pruebas-vista.mjs --i18n`, `--editor` and `--highlights`; 106/106 tests without a DOM and 29/29 automation tests. Language tests include visible tool labels, a narrow selector's full value, no duplicate scripts and a long presentation caption without changing artwork size.
- The additional viewport matrix used a local review harness and is not part of the language-test command. Other browser engines and physical devices were not reviewed.

## v0.13.0 · French and German

- Four complete catalogs with 429 keys each. Tests compare raw catalogs without automatic fallback and check placeholders, HTML attributes, exported code and regional language detection.
- `node scripts/ejecutar-pruebas-vista.mjs --i18n` run separately in Chrome for es, en, fr and de. All four preserve project, revision, multi-selection, invalid drafts, comparison viewport and player when switching languages, including during base calculation.
- Four standalone HTML files executed in separate jobs: export language independent of the editor, controls, initial view, final view and restart work correctly.
- Direct offline opening checked in Chrome with fr-CA and de-AT: selects Français and Deutsch respectively. Manually switching to the other language persists on reload; no page errors.
- 106/106 tests without a DOM and 29/29 automation tests. Repository documentation remains in English and Spanish. Complete long-text and screen-size review is the next delivery; these tests verify translation and interactions rather than that full aesthetic review.

## v0.12.0 · English and Spanish

- Catalogs/placeholders checked with `node tests/i18n.test.mjs`: matching keys, HTML bindings, regional detection, Spanish fallback, blocked storage, interpolation and self-contained factory/export.
- 106/106 tests without a DOM and 29/29 automation tests pass. The builder test context now loads its translation dependency.
- Actual Chrome with `node scripts/ejecutar-pruebas-vista.mjs --i18n`: unchanged project/revision, literal names retained, multi-selection, invalid numeric drafts, open review, switching during base calculation, zoom, paused player and independent export language. English HTML executed in a separate job: initial view, controls, advance, final and restart translated.
- Chrome regression for Images and multiple highlights: indicator, cancellation, latest settings, complete pixels, intact originals, union, transparency and exported HTML pass.
- Direct `file://` opening checked in Chrome with an offline context: English detection, switching to Spanish and preference retained on reload. Basic 1440 × 1000 visual review of header/dialog, without page errors or header overflow. This does not replace the complete long-text layout review scheduled for a later delivery.

## v0.11.0 · Multiple highlights

- 106/106 tests without a DOM and 28/29 automation tests recorded: single-rectangle migration, list precedence, initial/stage/codec persistence, selection, handles, bounds, minimum size, collective linking, list validation and legacy API patching. The [changelog](../../CHANGELOG.md) records 29 automation tests for this version; this historical entry originally recorded 28/29. A fresh run while preparing the bilingual documentation confirmed **29/29 passing** with `node tests/automation.test.mjs`, without code changes. The original result is retained to distinguish the two checks.
- Actual Chrome Canvas: six outside treatments, two untouched interiors and treated space between rectangles; overlapping source alpha .5 without accumulation; rectangle-count/outside transitions with correct endpoints.
- Complete editor: normal drawing, Ctrl-add even inside another rectangle, list selection, movement, resize, cancellation, replacement, unchanged camera framing and retained separate list when linking/unlinking. Delete and × tested; deleting the last disables highlighting. Multiple initial-view highlights also checked. Fixed scrolling caused by canvas `focus()` on small canvases.
- Standalone HTML generated and executed in a separate Chrome job: transparent initial-view union, stage union with black outside, and restart restoring the initial view. The fixture permits its own inline scripts/styles; production automation-server permissions remain unchanged.
- Actual API export of the samurai at 490 × 720: initial/stage lists retained in format 10, two opaque interiors and transparent space between in `inicio.png`, black outside in `final.png`, self-contained HTML. CLI and MCP also create complete lists, verified by project inspection.
- Reproduce with `npm test` and `npm run test:highlights` (local Chrome/Edge required). Browser tests execute controls and verify pixels; no manual aesthetic review of every screen size or repeated direct `file://` opening was performed.

## v0.10.0 · L, compositing and progressive editor

- 100/100 tests without a DOM and 26/26 automation tests. New cases: L with brown masses, red-pigment exclusion, M/N without lightening, warm paper, legacy literal copy, format 9 and K retained for format 8.
- Regional calculation is byte-for-byte identical to full calculation in tests of small blocks crossing strokes and boundaries, including softness, pigment, thresholds and paper. L's connected support is computed globally; local halo 12 px plus resampling margin.
- Actual Blob Worker, OffscreenCanvas and Canvas in Chrome: exact base, final and matching-count equivalence for samurai (1035 × 1520), earlier Calvin (1600 × 1153) and trouser Calvin (1229 × 1600). Checked L/M at 720 px, L/N with maximum softness and warm paper at 1080 px, K/literal-copy and ink. Viewport changes reprioritize the next block; cancellation and stale revisions checked.
- First block took approximately .07–.33 s and complete line calculation 3.6–4.4 s in that session. These are local test-renderer measurements, not timing guarantees.
- L exactly reproduces the experimental trouser PNG. Earlier Calvin differs at 41 pixels; samurai at 71, at most one gray level. No equivalence to unavailable original ink artwork is claimed.
- Actual dialog in headless Chrome: image loading, L/M/N, rapid parameter changes, view preservation, Apply/Download blocked until the latest complete result, application identical to full calculation, and originals intact. Tested off/yellow/pulsing-green/solid-green/red states, simulated error/retry and closing while a Worker was pending. Navigation used actual Canvas/geometry: wheel, drag, thumbnail and rectangle.
- Actual L/M preparation: `base.png` and `referencia.png` identical across API, CLI and MCP. Actual self-contained L/N export, format-9 project and unchanged embedded original.
- No manual review of the entire interface or new visual dialog screenshot. Controls and geometry/pixels were tested; this does not replace aesthetic review at every screen size. Direct `file://` opening was not repeated; classic scripts and Blob Worker remain without external requests.
- Reproduce with `npm test`, `npm run test:preview`, `npm run test:editor`. The latter two need local Chrome/Edge; an image can be passed to the script. No Calvin images or experimental dependencies were added.

## v0.9.1 · Ink matching

- 94/94 tests without a DOM and 26/26 automation tests. New cases: identical RGBA, gray 254, warm/fractional backgrounds, pigment outside strokes, inactive options, incompatible buffers, persistence and API/CLI/MCP contracts.
- Actual samurai watercolor preparation at 490 × 720 in Chrome. Both matching modes select 146,659 pixels and leave 206,141 untouched. All-channel comparison confirms only the chosen side changes, and selected pixels become equal between images. Warm paper selects the same count without turning the background into ink.
- Changing modes and returning to none reproduces previous buffers byte for byte; each prepared project retains original embedded-image bytes. Standalone HTML embeds exactly the matched PNGs checked during preparation.
- No new interactive dialog review: these checks cover preparation, contracts and actual export, not every visual interaction.

## v0.9.0 · K integration

- 88/88 tests without a DOM: synthetic reference independent of the Python prototype, stripes over red, weak texture, solid blacks, dimensions, controls and format compatibility. 24/24 API/CLI/MCP tests.
- At native resolution, Calvin (1600 × 1153) differs at 42 pixels and samurai (1035 × 1520) at 72 pixels from the experimental K PNG. Maximum difference is one gray level; mean below .00005 levels. Ink reproduces its earlier PNGs exactly.
- Approximately 3.3 s and 2.8 s respectively in that session's Node runtime: local measurements, not guarantees. K analyzes originals up to a 1600 px longest side, then reduces to animation resolution (720, 1080 or 1440), preserving detection scale when choosing a smaller animation.
- Actual samurai preparation at 720 px in Chrome: 490 × 720 base, identical PNG across API, CLI and MCP; actual self-contained export and format-8 project.
- Installed Edge exited before returning the headless job. Windows automatic selection now prefers Chrome when available; `browser`/`--browser` can also be supplied. Preparation/export checked with automatic Chrome selection. Direct editor opening remains supported.
- No new interactive editor review in that session. Tests without a DOM and actual preparation/export are not equivalent to checking every visual interaction.
- Experimental copies and comparator remained separate and unchanged. No Calvin images or Python/sharp dependencies were incorporated into the application.

## v0.8.0 · Configurable ink base

Date: October 18, 2026.

- 80 tests without a DOM and 88 passing in Chrome. New cases cover light/dark pigment to paper, black/neutral-gray preservation, gray blending, faint watercolor, thresholds, softness to 100%, paper tone and legacy-desaturation compatibility.
- 24 passing automation tests: generation contract, ordered thresholds, persistence, preparation without HTML/calculation, and CLI/MCP calls. Run as processes using Node.js 24.21.0 bundled with VS Code via `ELECTRON_RUN_AS_NODE`; no software installed.
- Dialog checked with the actual image: explicit generation, comparison, presets, controls disabled during desaturation, 200% zoom and 100% softness. Closing/reopening retains uploaded mode and original values; Apply without preview generates it first and keeps the dialog open.
- Subsequent application saves a derived base at 720 px. Downloaded project inspected: format 7, ink and smoothness 1. Editor-downloaded PNG matches API preparation's `base.png` byte for byte for the same values.
- Actual prepare in Chrome with an emitter outside its region: base/reference/comparison/project/report generated without propagation. `imageDecodingChecked` true, `calculationChecked` false. Report retains generation settings.
- Earlier example re-exported with shared renderer: 16.891 s and HTML identical to the existing example. Large example files did not need regeneration.
- Comparison/controls captured in `images/vista-base.png`; no console errors or warnings. Tool restrictions on `file://` navigation remained; no browser permissions changed. No external MCP-client connection or actual headless launch tested; the same job/runner URL was opened from the test browser.

## v0.7.0 · API, CLI and MCP

Date: October 18, 2026.

- 21 passing automation tests: contract, coordinates/geometry, creation, isolated updates, backward compatibility, errors without file changes, root/links, artifacts, CLI, MCP negotiation/resources/calls/cancellation, fragmented Unicode stdio. Timeout and process/server/profile cleanup checked with a simulated launcher.
- 71 existing engine tests without a DOM and 79 passing in Chrome. Calculation/export verified in the editor after extracting format, Worker and HTML builder. No console errors or warnings.
- Example processed through the API with an actual browser: four stages, 735 × 1080 px and 16.891 s excluding manual pauses. Produced HTML, editable project, report, geometry plan and frames. HTML matches v0.6.1 byte for byte; new editor download also matches. No large-example update needed.
- CLI create run through its main function with the actual colored image and included plan: three-stage derived-base project. An MCP call rendered it in Chrome and returned correct artifacts/report: 490 × 720 px, 5.846 s and a desaturated-base warning.
- Generated presentation opened in Chrome and advanced by click to stage two with controls hidden. Actual-job screenshot in `images/vista-automatizacion.png`.
- Visual jobs used the automatic mode's server/runner URLs in the test browser. Node was not on that machine's PATH: CLI was not launched as a standalone process and Chrome/Edge was not started through the actual headless launcher. That launch and a specific MCP client connection remained to verify on a Node installation.
- Test-browser policy blocked `file://`. No permissions were changed or bypass attempted; direct file opening was not repeated. Editor keeps local classic scripts without new requests/dependencies. Temporary test servers were closed afterward.

## v0.6.1 · Visible restart at the end

Date: October 18, 2026.

- 79 passing Chrome tests. Change limited to export UI; editable format 6 retained.
- Editor-generated HTML opened in Chrome. Button absent initially/during playback; at the end hidden with the mouse outside the image, visible on entry.
- Opaque dark background, white text and double border visually checked over transparent presentation. Screenshot in `images/vista-reinicio.png`.
- Restart returns to Inicio, time zero and stopped state. Next canvas click starts the first stage.
- Tab reveals/focuses the button with a highlighted outline; Enter restarts and returns focus to the canvas. No console errors/warnings.

## v0.6.0 · Painting delay and click advance

Date: October 18, 2026.

- 71 tests without a DOM and 79 passing in Chrome. New cases cover normalization, shifted arrivals, own duration, first enabled point, dependencies, brush samples, camera before painting, hold, view-only/disabled stages, collective edits, packing and navigation from pauses.
- Individual delay control changes/display checked. General detects differences; confirmed application to two stages changes only their delays.
- Downloaded format-6 project retains per-stage delay. Format 5 normalizes to 6 with zero delay for all stages.
- Exported HTML tested with actual canvas clicks: first starts; second advances while playing; after pausing with Space, another advances while staying paused. In the last stage it finishes; another click retains the final view without restarting.
- Hidden toolbar retained during clicks; no console errors. Intermediate-pause navigation uses a simulated clock in shared tests.
- Examples regenerated with .8 s first transition and 1.2 s delay. New-control and presentation screenshots updated.

## v0.5.0 · Stage selection and hidden controls

Date: October 18, 2026.

- 61 tests without a DOM and 69 passing in Chrome. New cases verify default activation, excluded stages, camera/navigation among enabled stages, Inicio with all disabled, group summaries and isolated radius application.
- Ctrl + click checked in UI: multi-select, member removal and at least one selected. Activation checkbox does not change the group.
- Application to two stages (one disabled) reviewed/confirmed: changes their six points, retains a third stage's radius. Selection retains targets during reordering.
- Independent General/selection drafts checked. Image preparation preserves group/draft.
- Downloaded format-5 project retains stage activation and group-only values. Format-4 stages missing the new field default to enabled.
- All-disabled sequence checked in editor/export: retains Inicio, consumes no time, paints nothing.
- Hidden exported toolbar and accessible logo checked; click/H toggle visibility without canvas resizing.
- Keyboard playback/pause/stage navigation checked with controls hidden. No canvas border, focus outline or shadow.
- Editable/standalone examples regenerated; editor, General, multi-selection and presentation screenshots updated.

## v0.4.0 · General and view-only stages

Date: October 18, 2026.

- 54 tests without a DOM and 62 passing in Chrome. New cases cover view-only stages, hold, zero-duration pauses, accumulated color, effective-radii summaries, collective application, batch validation and optional initial-view scope.
- Actual-pixel transitions checked: opaque black-to-white and gradual opaque-to-transparent outside.
- General UI checked: uniform/mixed values, pending change, target review, cancel without applying, navigation persistence and confirmed unification. Out-of-range values block application.
- Downloaded format-4 project retains export background, hold and inherited radii. Format 3 normalizes to 4, retaining frames with zero hold and hatching.
- All-points-disabled sequence plays as view-only stages through the first pause rather than discarding them.
- Exported presentation checked in Chrome: actual hatching, no canvas border/shadow, last view-only stage retains color and reveals pattern through transparent outside; no console errors.
- Hatched, custom solid and transparent backgrounds checked in actual presentation-builder output. Embedded-script syntax valid; no external resources.
- Editable/standalone examples regenerated with a fourth view-only stage. Editor, General and presentation screenshots updated.

## v0.3.1 · Reorganization

Date: October 18, 2026.

- 44 tests without a DOM via `scripts/ejecutar-pruebas.mjs`, 50 passing Chrome tests via `tests/index.html`.
- Root editor loaded with `src/` scripts, `assets/` styles and `examples/` data; resources correctly served from new paths.
- Example calculated in the Worker and played to the first pause, total 14.1 seconds, no console errors.
- Existing `examples/presentacion-ejemplo.html` opened with initial view ready and no console errors. Self-contained contents and editable project unchanged.
- Example generator checked: both image data blocks identical to pre-reorganization data; output reproducible.
- Local README/documentation/HTML references checked without missing targets.
- Moved code and presentation-script syntax checked. Editor screenshot updated in `docs/images/`.
- Editable format 3 retained. No dependencies or compilation introduced.

## v0.3.0 · Features

Date: October 18, 2026.

- JavaScript syntax checked in editor, engine, preparation, player and tests.
- 44 passing synthetic JavaScript tests and 50 in Chrome. Six additional tests check actual Show/Blur/Black/White/Color/Transparent pixels. Includes original tests and new sequencing, first-enabled, activation, ordering, hue, maximum-radius, brush, persistent faint-edge, camera, skipped-stage and export-encoding checks.
- Both supplied images calculated in a Web Worker and played in Chrome. Intermediate pauses observed; no console errors.
- Rectangle, Enter-closed polygon and brush path tested through canvas interaction.
- Alternative preparation from final image applied in the dialog; desaturated base visually checked.
- Downloaded project validated using actual editor functions, retaining images/stages/alignment. Invalid file rejected by validator.
- Downloaded HTML's embedded-script syntax and timing maps checked. Includes two PNGs, three maps and the player; no external resources.
- Exported presentation opened/played in Chrome, with manual pause and seeking to the end.
- Double-clicking a point deletes and renumbers it.
- Point activation/reordering checked in UI; mode/delay retained. At that version, an empty stage was skipped without consuming its pause.
- Camera frame dragged, preview checked and zoom observed in standalone presentation.
- Brush tested with example images, all points disabled and maximum radius 10%: paints a band, retaining the rest as base.
- Downloaded format-2 project contains activation, modes, delays, both radii, hue resistance and framing.
- Independent Inicio, camera and highlighting checked: 0% zoom, blur and transparent checkerboard.
- Rename by double-click/pencil checked; Enter saves, Escape keeps old name.
- Ink handle drag changes 22% to 30% only for the point, disables inheritance and retains stage 22%. Checkbox restores inheritance.
- Exported transparent initial view with independent highlighting opened in Chrome; alpha retained, starts from base and restart restores Inicio.
- Engine tests cover individual/inherited radii, point limits, reversed wind, view normalization, independent zoom and codec highlight metadata.
- Editable/standalone examples regenerated with format 3 and agreed defaults.

## Verification limits

Browser automation only permitted HTTP/HTTPS URLs. Visual checks used a temporary `127.0.0.1` server limited to application files. Editor/export use local scripts and embedded data without network requests, but direct `file://` opening could not be automated.

The Chrome extension lacked file-access permission for automating the file chooser. Downloaded project contents were checked; reopening and loading new images through that chooser were not completed. Extension permissions were not changed.

Alignment was checked with the supplied images; other pairs may require manual adjustment. Other browsers and mobile devices were not tested in that review.
