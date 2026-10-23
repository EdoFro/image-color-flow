/* Formato editable compartido; mantiene la lectura de versiones anteriores. */
(function (root) {
  'use strict';
  const engine = root.PaintEngine;
  const zeroAlignment = () => ({ x: 0, y: 0, sx: 1, sy: 1, angle: 0 });
  const normalizeName = value => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 120) : '';
  function filename(name) {
    let stem = normalizeName(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 100) || 'proyecto-tinta-y-color';
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(stem)) stem = 'proyecto-' + stem;
    return stem + '.colorflow.json';
  }
  function normalizePresentation(value = {}) { return { ...(value?.mode === 'integrated' ? { mode: 'integrated' } : {}), background: ['hatch', 'color', 'transparent'].includes(value?.background) ? value.background : 'hatch', color: /^#[0-9a-f]{6}$/i.test(value?.color || '') ? value.color : '#e5e7e3' }; }
  function normalizeInitialView(value = {}) { return { ...engine.normalizeView(value), pauseAfter: value?.pauseAfter !== false }; }
  function validateProject(data, { allowEmpty = false } = {}) {
    const empty = allowEmpty && data?.images && typeof data.images === 'object' && !Array.isArray(data.images) && Object.keys(data.images).length === 0;
    if (!data || data.format !== 'tinta-y-color' || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(data.version) || (!data.images?.final?.data && !empty) || !Array.isArray(data.stages) || !data.stages.length || data.stages.length > 64) throw new Error('El archivo no es un proyecto compatible de Tinta y color.');
    const images = {};
    for (const kind of ['final', 'initial']) if (data.images[kind]) {
      const image = data.images[kind]; if (typeof image.data !== 'string' || image.data.length > 60000000 || !/^data:image\/(png|jpeg|webp|gif|bmp|avif);base64,/.test(image.data)) throw new Error('El proyecto contiene una imagen no compatible.');
      images[kind] = { name: String(image.name || kind).slice(0, 200), data: image.data };
    }
    const alignment = zeroAlignment(), a = data.alignment || {};
    for (const key of Object.keys(alignment)) { const n = +a[key]; if (Number.isFinite(n)) alignment[key] = key === 'sx' || key === 'sy' ? Math.max(.7, Math.min(1.3, n)) : key === 'angle' ? Math.max(-10, Math.min(10, n)) : Math.max(-.3, Math.min(.3, n)); }
    const baseGeneration = root.PaintBase.normalize(data.version < 7 ? { method: 'grayscale' } : data.version === 7 ? { method: 'ink', ...data.baseGeneration } : data.version === 8 ? { method: 'coherent', ...data.baseGeneration } : data.baseGeneration);
    return { format: 'tinta-y-color', version: 14, name: normalizeName(data.name), baseGeneration, presentation: normalizePresentation(data.presentation), initialView: normalizeInitialView(data.initialView), images, alignment, baseMode: data.baseMode === 'blank' ? 'blank' : data.baseMode === 'uploaded' && (images.initial || empty) ? 'uploaded' : 'derived', resolution: [720, 1080, 1440].includes(data.resolution) ? data.resolution : 1080, stages: data.stages.map(engine.normalizeStage) };
  }
  root.PaintProject = { normalize: validateProject, normalizePresentation, normalizeInitialView, normalizeName, filename, zeroAlignment };
})(typeof window === 'undefined' ? globalThis : window);
