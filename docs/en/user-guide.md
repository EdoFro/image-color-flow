# User guide

**English** | [Español](../guia-de-uso.md)

[Back to the project](../../README.md)

The editor supports English, Spanish, French and German. Use the language selector in the header or Images dialog. This guide includes Spanish button labels as references; the English interface uses their translations. Existing screenshots show the Spanish interface. See [language support](languages.md) for preferences and export language.

## Language

The header and Images selectors offer English, Español, Français and Deutsch. The choice is remembered in this browser; first use chooses a supported browser language or Spanish. Switching preserves the project, selection, pending edits, zoom and playback, without recalculating maps or regenerating the base. User-authored names remain unchanged.

Export lets you independently choose the presentation language, initially the editor language. It is embedded in the HTML without external resources, rather than saved as an animation parameter. See [languages](languages.md).

Headings, tools and dialogs wrap when space is limited. If a selected value does not fit inside its selector, the full text appears below it and in its hover tooltip. Tools keep their labels in narrow windows. Small or short windows allow scrolling to reach the remaining controls. The exported HTML toolbar also scrolls if it exceeds the available height; showing or hiding it preserves the artwork size.

## Project name, destination and saving

The **Project name** field above the canvas is stored in the editable file and suggests its filename. You can choose a different filename when saving.

An agent's draft may display a **Suggested location (not confirmed)**. Copy the path using its button, or select it and press Ctrl+C. This is guidance: the editor does not claim to have saved there. The path grants no file permissions and is not included in the portable project.

- **Save**: choose and authorize a file on the first save; subsequent writes in that session update that file.
- **Save as…**: choose another file, with a name suggested from the project name.
- Unsupported browsers or contexts download a named JSON instead. Check where the browser saved it; it may use Downloads.
- Canceling the picker or failing to write retains unsaved changes. Opening another project, New project or reloading the example releases the previous session's file target.

Keep the agent's draft and your working copy under separate names. Reloading its editor HTML restores the original draft: save and reopen your JSON to continue your corrections.

## Undo and redo

Use **Undo / Ctrl+Z** and **Redo / Ctrl+Y**; Ctrl+Shift+Z and Command are also supported. Text fields retain native browser undo. The buttons operate on the project after completing the field edit.

History covers points, radii, brushes, zones, framing, highlights, stages, parameters, confirmed batch edits, project name and applied image changes. Each drag or series of adjustments to one control is a single step. Selection and playback create no steps. A new edit after undo discards the redo branch.

Up to 80 steps are kept during the session, sharing image sources without duplicating them per adjustment. Opening another project, New project or loading the example resets history. Saving retains history; returning to the saved state clears the unsaved-change warning. History is not serialized and does not change preferences. Finish/cancel drawings and apply/discard pending dialog or General edits before using it.


## Start with an empty sheet

In **Images → Initial image**, choose **Blank sheet, no drawing**. Under **Initial image paper**, select **Pure white** or **Match the final image’s paper tone**. The comparison is generated automatically and keeps its zoom when you change the paper. Download the sheet as a PNG or select **Apply and return to canvas**.

The sheet is uniform, opaque and contains no drawing lines, shadows or colors. Matching estimates the tone from the brightest areas without reproducing their texture. Ink extraction, gray adjustments, ink matching and alignment do not apply in this mode. The colored image retains its colors. Animation reveals both drawing and color.

No initial image file is required. The choice is saved with the project, retained when reopened and can be undone/redone after applying. Preferences also lets you select this mode and paper for new projects. The introductory example retains its own settings.

## Canvas zoom and panning

Above the image, the toolbar shows the current percentage and **100%**, **200%**, **Fit width**, **Fit height** and **Fit image** buttons. Fit image is the initial mode. At 100%, each prepared image pixel occupies one browser display pixel, using the working resolution.

With the pointer inside the image panel, the wheel zooms around that point. Manual zoom ranges from 5% to 800%. Ctrl+wheel retains the browser's behavior. Select **Hand** and drag to pan, or drag with the middle mouse button without changing tools. Selecting a drawing tool turns Hand off.

Switching stages or adjusting parameters retains the editor view. Fit modes adapt to panel resizing; manual zoom retains its percentage and visible center. Opening another project, New project or loading the example returns to Fit image. Navigation does not modify animation framing, is not exported or serialized, and creates no Undo steps. Image and guides continue sharing the same editing coordinates at any zoom.

