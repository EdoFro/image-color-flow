# Guide for assistants using Tinta y color

**English** | [Español](../para-ia.md)

[Back to the project](../../README.md)

Goal: turn a colored image and the user's request into an editable project and a self-contained animation HTML. You need vision capabilities to interpret the image. The engine reveals existing colors; it does not color a monochrome photo or create new drawings.

1. Inspect the image with `colorflow_read_image`. If a project already exists, use `colorflow_inspect` before modifying it. Do not put base64 image data in the plan text.
2. Build an explicit plan from the request: ordered stages, points, regions, paths, camera framing, highlighting, pauses and parameters. Use names that explain the sequence. Start at resolution 720 for a first trial.
3. Create the project with `colorflow_create`. Supply an initial image if one exists; otherwise, ink on paper is generated according to `baseGeneration`. Run `colorflow_prepare` and inspect `base.png` using `colorflow_read_image`. Use `baseGeneration.method: "protected"` (L, the default for new projects). Check lettering, stripes, clothing patterns, textures and watercolor washes; adjust controls before calculating the animation. Do not replace the base with a redraw to repair lost strokes. Do not promise perfect ink extraction.
4. Validate, fix the reported fields and render to a new directory. Duration is calculated from the image, speeds and emitters; it excludes manual pauses. If a duration is requested, check the report and adjust speeds or holds. Preparing the base does not calculate duration or produce HTML.
5. Inspect `plan.png` and `storyboard.png` with `colorflow_read_image`. Check selected regions, starting points, ordering and framing. Individual frames provide more detail. Successful validation does not prove that the AI selected the requested object.
6. If needed, use `colorflow_update` and render again. Always deliver `presentacion.html` and `proyecto.colorflow.json`, explaining pauses and observed limitations.

## Empty initial sheet

To start from an empty sheet, use `"baseMode": "blank"` with `"baseGeneration": { "paper": "white" }` (pure white), `{ "paper": "matched" }` (a uniform estimated paper tone), or `{ "paper": "transparent" }` (zero alpha). Only the colored image is required. Extraction, ink matching, gray adjustments and alignment are bypassed without modifying the colored image. This works with create/update/prepare/render/review in API, CLI and MCP, and with editor previews. Projects use format 13; formats 1–12 remain readable. Transparency fades in through opacity and does not remove paper from the final image. To see a containing page behind it, also use `presentation.background: "transparent"`; the editor checkerboard is not exported.


## Named draft and suggested destination

Use `plan.name` when creating a project. Keep the original, e.g. `windsurf-draft.colorflow.json`. `review` accepts optional `name` and `saveAs`, a `.colorflow.json` file path inside the authorized root. The suggested destination is not created or written and grants no browser permission. The result includes `name` and `saveSuggestion` with `fileName`, `directory` and `path`.

```sh
node automation/cli.mjs review --project windsurf-draft.colorflow.json --out windsurf-edit.html --name "Windsurf history" --save-as animations/windsurf.colorflow.json --open
```

MCP: `colorflow_review` accepts the same `name` and `saveAs` fields. Without `saveAs`, it proposes a project-derived filename beside the draft and avoids matching the source file. A name passed to review is embedded in the editor without changing the source project. The editor supports Save, Save as and Undo/Redo; JSON files use format 13 (also reads 1–12). History exists only in the editor and is not exposed through MCP. Read user-corrected files before making changes. This remains file exchange, not a live session connection.


## Units and behavior

