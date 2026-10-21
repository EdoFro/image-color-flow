/* Exportación compartida por el editor y la automatización. */
(function (root) {
  'use strict';
  function presentationBoot(data, makePlayer, unpackField, makeView, makeI18n) {
    const i18n = makeI18n({ language: data.language, catalogs: { es: data.ui, [data.language]: data.ui } }), t = (key, values) => i18n.t(key, values);
    const $ = id => document.getElementById(id), canvas = $('painting'); let player;
    const replay = $('finishRestart'), integrated = data.presentation?.mode === 'integrated';
    const fragment = new URLSearchParams(location.hash.slice(1)), expectedChannel = fragment.get('tc-channel'), expectedOrigin = fragment.get('tc-parent');
    let connection = null, current = null, lastStateKey = '', initializationError = null, hostControlled = false;
    const protocol = { protocol: 'tinta-color', version: 1 };
    document.body.classList.toggle('integrated', integrated);
    function send(kind, value = {}) {
      if (connection) connection.source.postMessage({ ...protocol, channel: expectedChannel, interaction: hostControlled ? 'host' : 'animation', kind, ...value }, connection.origin === 'null' ? '*' : connection.origin);
    }
    function setInteraction(host) {
      hostControlled = host; document.body.classList.toggle('host-controlled', host); document.body.inert = host;
      if (current) update(current);
    }
    function execute(command) {
      if (!['advance','advance-wait','skip','back','restart','finish','pause','state'].includes(command)) return { accepted: false, error: 'UNKNOWN_COMMAND' };
      if (!player) return { accepted: false, error: initializationError ? 'INITIALIZATION_FAILED' : 'NOT_READY', ready: false };
      let result = { accepted: true, consumed: true };
      if (command === 'advance' || command === 'skip') result = player.advance(command === 'advance');
      if (command === 'advance-wait') result = player.advanceWhenIdle();
      if (command === 'back') player.back();
      if (command === 'restart') { player.restart(); send('event', { event: 'restart', state: current }); }
      if (command === 'finish') player.finish();
      if (command === 'pause') player.pause();
      return { ...result, ready: true, state: player.getState() };
    }
    function input(action) {
      if (hostControlled) return;
      if (connection) send('input', { action });
      else execute(action);
    }
    window.TintaColorPlayer = Object.freeze({ version: 1, command: execute, getState: () => ({ ready: !!player, interaction: hostControlled ? 'host' : 'animation', state: current, error: initializationError }) });
    window.addEventListener('message', event => {
      const message = event.data;
      if (!integrated || event.source !== parent || parent === window || !expectedChannel || !/^[a-f0-9]{32,128}$/.test(expectedChannel) || event.origin !== expectedOrigin || !message || message.protocol !== 'tinta-color' || message.version !== 1 || message.channel !== expectedChannel) return;
      if (message.kind === 'connect') {
        connection = { source: event.source, origin: event.origin };
        setInteraction(message.interaction === 'host');
        send('event', { event: initializationError ? 'error' : player ? 'ready' : 'loading', state: current, error: initializationError });
      } else if (connection && message.kind === 'disconnect') {
        connection = null; setInteraction(false);
      } else if (connection && message.kind === 'command' && (typeof message.id === 'number' || typeof message.id === 'string' && message.id.length < 128)) {
        send('reply', { id: message.id, result: execute(message.command) });
      }
    });
    function placeReplay() {
      if (replay.hidden) return;
      const bounds = canvas.getBoundingClientRect(), width = replay.getBoundingClientRect().width;
      replay.style.left = Math.max(12, Math.min(bounds.right - width - 14, innerWidth - width - 12)) + 'px';
      replay.style.top = Math.max(12, bounds.top + 14) + 'px';
    }
    canvas.parentElement.addEventListener('pointermove', event => {
      if (hostControlled || event.pointerType === 'touch') return;
      const bounds = canvas.getBoundingClientRect();
      replay.classList.toggle('over-image', replay.contains(event.target) || (event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom));
    });
    canvas.parentElement.addEventListener('pointerleave', () => replay.classList.remove('over-image'));
    window.addEventListener('resize', placeReplay);
    replay.onclick = event => { event.stopPropagation(); if (!hostControlled) execute('restart'); };
    function toggleControls() {
      const controls = $('controls'), toggle = $('controlsToggle'), visible = controls.hidden;
      controls.hidden = !visible; toggle.setAttribute('aria-expanded', String(visible));
      toggle.setAttribute('aria-label', visible ? t("ocultar_controles_h") : t("mostrar_controles_h")); toggle.title = visible ? t("ocultar_controles_h") : t("mostrar_controles_h");
      if (!visible && controls.contains(document.activeElement)) toggle.focus();
    }
    $('controlsToggle').onclick = toggleControls;
    document.addEventListener('keydown', event => {
      if (!hostControlled && !integrated && event.key.toLowerCase() === 'h' && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey && !/TEXTAREA|SELECT/.test(event.target.tagName)) { event.preventDefault(); toggleControls(); }
    });
    const timeLabel = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
    async function pixels(url) { const image = new Image(); image.src = url; await image.decode(); const c = document.createElement('canvas'); c.width = data.width; c.height = data.height; const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, c.width, c.height).data; }
    function update(s) {
      current = s;
      const stateKey = [s.phase, s.position, s.atStart, s.empty].join(':');
      if (stateKey !== lastStateKey) { lastStateKey = stateKey; send('event', { event: 'state', state: s }); }
      const finished = s.ended && !s.atStart && !s.empty;
      if (!hostControlled && !finished && document.activeElement === replay) canvas.focus({ preventScroll: true });
      replay.hidden = hostControlled || !finished; placeReplay();
      $('play').textContent = s.empty ? t("reproducir") : s.playing ? t("pausar") : s.waiting ? t("continuar") : s.ended ? t("repetir") : t("reproducir");
      for (const id of ['previous', 'next', 'progress']) $(id).disabled = s.empty;
      document.body.classList.toggle('transparent', s.transparent);
      $('caption').textContent = s.empty ? t("inicio_no_hay_etapas_habilitadas") : s.atStart ? t("inicio_clic_o_espacio_para_comenzar") : s.waiting ? t("value_clic_o_espacio_para_continuar", { p0: s.name }) : s.ended ? t("animacion_terminada") : s.name;
      $('time').textContent = `${timeLabel(s.elapsed)} / ${timeLabel(s.total)}`; $('progress').value = s.total ? s.elapsed / s.total * 1000 : 0;
    }
    async function init() {
      const [base, final] = await Promise.all([pixels(data.base), pixels(data.final)]);
      const fields = data.fields.map(f => unpackField(f, data.width * data.height));
      player = makePlayer(canvas, { width: data.width, height: data.height, base, final, fields, initialView: data.initialView, viewAPI: makeView(), manual: integrated }, update);
      $('play').onclick = () => player.toggle(); $('restart').onclick = () => player.restart(); $('next').onclick = () => player.next(); $('previous').onclick = () => player.previous();
      $('progress').oninput = () => player.seek(+$('progress').value / 1000 * player.getState().total);
      canvas.onclick = () => integrated ? input('advance') : player.next();
      $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (_) { $('caption').textContent = t("puedes_usar_f11_para_pantalla_completa"); } };
      document.addEventListener('keydown', e => {
        if (hostControlled) return;
        if (integrated) {
          if (e.ctrlKey || e.altKey || e.metaKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.target.tagName === 'BUTTON' && e.key === ' ') return;
          const command = e.key === 'ArrowRight' || e.key === ' ' ? e.shiftKey ? 'skip' : 'advance' : e.key === 'ArrowLeft' ? 'back' : e.key === 'Home' ? 'restart' : e.key === 'End' ? 'finish' : null;
          if (command) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) input(command); }
          return;
        }
        if (/INPUT|BUTTON/.test(e.target.tagName)) return;
        if (e.key === ' ') { e.preventDefault(); player.toggle(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); player.next(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); player.previous(); }
        if (e.key.toLowerCase() === 'f') $('fullscreen').click();
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden && player.getState().playing) player.pause(); });
      $('play').disabled = !fields.length; $('caption').textContent = fields.length ? t("inicio_clic_en_la_imagen_o_espacio_para_comenzar") : t("inicio_no_hay_etapas_habilitadas");
      send('event', { event: 'ready', state: current });
    }
    init().catch(error => { initializationError = error.message; $('caption').textContent = t("no_se_pudo_abrir_la_presentacion_value", { p0: error.message }); send('event', { event: 'error', error: error.message }); });
  }
  const PRESENTATION_KEYS = ["animacion_terminada", "animation_canvas", "continuar", "etapa_siguiente", "fullscreen", "inicio_clic_en_la_imagen_o_espacio_para_comenzar", "inicio_clic_o_espacio_para_comenzar", "inicio_no_hay_etapas_habilitadas", "loading_images", "mostrar_controles_h", "no_se_pudo_abrir_la_presentacion_value", "ocultar_controles_h", "pausar", "posicion_en_la_animacion", "preparing", "presentation_controls", "presentation_shortcuts", "previous_stage", "puedes_usar_f11_para_pantalla_completa", "repetir", "replay_title", "reproducir", "restart", "restart_animation", "return_initial", "value_clic_o_espacio_para_continuar"];
  function buildPresentation(data) {
    const i18n = root.PaintI18n, language = i18n.resolve(data.language) || 'es';
    const local = root.createPaintI18n({ language, catalogs: { es: i18n.messages('es'), [language]: i18n.messages(language) } }), t = local.t;
    const h = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    data = { ...data, language, ui: i18n.messages(language, PRESENTATION_KEYS) };
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    const settings = root.PaintProject.normalizePresentation(data.presentation), background = settings.background === 'hatch' ? 'repeating-linear-gradient(135deg,#e9ece7 0 6px,#cdd3cb 6px 7px)' : settings.background === 'color' ? settings.color : 'transparent';
    return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(t("replay_title"))}</title><style>*{box-sizing:border-box}body{margin:0;background:${background};background-attachment:fixed;color:#eeeee4;font:13px system-ui,sans-serif;height:100vh;height:100dvh;display:flex;flex-direction:column}body.integrated #controls,body.integrated #controlsToggle{display:none!important}body.host-controlled #finishRestart,body.host-controlled #controls,body.host-controlled #controlsToggle{display:none!important}body.integrated main{padding:0}main{display:flex;align-items:center;justify-content:center;flex:1;min-height:0;padding:20px}canvas{max-width:100%;max-height:100%;object-fit:contain;cursor:pointer;border:0;outline:none;box-shadow:none}footer{position:fixed;inset:auto 0 0;padding:15px 74px 15px 22px;background:#202a24;z-index:2;max-height:100vh;max-height:100dvh;overflow-y:auto;overflow-wrap:anywhere}[hidden]{display:none!important}#finishRestart{position:fixed;z-index:1;display:flex;align-items:center;gap:9px;max-width:calc(100vw - 24px);overflow-wrap:anywhere;min-height:50px;padding:9px 16px;border:2px solid #fff;border-radius:10px;background:#14251e;color:#fff;font-size:14px;font-weight:700;box-shadow:0 0 0 2px #14251e;opacity:0;pointer-events:none}#finishRestart .restart-symbol{flex-shrink:0;font-size:30px;line-height:1}#finishRestart.over-image,#finishRestart:focus-visible{opacity:1;pointer-events:auto}#finishRestart:hover{background:#294b3b}#finishRestart:focus-visible{outline:3px solid #ffc66d;outline-offset:5px}@media(hover:none){#finishRestart{opacity:1;pointer-events:auto}}#controlsToggle{position:fixed;right:16px;bottom:16px;z-index:3;width:42px;height:42px;padding:0;border-radius:50%;border:1px solid #fff8;background:#202a24e8;color:#e9b180;font-size:31px;line-height:1;cursor:pointer}#controlsToggle:hover{background:#3b4c3e}nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}button{color:inherit;font:inherit;background:transparent;border:1px solid #5a665b;border-radius:6px;padding:9px 13px;cursor:pointer}button:hover{background:#3b4c3e}button:focus-visible,input:focus-visible{outline:3px solid #e3b879}#play{background:#e8e6d8;color:#202a24;min-width:100px}#caption{flex:1 1 140px;min-width:0;overflow-wrap:anywhere;font-size:12px}#time{font-size:11px;color:#a4b29d}#progress{width:100%;height:3px;accent-color:#d4a46a;margin:15px 0 8px}small{display:block;color:#a4b29d;font-size:10px;margin-top:7px}@media(max-width:600px){main{padding:8px}footer{padding:12px 70px 12px 12px}nav{gap:6px}button{padding:8px;font-size:11px;max-width:100%;overflow-wrap:anywhere}#caption{order:2;flex-basis:100%}}</style></head><body><main><canvas id="painting" tabindex="0" aria-label="${h(t("animation_canvas"))}"></canvas><button id="finishRestart" hidden aria-label="${h(t("restart_animation"))}" title="${h(t("return_initial"))}"><span class="restart-symbol" aria-hidden="true">↻</span><span>${h(t("restart"))}</span></button></main><button id="controlsToggle" aria-label="${h(t("mostrar_controles_h"))}" title="${h(t("mostrar_controles_h"))}" aria-controls="controls" aria-expanded="false">◒</button><footer id="controls" hidden><nav aria-label="${h(t("presentation_controls"))}"><button id="previous" aria-label="${h(t("previous_stage"))}">←</button><button id="restart">${h(t("restart"))}</button><button id="play" disabled>${h(t("preparing"))}</button><button id="next" aria-label="${h(t("etapa_siguiente"))}">→</button><span id="caption" role="status">${h(t("loading_images"))}</span><span id="time"></span><button id="fullscreen">${h(t("fullscreen"))}</button></nav><input id="progress" type="range" min="0" max="1000" value="0" aria-label="${h(t("posicion_en_la_animacion"))}"><small>${h(t("presentation_shortcuts"))}</small></footer><script>(${presentationBoot.toString()})(${json}, ${root.createPaintPlayer.toString()}, (${root.createPaintCodec.toString()})().unpack, ${root.createPaintView.toString()}, ${root.createPaintI18n.toString()});<\/script></body></html>`;
  }
  root.PaintPresentation = { build: buildPresentation };
})(typeof window === 'undefined' ? globalThis : window);
