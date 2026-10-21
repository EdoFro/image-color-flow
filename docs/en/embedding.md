# Drafts and presentation embedding

**English** | [Español](../integracion.md)

[Back to the project](../../README.md)

Available since 0.16.0; default advancement updated in 0.17.0 and exclusive host input added in 0.18.0. This workflow does not connect the assistant to a live editor session: the user finishes editing and hands the export to the presentation author.

## A. Open an editable draft

After agreeing on the idea, create a simple project with `colorflow_create` and call `colorflow_review` with:

```json
{"project":"draft.colorflow.json","output":"edit.html","open":true}
```

This creates a self-contained HTML with the installed editor and the project loaded. It needs no server and does not compute propagation. Paths remain restricted to the authorized root. `open` requests a normal local browser window; if launching fails, the file remains available and the response includes `editorUrl` and `openError`. `opened:true` means the process launched, not that the window was visually verified. Some clients need to restart their MCP connection to discover the eighth tool.

```sh
node automation/cli.mjs review --project draft.colorflow.json --out edit.html --open
```

Without `--open`, the CLI only creates the file. The API equivalent is `api.review({project, output, open: true})`. Generation does not require headless Chrome; automatic opening requires finding a supported browser. The HTML can be opened manually.

Edit points, radii and timing, then **Save project** to download the updated JSON. Reloading `edit.html` restores its embedded draft, not later edits: keep the JSON to preserve your work. Edits do not return to the assistant automatically.

## B. Export for embedding

Choose **Export HTML → Animation use → Embed in another presentation**. The downloaded `animacion-integrada.zip` contains:

- `animacion.html`: self-contained animation with manual stage control.
- `tinta-color-host.js`: reusable host controller.
- `ejemplo.html`: four slides, three animations and an intermediate explanation.
- `LEEME.txt`: Spanish/English quick instructions.

Unzip everything before opening the example. Give the folder to the presentation agent; do not patch the animation HTML. API/CLI/MCP plans use `presentation: {mode: "integrated"}`. `render` produces `presentacion.html` and these helpers alongside existing reports/previews. Patch objects replace the complete object: preserve any background/color settings you need.

Embedded mode waits after every enabled stage regardless of `pauseAfter`, preserving authored timing and geometry. Opened directly, the same HTML retains click, keyboard and final hover restart without autoplay. Standalone exports also retain their ordinary controls.

## One input owner for the whole presentation

Since 0.18.0, **`attach` connects each animation as a visual surface owned by the host**. It disables iframe pointer input and focus, then negotiates `interaction: "host"` so the player hides all internal controls, including Restart. Clicks on artwork and margins reach the host document. The host chooses the active animation/slide; gestures are not forwarded from inside the iframe.

```html
<iframe id="image" src="animacion.html" title="Illustration" allowfullscreen></iframe>
<button type="button" data-tinta-color-action="back">Back</button>
<button type="button" data-tinta-color-action="restart">Restart image</button>
<script src="tinta-color-host.js"></script>
<script>
const image = TintaColorHost.attach(document.getElementById('image'));
const sequence = TintaColorHost.createSequence([
  image,
  { run: () => showNextElement(), undo: () => hideElement() }
]);
const input = TintaColorHost.bindInput({
  onAction: action => sequence.input(action)
});
</script>
```

Replace show/hide with your presentation's functions. The runnable example has an introduction, two animations with an intermediate explanation, a normal slide, and a final animation. All resources share the controller and input binding; do not modify their HTML.

If your host already manages slides, keep that logic and route `onAction` to its active sequence or navigation. `createSequence` is optional: you may use connections directly. A sequence can interleave animations and `{run, undo}` steps; alternatively use one per slide. Only the active sequence receives input.

**Bind once**, replacing or connecting previous host handlers. The controller cannot undo an action another handler already performed. Do not combine `bindInput` with a listener calling `sequence.handleKey`, or add `onclick` to buttons delegated to the helper. The returned object has `destroy()`; rebinding the same root replaces its previous binding without duplication.

### Clicks, keyboard and controls

- Primary clicks on artwork, margins or background emit `advance`.
- →/Space advances, Shift+→ skips, ← goes back, Home restarts the active image and End completes it. Key repeats do not accumulate advances.
- A button with `data-tinta-color-action` emits only its action, including clicks on nested icons/text. Actions: `advance`, `advance-wait`, `skip`, `back`, `restart`, `finish`, `pause`, `restart-sequence`.
- Ordinary buttons, links, fields, editable content and other native controls keep their behavior without also advancing. Enter/Space retains native button activation; arrows still work after toolbar use. Fields and controls using arrows retain them.
- Mark custom controls or their container with `data-tinta-color-ignore`; `ignoreSelector` accepts a different selector. Ctrl/Alt/Meta keyboard shortcuts, text composition and modified clicks remain native.
- `root` can limit input to an element; its default, `document`, keeps the whole presentation's keyboard input in one place. `onError` receives handler failures.

