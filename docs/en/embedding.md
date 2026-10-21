# Drafts and presentation embedding

**English** | [Español](../integracion.md)

[Back to the project](../../README.md)

Available since 0.16.0. This workflow does not connect the assistant to a live editor session: the user finishes editing and hands the export to the presentation author.

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
- `ejemplo.html`: two animations, an intermediate explanation and a second slide.
- `LEEME.txt`: Spanish/English quick instructions.

Unzip everything before opening the example. Give the folder to the presentation agent; do not patch the animation HTML. API/CLI/MCP plans use `presentation: {mode: "integrated"}`. `render` produces `presentacion.html` and these helpers alongside existing reports/previews. Patch objects replace the complete object: preserve any background/color settings you need.

Standalone mode retains existing playback. Embedded mode waits after every enabled stage regardless of `pauseAfter`. It does not change authored timing or geometry: the exported player enforces the pauses. Ordinary controls are hidden; the final restart remains. Opened alone, click/→/Space advances one stage; Shift+→ skips, ← goes back, Home restarts and End finishes. No autoplay.

## Host controller

```html
<iframe id="image" src="animacion.html" title="Illustration" allowfullscreen></iframe>
<script src="tinta-color-host.js"></script>
<script>
let sequence;
const image = TintaColorHost.attach(document.getElementById('image'), {
  onInput: action => sequence.input(action),
  onError: error => console.error(error)
});
sequence = TintaColorHost.createSequence([
  image,
  { run: () => showNextElement(), undo: () => hideElement() }
]);
document.addEventListener('keydown', event => sequence.handleKey(event), true);
</script>
```

Replace show/hide functions with your presentation's behavior. The bundled example is runnable and includes a slide change. Attach each animation separately. Steps may interleave animations and `{run, undo}` objects; `run` consumes one advance, while optional `undo` supports backward navigation. Use one sequence per slide or a global sequence; route input only to the active sequence.

**One owner of advancement:** connect or remove the host's existing handlers. This controller cannot prevent an earlier handler from already changing slides. `handleKey` consumes recognized keys and ignores key repeats and text controls. Buttons can call the same actions. Keyboard input inside the iframe is forwarded to the host.

`attach` reloads the iframe to establish a fresh channel. `connection.ready`, `connection.state`, `connection.busy` and `connection.error` expose status. `onState`, `onInput`, `onRestart` and `onError` notify changes. `subscribe` returns an unsubscribe function; `destroy` removes listeners and resolves pending requests. Sequences also have `destroy`.

| Connection operation | Result |
| --- | --- |
| `advance()` | Play one stage or resume a paused stage. Discard normal advances while playing. |
| `advance(true)` | While playing, show the current stage's end; at a checkpoint, show the next end. |
| `back()` | Show the previous end, stopped; return to Initial before the first stage. |
| `restart()` | Return to Initial without autoplay. |
| `finish()` | Show the final enabled stage's end. |
| `pause()` | Pause; `advance()` resumes. |
| `command('state')` | Query current status without changing playback. |

Operations return promises containing `state`. Advancing after completion returns `consumed:false, completed:true`; the sequence uses that same input for its next element. Inputs while painting are discarded, not queued. Commands before readiness return `NOT_READY` without later execution. Checkpoints include accumulated paint, camera and highlight ends, including zero-duration stages. Backward navigation does not reverse animation.

`sequence.advance(true)` skips a moment; `sequence.back()` moves backward. `sequence.input('restart')` resets the current image and `sequence.input('finish')` completes it. **`sequence.restart()` resets the whole sequence**, calling supplied `undo` functions; this differs from resetting one image.

After completion, the high-contrast ↻ Restart button appears on hover and remains keyboard accessible. Clicking it returns to Initial, informs the host and restores that image's position in the sequence without autoplay. If another animation is playing, the return waits until its current moment ends; two animations are not started together. Subsequent ordinary steps may run again, so their `run` functions should be safe to repeat.

## Message contract v1

The controller uses `postMessage`, checking the exact source window, origin and a random per-iframe channel. Channel and parent origin travel in the URL fragment. Local `file://` works through source/channel checks without trusting origin `null` alone. Arbitrary code execution commands are not accepted.

Messages carry `protocol:"tinta-color"`, `version:1`, `channel` and `kind`. `connect` establishes a connection; `command` carries `id` and one of `advance`, `skip`, `back`, `restart`, `finish`, `pause`, `state`. `reply` returns the result with the same `id`. Events are `loading`, `ready`, `state`, `restart`, `error`. `input` forwards user actions. Prefer the controller instead of constructing messages manually.

State includes `index` (original zero-based stage index), `position` (enabled-stage position), `stageCount`, `name`, `phase` (`initial`, `playing`, `waiting`, `paused`, `completed`), `time`, `elapsed`, `total`, `atStart`, `playing`, `waiting`, `ended`, `empty` and view data. State events fire on phase/stage changes rather than every frame; query `state` for current time. Inside the export, `window.TintaColorPlayer` exposes `command` and `getState`. Hosts should use the controller instead of relying on direct cross-file access.

Keep the host and animations under the same scheme: all local files or all HTTP-served. A sandboxed host must allow scripts; its policies may impose other restrictions. This is separate from editor sessions and needs no MCP during playback.

## Acceptance check

Use two animations, an intermediate text reveal and another slide. Check rapid keys while painting, explicit skip, backward navigation, finish, hover restart, and keyboard focus inside/outside the iframe. Open offline from local files. The real presentation's advance system needs its own integration rehearsal.
