# Architecture

**English** | [Español](../arquitectura.md)

[Back to the project](../../README.md)

## Organization

The application uses HTML, CSS and classic JavaScript, with no external dependencies or compilation. Scripts load in order from HTML. It uses neither browser modules nor web requests to load example images, preserving direct opening from local files.

| File | Responsibility |
| --- | --- |
| `app/index.html` | Editor, inspector and image-dialog structure. |
| `app/assets/styles.css` | Editor styling and responsive layout. |
| `app/src/app.js` | Project state, editor events, canvas tools, files and coordination with shared calculation/export APIs. |
| `app/src/preferences.js` | Factory defaults, validation and optional preference storage. |
| `app/src/preferences-editor.js` | Preferences dialog, draft and import/export. |
| `app/src/project.js` | Shared editable-format and presentation-option normalization. |
| `app/src/ink-lines.js` | DOM-free K/L extraction: local median, gradual recovery, fine-detail protection and coherent lines in eight directions. |
| `app/src/base-generation.js` | Pure pixel transformation, presets and generation normalization, without a DOM. |
| `app/src/presentation.js` | Single standalone-HTML builder, including the final restart control. |
| `app/src/automation.js` | Complete preparation, Web Worker calculation, report, frames and storyboard without mounting the editor. |
| `automation/` | Node.js API, CLI, stdio MCP server and local-browser renderer. |
| `schemas/animation.schema.json` | Strict image-free plan contract for agents and clients. |
| `app/src/preparation.js` | Image decoding, paper preparation, configurable base generation and alignment. |
| `app/src/engine.js` | Parameter normalization and propagation, independent of the DOM. |
| `app/src/player.js` | Timing, pauses, navigation and stage blending. |
| `app/src/view.js` | Camera, highlighting and outside treatment. |
| `app/src/general.js` | Collective-parameter catalog, summary, validation and application to all stages or a group, without a DOM. |
| `app/src/codec.js` | Timing-map and faint-contribution packing/unpacking. |
| `app/demo/demo-data.js` | Embedded example images; generated file. |
| `tests/` | Shared synthetic cases and browser pixel checks. |
| `scripts/` | Optional Node.js development utilities. |

## Distribution

`app/` contains the complete editor with scripts, styles, example, license and instructions. Copying that folder is sufficient. Root `index.html` is only a compatibility entry. Automation and tests read the same engine from `app/src/`; the render server retains its virtual `src/*` URLs and resource allowlist.

`scripts/empaquetar.mjs` builds two reproducible ZIPs from allowlisted files: editor and complete. The complete package adds the nine automation files, schema, assistant guide, instructions from `packaging/complete/`, license and a runtime `package.json`. `scripts/lib/zip.mjs` uses deflate and CRC32 with built-in Node modules; ZIP dates are fixed. Git ignores `dist/`. See [distribution](distribution.md).

## Data flow

1. The editor loads the embedded example or user-selected images.
2. Preparation creates a base and colored reference of equal dimensions. Originals remain in the project.
3. Stages and the initial view use normalized coordinates. Multi-selection retains stage object references so identities survive reordering; General and selection drafts are independent. A confirmed edit invalidates calculated maps.
4. Disabled stages return empty zero-duration fields and are excluded from playback/export. Playback/export calculates stages in a Blob Web Worker. Its code embeds the engine factory rather than relying on a worker file path.
5. The player blends base and final images, accumulating revealed color. The view applies highlighting and camera framing. Transitions interpolate rectangles and blend treatments with premultiplied alpha, preserving transparency.
6. Project saving retains editable data; export embeds prepared images, maps and required functions in one HTML file.

Editor loading order begins with i18n and its catalogs, followed by engine, base generation, project format, preparation, view, player, codec, collective parameters, preferences and their dialog, example images, export, automation and application. Engine, player, view and codec factories must stay self-contained: their functions are embedded in Workers or exported HTML via `toString()`.

## Startup, project replacement and preferences

