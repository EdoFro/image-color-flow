(function () {
  'use strict';
  const i18n = window.PaintI18n, t = (key, values) => i18n.t(key, values), tx = text => i18n.source(text);
  let savedLanguage; try { savedLanguage = localStorage.getItem('colorflow.language'); } catch (_) {}
  i18n.setLanguage(document.documentElement.dataset.language || i18n.choose(savedLanguage, navigator.languages || [navigator.language]), false); i18n.apply(document);
  const $ = id => document.getElementById(id), engine = window.PaintEngine;
  const canvas = $('canvas'), overlay = $('overlay'), ctx = canvas.getContext('2d'), octx = overlay.getContext('2d');
  const zeroAlignment = () => ({ x: 0, y: 0, sx: 1, sy: 1, angle: 0 });
  const presentationDefaults = () => ({ background: 'hatch', color: '#e5e7e3' });
  const normalizePresentation = value => window.PaintProject.normalizePresentation(value);
  let preferenceStorage; try { preferenceStorage = localStorage; } catch (_) {}
  const loadedPreferences = PaintPreferences.load(preferenceStorage); let preferences = loadedPreferences.value;
  let project = PaintPreferences.project(preferences, t('etapa_value', { p0: 1 }));
  let decoded = {}, prepared = null, selected = 0, tool = 'point', draft = null, draftDecoded = null;
  let selectedPoint = 0, radiusHandles = [], selectedHighlight = 0;
  let generalDraft = {}, generalReview = null;
  let selectionDraft = {}, stageSelection = new Set([project.stages[0]]);
  const generalInvalid = new Set();
  const general = window.PaintGeneral;
  const viewRenderer = window.PaintView.createRenderer();
  let revision = 0, cached = null, player = null, editing = true, dirty = false, busy = false, gesture = null, polygon = [];
  let armedStageDelete = null;
  const canvasViewport = PaintCanvasViewport.create({ area: $('canvasArea'), wrapper: $('canvasWrap'), canInteract: () => !!prepared && !busy && !gesture, onChange: () => { drawOverlay(); syncCanvasView(); } });
  function syncCanvasView() {
    const view = canvasViewport.state();
    $('canvasZoomValue').textContent = Math.round(view.scale * 100) + '%';
    for (const button of document.querySelectorAll('[data-canvas-zoom]')) {
      const value = button.dataset.canvasZoom;
      const active = view.mode === value || view.mode === 'custom' && Math.abs(view.scale - Number(value)) < 1e-6;
      button.setAttribute('aria-pressed', String(active)); button.disabled = !prepared || busy;
    }
    $('panCanvas').disabled = !prepared || busy; $('panCanvas').setAttribute('aria-pressed', String(view.hand));
  }
  for (const button of document.querySelectorAll('[data-canvas-zoom]')) button.onclick = () => canvasViewport.preset(button.dataset.canvasZoom);
  $('panCanvas').onclick = () => { if (busy || !prepared || gesture) return; canvasViewport.hand(!canvasViewport.state().hand); $('toolHint').textContent = t(canvasViewport.state().hand ? 'canvas_pan_hint' : 'canvas_zoom_hint'); };
  const history = PaintHistory.create(80);
  let historySuspended = false, historyInput = null, saveSuggestion = null;
  const projectFiles = PaintProjectFiles.create({ picker: () => window.isSecureContext && typeof window.showSaveFilePicker === 'function' ? window.showSaveFilePicker.bind(window) : null, download });
  function editorContext() { return { selected, selectedPoint, selectedHighlight, tool, selection: project.stages.flatMap((stage, i) => stageSelection.has(stage) ? [i] : []) }; }
  history.reset(project, editorContext());
  function syncHistory() {
    const blocked = busy || hasPendingDrafts() || !!document.querySelector('dialog[open]');
    $('undoButton').disabled = blocked || !history.canUndo; $('redoButton').disabled = blocked || !history.canRedo;
  }
  function recordHistory() {
    if (historySuspended) return;
    history.commit(project, editorContext(), historyInput); dirty = !history.clean; syncHistory();
  }
  function projectLabel() { $('projectName').value = project.name || ''; }
  function suggestedFilename() { return saveSuggestion && saveSuggestion.projectName === project.name ? saveSuggestion.fileName : PaintProject.filename(project.name); }
  function resetSaveTarget(name = '') { projectFiles.reset(name); saveSuggestion = null; $('saveAdvice').hidden = true; $('suggestedDirectory').value = ''; projectLabel(); }
  async function restoreHistory(delta) {
    if (busy || hasPendingDrafts() || document.querySelector('dialog[open]')) return;
    const next = history.peek(delta); if (!next) return;
    history.endGroup();
    await action(async () => {
      // Decode and prepare before changing the cursor: a failure retains the current edit.
      const imagesChanged = ['final', 'initial'].some(k => project.images[k]?.data !== next.project.images[k]?.data);
      const preparationChanged = imagesChanged || ['alignment', 'baseMode', 'baseGeneration', 'resolution'].some(k => JSON.stringify(project[k]) !== JSON.stringify(next.project[k]));
      const images = imagesChanged ? {} : decoded;
      if (imagesChanged) for (const kind of ['final', 'initial']) if (next.project.images[kind]) images[kind] = await PaintPreparation.loadImage(next.project.images[kind].data);
      const ready = images.final ? preparationChanged ? PaintPreparation.prepare(images.final, images.initial, next.project) : prepared : null;
      historySuspended = true;
      try {
        project = next.project; decoded = images; prepared = ready; history.move(delta);
        destroyPlayer(); resetBasePreview(); cached = null; generalDraft = {}; selectionDraft = {}; generalInvalid.clear(); generalReview = null; draft = draftDecoded = null; polygon = []; gesture = null;
        const context = next.context;
        selected = Math.max(-2, Math.min(context.selected, project.stages.length - 1)); selectedPoint = context.selectedPoint; selectedHighlight = context.selectedHighlight;
        stageSelection = new Set(context.selection.filter(i => project.stages[i]).map(i => project.stages[i]));
        if (selected >= 0 && !stageSelection.size) stageSelection.add(current());
        if (ready) await prepareProject(ready);
        else { canvasViewport.source(0, 0); canvas.width = canvas.height = overlay.width = overlay.height = 1; $('canvasWrap').hidden = true; $('emptyState').hidden = false; $('dimensions').textContent = '—'; invalidate(); }
        projectLabel(); renderStages(); updateInspector();
        tool = context.tool; if (!isBulk()) setTool(isInitial() || tool === 'highlight' && (!current().highlightEnabled || current().highlightLinked) ? 'camera' : tool);
        dirty = !history.clean; status(() => t(delta < 0 ? 'undo_done' : 'redo_done'));
      } finally { historySuspended = false; }
    });
  }
  document.addEventListener('input', event => { history.context(editorContext()); historyInput = event.target; queueMicrotask(() => { historyInput = null; syncHistory(); }); }, true);
  for (const type of ['click', 'pointerdown', 'change', 'focusout']) document.addEventListener(type, () => { history.context(editorContext()); history.endGroup(); queueMicrotask(syncHistory); }, true);
  for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close', syncHistory);
  $('undoButton').onclick = () => restoreHistory(-1); $('redoButton').onclick = () => restoreHistory(1);
  $('projectName').oninput = () => { project.name = PaintProject.normalizeName($('projectName').value); recordHistory(); };
  $('projectName').onchange = projectLabel;
  $('suggestedDirectory').onclick = () => $('suggestedDirectory').select();
  $('copyDirectory').onclick = async () => { try { await navigator.clipboard.writeText($('suggestedDirectory').value); status(() => t('path_copied')); } catch (_) { $('suggestedDirectory').focus(); $('suggestedDirectory').select(); status(() => t('path_copy_manual')); } };
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
  const formatGeneral = (parameter, value) => tx(general.format(parameter, value));
  let lastStatus = null;
  function status(message, error = false) { lastStatus = { message, error }; $('status').textContent = i18n.error(typeof message === 'function' ? message() : message); $('status').classList.toggle('error', error); }
  function timeLabel(seconds) { if (!Number.isFinite(seconds)) return '—'; const s = Math.round(seconds); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function report(error) { console.error(error); status(() => (error.message || String(error)), true); }
  async function action(fn) { if (busy) return; busy = true; document.body.classList.add('busy'); const controls = [...document.querySelectorAll('button,input,select')].map(e => [e, e.disabled]); controls.forEach(([e]) => e.disabled = true); try { await fn(); } catch (error) { report(error); } finally { busy = false; document.body.classList.remove('busy'); controls.forEach(([e, disabled]) => e.disabled = disabled); if ($('imagesDialog').open) { syncBaseControls(); $('downloadBase').disabled = !basePreviewGenerated; } if (player) playerState(player.getState()); syncAvailability(); syncHistory(); } }
  function destroyPlayer() { if (player) player.destroy(); player = null; }
  function enterEdit() { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); $('viewMode').value = 'edit'; $('playButton').textContent = '▶'; $('playButton').setAttribute('aria-label', t("reproducir")); $('playStatus').textContent = t("listo_para_explorar"); $('playButton').disabled = false; $('nextButton').disabled = false; drawEditor(); syncAvailability(); }
  function invalidate() { revision++; cached = null; recordHistory(); $('estimate').textContent = t("por_calcular"); $('timeLabel').textContent = '0:00 / —'; $('timeline').value = 0; enterEdit(); }
  function fitCanvas() { if (prepared) canvasViewport.resize(); }
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
    guide(framing, '#5db8ff', config.highlightEnabled && config.highlightLinked ? t("enfoque_destacado") : t("enfoque"));
    if (config.highlightEnabled && !config.highlightLinked) {
      let rects = config.highlightFrames || [];
      if (gesture?.kind === 'highlight') {
        if (gesture.original) rects = rects.map((r, i) => i === gesture.index ? gesture.candidate : r);
        else rects = gesture.append ? [...rects, gesture.candidate] : [gesture.candidate];
      }
      rects.forEach((rect, index) => {
        const active = index === selectedHighlight; guide(rect, active ? '#b829df' : '#db76f3', t("destacado_value", { p0: index + 1 }));
        if (tool === 'highlight' && active) for (const handle of PaintHighlightEditor.handles(rect)) {
          octx.fillStyle = '#fff'; octx.fillRect(handle.x * w - 5 * scale, handle.y * h - 5 * scale, 10 * scale, 10 * scale);
          octx.strokeStyle = '#8d21ab'; octx.lineWidth = 2 * scale; octx.strokeRect(handle.x * w - 5 * scale, handle.y * h - 5 * scale, 10 * scale, 10 * scale);
        }
      });
    }
    if (polygon.length) { trace(polygon); contrast('#bd592e', [], 2); for (const p of polygon) { octx.fillStyle = '#bd592e'; octx.fillRect(p.x * w - 3 * scale, p.y * h - 3 * scale, 6 * scale, 6 * scale); } }
    if (stage?.windStrength) {
      octx.save(); octx.translate(w - 36 * scale, 36 * scale); octx.rotate(stage.windAngle * Math.PI / 180); octx.beginPath(); octx.moveTo(-15 * scale, 0); octx.lineTo(15 * scale, 0); octx.lineTo(7 * scale, -6 * scale); octx.moveTo(15 * scale, 0); octx.lineTo(7 * scale, 6 * scale); contrast('#bd592e', [], 2.5); octx.restore();
    }
  }
  function rectPoints(a, b) { return [{ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }, { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) }, { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }, { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) }]; }
  function frameFromRect(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }; }
  function activeCount(stage) { return stage.points.filter(p => p.enabled !== false).length; }
  function renderStages() {
    cancelStageDelete();
    $('stageList').replaceChildren();
    project.stages.forEach((stage, i) => {
      const card = document.createElement('div'); card.className = `stage-card${stageSelection.has(stage) ? ' selected' : ''}${stage.enabled === false ? ' disabled-stage' : ''}`; card.dataset.stageIndex = i;
      const number = document.createElement('span'); number.className = 'stage-number'; number.textContent = String(i + 1).padStart(2, '0'); card.append(number);
      const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.className = 'stage-enabled'; enabled.checked = stage.enabled !== false; enabled.setAttribute('aria-label', t("habilitar_etapa_value_value", { p0: i + 1, p1: stage.name })); enabled.title = t("habilitar_etapa"); enabled.onchange = () => { stage.enabled = enabled.checked; invalidate(); renderStages(); updateInspector(); }; number.append(enabled);
      const select = document.createElement('button'); select.className = 'stage-select'; select.setAttribute('aria-pressed', String(i === selected));
      const name = document.createElement('strong'); name.textContent = stage.name; const sub = document.createElement('small'); sub.textContent = stage.enabled === false ? t('disabled_stage_summary') : `${!activeCount(stage) && !stage.path.length ? t("solo_enfoque_destacado") : t('stage_summary', { active: activeCount(stage), total: stage.points.length, path: stage.path.length ? t('path_suffix') : '' })} · ${stage.pauseAfter ? t("con_pausa") : t("continua")}`; select.append(name, sub);
      select.onclick = event => selectStage(i, event.ctrlKey); name.ondblclick = e => { e.preventDefault(); e.stopPropagation(); if (e.ctrlKey) return; selectStage(i); beginRename(i); }; card.append(select);
      const order = document.createElement('div'); order.className = 'stage-order';
      for (const [delta, text] of [[-1, '↑'], [1, '↓']]) {
        const b = document.createElement('button'); b.textContent = text; b.title = delta < 0 ? t("mover_antes") : t("mover_despues"); b.setAttribute('aria-label', `${b.title}: ${stage.name}`);
        b.onclick = () => { const j = i + delta; if (j < 0 || j >= project.stages.length) return; const primary = current(); [project.stages[i], project.stages[j]] = [project.stages[j], project.stages[i]]; if (!stageSelection.has(stage)) { stageSelection = new Set([stage]); selectionDraft = {}; } selected = project.stages.indexOf(stageSelection.has(primary) ? primary : stage); invalidate(); renderStages(); updateInspector(); }; order.append(b);
      }
      const rename = document.createElement('button'); rename.textContent = '✎'; rename.setAttribute('aria-label', t("renombrar_etapa_value", { p0: i + 1 })); rename.onclick = () => { selectStage(i); beginRename(i); }; order.append(rename);
      const actions = document.createElement('div'); actions.className = 'stage-actions';
      const duplicate = document.createElement('button'); duplicate.className = 'stage-duplicate'; duplicate.textContent = '⧉'; duplicate.disabled = project.stages.length >= 64;
      duplicate.title = t('duplicate_stage_named', { name: stage.name }); duplicate.setAttribute('aria-label', duplicate.title); duplicate.onclick = () => duplicateStageAt(project.stages.indexOf(stage));
      const remove = document.createElement('button'); remove.className = 'stage-delete'; remove.textContent = t('eliminar'); remove.disabled = project.stages.length === 1;
      remove.title = project.stages.length === 1 ? t('el_proyecto_necesita_al_menos_una_etapa') : t('delete_stage_named', { name: stage.name }); remove.setAttribute('aria-label', remove.title); remove.setAttribute('aria-pressed', 'false'); remove.onclick = () => requestStageDelete(stage, remove);
      actions.append(duplicate, remove); card.append(order, actions); $('stageList').append(card);
    });
    updateStageSelection();
  }
  function updateStageSelection() {
    $('generalCard').classList.toggle('selected', isGeneral()); $('generalCard').setAttribute('aria-pressed', String(isGeneral()));
    $('initialCard').classList.toggle('selected', isInitial()); $('initialCard').setAttribute('aria-pressed', String(isInitial()));
    document.querySelectorAll('.stage-card').forEach(card => { const active = stageSelection.has(project.stages[+card.dataset.stageIndex]); card.classList.toggle('selected', active); card.classList.toggle('reference-stage', active && +card.dataset.stageIndex === selected && isMultiple()); card.querySelector('.stage-select').setAttribute('aria-pressed', String(active)); });
    $('canvasTitle').textContent = isGeneral() ? t("general_toda_la_presentacion") : isInitial() ? t("inicio_de_la_presentacion") : isMultiple() ? t('selection_reference', { count: stageSelection.size, name: current().name }) : current().name;
  }
  function selectStage(index, additive = false) {
    const stage = project.stages[index], before = [...stageSelection];
    if (additive && selected >= 0) {
      if (stageSelection.has(stage)) { if (stageSelection.size > 1) stageSelection.delete(stage); }
      else stageSelection.add(stage);
    } else stageSelection = new Set([stage]);
    if (before.length !== stageSelection.size || before.some(item => !stageSelection.has(item))) {
      if (Object.keys(selectionDraft).length) status(() => (t("cambio_la_seleccion_se_descartaron_sus_cambios_pendientes")));
      selectionDraft = {};
    }
    selected = project.stages.indexOf(stageSelection.has(stage) ? stage : [...stageSelection].at(-1)); selectedPoint = 0; selectedHighlight = 0; polygon = []; gesture = null;
    enterEdit(); updateStageSelection(); updateInspector();
    if (isMultiple()) $('toolHint').textContent = t("edicion_de_parametros_de_las_etapas_seleccionadas_geometri");
    else setTool(tool === 'highlight' && (!current().highlightEnabled || current().highlightLinked) ? 'camera' : tool);
  }
  function beginRename(index) {
    if (busy || document.querySelector('.stage-name-editor')) return;
    const stage = project.stages[index], card = document.querySelector(`.stage-card[data-stage-index="${index}"]`), input = document.createElement('input');
    input.className = 'stage-name-editor'; input.maxLength = 80; input.value = stage.name; input.setAttribute('aria-label', t("nombre_de_etapa_value", { p0: index + 1 })); card.append(input); input.focus(); input.select(); let done = false;
    function finish(save) { if (done) return; done = true; if (save) { const name = input.value.trim() || stage.name; if (name !== stage.name) { stage.name = name; invalidate(); } } renderStages(); updateInspector(); }
    input.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.preventDefault(); finish(false); } }; input.onblur = () => finish(true);
  }
  function updateInspector() {
    $('generalSettings').hidden = !isBulk(); $('individualSettings').hidden = isBulk(); $('includeInitialField').hidden = !isGeneral();
    if (isBulk()) {
      $('inspectorTitle').textContent = isGeneral() ? t("una_mirada_al_conjunto") : t("value_etapas_seleccionadas", { p0: stageSelection.size }); $('inspectorEyebrow').textContent = isGeneral() ? t('general_parameters') : t('selection_parameters');
      for (const id of ['duplicateStage', 'deleteStage', 'clearZone', 'clearPath']) $(id).disabled = true;
      document.querySelectorAll('[data-tool]').forEach(button => button.disabled = true); renderGeneral(); return;
    }
    const stage = current(); $('stageSettings').hidden = isInitial(); $('initialHint').hidden = !isInitial(); $('estimateBlock').hidden = isInitial(); $('cameraTiming').hidden = isInitial();
    $('inspectorTitle').textContent = isInitial() ? t("la_primera_mirada") : t("el_movimiento_del_color"); $('inspectorEyebrow').textContent = isInitial() ? t('initial_heading') : t('02_propagacion');
    for (const id of ['duplicateStage', 'deleteStage', 'clearZone', 'clearPath']) $(id).disabled = isInitial();
    $('deleteStage').disabled ||= project.stages.length === 1; $('duplicateStage').disabled ||= project.stages.length >= 64;
    document.querySelectorAll('[data-tool]').forEach(button => button.disabled = (isInitial() && !['camera', 'highlight'].includes(button.dataset.tool)) || (button.dataset.tool === 'highlight' && (!stage.highlightEnabled || stage.highlightLinked)));
    if (!isInitial()) {
      $('stageName').value = stage.name;
      for (const [id, [key, multiplier, format]] of Object.entries(params)) { $(id).value = stage[key] * multiplier; $(`${id}Out`).textContent = format(stage[key]); }
      $('pauseAfter').checked = stage.pauseAfter; $('windSummary').textContent = stage.windStrength ? `${Math.round(stage.windAngle)}° · ${stage.windStrength.toFixed(2)}` : t("sin_viento"); renderPoints();
      $('pathInfo').textContent = stage.path.length ? t("recorrido_trazado_value_vertices_el_pincel_deja_color_a_su", { p0: stage.path.length }) : t("sin_recorrido_de_pincel");
      if (stage.enabled === false) $('estimate').textContent = t("deshabilitada");
      else if (cached) $('estimate').textContent = t("value_s_value_s_total", { p0: cached.fields[selected].duration.toFixed(1), p1: cached.fields.reduce((s, f) => s + f.duration, 0).toFixed(1) });
    }
    $('frameInfo').textContent = stage.frame ? t("enfoque_definido_value_value_de_la_imagen", { p0: Math.round(stage.frame.width * 100), p1: Math.round(stage.frame.height * 100) }) : t("enfoque_pagina_completa");
    $('zoom').value = (stage.zoom ?? 1) * 100; $('zoomOut').textContent = Math.round((stage.zoom ?? 1) * 100) + '%';
    $('highlightEnabled').checked = stage.highlightEnabled; $('highlightSettings').hidden = !stage.highlightEnabled; $('highlightLinked').checked = stage.highlightLinked;
    $('setHighlight').disabled = stage.highlightLinked; $('outside').value = stage.outside; $('outsideColor').value = stage.outsideColor;
    $('outsideColorField').hidden = stage.outside !== 'color'; $('blurField').hidden = stage.outside !== 'blur'; $('blur').value = stage.blur; $('blurOut').textContent = stage.blur + ' px';
    $('highlightInfo').textContent = stage.highlightLinked ? t("el_destacado_usa_el_rectangulo_de_enfoque_los_separados_se") : stage.highlightFrames.length ? t("value_destacadovalue_separadovalue_ctrl_arrastrar_agrega_o", { p0: stage.highlightFrames.length, p1: stage.highlightFrames.length === 1 ? '' : 's', p2: stage.highlightFrames.length === 1 ? '' : 's' }) : t("sin_rectangulos_se_muestra_la_pagina_completa_dibuja_un_de");
    renderHighlights();
  }
  function setHighlightFrames(frames) { const normalized = engine.normalizeView({ highlightFrames: frames }); current().highlightFrames = normalized.highlightFrames; current().highlightFrame = normalized.highlightFrame; }
  function renderHighlights() {
    const config = current(), list = $('highlightList'); list.replaceChildren(); list.hidden = config.highlightLinked;
    if (!(gesture?.kind === 'highlight' && !gesture.original)) selectedHighlight = Math.max(0, Math.min(selectedHighlight, config.highlightFrames.length - 1));
    config.highlightFrames.forEach((rect, i) => {
      const row = document.createElement('div'); row.className = 'highlight-row' + (i === selectedHighlight ? ' selected' : '');
      const choose = document.createElement('button'); choose.type = 'button'; choose.textContent = t("destacado_value", { p0: i + 1 }); choose.setAttribute('aria-pressed', String(i === selectedHighlight));
      choose.onclick = () => { selectedHighlight = i; setTool('highlight'); renderHighlights(); overlay.focus({ preventScroll: true }); };
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', t("eliminar_destacado_value", { p0: i + 1 })); remove.onclick = () => removeHighlight(i);
      row.append(choose, remove); list.append(row);
    });
  }
  function removeHighlight(index) {
    if (busy || isBulk() || index < 0 || index >= current().highlightFrames.length) return;
    gesture = null; const rects = current().highlightFrames.slice(); rects.splice(index, 1); setHighlightFrames(rects); selectedHighlight = Math.max(0, Math.min(index, rects.length - 1));
    if (!rects.length) { current().highlightEnabled = false; if (tool === 'highlight') setTool('camera'); }
    invalidate(); updateInspector(); status(() => (rects.length ? t("destacado_eliminado") : t("ultimo_rectangulo_eliminado_destacado_deshabilitado")));
  }
  function updateGeneralPending() {
    const count = Object.keys(bulkDraft()).length;
    $('generalPending').textContent = generalInvalid.size ? t("revisa_los_valores_fuera_de_rango_antes_de_aplicar") : count ? t("value_parametrovalue_pendientevalue_de_confirmar", { p0: count, p1: count === 1 ? '' : 's', p2: count === 1 ? '' : 's' }) : t("sin_cambios_pendientes");
    $('reviewGeneral').disabled = !count || generalInvalid.size > 0; $('cancelGeneral').disabled = !count && !generalInvalid.size;
  }
  function renderGeneral() {
    generalInvalid.clear();
    const scope = bulkProject(), changes = bulkDraft();
    $('generalParameters').replaceChildren(); let group, container;
    for (const parameter of general.parameters) {
      if (group !== parameter.group) {
        group = parameter.group; container = document.createElement('section'); container.className = 'general-group';
        const title = document.createElement('h3'); title.textContent = tx(group); container.append(title); $('generalParameters').append(container);
      }
      const summary = general.summary(scope, parameter, includeInitial()), pending = Object.hasOwn(changes, parameter.key);
      const row = document.createElement('div'); row.className = `general-parameter${summary.mixed ? ' mixed' : ''}${pending ? ' pending' : ''}`; row.dataset.parameter = parameter.key;
      const label = document.createElement('label'); label.textContent = tx(parameter.label); label.htmlFor = 'general-' + parameter.key;
      const output = document.createElement('output'); output.textContent = !summary.count ? t("no_hay_puntos") : pending ? t("pendiente") + formatGeneral(parameter, changes[parameter.key]) : summary.mixed ? t("varios_valoresvalue", { p0: parameter.type === 'number' ? ` · ${formatGeneral(parameter, summary.min)} – ${formatGeneral(parameter, summary.max)}` : '' }) : t("valor_uniforme") + formatGeneral(parameter, summary.value);
      const input = document.createElement(parameter.type === 'select' ? 'select' : 'input'); input.id = label.htmlFor; input.setAttribute('aria-label', (isGeneral() ? t("general") : t("seleccion")) + tx(parameter.label)); input.disabled = !summary.count;
      const value = pending ? changes[parameter.key] : summary.value;
      let number;
      function change(next) { generalInvalid.delete(parameter.key); number?.removeAttribute('aria-invalid'); changes[parameter.key] = next; row.classList.add('pending'); output.textContent = t("pendiente") + formatGeneral(parameter, next); updateGeneralPending(); }
      if (parameter.type === 'number') {
        input.type = 'range'; number = document.createElement('input'); number.type = 'number'; number.id = 'general-number-' + parameter.key; number.setAttribute('aria-label', (isGeneral() ? t("valor_general") : t("valor_de_seleccion")) + tx(parameter.label)); number.disabled = !summary.count;
        for (const control of [input, number]) { control.min = parameter.min; control.max = parameter.max; control.step = parameter.step; }
        input.value = value === undefined ? parameter.min : value * parameter.scale;
        number.value = value === undefined ? '' : +(value * parameter.scale).toFixed(6); number.placeholder = summary.mixed ? t("varios_valores") : '';
        input.oninput = () => { number.value = input.value; change(+input.value / parameter.scale); };
        number.oninput = () => {
          if (number.value !== '' && number.checkValidity()) { input.value = number.value; change(+number.value / parameter.scale); }
          else { generalInvalid.add(parameter.key); delete changes[parameter.key]; row.classList.remove('pending'); number.setAttribute('aria-invalid', 'true'); output.textContent = t("introduce_un_valor_entre_value_y_value", { p0: parameter.min, p1: parameter.max }); updateGeneralPending(); }
        };
      } else if (parameter.type === 'select') {
        const blank = document.createElement('option'); blank.value = ''; blank.textContent = t("varios_valores"); blank.disabled = true; input.append(blank);
        parameter.options.forEach(([optionValue, text], i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = tx(text); input.append(option); });
        const index = parameter.options.findIndex(option => option[0] === value); input.value = index < 0 ? '' : String(index);
        input.onchange = () => change(parameter.options[+input.value][0]);
      } else { input.type = 'color'; input.value = value || '#202c29'; input.oninput = () => change(input.value); }
      row.append(label, output, input); if (number) row.append(number); container.append(row);
    }
    updateGeneralPending(); scheduleSelectLabels();
  }
  $('generalCard').onclick = () => { selected = -2; stageSelection.clear(); selectionDraft = {}; polygon = []; gesture = null; enterEdit(); renderStages(); updateInspector(); $('toolHint').textContent = t("general_modifica_parametros_de_toda_la_presentacion_despue"); };
  $('includeInitial').onchange = renderGeneral;
  $('cancelGeneral').onclick = () => { clearBulkDraft(); renderGeneral(); };
  $('reviewGeneral').onclick = () => {
    try { generalReview = { changes: general.validate(bulkDraft()), includeInitial: includeInitial(), project: bulkProject(), multiple: isMultiple() }; } catch (error) { report(error); return; }
    renderGeneralReview(); $('generalDialog').showModal();
  };
  function renderGeneralReview() {
    $('generalDialogTitle').textContent = generalReview.multiple ? t("aplicar_a_value_etapas_seleccionadas", { p0: generalReview.project.stages.length }) : t("aplicar_a_toda_la_presentacion");
    $('generalReview').replaceChildren();
    for (const [key, value] of Object.entries(generalReview.changes)) {
      const parameter = general.parameters.find(item => item.key === key), li = document.createElement('li'), points = generalReview.project.stages.reduce((sum, stage) => sum + stage.points.length, 0);
      const target = parameter.scope === 'point' ? t('point_count', { count: points }) : t('stage_count', { count: generalReview.project.stages.length }) + (parameter.scope === 'radius' ? t('and_points', { count: points }) : parameter.scope === 'view' && generalReview.includeInitial ? t('and_initial') : '');
      li.textContent = `${tx(parameter.label)}: ${formatGeneral(parameter, value)} → ${target}.`; $('generalReview').append(li);
    }
    $('radiusResetNote').hidden = !('radius' in generalReview.changes || 'maxRadius' in generalReview.changes);
  }
  $('cancelGeneralReview').onclick = () => { generalReview = null; $('generalDialog').close(); };
  $('confirmGeneral').onclick = () => {
    if (!generalReview) return;
    general.apply(generalReview.project, generalReview.changes, generalReview.includeInitial); clearBulkDraft(); generalReview = null;
    $('generalDialog').close(); invalidate(); renderStages(); updateInspector(); status(() => (t("parametros_aplicados_a_las_etapas_indicadas_guarda_el_proy")));
  };
  function pointsChanged() { invalidate(); updateInspector(); renderStages(); }
  function removePoint(index) { current().points.splice(index, 1); selectedPoint = Math.max(0, Math.min(selectedPoint > index ? selectedPoint - 1 : selectedPoint, current().points.length - 1)); pointsChanged(); }
  function renderPoints() {
    const stage = current(), first = stage.points.findIndex(p => p.enabled !== false);
    $('pointCount').textContent = t('active_points', { active: activeCount(stage), total: stage.points.length }); $('pointList').replaceChildren();
    stage.points.forEach((p, i) => {
      const row = document.createElement('div'); row.className = `point-row${p.enabled === false ? ' inactive' : ''}`; row.dataset.pointIndex = i;
      const header = document.createElement('div'); header.className = 'point-row-header';
      const label = document.createElement('label'), enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = p.enabled !== false; enabled.setAttribute('aria-label', t("activar_punto_value", { p0: i + 1 })); enabled.onchange = () => { p.enabled = enabled.checked; pointsChanged(); }; label.append(enabled, t("punto_value", { p0: i + 1 })); header.append(label);
      for (const [delta, symbol] of [[-1, '↑'], [1, '↓']]) { const b = document.createElement('button'); b.textContent = symbol; b.setAttribute('aria-label', t("mover_punto_value_value", { p0: i + 1, p1: delta < 0 ? t("arriba") : t("abajo") })); b.disabled = i + delta < 0 || i + delta >= stage.points.length; b.onclick = () => { if (selectedPoint === i) selectedPoint = i + delta; else if (selectedPoint === i + delta) selectedPoint = i; [stage.points[i], stage.points[i + delta]] = [stage.points[i + delta], stage.points[i]]; pointsChanged(); }; header.append(b); }
      const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', t("eliminar_punto_value", { p0: i + 1 })); remove.onclick = () => removePoint(i); header.append(remove); row.append(header);
      const focus = document.createElement('button'); focus.className = 'point-focus'; focus.textContent = selectedPoint === i ? t("radios_seleccionados") : t("editar_radios"); focus.setAttribute('aria-label', t("seleccionar_radios_del_punto_value", { p0: i + 1 })); focus.onclick = () => { selectedPoint = i; setTool('point'); renderPoints(); }; row.append(focus); row.classList.toggle('selected', selectedPoint === i);
      const modeLabel = document.createElement('label'); modeLabel.className = 'point-mode'; modeLabel.textContent = t("inicio");
      const mode = document.createElement('select'); mode.setAttribute('aria-label', t("modo_de_inicio_del_punto_value", { p0: i + 1 }));
      for (const [value, text] of [['with', t("junto_al_anterior_activo")], ['after', t("al_terminar_el_anterior_activo")], ['delay', t("con_demora_desde_el_anterior_activo")]]) { const o = document.createElement('option'); o.value = value; o.textContent = text; mode.append(o); }
      mode.value = p.startMode || 'with'; mode.disabled = p.enabled === false || i === first; mode.onchange = () => { p.startMode = mode.value; pointsChanged(); }; modeLabel.append(mode); row.append(modeLabel);
      if (p.startMode === 'delay') { const delayLabel = document.createElement('label'); delayLabel.className = 'point-delay'; delayLabel.textContent = t("demora_s"); const delay = document.createElement('input'); delay.type = 'number'; delay.min = 0; delay.max = 3600; delay.step = .1; delay.value = p.delay || 0; delay.disabled = p.enabled === false || i === first; delay.setAttribute('aria-label', t("demora_del_punto_value_en_segundos", { p0: i + 1 })); delay.onchange = () => { if (!delay.checkValidity()) return; p.delay = +delay.value; pointsChanged(); }; delayLabel.append(delay); row.append(delayLabel); }
      const info = document.createElement('small'), timing = cached?.fields[selected]?.pointTimings?.[i];
      info.textContent = stage.enabled === false ? t("etapa_deshabilitada_no_se_reproduce") : p.enabled === false ? t("desactivado_no_participa_en_los_tiempos") : timing?.ignored ? t("fuera_de_la_zona_no_emite") : timing ? t("inicio_value_s_fin_value_s", { p0: timing.start.toFixed(1), p1: timing.end.toFixed(1) }) : i === first ? t("primer_activo_comienza_en_value_s_desde_el_inicio_de_la_et", { p0: stage.paintDelay.toFixed(1) }) : t("tiempos_pendientes_de_calcular"); row.append(info);
      if (selectedPoint === i) {
        const label = document.createElement('label'); label.className = 'checkbox radius-inherit'; const inherit = document.createElement('input'); inherit.type = 'checkbox'; inherit.checked = p.inheritRadii !== false; inherit.setAttribute('aria-label', t("usar_radios_de_la_etapa_en_punto_value", { p0: i + 1 })); inherit.onchange = () => { const radii = engine.pointRadii(stage, p); Object.assign(p, radii, { inheritRadii: inherit.checked }); pointsChanged(); }; label.append(inherit, t("usar_radios_de_la_etapa")); row.append(label);
        const radii = engine.pointRadii(stage, p);
        for (const [key, title] of [['radius', t("radio_de_tinta")], ['maxRadius', t("radio_maximo")]]) {
          const line = document.createElement('label'); line.className = 'point-radius'; line.textContent = title; const out = document.createElement('output'); out.id = key === 'radius' ? 'pointRadiusOut' : 'pointMaxRadiusOut'; out.textContent = Math.round(radii[key] * 100) + '%';
          const input = document.createElement('input'); input.type = 'range'; input.min = 1; input.max = 150; input.step = 1; input.value = radii[key] * 100; input.disabled = p.inheritRadii !== false; input.setAttribute('aria-label', t("value_del_punto_value", { p0: title, p1: i + 1 }));
          input.oninput = () => { p[key] = +input.value / 100; out.textContent = input.value + '%'; invalidate(); }; input.onchange = () => { updateInspector(); }; line.append(out, input); row.append(line);
        }
      }
      $('pointList').append(row);
    });
    scheduleSelectLabels();
  }
  function setTool(next) {
    if (isBulk()) return;
    if (isInitial() && !['camera', 'highlight'].includes(next)) return;
    if (next === 'highlight' && (!current().highlightEnabled || current().highlightLinked)) { status(() => (t("habilita_el_destacado_y_desmarca_el_vinculo_para_dibujarlo"))); return; }
    tool = next; polygon = []; gesture = null; overlay.style.cursor = 'crosshair'; if (next === 'highlight') $('viewMode').value = 'edit'; enterEdit();
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    const hints = { point: t("clic_anadir_o_seleccionar_centro_mover_asas_t_m_radios_dob"), rect: t("arrastra_para_delimitar_la_zona_de_esta_etapa"), polygon: t("clic_para_anadir_vertices_enter_o_doble_clic_para_cerrar_e"), path: t("arrastra_para_dibujar_el_recorrido_sustituye_el_recorrido_"), camera: t("arrastra_el_rectangulo_de_enfoque_el_acercamiento_se_ajust"), highlight: t("ctrl_arrastrar_agregar_clic_seleccionar_arrastra_interior_") }; $('toolHint').textContent = canvasViewport.state().hand ? t('canvas_pan_hint') : hints[tool]; drawOverlay();
  }
  function position(event) { const r = overlay.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)) }; }
  function finishPolygon() {
    if (polygon.length < 3) { status(() => (t("marca_al_menos_tres_vertices_para_cerrar_la_zona"))); return; }
    // El doble clic puede repetir el último vértice: la geometría sigue siendo válida.
    current().zone = polygon.slice(); polygon = []; invalidate(); status(() => (t("zona_delimitada")));
  }
  overlay.addEventListener('pointerdown', e => {
    if (busy || isBulk() || !prepared || !editing || $('viewMode').value !== 'edit' || e.button !== 0) return;
    e.preventDefault(); overlay.focus({ preventScroll: true }); const p = position(e); overlay.setPointerCapture(e.pointerId);
    if (isInitial() && !['camera', 'highlight'].includes(tool)) return;
    if (tool === 'highlight' && (!current().highlightEnabled || current().highlightLinked)) return;
    if (tool === 'polygon') { polygon.push(p); drawOverlay(); return; }
    if (tool === 'rect') gesture = { kind: 'rect', start: p, end: p };
    if (tool === 'camera') gesture = { kind: 'camera', start: p, end: p };
    if (tool === 'highlight') {
      const rects = current().highlightFrames, bounds = overlay.getBoundingClientRect(), hit = e.ctrlKey ? null : PaintHighlightEditor.hit(rects, selectedHighlight, p, bounds.width, bounds.height);
      if (hit) {
        selectedHighlight = hit.index; const original = { ...rects[hit.index] }; gesture = { kind: 'highlight', start: p, end: p, index: hit.index, edge: hit.edge, original, candidate: original };
      } else {
        if (e.ctrlKey && rects.length >= 64) { status(() => (t("maximo_de_64_destacados_por_etapa")), true); return; }
        gesture = { kind: 'highlight', start: p, end: p, append: e.ctrlKey, candidate: frameFromRect(p, p) }; selectedHighlight = e.ctrlKey ? rects.length : 0;
      }
      renderHighlights();
    }
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
      const added = index === -1;
      if (index === -1) { if (current().points.length >= 64) { status(() => (t("maximo_de_64_puntos_por_etapa")), true); return; } index = current().points.push(engine.normalizeStage({ points: [{ ...preferences.point, ...p }] }).points[0]) - 1; }
      gesture = { kind: 'point', index, added, original: { ...current().points[index] } }; Object.assign(current().points[index], p);
      selectedPoint = index; renderPoints();
    }
    drawOverlay();
  });
  overlay.addEventListener('pointermove', e => {
    if (canvasViewport.state().hand || canvasViewport.state().dragging) return;
    if (!gesture && tool === 'highlight' && editing && !isBulk()) {
      const r = overlay.getBoundingClientRect(), hit = e.ctrlKey ? null : PaintHighlightEditor.hit(current().highlightFrames, selectedHighlight, position(e), r.width, r.height);
      overlay.style.cursor = hit ? hit.edge === 'move' ? 'move' : hit.edge + '-resize' : 'crosshair';
    }
    if (!gesture) { if (tool === 'point' && editing) { const p = position(e), scale = overlay.width / overlay.clientWidth; overlay.style.cursor = radiusHandles.some(q => Math.hypot(q.x - p.x * overlay.width, q.y - p.y * overlay.height) < 13 * scale) ? 'ew-resize' : 'crosshair'; } return; } const p = position(e);
    if (['rect', 'camera'].includes(gesture.kind)) gesture.end = p;
    if (gesture.kind === 'highlight') { gesture.end = p; gesture.candidate = gesture.original ? PaintHighlightEditor.transform(gesture.original, gesture.start, p, gesture.edge) : frameFromRect(gesture.start, p); }
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
    if (gesture.kind === 'highlight') {
      const g = gesture; gesture = null; let changed = false;
      if (!cancel && g.candidate.width >= .02 - 1e-10 && g.candidate.height >= .02 - 1e-10) {
        if (g.original) {
          changed = Object.keys(g.original).some(key => g.original[key] !== g.candidate[key]);
          if (changed) setHighlightFrames(current().highlightFrames.map((r, i) => i === g.index ? g.candidate : r));
        } else { const rects = g.append ? [...current().highlightFrames, g.candidate] : [g.candidate]; setHighlightFrames(rects); selectedHighlight = rects.length - 1; changed = true; }
      }
      if (changed) invalidate(); updateInspector(); drawOverlay(); return;
    }
    if (!cancel) {
      if (gesture.kind === 'rect') { const a = gesture.start, b = gesture.end; if (Math.abs(a.x - b.x) > .005 && Math.abs(a.y - b.y) > .005) current().zone = rectPoints(a, b); }
      if (gesture.kind === 'path') current().path = gesture.path;
      if (gesture.kind === 'camera') { const frame = frameFromRect(gesture.start, gesture.end); if (frame.width >= .02 && frame.height >= .02) current().frame = frame; }
    } else if (gesture.kind === 'point' && gesture.added) current().points.splice(gesture.index, 1);
    else if (gesture.kind === 'point' || gesture.kind === 'radius') current().points[gesture.index] = gesture.original;
    gesture = null; invalidate(); updateInspector(); renderStages();
  }
  overlay.addEventListener('pointerup', () => finishGesture()); overlay.addEventListener('pointercancel', () => finishGesture(true));
  overlay.addEventListener('dblclick', e => {
    if (busy || !editing || $('viewMode').value !== 'edit') return;
    if (selected < 0 || isMultiple()) return;
    if (tool === 'polygon') { finishPolygon(); return; }
    if (tool === 'point') { const p = position(e), r = overlay.getBoundingClientRect(); const i = current().points.findIndex(q => Math.hypot((q.x - p.x) * r.width, (q.y - p.y) * r.height) < 16); if (i >= 0) { removePoint(i); status(() => (t("punto_eliminado"))); } }
  });
  overlay.addEventListener('keydown', e => { if (e.key === 'Delete' && tool === 'highlight' && editing && !isBulk() && $('viewMode').value === 'edit') { e.preventDefault(); removeHighlight(selectedHighlight); return; } if (e.key === 'Enter' && polygon.length) { e.preventDefault(); finishPolygon(); } if (e.key === 'Escape') { polygon = []; finishGesture(true); drawOverlay(); } });
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { canvasViewport.hand(false); setTool(b.dataset.tool); });
  $('initialCard').onclick = () => { selected = -1; stageSelection.clear(); selectionDraft = {}; polygon = []; setTool('camera'); $('viewMode').value = 'frame'; renderStages(); updateInspector(); drawEditor(); };
  $('showAllRadii').onchange = drawOverlay;
  $('clearZone').onclick = () => { current().zone = null; polygon = []; invalidate(); };
  $('clearPath').onclick = () => { current().path = []; invalidate(); updateInspector(); renderStages(); };
  for (const [id, [key, multiplier]] of Object.entries(params)) $(id).addEventListener('input', () => { current()[key] = +$(id).value / multiplier; invalidate(); updateInspector(); });
  $('stageName').addEventListener('input', () => { current().name = $('stageName').value || t("etapa_value", { p0: selected + 1 }); invalidate(); renderStages(); });
  $('pauseAfter').onchange = () => { current().pauseAfter = $('pauseAfter').checked; invalidate(); renderStages(); };
  $('addStage').onclick = () => { if (project.stages.length >= 64) { status(() => (t("maximo_de_64_etapas_por_proyecto")), true); return; } project.stages.push(PaintPreferences.stage(preferences, project.stages.length, t('etapa_value', { p0: project.stages.length + 1 }))); selected = project.stages.length - 1; selectedPoint = 0; stageSelection = new Set([current()]); selectionDraft = {}; polygon = []; invalidate(); renderStages(); updateInspector(); };
  function stageActionAllowed() {
    if (busy) return false;
    if (hasPendingDrafts()) { status(() => t('pending_save_hint'), true); return false; }
    return true;
  }
  function duplicateStageAt(index) {
    if (!stageActionAllowed() || !project.stages[index]) return;
    cancelStageDelete();
    if (project.stages.length >= 64) { status(() => t('maximo_de_64_etapas_por_proyecto'), true); return; }
    const stage = project.stages[index];
    project.stages.splice(index + 1, 0, engine.normalizeStage({ ...structuredClone(stage), name: t('copied_name', { name: stage.name }) }));
    selected = index + 1; selectedPoint = selectedHighlight = 0; stageSelection = new Set([current()]); selectionDraft = {}; polygon = [];
    invalidate(); renderStages(); updateInspector();
  }
  function deleteStageAt(stage) {
    if (!stageActionAllowed()) return;
    const index = project.stages.indexOf(stage); if (index < 0 || project.stages.length === 1) return;
    const primary = selected >= 0 ? current() : null;
    project.stages.splice(index, 1); stageSelection.delete(stage);
    if (primary && primary !== stage) selected = project.stages.indexOf(primary);
    else { selected = stageSelection.size ? project.stages.indexOf([...stageSelection].at(-1)) : Math.min(index, project.stages.length - 1); selectedPoint = selectedHighlight = 0; }
    if (selected >= 0 && !stageSelection.size) stageSelection.add(current());
    selectionDraft = {}; polygon = []; invalidate(); renderStages(); updateInspector();
  }
  function cancelStageDelete() {
    if (!armedStageDelete) return;
    const { button, label, title, aria, timer } = armedStageDelete; clearTimeout(timer); armedStageDelete = null;
    button.classList.remove('delete-armed'); button.textContent = label; button.title = title; button.setAttribute('aria-label', aria); button.setAttribute('aria-pressed', 'false');
  }
  function requestStageDelete(stage, button) {
    if (!stageActionAllowed() || !project.stages.includes(stage) || project.stages.length === 1) return;
    if (armedStageDelete?.stage === stage && armedStageDelete.button === button && performance.now() < armedStageDelete.until) { cancelStageDelete(); deleteStageAt(stage); return; }
    cancelStageDelete();
    armedStageDelete = { stage, button, label: button.textContent, title: button.title, aria: button.getAttribute('aria-label') || button.textContent, until: performance.now() + 2000, timer: setTimeout(cancelStageDelete, 2000) };
    button.classList.add('delete-armed'); button.textContent = t('confirm_stage_delete_short'); button.title = t('confirm_stage_delete_hint', { name: stage.name }); button.setAttribute('aria-label', button.title); button.setAttribute('aria-pressed', 'true');
  }
  for (const type of ['pointerdown','click','focusin']) document.addEventListener(type, event => { if (armedStageDelete && !armedStageDelete.button.contains(event.target)) cancelStageDelete(); }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') cancelStageDelete(); }, true);
  window.addEventListener('blur', cancelStageDelete);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelStageDelete(); });
  $('duplicateStage').onclick = () => { if (selected >= 0 && !isMultiple()) duplicateStageAt(selected); };
  $('deleteStage').onclick = () => { if (selected >= 0 && !isMultiple()) requestStageDelete(current(), $('deleteStage')); };
  $('viewMode').onchange = () => { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); drawEditor(); };
  $('editButton').onclick = () => enterEdit();
  $('setFrame').onclick = () => setTool('camera');
  $('clearFrame').onclick = () => { current().frame = null; invalidate(); updateInspector(); };
  $('previewFrame').onclick = () => { destroyPlayer(); editing = true; document.body.classList.remove('presenting'); $('viewMode').value = 'frame'; drawEditor(); };
  $('setHighlight').onclick = () => setTool('highlight');
  $('highlightEnabled').onchange = () => { current().highlightEnabled = $('highlightEnabled').checked; if (!current().highlightEnabled && tool === 'highlight') setTool('camera'); invalidate(); updateInspector(); };
  $('highlightLinked').onchange = () => { const config = current(); if (!$('highlightLinked').checked && !config.highlightFrames.length) setHighlightFrames([structuredClone(config.frame || { x: .2, y: .2, width: .6, height: .6 })]); config.highlightLinked = $('highlightLinked').checked; if (config.highlightLinked && tool === 'highlight') setTool('camera'); invalidate(); updateInspector(); };
  $('outside').onchange = () => { current().outside = $('outside').value; invalidate(); updateInspector(); };
  $('outsideColor').oninput = () => { current().outsideColor = $('outsideColor').value; invalidate(); };
  $('zoom').oninput = () => { current().zoom = +$('zoom').value / 100; invalidate(); $('viewMode').value = 'frame'; drawEditor(); $('zoomOut').textContent = $('zoom').value + '%'; };
  $('blur').oninput = () => { current().blur = +$('blur').value; invalidate(); $('blurOut').textContent = $('blur').value + ' px'; };

  async function prepareProject(ready) {
    if (!decoded.final) throw new Error(t("carga_primero_una_imagen_final_coloreada"));
    await waitFrame(); prepared = ready || PaintPreparation.prepare(decoded.final, decoded.initial, project);
    canvas.width = overlay.width = prepared.width; canvas.height = overlay.height = prepared.height;
    $('dimensions').textContent = `${prepared.width} × ${prepared.height} px`; $('emptyState').hidden = true; $('canvasWrap').hidden = false;
    canvasViewport.source(prepared.width, prepared.height); invalidate(); fitCanvas(); renderStages(); updateInspector(); drawEditor();
  }
  async function calculateFields() {
    if (!prepared) throw new Error(t("carga_primero_una_imagen"));
    if (cached && cached.revision === revision) return cached.fields;
    if (polygon.length) throw new Error(t("termina_la_zona_con_enter_o_cancelala_con_escape_antes_de_"));
    const stages = structuredClone(project.stages);
    status(() => (t("calculando_la_propagacion"))); await waitFrame();
    const fields = await window.PaintAutomation.calculate(prepared, stages, data => {
      if (data.type === 'progress') status(() => (t("calculando_value_value_value_value_value", { p0: data.index + 1, p1: stages.length, p2: stages[data.index].name, p3: data.progress.part === 'point' ? t("punto") : t("recorrido"), p4: data.progress.index })));
      if (data.type === 'stage') status(() => (t("calculada_value_de_value_value", { p0: data.index + 1, p1: stages.length, p2: stages[data.index].name })));
    });
    cached = { revision, fields }; updateInspector();
    const reached = fields.reduce((sum, f) => sum + f.reached, 0), skipped = fields.reduce((sum, f) => sum + f.ignoredSeeds, 0);
    status(() => (t("propagacion_lista_value_s_de_animacionvaluevaluevalue", { p0: fields.reduce((s, f) => s + f.duration, 0).toFixed(1), p1: fields.some(f => f.visualOnly) ? t("incluye_etapas_visuales") : '', p2: skipped ? t("hay_puntos_o_tramos_fuera_de_sus_zonas_no_emiten_color") : '', p3: reached ? '' : t("secuencia_sin_pintura") })));
    return fields;
  }
  function playerState(s) {
    $('playButton').textContent = s.playing ? 'Ⅱ' : '▶'; $('playButton').setAttribute('aria-label', s.playing ? t("pausar") : t("reproducir_o_continuar"));
    $('canvasWrap').classList.toggle('transparent', s.transparent); $('playButton').disabled = $('nextButton').disabled = s.empty;
    $('playStatus').textContent = s.empty ? t("inicio_no_hay_etapas_habilitadas") : s.atStart ? t("inicio_pulsa_reproducir_para_comenzar") : s.ended ? t("animacion_terminada") : s.waiting ? t("pausa_clic_en_o_espacio_para_continuar") : `${s.name}${s.playing ? '' : t("detenida")}`;
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
    const target = e.target instanceof Element ? e.target : document.body, textEntry = target.closest('textarea,[contenteditable]:not([contenteditable="false"])') || target.tagName === 'INPUT' && !['range','checkbox','radio','button','submit','color'].includes(target.type);
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !textEntry && ['z','y'].includes(e.key.toLowerCase())) {
      if (busy || document.querySelector('dialog[open]') || hasPendingDrafts()) return;
      e.preventDefault(); e.stopPropagation(); restoreHistory(e.key.toLowerCase() === 'y' || e.shiftKey ? 1 : -1); return;
    }
    if (busy || document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    if (e.key === ' ' && !(polygon.length || gesture)) { e.preventDefault(); action(async () => { (await ensurePlayer()).toggle(); }); }
    if (e.key === 'ArrowRight' && player) { e.preventDefault(); player.next(); }
    if (e.key === 'ArrowLeft' && player) { e.preventDefault(); player.previous(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && player?.getState().playing) player.pause(); });

  let basePreviewGenerated = false, generatedBase = null, basePreviewTimer;
  let previewStarted = false, previewRevision = 0, previewWorker = null, previewSource = null, previewImage = null, previewKey = '', previewResult = null, previewError = false, previewErrorMessage = '';
  const completedTiles = new Set();
  const comparison = PaintImageComparison.create({ panels: [$('comparisonFinal'), $('comparisonBase')], mini: $('baseMini'), zoomOutput: $('baseZoomValue'), onView: () => {
    $('basePreviewZoom').value = comparison.fitted ? 'fit' : [1, 2, 4].includes(comparison.view.scale) ? String(comparison.view.scale) : 'custom';
    if (previewStarted && !basePreviewGenerated) { previewWorker?.post({ type: 'view', revision: previewRevision, view: comparison.rect() }); updatePreviewPhase(); }
  } });
  const baseControls = { baseColorToGray: 'colorToGray', baseSensitivity: 'sensitivity', baseBlackPoint: 'blackPoint', baseWhitePoint: 'whitePoint', baseSmoothness: 'smoothness' };
  function syncBaseControls() {
    scheduleSelectLabels();
    const config = draft.baseGeneration = window.PaintBase.normalize(draft.baseGeneration);
    const blank = draft.baseMode === 'blank';
    $('baseInkControls').hidden = blank; $('baseGenerationDescription').textContent = t(blank ? 'blank_base_description' : 'conserva_la_tinta_y_deja_libres_las_superficies_que_recibi');
    $('basePreset').value = window.PaintBase.presetName(config); $('basePaper').value = config.paper;
    $('baseInkMatch').value = config.inkMatch; $('baseInkMatch').disabled = !['coherent', 'protected'].includes(config.method);
    $('baseInkMatch').querySelector('[value=base-to-final]').hidden = config.inkMatch !== 'base-to-final';
    $('applyImages').disabled = draft.baseMode !== 'uploaded' && !basePreviewGenerated;
    for (const [id, key] of Object.entries(baseControls)) {
      $(id).value = Math.round(config[key] * 100); $(id).disabled = config.method === 'grayscale';
      $(id + 'Out').textContent = `${Math.round(config[key] * 100)}%`;
    }
    $('baseSensitivityHelp').textContent = ['coherent', 'protected'].includes(config.method) ? t("aumentala_para_descartar_contrastes_debiles_de_pigmento_o_") : t("aumentala_para_retirar_colores_tenues");
    $('baseSmoothnessHelp').textContent = ['coherent', 'protected'].includes(config.method) ? t("0_conserva_el_acabado_de_l_k_aumentala_para_suavizar_borde") : t("transiciones_mas_amplias_entre_tinta_grises_y_papel_rango_");
    $('baseMethodNote').textContent = blank ? t('blank_base_paper_note') : ['coherent', 'protected'].includes(config.method) ? t("value_recupera_lineas_y_reduce_la_trama_del_color_sensibil", { p0: config.method === 'protected' ? t("l_anade_proteccion_de_superficies_oscuras_a_k") : t("k_conserva_el_metodo_anterior") }) : config.method === 'grayscale' ? t("compatibilidad_desatura_y_conserva_las_sombras_elige_tinta") : t("los_valores_iniciales_conservan_negros_solidos_y_grises_in");
  }
  function previewState(state, text, title = text) {
    $('basePreviewIndicator').dataset.state = state; $('basePreviewState').textContent = text; $('basePreviewIndicator').title = title;
  }
  function updatePreviewPhase() {
    if (!previewStarted || basePreviewGenerated || previewError) return;
    const r = comparison.rect(); let pending = false;
    for (let y = 0; previewResult && y < previewResult.height; y += 192) for (let x = 0; x < previewResult.width; x += 192) {
      if (x < r.x + r.width && r.x < x + 192 && y < r.y + r.height && r.y < y + 192 && !completedTiles.has(`${x},${y}`)) pending = true;
    }
    previewState(pending || !previewResult ? 'pending' : 'detail', pending || !previewResult ? t("actualizando_detalle") : t("completando_imagen"), pending ? t("la_vista_puede_contener_zonas_con_los_ajustes_anteriores_s") : t("el_detalle_visible_esta_actualizado_continua_el_resto_de_l"));
  }
  function previewFailed(error) {
    previewWorker?.destroy(); previewWorker = null; previewImage = null; previewKey = '';
    previewError = true; previewErrorMessage = error.message; basePreviewGenerated = false; previewState('error', t("error_al_actualizar"), i18n.error(error.message)); $('basePreviewStatus').textContent = i18n.error(error.message); syncBaseControls();
  }
  function receivePreview(message) {
    if (message.revision !== previewRevision || !previewStarted) return;
    if (message.type === 'error') { previewFailed(new Error(message.message)); return; }
    if (message.type === 'tile') {
      const t = message.tile;
      previewResult.baseCanvas.getContext('2d').putImageData(new ImageData(message.base, t.width, t.height), t.x, t.y);
      previewResult.finalCanvas.getContext('2d').putImageData(new ImageData(message.final, t.width, t.height), t.x, t.y);
      completedTiles.add(`${t.x},${t.y}`); comparison.render(); updatePreviewPhase();
    }
    if (message.type === 'complete') {
      const p = previewResult; p.base = p.baseCanvas.getContext('2d').getImageData(0, 0, p.width, p.height); p.final = p.finalCanvas.getContext('2d').getImageData(0, 0, p.width, p.height); p.inkMatchPixels = message.matched;
      generatedBase = p; basePreviewGenerated = true; previewState('ready', t("actualizada"), t("toda_la_imagen_corresponde_a_los_ultimos_parametros"));
      $('basePreviewStatus').textContent = t("value_value_px_value_pixeles_igualados_compara_antes_de_ap", { p0: p.width, p1: p.height, p2: message.matched });
      $('downloadBase').disabled = false; syncBaseControls();
    }
  }
  function generateBasePreview() {
    clearTimeout(basePreviewTimer);
    if (!draftDecoded?.final || !['derived', 'blank'].includes(draft.baseMode)) return;
    basePreviewGenerated = false; previewError = false; generatedBase = null; previewRevision++; completedTiles.clear();
    $('downloadBase').disabled = true; previewState('pending', t("actualizando_detalle"), t("se_muestran_zonas_anteriores_hasta_recibir_el_nuevo_calcul")); syncBaseControls();
    try {
      if (draft.baseMode === 'blank') {
        // A solid sheet bypasses extraction, matching and any in-flight worker tiles.
        previewWorker?.destroy(); previewWorker = null; previewSource = previewImage = null; previewKey = '';
        const p = PaintPreparation.prepare(draftDecoded.final, null, draft);
        previewResult = generatedBase = p; basePreviewGenerated = true;
        $('basePreviews').hidden = false; comparison.setSources([p.finalCanvas, p.baseCanvas], !previewStarted); previewStarted = true;
        $('generateBase').textContent = t('actualizar_vista_previa'); $('downloadBase').disabled = false;
        previewState('ready', t('actualizada'), t('toda_la_imagen_corresponde_a_los_ultimos_parametros'));
        $('basePreviewStatus').textContent = t('blank_base_preview_ready', { width: p.width, height: p.height }); syncBaseControls(); return;
      }
      const lineMethod = ['coherent', 'protected'].includes(draft.baseGeneration.method), key = `${draft.resolution}:${lineMethod}`;
      if (!previewWorker) previewWorker = PaintBasePreview.create(receivePreview, previewFailed);
      if (previewImage !== draftDecoded.final || previewKey !== key) {
        previewSource = PaintPreparation.previewSource(draftDecoded.final, draft); previewImage = draftDecoded.final; previewKey = key;
        const { finalCanvas, baseSourceSize, ...source } = previewSource; previewWorker.post({ type: 'init', source });
      }
      const { outputWidth: width, outputHeight: height } = previewSource;
      const makeCanvas = () => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
      const baseCanvas = makeCanvas(), finalCanvas = makeCanvas();
      if (previewResult) baseCanvas.getContext('2d').drawImage(previewResult.baseCanvas, 0, 0, width, height);
      else { baseCanvas.getContext('2d').fillStyle = '#fff'; baseCanvas.getContext('2d').fillRect(0, 0, width, height); }
      finalCanvas.getContext('2d').drawImage(previewResult?.finalCanvas || previewSource.finalCanvas, 0, 0, width, height);
      previewResult = { width, height, baseSourceSize: previewSource.baseSourceSize, baseCanvas, finalCanvas };
      $('basePreviews').hidden = false; comparison.setSources([finalCanvas, baseCanvas], !previewStarted); previewStarted = true;
      $('generateBase').textContent = t("actualizar_vista_previa");
      $('basePreviewStatus').textContent = t("value_value_px_se_actualiza_primero_el_detalle_visible", { p0: width, p1: height });
      previewWorker.post({ type: 'start', revision: previewRevision, config: draft.baseGeneration, view: comparison.rect() });
    } catch (error) { previewFailed(error); }
  }
  function resetBasePreview() {
    clearTimeout(basePreviewTimer); previewRevision++; previewWorker?.destroy(); previewWorker = null; previewSource = previewImage = previewResult = null; previewKey = ''; previewStarted = false; previewError = false;
    basePreviewGenerated = false; generatedBase = null; $('basePreviews').hidden = true; $('downloadBase').disabled = true; $('generateBase').textContent = t("generar_vista_previa");
    previewState('off', t("sin_vista_previa")); $('basePreviewStatus').textContent = t("pulsa_generar_vista_previa_para_ver_la_base_propuesta");
  }
  function scheduleBasePreview() {
    clearTimeout(basePreviewTimer);
    if (draft.baseMode === 'blank') { generateBasePreview(); return; }
    if (previewStarted && draft.baseMode === 'derived') {
      previewRevision++; previewWorker?.post({ type: 'cancel' }); basePreviewGenerated = false; generatedBase = null; previewError = false; completedTiles.clear();
      $('downloadBase').disabled = true; syncBaseControls(); previewState('pending', t("actualizando_detalle"), t("la_imagen_todavia_no_corresponde_a_los_ultimos_parametros"));
      basePreviewTimer = setTimeout(generateBasePreview, 150);
    }
  }
  function fillImageDialog() {
    $('finalName').textContent = draft.images.final?.name || t("sin_imagen"); $('initialName').textContent = draft.images.initial?.name || t("no_se_necesita_si_generas_la_base_desde_la_final");
    $('baseMode').value = draft.baseMode; $('resolution').value = draft.resolution;
    for (const [id, key, scale] of [['alignX', 'x', 100], ['alignY', 'y', 100], ['alignSX', 'sx', 100], ['alignSY', 'sy', 100], ['alignAngle', 'angle', 1]]) $(id).value = +(draft.alignment[key] * scale).toFixed(3);
    $('baseGenerationPanel').hidden = draft.baseMode === 'uploaded'; $('imageAlignment').hidden = draft.baseMode !== 'uploaded';
    $('imagesDialog').classList.toggle('deriving', draft.baseMode !== 'uploaded'); syncBaseControls();
    if (draft.baseMode === 'uploaded') previewAlignment();
    if (draft.baseMode === 'blank') generateBasePreview();
  }
  function previewAlignment() {
    if (!draftDecoded?.final) return;
    const p = PaintPreparation.prepare(draftDecoded.final, draftDecoded.initial, { ...draft, resolution: 380 }), c = $('alignPreview');
    c.width = p.width; c.height = p.height; const context = c.getContext('2d'); context.drawImage(p.baseCanvas, 0, 0); context.globalAlpha = .5; context.drawImage(p.finalCanvas, 0, 0); context.globalAlpha = 1;
  }
  $('imagesButton').onclick = () => { player?.pause(); draft = structuredClone(project); draftDecoded = { ...decoded }; resetBasePreview(); $('basePreviewZoom').value = 'fit'; $('finalFile').value = $('initialFile').value = ''; fillImageDialog(); $('imagesDialog').showModal(); };
  $('imagesDialog').addEventListener('close', resetBasePreview);
  $('generateBase').onclick = generateBasePreview; $('baseFit').onclick = () => comparison.fit();
  $('baseZoomOut').onclick = () => comparison.zoom(comparison.view.scale / 1.4); $('baseZoomIn').onclick = () => comparison.zoom(comparison.view.scale * 1.4);
  $('basePreviewZoom').onchange = () => { const value = $('basePreviewZoom').value; if (value === 'fit') comparison.fit(); else comparison.zoom(+value); };
  $('basePreset').onchange = () => { draft.baseGeneration = { ...window.PaintBase.preset($('basePreset').value), inkMatch: draft.baseGeneration.inkMatch }; syncBaseControls(); scheduleBasePreview(); };
  $('baseInkMatch').onchange = () => { draft.baseGeneration.inkMatch = $('baseInkMatch').value; syncBaseControls(); scheduleBasePreview(); };
  $('basePaper').onchange = () => { draft.baseGeneration.paper = $('basePaper').value; syncBaseControls(); scheduleBasePreview(); };
  for (const [id, key] of Object.entries(baseControls)) $(id).oninput = () => {
    draft.baseGeneration[key] = +$(id).value / 100;
    if (key === 'whitePoint' && draft.baseGeneration.whitePoint <= draft.baseGeneration.blackPoint) draft.baseGeneration.blackPoint = draft.baseGeneration.whitePoint - .01;
    syncBaseControls(); scheduleBasePreview();
  };
  $('downloadBase').onclick = () => action(async () => {
    if (!basePreviewGenerated || !generatedBase) return;
    const blob = await new Promise(resolve => generatedBase.baseCanvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error(t("no_se_pudo_generar_el_png")); download('imagen-inicial.png', blob, 'image/png');
  });
  function readFile(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(t("no_se_pudo_leer_el_archivo"))); reader.readAsDataURL(file); });
  }
  for (const kind of ['initial', 'final']) $(`${kind}File`).onchange = () => action(async () => {
    const file = $(`${kind}File`).files[0]; if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif|bmp|avif)$/.test(file.type)) throw new Error(t("utiliza_una_imagen_png_jpg_webp_gif_bmp_o_avif"));
    if (file.size > 40000000) throw new Error(t("utiliza_una_imagen_de_menos_de_40_mb"));
    const data = await readFile(file), image = await PaintPreparation.loadImage(data);
    draft.images[kind] = { name: file.name, data }; draftDecoded[kind] = image;
    if (kind === 'final' && !draftDecoded.initial && draft.baseMode === 'uploaded') draft.baseMode = 'derived';
    draft.alignment = zeroAlignment(); resetBasePreview(); fillImageDialog(); status(() => (t("imagen_cargada_value_aplica_para_actualizar_el_lienzo", { p0: file.name })));
  });
  $('baseMode').onchange = () => { draft.baseMode = $('baseMode').value; if (draft.baseMode === 'uploaded') resetBasePreview(); fillImageDialog(); if (draft.baseMode !== 'blank') scheduleBasePreview(); };
  $('resolution').onchange = () => { draft.resolution = +$('resolution').value; scheduleBasePreview(); };
  for (const [id, key, scale] of [['alignX', 'x', 100], ['alignY', 'y', 100], ['alignSX', 'sx', 100], ['alignSY', 'sy', 100], ['alignAngle', 'angle', 1]]) $(id).oninput = () => {
    const value = +$(id).value; if (!Number.isFinite(value) || value < +$(id).min || value > +$(id).max) return; draft.alignment[key] = value / scale; previewAlignment();
  };
  $('autoAlign').onclick = () => action(async () => {
    if (!draftDecoded.initial || !draftDecoded.final) throw new Error(t("carga_las_dos_imagenes_para_alinearlas"));
    status(() => (t("buscando_coincidencias_en_los_contornos"))); await waitFrame(); draft.alignment = PaintPreparation.autoAlign(draftDecoded.final, draftDecoded.initial); fillImageDialog(); status(() => (t("alineacion_automatica_calculada_revisa_la_superposicion_y_")));
  });
  $('applyImages').onclick = () => action(async () => {
    if (!draftDecoded.final) throw new Error(t("carga_primero_una_imagen_final_coloreada"));
    if (!draftDecoded.initial && draft.baseMode === 'uploaded') draft.baseMode = 'derived';
    if (draft.baseMode !== 'uploaded' && !basePreviewGenerated) return;
    clearTimeout(basePreviewTimer);
    if (!Array.from($('imagesDialog').querySelectorAll('input[type=number]')).every(i => i.checkValidity())) throw new Error(t("revisa_los_valores_de_alineacion_hay_un_campo_fuera_de_ran"));
    const selectedIndices = project.stages.flatMap((stage, index) => stageSelection.has(stage) ? [index] : []);
    project = draft; stageSelection = new Set(selectedIndices.map(index => project.stages[index])); decoded = draftDecoded; await prepareProject(draft.baseMode !== 'uploaded' ? generatedBase : null); $('imagesDialog').close(); status(() => (t("imagenes_preparadas_en_modo_editar_se_muestra_la_referenci")));
  });
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function syncAvailability() {
    const available = !!prepared && !busy; syncCanvasView();
    $('exportButton').disabled = !available;
    $('playButton').disabled = $('nextButton').disabled = !available || !!player?.getState().empty;
    $('restartButton').disabled = $('timeline').disabled = !available;
  }
  function hasPendingDrafts() {
    return !!(Object.keys(generalDraft).length || Object.keys(selectionDraft).length || generalInvalid.size || polygon.length || gesture ||
      ($('imagesDialog').open && draft && JSON.stringify(draft) !== JSON.stringify(project)));
  }
  const hasUnsavedChanges = () => dirty || hasPendingDrafts();
  async function saveProject(saveAs = false) {
    if (hasPendingDrafts()) { $('pendingSaveDialog').showModal(); return false; }
    history.endGroup();
    try {
      const result = await projectFiles.save(project, { saveAs, suggestedName: suggestedFilename(), description: t('project_details') });
      history.markSaved(); dirty = false; syncHistory();
      status(() => t(result.method === 'file' ? 'project_saved_file' : 'project_download_started', { name: result.name })); return true;
    } catch (error) { if (error.name === 'AbortError') { status(() => t('save_cancelled')); return false; } throw error; }
  }
  $('saveButton').onclick = () => action(() => saveProject());
  $('saveAsButton').onclick = () => action(() => saveProject(true));
  $('closePendingSave').onclick = () => $('pendingSaveDialog').close();
  let replacement = null;
  function refreshReplacement() {
    $('replaceTitle').textContent = t(replacement?.title || 'replace_title');
    $('replaceMessage').textContent = t(hasUnsavedChanges() ? 'replace_message' : 'replace_downloaded');
    $('replacePending').hidden = !hasPendingDrafts(); $('downloadBeforeReplace').disabled = hasPendingDrafts();
    $('confirmReplace').textContent = t(hasUnsavedChanges() ? 'discard_continue' : 'continuar');
  }
  function requestReplacement(title, run) {
    if (busy) return;
    if (!hasUnsavedChanges()) return action(run);
    player?.pause(); replacement = { title, run }; refreshReplacement(); $('replaceDialog').showModal();
    $('cancelReplace').focus();
  }
  $('cancelReplace').onclick = () => $('replaceDialog').close();
  $('replaceDialog').addEventListener('close', () => { replacement = null; });
  $('downloadBeforeReplace').onclick = () => action(async () => { if (await saveProject()) refreshReplacement(); });
  $('confirmReplace').onclick = () => { const run = replacement?.run; replacement = null; $('replaceDialog').close(); if (run) action(run); };
  function clearSession(next, images) {
    destroyPlayer(); resetBasePreview(); cached = null; prepared = null; revision++; cancelStageDelete(); canvasViewport.reset();
    project = next; decoded = images; draft = draftDecoded = null; resetSaveTarget();
    generalDraft = {}; selectionDraft = {}; generalReview = null; generalInvalid.clear();
    stageSelection = new Set([project.stages[0]]); selected = 0; selectedPoint = selectedHighlight = 0;
    polygon = []; gesture = null; radiusHandles = []; $('includeInitial').checked = false; $('showAllRadii').checked = false;
    $('viewMode').value = 'edit'; $('timeline').value = 0; $('timeLabel').textContent = '0:00 / —';
    $('canvasWrap').classList.remove('transparent'); canvas.width = canvas.height = overlay.width = overlay.height = 1;
    $('canvasWrap').hidden = true; $('emptyState').hidden = false; $('dimensions').textContent = '—';
    renderStages(); updateInspector(); setTool('point'); $('estimate').textContent = t('por_calcular');
  }
  async function installProject(next, images) {
    // Finish image preparation before replacing any of the current editable state.
    const ready = images.final ? PaintPreparation.prepare(images.final, images.initial, next) : null;
    historySuspended = true;
    try { clearSession(next, images); if (ready) await prepareProject(ready); }
    finally { historySuspended = false; }
    history.reset(project, editorContext()); dirty = false; syncAvailability(); syncHistory();
  }
  async function newProject() {
    await installProject(PaintPreferences.project(preferences, t('etapa_value', { p0: 1 })), {});
    status(() => t('new_project_ready'));
  }
  $('newButton').onclick = () => requestReplacement('new_project', newProject);
  $('emptyImagesButton').onclick = () => $('imagesButton').click();
  $('openButton').onclick = () => $('projectFile').click();
  const validateProject = data => window.PaintProject.normalize(data, { allowEmpty: true });
  $('projectFile').onchange = async () => {
    const file = $('projectFile').files[0]; $('projectFile').value = ''; if (!file) return;
    let candidate;
    await action(async () => {
      if (file.size > 150000000) throw new Error(t('el_archivo_de_proyecto_es_demasiado_grande_maximo_150_mb'));
      const next = validateProject(JSON.parse(await file.text())), images = {};
      if (next.images.final) images.final = await PaintPreparation.loadImage(next.images.final.data);
      if (next.images.initial) images.initial = await PaintPreparation.loadImage(next.images.initial.data);
      candidate = { next, images };
    });
    if (candidate) requestReplacement('abrir_proyecto', async () => { await installProject(candidate.next, candidate.images); projectFiles.reset(file.name); status(() => t('proyecto_abierto_puedes_continuar_editando')); });
  };
  const packField = field => window.PaintCodec.pack(field);
  $('exportButton').onclick = () => { $('exportMode').value = project.presentation.mode || 'standalone'; $('exportLanguage').value = i18n.language; $('exportBackground').value = project.presentation.background; $('exportColor').value = project.presentation.color; $('exportColorField').hidden = project.presentation.background !== 'color'; syncExportMode(); $('exportDialog').showModal(); };
  function syncExportMode() {
    const label = $('confirmExport').querySelector('span'), key = $('exportMode').value === 'integrated' ? 'download_integrated' : 'descargar_html';
    label.dataset.i18n = key; label.textContent = t(key);
  }
  $('exportMode').onchange = syncExportMode;
  $('exportBackground').onchange = () => { $('exportColorField').hidden = $('exportBackground').value !== 'color'; };
  $('cancelExport').onclick = () => $('exportDialog').close();
  $('confirmExport').onclick = () => action(async () => {
    const settings = normalizePresentation({ mode: $('exportMode').value, background: $('exportBackground').value, color: $('exportColor').value });
    if (JSON.stringify(settings) !== JSON.stringify(project.presentation)) { project.presentation = settings; recordHistory(); }
    $('exportDialog').close();
    const fields = await calculateFields(); player?.pause(); status(() => (t("empaquetando_la_presentacion_sin_conexion"))); await waitFrame();
    const data = { language: $('exportLanguage').value, width: prepared.width, height: prepared.height, presentation: project.presentation, initialView: project.initialView, base: prepared.baseCanvas.toDataURL('image/png'), final: prepared.finalCanvas.toDataURL('image/png'), fields: fields.filter(f => !f.skipped).map(packField) };
    const html = buildPresentation(data);
    if (settings.mode === 'integrated') download('animacion-integrada.zip', PaintIntegration.zip({ 'animacion.html': html, ...PaintIntegration.files() }), 'application/zip');
    else download('presentacion-tinta-y-color.html', html, 'text/html;charset=utf-8'); status(() => t(settings.mode === 'integrated' ? 'integrated_downloaded' : 'presentacion_descargada_un_solo_html_con_imagenes_y_animac'));
  });
  const buildPresentation = data => window.PaintPresentation.build(data);
  async function loadDemo() {
    if (!window.PAINT_DEMO) throw new Error(t("no_se_encontro_el_ejemplo_puedes_cargar_tus_imagenes_con_e"));
    const images = window.PAINT_DEMO;
    const decodedDemo = { final: await PaintPreparation.loadImage(images.final.data), initial: await PaintPreparation.loadImage(images.initial.data) };
    const makeRect = (x, y, r, b) => rectPoints({ x, y }, { x: r, y: b });
    const exampleProject = { format: 'tinta-y-color', version: 12, name: 'Samurái · ejemplo', baseGeneration: window.PaintBase.normalize(), presentation: presentationDefaults(), initialView: engine.normalizeView(), images: structuredClone(images), resolution: 1080, baseMode: 'uploaded', alignment: zeroAlignment(), stages: [
      engine.normalizeStage({ name: 'Primeros encuentros', zone: makeRect(.064, .035, .963, .287), points: [{ x: .75, y: .17 }, { x: .4, y: .17, startMode: 'delay', delay: .7 }, { x: .16, y: .17, startMode: 'delay', delay: .7 }], radius: .22, maxRadius: .4, speed: .13, hueResistance: 8, paintDelay: 1.2, cameraDuration: .8, pauseAfter: true, frame: { x: .53, y: .03, width: .44, height: .27 } }),
      engine.normalizeStage({ name: 'La escena central', zone: makeRect(.064, .293, .963, .659), points: [{ x: .48, y: .47 }, { x: .88, y: .5 }, { x: .18, y: .5, startMode: 'after' }], radius: .35, maxRadius: .5, speed: .13, windStrength: .35, windAngle: 20, pauseAfter: true, frame: { x: .06, y: .29, width: .91, height: .38 } }),
      engine.normalizeStage({ name: 'El cierre de la página', zone: makeRect(.064, .665, .963, .948), points: [{ x: .79, y: .8 }, { x: .43, y: .81 }, { x: .15, y: .8 }], radius: .25, maxRadius: .4, speed: .13 }),
      engine.normalizeStage({ name: 'Una última mirada', points: [], cameraDuration: 1, hold: .6, zoom: 0, frame: { x: .06, y: .29, width: .91, height: .38 }, highlightEnabled: true, outside: 'transparent' })
    ] };
    status(() => t('alineando_las_imagenes_del_ejemplo')); await waitFrame(); exampleProject.alignment = PaintPreparation.autoAlign(decodedDemo.final, decodedDemo.initial);
    await installProject(exampleProject, decodedDemo); status(() => t('ejemplo_listo_marca_un_origen_ajusta_los_parametros_y_puls'));
  }
  $('exampleButton').onclick = () => requestReplacement('preferences_load_example', loadDemo);
  window.addEventListener('beforeunload', e => { if (hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ''; } });
  new ResizeObserver(fitCanvas).observe($('canvasArea'));
  // Native selectors remain keyboard accessible; show their full value if it is clipped.
  const selectLabels = new WeakMap(), observedSelects = new Set(), selectMetrics = document.createElement('canvas').getContext('2d');
  function fitSelectLabel(select) {
    const label = selectLabels.get(select); if (!label || !select.isConnected) return;
    const text = select.selectedOptions[0]?.textContent || '', style = getComputedStyle(select);
    selectMetrics.font = style.font || `${style.fontSize} ${style.fontFamily}`;
    const required = selectMetrics.measureText(text).width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 24;
    select.title = text; label.textContent = text;
    label.hidden = !select.clientWidth || required <= select.clientWidth;
  }
  const selectResize = new ResizeObserver(entries => entries.forEach(({ target }) => fitSelectLabel(target)));
  let selectLayoutFrame = 0;
  function scheduleSelectLabels() {
    if (selectLayoutFrame) return;
    selectLayoutFrame = requestAnimationFrame(() => {
      selectLayoutFrame = 0;
      for (const select of observedSelects) if (!select.isConnected) { selectResize.unobserve(select); observedSelects.delete(select); }
      document.querySelectorAll('.field select,.point-mode select,.general-parameter select').forEach(select => {
        if (!selectLabels.has(select)) {
          const label = document.createElement('span'); label.className = 'select-value'; label.hidden = true;
          label.setAttribute('aria-hidden', 'true'); select.after(label); selectLabels.set(select, label); observedSelects.add(select); selectResize.observe(select);
        }
        fitSelectLabel(select);
      });
    });
  }
  document.addEventListener('change', event => { if (event.target.matches('select')) scheduleSelectLabels(); }, true);
  const preferencesEditor = PaintPreferencesEditor.create({ getValue: () => preferences, download, onLayout: scheduleSelectLabels,
    onSave: value => { const saved = PaintPreferences.save(preferenceStorage, value); preferences = saved.value; status(() => t(saved.stored ? 'preferences_saved' : 'preferences_session_only')); }
  });
  // Interfaz de diagnóstico local, útil para comprobar exportaciones sin dependencias.
  window.TintaColor = { hasUnsavedChanges, undo: () => restoreHistory(-1), redo: () => restoreHistory(1), getCanvasView: () => canvasViewport.state(), getHistory: () => ({ canUndo: history.canUndo, canRedo: history.canRedo }), getPreferences: () => structuredClone(preferences), getProject: () => structuredClone(project), getPrepared: () => prepared, calculateFields, buildPresentation, packField, validateProject, getPlayer: () => player, getRevision: () => revision, getBasePreviewState: () => ({ complete: basePreviewGenerated, revision: previewRevision, view: { ...comparison.view }, state: $('basePreviewIndicator').dataset.state }) };

  function refreshLanguage() {
    // Keep unfinished numeric edits and their invalid state across language changes.
    const invalid = new Set(generalInvalid), values = new Map([...document.querySelectorAll('#generalParameters input[type=number]')].map(input => [input.id, input.value]));
    i18n.apply(document); document.querySelectorAll('[data-language-select]').forEach(select => select.value = i18n.language);
    renderStages(); updateInspector(); syncHistory();
    if (isBulk()) {
      for (const key of invalid) {
        generalInvalid.add(key); const parameter = general.parameters.find(p => p.key === key), row = document.querySelector('[data-parameter="' + key + '"]');
        if (!row) continue; const number = row.querySelector('input[type=number]'); number.value = values.get(number.id) ?? ''; number.setAttribute('aria-invalid', 'true');
        row.querySelector('output').textContent = t('introduce_un_valor_entre_value_y_value', { p0: parameter.min, p1: parameter.max });
      }
      updateGeneralPending();
    }
    if (generalReview && $('generalDialog').open) renderGeneralReview();
    if (player) playerState(player.getState());
    else { $('playButton').setAttribute('aria-label', t('reproducir')); $('playStatus').textContent = t('listo_para_explorar'); }
    if (!isBulk()) {
      const hints = { point: 'clic_anadir_o_seleccionar_centro_mover_asas_t_m_radios_dob', rect: 'arrastra_para_delimitar_la_zona_de_esta_etapa', polygon: 'clic_para_anadir_vertices_enter_o_doble_clic_para_cerrar_e', path: 'arrastra_para_dibujar_el_recorrido_sustituye_el_recorrido_', camera: 'arrastra_el_rectangulo_de_enfoque_el_acercamiento_se_ajust', highlight: 'ctrl_arrastrar_agregar_clic_seleccionar_arrastra_interior_' };
      $('toolHint').textContent = canvasViewport.state().hand ? t('canvas_pan_hint') : t(hints[tool]);
    }
    if ($('imagesDialog').open && draft) {
      syncBaseControls();
      $('finalName').textContent = draft.images.final?.name || t('sin_imagen');
      $('initialName').textContent = draft.images.initial?.name || t('no_se_necesita_si_generas_la_base_desde_la_final');
      $('generateBase').textContent = t(previewStarted ? 'actualizar_vista_previa' : 'generar_vista_previa');
      const state = $('basePreviewIndicator').dataset.state;
      $('basePreviewState').textContent = t(({ off:'sin_vista_previa', pending:'actualizando_detalle', detail:'completando_imagen', ready:'actualizada', error:'error_al_actualizar' })[state]);
      if (state === 'ready') {
        $('basePreviewIndicator').title = t('toda_la_imagen_corresponde_a_los_ultimos_parametros');
        const p = previewResult; $('basePreviewStatus').textContent = draft.baseMode === 'blank' ? t('blank_base_preview_ready', { width:p.width, height:p.height }) : t('value_value_px_value_pixeles_igualados_compara_antes_de_ap', { p0:p.width, p1:p.height, p2:p.inkMatchPixels });
      } else if (state === 'pending' || state === 'detail') updatePreviewPhase();
      else if (state === 'off') { $('basePreviewIndicator').title = t('sin_vista_previa'); $('basePreviewStatus').textContent = t('pulsa_generar_vista_previa_para_ver_la_base_propuesta'); }
      else if (state === 'error') { $('basePreviewIndicator').title = i18n.error(previewErrorMessage); $('basePreviewStatus').textContent = i18n.error(previewErrorMessage); }
    }
    if (lastStatus) status(lastStatus.message, lastStatus.error);
    preferencesEditor.refreshLanguage(); if ($('replaceDialog').open) refreshReplacement();
    scheduleSelectLabels(); drawOverlay();
  }
  document.querySelectorAll('[data-language-select], #exportLanguage').forEach(select => {
    select.replaceChildren(); for (const code of i18n.languages) { const option = document.createElement('option'); option.value = code; option.textContent = i18n.messages(code)._language_name || code; select.append(option); }
  });
  document.querySelectorAll('[data-language-select]').forEach(select => { select.value = i18n.language; select.onchange = () => i18n.setLanguage(select.value); });
  i18n.subscribe(refreshLanguage);

  renderStages(); updateInspector(); scheduleSelectLabels();
  const startup = document.documentElement.dataset.startup || preferences.startup;
  async function loadEmbeddedProject() {
    const next = validateProject(JSON.parse($('tinta-color-project').textContent)), images = {};
    for (const kind of ['final', 'initial']) if (next.images[kind]) images[kind] = await PaintPreparation.loadImage(next.images[kind].data);
    await installProject(next, images);
    if ($('tinta-color-save')) {
      const info = JSON.parse($('tinta-color-save').textContent);
      if (typeof info.fileName === 'string' && typeof info.directory === 'string') {
        saveSuggestion = { ...info, projectName: project.name }; $('suggestedDirectory').value = info.directory; $('saveAdvice').hidden = false;
      }
    }
    status(() => t('proyecto_abierto_puedes_continuar_editando'));
  }
  action($('tinta-color-project') ? loadEmbeddedProject : startup === 'empty' ? newProject : loadDemo).then(() => { if (loadedPreferences.reset && !$('status').classList.contains('error')) status(() => t('preferences_recovered')); });
})();
