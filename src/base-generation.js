/* Transformación de píxeles pura: compartida por editor, API y pruebas sin DOM. */
(function (root) {
  'use strict';
  const presets = {
    ink: { method: 'ink', colorToGray: 0, sensitivity: .7, blackPoint: .14, whitePoint: .94, smoothness: .08, paper: 'matched' },
    soft: { method: 'ink', colorToGray: .35, sensitivity: .7, blackPoint: .08, whitePoint: .98, smoothness: .1, paper: 'matched' },
    grayscale: { method: 'grayscale', colorToGray: 1, sensitivity: .7, blackPoint: 0, whitePoint: 1, smoothness: .08, paper: 'matched' }
  };
  const limit = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const number = (value, fallback, a, b) => typeof value === 'number' && Number.isFinite(value) ? limit(value, a, b) : fallback;
  function normalize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    const defaults = value.method === 'grayscale' ? presets.grayscale : presets.ink;
    const blackPoint = number(value.blackPoint, defaults.blackPoint, 0, .9);
    return {
      method: defaults.method, colorToGray: number(value.colorToGray, defaults.colorToGray, 0, 1),
      sensitivity: number(value.sensitivity, defaults.sensitivity, 0, 1), blackPoint,
      whitePoint: Math.max(blackPoint + .01, number(value.whitePoint, defaults.whitePoint, .1, 1)),
      smoothness: number(value.smoothness, defaults.smoothness, 0, 1), paper: value.paper === 'white' ? 'white' : 'matched'
    };
  }
  const smooth = (a, b, value) => { const t = b > a ? limit((value - a) / (b - a)) : value >= b ? 1 : 0; return t * t * (3 - 2 * t); };
  function derive(rgba, estimatedPaper, settings) {
    const config = normalize(settings), out = new Uint8ClampedArray(rgba.length);
    const paper = config.paper === 'white' ? [255, 255, 255] : estimatedPaper;
    const paperLight = Math.max(1, .2126 * paper[0] + .7152 * paper[1] + .0722 * paper[2]);
    const threshold = .18 - .17 * config.sensitivity;
    const softness = Math.min(config.smoothness, (config.whitePoint - config.blackPoint) / 2);
    for (let k = 0; k < rgba.length; k += 4) {
      const r = rgba[k], g = rgba[k + 1], b = rgba[k + 2];
      const originalLight = .2126 * r + .7152 * g + .0722 * b;
      if (config.method === 'grayscale') {
        // Compatibilidad exacta con la desaturación de proyectos de formatos 1–6.
        for (let c = 0; c < 3; c++) out[k + c] = limit(Math.fround(originalLight) * paper[c] / paperLight, 0, 255);
      } else {
        // Neutralizar el tono del papel para no confundir un papel cálido con pigmento.
        const nr = limit(r / Math.max(1, estimatedPaper[0])), ng = limit(g / Math.max(1, estimatedPaper[1])), nb = limit(b / Math.max(1, estimatedPaper[2]));
        const light = .2126 * nr + .7152 * ng + .0722 * nb;
        const chroma = Math.max(nr, ng, nb) - Math.min(nr, ng, nb);
        const color = smooth(threshold, threshold + config.smoothness / 2, chroma);
        const dark = config.blackPoint ? 1 - smooth(config.blackPoint, config.blackPoint + softness, light) : 0;
        const white = config.whitePoint < 1 ? smooth(config.whitePoint - softness, config.whitePoint, light) : 0;
        const gray = light * (1 - dark), neutral = gray + (1 - gray) * white;
        // El pigmento detectable pasa a papel o a gris; el negro neutro permanece negro.
        const value = neutral + (1 - neutral) * color * (1 - config.colorToGray);
        for (let c = 0; c < 3; c++) out[k + c] = value * paper[c];
      }
      out[k + 3] = 255;
    }
    return out;
  }
  function presetName(settings) {
    const config = normalize(settings);
    return Object.keys(presets).find(name => Object.keys(config).every(key => config[key] === presets[name][key])) || 'custom';
  }
  root.PaintBase = { normalize, derive, presetName, preset: name => ({ ...(presets[name] || presets.ink) }) };
})(typeof window === 'undefined' ? globalThis : window);
