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
    function highlight(config) { return (config?.highlightLinked !== false ? config?.frame : config?.highlightFrame) || { x: 0, y: 0, width: 1, height: 1 }; }
    function transparent(config) { return !!config?.highlightEnabled && config.outside === 'transparent'; }
    function createRenderer(createCanvas = () => document.createElement('canvas')) {
      let surface, surfaceCtx;
      function draw(ctx, source, width, height, config = {}, camera = full()) {
        let image = source;
        if (config.highlightEnabled && config.outside !== 'show') {
          if (!surface) { surface = createCanvas(); surfaceCtx = surface.getContext('2d'); }
          if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; }
          const c = surfaceCtx, r = highlight(config); c.clearRect(0, 0, width, height);
          c.save();
          if (config.outside === 'blur') {
            c.drawImage(source, 0, 0); c.filter = `blur(${(config.blur ?? 12) * Math.max(width, height) / 1080}px)`; c.drawImage(source, 0, 0); c.filter = 'none';
          } else if (config.outside !== 'transparent') {
            c.fillStyle = config.outside === 'white' ? '#ffffff' : config.outside === 'color' ? config.outsideColor || '#202c29' : '#000000'; c.fillRect(0, 0, width, height);
          }
          // Recortar el original después del fondo evita desenfocar o teñir el área destacada.
          c.drawImage(source, r.x * width, r.y * height, r.width * width, r.height * height, r.x * width, r.y * height, r.width * width, r.height * height);
          c.restore(); image = surface;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, camera.x * width, camera.y * height, camera.size * width, camera.size * height, 0, 0, width, height);
        return transparent(config);
      }
      return { draw };
    }
    return { full, target, interpolate, highlight, transparent, createRenderer };
  }
  root.createPaintView = createPaintView; root.PaintView = createPaintView();
})(typeof window === 'undefined' ? globalThis : window);
