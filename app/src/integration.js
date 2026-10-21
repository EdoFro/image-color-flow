/* Host-side protocol v1. This factory is also shipped with each integration export. */
(function (root) {
  'use strict';
  function createTintaColorHost() {
    const protocol = { protocol: 'tinta-color', version: 1 };
    function attach(iframe, { onState = () => {}, onInput = () => {}, onRestart = () => {}, onError = () => {}, timeoutMs = 5000 } = {}) {
      const token = [...crypto.getRandomValues(new Uint8Array(24))].map(n => n.toString(16).padStart(2, '0')).join('');
      const url = new URL(iframe.getAttribute('src'), document.baseURI), origin = url.protocol === 'file:' ? 'null' : url.origin;
      if (!['file:', 'http:', 'https:'].includes(url.protocol)) throw new Error('Use a file, HTTP or HTTPS animation URL.');
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
        if (m.kind === 'input') { if (['advance','skip','back','restart','finish','pause'].includes(m.action)) onInput(m.action); return; }
        if (m.kind !== 'event') return;
        if (m.event === 'ready') ready = true;
        if (m.state) { state = m.state; changed(); }
        if (m.event === 'restart') { onRestart(state); subscribers.forEach(fn => fn(state, 'restart')); }
        if (m.event === 'error') { error = String(m.error || 'Animation failed'); ready = false; onError(error); }
      }
      function resetPending(reason) { for (const call of pending.values()) { clearTimeout(call.timer); call.resolve({ accepted: false, error: reason }); } pending.clear(); }
      function loaded() { ready = false; state = null; error = null; resetPending('RELOADED'); send({ kind: 'connect' }); changed(); }
      window.addEventListener('message', receive); iframe.addEventListener('load', loaded);
      iframe.src = url.href;
      async function command(command) {
        if (destroyed) return { accepted: false, error: 'DESTROYED' };
        if (!ready) return { accepted: false, consumed: true, error: error ? 'INITIALIZATION_FAILED' : 'NOT_READY' };
        if (!['advance','skip','back','restart','finish','pause','state'].includes(command)) return { accepted: false, error: 'UNKNOWN_COMMAND' };
        const id = ++serial;
        return new Promise(resolve => {
          const timer = setTimeout(() => { pending.delete(id); resolve({ accepted: false, error: 'TIMEOUT' }); }, timeoutMs);
          pending.set(id, { resolve, timer }); send({ kind: 'command', id, command });
        });
      }
      return {
        iframe, get state() { return state; }, get ready() { return ready; }, get error() { return error; }, get busy() { return inFlight || !!state?.playing; },
        command,
        async advance(skip = false) {
          if (inFlight || !skip && state?.playing) return { consumed: true, accepted: false, reason: 'busy' };
          inFlight = true; try { return await command(skip ? 'skip' : 'advance'); } finally { inFlight = false; }
        },
        back: () => command('back'), restart: () => command('restart'), finish: () => command('finish'), pause: () => command('pause'),
        subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
        destroy() { destroyed = true; resetPending('DESTROYED'); subscribers.clear(); window.removeEventListener('message', receive); iframe.removeEventListener('load', loaded); }
      };
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
      async function advance(skip = false) {
        if (locked) return { consumed: true, reason: 'busy' };
        if (animation(steps[index]) && steps[index].busy && !skip) return { consumed: true, reason: 'busy' };
        if (pendingRestart !== null && !(animation(steps[index]) && steps[index].busy)) { index = pendingRestart; pendingRestart = null; onChange(index); }
        locked = true;
        try {
          while (index < steps.length) {
            const step = steps[index];
            if (animation(step)) {
              const result = await step.advance(skip);
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
        const result = action === 'advance' ? advance() : action === 'skip' ? advance(true) : action === 'back' ? back() : action === 'restart' ? currentCommand('restart') : action === 'finish' ? currentCommand('finish') : action === 'pause' ? currentCommand('pause') : null;
        Promise.resolve(result).catch(onError);
      }
      return { advance, back, restart, input, handleKey, get index() { return index; }, get busy() { return locked || animation(steps[index]) && steps[index].busy; }, destroy() { removers.forEach(fn => fn()); } };
    }
    return { version: 1, attach, createSequence };
  }

  function files(animation = 'animacion.html') {
    const host = 'window.TintaColorHost = (' + createTintaColorHost.toString() + ')();\n';
    const safeName = animation.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
    const example = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tinta y color · integración / embedding</title><style>body{margin:0;background:#e9ece7;color:#14251e;font:18px system-ui}main{max-width:1100px;margin:auto;padding:24px}iframe{width:100%;height:44vh;border:0}#slide1{display:grid;grid-template-columns:1fr 1fr;gap:16px}#slide1 h2,#text{grid-column:1/-1}#a{grid-column:1;grid-row:2}#b{grid-column:2;grid-row:2}#text{grid-row:3}@media(max-width:650px){#slide1{display:block}iframe{height:32vh}}button{padding:12px;margin:4px;font:inherit}[hidden]{display:none!important}#slide2{background:#dce3da;padding:24px}</style><main><h1>Ejemplo de integración / Integration example</h1><p>→ avanzar / advance · Shift+→ saltar / skip · ← retroceder / back · Inicio/Home reiniciar imagen / restart image · Fin/End final</p><section id="slide1"><h2>Lámina 1 / Slide 1</h2><iframe id="a" src="${safeName}" title="Animación A" allowfullscreen></iframe><p id="text" hidden>Explicación intermedia / Intermediate explanation</p><iframe id="b" src="${safeName}" title="Animación B" allowfullscreen></iframe></section><section id="slide2" hidden><h2>Lámina 2 / Slide 2</h2><p>La secuencia terminó / Sequence completed.</p></section><p id="status" role="status">Cargando / Loading…</p><nav><button data-action="advance">→</button><button data-action="skip">Saltar / Skip</button><button data-action="back">←</button><button data-action="restart">Reiniciar imagen / Restart image</button><button data-action="finish">Final / End</button><button id="reset">Reiniciar ejemplo / Reset example</button></nav></main><script src="tinta-color-host.js"></script><script>
let sequence;
const status = document.getElementById('status');
const changed = () => { status.textContent = [a,b].every(c=>c.ready) ? 'Listo / Ready' : 'Cargando / Loading…'; };
const options = {onInput: action=>sequence.input(action), onState: changed, onError: error=>status.textContent=error};
const a=TintaColorHost.attach(document.getElementById('a'),options), b=TintaColorHost.attach(document.getElementById('b'),options);
sequence=TintaColorHost.createSequence([a,{run:()=>document.getElementById('text').hidden=false,undo:()=>document.getElementById('text').hidden=true},b,{run:()=>{document.getElementById('slide1').hidden=true;document.getElementById('slide2').hidden=false;},undo:()=>{document.getElementById('slide1').hidden=false;document.getElementById('slide2').hidden=true;}}],{onError:error=>status.textContent=error,onChange:()=>{if(sequence.index<3){document.getElementById('slide1').hidden=false;document.getElementById('slide2').hidden=true;}}});
document.addEventListener('keydown',event=>sequence.handleKey(event),true);
document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>sequence.input(button.dataset.action));
document.getElementById('reset').onclick=()=>sequence.restart();
</script></html>`;
    return {
      'tinta-color-host.js': host, 'ejemplo.html': example,
      'LEEME.txt': 'Tinta y color · integración / embedding (protocol v1)\n\nDescomprime todo y abre ejemplo.html. Unzip all files and open ejemplo.html. No network required.\n\nES: Integra animacion.html con iframe y tinta-color-host.js. TintaColorHost.attach(iframe,{onInput}) conecta; createSequence([...]) ordena animaciones y pasos {run,undo}. Usa sequence.handleKey como UNICO manejador de avance de tu presentación, retirando/conectando los anteriores. attach recarga el iframe para establecer su canal. Las pulsaciones mientras pinta se descartan. La primera etapa y cada siguiente se reproducen con advance(); advance(true) salta al cierre. back(), restart(), finish() operan sobre la conexión. Reiniciar vuelve a Inicio sin reproducir. No edites el HTML generado. El ejemplo muestra dos animaciones, una explicación y otra lámina. El agente debe adaptar la secuencia a la presentación real.\n\nEN: Embed animacion.html with an iframe and tinta-color-host.js. TintaColorHost.attach(iframe,{onInput}) connects; createSequence([...]) orders animations and {run,undo} steps. Use sequence.handleKey as your presentation\'s SOLE advance handler, removing/connecting existing handlers. attach reloads the iframe to establish its channel. Key presses while painting are discarded. advance() plays one stage; advance(true) skips to its end. back(), restart(), finish() operate on a connection. Restart returns to Initial without autoplay. Do not patch the generated HTML. Adapt the supplied sequence to the real presentation.\n'
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