External controls belong to the host. `sequence.activeAnimation` is the current step's connection or `null` during ordinary steps. Use its `ready` property to enable Restart/End when appropriate, as the example does. No visible internal buttons remain unusable. Restarting an image stops at Initial; restarting the whole presentation is separate.

### Connections and cleanup

Each image needs `attach` but no individual input setup. Connections expose `ready`, `state`, `busy`, `error`, `onState`, `onRestart`, `onError` and `subscribe`. `onInput` remains accepted for compatibility but is unused in exclusive host mode. Legacy `sequence.handleKey` remains available; do not combine it with `bindInput`.

`attach` reloads the iframe for a fresh channel. The handshake confirms that the player hides its controls; older HTML reports `HOST_INPUT_UNSUPPORTED` and must be re-exported. Readiness requires this confirmation.

`connection.destroy()` removes listeners/requests, restores the iframe's previous focus/pointer attributes and asks the player to restore its interaction. Reattaching the same iframe replaces its old connection. `sequence.destroy()` removes subscriptions; the host decides when to release connections.

| Connection operation | Result |
| --- | --- |
| `advance()` | Default: start a stage; while painting, complete its end and start the next. In the last stage, show the end and stop. Resume a manually paused stage. |
| `advanceWhenIdle()` | Alternative: start/resume a stage; discard requests while painting (`reason: "busy"`). |
| `advance(true)` | While playing, show the current stage's end; at a checkpoint, show the next end. |
| `back()` | Show the previous end, stopped; return to Initial before the first stage. |
| `restart()` | Return to Initial without autoplay. |
| `finish()` | Show the final enabled stage's end. |
| `pause()` | Pause; `advance()` resumes. |
| `command('state')` | Query current status without changing playback. |

Operations return promises containing `state`. Advancing after completion returns `consumed:false, completed:true`; the sequence uses that same input for its next element. Right arrow and click use `advance()`: they can move to the next moment before the current one finishes. The input completing the last stage does not also advance the slide; another input continues the sequence. `advanceWhenIdle()` retains the previous discard-while-painting behavior. Automatic key repeat remains disabled. Commands before readiness return `NOT_READY` without later execution. Checkpoints include accumulated paint, camera and highlight ends, including zero-duration stages. Backward navigation does not reverse animation.

`sequence.advanceWhenIdle()` applies the waiting alternative to the sequence; `sequence.input('advance-wait')` is its action equivalent. `sequence.advance(true)` skips a moment; `sequence.back()` moves backward. `sequence.input('restart')` resets the current image and `sequence.input('finish')` completes it. **`sequence.restart()` resets the whole sequence**, calling supplied `undo` functions; this differs from resetting one image.

Opened directly, the animation retains its final hover ↻ Restart button. **Attached to a host, that button is hidden**; restart comes from external controls or the API. Restart notifications still coordinate sequence position. Resetting an earlier image while another plays does not start both. Ordinary `run` steps should be safe to repeat after backward navigation.

## Message contract v1

The controller uses `postMessage`, checking the exact source window, origin and a random per-iframe channel. Channel and parent origin travel in the URL fragment. Local `file://` works through source/channel checks without trusting origin `null` alone. Arbitrary code execution commands are not accepted.

Messages carry `protocol:"tinta-color"`, `version:1`, `channel` and `kind`. `connect` establishes a connection with `interaction: "host"`, confirmed in player events; `disconnect` restores player interaction; `command` carries `id` and one of `advance`, `advance-wait`, `skip`, `back`, `restart`, `finish`, `pause`, `state`. `reply` returns the result with the same `id`. Events are `loading`, `ready`, `state`, `restart`, `error`. `input` is legacy and ignored by exclusive-host connections; the host document receives user gestures. Prefer the controller instead of constructing messages manually.

State includes `index` (original zero-based stage index), `position` (enabled-stage position), `stageCount`, `name`, `phase` (`initial`, `playing`, `waiting`, `paused`, `completed`), `time`, `elapsed`, `total`, `atStart`, `playing`, `waiting`, `ended`, `empty` and view data. State events fire on phase/stage changes rather than every frame; query `state` for current time. Inside the export, `window.TintaColorPlayer` exposes `command` and `getState`. Hosts should use the controller instead of relying on direct cross-file access.

Keep the host and animations under the same scheme: all local files or all HTTP-served. A sandboxed host must allow scripts; its policies may impose other restrictions. This is separate from editor sessions and needs no MCP during playback.

## Acceptance check

To update an existing presentation, re-export the animations and replace `tinta-color-host.js` as well: older HTML keeps its embedded player. Load one updated controller for all images and create one `bindInput` binding. Do not patch exported HTML or add per-image exceptions. If the real host has its own playing-state input guard, its author must remove that guard for this advance behavior; older integrations could discard inputs before sending them.

Use several animations, intermediate text and ordinary slides. Check artwork/margin clicks, advancement while painting, skip, backward navigation, external restart and buttons without double actions. Tab must skip frames; typing must not advance; independent opening must retain hover restart. Open offline from local files. The real presentation's advance system needs its own integration rehearsal.
