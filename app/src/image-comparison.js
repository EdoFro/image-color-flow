/* Dos vistas de un mismo encuadre, con miniatura y controles compartidos. */
(function (root) {
  'use strict';
  function create({ panels, mini, zoomOutput, onView = () => {} }) {
    let sources, width = 1, height = 1, fitted = true, drag, miniDrag;
    const view = { x: .5, y: .5, scale: 1 };
    const checker = document.createElement('canvas'); checker.width = checker.height = 16;
    const check = checker.getContext('2d'); check.fillStyle = '#fafafa'; check.fillRect(0, 0, 16, 16); check.fillStyle = '#ddd'; check.fillRect(0, 0, 8, 8); check.fillRect(8, 8, 8, 8);
    function size() { return { width: Math.max(1, Math.min(...panels.map(c => c.getBoundingClientRect().width))), height: Math.max(1, Math.min(...panels.map(c => c.getBoundingClientRect().height))) }; }
    function constrain() {
      const s = size(), dx = s.width / view.scale / 2, dy = s.height / view.scale / 2;
      view.x = dx >= width / 2 ? width / 2 : Math.max(dx, Math.min(width - dx, view.x));
      view.y = dy >= height / 2 ? height / 2 : Math.max(dy, Math.min(height - dy, view.y));
    }
    function rect() {
      const s = size(), x = Math.max(0, Math.floor(view.x - s.width / view.scale / 2)), y = Math.max(0, Math.floor(view.y - s.height / view.scale / 2));
      return { x, y, width: Math.min(width, Math.ceil(view.x + s.width / view.scale / 2)) - x, height: Math.min(height, Math.ceil(view.y + s.height / view.scale / 2)) - y };
    }
    function render(notify = false) {
      if (!sources) return;
      constrain(); const dpr = root.devicePixelRatio || 1;
      panels.forEach((c, i) => {
        const s = c.getBoundingClientRect(); c.width = Math.max(1, Math.round(s.width * dpr)); c.height = Math.max(1, Math.round(s.height * dpr));
        const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#e5e8e6'; ctx.fillRect(0, 0, s.width, s.height);
        ctx.translate(s.width / 2, s.height / 2); ctx.scale(view.scale, view.scale); ctx.translate(-view.x, -view.y); ctx.fillStyle = ctx.createPattern(checker, 'repeat'); ctx.fillRect(0, 0, width, height); ctx.drawImage(sources[i], 0, 0);
      });
      mini.width = 180; mini.height = Math.max(1, Math.round(180 * height / width));
      const ctx = mini.getContext('2d'); ctx.drawImage(sources[0], 0, 0, mini.width, mini.height);
      const r = rect(), x = r.x * mini.width / width, y = r.y * mini.height / height, w = r.width * mini.width / width, h = r.height * mini.height / height;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeRect(x, y, w, h); ctx.strokeStyle = '#1768bd'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
      zoomOutput.textContent = `${Math.round(view.scale * 100)} %`; if (notify) onView(rect());
    }
    function fit() { const s = size(); fitted = true; view.scale = Math.min(s.width / width, s.height / height) * .98; view.x = width / 2; view.y = height / 2; render(true); }
    function zoom(scale, anchor) {
      const next = Math.max(.04, Math.min(12, scale)); fitted = false;
      if (anchor) { const ix = view.x + anchor.x / view.scale, iy = view.y + anchor.y / view.scale; view.x = ix - anchor.x / next; view.y = iy - anchor.y / next; }
      view.scale = next; render(true);
    }
    function setSources(next, reset = false) {
      const oldWidth = width, oldHeight = height; sources = next; width = next[0].width; height = next[0].height;
      if (reset || fitted) fit(); else { view.x *= width / oldWidth; view.y *= height / oldHeight; view.scale *= oldWidth / width; render(true); }
    }
    for (const c of panels) {
      c.onpointerdown = e => { if (e.button !== 0) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; c.setPointerCapture(e.pointerId); };
      c.onpointermove = e => { if (!drag || drag.id !== e.pointerId) return; fitted = false; view.x = drag.vx - (e.clientX - drag.x) / view.scale; view.y = drag.vy - (e.clientY - drag.y) / view.scale; render(true); };
      c.onpointerup = c.onpointercancel = () => { drag = null; };
      c.addEventListener('wheel', e => { e.preventDefault(); const r = c.getBoundingClientRect(); zoom(view.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }); }, { passive: false });
      c.onkeydown = e => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); fitted = false; view.x += ((e.key === 'ArrowRight') - (e.key === 'ArrowLeft')) * 60 / view.scale; view.y += ((e.key === 'ArrowDown') - (e.key === 'ArrowUp')) * 60 / view.scale; render(true); };
    }
    function point(e) { const r = mini.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * width, y: (e.clientY - r.top) / r.height * height }; }
    function moveMini(e) { if (!miniDrag || miniDrag.id !== e.pointerId) return; const p = point(e); fitted = false; view.x = p.x - miniDrag.dx; view.y = p.y - miniDrag.dy; render(true); }
    mini.onpointerdown = e => { if (e.button !== 0) return; const p = point(e), r = rect(), inside = p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height; miniDrag = { id: e.pointerId, dx: inside ? p.x - view.x : 0, dy: inside ? p.y - view.y : 0 }; mini.setPointerCapture(e.pointerId); moveMini(e); };
    mini.onpointermove = moveMini; mini.onpointerup = mini.onpointercancel = () => { miniDrag = null; }; mini.onkeydown = panels[0].onkeydown;
    const observer = new ResizeObserver(() => { if (sources) { if (fitted) fit(); else render(true); } }); panels.forEach(c => observer.observe(c));
    return { setSources, render, fit, zoom, rect, view, get fitted() { return fitted; }, destroy() { observer.disconnect(); } };
  }
  root.PaintImageComparison = { create };
})(typeof window === 'undefined' ? globalThis : window);
