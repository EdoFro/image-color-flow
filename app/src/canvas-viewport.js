/* Editor-only view: coordinates and source pixels never change when navigating. */
(function (root) {
  'use strict';
  function createModel() {
    let width = 0, height = 0, boxWidth = 1, boxHeight = 1, padding = 20;
    let mode = 'fit', scale = 1, cx = .5, cy = .5;
    function layout() {
      if (!width || !height) return;
      const aw = Math.max(1, boxWidth - padding * 2), ah = Math.max(1, boxHeight - padding * 2);
      if (mode === 'fit') scale = Math.min(aw / width, ah / height);
      if (mode === 'width') scale = aw / width;
      if (mode === 'height') scale = ah / height;
      const halfX = Math.min(.5, aw / (2 * width * scale)), halfY = Math.min(.5, ah / (2 * height * scale));
      cx = Math.max(halfX, Math.min(1 - halfX, cx)); cy = Math.max(halfY, Math.min(1 - halfY, cy));
    }
    function state() { return { mode, scale, cx, cy, width: width * scale, height: height * scale, left: boxWidth / 2 - cx * width * scale, top: boxHeight / 2 - cy * height * scale, available: !!(width && height) }; }
    function zoom(value, x = boxWidth / 2, y = boxHeight / 2) {
      if (!width || !height || !Number.isFinite(value)) return;
      const old = state(), px = (x - old.left) / old.width, py = (y - old.top) / old.height;
      mode = 'custom'; scale = Math.max(.05, Math.min(8, value));
      cx = px - (x - boxWidth / 2) / (width * scale); cy = py - (y - boxHeight / 2) / (height * scale); layout();
    }
    return { state, zoom,
      resize(w, h, pad = 20) { boxWidth = w; boxHeight = h; padding = pad; layout(); },
      source(w, h) { width = w; height = h; layout(); },
      reset() { mode = 'fit'; scale = 1; cx = cy = .5; width = height = 0; },
      preset(value) { if (['fit','width','height'].includes(value)) { mode = value; cx = cy = .5; layout(); } else zoom(Number(value)); },
      pan(dx, dy) { if (!width || !height) return; cx -= dx / (width * scale); cy -= dy / (height * scale); layout(); }
    };
  }
  function create({ area, wrapper, canInteract, onChange }) {
    const model = createModel(); let hand = false, drag = null, suppressClick = false;
    function apply() {
      const state = model.state();
      if (state.available) Object.assign(wrapper.style, { width: state.width + 'px', height: state.height + 'px', left: state.left + 'px', top: state.top + 'px' });
      onChange(state);
    }
    function resize() { const style = getComputedStyle(area); model.resize(area.clientWidth, area.clientHeight, Math.max(parseFloat(style.paddingLeft) || 0, parseFloat(style.paddingTop) || 0)); apply(); }
    area.addEventListener('wheel', event => {
      if (event.ctrlKey || !canInteract() || !model.state().available) return;
      event.preventDefault();
      const rect = area.getBoundingClientRect(), unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? area.clientHeight : 1;
      model.zoom(model.state().scale * Math.exp(Math.max(-1, Math.min(1, -event.deltaY * unit * .0015))), event.clientX - rect.left - area.clientLeft, event.clientY - rect.top - area.clientTop); apply();
    }, { passive: false });
    area.addEventListener('pointerdown', event => {
      if (!(event.button === 1 || hand && event.button === 0) || !canInteract() || !model.state().available) return;
      event.preventDefault(); event.stopImmediatePropagation();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; suppressClick = true;
      area.setPointerCapture(event.pointerId); area.classList.add('panning');
    }, true);
    area.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      model.pan(event.clientX - drag.x, event.clientY - drag.y); drag.x = event.clientX; drag.y = event.clientY; apply();
    }, true);
    function finish(event) {
      if (!drag || drag.id !== event.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation(); drag = null; area.classList.remove('panning');
      if (area.hasPointerCapture(event.pointerId)) area.releasePointerCapture(event.pointerId);
      setTimeout(() => { suppressClick = false; }, 0);
    }
    for (const type of ['pointerup','pointercancel','lostpointercapture']) area.addEventListener(type, finish, true);
    area.addEventListener('click', event => { if (hand || suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    area.addEventListener('auxclick', event => { if (event.button === 1) event.preventDefault(); });
    return { resize, state: () => ({ ...model.state(), hand, dragging: !!drag }),
      source(w, h) { model.source(w, h); resize(); },
      reset() { drag = null; hand = false; suppressClick = false; area.classList.remove('panning','hand-mode'); model.reset(); apply(); },
      preset(value) { if (!canInteract()) return; model.preset(value); apply(); },
      hand(value) { hand = value; area.classList.toggle('hand-mode', hand); onChange(model.state()); }
    };
  }
  root.PaintCanvasViewport = { createModel, create };
})(typeof window === 'undefined' ? globalThis : window);
