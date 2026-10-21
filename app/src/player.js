/* Reproductor compartido por el editor y las presentaciones sin conexión. */
(function (root) {
  'use strict';
  function createPaintPlayer(canvas, model, onState = () => {}) {
    const { width, height, base, final } = model;
    const views = model.viewAPI || globalThis.PaintView, initialView = model.initialView || {};
    const fields = model.fields.map((f, i) => ({ ...f, stageIndex: f.stageIndex ?? i })).filter(f => f.enabled !== false && !f.skipped && f.duration >= 0);
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'), frame = ctx.createImageData(width, height);
    const committed = new Uint8Array(width * height), alpha = new Float32Array(width * height);
    const framed = fields.some(f => f.frame || f.highlightEnabled) || initialView.frame || initialView.highlightEnabled, surface = framed ? (model.createCanvas ? model.createCanvas() : typeof document !== 'undefined' ? document.createElement('canvas') : null) : null;
    if (surface) { surface.width = width; surface.height = height; }
    const surfaceCtx = surface?.getContext('2d');
    const renderer = surfaceCtx && views ? views.createRenderer(model.createCanvas) : null;
    const offsets = [0]; fields.forEach(f => offsets.push(offsets[offsets.length - 1] + f.duration));
    const total = offsets[offsets.length - 1];
    let index = 0, time = 0, atStart = true, playing = false, waiting = false, ended = !fields.length, last = null, raf = 0, destroyed = false;
    function frameView(f) {
      if (views) return views.target(f);
      if (!f?.frame) return { x: 0, y: 0, size: 1 };
      const r = f.frame, size = Math.min(1, Math.max(.02, r.width, r.height));
      return { x: Math.max(0, Math.min(1 - size, r.x + r.width / 2 - size / 2)), y: Math.max(0, Math.min(1 - size, r.y + r.height / 2 - size / 2)), size };
    }
    function camera() {
      if (atStart) return frameView(initialView);
      const target = frameView(fields[index]), from = frameView(index ? fields[index - 1] : initialView);
      const t = fields[index]?.cameraDuration ? Math.min(1, time / fields[index].cameraDuration) : 1, ease = t * t * (3 - 2 * t);
      return { x: from.x + (target.x - from.x) * ease, y: from.y + (target.y - from.y) * ease, size: from.size + (target.size - from.size) * ease };
    }
    function transition() { return atStart ? 1 : fields[index]?.cameraDuration ? Math.min(1, time / fields[index].cameraDuration) : 1; }
    function state() { return { index: fields[index]?.stageIndex ?? 0, position: index, stageCount: fields.length, time, atStart, playing, waiting, ended, empty: !fields.length, phase: atStart ? 'initial' : ended ? 'completed' : playing ? 'playing' : waiting ? 'waiting' : 'paused', elapsed: (offsets[index] || 0) + time, total, name: atStart ? 'Inicio' : fields[index]?.name || '', camera: camera(), transparent: views ? views.transparent(atStart ? initialView : fields[index]) || (!atStart && transition() < 1 && views.transparent(index ? fields[index - 1] : initialView)) : false }; }
    function commit(field) {
      if (!field) return;
      for (let i = 0; i < committed.length; i++) {
        const value = field.opacity ? field.opacity[i] : Number.isFinite(field.times[i]) ? 255 : 0;
        if (value > committed[i]) committed[i] = value;
      }
    }
    function smooth(value) { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); }
    function render() {
      const field = atStart ? null : fields[index], out = frame.data, arrivals = field?.fullTimes || field?.times;
      for (let i = 0; i < committed.length; i++) alpha[i] = field ? Math.max(committed[i], 255 * smooth((time - arrivals[i]) / field.fade)) : committed[i];
      const accents = field?.accents;
      if (accents) for (let k = 0; k < accents.indices.length; k++) {
        if (time <= accents.times[k]) continue;
        const i = accents.indices[k], value = accents.opacity[k] * smooth((time - accents.times[k]) / field.fade);
        if (value > alpha[i]) alpha[i] = value;
      }
      for (let i = 0; i < committed.length; i++) {
        const a = alpha[i] / 255, k = i * 4;
        out[k] = base[k] + (final[k] - base[k]) * a; out[k + 1] = base[k + 1] + (final[k + 1] - base[k + 1]) * a;
        out[k + 2] = base[k + 2] + (final[k + 2] - base[k + 2]) * a; out[k + 3] = 255;
      }
      if (surfaceCtx) {
        surfaceCtx.putImageData(frame, 0, 0); const view = camera();
        if (renderer) {
          if (!atStart && renderer.transition) renderer.transition(ctx, surface, width, height, index ? fields[index - 1] : initialView, field, transition(), view);
          else renderer.draw(ctx, surface, width, height, atStart ? initialView : field, view);
        }
        else ctx.drawImage(surface, view.x * width, view.y * height, view.size * width, view.size * height, 0, 0, width, height);
      } else ctx.putImageData(frame, 0, 0);
      onState(state());
    }
    function schedule() { if (!raf && playing && !destroyed) raf = requestAnimationFrame(tick); }
    function tick(now) {
      raf = 0; if (!playing || destroyed) return;
      if (last !== null) time += Math.max(0, (now - last) / 1000); last = now;
      while (time >= fields[index].duration) {
        const field = fields[index], excess = time - field.duration;
        time = field.duration; commit(field);
        if (index === fields.length - 1) { playing = false; ended = true; break; }
        if (model.manual || field.pauseAfter) { playing = false; waiting = true; break; }
        index++; time = excess;
      }
      render(); schedule();
    }
    function stop() { playing = false; last = null; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function pause() { stop(); render(); }
    function play() {
      if (!fields.length || destroyed) return;
      if (ended && !atStart) restart();
      atStart = false;
      if (waiting) { waiting = false; index++; time = 0; }
      playing = true; last = null; render(); schedule();
    }
    function restart() { stop(); committed.fill(0); index = 0; time = 0; atStart = true; waiting = false; ended = !fields.length; render(); }
    function seek(seconds) {
      if (!fields.length) { restart(); return; }
      stop(); committed.fill(0); atStart = false; waiting = false; ended = !fields.length;
      const target = Math.max(0, Math.min(total, seconds)); index = 0;
      while (index < fields.length - 1 && target >= offsets[index + 1]) { commit(fields[index]); index++; }
      time = target - offsets[index]; ended = target >= total; if (ended) commit(fields[index]); render();
    }
    function next() { if (atStart) { play(); return; } if (index < fields.length - 1) { const resume = playing || waiting; seek(offsets[index + 1]); if (resume) play(); } else seek(total); }
    function previous() { if (!index && time <= .1) restart(); else seek(offsets[Math.max(0, time > .1 ? index : index - 1)]); }
    // Explicit checkpoints avoid seek's boundary convention (which selects the next stage).
    function showEnd(target) {
      if (!fields.length || target < 0) { restart(); return; }
      stop(); committed.fill(0); index = Math.min(target, fields.length - 1);
      for (let i = 0; i <= index; i++) commit(fields[i]);
      time = fields[index].duration; atStart = false; ended = index === fields.length - 1; waiting = !ended; render();
    }
    function advance(animate = true) {
      if (!fields.length || ended && !atStart) return { consumed: false, completed: true, state: state() };
      if (animate && playing) return { consumed: true, accepted: false, reason: 'busy', state: state() };
      if (animate) play();
      else showEnd(atStart ? 0 : waiting ? index + 1 : index);
      return { consumed: true, accepted: true, state: state() };
    }
    function back() { if (atStart) return; showEnd(index - 1); }
    function finish() { showEnd(fields.length - 1); }
    render();
    return { play, pause, restart, seek, next, previous, advance, back, finish, toggle: () => playing ? pause() : play(), getState: state, destroy() { destroyed = true; stop(); } };
  }
  root.createPaintPlayer = createPaintPlayer;
})(typeof window === 'undefined' ? globalThis : window);
