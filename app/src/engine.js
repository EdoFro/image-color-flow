/* Motor independiente de la interfaz. Coordenadas normalizadas; tiempos en segundos. */
(function (root) {
  'use strict';
  function createPaintEngine() {
    const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
    const number = (v, fallback, a, b) => Number.isFinite(+v) ? clamp(+v, a, b) : fallback;
    const point = p => ({ x: number(p && p.x, .5, 0, 1), y: number(p && p.y, .5, 0, 1) });
    const emitter = p => ({ ...point(p), enabled: p?.enabled !== false, startMode: ['with', 'after', 'delay'].includes(p?.startMode) ? p.startMode : 'with', delay: number(p?.delay, 0, 0, 3600), inheritRadii: p?.inheritRadii !== false, radius: number(p?.radius, .25, .01, 1.5), maxRadius: number(p?.maxRadius, 1.5, .01, 1.5) });
    function normalizeFrame(frame) {
      if (!frame || typeof frame !== 'object') return null;
      const x = number(frame.x, 0, 0, .98), y = number(frame.y, 0, 0, .98);
      return { x, y, width: number(frame.width, 1 - x, .02, 1 - x), height: number(frame.height, 1 - y, .02, 1 - y) };
    }
    function normalizeStage(s = {}, index = 0) {
      if (!s || typeof s !== 'object') s = {};
      return {
        name: String(s.name || `Etapa ${index + 1}`).slice(0, 80), enabled: s.enabled !== false,
        points: (Array.isArray(s.points) ? s.points : [{ x: .5, y: .5 }]).slice(0, 64).map(emitter),
        path: (Array.isArray(s.path) ? s.path : []).slice(0, 2000).map(point),
        zone: Array.isArray(s.zone) && s.zone.length >= 3 ? s.zone.slice(0, 200).map(point) : null,
        radius: number(s.radius, .25, .01, 1.5), speed: number(s.speed, .12, .01, .6),
        maxRadius: number(s.maxRadius, 1.5, .01, 1.5), hueResistance: number(s.hueResistance, 0, 0, 30),
        clarity: number(s.clarity, 3, 0, 8), ink: number(s.ink, 8, 0, 30),
        fade: number(s.fade, .45, .05, 2), blackThreshold: number(s.blackThreshold, 65, 5, 160),
        windStrength: number(s.windStrength, 0, 0, 2), windAngle: number(s.windAngle, 0, 0, 359),
        pathSpeed: number(s.pathSpeed, .3, .01, 1), pauseAfter: !!s.pauseAfter,
        ...normalizeView(s), cameraDuration: number(s.cameraDuration, .7, 0, 5), paintDelay: number(s.paintDelay, 0, 0, 60), hold: number(s.hold, 0, 0, 60)
      };
    }
    function normalizeView(v = {}) {
      if (!v || typeof v !== 'object') v = {};
      const highlightFrames = (Array.isArray(v.highlightFrames) ? v.highlightFrames : v.highlightFrame ? [v.highlightFrame] : []).slice(0, 64).map(normalizeFrame).filter(Boolean);
      return { frame: normalizeFrame(v.frame), zoom: number(v.zoom, 1, 0, 1), highlightEnabled: v.highlightEnabled === true,
        highlightLinked: v.highlightLinked !== false, highlightFrame: highlightFrames[0] || null, highlightFrames,
        outside: ['show', 'blur', 'black', 'white', 'color', 'transparent'].includes(v.outside) ? v.outside : 'blur',
        outsideColor: /^#[0-9a-f]{6}$/i.test(v.outsideColor || '') ? v.outsideColor : '#202c29', blur: number(v.blur, 12, 0, 40) };
    }
    function pointRadii(stage, p) { return p?.inheritRadii === false ? { radius: number(p.radius, stage.radius, .01, 1.5), maxRadius: number(p.maxRadius, stage.maxRadius, .01, 1.5) } : { radius: stage.radius, maxRadius: stage.maxRadius }; }
    function radiusDistance(stage, center, point, aspect) {
      const dx = point.x - center.x, dy = (point.y - center.y) * aspect, d = Math.hypot(dx, dy);
      return d / Math.exp(stage.windStrength * (d ? Math.cos(Math.atan2(dy, dx) - stage.windAngle * Math.PI / 180) : 0));
    }
    function inPolygon(x, y, polygon) {
      if (!polygon) return true;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      return inside;
    }
    function rasterizeZone(width, height, polygon) {
      const mask = new Uint8Array(width * height);
      if (!polygon) { mask.fill(1); return mask; }
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (inPolygon((x + .5) / width, (y + .5) / height, polygon)) mask[y * width + x] = 1;
      }
      return mask;
    }
    class Heap {
      constructor() { this.ids = new Uint32Array(4096); this.values = new Float64Array(4096); this.size = 0; }
      push(id, value) {
        if (this.size === this.ids.length) {
          const ids = new Uint32Array(this.size * 2), values = new Float64Array(this.size * 2);
          ids.set(this.ids); values.set(this.values); this.ids = ids; this.values = values;
        }
        let k = this.size++;
        while (k > 0) {
          const p = (k - 1) >> 1;
          if (this.values[p] <= value) break;
          this.ids[k] = this.ids[p]; this.values[k] = this.values[p]; k = p;
        }
        this.ids[k] = id; this.values[k] = value;
      }
      pop() {
        const id = this.ids[0], value = this.values[0], last = --this.size;
        if (last) {
          const nextId = this.ids[last], nextValue = this.values[last];
          let k = 0;
          while (k * 2 + 1 < last) {
            let c = k * 2 + 1;
            if (c + 1 < last && this.values[c + 1] < this.values[c]) c++;
            if (nextValue <= this.values[c]) break;
            this.ids[k] = this.ids[c]; this.values[k] = this.values[c]; k = c;
          }
          this.ids[k] = nextId; this.values[k] = nextValue;
        }
        return [id, value];
      }
    }
    function compute({ width, height, rgba, stage: rawStage, onProgress }) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width * height > 4000000 || !rgba || rgba.length !== width * height * 4) throw new Error('Dimensiones de imagen no válidas.');
      const stage = normalizeStage(rawStage), n = width * height, zone = rasterizeZone(width, height, stage.zone);
      if (!stage.enabled) {
        const times = new Float32Array(n), fullTimes = new Float32Array(n); times.fill(Infinity); fullTimes.fill(Infinity);
        return { times, fullTimes, opacity: new Uint8Array(n), accents: { indices: new Uint32Array(0), times: new Float32Array(0), opacity: new Uint8Array(0) }, duration: 0, paintDuration: 0, reached: 0, area: 0, fade: stage.fade, name: stage.name, enabled: false, pauseAfter: stage.pauseAfter, ignoredSeeds: 0, pointTimings: [], pathSamples: 0, skipped: true, visualOnly: false, ...normalizeView(stage), cameraDuration: stage.cameraDuration, paintDelay: stage.paintDelay, hold: stage.hold };
      }
      const luminosity = new Float32Array(n), resistance = new Float32Array(n), hue = new Float32Array(n), chroma = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const k = i * 4, r = rgba[k], g = rgba[k + 1], b = rgba[k + 2];
        const l = .2126 * r + .7152 * g + .0722 * b, hi = Math.max(r, g, b), lo = Math.min(r, g, b), delta = hi - lo;
        luminosity[i] = l; resistance[i] = (1 + (l < stage.blackThreshold ? stage.ink : 0)) / (1 + stage.clarity * l / 255);
        if (delta > 0) {
          let h = hi === r ? (g - b) / delta : hi === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
          hue[i] = ((h / 6) % 1 + 1) % 1; chroma[i] = delta / 255;
        }
      }
      const times = new Float32Array(n), fullTimes = new Float32Array(n), opacity = new Uint8Array(n);
      times.fill(Infinity); fullTimes.fill(Infinity);
      const localTimes = new Float32Array(n), stamps = new Uint32Array(n), boundaryStamps = new Uint32Array(n), caps = new Uint8Array(n), allowed = new Uint8Array(n);
      const accentIds = [], accentTimes = [], accentOpacity = [], pointTimings = [];
      let serial = 0, ignoredSeeds = 0, emitters = 0, duration = 0;
      const angle = stage.windAngle * Math.PI / 180, wx = Math.cos(angle), wy = Math.sin(angle);
      const moves = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dx, dy]) => {
        const length = Math.hypot(dx, dy);
        return { dx, dy, cost: length / (width * stage.speed * Math.exp(stage.windStrength * (dx * wx + dy * wy) / length)) };
      });
      function solve(p, start) {
        const radii = pointRadii(stage, p);
        const px = p.x * (width - 1), py = p.y * (height - 1), first = Math.round(py) * width + Math.round(px);
        if (!zone[first]) { ignoredSeeds++; return null; }
        const stamp = ++serial, heap = new Heap();
        function canEnter(i, x, y) {
          if (!zone[i]) return false;
          if (boundaryStamps[i] === stamp) return allowed[i] === 1;
          boundaryStamps[i] = stamp;
          const dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
          const dot = d ? (dx * wx + dy * wy) / d : 0, windRadius = Math.exp(stage.windStrength * dot);
          const fraction = d / (radii.maxRadius * width * windRadius);
          let cap = 0;
          if (fraction < 1) {
            const tail = clamp((fraction - .8) / .2, 0, 1);
            cap = Math.round(255 * (1 - tail * tail * (3 - 2 * tail)));
          }
          caps[i] = cap;
          allowed[i] = cap > 0 && (luminosity[i] >= stage.blackThreshold || d <= radii.radius * width * windRadius) ? 1 : 0;
          return allowed[i] === 1;
        }
        // El centro redondeado siempre pertenece a su propio emisor, incluso con radios mínimos.
        boundaryStamps[first] = stamp; caps[first] = 255; allowed[first] = 1;
        stamps[first] = stamp; localTimes[first] = 0; heap.push(first, 0);
        let end = 0, count = 0;
        while (heap.size) {
          const [i, t] = heap.pop(); if (t !== localTimes[i] || stamps[i] !== stamp) continue;
          const absolute = Math.fround(start + t), cap = caps[i];
          if (absolute < times[i]) times[i] = absolute;
          if (cap > opacity[i]) opacity[i] = cap;
          if (cap === 255) { if (absolute < fullTimes[i]) fullTimes[i] = absolute; }
          else { accentIds.push(i); accentTimes.push(absolute); accentOpacity.push(cap); }
          if (t > end) end = t; count++;
          const x = i % width, y = (i / width) | 0;
          for (const move of moves) {
            const nx = x + move.dx, ny = y + move.dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const j = ny * width + nx;
            if (!canEnter(j, nx, ny)) continue;
            if (move.dx && move.dy && (!canEnter(y * width + nx, nx, y) || !canEnter(ny * width + x, x, ny))) continue;
            let hueCost = 1;
            if (stage.hueResistance && chroma[i] > .02 && chroma[j] > .02 && luminosity[i] >= stage.blackThreshold && luminosity[j] >= stage.blackThreshold) {
              const diff = Math.abs(hue[i] - hue[j]), circular = Math.min(diff, 1 - diff) * 2;
              hueCost += stage.hueResistance * circular * Math.min(1, Math.sqrt(Math.min(chroma[i], chroma[j]) / .2));
            }
            const next = Math.fround(t + move.cost * (resistance[i] + resistance[j]) * .5 * hueCost);
            if (stamps[j] !== stamp || next < localTimes[j]) { stamps[j] = stamp; localTimes[j] = next; heap.push(j, next); }
          }
        }
        emitters++; const ownDuration = count ? end + stage.fade : 0;
        duration = Math.max(duration, start + ownDuration);
        return ownDuration;
      }
      let previous = null;
      stage.points.forEach((p, index) => {
        if (!p.enabled) { pointTimings.push({ index, enabled: false, start: null, end: null }); return; }
        const start = !previous ? stage.paintDelay : p.startMode === 'after' ? previous.end : previous.start + (p.startMode === 'delay' ? p.delay : 0);
        const ownDuration = solve(p, start);
        const timing = { index, enabled: true, start, end: start + (ownDuration || 0), duration: ownDuration || 0, ignored: ownDuration === null };
        pointTimings.push(timing); previous = timing;
        onProgress?.({ part: 'point', index: index + 1 });
      });
      // Muestreo por longitud de arco: la velocidad y el ancho de la huella no dependen de los vértices del ratón.
      const segments = []; let pathLength = 0;
      for (let i = 1; i < stage.path.length; i++) {
        const a = stage.path[i - 1], b = stage.path[i], length = Math.hypot((b.x - a.x) * (width - 1), (b.y - a.y) * (height - 1));
        if (length) { segments.push({ a, b, begin: pathLength, end: pathLength + length, length }); pathLength += length; }
      }
      let pathSamples = 0;
      if (stage.path.length) {
        solve(stage.path[0], stage.paintDelay); pathSamples++;
        const spacing = Math.max(2, Math.min(width * .025, stage.maxRadius * width * .25), pathLength / 512);
        let sample = spacing;
        for (const segment of segments) {
          while (sample <= segment.end) {
            const f = (sample - segment.begin) / segment.length;
            solve({ x: segment.a.x + (segment.b.x - segment.a.x) * f, y: segment.a.y + (segment.b.y - segment.a.y) * f }, stage.paintDelay + sample / (width * stage.pathSpeed));
            pathSamples++; sample += spacing;
            if (pathSamples % 8 === 0) onProgress?.({ part: 'path', index: pathSamples });
          }
        }
        if (pathLength) { solve(stage.path[stage.path.length - 1], stage.paintDelay + pathLength / (width * stage.pathSpeed)); pathSamples++; }
      }
      const hasActive = stage.points.some(p => p.enabled) || stage.path.length > 0;
      if (hasActive && !emitters) throw new Error('«' + stage.name + '»: coloca al menos un punto o un tramo del recorrido dentro de la zona.');
      // Eliminar contribuciones tenues dominadas por una llegada anterior de color completo.
      let kept = 0;
      for (let k = 0; k < accentIds.length; k++) if (fullTimes[accentIds[k]] > accentTimes[k]) kept++;
      const accents = { indices: new Uint32Array(kept), times: new Float32Array(kept), opacity: new Uint8Array(kept) };
      let dest = 0;
      for (let k = 0; k < accentIds.length; k++) if (fullTimes[accentIds[k]] > accentTimes[k]) {
        accents.indices[dest] = accentIds[k]; accents.times[dest] = accentTimes[k]; accents.opacity[dest++] = accentOpacity[k];
      }
      let reached = 0, area = 0; for (let i = 0; i < n; i++) { area += zone[i]; if (opacity[i]) reached++; }
      return { times, fullTimes, opacity, accents, duration: Math.max(duration, stage.cameraDuration) + stage.hold, paintDuration: duration,
        reached, area, fade: stage.fade, name: stage.name, pauseAfter: stage.pauseAfter, ignoredSeeds, pointTimings, pathSamples,
        skipped: false, enabled: true, visualOnly: !emitters, ...normalizeView(stage), cameraDuration: stage.cameraDuration, paintDelay: stage.paintDelay, hold: stage.hold };
    }
    return { compute, normalizeStage, normalizeView, pointRadii, radiusDistance, rasterizeZone, inPolygon };
  }
  root.createPaintEngine = createPaintEngine;
  root.PaintEngine = createPaintEngine();
})(typeof window === 'undefined' ? globalThis : window);
