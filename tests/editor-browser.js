/* Flujo del diálogo real; se ejecuta dentro de la aplicación de prueba. */
(async () => {
  const $ = id => document.getElementById(id), assert = (v, m) => { if (!v) throw new Error(m); };
  const wait = async predicate => { const end = performance.now() + 30000; while (!predicate()) { if (performance.now() > end) throw new Error('Tiempo agotado: ' + $('status').textContent + ' / ' + $('basePreviewStatus').textContent); await new Promise(resolve => setTimeout(resolve, 20)); } };
  const change = (id, value) => { $(id).value = value; $(id).dispatchEvent(new Event('change')); };
  try {
    const { project: input } = await (await fetch('job.json')).json();
    await wait(() => window.TintaColor && !document.body.classList.contains('busy'));
    $('imagesButton').click();assert($('imagesDialog').open, 'No abre Imágenes');
    const [prefix, encoded] = input.images.final.data.split(','), bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)), blob = new Blob([bytes], { type: prefix.slice(5).split(';')[0] }), files = new DataTransfer();files.items.add(new File([blob], 'prueba.png', { type: blob.type }));$('finalFile').files = files.files;$('finalFile').dispatchEvent(new Event('change'));
    await wait(() => !document.body.classList.contains('busy'));
    change('baseMode', 'derived');change('basePreset', 'protected');change('resolution', '720');change('baseInkMatch', 'darken');
    assert($('basePreviewIndicator').dataset.state === 'off' && $('applyImages').disabled, 'Estado inicial incorrecto');
    const states = new Set(['off']), observer = new MutationObserver(records => { records.forEach(r => states.add(r.oldValue)); states.add($('basePreviewIndicator').dataset.state); });observer.observe($('basePreviewIndicator'), { attributes: true, attributeFilter: ['data-state'], attributeOldValue: true });
    const create = PaintBasePreview.create;PaintBasePreview.create = () => { throw new Error('Fallo simulado del trabajador'); };$('generateBase').click();assert($('basePreviewIndicator').dataset.state === 'error', 'No aparece la luz roja ante un error');PaintBasePreview.create = create;
    $('generateBase').click();change('basePreviewZoom', '2');
    assert(!$('basePreset').disabled && $('downloadBase').disabled && $('applyImages').disabled, 'Se bloquearon controles o se habilitó aplicar antes de terminar');
    const view = TintaColor.getBasePreviewState().view;
    $('baseSensitivity').value = '90';$('baseSensitivity').dispatchEvent(new Event('input'));$('baseSensitivity').value = '55';$('baseSensitivity').dispatchEvent(new Event('input'));
    assert($('basePreviewIndicator').dataset.state === 'pending', 'No se marca el ajuste pendiente');
    await wait(() => TintaColor.getBasePreviewState().complete);
    assert(JSON.stringify(TintaColor.getBasePreviewState().view) === JSON.stringify(view), 'Cambió el encuadre al regenerar');
    assert($('basePreviewIndicator').dataset.state === 'ready' && !$('applyImages').disabled && !$('downloadBase').disabled, 'No se habilita el resultado completo');
    const rev = TintaColor.getBasePreviewState().revision;
    change('baseInkMatch', 'multiply');assert($('applyImages').disabled && $('downloadBase').disabled, 'Se puede aplicar una vista obsoleta');
    await wait(() => TintaColor.getBasePreviewState().complete && TintaColor.getBasePreviewState().revision > rev);
    const finalView = TintaColor.getBasePreviewState().view;assert(JSON.stringify(finalView) === JSON.stringify(view), 'Cambiar mezcla desplaza la vista');
    $('applyImages').click();await wait(() => !$('imagesDialog').open && !document.body.classList.contains('busy'));
    const project = TintaColor.getProject(), prepared = TintaColor.getPrepared();
    assert(project.version === 13 && project.baseGeneration.method === 'protected' && project.baseGeneration.inkMatch === 'multiply' && project.baseGeneration.sensitivity === .55, 'No se aplican los últimos parámetros');
    assert(project.images.final.data === input.images.final.data, 'Se sobrescribió el original');
    const image = await PaintPreparation.loadImage(project.images.final.data), full = PaintPreparation.prepare(image, null, project);
    for (const side of ['base', 'final']) assert(prepared[side].data.every((v, i) => v === full[side].data[i]), 'Aplicar difiere de preparar completo: ' + side);
    $('imagesButton').click();$('generateBase').click();$('imagesDialog').close();await new Promise(resolve => setTimeout(resolve, 300));assert(TintaColor.getBasePreviewState().state === 'off', 'Un resultado viejo vuelve a aparecer al cerrar');
    observer.disconnect();for (const state of ['off','pending','detail','ready','error']) assert(states.has(state), 'No se comprobó la luz: ' + state);
    await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, images: {}, report: { passed: true, editorDialog: true, indicatorStates: [...states], retryAfterError: true, lastSettingsWin: true, viewPreserved: true, applyDownloadGated: true, appliedPixelsEqualWhole: true, originalIntact: true, closeCancelsWorker: true } }) });
  } catch (error) { await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.stack || error.message }) }); }
})();