## Duplicate and delete on each stage

Every stage card has **Duplicate** (two-sheet icon) and **Delete** buttons. Duplicate inserts a copy immediately after that stage and selects it, retaining points, radii, timing, zone, brush and views. Card buttons affect only their own stage, even with a multi-selection. The lower buttons remain available for the selected stage.

Both card and lower Delete buttons use two-phase confirmation: the first click turns the button red and displays **Delete?**; a second click on the same button within two seconds removes the stage. Timeout, Escape, clicking elsewhere, moving focus or leaving the window cancels. Only one button can be armed. The first click changes neither the project nor its history.

Duplicate and delete can be undone with Ctrl+Z. The last stage cannot be deleted, and projects cannot exceed 64 stages. Finish/cancel drawings and apply/discard pending settings before these actions.

## Open the editor

Open [app/index.html](../../app/index.html) in Chrome or Edge. Copy the complete `app/` folder or extract the editor ZIP; see the [two distributions](distribution.md). The example is embedded in `app/demo/demo-data.js` so loading it does not require web requests for local images.

1. In **Imágenes** (Images), load the colored image and, optionally, an initial image.
2. Choose whether to neutralize the uploaded initial image's paper or generate an ink-on-paper base from the final image. Generate a preview and adjust the transformation before applying it. With two images, automatically align their contours and refine position, per-axis scale and rotation using an overlay reference.
3. Create stages and reorder them using the list arrows. To rename a stage, double-click its name, use the pencil, or edit the inspector field. Enter saves and Escape cancels.
4. Define each region using a rectangle or polygon. Close a polygon with **Enter** or a double-click; **Escape** cancels unfinished vertices.
5. With **Puntos** (Points), click to add and drag to move. Double-clicking a point deletes it; the inspector also provides deletion.
6. In the point list, use ↑/↓ to reorder and the checkbox to enable or disable points. Choose their start mode and delay. After calculation, their start and end times are shown.
7. Optionally, drag with **Recorrido** (Brush path). The brush follows the path and leaves propagation behind it. Points and a path can coexist; disable points if only the brush should paint.
8. Adjust speeds, both radii, hue resistance and wind. Play to calculate and view the animation. A stage can wait for a click or key before continuing.
9. Select **Inicio** (Initial view) to configure what the audience sees before playback. In each stage, **Encuadre** defines camera framing and the zoom control adjusts magnification. **Habilitar destacado** enables treatment outside the camera rectangle or independent highlight rectangles.
10. Download the editable **project** and use **Exportar HTML** to present it.

In **Editar** (Edit), the canvas displays the final image with guides on top. **Imagen inicial** (Initial image) shows the prepared base. Playback starts from that base.

## New project and preferences

The editor loads its introductory example on opening. In **Preferences → On opening the editor**, choose **Load example** (factory setting) or **Empty project**. Saving this choice affects the next opening while retaining your current work.

**New project**, in the header, always creates a project without images, with an initial view and one empty stage. It clears points, paths, regions, rectangles, selection, playback and previous calculations. It uses saved defaults and keeps your language. Click **Load images** on the canvas to continue. You can adjust parameters, add stages and save/reopen the draft before loading images; playback and export require a colored image.

If there are unsaved changes, **New project**, **Open project** and **Reload example** show a warning. **Cancel** or Escape retain the project. **Download current project** requests its download and keeps the dialog open; check that you have the file, then click **Continue**. **Discard changes and continue** replaces it without downloading. An incompatible file or image-preparation failure retains the previous project. Closing or reloading the tab uses the browser's own warning.

Pending General/selection settings and unfinished drawings are protected too. Apply or discard those settings and finish or cancel the drawing before downloading. Saving shows an explanation if anything remains unresolved. Image changes become part of the project with **Apply and return to canvas**; closing that dialog discards its draft.

In **Preferences**, customize:

- Resolution, base source, algorithm, pigment, thresholds, softness, paper and ink matching.
- Propagation, both radii, wind, brush, timing and pauses for new stages.
- Enabled state, start mode and delay for new points; their radii inherit from their stage.
- Zoom, highlighting and outside treatment, without storing actual rectangles. A new initial view uses these camera/highlight values.
- Background and color for new presentations.

