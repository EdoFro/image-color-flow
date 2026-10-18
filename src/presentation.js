/* Exportación compartida por el editor y la automatización. */
(function (root) {
  'use strict';
  function presentationBoot(data, makePlayer, unpackField, makeView) {
    const $ = id => document.getElementById(id), canvas = $('painting'); let player;
    const replay = $('finishRestart');
    function placeReplay() {
      if (replay.hidden) return;
      const bounds = canvas.getBoundingClientRect(), width = replay.getBoundingClientRect().width;
      replay.style.left = Math.max(12, Math.min(bounds.right - width - 14, innerWidth - width - 12)) + 'px';
      replay.style.top = Math.max(12, bounds.top + 14) + 'px';
    }
    canvas.parentElement.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const bounds = canvas.getBoundingClientRect();
      replay.classList.toggle('over-image', replay.contains(event.target) || (event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom));
    });
    canvas.parentElement.addEventListener('pointerleave', () => replay.classList.remove('over-image'));
    window.addEventListener('resize', placeReplay);
    replay.onclick = event => { event.stopPropagation(); player?.restart(); };
    function toggleControls() {
      const controls = $('controls'), toggle = $('controlsToggle'), visible = controls.hidden;
      controls.hidden = !visible; toggle.setAttribute('aria-expanded', String(visible));
      toggle.setAttribute('aria-label', visible ? 'Ocultar controles (H)' : 'Mostrar controles (H)'); toggle.title = visible ? 'Ocultar controles (H)' : 'Mostrar controles (H)';
      if (!visible && controls.contains(document.activeElement)) toggle.focus();
    }
    $('controlsToggle').onclick = toggleControls;
    document.addEventListener('keydown', event => {
      if (event.key.toLowerCase() === 'h' && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey && !/TEXTAREA|SELECT/.test(event.target.tagName)) { event.preventDefault(); toggleControls(); }
    });
    const timeLabel = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
    async function pixels(url) { const image = new Image(); image.src = url; await image.decode(); const c = document.createElement('canvas'); c.width = data.width; c.height = data.height; const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, c.width, c.height).data; }
    function update(s) {
      const finished = s.ended && !s.atStart && !s.empty;
      if (!finished && document.activeElement === replay) canvas.focus({ preventScroll: true });
      replay.hidden = !finished; placeReplay();
      $('play').textContent = s.empty ? 'Reproducir' : s.playing ? 'Pausar' : s.waiting ? 'Continuar' : s.ended ? 'Repetir' : 'Reproducir';
      for (const id of ['previous', 'next', 'progress']) $(id).disabled = s.empty;
      document.body.classList.toggle('transparent', s.transparent);
      $('caption').textContent = s.empty ? 'Inicio · no hay etapas habilitadas' : s.atStart ? 'Inicio · clic o espacio para comenzar' : s.waiting ? `${s.name} · clic o espacio para continuar` : s.ended ? 'Animación terminada' : s.name;
      $('time').textContent = `${timeLabel(s.elapsed)} / ${timeLabel(s.total)}`; $('progress').value = s.total ? s.elapsed / s.total * 1000 : 0;
    }
    async function init() {
      const [base, final] = await Promise.all([pixels(data.base), pixels(data.final)]);
      const fields = data.fields.map(f => unpackField(f, data.width * data.height));
      player = makePlayer(canvas, { width: data.width, height: data.height, base, final, fields, initialView: data.initialView, viewAPI: makeView() }, update);
      $('play').onclick = () => player.toggle(); $('restart').onclick = () => player.restart(); $('next').onclick = () => player.next(); $('previous').onclick = () => player.previous();
      $('progress').oninput = () => player.seek(+$('progress').value / 1000 * player.getState().total);
      canvas.onclick = () => player.next();
      $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (_) { $('caption').textContent = 'Puedes usar F11 para pantalla completa.'; } };
      document.addEventListener('keydown', e => {
        if (/INPUT|BUTTON/.test(e.target.tagName)) return;
        if (e.key === ' ') { e.preventDefault(); player.toggle(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); player.next(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); player.previous(); }
        if (e.key.toLowerCase() === 'f') $('fullscreen').click();
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden && player.getState().playing) player.pause(); });
      $('play').disabled = !fields.length; $('caption').textContent = fields.length ? 'Inicio · clic en la imagen o espacio para comenzar' : 'Inicio · no hay etapas habilitadas';
    }
    init().catch(error => { $('caption').textContent = `No se pudo abrir la presentación: ${error.message}`; });
  }
  function buildPresentation(data) {
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    const settings = root.PaintProject.normalizePresentation(data.presentation), background = settings.background === 'hatch' ? 'repeating-linear-gradient(135deg,#e9ece7 0 6px,#cdd3cb 6px 7px)' : settings.background === 'color' ? settings.color : 'transparent';
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tinta y color · Presentación</title><style>*{box-sizing:border-box}body{margin:0;background:${background};background-attachment:fixed;color:#eeeee4;font:13px system-ui,sans-serif;height:100vh;display:flex;flex-direction:column}main{display:flex;align-items:center;justify-content:center;flex:1;min-height:0;padding:20px}canvas{max-width:100%;max-height:100%;object-fit:contain;cursor:pointer;border:0;outline:none;box-shadow:none}footer{position:fixed;inset:auto 0 0;padding:15px 74px 15px 22px;background:#202a24;z-index:2}[hidden]{display:none!important}#finishRestart{position:fixed;z-index:1;display:flex;align-items:center;gap:9px;min-height:50px;padding:9px 16px;border:2px solid #fff;border-radius:10px;background:#14251e;color:#fff;font-size:14px;font-weight:700;box-shadow:0 0 0 2px #14251e;opacity:0;pointer-events:none}#finishRestart .restart-symbol{font-size:30px;line-height:1}#finishRestart.over-image,#finishRestart:focus-visible{opacity:1;pointer-events:auto}#finishRestart:hover{background:#294b3b}#finishRestart:focus-visible{outline:3px solid #ffc66d;outline-offset:5px}@media(hover:none){#finishRestart{opacity:1;pointer-events:auto}}#controlsToggle{position:fixed;right:16px;bottom:16px;z-index:3;width:42px;height:42px;padding:0;border-radius:50%;border:1px solid #fff8;background:#202a24e8;color:#e9b180;font-size:31px;line-height:1;cursor:pointer}#controlsToggle:hover{background:#3b4c3e}nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}button{color:inherit;font:inherit;background:transparent;border:1px solid #5a665b;border-radius:6px;padding:9px 13px;cursor:pointer}button:hover{background:#3b4c3e}button:focus-visible,input:focus-visible{outline:3px solid #e3b879}#play{background:#e8e6d8;color:#202a24;min-width:100px}#caption{flex:1;min-width:140px;font-size:12px}#time{font-size:11px;color:#a4b29d}#progress{width:100%;height:3px;accent-color:#d4a46a;margin:15px 0 8px}small{display:block;color:#a4b29d;font-size:10px;margin-top:7px}@media(max-width:600px){main{padding:8px}footer{padding:12px 70px 12px 12px}nav{gap:6px}button{padding:8px;font-size:11px}#caption{order:2;flex-basis:100%}}</style></head><body><main><canvas id="painting" tabindex="0" aria-label="Animación de pintado progresivo"></canvas><button id="finishRestart" hidden aria-label="Reiniciar animación" title="Volver a Inicio"><span class="restart-symbol" aria-hidden="true">↻</span><span>Reiniciar</span></button></main><button id="controlsToggle" aria-label="Mostrar controles (H)" title="Mostrar controles (H)" aria-controls="controls" aria-expanded="false">◒</button><footer id="controls" hidden><nav aria-label="Controles de presentación"><button id="previous" aria-label="Etapa anterior">←</button><button id="restart">Reiniciar</button><button id="play" disabled>Preparando…</button><button id="next" aria-label="Etapa siguiente">→</button><span id="caption" role="status">Cargando imágenes locales…</span><span id="time"></span><button id="fullscreen">Pantalla completa</button></nav><input id="progress" type="range" min="0" max="1000" value="0" aria-label="Posición en la animación"><small>Clic: iniciar / siguiente etapa · Espacio: reproducir / pausar / continuar · ← →: etapas · F: pantalla completa · H: mostrar / ocultar controles · Sin conexión</small></footer><script>(${presentationBoot.toString()})(${json}, ${root.createPaintPlayer.toString()}, (${root.createPaintCodec.toString()})().unpack, ${root.createPaintView.toString()});<\/script></body></html>`;
  }
  root.PaintPresentation = { build: buildPresentation };
})(typeof window === 'undefined' ? globalThis : window);
