/* Compartido por el editor y el HTML autónomo; no usa recursos de red. */
(function (root) {
  'use strict';
  function createPaintPlayer(canvas, model, onState = () => {}) {
    const { width, height, base, final, fields } = model;
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'), frame = ctx.createImageData(width, height), committed = new Uint8Array(width * height);
    const offsets = [0]; fields.forEach(f => offsets.push(offsets[offsets.length - 1] + f.duration));
    const total = offsets[offsets.length - 1];
    let index = 0, time = 0, playing = false, waiting = false, ended = false, last = 0, raf = 0, destroyed = false;
    function state() { return { index, time, playing, waiting, ended, elapsed: (offsets[index] || 0) + time, total, name: fields[index]?.name || '' }; }
    function commit(field) { for (let i = 0; i < committed.length; i++) if (Number.isFinite(field.times[i])) committed[i] = 255; }
    function render() {
      const field = fields[index], out = frame.data;
      for (let i = 0; i < committed.length; i++) {
        let alpha = committed[i] / 255;
        if (field) {
          const v = Math.max(0, Math.min(1, (time - field.times[i]) / field.fade));
          const smooth = v * v * (3 - 2 * v); if (smooth > alpha) alpha = smooth;
        }
        const k = i * 4;
        out[k] = base[k] + (final[k] - base[k]) * alpha;
        out[k + 1] = base[k + 1] + (final[k + 1] - base[k + 1]) * alpha;
        out[k + 2] = base[k + 2] + (final[k + 2] - base[k + 2]) * alpha; out[k + 3] = 255;
      }
      ctx.putImageData(frame, 0, 0); onState(state());
    }
    function schedule() { if (!raf && playing && !destroyed) raf = requestAnimationFrame(tick); }
    function tick(now) {
      raf = 0; if (!playing || destroyed) return;
      // El tiempo real transcurre incluso si algún fotograma tarda más en dibujarse.
      if (last) time += Math.max(0, (now - last) / 1000);
      last = now;
      const field = fields[index];
      if (time >= field.duration) {
        const excess = time - field.duration;
        time = field.duration; commit(field);
        if (index === fields.length - 1) { playing = false; ended = true; }
        else if (field.pauseAfter) { playing = false; waiting = true; }
        else { index++; time = excess; last = now; }
      }
      render(); schedule();
    }
    function pause() { playing = false; last = 0; if (raf) cancelAnimationFrame(raf); raf = 0; render(); }
    function play() {
      if (!fields.length || destroyed) return;
      if (ended) restart();
      if (waiting) { waiting = false; index++; time = 0; }
      playing = true; last = 0; render(); schedule();
    }
    function restart() { pause(); committed.fill(0); index = 0; time = 0; waiting = false; ended = false; render(); }
    function seek(seconds) {
      pause(); committed.fill(0); waiting = false; ended = false;
      const target = Math.max(0, Math.min(total, seconds)); index = 0;
      while (index < fields.length - 1 && target >= offsets[index + 1]) { commit(fields[index]); index++; }
      time = target - offsets[index]; ended = target >= total; render();
    }
    function next() { if (index < fields.length - 1) { const resume = playing || waiting; seek(offsets[index + 1]); if (resume) play(); } else { seek(total); } }
    function previous() { seek(offsets[Math.max(0, time > .1 ? index : index - 1)]); }
    render();
    return { play, pause, restart, seek, next, previous, toggle: () => playing ? pause() : play(), getState: state, destroy() { destroyed = true; playing = false; if (raf) cancelAnimationFrame(raf); } };
  }
  root.createPaintPlayer = createPaintPlayer;
})(typeof window === 'undefined' ? globalThis : window);