**Save preferences** confirms the draft. **Cancel** or × discard it; **Restore factory defaults** only prepares a change and requires saving. Defaults affect new projects and stages, without recalculating or changing existing content. Duplicating a stage retains its configuration. Use General or normal controls to change the current project. The introductory example retains its original configuration.

**Export preferences** downloads the valid draft as `tinta-y-color.preferences.json`. **Import preferences** loads it for review and requires **Save preferences** to use it. It contains no images or geometry and does not change your language. Values are kept in this browser; exporting lets you move them to another browser or computer. If storage is blocked, the app explains that the values apply only to the current session. Damaged or incompatible saved preferences fall back to factory defaults on opening.

## Generate the initial image

In **Imágenes**, choose **Generar imagen inicial desde la imagen final** (Generate initial image from the final image), then **Generar vista previa** (Generate preview). The reference and proposed base appear side by side. Once generated, changing controls updates the comparison automatically. **Ampliación** (Zoom) and the fit/−/+ buttons affect both views. Dragging either view pans both; its wheel zooms both. Click the thumbnail to center the views or drag its viewport rectangle. Regeneration preserves the view.

Five starting presets are available. **Tinta y líneas (L)** is recommended and adds protection for connected dark areas. **Tinta y líneas (K)** preserves the previous method, with robust background estimation, fine-detail protection and line recovery. **Tinta sobre papel** (Ink on paper) removes detectable pigments; **Tinta y grises suaves** (Ink and soft grays) retains some pigment gray; **Desaturación anterior** (Legacy desaturation) preserves shadows as the old method did. Changing controls shows **Personalizado** (Custom). New projects use L; format 8 keeps K even without an explicit method. Format 7 keeps its ink filter; formats 1–6 keep desaturation. To use L in an existing project, select it under the starting preset and inspect the new base before applying.

| Control (Spanish UI label) | Behavior |
| --- | --- |
| Colored areas: paper ↔ gray (**Zonas coloreadas: papel ↔ gris**) | 0% takes detected pigment to paper; 100% retains its gray. |
| Color sensitivity (**Sensibilidad al color**) | In K, increase it to reject weak pigment/texture contrast, potentially losing strokes. In Ink on paper, it detects fainter pigments. |
| Dark grays to black (**Llevar grises oscuros a negro**) | Brightness below which grays are strengthened to black. 0% preserves dark grays. |
| Light grays to paper (**Llevar grises claros al papel**) | Brightness above which grays are lightened to paper. 100% preserves light grays. |
| Transformation softness (**Suavidad de la transformación**) | 0–100%. K starts at 0% and adds finishing smoothing that may reduce sharpness. The older filter starts at 8% and broadens transitions between pigment, gray and paper. |
| Paper (**Papel**) | Estimated final-image paper tone or pure white. |

K removes fills, retains solid blacks and recovers detail from local context and stroke continuity. The older filter retains intermediate grays by default. Brightness and channel differences help avoid automatically treating dark blue as black ink. Detection is approximate: nearly neutral or very dark pigments may need adjustment. Ink controls do not affect legacy desaturation; paper selection still applies.

**Aplicar y volver al lienzo** (Apply and return to canvas) saves the method and parameters. If no comparison has been generated, the first click generates it and keeps the dialog open for review. Closing with × or Escape discards pending changes. **Descargar imagen inicial PNG** (Download initial image PNG) saves the complete reviewed base, without camera framing or highlights. These transformation controls do not affect an uploaded initial image.

K analyzes the original at up to 1600 px on its longest side, then reduces the base to the selected animation resolution. Choosing 720 px therefore does not reduce the detail available to detection beforehand. Preview status shows both dimensions. Large images may take several seconds.

![Final image and generated base comparison, with softness up to 100%; interface in Spanish](../images/vista-base.png)

## Enable and select stages

Each left-column stage checkbox controls playback participation. Disabling a stage retains its complete editable configuration, but skips its paint, camera, highlight, transition, hold and pause. Camera and accumulated color pass between enabled stages. If none are enabled, the initial view remains visible.

