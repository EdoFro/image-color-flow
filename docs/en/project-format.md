# Project format

**English** | [Español](../formato-del-proyecto.md)

[Back to the project](../../README.md)

An editable project is a JSON file with the `.colorflow.json` extension. It embeds original images as base64 data and can be moved without separate image files.

The current format is **10**. Its number is independent of the application version: reorganizing folders does not change the format.

## Top-level structure

| Field | Contents |
| --- | --- |
| `format` | Fixed identifier `tinta-y-color`. |
| `version` | Format version: saves `10`; reads formats `1`–`10`. |
| `images.final` | Colored image required for preparation/playback/export; may only be omitted in an empty editor draft. Contains `name` and `data` (image data URL). |
| `images.initial` | Optional initial image, with the same structure. |
| `baseMode` | `uploaded` prepares the initial image; `derived` generates one from the final image. Without an initial image, `derived` is used. |
| `baseGeneration` | Global base-generation method and parameters; only affect `derived`. |
| `resolution` | Working longest side: 720, 1080 or 1440 pixels. |
| `alignment` | Translation `x`, `y`, per-axis scales `sx`, `sy`, and rotation `angle`. |
| `presentation` | Export background: `background` (`hatch`, `color`, `transparent`) and hexadecimal `color`; defaults `hatch` and `#e5e7e3`. |
| `initialView` | Initial camera framing, zoom and highlighting; no emitters. |
| `stages` | Ordered list of 1–64 stages. |

Point, region and rectangle `x`/`y` coordinates are fractions from 0 to 1 of the corresponding image dimensions. Radii and speeds are relative to **width**. Alignment rotation and wind direction are degrees. Times are seconds.

## Image-free drafts and local preferences

Starting with application 0.14.0, the editor can save a format-10 draft with `images: {}` and at least one stage. A lone initial image is not accepted in that state; playback and export are disabled. The editor opens it using `PaintProject.normalize(data, { allowEmpty: true })`. Shared normalization still requires a colored image by default, including API/CLI/MCP; load images in the editor before automating that draft. Earlier editors may reject image-free drafts.

Preferences are not embedded in the project or exported HTML: each project stores the actual values it uses. The separate preferences file contains `format: "tinta-y-color-preferences"`, `version: 1`, `startup`, `resolution`, `baseMode`, `baseGeneration`, `presentation`, `stage` and `point`. Fields and ranges/increments are validated before import. `stage` contains parameters without geometry; `point` only contains enabled state, start mode and delay. There are no images, names, rectangles or language preference.

They are stored locally under `colorflow.preferences`; language keeps its independent key. Preferences do not change engine/API/CLI/MCP defaults or normalization of existing files. `baseMode: "uploaded"` can be retained in an empty draft; existing preparation rules still apply when images are present.

## Stages and emitters

Each stage contains:

- `name`, up to 80 characters; `enabled` (default `true`); and `pauseAfter`, to wait for input at the end.
- `zone`, a polygon with at least three points, or `null` for the full image.
- `points`, up to 64 ordered emitters.
- `path`, a brush path of up to 2000 points, and `pathSpeed`.
- `radius`, `maxRadius`, `speed`, `clarity`, `ink`, `hueResistance`, `fade` and `blackThreshold`.
- `windStrength`, `windAngle` and the view fields below.
- `cameraDuration`, camera/highlight transition time from the previous view; `paintDelay`, initial painting delay from 0 to 60 seconds, default 0; and `hold`, additional hold from 0 to 60 seconds, default 0.

An emitter has `x`, `y` coordinates and these fields:

| Field | Meaning |
| --- | --- |
| `enabled` | If `false`, does not paint or affect dependencies. Default `true`. |
| `startMode` | `with`: together with previous enabled point; `after`: after it finishes; `delay`: delayed from its start. |
| `delay` | Delay in seconds, used with `startMode: "delay"`. |
| `inheritRadii` | Inherits both stage radii unless `false`. |
| `radius`, `maxRadius` | Individual values used when not inheriting. |

The first enabled point starts `paintDelay` seconds after stage start, retaining its configured mode for future reordering. The brush starts with the same `paintDelay` and uses stage radii at each sampled path position.

## Initial and stage views

| Field | Meaning and default |
| --- | --- |
| `frame` | Camera rectangle `{x, y, width, height}`; `null` means full page. |
| `zoom` | Zoom from 0 to 1, default 1. At 0, the full page is shown. |
| `highlightEnabled` | Enables highlighting; default `false`. |
| `highlightLinked` | Uses `frame` as the highlight; default `true`. |
| `highlightFrames` | Canonical list of 0–64 separate rectangles; their union is highlighted when `highlightLinked` is false. |
| `highlightFrame` | Legacy field: opening converts it to a one-element list; saving mirrors the first rectangle or `null`. |
| `outside` | `show`, `blur`, `black`, `white`, `color` or `transparent`; default `blur`. |
| `outsideColor` | Hex color `#RRGGBB`; default `#202c29`. |
| `blur` | Blur 0–40, scaled to working resolution; default 12. |

Without a highlight rectangle, the full page is used. Outside settings only apply when highlighting is enabled.

## Compatibility and validation

Opening normalizes data using `PaintProject.normalize` in `app/src/project.js` and functions in `app/src/engine.js`. The editor limits counts/ranges, validates embedded images and rejects unknown versions. Changing `version` alone cannot convert a future format.

Format-2 files retain points, timing, radii, hue resistance and camera frames. Missing format-3 fields default to a full-page initial view, highlighting disabled, linked rectangles and inherited radii. Missing older fields, including in format 1, receive engine defaults: for example, simultaneous enabled points, zero hue resistance and maximum radius 1.5 times image width.

