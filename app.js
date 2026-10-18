(function () {
  'use strict';
  const $ = id => document.getElementById(id), engine = window.PaintEngine;
  const canvas = $('canvas'), overlay = $('overlay'), ctx = canvas.getContext('2d'), octx = overlay.getContext('2d');
  const zeroAlignment = () => ({ x: 0, y: 0, sx: 1, sy: 1, angle: 0 });
  let project = { format: 'tinta-y-color', version: 1, resolution: 1080, baseMode: 'uploaded', alignment: zeroAlignment(), images: {}, stages: [engine.normalizeStage()] };
  let decoded = {}, prepared = null, selected = 0, tool = 'point', draft = null, draftDecoded = null;
  let revision = 0, cached = null, player = null, editing = true, dirty = false, busy = false, gesture = null, polygon = [];
  const params = {
    radius: ['radius', 100, v => `${Math.round(v * 100)}%`], speed: ['speed', 100, v => `${Math.round(v * 100)}% / s`],
    clarity: ['clarity', 1, v => `+${v.toFixed(1)}×`], ink: ['ink', 1, v => `+${v.toFixed(1)}×`],
    fade: ['fade', 1, v => `${v.toFixed(2)} s`], wind: ['windStrength', 1, v => v.toFixed(2)],
    direction: ['windAngle', 1, v => `${Math.round(v)}°`], pathSpeed: ['pathSpeed', 100, v => `${Math.round(v * 100)}% / s`], black: ['blackThreshold', 1, v => `${Math.round(v)} / 255`]
  };
  const current = () => project.stages[selected];
  const waitFrame = () => new Promise(resolve => setTimeout(resolve, 30));
  function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function timeLabel(seconds) { if (!Number.isFinite(seconds)) return '—'; const s = Math.round(seconds); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function report(error) { console.error(error); status(error.message || String(error), true); }
  async function action(fn) { if (busy) return; busy = true; document.body.classList.add('busy'); const controls = [...document.querySelectorAll('button,input,select')]; controls.forEach(e => e.disabled = true); try { await fn(); } catch (error) { report(error); } finally { busy = false; document.body.classList.remove('busy'); controls.forEach(e => e.disabled = false); } }
  function destroyPlayer() { if (player) player.destroy(); player = null; }
  function enterEdit() { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); $('viewMode').value = 'edit'; $('playButton').textContent = '▶'; $('playButton').setAttribute('aria-label', 'Reproducir'); $('playStatus').textContent = 'Listo para explorar'; drawEditor(); }
  function invalidate() { revision++; cached = null; dirty = true; $('estimate').textContent = 'Por calcular'; $('timeLabel').textContent = '0:00 / —'; $('timeline').value = 0; enterEdit(); }
  function fitCanvas() {
    if (!prepared) return;
    const area = $('canvasArea'), padding = innerWidth <= 600 ? 24 : 40;
    const maxWidth = Math.max(10, area.clientWidth - padding), maxHeight = Math.max(10, area.clientHeight - padding);
    const ratio = Math.min(maxWidth / prepared.width, maxHeight / prepared.height);
    $('canvasWrap').style.width = `${prepared.width * ratio}px`; $('canvasWrap').style.height = `${prepared.height * ratio}px`;
    drawOverlay();
  }
  function drawEditor() {
    if (!prepared || !editing) return;
    const mode = $('viewMode').value;
    ctx.drawImage(mode === 'initial' ? prepared.baseCanvas : prepared.finalCanvas, 0, 0);
    overlay.classList.toggle('hidden', mode !== 'edit'); drawOverlay();
  }
  function drawOverlay() {
    if (!prepared) return;
    const w = overlay.width, h = overlay.height, stage = current(), scale = w / Math.max(100, overlay.clientWidth);
    octx.clearRect(0, 0, w, h); if (!editing || $('viewMode').value !== 'edit') return;
    function trace(points, close = false) { if (!points.length) return; octx.beginPath(); points.forEach((p, i) => i ? octx.lineTo(p.x * w, p.y * h) : octx.moveTo(p.x * w, p.y * h)); if (close) octx.closePath(); }
    const zone = gesture?.kind === 'rect' ? rectPoints(gesture.start, gesture.end) : stage.zone;
    if (zone) {
      octx.save(); octx.beginPath(); octx.rect(0, 0, w, h); zone.forEach((p, i) => i ? octx.lineTo(p.x * w, p.y * h) : octx.moveTo(p.x * w, p.y * h)); octx.closePath(); octx.fillStyle = '#14251d70'; octx.fill('evenodd'); octx.restore();
      trace(zone, true); octx.strokeStyle = '#f6d697'; octx.lineWidth = 1.5 * scale; octx.setLineDash([5 * scale, 4 * scale]); octx.stroke(); octx.setLineDash([]);
    }
    const theta = stage.windAngle * Math.PI / 180;
    for (const p of stage.points) {
      octx.beginPath();
      for (let k = 0; k <= 100; k++) { const a = k / 100 * Math.PI * 2, r = stage.radius * w * Math.exp(stage.windStrength * Math.cos(a - theta)); const x = p.x * w + Math.cos(a) * r, y = p.y * h + Math.sin(a) * r; if (!k) octx.moveTo(x, y); else octx.lineTo(x, y); }
      octx.strokeStyle = '#bd693caa'; octx.lineWidth = scale; octx.setLineDash([4 * scale, 5 * scale]); octx.stroke(); octx.setLineDash([]);
    }
    const path = gesture?.kind === 'path' ? gesture.path : stage.path;
    if (path.length) { trace(path); octx.strokeStyle = '#3b6d81'; octx.lineWidth = 3 * scale; octx.lineJoin = 'round'; octx.lineCap = 'round'; octx.stroke(); const p = path[0]; octx.beginPath(); octx.arc(p.x * w, p.y * h, 5 * scale, 0, Math.PI * 2); octx.fillStyle = '#3b6d81'; octx.fill(); }
    stage.points.forEach((p, i) => {
      const x = p.x * w, y = p.y * h;
      octx.beginPath(); octx.arc(x, y, 10 * scale, 0, Math.PI * 2); octx.fillStyle = '#fff9ee'; octx.fill(); octx.lineWidth = 2 * scale; octx.strokeStyle = '#bd592e'; octx.stroke(); octx.fillStyle = '#954627'; octx.font = `bold ${10 * scale}px sans-serif`; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(String(i + 1), x, y);
    });
    if (polygon.length) { trace(polygon); octx.strokeStyle = '#bd592e'; octx.lineWidth = 2 * scale; octx.stroke(); for (const p of polygon) { octx.fillStyle = '#bd592e'; octx.fillRect(p.x * w - 3 * scale, p.y * h - 3 * scale, 6 * scale, 6 * scale); } }
    if (stage.windStrength) {
      octx.save(); octx.translate(w - 36 * scale, 36 * scale); octx.rotate(theta); octx.beginPath(); octx.moveTo(-15 * scale, 0); octx.lineTo(15 * scale, 0); octx.lineTo(7 * scale, -6 * scale); octx.moveTo(15 * scale, 0); octx.lineTo(7 * scale, 6 * scale); octx.strokeStyle = '#bd592e'; octx.lineWidth = 2.5 * scale; octx.stroke(); octx.restore();
    }
  }
  function rectPoints(a, b) { return [{ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }, { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) }, { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }, { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) }]; }
  function renderStages() {
    $('stageList').replaceChildren();
    project.stages.forEach((stage, i) => {
      const card = document.createElement('div'); card.className = `stage-card${i === selected ? ' selected' : ''}`;
      const number = document.createElement('span'); number.className = 'stage-number'; number.textContent = String(i + 1).padStart(2, '0'); card.append(number);
      const select = document.createElement('button'); select.className = 'stage-select'; select.setAttribute('aria-pressed', String(i === selected));
      const name = document.createElement('strong'); name.textContent = stage.name; const sub = document.createElement('small'); sub.textContent = `${stage.points.length} ${stage.points.length === 1 ? 'punto' : 'puntos'}${stage.path.length ? ' + recorrido' : ''} · ${stage.pauseAfter ? 'con pausa' : 'continua'}`; select.append(name, sub);
      select.onclick = () => { selected = i; polygon = []; enterEdit(); renderStages(); updateInspector(); }; card.append(select);
      const order = document.createElement('div'); order.className = 'stage-order';
      for (const [delta, text] of [[-1, '↑'], [1, '↓']]) {
        const b = document.createElement('button'); b.textContent = text; b.title = delta < 0 ? 'Mover antes' : 'Mover después'; b.setAttribute('aria-label', `${b.title}: ${stage.name}`);
        b.onclick = () => { const j = i + delta; if (j < 0 || j >= project.stages.length) return; [project.stages[i], project.stages[j]] = [project.stages[j], project.stages[i]]; selected = j; invalidate(); renderStages(); updateInspector(); }; order.append(b);
      }
      card.append(order); $('stageList').append(card);
    });
    $('canvasTitle').textContent = current().name;
  }
  function updateInspector() {
    const stage = current(); $('stageName').value = stage.name;
    for (const [id, [key, multiplier, format]] of Object.entries(params)) { $(id).value = stage[key] * multiplier; $(`${id}Out`).textContent = format(stage[key]); }
    $('pauseAfter').checked = stage.pauseAfter; $('windSummary').textContent = stage.windStrength ? `${Math.round(stage.windAngle)}° · ${stage.windStrength.toFixed(2)}` : 'Sin viento';
    $('pointCount').textContent = stage.points.length; $('pointList').replaceChildren();
    stage.points.forEach((p, i) => { const b = document.createElement('button'); b.className = 'point-chip'; b.textContent = `${i + 1} · ${Math.round(p.x * 100)}, ${Math.round(p.y * 100)} ×`; b.title = `Eliminar punto ${i + 1}`; b.onclick = () => { stage.points.splice(i, 1); invalidate(); updateInspector(); renderStages(); }; $('pointList').append(b); });
    $('pathInfo').textContent = stage.path.length ? `Recorrido trazado · ${stage.path.length} vértices. El pincel deja color a su paso.` : 'Sin recorrido de pincel.';
    if (cached) $('estimate').textContent = `${cached.fields[selected].duration.toFixed(1)} s / ${cached.fields.reduce((s, f) => s + f.duration, 0).toFixed(1)} s total`;
  }
  function setTool(next) {
    tool = next; polygon = []; gesture = null; enterEdit();
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    const hints = { point: 'Haz clic para añadir un punto; arrástralo para moverlo.', rect: 'Arrastra para delimitar la zona de esta etapa.', polygon: 'Clic para añadir vértices · Enter o doble clic para cerrar · Escape para cancelar.', path: 'Arrastra para dibujar el recorrido. Sustituye el recorrido anterior.' }; $('toolHint').textContent = hints[tool]; drawOverlay();
  }
  function position(event) { const r = overlay.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)) }; }
  function finishPolygon() {
    if (polygon.length < 3) { status('Marca al menos tres vértices para cerrar la zona.'); return; }
    // El doble clic puede repetir el último vértice: la geometría sigue siendo válida.
    current().zone = polygon.slice(); polygon = []; invalidate(); status('Zona delimitada.');
  }
  overlay.addEventListener('pointerdown', e => {
    if (busy || !prepared || !editing || $('viewMode').value !== 'edit' || e.button !== 0) return;
    e.preventDefault(); overlay.focus(); const p = position(e); overlay.setPointerCapture(e.pointerId);
    if (tool === 'polygon') { polygon.push(p); drawOverlay(); return; }
    if (tool === 'rect') gesture = { kind: 'rect', start: p, end: p };
    if (tool === 'path') gesture = { kind: 'path', path: [p] };
    if (tool === 'point') {
      const r = overlay.getBoundingClientRect(); let index = current().points.findIndex(q => Math.hypot((q.x - p.x) * r.width, (q.y - p.y) * r.height) < 16);
      if (index === -1) { if (current().points.length >= 64) { status('Máximo de 64 puntos por etapa.', true); return; } index = current().points.push(p) - 1; }
      gesture = { kind: 'point', index, original: { ...current().points[index] } }; current().points[index] = p;
    }
    drawOverlay();
  });
  overlay.addEventListener('pointermove', e => {
    if (!gesture) return; const p = position(e);
    if (gesture.kind === 'rect') gesture.end = p;
    if (gesture.kind === 'point') current().points[gesture.index] = p;
    if (gesture.kind === 'path') { const last = gesture.path[gesture.path.length - 1]; if (Math.hypot((p.x - last.x) * prepared.width, (p.y - last.y) * prepared.height) > 3 && gesture.path.length < 2000) gesture.path.push(p); }
    drawOverlay();
  });
  function finishGesture(cancel = false) {
    if (!gesture) return;
    if (!cancel) {
      if (gesture.kind === 'rect') { const a = gesture.start, b = gesture.end; if (Math.abs(a.x - b.x) > .005 && Math.abs(a.y - b.y) > .005) current().zone = rectPoints(a, b); }
      if (gesture.kind === 'path') current().path = gesture.path;
    } else if (gesture.kind === 'point') current().points[gesture.index] = gesture.original;
    gesture = null; invalidate(); updateInspector(); renderStages();
  }
  overlay.addEventListener('pointerup', () => finishGesture()); overlay.addEventListener('pointercancel', () => finishGesture(true));
  overlay.addEventListener('dblclick', () => { if (tool === 'polygon' && !busy) finishPolygon(); });
  overlay.addEventListener('keydown', e => { if (e.key === 'Enter' && polygon.length) { e.preventDefault(); finishPolygon(); } if (e.key === 'Escape') { polygon = []; finishGesture(true); drawOverlay(); } });
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  $('clearZone').onclick = () => { current().zone = null; polygon = []; invalidate(); };
  $('clearPath').onclick = () => { current().path = []; invalidate(); updateInspector(); renderStages(); };
  for (const [id, [key, multiplier]] of Object.entries(params)) $(id).addEventListener('input', () => { current()[key] = +$(id).value / multiplier; invalidate(); updateInspector(); });
  $('stageName').addEventListener('input', () => { current().name = $('stageName').value || `Etapa ${selected + 1}`; invalidate(); renderStages(); });
  $('pauseAfter').onchange = () => { current().pauseAfter = $('pauseAfter').checked; invalidate(); renderStages(); };
  $('addStage').onclick = () => { if (project.stages.length >= 64) { status('Máximo de 64 etapas por proyecto.', true); return; } project.stages.push(engine.normalizeStage({}, project.stages.length)); selected = project.stages.length - 1; invalidate(); renderStages(); updateInspector(); };
  $('duplicateStage').onclick = () => { if (project.stages.length >= 64) return; project.stages.splice(selected + 1, 0, engine.normalizeStage({ ...structuredClone(current()), name: `${current().name} · copia` })); selected++; invalidate(); renderStages(); updateInspector(); };
  $('deleteStage').onclick = () => { if (project.stages.length === 1) { status('El proyecto necesita al menos una etapa.'); return; } project.stages.splice(selected, 1); selected = Math.min(selected, project.stages.length - 1); invalidate(); renderStages(); updateInspector(); };
  $('viewMode').onchange = () => { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); drawEditor(); };
  $('editButton').onclick = () => enterEdit();

  async function prepareProject() {
    if (!decoded.final) throw new Error('Carga primero una imagen final coloreada.');
    await waitFrame(); prepared = PaintPreparation.prepare(decoded.final, decoded.initial, project);
    canvas.width = overlay.width = prepared.width; canvas.height = overlay.height = prepared.height;
    $('dimensions').textContent = `${prepared.width} × ${prepared.height} px`; $('emptyState').hidden = true;
    invalidate(); fitCanvas(); renderStages(); updateInspector(); drawEditor();
  }
  async function calculateFields() {
    if (!prepared) throw new Error('Carga primero una imagen.');
    if (cached && cached.revision === revision) return cached.fields;
    if (polygon.length) throw new Error('Termina la zona con Enter o cancélala con Escape antes de reproducir.');
    const { width, height } = prepared, rgba = new Uint8ClampedArray(prepared.final.data), stages = structuredClone(project.stages);
    status('Calculando la propagación…'); await waitFrame();
    const fields = [];
    const source = `const engine = (${window.createPaintEngine.toString()})(); onmessage = function(event) { try { const p = event.data; for (let i = 0; i < p.stages.length; i++) { const result = engine.compute({width:p.width,height:p.height,rgba:p.rgba,stage:p.stages[i]}); postMessage({type:'field',index:i,result},[result.times.buffer]); } postMessage({type:'done'}); } catch(error) { postMessage({type:'error',message:error.message}); } };`;
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      await new Promise((resolve, reject) => {
        let worker;
        try { worker = new Worker(url); } catch (error) { reject(new Error(`El navegador no permite calcular en segundo plano: ${error.message}. Prueba Chrome o Edge.`)); return; }
        worker.onmessage = ({ data }) => {
          if (data.type === 'field') { fields[data.index] = data.result; status(`Calculada ${data.index + 1} de ${stages.length}: ${stages[data.index].name}`); }
          if (data.type === 'done') { worker.terminate(); resolve(); }
          if (data.type === 'error') { worker.terminate(); reject(new Error(data.message)); }
        };
        worker.onerror = event => { worker.terminate(); reject(new Error(event.message || 'No se pudo calcular la propagación.')); };
        worker.postMessage({ width, height, rgba, stages }, [rgba.buffer]);
      });
    } finally { URL.revokeObjectURL(url); }
    cached = { revision, fields }; updateInspector();
    const reached = fields.reduce((sum, f) => sum + f.reached, 0), skipped = fields.reduce((sum, f) => sum + f.ignoredSeeds, 0);
    status(`Propagación lista · ${fields.reduce((s, f) => s + f.duration, 0).toFixed(1)} s de animación${skipped ? ' · Hay puntos o tramos fuera de sus zonas; no emiten color.' : ''}${reached ? '' : ' · No se alcanzaron píxeles.'}`);
    return fields;
  }
  function playerState(s) {
    $('playButton').textContent = s.playing ? 'Ⅱ' : '▶'; $('playButton').setAttribute('aria-label', s.playing ? 'Pausar' : 'Reproducir o continuar');
    $('playStatus').textContent = s.ended ? 'Animación terminada' : s.waiting ? 'Pausa · clic en ▶ o espacio para continuar' : `${s.name}${s.playing ? '' : ' · detenida'}`;
    $('timeLabel').textContent = `${timeLabel(s.elapsed)} / ${timeLabel(s.total)}`; $('timeline').value = s.total ? Math.round(s.elapsed / s.total * 1000) : 0;
  }
  async function ensurePlayer() {
    if (player) return player;
    const fields = await calculateFields(); editing = false; overlay.classList.add('hidden'); document.body.classList.add('presenting');
    player = window.createPaintPlayer(canvas, { width: prepared.width, height: prepared.height, base: prepared.base.data, final: prepared.final.data, fields }, playerState); return player;
  }
  $('playButton').onclick = () => action(async () => { (await ensurePlayer()).toggle(); });
  $('restartButton').onclick = () => action(async () => { (await ensurePlayer()).restart(); });
  $('nextButton').onclick = () => action(async () => { (await ensurePlayer()).next(); });
  $('timeline').addEventListener('input', () => { if (player) player.seek(+$('timeline').value / 1000 * player.getState().total); });
  $('canvasArea').addEventListener('click', () => { if (!editing && player?.getState().waiting) player.play(); });
  document.addEventListener('keydown', e => {
    if (busy || $('imagesDialog').open || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    if (e.key === ' ' && !(polygon.length || gesture)) { e.preventDefault(); action(async () => { (await ensurePlayer()).toggle(); }); }
    if (e.key === 'ArrowRight' && player) { e.preventDefault(); player.next(); }
    if (e.key === 'ArrowLeft' && player) { e.preventDefault(); player.previous(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && player?.getState().playing) player.pause(); });

  function fillImageDialog() {
    $('finalName').textContent = draft.images.final?.name || 'Sin imagen'; $('initialName').textContent = draft.images.initial?.name || 'No se necesita si generas la base desde la final';
    $('baseMode').value = draft.baseMode; $('resolution').value = draft.resolution;
    for (const [id, key, scale] of [['alignX', 'x', 100], ['alignY', 'y', 100], ['alignSX', 'sx', 100], ['alignSY', 'sy', 100], ['alignAngle', 'angle', 1]]) $(id).value = +(draft.alignment[key] * scale).toFixed(3);
    previewAlignment();
  }
  function previewAlignment() {
    if (!draftDecoded?.final) return;
    const p = PaintPreparation.prepare(draftDecoded.final, draftDecoded.initial, { ...draft, resolution: 380 }), c = $('alignPreview');
    c.width = p.width; c.height = p.height; const context = c.getContext('2d'); context.drawImage(p.baseCanvas, 0, 0); context.globalAlpha = .5; context.drawImage(p.finalCanvas, 0, 0); context.globalAlpha = 1;
  }
  $('imagesButton').onclick = () => { player?.pause(); draft = structuredClone(project); draftDecoded = { ...decoded }; $('finalFile').value = $('initialFile').value = ''; fillImageDialog(); $('imagesDialog').showModal(); };
  function readFile(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo leer el archivo.')); reader.readAsDataURL(file); });
  }
  for (const kind of ['initial', 'final']) $(`${kind}File`).onchange = () => action(async () => {
    const file = $(`${kind}File`).files[0]; if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif|bmp|avif)$/.test(file.type)) throw new Error('Utiliza una imagen PNG, JPG, WebP, GIF, BMP o AVIF.');
    if (file.size > 40000000) throw new Error('Utiliza una imagen de menos de 40 MB.');
    const data = await readFile(file), image = await PaintPreparation.loadImage(data);
    draft.images[kind] = { name: file.name, data }; draftDecoded[kind] = image;
    if (kind === 'final' && !draftDecoded.initial) draft.baseMode = 'derived';
    draft.alignment = zeroAlignment(); fillImageDialog(); status(`Imagen cargada: ${file.name}. Aplica para actualizar el lienzo.`);
  });
  $('baseMode').onchange = () => { draft.baseMode = $('baseMode').value; previewAlignment(); };
  $('resolution').onchange = () => { draft.resolution = +$('resolution').value; };
  for (const [id, key, scale] of [['alignX', 'x', 100], ['alignY', 'y', 100], ['alignSX', 'sx', 100], ['alignSY', 'sy', 100], ['alignAngle', 'angle', 1]]) $(id).oninput = () => {
    const value = +$(id).value; if (!Number.isFinite(value) || value < +$(id).min || value > +$(id).max) return; draft.alignment[key] = value / scale; previewAlignment();
  };
  $('autoAlign').onclick = () => action(async () => {
    if (!draftDecoded.initial || !draftDecoded.final) throw new Error('Carga las dos imágenes para alinearlas.');
    status('Buscando coincidencias en los contornos…'); await waitFrame(); draft.alignment = PaintPreparation.autoAlign(draftDecoded.final, draftDecoded.initial); fillImageDialog(); status('Alineación automática calculada. Revisa la superposición y aplica los cambios.');
  });
  $('applyImages').onclick = () => action(async () => {
    if (!draftDecoded.final) throw new Error('Carga primero una imagen final coloreada.');
    if (!draftDecoded.initial) draft.baseMode = 'derived';
    if (!Array.from($('imagesDialog').querySelectorAll('input[type=number]')).every(i => i.checkValidity())) throw new Error('Revisa los valores de alineación: hay un campo fuera de rango.');
    project = draft; decoded = draftDecoded; await prepareProject(); $('imagesDialog').close(); status('Imágenes preparadas. En modo Editar se muestra la referencia coloreada.');
  });
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  $('saveButton').onclick = () => { if (!prepared) return; download('proyecto-tinta-y-color.colorflow.json', JSON.stringify(project), 'application/json'); dirty = false; status('Proyecto descargado. Conserva este archivo para seguir editando.'); };
  $('openButton').onclick = () => $('projectFile').click();
  function validateProject(data) {
    if (data.format !== 'tinta-y-color' || data.version !== 1 || !data.images?.final?.data || !Array.isArray(data.stages) || !data.stages.length || data.stages.length > 64) throw new Error('El archivo no es un proyecto compatible de Tinta y color.');
    const images = {};
    for (const kind of ['final', 'initial']) if (data.images[kind]) {
      const image = data.images[kind]; if (typeof image.data !== 'string' || image.data.length > 60000000 || !/^data:image\/(png|jpeg|webp|gif|bmp|avif);base64,/.test(image.data)) throw new Error('El proyecto contiene una imagen no compatible.');
      images[kind] = { name: String(image.name || kind).slice(0, 200), data: image.data };
    }
    const alignment = zeroAlignment(), a = data.alignment || {};
    for (const key of Object.keys(alignment)) { const n = +a[key]; if (Number.isFinite(n)) alignment[key] = key === 'sx' || key === 'sy' ? Math.max(.7, Math.min(1.3, n)) : key === 'angle' ? Math.max(-10, Math.min(10, n)) : Math.max(-.3, Math.min(.3, n)); }
    return { format: 'tinta-y-color', version: 1, images, alignment, baseMode: data.baseMode === 'uploaded' && images.initial ? 'uploaded' : 'derived', resolution: [720, 1080, 1440].includes(data.resolution) ? data.resolution : 1080, stages: data.stages.map(engine.normalizeStage) };
  }
  $('projectFile').onchange = () => action(async () => {
    const file = $('projectFile').files[0]; $('projectFile').value = ''; if (!file) return;
    if (file.size > 150000000) throw new Error('El archivo de proyecto es demasiado grande (máximo 150 MB).');
    const next = validateProject(JSON.parse(await file.text())), images = { final: await PaintPreparation.loadImage(next.images.final.data) };
    if (next.images.initial) images.initial = await PaintPreparation.loadImage(next.images.initial.data);
    project = next; decoded = images; selected = 0; polygon = []; await prepareProject(); dirty = false; status('Proyecto abierto. Puedes continuar editando.');
  });
  function bytesToBase64(bytes) { let result = ''; for (let i = 0; i < bytes.length; i += 24576) result += String.fromCharCode(...bytes.subarray(i, i + 24576)); return btoa(result); }
  function packField(field) {
    const values = new Uint16Array(field.times.length), scale = field.duration / 65534;
    for (let i = 0; i < values.length; i++) values[i] = Number.isFinite(field.times[i]) ? Math.min(65534, Math.round(field.times[i] / scale)) : 65535;
    // Orden de bytes explícito: la exportación no depende de la arquitectura del equipo.
    const bytes = new Uint8Array(values.length * 2); for (let i = 0; i < values.length; i++) { bytes[i * 2] = values[i] & 255; bytes[i * 2 + 1] = values[i] >> 8; }
    return { data: bytesToBase64(bytes), scale, duration: field.duration, fade: field.fade, name: field.name, pauseAfter: field.pauseAfter };
  }
  $('exportButton').onclick = () => action(async () => {
    const fields = await calculateFields(); player?.pause(); status('Empaquetando la presentación sin conexión…'); await waitFrame();
    const data = { width: prepared.width, height: prepared.height, base: prepared.baseCanvas.toDataURL('image/png'), final: prepared.finalCanvas.toDataURL('image/png'), fields: fields.map(packField) };
    download('presentacion-tinta-y-color.html', buildPresentation(data), 'text/html;charset=utf-8'); status('Presentación descargada: un solo HTML con imágenes y animaciones incluidas. Se abre sin conexión.');
  });
  function presentationBoot(data, makePlayer) {
    const $ = id => document.getElementById(id), canvas = $('painting'); let player;
    const timeLabel = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
    async function pixels(url) { const image = new Image(); image.src = url; await image.decode(); const c = document.createElement('canvas'); c.width = data.width; c.height = data.height; const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, c.width, c.height).data; }
    function update(s) {
      $('play').textContent = s.playing ? 'Pausar' : s.waiting ? 'Continuar' : s.ended ? 'Repetir' : 'Reproducir';
      $('caption').textContent = s.waiting ? `${s.name} · clic o espacio para continuar` : s.ended ? 'Animación terminada' : s.name;
      $('time').textContent = `${timeLabel(s.elapsed)} / ${timeLabel(s.total)}`; $('progress').value = s.total ? s.elapsed / s.total * 1000 : 0;
    }
    async function init() {
      const [base, final] = await Promise.all([pixels(data.base), pixels(data.final)]);
      const fields = data.fields.map(f => { const raw = atob(f.data), times = new Float32Array(data.width * data.height); for (let i = 0; i < times.length; i++) { const value = raw.charCodeAt(i * 2) | raw.charCodeAt(i * 2 + 1) << 8; times[i] = value === 65535 ? Infinity : value * f.scale; } return { ...f, data: undefined, times }; });
      player = makePlayer(canvas, { width: data.width, height: data.height, base, final, fields }, update);
      $('play').onclick = () => player.toggle(); $('restart').onclick = () => player.restart(); $('next').onclick = () => player.next(); $('previous').onclick = () => player.previous();
      $('progress').oninput = () => player.seek(+$('progress').value / 1000 * player.getState().total);
      canvas.onclick = () => player.toggle();
      $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (_) { $('caption').textContent = 'Puedes usar F11 para pantalla completa.'; } };
      document.addEventListener('keydown', e => {
        if (/INPUT|BUTTON/.test(e.target.tagName)) return;
        if (e.key === ' ') { e.preventDefault(); player.toggle(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); player.next(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); player.previous(); }
        if (e.key.toLowerCase() === 'f') $('fullscreen').click();
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden && player.getState().playing) player.pause(); });
      $('play').disabled = false; $('caption').textContent = 'Listo · clic en la imagen o espacio para comenzar';
    }
    init().catch(error => { $('caption').textContent = `No se pudo abrir la presentación: ${error.message}`; });
  }
  function buildPresentation(data) {
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tinta y color · Presentación</title><style>*{box-sizing:border-box}body{margin:0;background:#151d19;color:#eeeee4;font:13px system-ui,sans-serif;height:100vh;display:flex;flex-direction:column}main{display:flex;align-items:center;justify-content:center;flex:1;min-height:0;padding:20px}canvas{max-width:100%;max-height:100%;object-fit:contain;cursor:pointer;box-shadow:0 10px 60px #0005}footer{padding:15px 22px;background:#202a24}nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}button{color:inherit;font:inherit;background:transparent;border:1px solid #5a665b;border-radius:6px;padding:9px 13px;cursor:pointer}button:hover{background:#3b4c3e}button:focus-visible,input:focus-visible{outline:3px solid #e3b879}#play{background:#e8e6d8;color:#202a24;min-width:100px}#caption{flex:1;min-width:140px;font-size:12px}#time{font-size:11px;color:#a4b29d}#progress{width:100%;height:3px;accent-color:#d4a46a;margin:15px 0 8px}small{display:block;color:#a4b29d;font-size:10px;margin-top:7px}@media(max-width:600px){main{padding:8px}footer{padding:12px}nav{gap:6px}button{padding:8px;font-size:11px}#caption{order:2;flex-basis:100%}}</style></head><body><main><canvas id="painting" aria-label="Animación de pintado progresivo"></canvas></main><footer><nav><button id="previous" aria-label="Etapa anterior">←</button><button id="restart">Reiniciar</button><button id="play" disabled>Preparando…</button><button id="next" aria-label="Etapa siguiente">→</button><span id="caption" role="status">Cargando imágenes locales…</span><span id="time"></span><button id="fullscreen">Pantalla completa</button></nav><input id="progress" type="range" min="0" max="1000" value="0" aria-label="Posición en la animación"><small>Espacio: reproducir / pausar / continuar · ← →: etapas · F: pantalla completa · Sin conexión</small></footer><script>(${presentationBoot.toString()})(${json}, ${window.createPaintPlayer.toString()});<\/script></body></html>`;
  }
  async function loadDemo() {
    if (!window.PAINT_DEMO) throw new Error('No se encontró el ejemplo. Puedes cargar tus imágenes con el botón Imágenes.');
    const images = window.PAINT_DEMO;
    const decodedDemo = { final: await PaintPreparation.loadImage(images.final.data), initial: await PaintPreparation.loadImage(images.initial.data) };
    const makeRect = (x, y, r, b) => rectPoints({ x, y }, { x: r, y: b });
    project = { format: 'tinta-y-color', version: 1, images: structuredClone(images), resolution: 1080, baseMode: 'uploaded', alignment: zeroAlignment(), stages: [
      engine.normalizeStage({ name: 'Primeros encuentros', zone: makeRect(.064, .035, .963, .287), points: [{ x: .75, y: .17 }, { x: .4, y: .17 }, { x: .16, y: .17 }], radius: .22, speed: .13, pauseAfter: true }),
      engine.normalizeStage({ name: 'La escena central', zone: makeRect(.064, .293, .963, .659), points: [{ x: .48, y: .47 }, { x: .88, y: .5 }, { x: .18, y: .5 }], radius: .35, speed: .13, windStrength: .35, windAngle: 20, pauseAfter: true }),
      engine.normalizeStage({ name: 'El cierre de la página', zone: makeRect(.064, .665, .963, .948), points: [{ x: .79, y: .8 }, { x: .43, y: .81 }, { x: .15, y: .8 }], radius: .25, speed: .13 })
    ] };
    decoded = decodedDemo; selected = 0; polygon = []; status('Alineando las imágenes del ejemplo…'); await waitFrame(); project.alignment = PaintPreparation.autoAlign(decoded.final, decoded.initial);
    await prepareProject(); dirty = false; status('Ejemplo listo · Marca un origen, ajusta los parámetros y pulsa reproducir.');
  }
  $('exampleButton').onclick = () => action(loadDemo);
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  new ResizeObserver(fitCanvas).observe($('canvasArea'));
  // Interfaz de diagnóstico local, útil para comprobar exportaciones sin dependencias.
  window.TintaColor = { getProject: () => structuredClone(project), getPrepared: () => prepared, calculateFields, buildPresentation, packField, validateProject, getPlayer: () => player, getRevision: () => revision };
  renderStages(); updateInspector(); action(loadDemo);
})();