- **Normal click** on a name selects one stage.
- **Ctrl + click** adds or removes a stage from the group. At least one stage remains selected.
- The enable checkbox does not change the selection. Disabled stages can be selected too.
- General and Inicio are selected individually.

With several stages selected, the inspector uses the same controls and review process as General, but limits its summary and application to the group. Confirmation states how many stages and points will change. Radii inheritance is restored only for points in those stages. Inicio is not included in multi-selection.

The canvas uses the most recently selected stage still in the group as reference. Drawing tools, stage names and geometry are edited with a single stage selected. The group survives reordering and image preparation.

Group and General drafts are independent. Changing group membership or switching to Inicio or General discards the group draft; General drafts remain while navigating. No pending change is saved without confirmation.

![Two selected stages, including a disabled one; interface in Spanish](../images/vista-seleccion.png)

## General

**General** appears before Inicio and is not part of playback. It collects propagation, radii, wind, brush, point, camera, highlight and timing parameters. Names and geometry remain individual edits.

- **Black / uniform value**: all targets use the same value.
- **Purple / multiple values**: targets differ. Numeric controls show their range rather than assuming a midpoint.
- Radii include point-specific values, including disabled points.

Change controls and press **Aplicar cambios…** (Apply changes). The review lists new values and affected stage/point counts. **Confirmar y aplicar** confirms; **Volver sin aplicar** returns while keeping the draft; **Descartar pendientes** discards it. Stage navigation preserves General drafts, but opening another project or reloading the example discards them. Out-of-range values block application.

Only chosen parameters change. Applying either radius makes all affected points inherit **both** radii from their stage; the review warns that individual values for the other radius are replaced too. Camera and highlight changes can include Inicio via **Incluir Inicio**; by default they affect stages only. Point activation, start mode and delay affect all existing target points while retaining order and positions.

Pending changes are neither saved nor exported: confirm them first. General summarizes current project data rather than storing a separate global configuration.

![General panel showing uniform and mixed values; interface in Spanish](../images/vista-general.png)

## View-only stages and holds

A stage may have no points or path, or all its points disabled. It then retains accumulated painting and changes only the view. New stages start without emitters, ready for view setup or adding points.

**Transición de cámara y destacado** (Camera and highlight transition) controls framing movement and gradual outside-treatment changes. **Permanencia adicional** (Additional hold), initially 0 seconds, adds an automatic wait after both painting and transition finish. A stage lasts until the later of painting completion (including its initial delay) and transition completion, plus the hold.

Waiting for a click or key also works in intermediate view-only stages. A zero-duration stage executes instantly and can stop the sequence when configured with an intermediate pause.

## Separate framing from painting

**Desfase inicial de pintura** (Initial painting delay) is set per stage, from 0 to 60 seconds, default 0. It is measured from stage start and delays the first enabled point and the entire brush path; camera and highlighting begin immediately. Other points retain dependencies on the previous enabled point. If the first point is disabled, the next enabled point uses the same stage delay.

For example, a 0.8 s transition and 1.2 s delay let the camera settle for 0.4 s before painting. A shorter delay overlaps camera movement with painting. General and multi-selection can review and apply delays to several stages using the usual confirmation.

The delay adds no time to a view-only stage with no emitters or a disabled stage. Additional hold still begins after painting and transition have finished.

![Initial delay and camera transition; interface in Spanish](../images/vista-desfase.png)

## Point order and timing

- **Junto al anterior activo**: start together with the previous enabled point.
- **Al terminar el anterior activo**: wait for its own expansion to finish, including final pixels and their transition.
- **Con demora desde el anterior activo**: start X seconds after the previous enabled point starts; they can paint concurrently.
- The **first enabled point starts after the stage's initial painting delay** (0 s by default). Its configured mode and delay are retained for a future order with a preceding enabled point.
- Reordering changes canvas numbering. Each point retains coordinates, activation, mode and delay; dependencies are recalculated.
- Disabled points are dimmed, emit no color and do not affect timing. If point 2 is disabled, point 3 depends on point 1.
- A point's own duration is not shortened by overlap with another emitter. Stages with no enabled points or path play as view-only stages, including their pause.
- The brush path begins after the same initial painting delay, independently of the point sequence.

## Camera framing

**Inicio** is the pre-stage view: it shows the prepared base and waits for Play, a click on the image or Space. It does not paint or count as a stage. Restart returns to it.

