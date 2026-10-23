/* Host-side protocol v1. This factory is also shipped with each integration export. */
(function (root) {
  'use strict';
  function createTintaColorHost() {
    const protocol = { protocol: 'tinta-color', version: 1 };
    const inputBindings = new WeakMap(), attachments = new WeakMap();
    function attach(iframe, { onState = () => {}, onInput = () => {}, onRestart = () => {}, onError = () => {}, timeoutMs = 5000 } = {}) {
      if (iframe?.tagName !== 'IFRAME' || !iframe.getAttribute('src')) throw new TypeError('attach requires an iframe with a src.');
      const url = new URL(iframe.getAttribute('src'), document.baseURI), origin = url.protocol === 'file:' ? 'null' : url.origin;
      if (!['file:', 'http:', 'https:'].includes(url.protocol)) throw new Error('Use a file, HTTP or HTTPS animation URL.');
      attachments.get(iframe)?.destroy();
      const original = { pointer: iframe.style.getPropertyValue('pointer-events'), priority: iframe.style.getPropertyPriority('pointer-events'), tabindex: iframe.getAttribute('tabindex'), inert: iframe.getAttribute('inert') };
      iframe.style.setProperty('pointer-events', 'none', 'important');
      iframe.setAttribute('tabindex', '-1'); iframe.setAttribute('inert', ''); iframe.blur();
      const token = [...crypto.getRandomValues(new Uint8Array(24))].map(n => n.toString(16).padStart(2, '0')).join('');
      const hash = new URLSearchParams(url.hash.slice(1)); hash.set('tc-channel', token); hash.set('tc-parent', location.protocol === 'file:' ? 'null' : location.origin); url.hash = hash.toString();
      // A fragment-only change can leave an already-loaded document alive with an old token.
      url.searchParams.set('tc-session', token);
      let state = null, ready = false, error = null, destroyed = false, serial = 0, inFlight = false;
      const pending = new Map(), subscribers = new Set();
      function send(value) { iframe.contentWindow.postMessage({ ...protocol, channel: token, ...value }, origin === 'null' ? '*' : origin); }
      function changed() { onState(state); subscribers.forEach(fn => fn(state)); }
      function receive(event) {
        const m = event.data;
        if (destroyed || event.source !== iframe.contentWindow || event.origin !== origin || !m || m.protocol !== 'tinta-color' || m.version !== 1 || m.channel !== token) return;
        if (m.kind === 'reply') {
          const call = pending.get(m.id); if (!call) return;
          clearTimeout(call.timer); pending.delete(m.id);
          if (m.result?.state) { state = m.result.state; changed(); }
          call.resolve(m.result); return;
        }
        // Host-controlled frames never supply user input. onInput is retained for API compatibility.
        if (m.kind === 'input') return;
        if (m.kind !== 'event') return;
        if (['loading', 'ready'].includes(m.event) && m.interaction !== 'host') {
          error = 'HOST_INPUT_UNSUPPORTED: re-export the animation with the current editor.';
          ready = false; changed(); onError(error); return;
        }
        if (m.event === 'ready') ready = true;
        if (m.state) { state = m.state; changed(); }
        if (m.event === 'restart') { onRestart(state); subscribers.forEach(fn => fn(state, 'restart')); }
        if (m.event === 'error') { error = String(m.error || 'Animation failed'); ready = false; changed(); onError(error); }
      }
      function resetPending(reason) { for (const call of pending.values()) { clearTimeout(call.timer); call.resolve({ accepted: false, error: reason }); } pending.clear(); }
      function loaded() { ready = false; state = null; error = null; resetPending('RELOADED'); send({ kind: 'connect', interaction: 'host' }); changed(); }
      window.addEventListener('message', receive); iframe.addEventListener('load', loaded);
      iframe.src = url.href;
      async function command(command) {
        if (destroyed) return { accepted: false, error: 'DESTROYED' };
        if (!ready) return { accepted: false, consumed: true, error: error ? 'INITIALIZATION_FAILED' : 'NOT_READY' };
        if (!['advance','advance-wait','skip','back','restart','finish','pause','state'].includes(command)) return { accepted: false, error: 'UNKNOWN_COMMAND' };
        const id = ++serial;
        return new Promise(resolve => {
          const timer = setTimeout(() => { pending.delete(id); resolve({ accepted: false, error: 'TIMEOUT' }); }, timeoutMs);
          pending.set(id, { resolve, timer }); send({ kind: 'command', id, command });
        });
      }
      async function advance(skip = false, waitWhilePlaying = false) {
        if (inFlight || waitWhilePlaying && state?.playing) return { consumed: true, accepted: false, reason: 'busy' };
        inFlight = true; try { return await command(skip ? 'skip' : waitWhilePlaying ? 'advance-wait' : 'advance'); } finally { inFlight = false; }
      }
      const connection = {
        iframe, get state() { return state; }, get ready() { return ready; }, get error() { return error; }, get busy() { return inFlight || !!state?.playing; },
        command, advance, advanceWhenIdle: () => advance(false, true),
        back: () => command('back'), restart: () => command('restart'), finish: () => command('finish'), pause: () => command('pause'),
        subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
        destroy() {
          if (destroyed) return;
          if (iframe.contentWindow) send({ kind: 'disconnect' });
          destroyed = true; ready = false; resetPending('DESTROYED'); subscribers.clear();
          window.removeEventListener('message', receive); iframe.removeEventListener('load', loaded);
          if (original.pointer) iframe.style.setProperty('pointer-events', original.pointer, original.priority); else iframe.style.removeProperty('pointer-events');
          for (const name of ['tabindex', 'inert']) if (original[name] === null) iframe.removeAttribute(name); else iframe.setAttribute(name, original[name]);
          attachments.delete(iframe);
        }
      };
      attachments.set(iframe, connection); return connection;
    }

    function bindInput({ root = document, onAction, onError = error => console.error(error), ignoreSelector = '[data-tinta-color-ignore]' } = {}) {
      if (typeof onAction !== 'function') throw new TypeError('bindInput requires onAction.');
      const interactive = 'button,a[href],input,select,textarea,label,summary,video[controls],audio[controls],[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="slider"],[role="textbox"],[role="checkbox"],[role="switch"],[role="combobox"],[role="listbox"],[role="menuitem"]' + (ignoreSelector ? ',' + ignoreSelector : '');
      root.querySelector(interactive); // Reject invalid selectors before changing an existing binding.
      inputBindings.get(root)?.destroy();
      const actions = new Set(['advance','advance-wait','skip','back','restart','restart-sequence','finish','pause']);
      const pathOf = event => { const path = event.composedPath(); const end = path.indexOf(root); return (end < 0 ? path : path.slice(0, end + 1)).filter(node => typeof node?.matches === 'function'); };
      function dispatch(action, event) {
        event.preventDefault(); event.stopImmediatePropagation();
        try { Promise.resolve(onAction(action, event)).catch(onError); } catch (error) { onError(error); }
      }
      function click(event) {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
        const path = pathOf(event), control = path.find(node => node.hasAttribute('data-tinta-color-action'));
        if (control) {
          // A native/custom control nested inside another control owns its own action.
          if (path.slice(0, path.indexOf(control)).some(node => node.matches(interactive))) return;
          const action = control.getAttribute('data-tinta-color-action');
          if (!control.matches(':disabled,[aria-disabled="true"]') && actions.has(action)) dispatch(action, event);
          return;
        }
        if (path.some(node => node.matches(interactive))) return;
        dispatch('advance', event);
      }
      function keydown(event) {
        if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
        // Keep native Enter/Space activation, while arrows still work after clicking a toolbar button.
        if (pathOf(event).some(node => ignoreSelector && node.matches(ignoreSelector) || node.matches(interactive) && !(node.matches('button,a[href],[role="button"],[role="link"]') && ![' ', 'Enter'].includes(event.key)))) return;
        const action = event.key === 'ArrowRight' || event.key === ' ' ? event.shiftKey ? 'skip' : 'advance' : event.key === 'ArrowLeft' ? 'back' : event.key === 'Home' ? 'restart' : event.key === 'End' ? 'finish' : null;
        if (!action) return;
        if (event.repeat) { event.preventDefault(); event.stopImmediatePropagation(); return; }
        dispatch(action, event);
      }
      root.addEventListener('click', click, true); root.addEventListener('keydown', keydown, true);
      const binding = { destroy() { root.removeEventListener('click', click, true); root.removeEventListener('keydown', keydown, true); if (inputBindings.get(root) === binding) inputBindings.delete(root); } };
      inputBindings.set(root, binding); return binding;
    }

    // Each step is an attached animation or {run, undo?} for an ordinary reveal/slide.
    // No global keyboard listener: the host must make this its sole advance handler.
    function createSequence(steps, { onComplete = () => {}, onChange = () => {}, onError = () => {} } = {}) {
      let index = 0, locked = false, pendingRestart = null, completed = false;
      const animation = step => step && typeof step.advance === 'function';
      const removers = steps.map((step, i) => animation(step) ? step.subscribe((state, event) => {
        if (event === 'restart') {
          completed = false;
          if (animation(steps[index]) && steps[index].busy && index !== i) pendingRestart = i;
          else { index = i; onChange(index); }
        }
      }) : () => {});
      async function advance(skip = false, waitWhilePlaying = false) {
        if (locked) return { consumed: true, reason: 'busy' };
        if (animation(steps[index]) && steps[index].busy && waitWhilePlaying) return { consumed: true, reason: 'busy' };
        if (pendingRestart !== null && !(animation(steps[index]) && steps[index].busy)) { index = pendingRestart; pendingRestart = null; onChange(index); }
        locked = true;
        try {
          while (index < steps.length) {
            const step = steps[index];
            if (animation(step)) {
              const result = await step.advance(skip, waitWhilePlaying);
              if (result.error) onError(result.error);
              if (result.consumed !== false) return result;
            } else { await step.run(); index++; onChange(index); return { consumed: true }; }
            index++; onChange(index);
          }
          if (!completed) { completed = true; onComplete(); }
          return { consumed: false, completed: true };
        } finally { locked = false; }
      }
      async function back() {
        if (locked) return;
        locked = true; completed = false;
        try {
          const step = steps[index];
          if (animation(step) && step.state && !step.state.atStart) { await step.back(); return; }
          if (index > 0) { index--; const previous = steps[index]; if (animation(previous)) await previous.finish(); else await previous.undo?.(); onChange(index); }
        } finally { locked = false; }
      }
      async function restart() {
        if (locked) return;
        locked = true;
        try { for (const step of [...steps].reverse()) if (animation(step)) await step.restart(); else await step.undo?.(); index = 0; completed = false; pendingRestart = null; onChange(index); }
        finally { locked = false; }
      }
      function currentCommand(command) { const step = steps[index]; return animation(step) ? step.command(command) : Promise.resolve({ accepted: false, error: 'NO_CURRENT_ANIMATION' }); }
      function handleKey(event) {
        if (event.ctrlKey || event.altKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName) || event.target?.tagName === 'BUTTON' && event.key === ' ') return false;
        const action = event.key === 'ArrowRight' || event.key === ' ' ? event.shiftKey ? 'skip' : 'advance' : event.key === 'ArrowLeft' ? 'back' : event.key === 'Home' ? 'restart' : event.key === 'End' ? 'finish' : null;
        if (!action) return false;
        event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) input(action); return true;
      }
      function input(action) {
        const result = action === 'advance' ? advance() : action === 'advance-wait' ? advance(false, true) : action === 'skip' ? advance(true) : action === 'back' ? back() : action === 'restart' ? currentCommand('restart') : action === 'restart-sequence' ? restart() : action === 'finish' ? currentCommand('finish') : action === 'pause' ? currentCommand('pause') : null;
        return Promise.resolve(result).catch(onError);
      }
      return { advance, advanceWhenIdle: () => advance(false, true), back, restart, input, handleKey, get activeAnimation() { return animation(steps[index]) ? steps[index] : null; }, get index() { return index; }, get busy() { return locked || animation(steps[index]) && steps[index].busy; }, destroy() { removers.forEach(fn => fn()); } };
    }
    return { version: 1, attach, bindInput, createSequence };
  }

  function files(animation = 'animacion.html') {
    const host = 'window.TintaColorHost = (' + createTintaColorHost.toString() + ')();\n';
    const safeName = animation.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
    const example = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tinta y color · entrada centralizada / host input</title><style>
*{box-sizing:border-box}body{margin:0;background:#e9ece7;color:#14251e;font:17px system-ui}main{max-width:1150px;margin:auto;padding:20px}h1{font-size:27px}h2{font-size:23px}#slides{min-height:52vh}.text-slide{min-height:50vh;display:grid;place-content:center;text-align:center}.gallery{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0;border:1px solid #bec8be;border-radius:8px;background:#dce3da}iframe{display:block;width:100%;height:34vh;border:0}figcaption{padding:9px;font-size:14px}button,input{font:inherit;padding:10px}button{cursor:pointer}button:disabled{cursor:default;opacity:.45}nav{display:flex;gap:8px;flex-wrap:wrap}.utilities{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:16px}#status{min-height:24px;font-size:14px}#help{padding:12px;background:#fff;border:1px solid #bec8be}[hidden]{display:none!important}@media(max-width:650px){.gallery{grid-template-columns:1fr}iframe{height:24vh}h1{font-size:22px}}
</style><main id="presentation"><h1>Presentación con entrada única / One input owner</h1><p>Clic o →: avanzar / advance · Shift+→: saltar / skip · ←: retroceder / back · Inicio/Home: reiniciar imagen / restart image · Fin/End: final</p>
<div id="slides"><section data-slide="0" class="text-slide"><h2>Lámina 1 / Slide 1</h2><p>Introducción sin animaciones. Haz clic aquí para continuar.<br>Introduction without animations. Click here to continue.</p></section>
<section data-slide="1" hidden><h2>Lámina 2 · dos imágenes / Slide 2 · two images</h2><div class="gallery"><figure id="figure-a"><iframe id="a" src="${safeName}" title="Ilustración A" allowfullscreen></iframe><figcaption>Animación A · clic también en sus márgenes / click its margins too</figcaption></figure><figure id="figure-b"><iframe id="b" src="${safeName}" title="Ilustración B" allowfullscreen></iframe><figcaption>Animación B</figcaption></figure></div><p id="text" hidden>Explicación entre A y B / Explanation between A and B</p></section>
<section data-slide="2" class="text-slide" hidden><h2>Lámina 3 / Slide 3</h2><p>Una lámina intermedia normal.<br>An ordinary intermediate slide.</p></section>
<section data-slide="3" hidden><h2>Lámina 4 / Slide 4</h2><figure id="figure-c"><iframe id="c" src="${safeName}" title="Ilustración C" allowfullscreen></iframe><figcaption>Animación C · misma entrada / same input binding</figcaption></figure></section></div>
<p id="status" role="status">Cargando / Loading…</p><nav aria-label="Controles de presentación / Presentation controls"><button type="button" data-tinta-color-action="advance"><span>→ Avanzar / Advance</span></button><button type="button" data-tinta-color-action="skip">Saltar / Skip</button><button type="button" data-tinta-color-action="back"><span>← Retroceder / Back</span></button><button type="button" data-tinta-color-action="restart" data-needs-animation>Reiniciar imagen / Restart image</button><button type="button" data-tinta-color-action="finish" data-needs-animation>Final / End</button><button type="button" data-tinta-color-action="restart-sequence">Reiniciar presentación / Reset presentation</button></nav>
<div class="utilities"><label>Notas / Notes <input id="notes" placeholder="Escribir no avanza / Typing does not advance"></label><button type="button" id="helpButton">Ayuda / Help</button><a id="helpLink" href="#help">Ver ayuda / View help</a></div><aside id="help" data-tinta-color-ignore hidden>Los controles ejecutan sólo su acción. Las imágenes conectadas no capturan mouse ni teclado.<br>Controls perform only their own action. Attached images do not capture mouse or keyboard.</aside></main>
<script src="tinta-color-host.js"></script><script>
let sequence, slide = 0;
const connections = [], status = document.getElementById('status');
function update() {
  const active = sequence?.activeAnimation;
  document.querySelectorAll('[data-needs-animation]').forEach(button => button.disabled = !active?.ready || active.state?.empty);
  const error = connections.find(connection => connection.error)?.error;
  if (error) { status.textContent = error; return; }
  status.textContent = 'Lámina / Slide ' + (slide + 1) + ' · ' + (connections.every(c => c.ready) ? 'Listo / Ready' : 'Cargando / Loading…') + (active?.state ? ' · ' + active.state.name + ' · ' + active.state.phase : '');
}
function showSlide(n) { slide = n; document.querySelectorAll('[data-slide]').forEach(section => section.hidden = Number(section.dataset.slide) !== n); update(); }
const options = { onState: update, onError: error => status.textContent = error };
const a = TintaColorHost.attach(document.getElementById('a'), options), b = TintaColorHost.attach(document.getElementById('b'), options), c = TintaColorHost.attach(document.getElementById('c'), options);
connections.push(a, b, c);
sequence = TintaColorHost.createSequence([
  { run: () => showSlide(1), undo: () => showSlide(0) }, a,
  { run: () => document.getElementById('text').hidden = false, undo: () => document.getElementById('text').hidden = true }, b,
  { run: () => showSlide(2), undo: () => showSlide(1) },
  { run: () => showSlide(3), undo: () => showSlide(2) }, c
], { onChange: () => { const active = sequence.activeAnimation; if (active) showSlide(Number(active.iframe.closest('[data-slide]').dataset.slide)); update(); }, onError: error => status.textContent = error });
// One binding for the whole presentation, including all current/future images and buttons.
const input = TintaColorHost.bindInput({ onAction: async action => { await sequence.input(action); update(); }, onError: error => status.textContent = error });
document.getElementById('helpButton').onclick = () => { const help = document.getElementById('help'); help.hidden = !help.hidden; };
update();
</script></html>`;
    return {
      'tinta-color-host.js': host, 'ejemplo.html': example,
      'LEEME.txt': "Tinta y color · integración / embedding (protocol v1, app 0.22.0)\n\nES: Descomprime todo y abre ejemplo.html. El ejemplo tiene cuatro láminas, tres animaciones y una explicación intermedia. Carga tinta-color-host.js una sola vez. attach(iframe) conecta cada imagen y desactiva su mouse/foco; la animación oculta sus controles internos al confirmar interaction:host. Conserva los archivos exportados sin modificar. Reexporta los HTML anteriores y reemplaza el controlador.\n\nConfigura una sola vez TintaColorHost.bindInput({onAction: action => secuencia.input(action)}). La presentación decide qué secuencia o lámina recibe cada acción. Sustituye los manejadores anteriores. Botones data-tinta-color-action=advance|skip|back|restart|finish|pause|restart-sequence ejecutan sólo su acción; botones nativos, enlaces y campos no provocan además un avance. Usa data-tinta-color-ignore para controles personalizados. No añadas onclick a botones que ya maneja bindInput.\n\nadvance() completa una etapa que esté pintando e inicia la siguiente. Durante la última muestra el final y otra pulsación continúa. advanceWhenIdle() conserva la alternativa de espera. advance(true) sólo muestra el cierre. back(), restart(), finish() operan sobre la conexión. El reinicio de imagen no reproduce automáticamente. sequence.restart() / restart-sequence reinicia toda la secuencia. sequence.activeAnimation permite habilitar controles externos sólo cuando corresponde. Abierta por separado, la animación conserva sus gestos y el reinicio por hover. Sin redes.\n\nEN: Unzip everything and open ejemplo.html. Four slides, three animations and an intermediate explanation share one input binding. Load tinta-color-host.js once. attach(iframe) disables its pointer/focus; the animation hides all internal controls on interaction:host handshake. Re-export older HTML and replace the controller; do not patch individual resources.\n\nCall TintaColorHost.bindInput({onAction: action => sequence.input(action)}) once. The host chooses the active sequence or slide. Replace previous handlers. Buttons with data-tinta-color-action=advance|skip|back|restart|finish|pause|restart-sequence run only that action. Native buttons, links, fields and data-tinta-color-ignore controls do not also advance. Do not add onclick to buttons already owned by bindInput.\n\nadvance() completes a playing stage and starts the next; in the last stage it shows the end and another input continues. advanceWhenIdle() retains the waiting alternative. advance(true) only shows the checkpoint. back(), restart(), finish() operate on a connection. Restarting an image does not autoplay; sequence.restart() / restart-sequence resets the whole sequence. sequence.activeAnimation supports external control availability. Opened independently, animation gestures and hover restart remain. Works offline.\n"
    };
  }

  // ZIP32 stored entries: browser-native, no dependencies, one reliable download.
  function zip(entries) {
    const encoder = new TextEncoder(), chunks = [], central = []; let offset = 0;
    const crc = bytes => { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = c >>> 1 ^ (c & 1 ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; };
    const header = (size, values) => { const bytes = new Uint8Array(size), view = new DataView(bytes.buffer); values.forEach(([at, value, width]) => width === 2 ? view.setUint16(at, value, true) : view.setUint32(at, value, true)); return bytes; };
    for (const [name, content] of Object.entries(entries)) {
      if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error('Invalid ZIP filename.');
      const path = encoder.encode(name), data = encoder.encode(content), checksum = crc(data);
      const local = header(30, [[0,0x04034b50,4],[4,20,2],[6,0x800,2],[12,33,2],[14,checksum,4],[18,data.length,4],[22,data.length,4],[26,path.length,2]]);
      central.push(header(46, [[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[14,33,2],[16,checksum,4],[20,data.length,4],[24,data.length,4],[28,path.length,2],[42,offset,4]]),path);
      chunks.push(local,path,data); offset += local.length+path.length+data.length;
    }
    const size = central.reduce((n,b)=>n+b.length,0), count=Object.keys(entries).length;
    return new Blob([...chunks,...central,header(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,size,4],[16,offset,4]])],{type:'application/zip'});
  }
  root.createTintaColorHost = createTintaColorHost;
  root.PaintIntegration = { files, zip };
})(typeof window === 'undefined' ? globalThis : window);
