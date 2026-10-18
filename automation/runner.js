(async () => {
  const status = document.getElementById('status');
  try {
    const response = await fetch('job.json'); if (!response.ok) throw new Error('No se pudo leer el trabajo.');
    const { project, options } = await response.json();
    const compiled = await PaintAutomation.compile(project, { ...options, onProgress: p => { status.textContent = `Calculando etapa ${p.index + 1} de ${project.stages.length}…`; } });
    status.textContent = 'Generando vistas previas…';
    const { images, checkpoints } = PaintAutomation.previews(compiled);
    images['storyboard.png'] = await PaintAutomation.contactSheet(checkpoints);
    for (const [file, title] of [['plan.png', 'Puntos, zonas y enfoques'], ['storyboard.png', 'Inicio, mitad de cada etapa y final']]) {
      const figure = document.createElement('figure'), image = new Image(), caption = document.createElement('figcaption');
      image.src = images[file]; image.alt = title; caption.textContent = title; figure.append(image, caption); document.getElementById('previews').append(figure);
    }
    const saved = await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: compiled.html, project: compiled.project, report: compiled.report, images }) });
    if (!saved.ok) throw new Error('No se pudo entregar el resultado.');
    document.querySelector('h1').textContent = 'Animación generada'; status.textContent = 'Proyecto, HTML y vistas previas listos.';
    document.getElementById('summary').textContent = `${compiled.report.stages.length} etapas · ${compiled.report.duration.toFixed(2)} segundos, sin contar pausas manuales · ${compiled.report.width} × ${compiled.report.height} px`;
  } catch (error) {
    document.querySelector('h1').textContent = 'No se pudo generar la animación'; status.textContent = error.message;
    try { await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) }); } catch {}
  }
})();