Each stage has its own framing and zoom. At 0%, the full page is shown; at 100%, the camera fits the rectangle while preserving proportions. It moves smoothly from the previous view during painting and stays in position during pauses. Highlight rectangles and outside treatment also change gradually during that transition, including transparency. Framing does not change regions or propagation coordinates.

**Habilitar destacado** (Enable highlighting) is initially unchecked. When enabled, the outside can remain normal, blur, turn black, white, a custom color or transparent. Blur strength is adjustable. **Usar el mismo rectángulo para enfoque y destacado** (Use the same rectangle for camera and highlight) starts checked. Uncheck it to draw independent highlights. This can highlight a panel without zooming into it. Treatment is applied before camera cropping.

Transparency uses real alpha: the editor shows a checkerboard; the presentation reveals the page behind it. The presentation document background also becomes transparent while this mode is active; the control bar retains its background.

## Adjust radii with the mouse

In **Puntos**, select an origin on the canvas or use **Editar radios** (Edit radii) in the list. The ink radius is dashed orange; the maximum radius is solid blue, both with light and dark halos. Only the selected point's radii appear by default; **Mostrar todos los radios** (Show all radii) compares all of them.

Drag the **T** or **M** handle to change a radius. A point initially inherits stage values; dragging gives it individual values. Check **Usar radios de la etapa** (Use stage radii) to restore inheritance. Both sliders are also available in the inspector. With wind, handles adjust the base radius and preserve deformation. The brush uses both stage radii at every path position.

## Present offline

When using **Exportar HTML**, choose **Achurado diagonal** (Diagonal hatching, default), **Color liso** (Solid color) or **Transparente** (Transparent) for the background. Hatching is generated using CSS inside the file and stays fixed behind the artwork. The canvas has no border or shadow; transparent regions reveal that background or the containing page. Confirming export saves background settings in the project.

Export produces **one HTML file**, embedding the prepared base, final image, timing maps and player. It needs no editor folder, server, installation or connection. Open it in a browser and click the image or press Space to start.

The bottom toolbar starts hidden. A small logo remains at the bottom right; click it or press **H** to show/hide controls. The toolbar stays visible until manually hidden and overlays the artwork without resizing the canvas. Playback shortcuts work while controls are hidden.

- **Space**: play, pause or resume after a pause.
- **← / →**: change stage.
- **Click the image**: same as Right Arrow. From Inicio it starts; afterward it advances. From an intermediate stage pause it resumes playing; from a manual pause it advances while remaining paused. In the last stage it shows the final view and stops. Further clicks do not restart. Space pauses/resumes; the final button or controls restart.
- **F** or the fullscreen button: fullscreen. Browser F11 is an alternative.
- The timeline seeks through the sequence; displayed time excludes manual pauses.
- Switching browser tabs pauses playback.

At the end, **↻ Reiniciar** (Restart) appears at the top right of the canvas when the mouse is over the image. A solid dark background, white text and double border distinguish it from artwork. Clicking returns to **Inicio**, showing the base without autoplay; the next image click starts again. **Tab** focuses the button and **Enter** activates it. On devices without hover, it remains visible at the end.

![End-of-animation restart button; interface in Spanish](../images/vista-reinicio.png)

To integrate it into another web presentation, keep the exported HTML alongside it and link to it or embed it in an `iframe`. If the container restricts scripts or uses `sandbox`, scripts must be allowed; add `allowfullscreen` when needed.

Save a `.colorflow.json` project to continue editing: it includes original images, regions, point order/activation/start modes, paths, alignment, framing and parameters. Presentation HTML is a final output, not a replacement for the editable project. Downloads go to the folder selected by your browser.

Projects are saved in format 12; formats 1–11 can also be opened. Existing fields are retained and missing fields receive defaults. See [project format](project-format.md) for compatibility details.

## Scope and limitations