Format 4 adds holds and export background settings. Earlier projects receive zero hold and hatching. Stages without emitters now play as view-only stages, preserving camera and pause settings.

General is not stored as a stage or set of defaults. It summarizes existing stages/points and applies changes to them. Pending drafts are not serialized.

Format 5 adds stage `enabled`. Earlier projects open with all stages enabled; point activation is independent. Disabled stages are retained completely in the project and omitted from the exported presentation.

Multi-selection and its drafts are editor state and are not serialized. Toolbar visibility is not saved either: every presentation opens with controls hidden.

Format 6 adds `paintDelay`. Earlier projects receive zero and retain their timing. It delays neither camera nor highlighting and adds no time to view-only or disabled stages.

Arrival maps are not stored in the editable project: they are recalculated on playback/export.

Format 7 adds `baseGeneration`. Formats 1–6 receive `method: "grayscale"` to preserve the previous desaturation exactly. Format 8 recommends `method: "coherent"` (K) for new bases. Format-7 projects retain `ink` and their parameters, even without explicit generation settings. `ink` remains available for pigment removal and intermediate grays. Uploaded initial images do not receive this transformation.

| `baseGeneration` field | Range and meaning |
| --- | --- |
| `method` | `protected` (L, default from format 9), `coherent` (K, default in format 8), `ink` (format-7 filter) or `grayscale` (desaturation). |
| `colorToGray` | 0–1: paper to pigment gray; default 0. |
| `sensitivity` | 0–1, default 0.7. Increasing it in K requires higher contrast and rejects weak detail; in ink it detects fainter pigment. |
| `blackPoint` | 0–0.9; 0 in K, 0.14 in ink. Subsequent strengthening of dark grays. |
| `whitePoint` | 0.1–1; 1 in K, 0.94 in ink. Subsequent light-gray adjustment. Must exceed `blackPoint`. |
| `smoothness` | 0–1; 0 in K (no extra finishing blur), 0.08 in ink. Editor displays 0–100%. |
| `inkMatch` | `none` (default), `source-to-base`, `darken` (M), `multiply` (N) or `base-to-final` (legacy literal copy); L/K only. |
| `paper` | `white` (K default) for pure white, or `matched` (ink default) for estimated final-image paper tone. |

In `grayscale`, only paper selection applies; other controls are retained but inactive. Editor presets are configurations of these fields; no separate preset name is saved. PNGs regenerate from originals and these parameters.

`protected` and `coherent` analyze the original at up to 1600 px on its longest side before reducing to `resolution`. Preparation reports include `baseSourceSize` with analysis dimensions; it is `null` for older methods or an uploaded initial image. White paper, thresholds 0/1 and softness 0 preserve K's finish; other controls explicitly alter it.

## Exported presentation

Self-contained HTML is a different output. It embeds prepared images, quantized timing maps, faint contributions and the player. It retains neither editing tools nor all editable project data. Maps are packed in `app/src/codec.js`; keep the JSON to continue editing.

## Automation plans

An automation plan is a small JSON object with project/stage parameters, without images or `format`/`version`. It is validated by [animation.schema.json](../../schemas/animation.schema.json) and may include `baseGeneration`. The API embeds image files and creates a self-contained format-10 project compatible with the editor. A plan and editable project are different artifacts; renaming a plan to `.colorflow.json` is insufficient.

### Optional matching (formats 8 and 9)

Matching runs after L/K (`baseGeneration.inkMatch`, initially `none`):

- `source-to-base`: every non-white base pixel receives original-image RGBA at that position. It may recover color where K detected ink.
- `base-to-final`: those base pixels are copied into the colored animation image, potentially changing final stroke appearance slightly.
- `darken`: per-channel minimum of original and base, on strokes only.
- `multiply`: per-channel product divided by 255 and rounded, on strokes only.
- `none`: keeps generated base and colored image unmatched.

This runs after scaling to animation resolution and applying L/K controls, including soft edges. “Non-white” means darker than generated paper (including gray 254 on white paper); warm paper uses its generated tone. Source-to-base and literal copying make selected pixels equal. M/N composite colors; tone can change during playback. Retained gray pigment also participates. Matching affects only L/K and derived bases. Embedded originals remain intact; each preparation starts from them, so switching/disabling modes does not accumulate changes. Reports include `inkMatchPixels`; `referencia.png` shows the animation's colored copy.

### Format 9 and compatibility

New projects get `method: "protected"` (L). Format 8 receives `coherent` when method is omitted; explicit fields, including `base-to-final`, are retained. Format 7 receives ink; 1–6 receive grayscale. Saving updates the container to 10 without changing older projects' algorithm. `darken` and `multiply` composite after reduction to animation resolution. Warm background is excluded by comparison with generated paper tone; no mode changes the embedded original.

Comparison framing, partial progress and the Worker are transient editor state, not saved in the plan or project.

### Format 10: multiple highlights

`highlightFrames` can appear in each stage and `initialView`. Each element has normalized `x`, `y`, `width`, `height`, with the same minimum .02 and bounds as `frame`. The list takes precedence over legacy `highlightFrame`; saving mirrors the first rectangle into that field. An empty separate-highlight list does not hide the whole image: it uses the full page. The editor disables highlighting when its last rectangle is removed.

`highlightLinked: true` uses only camera framing without deleting the separate list. `highlightEnabled: false` retains settings/list without applying the effect. Rectangle selection and gestures are not saved. Formats 1–9 retain their single rectangle and previous image algorithms.

During `cameraDuration`, equal-length lists interpolate rectangles by index; different lengths crossfade both masks. The union clips a single drawing operation, avoiding alpha buildup in overlaps. Codec, player and standalone HTML retain the complete list.
