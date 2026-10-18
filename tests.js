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
    test('El cambio de tono demora el cruce entre colores vecinos', () => {
      const data = image(41, 21);
      for (let y = 0; y < 21; y++) for (let x = 0; x < 41; x++) { const k = (y * 41 + x) * 4; data.set(x < 23 ? [200, 60, 60] : [60, 160, 60], k); }
      const plain = calc(41, 21, data), resistant = calc(41, 21, data, { hueResistance: 15 });
      assert(resistant.times[10 * 41 + 35] > plain.times[10 * 41 + 35] + .5, 'El tono no añade demora.');
    });
    test('La resistencia al tono no inventa diferencias en una imagen gris', () => {
      const a = calc(31, 21, image(31, 21)), b = calc(31, 21, image(31, 21), { hueResistance: 30 });
      assert(a.times[0] === b.times[0], 'El tono afectó una región sin cromaticidad.');
    });
    test('El radio máximo detiene el color en una superficie clara y desvanece el borde', () => {
      const f = calc(101, 11, image(101, 11), { maxRadius: .2 });
      assert(!Number.isFinite(f.times[5 * 101 + 72]) && f.opacity[5 * 101 + 72] === 0, 'Se atravesó el radio máximo.');
      assert(f.opacity[5 * 101 + 60] === 255 && f.opacity[5 * 101 + 68] > 0 && f.opacity[5 * 101 + 68] < 255, 'El último 20% no pierde intensidad.');
    });
    test('El viento deforma también el radio máximo', () => {
      const f = calc(101, 11, image(101, 11), { maxRadius: .2, windStrength: .7 });
      assert(Number.isFinite(f.times[5 * 101 + 80]) && !Number.isFinite(f.times[5 * 101 + 30]), 'El radio máximo no sigue al viento.');
    });
    test('Un punto desactivado no emite ni extiende los radios de otro punto', () => {
      const f = calc(101, 11, image(101, 11), { maxRadius: .15, points: [{ x: .2, y: .5 }, { x: .7, y: .5, enabled: false }] });
      assert(f.opacity[5 * 101 + 70] === 0 && f.pointTimings[1].start === null, 'El punto desactivado participó en la propagación.');
    });
    test('El primer activo empieza en cero y los siguientes dependen del anterior activo', () => {
      const f = calc(41, 11, image(41, 11), { points: [{ x: .1, y: .5, enabled: false }, { x: .3, y: .5, startMode: 'delay', delay: 9 }, { x: .6, y: .5, startMode: 'delay', delay: .7 }] });
      assert(f.pointTimings[1].start === 0 && f.pointTimings[2].start === .7, 'La dependencia no saltó al punto inactivo.');
    });
    test('Al terminar el anterior incluye su último píxel y su transición', () => {
      const f = calc(41, 11, image(41, 11), { maxRadius: .15, points: [{ x: .2, y: .5 }, { x: .7, y: .5, startMode: 'after' }] });
      assert(f.pointTimings[1].start === f.pointTimings[0].end && f.pointTimings[1].start > .2, 'El segundo punto empezó antes del final real.');
    });
    test('Junto al anterior comparte su inicio, aunque ese anterior tenga demora', () => {
      const f = calc(41, 11, image(41, 11), { points: [{ x: .1, y: .5 }, { x: .5, y: .5, startMode: 'delay', delay: 2 }, { x: .9, y: .5, startMode: 'with' }] });
      assert(f.pointTimings[1].start === 2 && f.pointTimings[2].start === 2, 'No se compartió el instante del anterior activo.');
    });
    test('Reordenar conserva el modo del punto y recalcula quién es su anterior', () => {
      const points = [{ x: .2, y: .5 }, { x: .7, y: .5, startMode: 'delay', delay: 4 }];
      const f = calc(41, 11, image(41, 11), { points: [points[1], points[0]] });
      assert(f.pointTimings[0].start === 0 && f.pointTimings[1].start === 0, 'Se aplicó una demora sin anterior.');
    });
    test('El solapamiento no acorta la duración propia de un emisor', () => {
      const single = calc(41, 21, image(41, 21)), overlap = calc(41, 21, image(41, 21), { points: [{ x: .5, y: .5 }, { x: .5, y: .5 }] });
      assert(single.pointTimings[0].duration === overlap.pointTimings[0].duration && overlap.pointTimings[1].duration === single.pointTimings[0].duration, 'La duración depende del color depositado por otros emisores.');
    });
    test('La etapa sin puntos activos ni recorrido se omite sin pausa ni duración', () => {
      const f = calc(21, 11, image(21, 11), { points: [{ x: .5, y: .5, enabled: false }], pauseAfter: true });
      assert(f.skipped && f.duration === 0 && f.reached === 0, 'La etapa vacía consume tiempo.');
    });
    test('El pincel conserva su radio alrededor de todo el recorrido', () => {
      const f = calc(61, 31, image(61, 31), { points: [], maxRadius: .12, pathSpeed: .2, path: [{ x: .1, y: .5 }, { x: .9, y: .5 }] });
      assert(f.opacity[15 * 61 + 50] === 255, 'El radio se midió desde el inicio del trazo.');
      assert(f.opacity[27 * 61 + 30] === 0, 'El pincel pintó fuera de su franja máxima.');
      assert(f.times[15 * 61 + 50] > 2, 'Una posición futura del pincel emitió antes de tiempo.');
    });
    test('Los proyectos anteriores reciben puntos activos simultáneos y cámara completa', () => {
      const s = engine.normalizeStage({ points: [{ x: .3, y: .7 }] });
      assert(s.points[0].enabled && s.points[0].startMode === 'with' && s.frame === null && s.hueResistance === 0 && s.maxRadius === 1.5, 'Los valores de migración son incorrectos.');
    });
    function inspectPlayer(fields, width = 1, height = 1) {
      let frame; const draws = [];
      const context = { createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: value => { frame = value.data.slice(); }, drawImage: (...args) => draws.push(args) };
      const fakeCanvas = { getContext: () => context }, base = image(width, height, 255), final = image(width, height, 255);
      for (let i = 0; i < width * height; i++) { final[i * 4 + 1] = 0; final[i * 4 + 2] = 0; }
      const player = root.createPaintPlayer(fakeCanvas, { width, height, base, final, fields, createCanvas: () => fakeCanvas });
      return { player, pixel: i => frame[i * 4 + 1], draws };
    }
    test('El borde tenue se conserva al terminar, al cambiar etapa y al buscar en la barra', () => {
      const f = { name: 'Tenue', times: new Float32Array([0]), fullTimes: new Float32Array([Infinity]), opacity: new Uint8Array([128]), accents: { indices: new Uint32Array([0]), times: new Float32Array([0]), opacity: new Uint8Array([128]) }, fade: .2, duration: 1 };
      const blank = { name: 'Otra', times: new Float32Array([Infinity]), duration: 1, fade: .2 }, p = inspectPlayer([f, blank]);
      try { p.player.seek(.9); assert(p.pixel(0) === 127, 'El borde no conserva su intensidad parcial.'); p.player.seek(1.5); assert(p.pixel(0) === 127, 'Cambiar etapa rellenó el borde.'); p.player.seek(2); assert(p.pixel(0) === 127, 'Buscar el final rellenó el borde.'); } finally { p.player.destroy(); }
    });
    test('Una expansión futura más fuerte no adelanta la intensidad del color', () => {
      const f = calc(101, 11, image(101, 11), { maxRadius: .3, points: [{ x: .3, y: .5 }, { x: .6, y: .5, startMode: 'delay', delay: 4 }] });
      const p = inspectPlayer([f], 101, 11), i = 5 * 101 + 57;
      try { p.player.seek(3.5); assert(p.pixel(i) > 0 && p.pixel(i) < 255, 'La expansión futura se aplicó antes de llegar.'); p.player.seek(f.duration); assert(p.pixel(i) === 0, 'La expansión más intensa no terminó de colorear.'); } finally { p.player.destroy(); }
    });
    test('La cámara interpola por etapa y puede volver a página completa', () => {
      const a = { times: new Float32Array([0]), duration: 2, fade: .2, cameraDuration: 1, frame: { x: .25, y: .25, width: .5, height: .5 } }, b = { ...a, frame: null };
      const p = inspectPlayer([a, b]);
      try { p.player.seek(.5); assert(Math.abs(p.player.getState().camera.size - .75) < 1e-6, 'La cámara no interpola suavemente.'); p.player.seek(1); assert(p.player.getState().camera.size === .5 && p.draws.length > 0, 'No se aplicó el encuadre al lienzo.'); p.player.seek(3); assert(p.player.getState().camera.size === 1, 'No volvió a página completa.'); } finally { p.player.destroy(); }
    });
    test('El reproductor salta etapas omitidas y tolera una secuencia completamente vacía', () => {
      const skipped = { duration: 0, skipped: true, pauseAfter: true, times: new Float32Array([Infinity]) }, active = { times: new Float32Array([0]), duration: 1, fade: .2 };
      const p = inspectPlayer([skipped, active]), empty = inspectPlayer([skipped]);
      try { assert(p.player.getState().index === 1 && p.player.getState().total === 1, 'No se omitió la etapa vacía.'); empty.player.play(); assert(empty.player.getState().empty && empty.player.getState().total === 0 && empty.pixel(0) === 255, 'La secuencia vacía no conserva la base.'); } finally { p.player.destroy(); empty.player.destroy(); }
    });
    test('La exportación conserva tiempos, bordes tenues y encuadres al decodificarse', () => {
      const f = calc(41, 21, image(41, 21), { maxRadius: .3, frame: { x: .2, y: .2, width: .4, height: .4 } });
      const encoded = root.PaintCodec.pack(f), decoded = root.PaintCodec.unpack(encoded, 41 * 21);
      assert(decoded.frame.width === .4 && decoded.opacity.every((v, i) => v === f.opacity[i]), 'Se perdió el encuadre o la intensidad al exportar.');
      for (let i = 0; i < f.fullTimes.length; i++) if (Number.isFinite(f.fullTimes[i])) assert(Math.abs(f.fullTimes[i] - decoded.fullTimes[i]) <= encoded.scale + 1e-6, 'La cuantización temporal excede su precisión.');
      const p = inspectPlayer([f], 41, 21), q = inspectPlayer([decoded], 41, 21);
      try { p.player.seek(f.duration); q.player.seek(decoded.duration); assert(p.pixel(10 * 41 + 31) === q.pixel(10 * 41 + 31), 'El final exportado no coincide con la vista previa.'); } finally { p.player.destroy(); q.player.destroy(); }
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