- Browser-decodable raster PNG, JPEG, WebP, GIF, BMP and AVIF. Animated formats are used as a static image.
- Working resolution: 720, 1080 or 1440 pixels on the longest side; originals remain in the project. Up to 64 stages, 64 points per stage and one path per stage.
- Alignment adjusts translation, per-axis scale and rotation; it does not repair redraws or local distortions. A base derived from the final image matches its geometry exactly.
- Base generation approximately separates pigment from neutral tones using global settings. It cannot reliably reconstruct the original drawing and offers no local correction tools. Legacy desaturation remains available.
- Open ink lines can leak color: define a region for a guaranteed boundary. The black threshold adapts the engine to gray ink or photos.
- This is a drawing-guided reveal, not a physical watercolor simulation. Hue changes add delay; there is no hard hue barrier or automatic brush-following camera.
- Brush strokes are sampled by arc length. Many emitters, long paths and high resolutions take more computation and can produce larger exports.
- Audio, video export and batch processing are not included.

### Match ink between base and colored image

Ink matching runs after L/K (`baseGeneration.inkMatch`, initially `none`):

- `source-to-base`: every non-white base pixel receives original-image RGBA at the same position. It may restore color where K detected ink.
- `darken` (M): per-channel minimum composition, avoiding lightening the original.
- `multiply` (N): multiplies RGB channels divided by 255; usually darker.
- `base-to-final`: legacy literal copy; only shown when the project already uses it.
- `none`: keeps base and colored image without matching.

It runs after scaling to animation resolution and applying L/K controls, including soft edges. “Non-white” means darker than generated paper (gray 254 counts on white paper); warm paper is compared against its generated tone. Original recovery and literal copying make pixels exactly equal. M/N composite colors and may change intensity during transitions; they do not guarantee stationary ink. Gray pigment retained in the base is also included. Matching affects only L/K and derived bases. Embedded originals remain intact; each preparation starts from them, so switching modes does not accumulate changes. Reports include `inkMatchPixels`; `referencia.png` shows the colored animation copy.

### Comparison status and recalculation

The light next to Preview is off before generation. Pulsing yellow means the detail is pending and some areas may still show older settings. Pulsing green means the visible area is up to date while the rest continues; solid green confirms the full image. Red indicates an error, with an explanation and retry. States also include text, hover descriptions and reduced-motion support.

Calculation runs in a local Worker. Blocks of 192 px intersecting the viewport are prioritized, then their nearest neighbors. Panning changes priorities. Each block has a 12 px filter margin plus a reduction margin; L's connected support and paper tone are computed globally. Older results are discarded when parameters change; closing the dialog terminates the Worker. Apply and Download PNG are enabled only for the latest complete image. Apply reuses that preparation.

L may retain very dark pigments resembling ink; inspect the base. Originals are unchanged. Current Chrome/Edge provide Blob Workers and OffscreenCanvas; preview uses no networks or external services.

### Multiple highlight rectangles

In a stage or Inicio, enable highlighting and uncheck **Usar el mismo rectángulo para enfoque y destacado**. Click **Definir destacado por separado** (Define separate highlight):

- Drag in an empty area to replace the list with one rectangle.
- Hold Ctrl while dragging to add, even inside another rectangle.
- Click a rectangle or its **Destacado 1, 2…** list item to select it. Drag inside to move, or use the eight handles to resize.
- Delete removes the selected rectangle while the canvas has focus; × in the list also removes it. Removing the last disables highlighting. Escape or pointer cancellation discards the gesture.

Inside any rectangle the original is retained. The common outside receives Show, Blur, Black, White, Color or Transparent treatment; overlaps are drawn once. All rectangles share stage settings. Relinking to camera framing preserves the separate list for later unlinking. Highlight changes do not change camera framing. Ctrl stage selection in the left column works as before.

Up to 64 rectangles are allowed. A separate configuration with none shows the full page. During transitions, equal-length lists interpolate rectangles by number; different-length lists crossfade the two complete masks. Camera transition continues independently.

## Assistant drafts and embedded exports

An assistant can deliver `edit.html` with its draft already loaded. Edit and save the project JSON; reloading that HTML restores the original draft. **Export HTML → Animation use → Embed in another presentation** downloads the animation, controller and example in one ZIP. Unzip before testing. The presentation agent connects the sequence without taking over your editing. See [drafts and embedding](embedding.md).

With 0.18.0 embedding, playback and Restart controls belong to the host. Artwork/margin clicks reach the host, and Tab skips animation frames. Opened alone, the HTML retains its gestures and ordinary restart. Update the controller, re-export older HTML and bind host input once; see the [embedding guide](embedding.md).
