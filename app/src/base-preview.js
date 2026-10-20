/* Cálculo en Worker Blob: funciona también al abrir el editor desde file://. */
(function (root) {
  'use strict';
  function workerMain() {
    let source, job, protection, scheduled = false;
    const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    function prioritize() {
      if (!job) return;
      const v = job.view, cx = v.x + v.width / 2, cy = v.y + v.height / 2;
      job.pending.sort((a, b) => Number(overlap(b, v)) - Number(overlap(a, v)) || Math.hypot(a.x + a.width / 2 - cx, a.y + a.height / 2 - cy) - Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy));
    }
    function schedule() { if (!scheduled) { scheduled = true; setTimeout(step, 0); } }
    function step() {
      scheduled = false; if (!job || !source) return;
      const j = job;
      try {
        if (j.config.method === 'protected' && !protection) protection = PaintInkLines.protection(source.rgba, source.paper, source.width, source.height);
        const tile = j.pending.shift(); if (!tile) return;
        const sx = source.width / source.outputWidth, sy = source.height / source.outputHeight;
        // Margen adicional para el remuestreo; region() añade los 12 px del motor.
        const margin = Math.ceil(Math.max(sx, sy)) * 4;
        const x = Math.max(0, Math.floor(tile.x * sx) - margin), y = Math.max(0, Math.floor(tile.y * sy) - margin);
        const right = Math.min(source.width, Math.ceil((tile.x + tile.width) * sx) + margin), bottom = Math.min(source.height, Math.ceil((tile.y + tile.height) * sy) + margin);
        const rect = { x, y, width: right - x, height: bottom - y };
        const pixels = PaintBase.region(source.rgba, source.paper, j.config, source.width, source.height, rect, { protection });
        j.native.getContext('2d').putImageData(new ImageData(pixels, rect.width, rect.height), x, y);
        const ctx = j.scaled.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, source.outputWidth, source.outputHeight); ctx.drawImage(j.native, 0, 0, source.outputWidth, source.outputHeight);
        const base = ctx.getImageData(tile.x, tile.y, tile.width, tile.height).data, final = new Uint8ClampedArray(base.length);
        for (let row = 0; row < tile.height; row++) {
          const i = ((tile.y + row) * source.outputWidth + tile.x) * 4;
          final.set(source.final.subarray(i, i + tile.width * 4), row * tile.width * 4);
        }
        const matched = PaintBase.matchInk(base, final, j.config, source.paper); j.matched += matched; j.done.push(tile);
        const detailReady = !j.pending.some(t => overlap(t, j.view));
        postMessage({ type: 'tile', revision: j.revision, tile, base, final, detailReady, remaining: j.pending.length }, [base.buffer, final.buffer]);
        if (!j.pending.length) { postMessage({ type: 'complete', revision: j.revision, matched: j.matched }); job = null; }
      } catch (error) { postMessage({ type: 'error', revision: j.revision, message: error.message }); job = null; }
    }
    onmessage = ({ data }) => {
      if (data.type === 'init') { source = data.source; protection = null; job = null; }
      if (data.type === 'cancel') job = null;
      // Confirmación entre bloques: procesa cambios de encuadre/cancelación antes del siguiente.
      if (data.type === 'continue' && job && data.revision === job.revision) schedule();
      if (data.type === 'view' && job && data.revision === job.revision) { job.view = data.view; prioritize(); }
      if (data.type === 'start') {
        const pending = [], size = 192;
        for (let y = 0; y < source.outputHeight; y += size) for (let x = 0; x < source.outputWidth; x += size) pending.push({ x, y, width: Math.min(size, source.outputWidth - x), height: Math.min(size, source.outputHeight - y) });
        job = { revision: data.revision, config: data.config, view: data.view, pending, done: [], matched: 0, native: new OffscreenCanvas(source.width, source.height), scaled: new OffscreenCanvas(source.outputWidth, source.outputHeight) };
        prioritize(); schedule();
      }
    };
  }
  function workerSource() { return `(${root.installPaintInkLines.toString()})(self);\n(${root.installPaintBase.toString()})(self);\n(${workerMain.toString()})();`; }
  function create(onMessage, onError) {
    const url = URL.createObjectURL(new Blob([workerSource()], { type: 'text/javascript' }));
    let worker, alive = true;
    try { worker = new Worker(url); } finally { URL.revokeObjectURL(url); }
    worker.onmessage = event => { if (!alive) return; onMessage(event.data); if (alive && event.data.type === 'tile' && event.data.remaining) worker.postMessage({ type: 'continue', revision: event.data.revision }); }; worker.onerror = event => { if (alive) onError(new Error(event.message || 'No se pudo calcular la vista previa.')); };
    return { post: data => { if (alive) worker.postMessage(data); }, destroy: () => { alive = false; worker.terminate(); } };
  }
  root.PaintBasePreview = { create, workerSource };
})(typeof window === 'undefined' ? globalThis : window);