`app/src/preferences.js` validates format-1 preferences, supplies factory values and creates geometry-free projects/stages. It reuses the collective-parameter catalog with consistent ranges and increments. Storage is optional: failure retains values for the session and displays a message. `app/src/preferences-editor.js` handles the dialog draft, translated notices, import/export and rejection of late imports from a closed dialog session.

The application keeps preferences outside the project. Startup uses `startup` (factory value `example`); New always creates an empty project. Replacement buttons share a warning that considers committed changes, collective drafts and unfinished drawings. Downloading does not replace the project: a later confirmation is required. Open validates/decodes before asking for confirmation; preparation completes before clearing current state. Reset cancels the preview/Worker and clears the player, maps, temporary geometry, selections and controls.

Empty drafts use the explicit `allowEmpty` option only in the editor. The API and renderer retain strict normalization and engine defaults. Existing projects and the example do not receive personal preferences when opened. New tests run with `node tests/preferences.test.mjs` and `node scripts/ejecutar-pruebas-vista.mjs --projects`.

## Color propagation

Independent arrival maps use shortest paths across eight neighbors (Dijkstra). Each pixel's resistance depends on **final-image** brightness; ink and hue changes add delay. Timing is calculated in a Web Worker. Playback blends the base and final images using those times and retains faint edge contributions.

- **Base and brush speeds**: fractions of image width per second. Resolution does not multiply animation duration, though sampling and line thickness may slightly affect results.
- **Light-color boost**: speed multiplied by `1 + clarity × brightness / 255`.
- **Ink delay**: resistance multiplied by `1 + ink` below the black threshold.
- **Hue resistance**: delays hue transitions between neighboring pixels. Circular hue distance keeps reds across 0°/360° similar. Its influence diminishes near neutral colors and black; it is not an absolute barrier.
- **Ink-crossing radius**: fraction of width; inside it, crossing black is allowed with delay. Outside, ink blocks propagation. It does not stop spread through light regions.
- **Maximum radius**: mandatory per-emitter limit. Full color can appear up to 80%; intensity fades smoothly from 80% to 100%; outside, it does not paint. It does not reduce speed or make deposited color disappear.
- **Wind**: speed and both radii are multiplied by `exp(strength × cos(angle relative to wind))`. At zero strength, propagation stays radial. 0° points right, 90° down.
- **Multiple emitters**: each respects its own radii, start time and barriers; a future point does not open a route for an earlier one. The strongest arrived contribution is retained, without summing or darkening overlaps.
- **Brush**: each sampled path position emits as the brush passes and has its own maximum radius. The final footprint is a wind-deformed band around the complete path, not a radius measured from its start.
- **Regions**: mandatory boundaries. Diagonal crossing through a closed corner is not allowed.
- **Initial painting delay**: shifts absolute times of the first enabled point and all brush samples without changing their speeds, footprints or own durations. Subsequent points retain dependencies on the previous enabled point. Camera/highlight still begin at 0 s.
- **Duration**: the later of the last emitter completion and camera transition, plus stage hold. Total duration sums stages and excludes input-dependent pauses. View-only stages use transition plus hold with empty color maps.
- **Overlap**: previously revealed color is retained, including partial edge intensity.

Exported times are quantized to 16 bits per stage; precision is stage duration divided by 65,534. Faint contributions use 8-bit intensity. Preview and export share the same player.

## Development and checks

No package installation is needed. Open [browser tests](../../tests/index.html) in Chrome or Edge for shared cases and checks requiring actual Canvas.

Optionally, with Node.js 22 or later, from the root:

```sh
node scripts/ejecutar-pruebas.mjs
node scripts/generar-demo.mjs
```

The first runs cases without a DOM and fails if any case fails. The second only regenerates `app/demo/demo-data.js` from the two images in `examples/images/`; it does not re-export the project or presentation. Both scripts resolve paths relative to themselves. Run automation tests with `node tests/automation.test.mjs`.

If example images or settings change, save a new project and export the presentation again. Keep results in `examples/ejemplo.colorflow.json` and `examples/presentacion-ejemplo.html`.

A local static server can also be used for development; it is unnecessary for normal use. Performed checks and limits are in [verification](verification.md).

