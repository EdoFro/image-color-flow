# Architecture

**English** | [Español](../arquitectura.md)

[Back to the project](../../README.md)

## Organization

The application uses HTML, CSS and classic JavaScript, with no external dependencies or compilation. Scripts load in order from HTML. It uses neither browser modules nor web requests to load example images, preserving direct opening from local files.

| File | Responsibility |
| --- | --- |
| `index.html` | Editor, inspector and image-dialog structure. |
| `assets/styles.css` | Editor styling and responsive layout. |
| `src/app.js` | Project state, editor events, canvas tools, files and coordination with shared calculation/export APIs. |
| `src/project.js` | Shared editable-format and presentation-option normalization. |
| `src/ink-lines.js` | DOM-free K/L extraction: local median, gradual recovery, fine-detail protection and coherent lines in eight directions. |
| `src/base-generation.js` | Pure pixel transformation, presets and generation normalization, without a DOM. |
| `src/presentation.js` | Single standalone-HTML builder, including the final restart control. |
| `src/automation.js` | Complete preparation, Web Worker calculation, report, frames and storyboard without mounting the editor. |
| `automation/` | Node.js API, CLI, stdio MCP server and local-browser renderer. |
| `schemas/animation.schema.json` | Strict image-free plan contract for agents and clients. |
| `src/preparation.js` | Image decoding, paper preparation, configurable base generation and alignment. |
| `src/engine.js` | Parameter normalization and propagation, independent of the DOM. |
| `src/player.js` | Timing, pauses, navigation and stage blending. |
| `src/view.js` | Camera, highlighting and outside treatment. |
| `src/general.js` | Collective-parameter catalog, summary, validation and application to all stages or a group, without a DOM. |
| `src/codec.js` | Timing-map and faint-contribution packing/unpacking. |
| `examples/demo-data.js` | Embedded example images; generated file. |
| `tests/` | Shared synthetic cases and browser pixel checks. |
| `scripts/` | Optional Node.js development utilities. |

## Data flow

1. The editor loads the embedded example or user-selected images.
2. Preparation creates a base and colored reference of equal dimensions. Originals remain in the project.
3. Stages and the initial view use normalized coordinates. Multi-selection retains stage object references so identities survive reordering; General and selection drafts are independent. A confirmed edit invalidates calculated maps.
4. Disabled stages return empty zero-duration fields and are excluded from playback/export. Playback/export calculates stages in a Blob Web Worker. Its code embeds the engine factory rather than relying on a worker file path.
5. The player blends base and final images, accumulating revealed color. The view applies highlighting and camera framing. Transitions interpolate rectangles and blend treatments with premultiplied alpha, preserving transparency.
6. Project saving retains editable data; export embeds prepared images, maps and required functions in one HTML file.

Editor loading order is engine, base generation, project format, preparation, view, player, codec, collective parameters, example images, export, automation and application. Engine, player, view and codec factories must stay self-contained: their functions are embedded in Workers or exported HTML via `toString()`.

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

The first runs cases without a DOM and fails if any case fails. The second only regenerates `examples/demo-data.js` from the two images in `examples/images/`; it does not re-export the project or presentation. Both scripts resolve paths relative to themselves. Run automation tests with `node tests/automation.test.mjs`.

If example images or settings change, save a new project and export the presentation again. Keep results in `examples/ejemplo.colorflow.json` and `examples/presentacion-ejemplo.html`.

A local static server can also be used for development; it is unnecessary for normal use. Performed checks and limits are in [verification](verification.md).

## Optional automation

The Node.js API uses the editor's normalizer with a strict plan contract that rejects errors before applying defaults. It writes editable format 10 and reads formats 1–9: 1–6 retain legacy desaturation, 7 retains its ink filter/parameters, and 8 retains K. Explicit fields from older formats are retained. CLI and MCP adapt this API rather than duplicating propagation or HTML construction.

Canvas, decoding, alignment, Workers and frames run in headless Chrome/Edge/Chromium with an isolated temporary profile. Node serves only allowlisted resources and the current job over loopback with a random path. Results return over local HTTP; server, browser and profile are closed on completion, cancellation or failure. The renderer supports an external browser session for visual tests of the same job.

MCP uses dependency-free JSON-RPC over stdio, seven discoverable tools, schema/guide resources, structured results and cancellation. `prepare` decodes/prepares without creating the propagation Worker. It returns the complete base and comparison; `render` adds calculation and presentation. File-root restrictions apply lexically and after resolving links. Structural validation does not guarantee visual interpretation of a request. The AI must inspect base, plan and frames; see [integration](automation.md).

`src/base-preview.js` builds a Blob Worker from engine factories without external imports. It retains global L support, revisions and a queue of 192 px blocks, waiting for acknowledgement between blocks to handle cancellation and viewport changes. `PaintBase.region` keeps a 12 px halo; the Worker adds resampling margins and preserves full-image geometry when reducing through OffscreenCanvas. `src/image-comparison.js` manages one viewport for both views and the thumbnail. Format 9 adds L/M/N; partial states are never exported or saved.

`highlightFrames` is format 10's canonical list; `highlightFrame` aliases its first element. `src/highlight-editor.js` provides selection/transforms without a DOM. `PaintView.highlights` resolves active geometry; rendering uses a common union clipping path, preserving previous drawing for a single rectangle. Transitions interpolate equal-length lists or crossfade masks of different lengths. The codec retains the complete list in each exported field.

## Documentation languages

The English README is the repository entry point; `README.es.md` is its Spanish counterpart. Spanish guides retain their paths, with English counterparts in `docs/en/`. This documentation delivery changes no runtime behavior. See [documentation maintenance](documentation.md) for paired updates and language navigation.
