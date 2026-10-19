/* Prueba de integración con Canvas y Worker reales; la ejecuta test:preview. */
(async () => {
  const equal = (a, b, label) => { if (a.length !== b.length) throw new Error(label + ': tamaño distinto'); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) throw new Error(`${label}: canal ${i}, ${a[i]} != ${b[i]}`); };
  const assert = (value, label) => { if (!value) throw new Error(label); };
  try {
    const { project } = await (await fetch('job.json')).json();
    const image = await PaintPreparation.loadImage(project.images.final.data), checks = [], metrics = [];
    let controller;
    const run = (options, view, cancelFirst = false) => new Promise((resolve, reject) => {
      const source = PaintPreparation.previewSource(image, options), width = source.outputWidth, height = source.outputHeight;
      const result = { base: new Uint8ClampedArray(width * height * 4), final: new Uint8ClampedArray(width * height * 4), matched: 0 }, order = [];
      const start = performance.now(); let first;
      controller = PaintBasePreview.create(message => {
        if (message.revision !== 2) return;
        if (message.type === 'error') { controller.destroy(); reject(new Error(message.message)); }
        if (message.type === 'tile') {
          first ??= performance.now() - start; order.push(message.tile);
          const t = message.tile;
          for (let row = 0; row < t.height; row++) { const a = row * t.width * 4, b = a + t.width * 4, i = ((t.y + row) * width + t.x) * 4; result.base.set(message.base.subarray(a, b), i); result.final.set(message.final.subarray(a, b), i); }
          if (order.length === 1) controller.post({ type: 'view', revision: 2, view: { x: 0, y: 0, width: 30, height: 30 } });
        }
        if (message.type === 'complete') { controller.destroy(); result.matched = message.matched; resolve({ result, order, first, elapsed: performance.now() - start }); }
      }, reject);
      const { finalCanvas, baseSourceSize, ...input } = source; controller.post({ type: 'init', source: input });
      if (cancelFirst) { controller.post({ type: 'start', revision: 1, config: PaintBase.normalize({ method: 'coherent' }), view }); controller.post({ type: 'cancel' }); }
      controller.post({ type: 'start', revision: 2, config: PaintBase.normalize(options.baseGeneration), view });
    });
    for (const [index, config] of [
      { method: 'protected', inkMatch: 'darken' },
      { method: 'protected', inkMatch: 'multiply', smoothness: 1, colorToGray: .25, paper: 'matched' },
      { method: 'coherent', inkMatch: 'base-to-final', sensitivity: .85 },
      { method: 'ink', paper: 'matched' }
    ].entries()) {
      const options = { ...project, resolution: index === 1 ? 1080 : 720, baseMode: 'derived', baseGeneration: config };
      const full = PaintPreparation.prepare(image, null, options), view = { x: full.width - 50, y: full.height - 50, width: 45, height: 45 };
      const tiled = await run(options, view, index === 0);
      equal(tiled.result.base, full.base.data, 'Base por bloques ' + config.method);
      equal(tiled.result.final, full.final.data, 'Final por bloques ' + config.inkMatch);
      assert(tiled.result.matched === full.inkMatchPixels, 'Recuento de igualación distinto');
      assert(tiled.order[0].x + tiled.order[0].width > view.x && tiled.order[0].y + tiled.order[0].height > view.y, 'No se priorizó el detalle visible');
      if (tiled.order.length > 1) assert(tiled.order[1].x === 0 && tiled.order[1].y === 0, 'No se repriorizó al cambiar de encuadre');
      metrics.push({ method: config.method, inkMatch: config.inkMatch, firstTileMs: tiled.first, totalMs: tiled.elapsed, tiles: tiled.order.length });
      checks.push('Igualdad completa y prioridad ' + config.method + '/' + (config.inkMatch || 'none'));
    }
    // Navegación con geometría y Canvas reales, sin automatizar el navegador.
    const canvases = [document.createElement('canvas'), document.createElement('canvas')], mini = document.createElement('canvas'), zoomOutput = document.createElement('output');
    for (const c of canvases) { c.style.width = '300px'; c.style.height = '240px'; c.style.display = 'inline-block'; c.setPointerCapture = () => {}; document.body.append(c); }
    mini.style.width = '120px'; mini.setPointerCapture = () => {}; document.body.append(mini);
    let views = 0; const comparison = PaintImageComparison.create({ panels: canvases, mini, zoomOutput, onView: () => views++ });
    const source = document.createElement('canvas'); source.width = 800; source.height = 700; source.getContext('2d').fillStyle = '#315479'; source.getContext('2d').fillRect(0, 0, 800, 700);
    comparison.setSources([source, source], true); comparison.zoom(2); const before = { ...comparison.view };
    comparison.setSources([source, source]); assert(JSON.stringify(before) === JSON.stringify(comparison.view), 'Se perdió el encuadre al regenerar');
    canvases[1].onpointerdown({ button: 0, pointerId: 1, clientX: 100, clientY: 100 }); canvases[1].onpointermove({ pointerId: 1, clientX: 120, clientY: 110 }); canvases[1].onpointerup();
    assert(comparison.view.x < before.x && comparison.view.y < before.y, 'Arrastre de panel inactivo');
    equal(canvases[0].getContext('2d').getImageData(0, 0, 300, 240).data, canvases[1].getContext('2d').getImageData(0, 0, 300, 240).data, 'Vistas sincronizadas');
    const r = mini.getBoundingClientRect(); mini.onpointerdown({ button: 0, pointerId: 2, clientX: r.left + r.width * .8, clientY: r.top + r.height * .8 }); mini.onpointerup();
    assert(comparison.view.x > 500, 'Clic de miniatura no centra');
    const x = comparison.view.x; mini.onpointerdown({ button: 0, pointerId: 3, clientX: r.left + r.width * comparison.view.x / 800, clientY: r.top + r.height * comparison.view.y / 700 }); mini.onpointermove({ pointerId: 3, clientX: r.left + r.width * .6, clientY: r.top + r.height * .6 }); mini.onpointerup();assert(comparison.view.x < x, 'Rectángulo no arrastrable');
    const scale = comparison.view.scale, bounds = canvases[1].getBoundingClientRect();canvases[1].dispatchEvent(new WheelEvent('wheel', { clientX: bounds.left + 100, clientY: bounds.top + 100, deltaY: -100, cancelable: true }));assert(comparison.view.scale > scale, 'Rueda de la segunda vista no amplía');
    comparison.fit(); assert(comparison.rect().width === 800 && comparison.rect().height === 700, 'Ajustar no muestra toda la imagen'); comparison.destroy();assert(views > 5, 'No se notifican encuadres');
    checks.push('Zoom compartido, arrastre de ambas vistas, miniatura, rectángulo y conservación del encuadre');
    await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, images: {}, report: { checks, metrics, image: [image.width, image.height], passed: true } }) });
  } catch (error) { await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.stack || error.message }) }); }
})();
