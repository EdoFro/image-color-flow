(async () => {
  const status = document.getElementById('status');
  let prepareOnly = false;
  try {
    const response = await fetch('job.json'); if (!response.ok) throw new Error('No se pudo leer el trabajo.');
    const { project, options } = await response.json();
    prepareOnly = options.operation === 'prepare';
    status.textContent = 'Preparando imagen inicial…';
    const compiled = prepareOnly ? await PaintAutomation.prepare(project, options) : await PaintAutomation.compile(project, { ...options, onProgress: p => { status.textContent = `Calculando etapa ${p.index + 1} de ${project.stages.length}…`; } });
    let images;
    if (prepareOnly) {
      images = { 'base.png': compiled.prepared.baseCanvas.toDataURL('image/png'), 'referencia.png': compiled.prepared.finalCanvas.toDataURL('image/png') };
      images['comparacion.png'] = await PaintAutomation.contactSheet([{ name: 'Imagen final', image: images['referencia.png'] }, { name: 'Imagen inicial generada', image: images['base.png'] }]);
    } else {
      status.textContent = 'Generando vistas previas…';
      const preview = PaintAutomation.previews(compiled); images = preview.images;
      images['storyboard.png'] = await PaintAutomation.contactSheet(preview.checkpoints);
    }
    const figures = prepareOnly ? [['referencia.png', 'Imagen final'], ['base.png', 'Imagen inicial preparada']] : [['plan.png', 'Puntos, zonas y enfoques'], ['storyboard.png', 'Inicio, mitad de cada etapa y final']];
    for (const [file, title] of figures) {
      const figure = document.createElement('figure'), image = new Image(), caption = document.createElement('figcaption');
      image.src = images[file]; image.alt = title; caption.textContent = title; figure.append(image, caption); document.getElementById('previews').append(figure);
    }
    const saved = await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: compiled.html, project: compiled.project, report: compiled.report, images }) });
    if (!saved.ok) throw new Error('No se pudo entregar el resultado.');
    document.querySelector('h1').textContent = prepareOnly ? 'Imagen inicial preparada' : 'Animación generada'; status.textContent = prepareOnly ? 'Base, comparación y proyecto listos. No se calculó la animación.' : 'Proyecto, HTML y vistas previas listos.';
    document.getElementById('summary').textContent = (prepareOnly ? '' : `${compiled.report.stages.length} etapas · ${compiled.report.duration.toFixed(2)} segundos, sin contar pausas manuales · `) + `${compiled.report.width} × ${compiled.report.height} px`;
  } catch (error) {
    document.querySelector('h1').textContent = prepareOnly ? 'No se pudo preparar la imagen inicial' : 'No se pudo generar la animación'; status.textContent = error.message;
    try { await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) }); } catch {}
  }
})();