- x/y: fractions from 0 to 1 of the final image's width and height. The origin is at the top left; y increases downward. Preparation preserves geometry and only changes resolution. Rectangles must be inside the image and at least 0.02 wide and high.
- Radii and speeds: fractions of image **width**, not height or pixels. Durations are in seconds; wind uses degrees: 0 points right, 90 down.
- The ink radius determines how far color can cross black. The maximum radius always limits propagation and fades color from 80% to 100%. Wind deforms both radii. Regions are mandatory boundaries.
- `points: []` and `path: []` create a view-only stage. Omitting `points` inserts a central point. Supply an empty list explicitly when only the camera or highlighting should change.
- The first enabled point and brush start after `paintDelay`; camera and highlighting start at the beginning of the stage. Subsequent points depend on the previous enabled point via `with`, `after` or `delay`. `pauseAfter` waits for audience input; `hold` adds an automatic hold.
- Each stage defines its complete view. Repeat `frame` and its settings to retain a framing across stages. An omitted frame uses the full page. `initialView` configures the initial view without painting.
- `highlightEnabled` defaults to false. To make the outside transparent, enable it and define the highlight rectangle (linked to `frame` by default) with `outside: "transparent"`.
- `baseGeneration` is global: it configures extraction in `derived`; only `paper` applies in `blank`. `paper: "transparent"` only creates transparency in `blank`; other modes interpret it as `matched`. `method: "coherent"` selects K; `ink` retains the older pigment-removal filter. `colorToGray: 0` takes detected pigment to paper; `1` retains its gray. `sensitivity` controls detection, `blackPoint`/`whitePoint` control grays, and `smoothness` runs from 0 to 1 (0–100% in the editor). Formats 1–6 get `method: "grayscale"` when opened, preserving their appearance: explicitly choose `protected` for L or `coherent` for K. Format 7 retains ink and its parameters. K uses white paper, sensitivity .7, blackPoint 0, whitePoint 1 and smoothness 0; it was tested with Calvin and watercolor. Higher sensitivity requires more contrast; smoothness adds optional finishing blur that may reduce sharpness. These methods are approximate and cannot guarantee separation of ink from dark pigment.
- `base.png` has no camera or highlighting; `inicio.png` represents the initial view and can be cropped or transparent outside highlights. Inspect the complete base before attributing a defect to framing. `prepare` also outputs `referencia.png`, `comparacion.png`, the report and updated project.
- Update patches preserve omitted fields; included objects and arrays replace the entire field. `stageIndex` is zero-based. Numbers in `plan.png` are one-based: stage.point.

See the plan schema for all limits. Unknown or out-of-range fields are rejected. A point outside its region does not paint; calculation may fail when all emitters lie outside. Do not ignore report warnings.

All paths belong to the configured root. The user must make files available there; a remote attachment does not imply that it exists locally. Avoid overwriting sources and use new directories for revisions. MCP connects locally over stdio; the final HTML needs neither Node.js nor MCP to present.

To recover original color in the base, use `baseGeneration.inkMatch: "source-to-base"`. To composite the base with the colored copy, use `"darken"` (M) or `"multiply"` (N). The default is `"none"`. They run after L/K and reduction to animation resolution; always inspect `base.png` and `referencia.png`. Embedded originals remain unchanged.

L adds dark-area protection to K. `protected` selects the recommended L; `coherent` preserves K and format-8 behavior. `base-to-final` is the legacy literal copy: it may produce light halos and remains for compatibility. M/N do not lighten the original but can darken or shift tones; they do not guarantee stationary ink during transitions. Originals are never overwritten.

To highlight multiple places simultaneously, set `highlightFrames` in a stage or `initialView`, with `highlightEnabled: true` and `highlightLinked: false`. `outside` applies outside their union; do not use a bounding rectangle that exposes the space between them. `frame` independently defines camera framing. Coordinates are 0–1, minimum size .02, up to 64 rectangles inside the image. A patch replaces the complete list; inspect `plan.png` and `storyboard.png`. The legacy `highlightFrame` remains valid.

## Draft review before finishing

Use **idea → editable draft → user review → delivery**. After agreeing on the idea, create a few stages at reduced resolution and call `colorflow_review` with `project`, `output: "edit.html"`, `open: true`. If opening fails, provide its file/URL. This step does not calculate propagation and does not require the complete playback HTML or preview gallery. The user continues editing; saving selects a local file or downloads JSON depending on the browser, while reloading the HTML restores its original draft. This is not a live session. Keep structural validation and originals. Reserve the complete render/review workflow above for delivery.

For presentation embedding, use `presentation.mode: "integrated"` or the editor's integrated ZIP. Keep the HTML, controller and example together. Since 0.18.0 use `TintaColorHost.attach` per image and one `bindInput({onAction})` call per presentation. The host routes input to its active sequence (`createSequence` optional) or its own navigation. Replace old handlers; do not add per-resource listeners/onclick or HTML patches. attach disables iframe pointer/focus and negotiates hiding every internal control, including Restart. Buttons with `data-tinta-color-action` run only their action; native fields/links remain native, and custom controls use `data-tinta-color-ignore`. Each enabled stage is a moment. Since 0.17.0, right arrow and click use `advance`: while painting, complete the current stage and start the next; in the last stage, show the end and wait for another input before continuing the presentation. `advanceWhenIdle()` / command `advance-wait` retains the discard-while-painting alternative; explicit `skip` only completes the current moment. When updating, re-export animation HTML and replace the controller; remove any host guard that discarded advancement while painting. Back, restart and finish remain available through the API. The host owns restart controls; `sequence.activeAnimation` supports availability. Internal hover restart remains only when opened independently. Check artwork/margin clicks, Tab excluding frames, buttons without extra advances, ordinary slides, back and offline use. See [the contract](embedding.md). Validate real presentation integration separately.
