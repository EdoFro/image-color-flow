/* Motor independiente de la interfaz. Coordenadas normalizadas; tiempos en segundos. */
(function (root) {
  'use strict';
  function createPaintEngine() {
    const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
    const number = (v, fallback, a, b) => Number.isFinite(+v) ? clamp(+v, a, b) : fallback;
    const point = p => ({ x: number(p && p.x, .5, 0, 1), y: number(p && p.y, .5, 0, 1) });
    function normalizeStage(s = {}, index = 0) {
      if (!s || typeof s !== 'object') s = {};
      return {
        name: String(s.name || `Etapa ${index + 1}`).slice(0, 80),
        points: (Array.isArray(s.points) ? s.points : [{ x: .5, y: .5 }]).slice(0, 64).map(point),
        path: (Array.isArray(s.path) ? s.path : []).slice(0, 2000).map(point),
        zone: Array.isArray(s.zone) && s.zone.length >= 3 ? s.zone.slice(0, 200).map(point) : null,
        radius: number(s.radius, .25, .01, 1.5), speed: number(s.speed, .12, .01, .6),
        clarity: number(s.clarity, 3, 0, 8), ink: number(s.ink, 8, 0, 30),
        fade: number(s.fade, .45, .05, 2), blackThreshold: number(s.blackThreshold, 65, 5, 160),
        windStrength: number(s.windStrength, 0, 0, 2), windAngle: number(s.windAngle, 0, 0, 359),
        pathSpeed: number(s.pathSpeed, .3, .01, 1), pauseAfter: !!s.pauseAfter
      };
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
    function compute({ width, height, rgba, stage: rawStage }) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width * height > 4000000 || !rgba || rgba.length !== width * height * 4) throw new Error('Dimensiones de imagen no válidas.');
      const stage = normalizeStage(rawStage), n = width * height;
      const zone = rasterizeZone(width, height, stage.zone), luminosity = new Float32Array(n), resistance = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const k = i * 4, l = .2126 * rgba[k] + .7152 * rgba[k + 1] + .0722 * rgba[k + 2];
        luminosity[i] = l;
        resistance[i] = (1 + (l < stage.blackThreshold ? stage.ink : 0)) / (1 + stage.clarity * l / 255);
      }
      const seeds = stage.points.map(p => ({ x: p.x * (width - 1), y: p.y * (height - 1), time: 0 }));
      let pathDistance = 0;
      for (let i = 0; i < stage.path.length; i++) {
        const p = stage.path[i], prev = stage.path[Math.max(0, i - 1)];
        const dx = (p.x - prev.x) * (width - 1), dy = (p.y - prev.y) * (height - 1), distance = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(distance / Math.max(2, width * .006)));
        for (let k = i === 0 ? 0 : 1; k <= (i === 0 ? 0 : steps); k++) {
          const f = k / steps;
          seeds.push({ x: (prev.x + (p.x - prev.x) * f) * (width - 1), y: (prev.y + (p.y - prev.y) * f) * (height - 1), time: (pathDistance + distance * f) / (width * stage.pathSpeed) });
        }
        pathDistance += distance;
      }
      const validSeeds = seeds.filter(p => zone[Math.round(p.y) * width + Math.round(p.x)]);
      if (!validSeeds.length) throw new Error(`«${stage.name}»: coloca al menos un punto o un tramo del recorrido dentro de la zona.`);
      const times = new Float32Array(n); times.fill(Infinity);
      const heap = new Heap(), angle = stage.windAngle * Math.PI / 180, wx = Math.cos(angle), wy = Math.sin(angle);
      const radius = stage.radius * width, passable = new Int8Array(n); passable.fill(-1);
      function canEnter(i, x, y) {
        if (!zone[i]) return false;
        if (luminosity[i] >= stage.blackThreshold) return true;
        if (passable[i] !== -1) return passable[i] === 1;
        let allowed = false;
        for (const p of validSeeds) {
          const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
          const dot = d ? (dx * wx + dy * wy) / d : 0;
          if (d <= radius * Math.exp(stage.windStrength * dot)) { allowed = true; break; }
        }
        passable[i] = allowed ? 1 : 0; return allowed;
      }
      for (const p of validSeeds) {
        const i = Math.round(p.y) * width + Math.round(p.x), t = Math.fround(p.time);
        if (t < times[i]) { times[i] = t; heap.push(i, t); }
      }
      const moves = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dx, dy]) => {
        const length = Math.hypot(dx, dy), wind = Math.exp(stage.windStrength * (dx * wx + dy * wy) / length);
        return { dx, dy, cost: length / (width * stage.speed * wind) };
      });
      while (heap.size) {
        const [i, t] = heap.pop();
        if (t !== times[i]) continue;
        const x = i % width, y = (i / width) | 0;
        for (const m of moves) {
          const nx = x + m.dx, ny = y + m.dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (!canEnter(j, nx, ny)) continue;
          // No atravesar diagonalmente esquinas de una zona o de una barrera de tinta.
          if (m.dx && m.dy && (!canEnter(y * width + nx, nx, y) || !canEnter(ny * width + x, x, ny))) continue;
          const next = Math.fround(t + m.cost * (resistance[i] + resistance[j]) * .5);
          if (next < times[j]) { times[j] = next; heap.push(j, next); }
        }
      }
      let max = 0, reached = 0, area = 0;
      for (let i = 0; i < n; i++) { area += zone[i]; if (Number.isFinite(times[i])) { reached++; if (times[i] > max) max = times[i]; } }
      return { times, duration: max + stage.fade, reached, area, fade: stage.fade, name: stage.name, pauseAfter: stage.pauseAfter, ignoredSeeds: seeds.length - validSeeds.length };
    }
    return { compute, normalizeStage, rasterizeZone, inPolygon };
  }
  root.createPaintEngine = createPaintEngine;
  root.PaintEngine = createPaintEngine();
})(typeof window === 'undefined' ? globalThis : window);
