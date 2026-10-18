(function (root) {
  'use strict';
  function runTests() {
    const results = [], engine = root.PaintEngine;
    function assert(condition, message) { if (!condition) throw new Error(message); }
    function test(name, fn) { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } }
    function image(w, h, value = 220) { const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value; data[i * 4 + 3] = 255; } return data; }
    function paint(data, w, x, y, value) { const i = (y * w + x) * 4; data[i] = data[i + 1] = data[i + 2] = value; }
    function calc(w, h, rgba, stage = {}) { return engine.compute({ width: w, height: h, rgba, stage: { points: [{ x: .5, y: .5 }], radius: 1.5, clarity: 0, ink: 0, speed: .1, fade: .2, ...stage } }); }
    test('La expansión sin viento es simétrica y aumenta con la distancia', () => {
      const f = calc(41, 41, image(41, 41));
      assert(Math.abs(f.times[20 * 41 + 10] - f.times[20 * 41 + 30]) < 1e-6, 'La simetría horizontal no se conserva.');
      assert(f.times[20 * 41 + 22] < f.times[20 * 41 + 30], 'La llegada debe aumentar con la distancia.');
    });
    test('Los colores claros se recorren más rápido que los oscuros', () => {
      const light = calc(41, 41, image(41, 41, 240), { clarity: 4 }), dark = calc(41, 41, image(41, 41, 80), { clarity: 4 });
      assert(light.times[20 * 41 + 35] < dark.times[20 * 41 + 35], 'No se aplicó la claridad.');
    });
    test('Aumentar la resistencia de la tinta demora el cruce dentro del radio', () => {
      const data = image(41, 41); for (let y = 0; y < 41; y++) paint(data, 41, 25, y, 0);
      const low = calc(41, 41, data, { ink: 0 }), high = calc(41, 41, data, { ink: 15 });
      assert(high.times[20 * 41 + 30] > low.times[20 * 41 + 30] + .5, 'La tinta no genera demora.');
    });
    test('Fuera del radio, una pared negra completa detiene la expansión', () => {
      const data = image(41, 41); for (let y = 0; y < 41; y++) paint(data, 41, 28, y, 0);
      const f = calc(41, 41, data, { radius: .1 });
      assert(!Number.isFinite(f.times[20 * 41 + 35]), 'La expansión atravesó una barrera negra fuera del radio.');
    });
    test('El radio es un umbral para la tinta: sin barreras el color puede continuar', () => {
      const f = calc(41, 41, image(41, 41), { radius: .01 });
      assert(Number.isFinite(f.times[20 * 41 + 40]), 'El radio cortó la expansión en un color claro.');
    });
    test('Una zona delimita siempre la expansión, incluso con viento fuerte', () => {
      const f = calc(41, 41, image(41, 41), { windStrength: 2, zone: [{ x: .25, y: .25 }, { x: .75, y: .25 }, { x: .75, y: .75 }, { x: .25, y: .75 }] });
      assert(!Number.isFinite(f.times[20 * 41 + 35]) && Number.isFinite(f.times[20 * 41 + 25]), 'La zona no contiene la expansión.');
    });
    test('No se filtra color diagonalmente entre dos barreras de tinta', () => {
      const data = image(9, 9); for (let x = 0; x < 9; x++) paint(data, 9, x, 5, 0); for (let y = 0; y < 9; y++) paint(data, 9, 5, y, 0); paint(data, 9, 5, 5, 220);
      const f = calc(9, 9, data, { points: [{ x: .5, y: .5 }], radius: .01 });
      assert(!Number.isFinite(f.times[6 * 9 + 6]), 'La expansión atravesó una esquina diagonal cerrada.');
    });
    test('El viento acelera a favor y frena en contra sin invertir el avance', () => {
      const f = calc(41, 41, image(41, 41), { windStrength: 1, windAngle: 0 });
      const right = f.times[20 * 41 + 30], left = f.times[20 * 41 + 10];
      assert(right > 0 && right < left, 'El viento no afecta las velocidades en la dirección prevista.');
    });
    test('El viento también alarga el radio de cruce a favor y lo acorta en contra', () => {
      const data = image(61, 61); for (let y = 0; y < 61; y++) { paint(data, 61, 18, y, 0); paint(data, 61, 42, y, 0); }
      const f = calc(61, 61, data, { radius: .2, windStrength: .7, windAngle: 0 });
      assert(Number.isFinite(f.times[30 * 61 + 48]), 'No se extendió el radio a favor del viento.');
      assert(!Number.isFinite(f.times[30 * 61 + 12]), 'No se acortó el radio contra el viento.');
    });
    test('Varios puntos emiten simultáneamente desde tiempo cero', () => {
      const f = calc(41, 41, image(41, 41), { points: [{ x: .25, y: .5 }, { x: .75, y: .5 }] });
      assert(f.times[20 * 41 + 10] === 0 && f.times[20 * 41 + 30] === 0, 'Los puntos no comienzan juntos.');
    });
    test('El recorrido emite de forma progresiva y depende de la velocidad del pincel', () => {
      const stage = { points: [], path: [{ x: .1, y: .5 }, { x: .9, y: .5 }], speed: .01, pathSpeed: 1 };
      const fast = calc(41, 41, image(41, 41), stage), slow = calc(41, 41, image(41, 41), { ...stage, pathSpeed: .1 });
      assert(fast.times[20 * 41 + 36] > .5, 'Todo el recorrido empezó a emitir a la vez.');
      assert(fast.times[20 * 41 + 36] < slow.times[20 * 41 + 36], 'No se aplicó la velocidad del pincel.');
    });
    test('Duplicar la velocidad base reduce a la mitad los tiempos de llegada', () => {
      const a = calc(41, 41, image(41, 41)), b = calc(41, 41, image(41, 41), { speed: .2 });
      assert(Math.abs(a.times[0] - b.times[0] * 2) < 1e-5, 'Los tiempos no se derivan de la velocidad base.');
    });
    test('La duración incluye el último píxel y su transición', () => {
      const f = calc(31, 31, image(31, 31)); const max = Math.max(...f.times);
      assert(Math.abs(f.duration - max - .2) < 1e-6, 'Duración calculada incorrectamente.');
    });
    test('La velocidad relativa conserva aproximadamente el tiempo al cambiar resolución', () => {
      const a = calc(41, 41, image(41, 41)), b = calc(81, 81, image(81, 81));
      assert(Math.abs(a.times[20 * 41 + 30] - b.times[40 * 81 + 60]) < .04, 'La velocidad depende de la cantidad de píxeles.');
    });
    test('Se informa cuando todos los emisores quedan fuera de la zona', () => {
      let failed = false; try { calc(21, 21, image(21, 21), { points: [{ x: .1, y: .1 }], zone: [{ x: .6, y: .6 }, { x: .9, y: .6 }, { x: .9, y: .9 }, { x: .6, y: .9 }] }); } catch (e) { failed = e.message.includes('dentro de la zona'); }
      assert(failed, 'No se informó la ausencia de emisores válidos.');
    });
    test('La normalización limita parámetros y conserva el viento desactivado', () => {
      const s = engine.normalizeStage({ speed: -4, radius: 1000, windStrength: -1, points: [{ x: 9, y: -2 }] });
      assert(s.speed > 0 && s.radius <= 1.5 && s.windStrength === 0 && s.points[0].x === 1 && s.points[0].y === 0, 'Los parámetros no están acotados.');
      assert(engine.normalizeStage(null).points.length === 1, 'Una etapa vacía debe recibir valores predeterminados.');
    });
    // Reloj y canvas falsos: se comprueban estados de reproducción sin esperar tiempo real.
    test('El reproductor conserva la base, mezcla el color y respeta pausas entre etapas', () => {
      const oldRaf = root.requestAnimationFrame, oldCancel = root.cancelAnimationFrame;
      const queue = new Map(); let id = 0, lastFrame;
      root.requestAnimationFrame = fn => { queue.set(++id, fn); return id; }; root.cancelAnimationFrame = key => queue.delete(key);
      function advance(ms) { const tasks = [...queue.values()]; queue.clear(); tasks.forEach(fn => fn(ms)); }
      const fakeCanvas = { getContext: () => ({ createImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData: frame => { lastFrame = [...frame.data]; } }) };
      const fields = [{ name: 'Una', times: new Float32Array([0]), duration: 1, fade: 1, pauseAfter: true }, { name: 'Dos', times: new Float32Array([0]), duration: 1, fade: 1 }];
      let p;
      try {
        p = root.createPaintPlayer(fakeCanvas, { width: 1, height: 1, base: [255, 255, 255, 255], final: [255, 0, 0, 255], fields });
        assert(lastFrame[1] === 255, 'El primer fotograma no es la base.');
        p.seek(.5); assert(lastFrame[1] >= 126 && lastFrame[1] <= 129, 'La transición no mezcla gradualmente el color.');
        p.restart(); p.play(); advance(100); advance(1200);
        assert(p.getState().waiting && !p.getState().playing && p.getState().index === 0, 'No se detuvo al finalizar la etapa.');
        p.play(); assert(p.getState().index === 1 && p.getState().playing, 'No continuó a la siguiente etapa.');
        advance(1300); advance(2400); assert(p.getState().ended && lastFrame[1] === 0, 'No terminó con el color final.');
        p.seek(0); assert(lastFrame[1] === 255 && !p.getState().ended, 'No restableció el primer fotograma.');
      } finally { p?.destroy(); root.requestAnimationFrame = oldRaf; root.cancelAnimationFrame = oldCancel; }
    });
    return results;
  }
  root.runPaintTests = runTests;
  const results = runTests(); root.PAINT_TEST_RESULTS = results;
  if (typeof document !== 'undefined') {
    for (const r of results) { const li = document.createElement('li'); li.className = r.pass ? 'pass' : 'fail'; li.textContent = `${r.pass ? '✓' : '✗'} ${r.name}${r.error ? ': ' + r.error : ''}`; document.getElementById('results').append(li); }
    document.getElementById('summary').textContent = `${results.filter(r => r.pass).length} / ${results.length} pruebas correctas`;
  }
})(typeof window === 'undefined' ? globalThis : window);
