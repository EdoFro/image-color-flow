(function (root) {
  'use strict';
  function runTests() {
    const results = [], engine = root.PaintEngine;
    function assert(condition, message) { if (!condition) throw new Error(message); }
    function test(name, fn) { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } }
    function image(w, h, value = 220) { const data = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value; data[i * 4 + 3] = 255; } return data; }
    function paint(data, w, x, y, value) { const i = (y * w + x) * 4; data[i] = data[i + 1] = data[i + 2] = value; }
    function calc(w, h, rgba, stage = {}) { return engine.compute({ width: w, height: h, rgba, stage: { points: [{ x: .5, y: .5 }], radius: 1.5, clarity: 0, ink: 0, speed: .1, fade: .2, ...stage } }); }
    const pixel = (rgb, config, paper = [255, 255, 255]) => [...root.PaintBase.derive(new Uint8ClampedArray([...rgb, 255]), paper, config)];
    test('La base de tinta lleva pigmentos claros y oscuros al papel y conserva el negro sólido', () => {
      for (const color of [[210,40,40],[0,0,80],[230,190,120]]) assert(pixel(color)[0] === 255, 'Un pigmento detectable no quedó blanco.');
      assert(pixel([0,0,0]).slice(0,3).every(v=>v===0), 'Se borró el negro.');
    });
    test('La base de tinta conserva por defecto grises intermedios y refuerza sólo los oscuros', () => {
      assert(pixel([128,128,128]).slice(0,3).every(v=>v===128), 'Se cambió el gris intermedio.');
      assert(pixel([25,25,25])[0] === 0, 'No se reforzó el gris oscuro.');
      assert(pixel([25,25,25],{blackPoint:0})[0] === 25, 'No se pudo desactivar el refuerzo.');
    });
    test('El destino del pigmento permite papel, gris y una mezcla intermedia', () => {
      const white=pixel([200,30,30],{colorToGray:0})[0], gray=pixel([200,30,30],{colorToGray:1})[0], middle=pixel([200,30,30],{colorToGray:.5})[0];
      assert(white===255 && gray<128 && middle>gray && middle<white, 'El control no interpola el pigmento.');
    });
    test('La sensibilidad permite retirar acuarela tenue sin cambiar un gris neutro', () => {
      const color=[220,210,200], low=pixel(color,{sensitivity:0})[0], high=pixel(color,{sensitivity:1})[0];
      assert(high>low && high===255, 'No se retiró el pigmento tenue.');
      assert(pixel([128,128,128],{sensitivity:1})[0]===128, 'Se confundió gris neutro con color.');
    });
    test('Los umbrales de gris y la suavidad producen transiciones sin alterar el rango', () => {
      const hard=pixel([60,60,60],{blackPoint:.25,smoothness:0})[0], soft=pixel([60,60,60],{blackPoint:.2,smoothness:.15})[0];
      assert(hard===0 && soft>0 && soft<60, 'No hay transición suave al negro.');
      assert(pixel([230,230,230],{whitePoint:.8})[0]===255, 'No se aclaró el gris.');
      assert(pixel([230,230,230],{whitePoint:1,blackPoint:0})[0]===230, 'No se pudo conservar el gris claro.');
    });
    test('El papel cálido no se considera pigmento y puede reemplazarse por blanco puro', () => {
      const paper=[250,245,230];
      assert(pixel(paper,{},paper).slice(0,3).every((v,i)=>v===paper[i]), 'Se cambió el tono de papel.');
      assert(pixel(paper,{paper:'white'},paper).slice(0,3).every(v=>v===255), 'No se obtuvo papel blanco.');
      const mid=paper.map(v=>Math.round(v/2)); assert(pixel(mid,{},paper)[0]<200, 'Se borró un gris neutralizado.');
    });
    test('La suavidad admite hasta 100% y amplía la transición del pigmento', () => {
      const source=[150,100,100], normal=pixel(source,{smoothness:.3})[0], high=pixel(source,{smoothness:1})[0];
      assert(root.PaintBase.normalize({smoothness:1}).smoothness===1, 'Se limitó la suavidad por debajo del 100%.');
      assert(high<normal && high>100, 'El tramo superior del control no modifica la transición.');
    });
    test('La desaturación anterior se reproduce exactamente, incluso con papel cálido', () => {
      const paper=[248,243,232], input=[55,111,201], lum=Math.fround(.2126*input[0]+.7152*input[1]+.0722*input[2]), pl=.2126*paper[0]+.7152*paper[1]+.0722*paper[2];
      const expected=new Uint8ClampedArray(paper.map(v=>Math.max(0,Math.min(255,lum*v/pl))));
      assert(pixel(input,{method:'grayscale'},paper).slice(0,3).every((v,i)=>v===expected[i]), 'Cambió la base de un proyecto anterior.');
    });
    test('Los proyectos de formato 6 conservan desaturación y los nuevos usan tinta sobre papel', () => {
      const data={format:'tinta-y-color',version:6,images:{final:{data:'data:image/png;base64,AA'}},stages:[{}]};
      const old=root.PaintProject.normalize(data), fresh=root.PaintProject.normalize({...data,version:7});
      assert(old.version===7 && old.baseGeneration.method==='grayscale', 'No se preservó la compatibilidad.');
      assert(fresh.baseGeneration.method==='ink' && fresh.baseGeneration.colorToGray===0, 'No se configuró tinta sobre papel.');
    });
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
    test('La etapa sin emisores conserva transición, permanencia y pausa sin pintar', () => {
      const f = calc(21, 11, image(21, 11), { points: [{ x: .5, y: .5, enabled: false }], cameraDuration: .8, hold: 1.2, pauseAfter: true });
      assert(!f.skipped && f.visualOnly && f.duration === 2 && f.pauseAfter && f.reached === 0, 'La etapa visual perdió su duración o su pausa.');
      assert(f.times.every(t => t === Infinity) && f.opacity.every(value => value === 0), 'La etapa visual deposita color.');
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
    function inspectPlayer(fields, width = 1, height = 1, options = {}) {
      let frame; const draws = [];
      const context = { createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: value => { frame = value.data.slice(); }, drawImage: (...args) => draws.push(args), clearRect() {}, save() {}, restore() {}, fillRect() {} };
      const fakeCanvas = { getContext: () => context }, base = image(width, height, 255), final = image(width, height, 255);
      for (let i = 0; i < width * height; i++) { final[i * 4 + 1] = 0; final[i * 4 + 2] = 0; }
      const player = root.createPaintPlayer(fakeCanvas, { width, height, base, final, fields, createCanvas: () => fakeCanvas, ...options });
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
    test('Los puntos heredan ambos radios de la etapa por defecto', () => {
      const stage = engine.normalizeStage({ radius: .12, maxRadius: .4, points: [{ x: .5, y: .5, radius: 1.1, maxRadius: 1.3 }] });
      const radii = engine.pointRadii(stage, stage.points[0]); assert(stage.points[0].inheritRadii && radii.radius === .12 && radii.maxRadius === .4, 'La herencia no prevalece sobre los valores propios guardados.');
    });
    test('El radio máximo propio limita un punto sin cambiar el de los demás', () => {
      const f = calc(101, 11, image(101, 11), { maxRadius: .2, points: [{ x: .2, y: .5, inheritRadii: false, radius: .2, maxRadius: .1 }, { x: .8, y: .5 }] });
      assert(f.opacity[5 * 101 + 35] === 0 && f.opacity[5 * 101 + 65] > 0, 'Se compartió el radio propio entre emisores.');
    });
    test('El radio de tinta propio se aplica en el cálculo de barreras', () => {
      const data = image(41, 21); for (let y = 0; y < 21; y++) paint(data, 41, 28, y, 0);
      const f = calc(41, 21, data, { radius: .01, points: [{ x: .5, y: .5, inheritRadii: false, radius: .3, maxRadius: 1.5 }] });
      assert(Number.isFinite(f.times[10 * 41 + 35]), 'El motor ignoró el radio de tinta del punto.');
    });
    test('La distancia de arrastre deshace la deformación del viento', () => {
      const stage = engine.normalizeStage({ windStrength: .7, windAngle: 0 }), center = { x: .5, y: .5 };
      const along = engine.radiusDistance(stage, center, { x: .5 + .1 * Math.exp(.7), y: .5 }, 1);
      const against = engine.radiusDistance(stage, center, { x: .5 - .1 * Math.exp(-.7), y: .5 }, 1);
      assert(Math.abs(along - .1) < 1e-6 && Math.abs(against - .1) < 1e-6, 'Arrastrar cambió el radio de forma inconsistente con el viento.');
    });
    test('El destacado está apagado y vinculado por defecto', () => {
      const view = engine.normalizeView(); assert(!view.highlightEnabled && view.highlightLinked && view.frame === null, 'Los valores predeterminados no coinciden con el diseño.');
      assert(engine.normalizeView({ outsideColor: 'url(invalid)', zoom: 99 }).outsideColor === '#202c29', 'No se validó el color del exterior.');
    });
    test('Enfoque y destacado pueden compartir o separar sus rectángulos', () => {
      const config = engine.normalizeView({ frame: { x: .1, y: .1, width: .3, height: .3 }, highlightFrame: { x: .6, y: .6, width: .2, height: .2 } });
      assert(root.PaintView.highlight(config).x === .1, 'El vínculo no usa el enfoque.'); config.highlightLinked = false; assert(root.PaintView.highlight(config).x === .6, 'El destacado independiente se perdió.');
    });
    test('Acercamiento cero conserva la página completa aunque haya un rectángulo destacado', () => {
      const frame = { x: .2, y: .3, width: .4, height: .2 }, a = root.PaintView.target({ frame, zoom: 0 }), b = root.PaintView.target({ frame, zoom: 1 }), c = root.PaintView.target({ frame, zoom: .5 });
      assert(a.size === 1 && a.x === 0 && b.size === .4 && Math.abs(c.size - .7) < 1e-6, 'El acercamiento no es independiente del rectángulo.');
    });
    test('Inicio muestra la base y su encuadre sin reproducir ni pintar', () => {
      const f = { times: new Float32Array([0]), duration: 2, fade: .2, cameraDuration: 1, frame: { x: .5, y: .5, width: .2, height: .2 } };
      const p = inspectPlayer([f], 1, 1, { initialView: { frame: { x: .1, y: .1, width: .4, height: .4 } } });
      try { assert(p.player.getState().atStart && !p.player.getState().playing && p.pixel(0) === 255 && p.player.getState().camera.size === .4, 'La vista inicial avanzó o pintó sin señal.'); p.player.seek(.5); assert(Math.abs(p.player.getState().camera.size - .3) < 1e-6, 'La cámara no parte del encuadre inicial.'); p.player.seek(2); p.player.restart(); assert(p.player.getState().atStart && p.pixel(0) === 255 && p.player.getState().camera.size === .4, 'Reiniciar no restaura Inicio.'); } finally { p.player.destroy(); }
    });
    test('Los ajustes de destacado y acercamiento sobreviven a la exportación', () => {
      const f = calc(21, 11, image(21, 11), { zoom: 0, highlightEnabled: true, highlightLinked: false, highlightFrame: { x: .2, y: .3, width: .3, height: .3 }, outside: 'color', outsideColor: '#123456', blur: 8 });
      const decoded = root.PaintCodec.unpack(root.PaintCodec.pack(f), 21 * 11);
      assert(decoded.zoom === 0 && decoded.highlightEnabled && decoded.highlightLinked === false && decoded.highlightFrame.x === .2 && decoded.outsideColor === '#123456', 'Se perdieron los ajustes visuales.');
    });
    test('La permanencia se añade después del pintado y no cambia las llegadas', () => {
      const a = calc(21, 11, image(21, 11)), b = calc(21, 11, image(21, 11), { hold: 3 });
      assert(b.duration === a.duration + 3 && b.paintDuration === a.paintDuration && b.times.every((t, i) => t === a.times[i]), 'La permanencia alteró el pintado.');
    });
    test('Una etapa visual conserva el color acumulado y su cámara al buscar', () => {
      const painted = { times: new Float32Array(9), fade: .1, duration: 1 }, visual = calc(3, 3, image(3, 3), { points: [], cameraDuration: 1, hold: 1, frame: { x: .1, y: .1, width: .5, height: .5 } });
      const p = inspectPlayer([painted, visual], 3, 3);
      try { p.player.seek(2.5); assert(p.pixel(0) === 0 && p.player.getState().index === 1 && p.player.getState().camera.size === .5, 'La etapa visual perdió el color o el enfoque.'); } finally { p.player.destroy(); }
    });
    test('Las etapas de duración cero se ejecutan y respetan una pausa intermedia', () => {
      const oldRaf = root.requestAnimationFrame, oldCancel = root.cancelAnimationFrame, queue = new Map(); let id = 0, p;
      root.requestAnimationFrame = fn => { queue.set(++id, fn); return id; }; root.cancelAnimationFrame = key => queue.delete(key);
      try {
        const zero = calc(3, 3, image(3, 3), { points: [], cameraDuration: 0, pauseAfter: true });
        p = inspectPlayer([zero, { ...zero, pauseAfter: false }], 3, 3); p.player.play(); [...queue.values()].forEach(fn => fn(100)); queue.clear();
        assert(p.player.getState().waiting && p.player.getState().index === 0, 'Se perdió la pausa de una etapa instantánea.');
        p.player.play(); [...queue.values()].forEach(fn => fn(200)); assert(p.player.getState().ended, 'Una secuencia de duración cero no termina.');
      } finally { p?.player.destroy(); root.requestAnimationFrame = oldRaf; root.cancelAnimationFrame = oldCancel; }
    });
    test('La exportación conserva etapas visuales y permanencia', () => {
      const f = calc(3, 3, image(3, 3), { points: [], hold: 2, pauseAfter: true }), decoded = root.PaintCodec.unpack(root.PaintCodec.pack(f), 9);
      assert(decoded.visualOnly && !decoded.skipped && decoded.hold === 2 && decoded.pauseAfter && decoded.duration === 2.7 && decoded.opacity.every(v => !v), 'Se perdió una etapa visual al exportar.');
    });
    function bulkProject() { return { stages: [engine.normalizeStage({ radius: .2, maxRadius: .4, points: [{ x: .2, y: .2, inheritRadii: false, radius: .3, maxRadius: .6 }] }), engine.normalizeStage({ radius: .2, maxRadius: .4 })], initialView: engine.normalizeView({ zoom: 0 }) }; }
    const general = root.PaintGeneral, parameter = key => general.parameters.find(item => item.key === key);
    test('General detecta diferencias de radios propios aunque las etapas coincidan', () => {
      const project = bulkProject(), before = JSON.stringify(project), result = general.summary(project, parameter('radius'));
      assert(result.mixed && result.min === .2 && result.max === .3 && JSON.stringify(project) === before, 'La consulta general modifica datos o ignora valores propios.');
    });
    test('General unifica radios y devuelve todos los puntos a la herencia', () => {
      const project = bulkProject(); general.apply(project, { radius: .35 });
      assert(!general.summary(project, parameter('radius')).mixed && project.stages.every(s => s.radius === .35 && s.points.every(p => p.inheritRadii && p.radius === .35 && p.maxRadius === s.maxRadius)), 'No se restauró la herencia de ambos radios.');
    });
    test('General aplica solo los parámetros indicados sin cambiar geometrías', () => {
      const project = bulkProject(), before = project.stages.map(s => ({ radius: s.radius, points: JSON.stringify(s.points), frame: s.frame, name: s.name })); general.apply(project, { speed: .2, hold: 1.5 });
      assert(project.stages.every((s, i) => s.speed === .2 && s.hold === 1.5 && s.radius === before[i].radius && JSON.stringify(s.points) === before[i].points && s.frame === before[i].frame && s.name === before[i].name), 'Se modificaron parámetros no solicitados.');
    });
    test('General incluye Inicio solo al solicitarlo y solo para parámetros de vista', () => {
      const project = bulkProject(); assert(!general.summary(project, parameter('zoom')).mixed && general.summary(project, parameter('zoom'), true).mixed, 'Inicio afecta al resumen sin solicitarlo.');
      general.apply(project, { zoom: .5, speed: .2 }, false); assert(project.initialView.zoom === 0, 'Se cambió Inicio sin incluirlo.');
      general.apply(project, { zoom: .7, speed: .3 }, true); assert(project.initialView.zoom === .7 && !Object.hasOwn(project.initialView, 'speed'), 'Inicio recibió parámetros de propagación.');
    });
    test('General valida todo el lote antes de modificar el proyecto', () => {
      const project = bulkProject(), before = JSON.stringify(project); let rejected = false;
      try { general.apply(project, { speed: .2, outsideColor: 'incorrecto' }); } catch (_) { rejected = true; }
      assert(rejected && JSON.stringify(project) === before, 'Una aplicación inválida dejó cambios parciales.');
    });
    test('General modifica puntos desactivados y conserva su orden', () => {
      const project = bulkProject(); project.stages[0].points[0].enabled = false; general.apply(project, { startMode: 'delay', delay: 2 });
      assert(project.stages[0].points[0].enabled === false && project.stages[0].points[0].x === .2 && project.stages.every(s => s.points.every(p => p.startMode === 'delay' && p.delay === 2)), 'Se perdió el estado o el orden del punto.');
    });
    test('Las etapas anteriores se habilitan por defecto sin cambiar la activación de puntos', () => {
      const stage = engine.normalizeStage({ points: [{ x: .5, y: .5, enabled: false }] });
      assert(stage.enabled && !stage.points[0].enabled && !engine.normalizeStage({ enabled: false }).enabled, 'Se confunde la habilitación de etapas y puntos.');
    });
    test('Una etapa deshabilitada no pinta ni consume transición, permanencia o pausa', () => {
      const field = calc(21, 11, image(21, 11), { enabled: false, cameraDuration: 5, hold: 60, pauseAfter: true });
      assert(field.skipped && field.enabled === false && field.duration === 0 && field.reached === 0 && field.times.every(t => t === Infinity) && field.opacity.every(value => value === 0), 'Una etapa deshabilitada participa en la reproducción.');
      const decoded = root.PaintCodec.unpack(root.PaintCodec.pack(field), 231); assert(decoded.enabled === false && decoded.skipped && decoded.duration === 0, 'La exportación perdió la deshabilitación.');
    });
    test('La cámara y el color ignoran etapas deshabilitadas intermedias', () => {
      const a = { times: new Float32Array([Infinity]), duration: 1, fade: .1, cameraDuration: 1, frame: { x: .1, y: .1, width: .2, height: .2 } }, disabled = { ...a, enabled: false, duration: 60, times: new Float32Array([0]), frame: { x: .1, y: .1, width: .8, height: .8 }, pauseAfter: true }, b = { ...a, frame: { x: .1, y: .1, width: .4, height: .4 } }, p = inspectPlayer([a, disabled, b]);
      try { p.player.seek(1.5); assert(p.player.getState().index === 2 && p.player.getState().total === 2 && Math.abs(p.player.getState().camera.size - .3) < 1e-6 && p.pixel(0) === 255, 'La etapa deshabilitada modificó el tiempo, cámara o color.'); } finally { p.player.destroy(); }
    });
    test('La navegación anterior y siguiente salta etapas deshabilitadas', () => {
      const a = { times: new Float32Array([Infinity]), duration: 1, fade: .1 }, p = inspectPlayer([a, { ...a, enabled: false }, a]);
      try { p.player.next(); p.player.pause(); p.player.next(); assert(p.player.getState().index === 2, 'Siguiente no saltó la etapa.'); p.player.previous(); assert(p.player.getState().index === 0, 'Anterior no saltó la etapa.'); } finally { p.player.destroy(); }
    });
    test('Con todas las etapas deshabilitadas se conserva Inicio al navegar o buscar', () => {
      const p = inspectPlayer([{ enabled: false, duration: 1, times: new Float32Array([0]), fade: .1 }], 1, 1, { initialView: { frame: { x: .1, y: .1, width: .4, height: .4 } } });
      try { p.player.play(); p.player.seek(5); p.player.next(); p.player.previous(); const state = p.player.getState(); assert(state.empty && state.atStart && !state.playing && state.total === 0 && state.camera.size === .4 && p.pixel(0) === 255, 'Una secuencia deshabilitada perdió Inicio.'); } finally { p.player.destroy(); }
    });
    test('El resumen colectivo usa solo las etapas seleccionadas', () => {
      const project = bulkProject(); project.stages.push(engine.normalizeStage({ radius: .9, points: [] })); const scoped = general.scope(project, project.stages.slice(0, 2));
      const summary = general.summary(scoped, parameter('radius')); assert(summary.mixed && summary.max === .3 && summary.min === .2, 'Se incluyeron valores ajenos a la selección.');
    });
    test('La selección aplica radios solo a sus etapas y puntos, incluso deshabilitados', () => {
      const project = bulkProject(); project.stages.push(engine.normalizeStage({ radius: .8, points: [{ x: .1, y: .1, inheritRadii: false, radius: .9 }] })); project.stages[1].enabled = false;
      const selected = [project.stages[0], project.stages[1]], excluded = JSON.stringify(project.stages[2]), scoped = general.scope(project, selected); project.stages.reverse(); general.apply(scoped, { radius: .4, speed: .3 });
      assert(selected.every(s => s.radius === .4 && s.speed === .3 && s.points.every(p => p.inheritRadii)) && JSON.stringify(project.stages[0]) === excluded && !selected[1].enabled, 'La aplicación afectó otra etapa o perdió sus destinos al reordenar.');
    });
    test('El desfase inicial vale cero por defecto y se limita a un rango válido', () => {
      assert(engine.normalizeStage({}).paintDelay === 0 && engine.normalizeStage({ paintDelay: -2 }).paintDelay === 0 && engine.normalizeStage({ paintDelay: 500 }).paintDelay === 60, 'El desfase no se normaliza correctamente.');
    });
    test('El desfase desplaza las llegadas sin cambiar la huella ni la duración propia', () => {
      const a = calc(21, 11, image(21, 11)), b = calc(21, 11, image(21, 11), { paintDelay: 2 });
      assert(b.times.every((t, i) => !Number.isFinite(t) || Math.abs(t - a.times[i] - 2) < 1e-5) && b.opacity.every((value, i) => value === a.opacity[i]) && b.pointTimings[0].duration === a.pointTimings[0].duration && Math.abs(b.duration - a.duration - 2) < 1e-5, 'El desfase alteró la propagación en lugar de desplazarla.');
    });
    test('El primer activo usa el desfase y los demás conservan sus dependencias', () => {
      const field = calc(41, 11, image(41, 11), { paintDelay: 1.2, points: [{ x: .1, y: .5, enabled: false }, { x: .3, y: .5, startMode: 'delay', delay: 8 }, { x: .6, y: .5, startMode: 'delay', delay: .7 }, { x: .8, y: .5, startMode: 'after' }] });
      assert(field.pointTimings[1].start === 1.2 && Math.abs(field.pointTimings[2].start - 1.9) < 1e-9 && field.pointTimings[3].start === field.pointTimings[2].end, 'La secuencia perdió su referencia al primer activo.');
    });
    test('El desfase también retrasa todas las posiciones muestreadas del pincel', () => {
      const stage = { points: [], maxRadius: .12, path: [{ x: .1, y: .5 }, { x: .9, y: .5 }] }, a = calc(61, 31, image(61, 31), stage), b = calc(61, 31, image(61, 31), { ...stage, paintDelay: 2 });
      assert(b.pathSamples === a.pathSamples && b.times.every((t, i) => !Number.isFinite(t) || Math.abs(t - a.times[i] - 2) < 1e-5), 'Alguna posición del pincel ignoró el desfase.');
    });
    test('El enfoque comienza antes de pintar y la permanencia sigue al final', () => {
      const field = calc(3, 3, image(3, 3), { paintDelay: 1.2, cameraDuration: .8, hold: .5, frame: { x: .1, y: .1, width: .5, height: .5 } }), p = inspectPlayer([field], 3, 3);
      try { p.player.seek(.8); assert(p.player.getState().camera.size === .5 && p.pixel(4) === 255, 'El enfoque esperó al desfase o pintó antes de tiempo.'); p.player.seek(1.3); assert(p.pixel(4) < 255, 'El punto no comenzó después del desfase.'); assert(field.duration === Math.max(field.paintDuration, .8) + .5, 'La permanencia no queda al final.'); } finally { p.player.destroy(); }
    });
    test('Las etapas visuales y deshabilitadas no consumen el desfase de pintura', () => {
      const visual = calc(3, 3, image(3, 3), { points: [], paintDelay: 60, cameraDuration: .8, hold: .2 }), disabled = calc(3, 3, image(3, 3), { enabled: false, paintDelay: 60 });
      assert(visual.duration === 1 && disabled.duration === 0, 'Se añadió un desfase sin pintura.');
    });
    test('General y la selección pueden unificar el desfase sin modificar otras etapas', () => {
      const project = bulkProject(); project.stages[1].paintDelay = 2;
      assert(general.summary(project, parameter('paintDelay')).mixed, 'No se detectaron distintos desfases.');
      general.apply(general.scope(project, [project.stages[0]]), { paintDelay: 1 }); assert(project.stages[0].paintDelay === 1 && project.stages[1].paintDelay === 2, 'La selección modificó otra etapa.');
      general.apply(project, { paintDelay: .8 }); assert(!general.summary(project, parameter('paintDelay')).mixed, 'General no unificó el desfase.');
    });
    test('El desfase y sus mapas temporales se conservan al empaquetar la presentación', () => {
      const field = calc(3, 3, image(3, 3), { paintDelay: 1.2 }), decoded = root.PaintCodec.unpack(root.PaintCodec.pack(field), 9);
      assert(decoded.paintDelay === 1.2 && Math.abs(decoded.times[4] - 1.2) <= field.duration / 65534, 'La exportación perdió el desfase.');
    });
    test('Avanzar inicia, respeta la pausa manual y no reinicia después del final', () => {
      const field = { times: new Float32Array([0]), fade: .1, duration: 1 }, p = inspectPlayer([field, field]);
      try { p.player.next(); assert(p.player.getState().playing && p.player.getState().index === 0, 'Avanzar desde Inicio no reproduce.'); p.player.pause(); p.player.next(); assert(!p.player.getState().playing && p.player.getState().index === 1 && p.player.getState().time === 0, 'Avanzar no conservó la pausa manual.'); p.player.next(); p.player.next(); assert(p.player.getState().ended && !p.player.getState().playing && p.player.getState().time === 1, 'Avanzar después del final reinició la presentación.'); } finally { p.player.destroy(); }
    });
    test('Avanzar desde una pausa intermedia continúa reproduciendo la siguiente etapa', () => {
      const oldRaf = root.requestAnimationFrame, oldCancel = root.cancelAnimationFrame, queue = new Map(); let id = 0, p;
      root.requestAnimationFrame = fn => { queue.set(++id, fn); return id; }; root.cancelAnimationFrame = key => queue.delete(key);
      function advance(ms) { const tasks = [...queue.values()]; queue.clear(); tasks.forEach(fn => fn(ms)); }
      try { const field = { times: new Float32Array([0]), fade: .1, duration: 1 }; p = inspectPlayer([{ ...field, pauseAfter: true }, field]); p.player.next(); advance(100); advance(1200); assert(p.player.getState().waiting, 'No se alcanzó la pausa.'); p.player.next(); assert(p.player.getState().index === 1 && p.player.getState().playing && !p.player.getState().waiting, 'Avanzar no continuó después de la pausa.'); }
      finally { p?.player.destroy(); root.requestAnimationFrame = oldRaf; root.cancelAnimationFrame = oldCancel; }
    });
    if (typeof document !== 'undefined') {
      test('Transición real entre exteriores opacos mezcla el color sin perder alfa', () => {
        const source = document.createElement('canvas'), output = document.createElement('canvas'); source.width = output.width = source.height = output.height = 20;
        source.getContext('2d').fillRect(0, 0, 20, 20); const context = output.getContext('2d'), base = { highlightEnabled: true, frame: { x: .3, y: .3, width: .4, height: .4 } };
        root.PaintView.createRenderer().transition(context, source, 20, 20, { ...base, outside: 'black' }, { ...base, outside: 'white' }, .5);
        const edge = context.getImageData(2, 2, 1, 1).data; assert(edge[0] >= 126 && edge[0] <= 129 && edge[3] === 255, 'El cambio de destacado no se mezcla correctamente.');
      });
      test('Transición real a transparencia conserva el alfa parcial y llega a cero', () => {
        const source = document.createElement('canvas'), output = document.createElement('canvas'); source.width = output.width = source.height = output.height = 20;
        const s = source.getContext('2d'); s.fillStyle = '#ff0000'; s.fillRect(0, 0, 20, 20); const context = output.getContext('2d'), renderer = root.PaintView.createRenderer(), from = engine.normalizeView(), to = engine.normalizeView({ highlightEnabled: true, outside: 'transparent', frame: { x: .3, y: .3, width: .4, height: .4 } });
        renderer.transition(context, source, 20, 20, from, to, .5); const alpha = context.getImageData(0, 0, 1, 1).data[3]; assert(alpha >= 126 && alpha <= 129, 'No hay transparencia gradual.');
        renderer.transition(context, source, 20, 20, from, to, 1); assert(context.getImageData(0, 0, 1, 1).data[3] === 0 && context.getImageData(9, 9, 1, 1).data[3] === 255, 'No se alcanzó el destacado final.');
      });
      for (const outside of ['show', 'black', 'white', 'color', 'transparent', 'blur']) test('Píxeles reales del destacado: ' + outside, () => {
        const source = document.createElement('canvas'), output = document.createElement('canvas'); source.width = output.width = 20; source.height = output.height = 20;
        const s = source.getContext('2d'), context = output.getContext('2d'); s.fillStyle = '#ff0000'; s.fillRect(0, 0, 20, 20);
        if (outside === 'blur') for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) { s.fillStyle = (x + y) % 2 ? '#ffffff' : '#000000'; s.fillRect(x, y, 1, 1); }
        const config = engine.normalizeView({ highlightEnabled: true, frame: { x: .3, y: .3, width: .4, height: .4 }, outside, outsideColor: '#123456', blur: 40 });
        root.PaintView.createRenderer().draw(context, source, 20, 20, config);
        const edge = [...context.getImageData(3, 3, 1, 1).data], center = [...context.getImageData(9, 9, 1, 1).data], original = [...s.getImageData(9, 9, 1, 1).data];
        assert(center.every((v, i) => v === original[i]), 'Se modificó el interior del destacado.');
        if (outside === 'transparent') assert(edge[3] === 0, 'El exterior no es transparente.');
        else if (outside === 'blur') assert(edge[0] > 20 && edge[0] < 235, 'El exterior no se desenfocó.');
        else { const expected = outside === 'black' ? [0, 0, 0, 255] : outside === 'white' ? [255, 255, 255, 255] : outside === 'color' ? [18, 52, 86, 255] : [255, 0, 0, 255]; assert(edge.every((v, i) => v === expected[i]), 'El color exterior es incorrecto.'); }
      });
    }
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
