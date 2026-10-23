/* Browser defaults are separate from projects and the deterministic automation API. */
(function (root) {
  'use strict';
  const key = 'colorflow.preferences', format = 'tinta-y-color-preferences';
  const clone = value => JSON.parse(JSON.stringify(value));
  const parameters = root.PaintGeneral.parameters;
  const stageKeys = parameters.filter(p => p.scope !== 'point').map(p => p.key);
  const pointKeys = parameters.filter(p => p.scope === 'point').map(p => p.key);
  const pick = (source, keys) => Object.fromEntries(keys.map(name => [name, source[name]]));
  function factory() {
    const stage = root.PaintEngine.normalizeStage({ maxRadius: .4, points: [{}] });
    return { format, version: 1, startup: 'example', resolution: 1080, baseMode: 'derived',
      editor: { showAllRadii: false }, baseGeneration: root.PaintBase.normalize(), presentation: root.PaintProject.normalizePresentation(),
      stage: pick(stage, stageKeys), point: pick(stage.points[0], pointKeys) };
  }
  function invalid(code = 'preferences_invalid') { throw new Error(code); }
  function shape(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) invalid();
  }
  function validate(input) {
    const defaults = factory();
    // Preferences exported before v0.21.1 have no editor settings.
    if (input && typeof input === 'object' && !Array.isArray(input) && !Object.hasOwn(input, 'editor')) input = { ...input, editor: defaults.editor };
    shape(input, Object.keys(defaults));
    shape(input.editor, ['showAllRadii']);
    if (typeof input.editor.showAllRadii !== 'boolean') invalid();
    if (input.format !== format || input.version !== 1 || !['example', 'empty'].includes(input.startup) || ![720, 1080, 1440].includes(input.resolution) || !['uploaded', 'derived', 'blank'].includes(input.baseMode)) invalid();
    for (const [name, keys] of [['stage', stageKeys], ['point', pointKeys]]) {
      shape(input[name], keys); try { root.PaintGeneral.validate(input[name]); } catch (_) { invalid(); }
      for (const parameter of parameters.filter(p => keys.includes(p.key) && p.type === 'number')) {
        const steps = (input[name][parameter.key] * parameter.scale - parameter.min) / parameter.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-7) invalid();
      }
    }
    const b = input.baseGeneration; shape(b, Object.keys(defaults.baseGeneration));
    if (!['protected', 'coherent', 'ink', 'grayscale'].includes(b.method) || !['none', 'source-to-base', 'base-to-final', 'darken', 'multiply'].includes(b.inkMatch) || !['matched', 'white'].includes(b.paper)) invalid();
    for (const name of ['colorToGray', 'sensitivity', 'blackPoint', 'whitePoint', 'smoothness']) if (typeof b[name] !== 'number' || !Number.isFinite(b[name]) || b[name] < 0 || b[name] > 1 || Math.abs(b[name] * 100 - Math.round(b[name] * 100)) > 1e-7) invalid();
    if (b.blackPoint > .9 || b.whitePoint < .1 || b.whitePoint < b.blackPoint + .01 - 1e-8) invalid('preferences_thresholds');
    shape(input.presentation, ['background', 'color']);
    if (!['hatch', 'color', 'transparent'].includes(input.presentation.background) || !/^#[0-9a-f]{6}$/i.test(input.presentation.color)) invalid();
    return clone(input);
  }
  function load(storage) {
    try { const raw = storage?.getItem(key); return { value: raw ? validate(JSON.parse(raw)) : factory(), reset: false }; }
    catch (_) { return { value: factory(), reset: true }; }
  }
  function save(storage, value) {
    const validated = validate(value);
    try { if (!storage) throw new Error(); storage.setItem(key, JSON.stringify(validated)); return { value: validated, stored: true }; }
    catch (_) { return { value: validated, stored: false }; }
  }
  function stage(value, index, name) {
    const p = validate(value);
    return root.PaintEngine.normalizeStage({ ...p.stage, name, points: [], path: [], zone: null }, index);
  }
  function project(value, name) {
    const p = validate(value);
    return { format: 'tinta-y-color', version: 12, name: '', resolution: p.resolution, baseMode: p.baseMode,
      baseGeneration: clone(p.baseGeneration), presentation: clone(p.presentation), initialView: root.PaintEngine.normalizeView(p.stage),
      images: {}, alignment: root.PaintProject.zeroAlignment(), stages: [stage(p, 0, name)] };
  }
  root.PaintPreferences = { key, factory, validate, load, save, stage, project };
})(typeof window === 'undefined' ? globalThis : window);
