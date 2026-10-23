/* Cámara y destacado: compartidos por editor y presentación sin conexión. */
(function (root) {
  'use strict';
  function createPaintView() {
    const full = () => ({ x: 0, y: 0, size: 1 });
    function target(config) {
      const r = config?.frame; if (!r) return full();
      const size = Math.min(1, Math.max(.02, r.width, r.height)), zoom = Math.max(0, Math.min(1, config.zoom ?? 1));
      const x = Math.max(0, Math.min(1 - size, r.x + r.width / 2 - size / 2)), y = Math.max(0, Math.min(1 - size, r.y + r.height / 2 - size / 2));
      return { x: x * zoom, y: y * zoom, size: 1 + (size - 1) * zoom };
    }
    function interpolate(a, b, amount) { const t = Math.max(0, Math.min(1, amount)), ease = t * t * (3 - 2 * t); return { x: a.x + (b.x - a.x) * ease, y: a.y + (b.y - a.y) * ease, size: a.size + (b.size - a.size) * ease }; }
    function highlights(config) {
      const page = { x: 0, y: 0, width: 1, height: 1 };
      if (config?.highlightLinked !== false) return [config?.frame || page];
      if (Array.isArray(config?.highlightFrames)) return config.highlightFrames.length ? config.highlightFrames : [page];
      return [config?.highlightFrame || page];
    }
    function highlight(config) { return highlights(config)[0]; }
    function transparent(config) { return !!config?.highlightEnabled && config.outside === 'transparent'; }
    function createRenderer(createCanvas = () => document.createElement('canvas')) {
      const layers = [];
      function layer(index, width, height) {
        if (!layers[index]) layers[index] = createCanvas();
        const canvas = layers[index]; if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        return canvas;
      }
      function styled(source, width, height, config, index, contentTransparent) {
        let image = source;
        if (config.highlightEnabled && config.outside !== 'show') {
          const surface = layer(index, width, height), c = surface.getContext('2d'), rects = highlights(config); c.clearRect(0, 0, width, height);
          c.save();
          if (config.outside === 'blur') {
            c.drawImage(source, 0, 0); c.filter = `blur(${(config.blur ?? 12) * Math.max(width, height) / 1080}px)`; c.drawImage(source, 0, 0); c.filter = 'none';
          } else if (config.outside !== 'transparent') {
            c.fillStyle = config.outside === 'white' ? '#ffffff' : config.outside === 'color' ? config.outsideColor || '#202c29' : '#000000'; c.fillRect(0, 0, width, height);
          }
          // Recortar el original después del fondo evita desenfocar o teñir el área destacada.
          if (contentTransparent) {
            c.beginPath(); for (const r of rects) c.rect(r.x * width, r.y * height, r.width * width, r.height * height); c.clip();
            c.clearRect(0, 0, width, height); c.drawImage(source, 0, 0);
          } else if (rects.length === 1) {
            // Conservar exactamente la ruta del destacado único anterior.
            const r = rects[0]; c.drawImage(source, r.x * width, r.y * height, r.width * width, r.height * height, r.x * width, r.y * height, r.width * width, r.height * height);
          } else {
            // Un solo dibujo recortado por la unión: no acumula alfa en solapamientos.
            c.beginPath(); for (const r of rects) c.rect(r.x * width, r.y * height, r.width * width, r.height * height); c.clip(); c.drawImage(source, 0, 0);
          }
          c.restore(); image = surface;
        }
        return image;
      }
      function project(ctx, image, width, height, camera) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, camera.x * width, camera.y * height, camera.size * width, camera.size * height, 0, 0, width, height);
      }
      function draw(ctx, source, width, height, config = {}, camera = full(), contentTransparent = false) {
        project(ctx, styled(source, width, height, config, 0, contentTransparent), width, height, camera);
        return contentTransparent || transparent(config);
      }
      function transition(ctx, source, width, height, from = {}, to = {}, amount = 1, camera = full(), contentTransparent = false) {
        if (amount <= 0) return draw(ctx, source, width, height, from, camera, contentTransparent);
        if (amount >= 1) return draw(ctx, source, width, height, to, camera, contentTransparent);
        const t = Math.max(0, Math.min(1, amount)), ease = t * t * (3 - 2 * t);
        const a = highlights(from), b = highlights(to);
        let leftConfig = from, rightConfig = to;
        if (a.length === b.length) {
          const rects = a.map((rect, i) => { const result = {}; for (const key of ['x', 'y', 'width', 'height']) result[key] = rect[key] + (b[i][key] - rect[key]) * ease; return result; });
          leftConfig = { ...from, highlightLinked: false, highlightFrame: rects[0], highlightFrames: rects };
          rightConfig = { ...to, highlightLinked: false, highlightFrame: rects[0], highlightFrames: rects };
        }
        // Si cambia la cantidad, fundir ambas máscaras completas sin inventar un rectángulo envolvente.
        const left = styled(source, width, height, leftConfig, 0, contentTransparent), right = styled(source, width, height, rightConfig, 1, contentTransparent);
        const mix = layer(2, width, height), c = mix.getContext('2d'); c.clearRect(0, 0, width, height); c.save();
        // Suma ponderada en alfa premultiplicada: no crea un rectángulo opaco durante la transición.
        c.globalAlpha = 1 - ease; c.drawImage(left, 0, 0); c.globalCompositeOperation = 'lighter';
        c.globalAlpha = ease; c.drawImage(right, 0, 0); c.restore();
        project(ctx, mix, width, height, camera); return contentTransparent || transparent(from) || transparent(to);
      }
      return { draw, transition };
    }
    return { full, target, interpolate, highlight, highlights, transparent, createRenderer };
  }
  root.createPaintView = createPaintView; root.PaintView = createPaintView();
})(typeof window === 'undefined' ? globalThis : window);
