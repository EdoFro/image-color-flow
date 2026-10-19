(function () {
  'use strict';
  const $ = id => document.getElementById(id), engine = window.PaintEngine;
  const canvas = $('canvas'), overlay = $('overlay'), ctx = canvas.getContext('2d'), octx = overlay.getContext('2d');
  const zeroAlignment = () => ({ x: 0, y: 0, sx: 1, sy: 1, angle: 0 });
  const presentationDefaults = () => ({ background: 'hatch', color: '#e5e7e3' });
  const normalizePresentation = value => window.PaintProject.normalizePresentation(value);
  let project = { format: 'tinta-y-color', version: 7, baseGeneration: window.PaintBase.normalize(), presentation: presentationDefaults(), initialView: engine.normalizeView(), resolution: 1080, baseMode: 'uploaded', alignment: zeroAlignment(), images: {}, stages: [engine.normalizeStage({ maxRadius: .4 })] };
  let decoded = {}, prepared = null, selected = 0, tool = 'point', draft = null, draftDecoded = null;
  let selectedPoint = 0, radiusHandles = [];
  let generalDraft = {}, generalReview = null;
  let selectionDraft = {}, stageSelection = new Set([project.stages[0]]);
  const generalInvalid = new Set();
  const general = window.PaintGeneral;
  const viewRenderer = window.PaintView.createRenderer();
  let revision = 0, cached = null, player = null, editing = true, dirty = false, busy = false, gesture = null, polygon = [];
  const params = {
    radius: ['radius', 100, v => `${Math.round(v * 100)}%`], speed: ['speed', 100, v => `${Math.round(v * 100)}% / s`],
    maxRadius: ['maxRadius', 100, v => `${Math.round(v * 100)}%`], hue: ['hueResistance', 1, v => `+${v.toFixed(1)}×`], cameraDuration: ['cameraDuration', 1, v => `${v.toFixed(1)} s`], hold: ['hold', 1, v => `${v.toFixed(1)} s`], paintDelay: ['paintDelay', 1, v => `${v.toFixed(1)} s`],
    clarity: ['clarity', 1, v => `+${v.toFixed(1)}×`], ink: ['ink', 1, v => `+${v.toFixed(1)}×`],
    fade: ['fade', 1, v => `${v.toFixed(2)} s`], wind: ['windStrength', 1, v => v.toFixed(2)],
    direction: ['windAngle', 1, v => `${Math.round(v)}°`], pathSpeed: ['pathSpeed', 100, v => `${Math.round(v * 100)}% / s`], black: ['blackThreshold', 1, v => `${Math.round(v)} / 255`]
  };
  const isInitial = () => selected === -1;
  const isGeneral = () => selected === -2;
  const isMultiple = () => selected >= 0 && stageSelection.size > 1;
  const isBulk = () => isGeneral() || isMultiple();
  const bulkDraft = () => isGeneral() ? generalDraft : selectionDraft;
  const bulkProject = () => isGeneral() ? project : general.scope(project, project.stages.filter(stage => stageSelection.has(stage)));
  const includeInitial = () => isGeneral() && $('includeInitial').checked;
  function clearBulkDraft() { if (isGeneral()) generalDraft = {}; else selectionDraft = {}; }
  const current = () => selected < 0 ? project.initialView : project.stages[selected];
  const waitFrame = () => new Promise(resolve => setTimeout(resolve, 30));
  function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function timeLabel(seconds) { if (!Number.isFinite(seconds)) return '—'; const s = Math.round(seconds); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function report(error) { console.error(error); status(error.message || String(error), true); }
  async function action(fn) { if (busy) return; busy = true; document.body.classList.add('busy'); const controls = [...document.querySelectorAll('button,input,select')].map(e => [e, e.disabled]); controls.forEach(([e]) => e.disabled = true); try { await fn(); } catch (error) { report(error); } finally { busy = false; document.body.classList.remove('busy'); controls.forEach(([e, disabled]) => e.disabled = disabled); if ($('imagesDialog').open) { syncBaseControls(); $('downloadBase').disabled = !basePreviewGenerated; } if (player) playerState(player.getState()); } }
  function destroyPlayer() { if (player) player.destroy(); player = null; }
  function enterEdit() { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); $('viewMode').value = 'edit'; $('playButton').textContent = '▶'; $('playButton').setAttribute('aria-label', 'Reproducir'); $('playStatus').textContent = 'Listo para explorar'; $('playButton').disabled = false; $('nextButton').disabled = false; drawEditor(); }
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
    const mode = $('viewMode').value, config = current();
    const source = isInitial() || mode === 'initial' ? prepared.baseCanvas : prepared.finalCanvas;
    const options = mode === 'initial' || isGeneral() ? {} : config, view = mode === 'frame' && !isGeneral() ? PaintView.target(config) : PaintView.full();
    const transparent = viewRenderer.draw(ctx, source, prepared.width, prepared.height, options, view);
    $('canvasWrap').classList.toggle('transparent', transparent);
    overlay.classList.toggle('hidden', mode !== 'edit' || isBulk()); drawOverlay();
  }
  function drawOverlay() {
    if (!prepared) return;
    const w = overlay.width, h = overlay.height, config = current(), stage = isInitial() ? null : config, scale = w / Math.max(100, overlay.clientWidth);
    octx.clearRect(0, 0, w, h); radiusHandles = [];
    if (!editing || isBulk() || $('viewMode').value !== 'edit') return;
    function trace(points, close = false) { if (!points?.length) return; octx.beginPath(); points.forEach((p, i) => i ? octx.lineTo(p.x * w, p.y * h) : octx.moveTo(p.x * w, p.y * h)); if (close) octx.closePath(); }
    function contrast(color, dash = [], thickness = 2) {
      octx.setLineDash(dash.map(v => v * scale)); octx.lineJoin = 'round';
      for (const [ink, extra] of [['#ffffff', 4], ['#17231e', 2], [color, 0]]) { octx.strokeStyle = ink; octx.lineWidth = (thickness + extra) * scale; octx.stroke(); }
      octx.setLineDash([]);
    }
    const zone = gesture?.kind === 'rect' ? rectPoints(gesture.start, gesture.end) : stage?.zone;
    if (zone) {
      octx.save(); octx.beginPath(); octx.rect(0, 0, w, h); zone.forEach((p, i) => i ? octx.lineTo(p.x * w, p.y * h) : octx.moveTo(p.x * w, p.y * h)); octx.closePath(); octx.fillStyle = '#14251d50'; octx.fill('evenodd'); octx.restore();
      trace(zone, true); octx.strokeStyle = '#f6d697'; octx.lineWidth = 1.5 * scale; octx.setLineDash([5 * scale, 4 * scale]); octx.stroke(); octx.setLineDash([]);
    }
    if (stage) {
      const theta = stage.windAngle * Math.PI / 180;
      stage.points.forEach((p, index) => {
        if (p.enabled === false || (index !== selectedPoint && !$('showAllRadii').checked)) return;
        const radii = engine.pointRadii(stage, p), selected = index === selectedPoint;
        for (const [key, color, dash, preferred] of [['radius', '#f39929', [7, 5], Math.PI / 2], ['maxRadius', '#4db7fa', [], 0]]) {
          octx.save(); if (!selected) octx.globalAlpha = .45; octx.beginPath();
          for (let k = 0; k <= 100; k++) { const angle = k / 100 * Math.PI * 2, r = radii[key] * w * Math.exp(stage.windStrength * Math.cos(angle - theta)); const x = p.x * w + Math.cos(angle) * r, y = p.y * h + Math.sin(angle) * r; if (!k) octx.moveTo(x, y); else octx.lineTo(x, y); }
          contrast(color, dash, selected ? 2.2 : 1); octx.restore();
          if (!selected || tool !== 'point') continue;
          let location;
          for (let step = 0; step < 32; step++) {
            const angle = preferred + (step % 2 ? -1 : 1) * Math.ceil(step / 2) * Math.PI / 16;
            const actual = radii[key] * w * Math.exp(stage.windStrength * Math.cos(angle - theta)), r = Math.max(actual, 23 * scale);
            const x = p.x * w + Math.cos(angle) * r, y = p.y * h + Math.sin(angle) * r;
            if (!location) location = { x: Math.max(13 * scale, Math.min(w - 13 * scale, x)), y: Math.max(13 * scale, Math.min(h - 13 * scale, y)) };
            if (x > 13 * scale && y > 13 * scale && x < w - 13 * scale && y < h - 13 * scale) { location = { x, y }; break; }
          }
          radiusHandles.push({ ...location, index, key });
          octx.beginPath(); octx.arc(location.x, location.y, 7 * scale, 0, Math.PI * 2); octx.fillStyle = color; octx.fill(); contrast(color, [], 2);
          const text = (key === 'radius' ? 'T ' : 'M ') + Math.round(radii[key] * 100) + '%';
          octx.font = 'bold ' + 10 * scale + 'px sans-serif'; const tw = octx.measureText(text).width;
          const tx = Math.max(2 * scale, Math.min(w - tw - 7 * scale, location.x + 11 * scale)), ty = Math.max(14 * scale, location.y - 10 * scale);
          octx.fillStyle = '#17231e'; octx.fillRect(tx - 3 * scale, ty - 11 * scale, tw + 6 * scale, 15 * scale); octx.fillStyle = '#fffdf5'; octx.textAlign = 'left'; octx.textBaseline = 'alphabetic'; octx.fillText(text, tx, ty);
        }
      });
      const path = gesture?.kind === 'path' ? gesture.path : stage.path;
      if (path.length) { trace(path); contrast('#3b6d81', [], 2.5); }
      stage.points.forEach((p, i) => {
        octx.save(); if (p.enabled === false) octx.globalAlpha = .4;
        const x = p.x * w, y = p.y * h; octx.beginPath(); octx.arc(x, y, 10 * scale, 0, Math.PI * 2); octx.fillStyle = '#fff9ee'; octx.fill();
        octx.lineWidth = (i === selectedPoint ? 3 : 2) * scale; octx.strokeStyle = i === selectedPoint ? '#1e678c' : '#bd592e'; octx.stroke();
        octx.fillStyle = '#954627'; octx.font = 'bold ' + 10 * scale + 'px sans-serif'; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(String(i + 1), x, y); octx.restore();
      });
    }
    function guide(rect, color, label) { if (!rect) return; octx.save(); octx.beginPath(); octx.rect(rect.x * w, rect.y * h, rect.width * w, rect.height * h); contrast(color, [9, 5], 1.5); octx.fillStyle = color; octx.font = 'bold ' + 11 * scale + 'px sans-serif'; octx.textAlign = 'left'; octx.textBaseline = 'top'; octx.fillText(label, rect.x * w + 6 * scale, rect.y * h + 6 * scale); octx.restore(); }
    const framing = gesture?.kind === 'camera' ? frameFromRect(gesture.start, gesture.end) : config.frame;
    guide(framing, '#5db8ff', config.highlightEnabled && config.highlightLinked ? 'Enfoque + destacado' : 'Enfoque');
    if (config.highlightEnabled && !config.highlightLinked) guide(gesture?.kind === 'highlight' ? frameFromRect(gesture.start, gesture.end) : config.highlightFrame, '#db76f3', 'Destacado');
    if (polygon.length) { trace(polygon); contrast('#bd592e', [], 2); for (const p of polygon) { octx.fillStyle = '#bd592e'; octx.fillRect(p.x * w - 3 * scale, p.y * h - 3 * scale, 6 * scale, 6 * scale); } }
    if (stage?.windStrength) {
      octx.save(); octx.translate(w - 36 * scale, 36 * scale); octx.rotate(stage.windAngle * Math.PI / 180); octx.beginPath(); octx.moveTo(-15 * scale, 0); octx.lineTo(15 * scale, 0); octx.lineTo(7 * scale, -6 * scale); octx.moveTo(15 * scale, 0); octx.lineTo(7 * scale, 6 * scale); contrast('#bd592e', [], 2.5); octx.restore();
    }
  }
  function rectPoints(a, b) { return [{ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }, { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) }, { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }, { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) }]; }
  function frameFromRect(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }; }
  function activeCount(stage) { return stage.points.filter(p => p.enabled !== false).length; }
  function renderStages() {
    $('stageList').replaceChildren();
    project.stages.forEach((stage, i) => {
      const card = document.createElement('div'); card.className = `stage-card${stageSelection.has(stage) ? ' selected' : ''}${stage.enabled === false ? ' disabled-stage' : ''}`; card.dataset.stageIndex = i;
      const number = document.createElement('span'); number.className = 'stage-number'; number.textContent = String(i + 1).padStart(2, '0'); card.append(number);
      const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.className = 'stage-enabled'; enabled.checked = stage.enabled !== false; enabled.setAttribute('aria-label', `Habilitar etapa ${i + 1}: ${stage.name}`); enabled.title = 'Habilitar etapa'; enabled.onchange = () => { stage.enabled = enabled.checked; invalidate(); renderStages(); updateInspector(); }; number.append(enabled);
      const select = document.createElement('button'); select.className = 'stage-select'; select.setAttribute('aria-pressed', String(i === selected));
      const name = document.createElement('strong'); name.textContent = stage.name; const sub = document.createElement('small'); sub.textContent = stage.enabled === false ? 'Deshabilitada · editable' : `${!activeCount(stage) && !stage.path.length ? 'Solo enfoque / destacado' : `${activeCount(stage)}/${stage.points.length} activos${stage.path.length ? ' + recorrido' : ''}`} · ${stage.pauseAfter ? 'con pausa' : 'continua'}`; select.append(name, sub);
      select.onclick = event => selectStage(i, event.ctrlKey); name.ondblclick = e => { e.preventDefault(); e.stopPropagation(); if (e.ctrlKey) return; selectStage(i); beginRename(i); }; card.append(select);
      const order = document.createElement('div'); order.className = 'stage-order';
      for (const [delta, text] of [[-1, '↑'], [1, '↓']]) {
        const b = document.createElement('button'); b.textContent = text; b.title = delta < 0 ? 'Mover antes' : 'Mover después'; b.setAttribute('aria-label', `${b.title}: ${stage.name}`);
        b.onclick = () => { const j = i + delta; if (j < 0 || j >= project.stages.length) return; const primary = current(); [project.stages[i], project.stages[j]] = [project.stages[j], project.stages[i]]; if (!stageSelection.has(stage)) { stageSelection = new Set([stage]); selectionDraft = {}; } selected = project.stages.indexOf(stageSelection.has(primary) ? primary : stage); invalidate(); renderStages(); updateInspector(); }; order.append(b);
      }
      const rename = document.createElement('button'); rename.textContent = '✎'; rename.setAttribute('aria-label', `Renombrar etapa ${i + 1}`); rename.onclick = () => { selectStage(i); beginRename(i); }; order.append(rename);
      card.append(order); $('stageList').append(card);
    });
    updateStageSelection();
  }
  function updateStageSelection() {
    $('generalCard').classList.toggle('selected', isGeneral()); $('generalCard').setAttribute('aria-pressed', String(isGeneral()));
    $('initialCard').classList.toggle('selected', isInitial()); $('initialCard').setAttribute('aria-pressed', String(isInitial()));
    document.querySelectorAll('.stage-card').forEach(card => { const active = stageSelection.has(project.stages[+card.dataset.stageIndex]); card.classList.toggle('selected', active); card.classList.toggle('reference-stage', active && +card.dataset.stageIndex === selected && isMultiple()); card.querySelector('.stage-select').setAttribute('aria-pressed', String(active)); });
    $('canvasTitle').textContent = isGeneral() ? 'General · toda la presentación' : isInitial() ? 'Inicio de la presentación' : isMultiple() ? `${stageSelection.size} etapas · referencia: ${current().name}` : current().name;
  }
  function selectStage(index, additive = false) {
    const stage = project.stages[index], before = [...stageSelection];
    if (additive && selected >= 0) {
      if (stageSelection.has(stage)) { if (stageSelection.size > 1) stageSelection.delete(stage); }
      else stageSelection.add(stage);
    } else stageSelection = new Set([stage]);
    if (before.length !== stageSelection.size || before.some(item => !stageSelection.has(item))) {
      if (Object.keys(selectionDraft).length) status('Cambió la selección; se descartaron sus cambios pendientes.');
      selectionDraft = {};
    }
    selected = project.stages.indexOf(stageSelection.has(stage) ? stage : [...stageSelection].at(-1)); selectedPoint = 0; polygon = []; gesture = null;
    enterEdit(); updateStageSelection(); updateInspector();
    if (isMultiple()) $('toolHint').textContent = 'Edición de parámetros de las etapas seleccionadas · geometrías individuales desactivadas.';
    else setTool(tool === 'highlight' && (!current().highlightEnabled || current().highlightLinked) ? 'camera' : tool);
  }
  function beginRename(index) {
    if (busy || document.querySelector('.stage-name-editor')) return;
    const stage = project.stages[index], card = document.querySelector(`.stage-card[data-stage-index="${index}"]`), input = document.createElement('input');
    input.className = 'stage-name-editor'; input.maxLength = 80; input.value = stage.name; input.setAttribute('aria-label', `Nombre de etapa ${index + 1}`); card.append(input); input.focus(); input.select(); let done = false;
    function finish(save) { if (done) return; done = true; if (save) { const name = input.value.trim() || stage.name; if (name !== stage.name) { stage.name = name; invalidate(); } } renderStages(); updateInspector(); }
    input.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.preventDefault(); finish(false); } }; input.onblur = () => finish(true);
  }
  function updateInspector() {
    $('generalSettings').hidden = !isBulk(); $('individualSettings').hidden = isBulk(); $('includeInitialField').hidden = !isGeneral();
    if (isBulk()) {
      $('inspectorTitle').textContent = isGeneral() ? 'Una mirada al conjunto' : `${stageSelection.size} etapas seleccionadas`; $('inspectorEyebrow').textContent = isGeneral() ? 'GENERAL / PARÁMETROS' : 'SELECCIÓN / PARÁMETROS';
      for (const id of ['duplicateStage', 'deleteStage', 'clearZone', 'clearPath']) $(id).disabled = true;
      document.querySelectorAll('[data-tool]').forEach(button => button.disabled = true); renderGeneral(); return;
    }
    const stage = current(); $('stageSettings').hidden = isInitial(); $('initialHint').hidden = !isInitial(); $('estimateBlock').hidden = isInitial(); $('cameraTiming').hidden = isInitial();
    $('inspectorTitle').textContent = isInitial() ? 'La primera mirada' : 'El movimiento del color'; $('inspectorEyebrow').textContent = isInitial() ? '00 / INICIO' : '02 / PROPAGACIÓN';
    for (const id of ['duplicateStage', 'deleteStage', 'clearZone', 'clearPath']) $(id).disabled = isInitial();
    document.querySelectorAll('[data-tool]').forEach(button => button.disabled = (isInitial() && !['camera', 'highlight'].includes(button.dataset.tool)) || (button.dataset.tool === 'highlight' && (!stage.highlightEnabled || stage.highlightLinked)));
    if (!isInitial()) {
      $('stageName').value = stage.name;
      for (const [id, [key, multiplier, format]] of Object.entries(params)) { $(id).value = stage[key] * multiplier; $(`${id}Out`).textContent = format(stage[key]); }
      $('pauseAfter').checked = stage.pauseAfter; $('windSummary').textContent = stage.windStrength ? `${Math.round(stage.windAngle)}° · ${stage.windStrength.toFixed(2)}` : 'Sin viento'; renderPoints();
      $('pathInfo').textContent = stage.path.length ? `Recorrido trazado · ${stage.path.length} vértices. El pincel deja color a su paso.` : 'Sin recorrido de pincel.';
      if (stage.enabled === false) $('estimate').textContent = 'Deshabilitada';
      else if (cached) $('estimate').textContent = `${cached.fields[selected].duration.toFixed(1)} s / ${cached.fields.reduce((s, f) => s + f.duration, 0).toFixed(1)} s total`;
    }
    $('frameInfo').textContent = stage.frame ? `Enfoque definido · ${Math.round(stage.frame.width * 100)}% × ${Math.round(stage.frame.height * 100)}% de la imagen.` : 'Enfoque: página completa.';
    $('zoom').value = (stage.zoom ?? 1) * 100; $('zoomOut').textContent = Math.round((stage.zoom ?? 1) * 100) + '%';
    $('highlightEnabled').checked = stage.highlightEnabled; $('highlightSettings').hidden = !stage.highlightEnabled; $('highlightLinked').checked = stage.highlightLinked;
    $('setHighlight').disabled = stage.highlightLinked; $('outside').value = stage.outside; $('outsideColor').value = stage.outsideColor;
    $('outsideColorField').hidden = stage.outside !== 'color'; $('blurField').hidden = stage.outside !== 'blur'; $('blur').value = stage.blur; $('blurOut').textContent = stage.blur + ' px';
    $('highlightInfo').textContent = stage.highlightLinked ? 'El destacado usa el rectángulo de enfoque.' : stage.highlightFrame ? 'Destacado independiente definido.' : 'Sin rectángulo: se destaca la página completa.';
  }
  function updateGeneralPending() {
    const count = Object.keys(bulkDraft()).length;
    $('generalPending').textContent = generalInvalid.size ? 'Revisa los valores fuera de rango antes de aplicar.' : count ? `${count} parámetro${count === 1 ? '' : 's'} pendiente${count === 1 ? '' : 's'} de confirmar.` : 'Sin cambios pendientes.';
    $('reviewGeneral').disabled = !count || generalInvalid.size > 0; $('cancelGeneral').disabled = !count && !generalInvalid.size;
  }
  function renderGeneral() {
    generalInvalid.clear();
    const scope = bulkProject(), changes = bulkDraft();
    $('generalParameters').replaceChildren(); let group, container;
    for (const parameter of general.parameters) {
      if (group !== parameter.group) {
        group = parameter.group; container = document.createElement('section'); container.className = 'general-group';
        const title = document.createElement('h3'); title.textContent = group; container.append(title); $('generalParameters').append(container);
      }
      const summary = general.summary(scope, parameter, includeInitial()), pending = Object.hasOwn(changes, parameter.key);
      const row = document.createElement('div'); row.className = `general-parameter${summary.mixed ? ' mixed' : ''}${pending ? ' pending' : ''}`; row.dataset.parameter = parameter.key;
      const label = document.createElement('label'); label.textContent = parameter.label; label.htmlFor = 'general-' + parameter.key;
      const output = document.createElement('output'); output.textContent = !summary.count ? 'No hay puntos.' : pending ? 'Pendiente: ' + general.format(parameter, changes[parameter.key]) : summary.mixed ? `Varios valores${parameter.type === 'number' ? ` · ${general.format(parameter, summary.min)} – ${general.format(parameter, summary.max)}` : ''}` : 'Valor uniforme · ' + general.format(parameter, summary.value);
      const input = document.createElement(parameter.type === 'select' ? 'select' : 'input'); input.id = label.htmlFor; input.setAttribute('aria-label', (isGeneral() ? 'General · ' : 'Selección · ') + parameter.label); input.disabled = !summary.count;
      const value = pending ? changes[parameter.key] : summary.value;
      let number;
      function change(next) { generalInvalid.delete(parameter.key); number?.removeAttribute('aria-invalid'); changes[parameter.key] = next; row.classList.add('pending'); output.textContent = 'Pendiente: ' + general.format(parameter, next); updateGeneralPending(); }
      if (parameter.type === 'number') {
        input.type = 'range'; number = document.createElement('input'); number.type = 'number'; number.setAttribute('aria-label', (isGeneral() ? 'Valor general · ' : 'Valor de selección · ') + parameter.label); number.disabled = !summary.count;
        for (const control of [input, number]) { control.min = parameter.min; control.max = parameter.max; control.step = parameter.step; }
        input.value = value === undefined ? parameter.min : value * parameter.scale;
        number.value = value === undefined ? '' : +(value * parameter.scale).toFixed(6); number.placeholder = summary.mixed ? 'Varios valores' : '';
        input.oninput = () => { number.value = input.value; change(+input.value / parameter.scale); };
        number.oninput = () => {
          if (number.value !== '' && number.checkValidity()) { input.value = number.value; change(+number.value / parameter.scale); }
          else { generalInvalid.add(parameter.key); delete changes[parameter.key]; row.classList.remove('pending'); number.setAttribute('aria-invalid', 'true'); output.textContent = `Introduce un valor entre ${parameter.min} y ${parameter.max}.`; updateGeneralPending(); }
        };
      } else if (parameter.type === 'select') {
        const blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Varios valores'; blank.disabled = true; input.append(blank);
        parameter.options.forEach(([optionValue, text], i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = text; input.append(option); });
        const index = parameter.options.findIndex(option => option[0] === value); input.value = index < 0 ? '' : String(index);
        input.onchange = () => change(parameter.options[+input.value][0]);
      } else { input.type = 'color'; input.value = value || '#202c29'; input.oninput = () => change(input.value); }
      row.append(label, output, input); if (number) row.append(number); container.append(row);
    }
    updateGeneralPending();
  }
  $('generalCard').onclick = () => { selected = -2; stageSelection.clear(); selectionDraft = {}; polygon = []; gesture = null; enterEdit(); renderStages(); updateInspector(); $('toolHint').textContent = 'General modifica parámetros de toda la presentación después de confirmar.'; };
  $('includeInitial').onchange = renderGeneral;
  $('cancelGeneral').onclick = () => { clearBulkDraft(); renderGeneral(); };
  $('reviewGeneral').onclick = () => {
    try { generalReview = { changes: general.validate(bulkDraft()), includeInitial: includeInitial(), project: bulkProject(), multiple: isMultiple() }; } catch (error) { report(error); return; }
    $('generalDialogTitle').textContent = generalReview.multiple ? `Aplicar a ${generalReview.project.stages.length} etapas seleccionadas` : 'Aplicar a toda la presentación';
    $('generalReview').replaceChildren();
    for (const [key, value] of Object.entries(generalReview.changes)) {
      const parameter = general.parameters.find(item => item.key === key), li = document.createElement('li'), points = generalReview.project.stages.reduce((sum, stage) => sum + stage.points.length, 0);
      const target = parameter.scope === 'point' ? `${points} puntos` : `${generalReview.project.stages.length} etapas${parameter.scope === 'radius' ? ` y ${points} puntos` : parameter.scope === 'view' && generalReview.includeInitial ? ' e Inicio' : ''}`;
      li.textContent = `${parameter.label}: ${general.format(parameter, value)} → ${target}.`; $('generalReview').append(li);
    }
    $('radiusResetNote').hidden = !('radius' in generalReview.changes || 'maxRadius' in generalReview.changes);
    $('generalDialog').showModal();
  };
  $('cancelGeneralReview').onclick = () => { generalReview = null; $('generalDialog').close(); };
  $('confirmGeneral').onclick = () => {
    if (!generalReview) return;
    general.apply(generalReview.project, generalReview.changes, generalReview.includeInitial); clearBulkDraft(); generalReview = null;
    $('generalDialog').close(); invalidate(); renderStages(); updateInspector(); status('Parámetros aplicados a las etapas indicadas. Guarda el proyecto para conservarlos.');
  };
  function pointsChanged() { invalidate(); updateInspector(); renderStages(); }
  function removePoint(index) { current().points.splice(index, 1); selectedPoint = Math.max(0, Math.min(selectedPoint > index ? selectedPoint - 1 : selectedPoint, current().points.length - 1)); pointsChanged(); }
  function renderPoints() {
    const stage = current(), first = stage.points.findIndex(p => p.enabled !== false);
    $('pointCount').textContent = `${activeCount(stage)}/${stage.points.length} activos`; $('pointList').replaceChildren();
    stage.points.forEach((p, i) => {
      const row = document.createElement('div'); row.className = `point-row${p.enabled === false ? ' inactive' : ''}`; row.dataset.pointIndex = i;
      const header = document.createElement('div'); header.className = 'point-row-header';
      const label = document.createElement('label'), enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = p.enabled !== false; enabled.setAttribute('aria-label', `Activar punto ${i + 1}`); enabled.onchange = () => { p.enabled = enabled.checked; pointsChanged(); }; label.append(enabled, ` Punto ${i + 1}`); header.append(label);
      for (const [delta, symbol] of [[-1, '↑'], [1, '↓']]) { const b = document.createElement('button'); b.textContent = symbol; b.setAttribute('aria-label', `Mover punto ${i + 1} ${delta < 0 ? 'arriba' : 'abajo'}`); b.disabled = i + delta < 0 || i + delta >= stage.points.length; b.onclick = () => { if (selectedPoint === i) selectedPoint = i + delta; else if (selectedPoint === i + delta) selectedPoint = i; [stage.points[i], stage.points[i + delta]] = [stage.points[i + delta], stage.points[i]]; pointsChanged(); }; header.append(b); }
      const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Eliminar punto ${i + 1}`); remove.onclick = () => removePoint(i); header.append(remove); row.append(header);
      const focus = document.createElement('button'); focus.className = 'point-focus'; focus.textContent = selectedPoint === i ? 'Radios seleccionados' : 'Editar radios'; focus.setAttribute('aria-label', `Seleccionar radios del punto ${i + 1}`); focus.onclick = () => { selectedPoint = i; setTool('point'); renderPoints(); }; row.append(focus); row.classList.toggle('selected', selectedPoint === i);
      const modeLabel = document.createElement('label'); modeLabel.className = 'point-mode'; modeLabel.textContent = 'Inicio';
      const mode = document.createElement('select'); mode.setAttribute('aria-label', `Modo de inicio del punto ${i + 1}`);
      for (const [value, text] of [['with', 'Junto al anterior activo'], ['after', 'Al terminar el anterior activo'], ['delay', 'Con demora desde el anterior activo']]) { const o = document.createElement('option'); o.value = value; o.textContent = text; mode.append(o); }
      mode.value = p.startMode || 'with'; mode.disabled = p.enabled === false || i === first; mode.onchange = () => { p.startMode = mode.value; pointsChanged(); }; modeLabel.append(mode); row.append(modeLabel);
      if (p.startMode === 'delay') { const delayLabel = document.createElement('label'); delayLabel.className = 'point-delay'; delayLabel.textContent = 'Demora (s)'; const delay = document.createElement('input'); delay.type = 'number'; delay.min = 0; delay.max = 3600; delay.step = .1; delay.value = p.delay || 0; delay.disabled = p.enabled === false || i === first; delay.setAttribute('aria-label', `Demora del punto ${i + 1} en segundos`); delay.onchange = () => { if (!delay.checkValidity()) return; p.delay = +delay.value; pointsChanged(); }; delayLabel.append(delay); row.append(delayLabel); }
      const info = document.createElement('small'), timing = cached?.fields[selected]?.pointTimings?.[i];
      info.textContent = stage.enabled === false ? 'Etapa deshabilitada · no se reproduce' : p.enabled === false ? 'Desactivado · no participa en los tiempos' : timing?.ignored ? 'Fuera de la zona · no emite' : timing ? `Inicio: ${timing.start.toFixed(1)} s · Fin: ${timing.end.toFixed(1)} s` : i === first ? `Primer activo · comienza en ${stage.paintDelay.toFixed(1)} s desde el inicio de la etapa` : 'Tiempos pendientes de calcular'; row.append(info);
      if (selectedPoint === i) {
        const label = document.createElement('label'); label.className = 'checkbox radius-inherit'; const inherit = document.createElement('input'); inherit.type = 'checkbox'; inherit.checked = p.inheritRadii !== false; inherit.setAttribute('aria-label', `Usar radios de la etapa en punto ${i + 1}`); inherit.onchange = () => { const radii = engine.pointRadii(stage, p); Object.assign(p, radii, { inheritRadii: inherit.checked }); pointsChanged(); }; label.append(inherit, ' Usar radios de la etapa'); row.append(label);
        const radii = engine.pointRadii(stage, p);
        for (const [key, title] of [['radius', 'Radio de tinta'], ['maxRadius', 'Radio máximo']]) {
          const line = document.createElement('label'); line.className = 'point-radius'; line.textContent = title; const out = document.createElement('output'); out.id = key === 'radius' ? 'pointRadiusOut' : 'pointMaxRadiusOut'; out.textContent = Math.round(radii[key] * 100) + '%';
          const input = document.createElement('input'); input.type = 'range'; input.min = 1; input.max = 150; input.step = 1; input.value = radii[key] * 100; input.disabled = p.inheritRadii !== false; input.setAttribute('aria-label', `${title} del punto ${i + 1}`);
          input.oninput = () => { p[key] = +input.value / 100; out.textContent = input.value + '%'; invalidate(); }; input.onchange = () => { updateInspector(); }; line.append(out, input); row.append(line);
        }
      }
      $('pointList').append(row);
    });
  }
  function setTool(next) {
    if (isBulk()) return;
    if (isInitial() && !['camera', 'highlight'].includes(next)) return;
    if (next === 'highlight' && (!current().highlightEnabled || current().highlightLinked)) { status('Habilita el destacado y desmarca el vínculo para dibujarlo por separado.'); return; }
    tool = next; polygon = []; gesture = null; enterEdit();
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    const hints = { point: 'Clic: añadir o seleccionar · Centro: mover · Asas T/M: radios · Doble clic: eliminar.', rect: 'Arrastra para delimitar la zona de esta etapa.', polygon: 'Clic para añadir vértices · Enter o doble clic para cerrar · Escape para cancelar.', path: 'Arrastra para dibujar el recorrido. Sustituye el recorrido anterior.', camera: 'Arrastra el rectángulo de enfoque. El acercamiento se ajusta aparte.', highlight: 'Arrastra el rectángulo de destacado, independiente del enfoque.' }; $('toolHint').textContent = hints[tool]; drawOverlay();
  }
  function position(event) { const r = overlay.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)) }; }
  function finishPolygon() {
    if (polygon.length < 3) { status('Marca al menos tres vértices para cerrar la zona.'); return; }
    // El doble clic puede repetir el último vértice: la geometría sigue siendo válida.
    current().zone = polygon.slice(); polygon = []; invalidate(); status('Zona delimitada.');
  }
  overlay.addEventListener('pointerdown', e => {
    if (busy || isBulk() || !prepared || !editing || $('viewMode').value !== 'edit' || e.button !== 0) return;
    e.preventDefault(); overlay.focus(); const p = position(e); overlay.setPointerCapture(e.pointerId);
    if (isInitial() && !['camera', 'highlight'].includes(tool)) return;
    if (tool === 'highlight' && (!current().highlightEnabled || current().highlightLinked)) return;
    if (tool === 'polygon') { polygon.push(p); drawOverlay(); return; }
    if (tool === 'rect') gesture = { kind: 'rect', start: p, end: p };
    if (tool === 'camera') gesture = { kind: 'camera', start: p, end: p };
    if (tool === 'highlight') gesture = { kind: 'highlight', start: p, end: p };
    if (tool === 'path') gesture = { kind: 'path', path: [p] };
    if (tool === 'point') {
      const scale = overlay.width / overlay.getBoundingClientRect().width;
      const handle = radiusHandles.find(q => Math.hypot(q.x - p.x * overlay.width, q.y - p.y * overlay.height) < 13 * scale);
      if (handle) {
        const point = current().points[handle.index], radii = engine.pointRadii(current(), point);
        selectedPoint = handle.index; gesture = { kind: 'radius', index: handle.index, key: handle.key, original: { ...point }, radius: radii[handle.key], startDistance: engine.radiusDistance(current(), point, p, overlay.height / overlay.width) };
        Object.assign(point, radii, { inheritRadii: false }); renderPoints(); drawOverlay(); return;
      }
      const r = overlay.getBoundingClientRect(); let index = current().points.findIndex(q => Math.hypot((q.x - p.x) * r.width, (q.y - p.y) * r.height) < 16);
      if (index === -1) { if (current().points.length >= 64) { status('Máximo de 64 puntos por etapa.', true); return; } index = current().points.push(engine.normalizeStage({ points: [p] }).points[0]) - 1; }
      gesture = { kind: 'point', index, original: { ...current().points[index] } }; Object.assign(current().points[index], p);
      selectedPoint = index; renderPoints();
    }
    drawOverlay();
  });
  overlay.addEventListener('pointermove', e => {
    if (!gesture) { if (tool === 'point' && editing) { const p = position(e), scale = overlay.width / overlay.clientWidth; overlay.style.cursor = radiusHandles.some(q => Math.hypot(q.x - p.x * overlay.width, q.y - p.y * overlay.height) < 13 * scale) ? 'ew-resize' : 'crosshair'; } return; } const p = position(e);
    if (['rect', 'camera', 'highlight'].includes(gesture.kind)) gesture.end = p;
    if (gesture.kind === 'point') Object.assign(current().points[gesture.index], p);
    if (gesture.kind === 'radius') {
      const point = current().points[gesture.index], distance = engine.radiusDistance(current(), point, p, overlay.height / overlay.width);
      point[gesture.key] = Math.max(.01, Math.min(1.5, gesture.radius + distance - gesture.startDistance));
      const output = $(gesture.key === 'radius' ? 'pointRadiusOut' : 'pointMaxRadiusOut'); if (output) output.textContent = Math.round(point[gesture.key] * 100) + '%';
    }
    if (gesture.kind === 'path') { const last = gesture.path[gesture.path.length - 1]; if (Math.hypot((p.x - last.x) * prepared.width, (p.y - last.y) * prepared.height) > 3 && gesture.path.length < 2000) gesture.path.push(p); }
    drawOverlay();
  });
  function finishGesture(cancel = false) {
    if (!gesture) return;
    if (!cancel) {
      if (gesture.kind === 'rect') { const a = gesture.start, b = gesture.end; if (Math.abs(a.x - b.x) > .005 && Math.abs(a.y - b.y) > .005) current().zone = rectPoints(a, b); }
      if (gesture.kind === 'path') current().path = gesture.path;
      if (gesture.kind === 'camera') { const frame = frameFromRect(gesture.start, gesture.end); if (frame.width >= .02 && frame.height >= .02) current().frame = frame; }
      if (gesture.kind === 'highlight') { const frame = frameFromRect(gesture.start, gesture.end); if (frame.width >= .02 && frame.height >= .02) current().highlightFrame = frame; }
    } else if (gesture.kind === 'point' || gesture.kind === 'radius') current().points[gesture.index] = gesture.original;
    gesture = null; invalidate(); updateInspector(); renderStages();
  }
  overlay.addEventListener('pointerup', () => finishGesture()); overlay.addEventListener('pointercancel', () => finishGesture(true));
  overlay.addEventListener('dblclick', e => {
    if (busy || !editing || $('viewMode').value !== 'edit') return;
    if (selected < 0 || isMultiple()) return;
    if (tool === 'polygon') { finishPolygon(); return; }
    if (tool === 'point') { const p = position(e), r = overlay.getBoundingClientRect(); const i = current().points.findIndex(q => Math.hypot((q.x - p.x) * r.width, (q.y - p.y) * r.height) < 16); if (i >= 0) { removePoint(i); status('Punto eliminado.'); } }
  });
  overlay.addEventListener('keydown', e => { if (e.key === 'Enter' && polygon.length) { e.preventDefault(); finishPolygon(); } if (e.key === 'Escape') { polygon = []; finishGesture(true); drawOverlay(); } });
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  $('initialCard').onclick = () => { selected = -1; stageSelection.clear(); selectionDraft = {}; polygon = []; setTool('camera'); $('viewMode').value = 'frame'; renderStages(); updateInspector(); drawEditor(); };
  $('showAllRadii').onchange = drawOverlay;
  $('clearZone').onclick = () => { current().zone = null; polygon = []; invalidate(); };
  $('clearPath').onclick = () => { current().path = []; invalidate(); updateInspector(); renderStages(); };
  for (const [id, [key, multiplier]] of Object.entries(params)) $(id).addEventListener('input', () => { current()[key] = +$(id).value / multiplier; invalidate(); updateInspector(); });
  $('stageName').addEventListener('input', () => { current().name = $('stageName').value || `Etapa ${selected + 1}`; invalidate(); renderStages(); });
  $('pauseAfter').onchange = () => { current().pauseAfter = $('pauseAfter').checked; invalidate(); renderStages(); };
  $('addStage').onclick = () => { if (project.stages.length >= 64) { status('Máximo de 64 etapas por proyecto.', true); return; } project.stages.push(engine.normalizeStage({ maxRadius: .4, points: [] }, project.stages.length)); selected = project.stages.length - 1; selectedPoint = 0; stageSelection = new Set([current()]); selectionDraft = {}; polygon = []; invalidate(); renderStages(); updateInspector(); };
  $('duplicateStage').onclick = () => { if (project.stages.length >= 64) return; project.stages.splice(selected + 1, 0, engine.normalizeStage({ ...structuredClone(current()), name: `${current().name} · copia` })); selected++; selectedPoint = 0; stageSelection = new Set([current()]); selectionDraft = {}; polygon = []; invalidate(); renderStages(); updateInspector(); };
  $('deleteStage').onclick = () => { if (project.stages.length === 1) { status('El proyecto necesita al menos una etapa.'); return; } project.stages.splice(selected, 1); selected = Math.min(selected, project.stages.length - 1); selectedPoint = 0; stageSelection = new Set([current()]); selectionDraft = {}; polygon = []; invalidate(); renderStages(); updateInspector(); };
  $('viewMode').onchange = () => { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); drawEditor(); };
  $('editButton').onclick = () => enterEdit();
  $('setFrame').onclick = () => setTool('camera');
  $('clearFrame').onclick = () => { current().frame = null; invalidate(); updateInspector(); };
  $('previewFrame').onclick = () => { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); $('viewMode').value = 'frame'; drawEditor(); };
  $('setHighlight').onclick = () => setTool('highlight');
  $('highlightEnabled').onchange = () => { current().highlightEnabled = $('highlightEnabled').checked; if (!current().highlightEnabled && tool === 'highlight') setTool('camera'); invalidate(); updateInspector(); };
  $('highlightLinked').onchange = () => { const config = current(); if (!$('highlightLinked').checked && !config.highlightFrame) config.highlightFrame = structuredClone(config.frame || { x: .2, y: .2, width: .6, height: .6 }); config.highlightLinked = $('highlightLinked').checked; if (config.highlightLinked && tool === 'highlight') setTool('camera'); invalidate(); updateInspector(); };
  $('outside').onchange = () => { current().outside = $('outside').value; invalidate(); updateInspector(); };
  $('outsideColor').oninput = () => { current().outsideColor = $('outsideColor').value; invalidate(); };
  $('zoom').oninput = () => { current().zoom = +$('zoom').value / 100; invalidate(); $('viewMode').value = 'frame'; drawEditor(); $('zoomOut').textContent = $('zoom').value + '%'; };
  $('blur').oninput = () => { current().blur = +$('blur').value; invalidate(); $('blurOut').textContent = $('blur').value + ' px'; };

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
    const stages = structuredClone(project.stages);
    status('Calculando la propagación…'); await waitFrame();
    const fields = await window.PaintAutomation.calculate(prepared, stages, data => {
      if (data.type === 'progress') status(`Calculando ${data.index + 1}/${stages.length}: ${stages[data.index].name} · ${data.progress.part === 'point' ? 'punto' : 'recorrido'} ${data.progress.index}`);
      if (data.type === 'stage') status(`Calculada ${data.index + 1} de ${stages.length}: ${stages[data.index].name}`);
    });
    cached = { revision, fields }; updateInspector();
    const reached = fields.reduce((sum, f) => sum + f.reached, 0), skipped = fields.reduce((sum, f) => sum + f.ignoredSeeds, 0);
    status(`Propagación lista · ${fields.reduce((s, f) => s + f.duration, 0).toFixed(1)} s de animación${fields.some(f => f.visualOnly) ? ' · Incluye etapas visuales.' : ''}${skipped ? ' · Hay puntos o tramos fuera de sus zonas; no emiten color.' : ''}${reached ? '' : ' · Secuencia sin pintura.'}`);
    return fields;
  }
  function playerState(s) {
    $('playButton').textContent = s.playing ? 'Ⅱ' : '▶'; $('playButton').setAttribute('aria-label', s.playing ? 'Pausar' : 'Reproducir o continuar');
    $('canvasWrap').classList.toggle('transparent', s.transparent); $('playButton').disabled = $('nextButton').disabled = s.empty;
    $('playStatus').textContent = s.empty ? 'Inicio · no hay etapas habilitadas' : s.atStart ? 'Inicio · pulsa reproducir para comenzar' : s.ended ? 'Animación terminada' : s.waiting ? 'Pausa · clic en ▶ o espacio para continuar' : `${s.name}${s.playing ? '' : ' · detenida'}`;
    $('timeLabel').textContent = `${timeLabel(s.elapsed)} / ${timeLabel(s.total)}`; $('timeline').value = s.total ? Math.round(s.elapsed / s.total * 1000) : 0;
  }
  async function ensurePlayer() {
    if (player) return player;
    const fields = await calculateFields(); editing = false; overlay.classList.add('hidden'); document.body.classList.add('presenting');
    player = window.createPaintPlayer(canvas, { width: prepared.width, height: prepared.height, base: prepared.base.data, final: prepared.final.data, fields, initialView: project.initialView }, playerState); return player;
  }
  $('playButton').onclick = () => action(async () => { (await ensurePlayer()).toggle(); });
  $('restartButton').onclick = () => action(async () => { (await ensurePlayer()).restart(); });
  $('nextButton').onclick = () => action(async () => { (await ensurePlayer()).next(); });
  $('timeline').addEventListener('input', () => { if (player) player.seek(+$('timeline').value / 1000 * player.getState().total); });
  $('canvasArea').addEventListener('click', () => { if (!editing && (player?.getState().waiting || player?.getState().atStart)) player.play(); });
  document.addEventListener('keydown', e => {
    if (busy || document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    if (e.key === ' ' && !(polygon.length || gesture)) { e.preventDefault(); action(async () => { (await ensurePlayer()).toggle(); }); }
    if (e.key === 'ArrowRight' && player) { e.preventDefault(); player.next(); }
    if (e.key === 'ArrowLeft' && player) { e.preventDefault(); player.previous(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && player?.getState().playing) player.pause(); });

  let basePreviewGenerated = false, generatedBase = null, basePreviewTimer;
  const baseControls = { baseColorToGray: 'colorToGray', baseSensitivity: 'sensitivity', baseBlackPoint: 'blackPoint', baseWhitePoint: 'whitePoint', baseSmoothness: 'smoothness' };
  function syncBaseControls() {
    const config = draft.baseGeneration = window.PaintBase.normalize(draft.baseGeneration);
    $('basePreset').value = window.PaintBase.presetName(config); $('basePaper').value = config.paper;
    for (const [id, key] of Object.entries(baseControls)) {
      $(id).value = Math.round(config[key] * 100); $(id).disabled = config.method === 'grayscale';
      $(id + 'Out').textContent = `${Math.round(config[key] * 100)}%`;
    }
    $('baseMethodNote').textContent = config.method === 'grayscale' ? 'Compatibilidad: desatura y conserva las sombras. Elige Tinta sobre papel para retirar el pigmento.' : 'Los valores iniciales conservan negros sólidos y grises intermedios. Los pigmentos muy oscuros o poco saturados pueden requerir ajustes.';
  }
  function setBaseZoom() {
    const zoom = $('basePreviewZoom').value;
    $('basePreviews').classList.toggle('native-size', zoom !== 'fit');
    for (const id of ['comparisonFinal', 'comparisonBase']) $(id).style.setProperty('--preview-width', `${$(id).width * (+zoom || 1)}px`);
  }
  function generateBasePreview() {
    clearTimeout(basePreviewTimer);
    if (!draftDecoded?.final || draft.baseMode !== 'derived') return;
    generatedBase = PaintPreparation.prepare(draftDecoded.final, draftDecoded.initial, draft);
    for (const [id, source] of [['comparisonFinal', generatedBase.finalCanvas], ['comparisonBase', generatedBase.baseCanvas]]) {
      const c = $(id); c.width = source.width; c.height = source.height; c.getContext('2d').drawImage(source, 0, 0);
    }
    basePreviewGenerated = true; $('basePreviews').hidden = false; $('downloadBase').disabled = false;
    $('generateBase').textContent = 'Actualizar vista previa'; setBaseZoom();
    $('basePreviewStatus').textContent = `${generatedBase.width} × ${generatedBase.height} px · Compara la base antes de aplicar. Los ajustes todavía no modifican el proyecto.`;
  }
  function resetBasePreview() {
    clearTimeout(basePreviewTimer); basePreviewGenerated = false; generatedBase = null;
    $('basePreviews').hidden = true; $('downloadBase').disabled = true; $('generateBase').textContent = 'Generar vista previa';
    $('basePreviewStatus').textContent = 'Pulsa Generar vista previa para ver la base propuesta.';
  }
  function scheduleBasePreview() {
    clearTimeout(basePreviewTimer);
    if (basePreviewGenerated && draft.baseMode === 'derived') basePreviewTimer = setTimeout(generateBasePreview, 120);
  }
  function fillImageDialog() {
    $('finalName').textContent = draft.images.final?.name || 'Sin imagen'; $('initialName').textContent = draft.images.initial?.name || 'No se necesita si generas la base desde la final';
    $('baseMode').value = draft.baseMode; $('resolution').value = draft.resolution;
    for (const [id, key, scale] of [['alignX', 'x', 100], ['alignY', 'y', 100], ['alignSX', 'sx', 100], ['alignSY', 'sy', 100], ['alignAngle', 'angle', 1]]) $(id).value = +(draft.alignment[key] * scale).toFixed(3);
    $('baseGenerationPanel').hidden = draft.baseMode !== 'derived'; $('imageAlignment').hidden = draft.baseMode === 'derived';
    $('imagesDialog').classList.toggle('deriving', draft.baseMode === 'derived'); syncBaseControls();
    if (draft.baseMode === 'uploaded') previewAlignment();
  }
  function previewAlignment() {
    if (!draftDecoded?.final) return;
    const p = PaintPreparation.prepare(draftDecoded.final, draftDecoded.initial, { ...draft, resolution: 380 }), c = $('alignPreview');
    c.width = p.width; c.height = p.height; const context = c.getContext('2d'); context.drawImage(p.baseCanvas, 0, 0); context.globalAlpha = .5; context.drawImage(p.finalCanvas, 0, 0); context.globalAlpha = 1;
  }
  $('imagesButton').onclick = () => { player?.pause(); draft = structuredClone(project); draftDecoded = { ...decoded }; resetBasePreview(); $('basePreviewZoom').value = 'fit'; $('finalFile').value = $('initialFile').value = ''; fillImageDialog(); $('imagesDialog').showModal(); };
  $('imagesDialog').addEventListener('close', () => { clearTimeout(basePreviewTimer); generatedBase = null; });
  $('generateBase').onclick = generateBasePreview; $('basePreviewZoom').onchange = setBaseZoom;
  $('basePreset').onchange = () => { draft.baseGeneration = window.PaintBase.preset($('basePreset').value); syncBaseControls(); scheduleBasePreview(); };
  $('basePaper').onchange = () => { draft.baseGeneration.paper = $('basePaper').value; syncBaseControls(); scheduleBasePreview(); };
  for (const [id, key] of Object.entries(baseControls)) $(id).oninput = () => {
    draft.baseGeneration[key] = +$(id).value / 100;
    if (key === 'whitePoint' && draft.baseGeneration.whitePoint <= draft.baseGeneration.blackPoint) draft.baseGeneration.blackPoint = draft.baseGeneration.whitePoint - .01;
    syncBaseControls(); scheduleBasePreview();
  };
  $('downloadBase').onclick = () => action(async () => {
    generateBasePreview(); if (!generatedBase) return;
    const blob = await new Promise(resolve => generatedBase.baseCanvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('No se pudo generar el PNG.'); download('imagen-inicial.png', blob, 'image/png');
  });
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
    draft.alignment = zeroAlignment(); resetBasePreview(); fillImageDialog(); status(`Imagen cargada: ${file.name}. Aplica para actualizar el lienzo.`);
  });
  $('baseMode').onchange = () => { draft.baseMode = $('baseMode').value; clearTimeout(basePreviewTimer); fillImageDialog(); scheduleBasePreview(); };
  $('resolution').onchange = () => { draft.resolution = +$('resolution').value; scheduleBasePreview(); };
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
    if (draft.baseMode === 'derived' && !basePreviewGenerated) { fillImageDialog(); generateBasePreview(); $('basePreviewStatus').textContent += ' Pulsa Aplicar y volver al lienzo cuando esté lista.'; return; }
    clearTimeout(basePreviewTimer);
    if (!Array.from($('imagesDialog').querySelectorAll('input[type=number]')).every(i => i.checkValidity())) throw new Error('Revisa los valores de alineación: hay un campo fuera de rango.');
    const selectedIndices = project.stages.flatMap((stage, index) => stageSelection.has(stage) ? [index] : []);
    project = draft; stageSelection = new Set(selectedIndices.map(index => project.stages[index])); decoded = draftDecoded; await prepareProject(); $('imagesDialog').close(); status('Imágenes preparadas. En modo Editar se muestra la referencia coloreada.');
  });
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  $('saveButton').onclick = () => { if (!prepared) return; download('proyecto-tinta-y-color.colorflow.json', JSON.stringify(project), 'application/json'); dirty = false; status('Proyecto descargado. Conserva este archivo para seguir editando.'); };
  $('openButton').onclick = () => $('projectFile').click();
  const validateProject = data => window.PaintProject.normalize(data);
  $('projectFile').onchange = () => action(async () => {
    const file = $('projectFile').files[0]; $('projectFile').value = ''; if (!file) return;
    if (file.size > 150000000) throw new Error('El archivo de proyecto es demasiado grande (máximo 150 MB).');
    const next = validateProject(JSON.parse(await file.text())), images = { final: await PaintPreparation.loadImage(next.images.final.data) };
    if (next.images.initial) images.initial = await PaintPreparation.loadImage(next.images.initial.data);
    project = next; generalDraft = {}; selectionDraft = {}; stageSelection = new Set([project.stages[0]]); $('includeInitial').checked = false; decoded = images; selected = 0; selectedPoint = 0; polygon = []; await prepareProject(); dirty = false; status('Proyecto abierto. Puedes continuar editando.');
  });
  const packField = field => window.PaintCodec.pack(field);
  $('exportButton').onclick = () => { $('exportBackground').value = project.presentation.background; $('exportColor').value = project.presentation.color; $('exportColorField').hidden = project.presentation.background !== 'color'; $('exportDialog').showModal(); };
  $('exportBackground').onchange = () => { $('exportColorField').hidden = $('exportBackground').value !== 'color'; };
  $('cancelExport').onclick = () => $('exportDialog').close();
  $('confirmExport').onclick = () => action(async () => {
    const settings = normalizePresentation({ background: $('exportBackground').value, color: $('exportColor').value });
    if (JSON.stringify(settings) !== JSON.stringify(project.presentation)) { project.presentation = settings; dirty = true; }
    $('exportDialog').close();
    const fields = await calculateFields(); player?.pause(); status('Empaquetando la presentación sin conexión…'); await waitFrame();
    const data = { width: prepared.width, height: prepared.height, presentation: project.presentation, initialView: project.initialView, base: prepared.baseCanvas.toDataURL('image/png'), final: prepared.finalCanvas.toDataURL('image/png'), fields: fields.filter(f => !f.skipped).map(packField) };
    download('presentacion-tinta-y-color.html', buildPresentation(data), 'text/html;charset=utf-8'); status('Presentación descargada: un solo HTML con imágenes y animaciones incluidas. Se abre sin conexión.');
  });
  const buildPresentation = data => window.PaintPresentation.build(data);
  async function loadDemo() {
    if (!window.PAINT_DEMO) throw new Error('No se encontró el ejemplo. Puedes cargar tus imágenes con el botón Imágenes.');
    const images = window.PAINT_DEMO;
    const decodedDemo = { final: await PaintPreparation.loadImage(images.final.data), initial: await PaintPreparation.loadImage(images.initial.data) };
    const makeRect = (x, y, r, b) => rectPoints({ x, y }, { x: r, y: b });
    project = { format: 'tinta-y-color', version: 7, baseGeneration: window.PaintBase.normalize(), presentation: presentationDefaults(), initialView: engine.normalizeView(), images: structuredClone(images), resolution: 1080, baseMode: 'uploaded', alignment: zeroAlignment(), stages: [
      engine.normalizeStage({ name: 'Primeros encuentros', zone: makeRect(.064, .035, .963, .287), points: [{ x: .75, y: .17 }, { x: .4, y: .17, startMode: 'delay', delay: .7 }, { x: .16, y: .17, startMode: 'delay', delay: .7 }], radius: .22, maxRadius: .4, speed: .13, hueResistance: 8, paintDelay: 1.2, cameraDuration: .8, pauseAfter: true, frame: { x: .53, y: .03, width: .44, height: .27 } }),
      engine.normalizeStage({ name: 'La escena central', zone: makeRect(.064, .293, .963, .659), points: [{ x: .48, y: .47 }, { x: .88, y: .5 }, { x: .18, y: .5, startMode: 'after' }], radius: .35, maxRadius: .5, speed: .13, windStrength: .35, windAngle: 20, pauseAfter: true, frame: { x: .06, y: .29, width: .91, height: .38 } }),
      engine.normalizeStage({ name: 'El cierre de la página', zone: makeRect(.064, .665, .963, .948), points: [{ x: .79, y: .8 }, { x: .43, y: .81 }, { x: .15, y: .8 }], radius: .25, maxRadius: .4, speed: .13 }),
      engine.normalizeStage({ name: 'Una última mirada', points: [], cameraDuration: 1, hold: .6, zoom: 0, frame: { x: .06, y: .29, width: .91, height: .38 }, highlightEnabled: true, outside: 'transparent' })
    ] };
    generalDraft = {}; selectionDraft = {}; stageSelection = new Set([project.stages[0]]); $('includeInitial').checked = false; decoded = decodedDemo; selected = 0; selectedPoint = 0; polygon = []; status('Alineando las imágenes del ejemplo…'); await waitFrame(); project.alignment = PaintPreparation.autoAlign(decoded.final, decoded.initial);
    await prepareProject(); dirty = false; status('Ejemplo listo · Marca un origen, ajusta los parámetros y pulsa reproducir.');
  }
  $('exampleButton').onclick = () => action(loadDemo);
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  new ResizeObserver(fitCanvas).observe($('canvasArea'));
  // Interfaz de diagnóstico local, útil para comprobar exportaciones sin dependencias.
  window.TintaColor = { getProject: () => structuredClone(project), getPrepared: () => prepared, calculateFields, buildPresentation, packField, validateProject, getPlayer: () => player, getRevision: () => revision };
  renderStages(); updateInspector(); action(loadDemo);
})();
