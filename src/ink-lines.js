/* Extracción K: fondo robusto, grises graduales y líneas coherentes.
 * JavaScript puro; no necesita servicios, bibliotecas ni generación de imágenes.
 */
(function (root) {
  'use strict';
  const f = Math.fround, clamp = n => Math.max(0, Math.min(1, n));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const gray = alpha => Math.round(255 * (1 - clamp(alpha)));
  function medianRGB(rgba, width, height, radius = 7) {
    const out = new Uint8Array(width * height * 3), diameter = radius * 2 + 1, target = (diameter * diameter) >> 1;
    const xs = new Int32Array(width + radius * 2), ys = new Int32Array(height + radius * 2);
    for (let x = -radius; x < width + radius; x++) xs[x + radius] = Math.max(0, Math.min(width - 1, x));
    for (let y = -radius; y < height + radius; y++) ys[y + radius] = Math.max(0, Math.min(height - 1, y)) * width;
    for (let c = 0; c < 3; c++) for (let y = 0; y < height; y++) {
      const hist = new Uint32Array(256);
      for (let j = 0; j < diameter; j++) for (let i = 0; i < diameter; i++) hist[rgba[(ys[y + j] + xs[i]) * 4 + c]]++;
      let median = 0, below = 0;
      while (below + hist[median] <= target) below += hist[median++];
      for (let x = 0; x < width; x++) {
        out[(y * width + x) * 3 + c] = median;
        if (x === width - 1) break;
        for (let j = 0; j < diameter; j++) {
          const row = ys[y + j], old = rgba[(row + xs[x]) * 4 + c], next = rgba[(row + xs[x + diameter]) * 4 + c];
          hist[old]--; hist[next]++; if (old < median) below--; if (next < median) below++;
        }
        while (below > target) { median--; below -= hist[median]; }
        while (below + hist[median] <= target) below += hist[median++];
      }
    }
    return out;
  }
  function maximum(input, width, height, channels, radius) {
    const temp = new Uint8Array(input.length), out = new Uint8Array(input.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < channels; c++) {
      let value = 0;
      for (let k = -radius; k <= radius; k++) value = Math.max(value, input[(y * width + Math.max(0, Math.min(width - 1, x + k))) * channels + c]);
      temp[(y * width + x) * channels + c] = value;
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < channels; c++) {
      let value = 0;
      for (let k = -radius; k <= radius; k++) value = Math.max(value, temp[(Math.max(0, Math.min(height - 1, y + k)) * width + x) * channels + c]);
      out[(y * width + x) * channels + c] = value;
    }
    return out;
  }
  function compute(rgba, paper, width, height, sensitivity = .7) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height * 4 !== rgba.length) throw new Error('La extracción de líneas necesita dimensiones válidas de la imagen.');
    const n = width * height, pp = paper.map(v => f(Math.max(1, v))), norm = new Float32Array(n * 3), light = new Float32Array(n);
    const max = new Float32Array(n), chroma = new Float32Array(n), global = new Uint8Array(n), seed = new Uint8Array(n), ratios = new Float32Array(n);
    const median = medianRGB(rgba, width, height), rawRGB = new Uint8Array(n * 3);
    // Mayor sensibilidad exige más contraste y retira variaciones más tenues.
    // El valor .7 reproduce las constantes del ensayo K, sin ajuste adicional.
    const factor = Math.pow(2, sensitivity - .7), contrastThreshold = value => 1 - (1 - value) * factor;
    for (let i = 0; i < n; i++) {
      let high = 0, low = 1, ratio = 0;
      for (let c = 0; c < 3; c++) {
        const value = norm[i * 3 + c] = clamp(rgba[i * 4 + c] / pp[c]);
        high = Math.max(high, value); low = Math.min(low, value); rawRGB[i * 3 + c] = rgba[i * 4 + c];
        ratio = Math.max(ratio, f(value / Math.max(f(median[i * 3 + c] / pp[c]), .08)));
      }
      max[i] = high; chroma[i] = high - low; ratios[i] = ratio;
      light[i] = norm[i * 3] * .2126 + norm[i * 3 + 1] * .7152 + norm[i * 3 + 2] * .0722;
      const c = (1 - smooth(.27, .48, high)) * (1 - smooth(.14 / factor, .32 / factor, chroma[i]));
      global[i] = gray(c);
      const local = (1 - smooth(contrastThreshold(.36), contrastThreshold(.78), ratio)) * (1 - smooth(.50, .70, high));
      seed[i] = gray(Math.max(c, local)) <= 229 ? 1 : 0;
    }
    const support = maximum(seed, width, height, 1, 1), wide = maximum(seed, width, height, 1, 2);
    const small = maximum(rawRGB, width, height, 3, 2), base = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      let ratio = 0, background = Infinity;
      for (let c = 0; c < 3; c++) { const b = f(small[i * 3 + c] / pp[c]); ratio = Math.max(ratio, f(norm[i * 3 + c] / Math.max(b, .08))); background = Math.min(background, b); }
      const contrast = Math.max(0, f(1 - ratio));
      const mean = f(f(f(norm[i * 3] + norm[i * 3 + 1]) + norm[i * 3 + 2]) / 3);
      const fine = (1 - mean) * (1 - smooth(.06 / factor, .14 / factor, chroma[i])) * smooth(.82, .96, background) * smooth(.025 * factor, .075 * factor, contrast) * (wide[i] || contrast > .16 * factor ? 1 : 0);
      const gradual = Math.max(1 - global[i] / 255, clamp((.98 - ratios[i]) / .70) * support[i]);
      base[i] = gray(Math.max(gradual, fine));
    }
    const addition = new Float32Array(n), contrast = new Float32Array(n), side = new Float32Array(n);
    const directions = [[1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1]];
    const weights = [.2126, .7152, .0722];
    for (const [dx, dy] of directions) {
      const length = Math.hypot(dx, dy), tx = dx / length, ty = dy / length, nx = -ty, ny = tx;
      const offsets = [3, 4, -3, -4].map(k => [Math.round(nx * k), Math.round(ny * k)]);
      const along = [-3, -2, 2, 3].map(k => [Math.round(tx * k), Math.round(ty * k)]);
      // Sólo se usan perfiles a >=5 px del borde. Evita millones de arrays
      // temporales y mantiene idénticas las muestras que usa la recuperación.
      const deltas = offsets.map(([a, b]) => (b * width + a) * 3);
      for (let y = 4; y < height - 4; y++) for (let x = 4; x < width - 4; x++) {
        const i = y * width + x, p = i * 3;
        let ll = 0, lr = 0, difference = 0;
        for (let c = 0; c < 3; c++) {
          const a = f(f(norm[p + deltas[0] + c] + norm[p + deltas[1] + c]) * .5), b = f(f(norm[p + deltas[2] + c] + norm[p + deltas[3] + c]) * .5), weight = weights[c];
          ll += a * weight; lr += b * weight; difference += Math.abs(a - b);
        }
        const bg = Math.min(f(ll), f(lr)); contrast[i] = clamp((bg - light[i]) / Math.max(bg, .05)); side[i] = difference / 3;
      }
      for (let y = 8; y < height - 8; y++) for (let x = 8; x < width - 8; x++) {
        const i = y * width + x; let sum = contrast[i], minimum = contrast[i];
        for (const [a, b] of along) { const value = contrast[(y + b) * width + x + a]; sum += value; minimum = Math.min(minimum, value); }
        const confidence = smooth(.12 * factor, .22 * factor, sum / 5) * smooth(.06 * factor, .13 * factor, minimum) * smooth(.13 * factor, .23 * factor, contrast[i]) * (1 - smooth(.08, .16, side[i]));
        addition[i] = Math.max(addition[i], clamp((contrast[i] - .02 * factor) / .68) * confidence);
      }
    }
    for (let i = 0; i < n; i++) base[i] = Math.min(base[i], gray(addition[i]));
    return base;
  }
  root.PaintInkLines = { compute, medianRGB };
})(typeof window === 'undefined' ? globalThis : window);