## Optional automation

The Node.js API uses the editor's normalizer with a strict plan contract that rejects errors before applying defaults. It writes editable format 10 and reads formats 1–9: 1–6 retain legacy desaturation, 7 retains its ink filter/parameters, and 8 retains K. Explicit fields from older formats are retained. CLI and MCP adapt this API rather than duplicating propagation or HTML construction.

Canvas, decoding, alignment, Workers and frames run in headless Chrome/Edge/Chromium with an isolated temporary profile. Node serves only allowlisted resources and the current job over loopback with a random path. Results return over local HTTP; server, browser and profile are closed on completion, cancellation or failure. The renderer supports an external browser session for visual tests of the same job.

MCP uses dependency-free JSON-RPC over stdio, seven discoverable tools, schema/guide resources, structured results and cancellation. `prepare` decodes/prepares without creating the propagation Worker. It returns the complete base and comparison; `render` adds calculation and presentation. File-root restrictions apply lexically and after resolving links. Structural validation does not guarantee visual interpretation of a request. The AI must inspect base, plan and frames; see [integration](automation.md).

`app/src/base-preview.js` builds a Blob Worker from engine factories without external imports. It retains global L support, revisions and a queue of 192 px blocks, waiting for acknowledgement between blocks to handle cancellation and viewport changes. `PaintBase.region` keeps a 12 px halo; the Worker adds resampling margins and preserves full-image geometry when reducing through OffscreenCanvas. `app/src/image-comparison.js` manages one viewport for both views and the thumbnail. Format 9 adds L/M/N; partial states are never exported or saved.

`highlightFrames` is format 10's canonical list; `highlightFrame` aliases its first element. `app/src/highlight-editor.js` provides selection/transforms without a DOM. `PaintView.highlights` resolves active geometry; rendering uses a common union clipping path, preserving previous drawing for a single rectangle. Transitions interpolate equal-length lists or crossfade masks of different lengths. The codec retains the complete list in each exported field.

## Documentation languages

The English README is the repository entry point; `README.es.md` is its Spanish counterpart. Spanish guides retain their paths, with English counterparts in `docs/en/`. Documentation files do not participate in animation calculation. See [documentation maintenance](documentation.md) for paired updates and language navigation.

## Interface languages

`app/src/i18n.js` exposes a self-contained factory and the `PaintI18n` instance; `app/src/locales/es.js`, `en.js`, `fr.js` and `de.js` load through classic scripts before the editor. Static text uses `data-i18n` attributes; dynamic text uses keys and variables. Metadata/error translation occurs at the UI boundary: engine behavior, JSON fields and user-authored names retain their meaning. No observer translates arbitrary canvas text.

Language changes refresh controls while retaining invalid drafts and selection; they do not invalidate calculation or restart the player/Worker. Preference is browser-local, outside the project. Export embeds only required keys and the translation factory. Automation without an explicit language retains Spanish. See [languages](languages.md).

## Drafts and embedding contract · 0.16.0

`automation/editor.mjs` inlines installed editor assets and escaped project JSON. `app.js` prepares this embedded draft before choosing example/preferences. `review` saves inside the workspace and can request a normal browser window; it does not use the headless rendering server.

`app/src/integration.js` contains the host factory, example and uncompressed ZIP32 download. The shared player adds explicit checkpoints and manual mode. `presentation.js` exposes protocol v1 and validates parent window, origin and channel. The controller coordinates requests, iframe input and sequence steps. This does not access an open editor session. Focused checks are in `tests/integration.test.mjs`.

## Exclusive host input · 0.18.0

`attach` preserves/restores iframe focus and pointer-events attributes, uses inert and negotiates `interaction: host`. The player confirms this mode, hides Restart and disables internal input; disconnect restores direct interaction. `bindInput` delegates click/keyboard once per root, separates action buttons from native controls and replaces repeated bindings. The host retains sequence/slide decisions. `tests/host-input-browser.mjs` checks real hit testing, focus, controls, three animations and four slides from files and HTTP.
