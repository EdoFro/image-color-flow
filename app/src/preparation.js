(function (root) {
  'use strict';
  const clamp = n => Math.max(0, Math.min(255, n));
  function canvas(width, height) { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; }
  async function loadImage(url) {
    const image = new Image(); image.src = url;
    await image.decode();
    if (image.width * image.height > 60000000) throw new Error('La imagen supera los 60 megapíxeles. Reduce su tamaño antes de cargarla.');
    return image;
  }
  function draw(image, width, height) {
    const c = canvas(width, height), ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#faf7ed'; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height); return c;
  }
  function percentile(values, p) {
    const hist = new Uint32Array(256);
    for (const v of values) hist[Math.round(v)]++;
    let n = 0; const goal = values.length * p;
    for (let i = 0; i < 256; i++) { n += hist[i]; if (n >= goal) return i; }
    return 255;
  }
  function gray(data) {
    const out = new Float32Array(data.length / 4);
    for (let i = 0; i < out.length; i++) out[i] = .2126 * data[i * 4] + .7152 * data[i * 4 + 1] + .0722 * data[i * 4 + 2];
    return out;
  }
  function paperColor(data) {
    const l = gray(data), threshold = percentile(l, .85), sums = [0, 0, 0]; let count = 0;
    // Compare in the same rounded bins used by percentile, including warm flat paper.
    for (let i = 0; i < l.length; i++) if (Math.round(l[i]) >= threshold) { count++; for (let k = 0; k < 3; k++) sums[k] += data[i * 4 + k]; }
    return sums.map(v => count ? v / count : 245);
  }
  function prepare(finalImage, initialImage, options) {
    const edge = options.resolution || 1080, ratio = Math.min(1, edge / Math.max(finalImage.width, finalImage.height));
    const width = Math.max(2, Math.round(finalImage.width * ratio)), height = Math.max(2, Math.round(finalImage.height * ratio));
    const finalCanvas = draw(finalImage, width, height), final = finalCanvas.getContext('2d').getImageData(0, 0, width, height);
    const baseCanvas = canvas(width, height), ctx = baseCanvas.getContext('2d', { willReadFrequently: true });
    const paper = paperColor(final.data); let baseSourceSize = null, generatedPaper = paper, inkMatchPixels = 0;
    if (options.baseMode === 'blank') {
      const background = root.PaintBase.normalize(options.baseGeneration).paper;
      if (background !== 'transparent') {
        const color = background === 'white' ? [255, 255, 255] : paper;
        ctx.fillStyle = `rgb(${color.join(',')})`; ctx.fillRect(0, 0, width, height);
      }
    } else if (options.baseMode === 'derived' || !initialImage) {
      const base = ctx.createImageData(width, height);
      const config = root.PaintBase.normalize(options.baseGeneration);
      if (['coherent', 'protected'].includes(config.method)) {
        // Mantener la densidad de análisis al cambiar la resolución de animación.
        // Calvin y la acuarela se ensayaron a su tamaño nativo, hasta 1600 px.
        const scale = Math.min(1, 1600 / Math.max(finalImage.width, finalImage.height));
        const sw = Math.max(2, Math.round(finalImage.width * scale)), sh = Math.max(2, Math.round(finalImage.height * scale));
        const source = draw(finalImage, sw, sh), sourceCtx = source.getContext('2d', { willReadFrequently: true }), sourceData = sourceCtx.getImageData(0, 0, sw, sh);
        const pixels = sourceCtx.createImageData(sw, sh);
        generatedPaper = paperColor(sourceData.data);
        pixels.data.set(root.PaintBase.derive(sourceData.data, generatedPaper, config, sw, sh));
        sourceCtx.putImageData(pixels, 0, 0); ctx.drawImage(source, 0, 0, width, height); baseSourceSize = { width: sw, height: sh };
      } else {
        base.data.set(root.PaintBase.derive(final.data, paper, config, width, height));
        ctx.putImageData(base, 0, 0);
      }
    } else {
      const source = draw(initialImage, width, height), sourceCtx = source.getContext('2d'), pixels = sourceCtx.getImageData(0, 0, width, height);
      const l = gray(pixels.data), white = percentile(l, .9), black = Math.min(45, percentile(l, .015));
      for (let i = 0; i < l.length; i++) {
        const v = Math.max(0, Math.min(1.03, (l[i] - black) / Math.max(30, white - black)));
        for (let k = 0; k < 3; k++) pixels.data[i * 4 + k] = clamp(v * paper[k]);
        pixels.data[i * 4 + 3] = 255;
      }
      sourceCtx.putImageData(pixels, 0, 0);
      ctx.fillStyle = `rgb(${paper.join(',')})`; ctx.fillRect(0, 0, width, height);
      const a = options.alignment || { x: 0, y: 0, sx: 1, sy: 1, angle: 0 };
      ctx.save(); ctx.translate(width / 2 + a.x * width, height / 2 + a.y * height); ctx.rotate(a.angle * Math.PI / 180); ctx.scale(a.sx, a.sy); ctx.drawImage(source, -width / 2, -height / 2); ctx.restore();
    }
    const base = ctx.getImageData(0, 0, width, height);
    if (options.baseMode !== 'blank' && (options.baseMode === 'derived' || !initialImage)) {
      inkMatchPixels = root.PaintBase.matchInk(base.data, final.data, options.baseGeneration, generatedPaper);
      if (inkMatchPixels) { ctx.putImageData(base, 0, 0); finalCanvas.getContext('2d').putImageData(final, 0, 0); }
    }
    return { width, height, baseSourceSize, inkMatchPixels, base, final, baseCanvas, finalCanvas };
  }
  function previewSource(finalImage, options) {
    const ratio = Math.min(1, (options.resolution || 1080) / Math.max(finalImage.width, finalImage.height));
    const outputWidth = Math.max(2, Math.round(finalImage.width * ratio)), outputHeight = Math.max(2, Math.round(finalImage.height * ratio));
    const finalCanvas = draw(finalImage, outputWidth, outputHeight), final = finalCanvas.getContext('2d').getImageData(0, 0, outputWidth, outputHeight).data;
    const lines = ['coherent', 'protected'].includes(root.PaintBase.normalize(options.baseGeneration).method);
    const scale = lines ? Math.min(1, 1600 / Math.max(finalImage.width, finalImage.height)) : ratio;
    const width = Math.max(2, Math.round(finalImage.width * scale)), height = Math.max(2, Math.round(finalImage.height * scale));
    const source = draw(finalImage, width, height), rgba = source.getContext('2d').getImageData(0, 0, width, height).data;
    return { width, height, rgba, paper: paperColor(rgba), outputWidth, outputHeight, final, finalCanvas, baseSourceSize: lines ? { width, height } : null };
  }
  function autoAlign(finalImage, initialImage) {
    if (!initialImage) return { x: 0, y: 0, sx: 1, sy: 1, angle: 0 };
    const ratio = 220 / Math.max(finalImage.width, finalImage.height), w = Math.round(finalImage.width * ratio), h = Math.round(finalImage.height * ratio);
    function edges(image) {
      const c = draw(image, w, h), l = gray(c.getContext('2d').getImageData(0, 0, w, h).data), points = [], distance = new Float32Array(w * h); distance.fill(1000);
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        const i = y * w + x, gx = l[i + 1] - l[i - 1], gy = l[i + w] - l[i - w];
        if (Math.hypot(gx, gy) > 65) { distance[i] = 0; if ((x + y) % 3 === 0) points.push([x, y]); }
      }
      for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) { const i = y * w + x; distance[i] = Math.min(distance[i], distance[i - 1] + 1, distance[i - w] + 1, distance[i - w - 1] + 1.414); }
      for (let y = h - 2; y >= 0; y--) for (let x = w - 2; x >= 0; x--) { const i = y * w + x; distance[i] = Math.min(distance[i], distance[i + 1] + 1, distance[i + w] + 1, distance[i + w + 1] + 1.414); }
      return { points, distance };
    }
    const source = edges(initialImage), target = edges(finalImage);
    if (source.points.length < 30 || target.points.length < 30) throw new Error('No hay suficiente tinta definida para alinear automáticamente. Usa los ajustes manuales o genera la base desde la imagen final.');
    function score(a) {
      const c = Math.cos(a.angle * Math.PI / 180), s = Math.sin(a.angle * Math.PI / 180); let sum = 0, count = 0;
      for (const p of source.points) {
        const x = (p[0] - w / 2) * a.sx, y = (p[1] - h / 2) * a.sy;
        const tx = Math.round(x * c - y * s + w / 2 + a.x * w), ty = Math.round(x * s + y * c + h / 2 + a.y * h);
        sum += tx < 0 || ty < 0 || tx >= w || ty >= h ? 6 : Math.min(6, target.distance[ty * w + tx]); count++;
      }
      for (const p of target.points) {
        const x = p[0] - w / 2 - a.x * w, y = p[1] - h / 2 - a.y * h;
        const tx = Math.round((x * c + y * s) / a.sx + w / 2), ty = Math.round((-x * s + y * c) / a.sy + h / 2);
        sum += tx < 0 || ty < 0 || tx >= w || ty >= h ? 6 : Math.min(6, source.distance[ty * w + tx]); count++;
      }
      return sum / Math.max(1, count);
    }
    let best = { x: 0, y: 0, sx: 1, sy: 1, angle: 0 }, bestScore = score(best);
    for (const step of [.025, .01, .004, .0015]) {
      for (let pass = 0; pass < 6; pass++) {
        let improved = false;
        for (const key of ['x', 'y', 'sx', 'sy', 'angle']) for (const sign of [-1, 1]) {
          const trial = { ...best, [key]: best[key] + sign * step * (key === 'angle' ? 50 : 1) };
          if (Math.abs(trial.x) > .15 || Math.abs(trial.y) > .15 || trial.sx < .8 || trial.sx > 1.2 || trial.sy < .8 || trial.sy > 1.2 || Math.abs(trial.angle) > 6) continue;
          const value = score(trial);
          if (value + .0001 < bestScore) { best = trial; bestScore = value; improved = true; }
        }
        if (!improved) break;
      }
    }
    return best;
  }
  root.PaintPreparation = { loadImage, prepare, previewSource, autoAlign };
})(window);
