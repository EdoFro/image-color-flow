/* Transformación de píxeles pura: compartida por editor, API y pruebas sin DOM. */
(function installPaintBase(root) {
  'use strict';
  const presets = {
    protected: { method: 'protected', colorToGray: 0, sensitivity: .7, blackPoint: 0, whitePoint: 1, smoothness: 0, paper: 'white' },
    coherent: { method: 'coherent', colorToGray: 0, sensitivity: .7, blackPoint: 0, whitePoint: 1, smoothness: 0, paper: 'white' },
    ink: { method: 'ink', colorToGray: 0, sensitivity: .7, blackPoint: .14, whitePoint: .94, smoothness: .08, paper: 'matched' },
    soft: { method: 'ink', colorToGray: .35, sensitivity: .7, blackPoint: .08, whitePoint: .98, smoothness: .1, paper: 'matched' },
    grayscale: { method: 'grayscale', colorToGray: 1, sensitivity: .7, blackPoint: 0, whitePoint: 1, smoothness: .08, paper: 'matched' }
  };
  const limit = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const number = (value, fallback, a, b) => typeof value === 'number' && Number.isFinite(value) ? limit(value, a, b) : fallback;
  function normalize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    const defaults = value.method === 'grayscale' ? presets.grayscale : value.method === 'ink' ? presets.ink : value.method === 'coherent' ? presets.coherent : presets.protected;
    const blackPoint = number(value.blackPoint, defaults.blackPoint, 0, .9);
    return {
      inkMatch: ['source-to-base', 'base-to-final', 'darken', 'multiply'].includes(value.inkMatch) ? value.inkMatch : 'none',
      method: defaults.method, colorToGray: number(value.colorToGray, defaults.colorToGray, 0, 1),
      sensitivity: number(value.sensitivity, defaults.sensitivity, 0, 1), blackPoint,
      whitePoint: Math.max(blackPoint + .01, number(value.whitePoint, defaults.whitePoint, .1, 1)),
      smoothness: number(value.smoothness, defaults.smoothness, 0, 1), paper: value.paper === 'transparent' ? 'transparent' : value.paper === 'white' || value.paper === undefined && defaults.paper === 'white' ? 'white' : 'matched'
    };
  }
  const smooth = (a, b, value) => { const t = b > a ? limit((value - a) / (b - a)) : value >= b ? 1 : 0; return t * t * (3 - 2 * t); };
  function derive(rgba, estimatedPaper, settings, width, height, context = {}) {
    const config = normalize(settings), out = new Uint8ClampedArray(rgba.length);
    const paper = config.paper === 'white' ? [255, 255, 255] : estimatedPaper;
    const paperLight = Math.max(1, .2126 * paper[0] + .7152 * paper[1] + .0722 * paper[2]);
    if (config.method === 'coherent' || config.method === 'protected') {
      if (!root.PaintInkLines) throw new Error('No se cargó el motor de extracción de líneas.');
      let values = root.PaintInkLines.compute(rgba, estimatedPaper, width, height, config.sensitivity);
      if (config.method === 'protected') root.PaintInkLines.protect(values, rgba, estimatedPaper, width, height, context.protection || root.PaintInkLines.protection(rgba, estimatedPaper, width, height));
      // Suavizado opcional de acabado; cero conserva exactamente el ensayo K.
      if (config.smoothness > 0) {
        const radius = Math.ceil(config.smoothness * 3), sigma = Math.max(.15, config.smoothness), kernel = [];
        let sum = 0; for (let k = -radius; k <= radius; k++) { const v = Math.exp(-k * k / (2 * sigma * sigma)); kernel.push(v); sum += v; }
        const temp = new Float32Array(values.length), filtered = new Uint8Array(values.length);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { let v = 0; for (let k = -radius; k <= radius; k++) v += values[y * width + Math.max(0, Math.min(width - 1, x + k))] * kernel[k + radius]; temp[y * width + x] = v / sum; }
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { let v = 0; for (let k = -radius; k <= radius; k++) v += temp[Math.max(0, Math.min(height - 1, y + k)) * width + x] * kernel[k + radius]; filtered[y * width + x] = Math.round(v / sum); }
        values = filtered;
      }
      for (let i = 0; i < values.length; i++) {
        let value = values[i] / 255;
        const light = limit((.2126 * rgba[i * 4] / Math.max(1, estimatedPaper[0]) + .7152 * rgba[i * 4 + 1] / Math.max(1, estimatedPaper[1]) + .0722 * rgba[i * 4 + 2] / Math.max(1, estimatedPaper[2])));
        value *= 1 - config.colorToGray * (1 - light);
        const softness = Math.min(.08, (config.whitePoint - config.blackPoint) / 2);
        if (config.blackPoint) value *= smooth(config.blackPoint, config.blackPoint + softness, value);
        if (config.whitePoint < 1) value += (1 - value) * smooth(config.whitePoint - softness, config.whitePoint, value);
        for (let c = 0; c < 3; c++) out[i * 4 + c] = value * paper[c]; out[i * 4 + 3] = 255;
      }
      return out;
    }
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
  // Igualar después del escalado: los bordes también deben coincidir píxel a píxel.
  // Recibe buffers preparados; nunca modifica los originales guardados del proyecto.
  function matchInk(base, final, settings, generatedPaper = [255, 255, 255]) {
    const config = normalize(settings);
    if (!['coherent', 'protected'].includes(config.method) || config.inkMatch === 'none') return 0;
    if (base.length !== final.length || base.length % 4) throw new Error('Las imágenes deben tener las mismas dimensiones para igualar trazos.');
    const blank = new Uint8ClampedArray(config.paper === 'white' ? [255, 255, 255] : generatedPaper);
    let count = 0;
    for (let i = 0; i < base.length; i += 4) {
      // «No blanco» significa más oscuro que el papel generado, incluido un gris 254.
      if (base[i] >= blank[0] && base[i + 1] >= blank[1] && base[i + 2] >= blank[2]) continue;
      count++;
      const from = config.inkMatch === 'source-to-base' ? final : base;
      const to = config.inkMatch === 'source-to-base' ? base : final;
      if (config.inkMatch === 'darken' || config.inkMatch === 'multiply') {
        for (let c = 0; c < 3; c++) final[i + c] = config.inkMatch === 'darken' ? Math.min(final[i + c], base[i + c]) : Math.round(final[i + c] * base[i + c] / 255);
      } else for (let c = 0; c < 4; c++) to[i + c] = from[i + c];
    }
    return count;
  }
  // K depende de hasta 9 píxeles; el acabado gaussiano añade hasta 3.
  // Los bordes artificiales se descartan; el soporte conectado de L es global.
  function region(rgba, paper, settings, width, height, rect, context = {}) {
    const config = normalize(settings), halo = 12;
    if (config.method === 'protected' && !context.protection) throw new Error('El cálculo regional de L necesita el soporte global.');
    const x = Math.max(0, rect.x - halo), y = Math.max(0, rect.y - halo), right = Math.min(width, rect.x + rect.width + halo), bottom = Math.min(height, rect.y + rect.height + halo);
    const w = right - x, h = bottom - y, pixels = new Uint8ClampedArray(w * h * 4), keep = context.protection ? new Uint8Array(w * h) : null;
    for (let row = 0; row < h; row++) {
      pixels.set(rgba.subarray(((y + row) * width + x) * 4, ((y + row) * width + right) * 4), row * w * 4);
      if (keep) keep.set(context.protection.subarray((y + row) * width + x, (y + row) * width + right), row * w);
    }
    const derived = derive(pixels, paper, config, w, h, { protection: keep }), out = new Uint8ClampedArray(rect.width * rect.height * 4);
    for (let row = 0; row < rect.height; row++) { const i = ((rect.y - y + row) * w + rect.x - x) * 4; out.set(derived.subarray(i, i + rect.width * 4), row * rect.width * 4); }
    return out;
  }
  function presetName(settings) {
    const config = normalize(settings);
    return Object.keys(presets).find(name => Object.keys(presets[name]).every(key => config[key] === presets[name][key])) || 'custom';
  }
  root.installPaintBase = installPaintBase;
  root.PaintBase = { normalize, derive, region, matchInk, presetName, preset: name => ({ ...(presets[name] || presets.protected), inkMatch: 'none' }) };
})(typeof window === 'undefined' ? globalThis : window);
