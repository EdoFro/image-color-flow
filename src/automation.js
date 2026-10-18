/* API de navegador sin editor. Reutiliza preparación, motor, vistas y exportación. */
(function (root) {
  'use strict';
  async function calculate(prepared, stages, onProgress = () => {}) {
    const rgba = new Uint8ClampedArray(prepared.final.data), fields = [];
    const source = `const engine = (${root.createPaintEngine.toString()})(); onmessage = ({data:p}) => { try { p.stages.forEach((stage,index) => { const f=engine.compute({width:p.width,height:p.height,rgba:p.rgba,stage,onProgress:progress=>postMessage({type:'progress',index,progress})}); f.stageIndex=index; postMessage({type:'field',index,field:f},[f.times.buffer,f.fullTimes.buffer,f.opacity.buffer,f.accents.indices.buffer,f.accents.times.buffer,f.accents.opacity.buffer]); }); postMessage({type:'done'}); } catch(e) { postMessage({type:'error',message:e.message}); } };`;
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    let worker;
    try {
      await new Promise((resolve, reject) => {
        worker = new Worker(url);
        worker.onmessage = ({ data }) => {
          if (data.type === 'progress') onProgress(data);
          if (data.type === 'field') { fields[data.index] = data.field; onProgress({ type: 'stage', index: data.index }); }
          if (data.type === 'done') resolve();
          if (data.type === 'error') reject(new Error(data.message));
        };
        worker.onerror = e => reject(new Error(e.message || 'No se pudo calcular la propagación.'));
        worker.postMessage({ width: prepared.width, height: prepared.height, rgba, stages }, [rgba.buffer]);
      });
    } finally { worker?.terminate(); URL.revokeObjectURL(url); }
    return fields;
  }
  async function compile(input, { autoAlign = false, onProgress } = {}) {
    const project = root.PaintProject.normalize(input);
    const [finalImage, initialImage] = await Promise.all([
      root.PaintPreparation.loadImage(project.images.final.data),
      project.images.initial ? root.PaintPreparation.loadImage(project.images.initial.data) : null
    ]);
    if (autoAlign && initialImage && project.baseMode === 'uploaded') project.alignment = root.PaintPreparation.autoAlign(finalImage, initialImage);
    const prepared = root.PaintPreparation.prepare(finalImage, initialImage, project);
    const fields = await calculate(prepared, project.stages, onProgress);
    const report = {
      width: prepared.width, height: prepared.height,
      duration: fields.reduce((sum, f) => sum + f.duration, 0),
      durationExcludesManualPauses: true,
      stages: fields.map(f => ({ index: f.stageIndex, name: f.name, enabled: !f.skipped, duration: f.duration, paintDuration: f.paintDuration, reached: f.reached, area: f.area, ignoredSeeds: f.ignoredSeeds, visualOnly: f.visualOnly, pauseAfter: f.pauseAfter, pointTimings: f.pointTimings })),
      warnings: fields.flatMap(f => f.ignoredSeeds ? [{ code: 'OUTSIDE_ZONE', stageIndex: f.stageIndex, message: `${f.ignoredSeeds} emisores o muestras fuera de la zona.` }] : [])
    };
    if (fields.every(f => f.skipped)) report.warnings.push({ code: 'NO_ENABLED_STAGES', message: 'Todas las etapas están deshabilitadas; sólo se mostrará Inicio.' });
    const data = { width: prepared.width, height: prepared.height, presentation: project.presentation, initialView: project.initialView, base: prepared.baseCanvas.toDataURL('image/png'), final: prepared.finalCanvas.toDataURL('image/png'), fields: fields.filter(f => !f.skipped).map(root.PaintCodec.pack) };
    return { project, prepared, fields, report, html: root.PaintPresentation.build(data) };
  }
  function previews(compiled) {
    const { prepared: p, project, fields, report } = compiled;
    const make = () => document.createElement('canvas');
    const canvas = make(), player = root.createPaintPlayer(canvas, { width: p.width, height: p.height, base: p.base.data, final: p.final.data, fields, initialView: project.initialView });
    const images = { 'inicio.png': canvas.toDataURL('image/png') };
    const checkpoints = [{ name: 'Inicio', image: images['inicio.png'] }];
    let offset = 0;
    fields.forEach(f => {
      if (f.skipped) return;
      const filename = `etapa-${String(f.stageIndex + 1).padStart(2, '0')}.png`;
      player.seek(offset + f.duration / 2); images[filename] = canvas.toDataURL('image/png');
      checkpoints.push({ name: `${f.stageIndex + 1}. ${f.name} · mitad`, image: images[filename] });
      offset += f.duration;
    });
    player.seek(report.duration); images['final.png'] = canvas.toDataURL('image/png');
    checkpoints.push({ name: 'Final', image: images['final.png'] }); player.destroy();
    const overlay = make(); overlay.width = p.width; overlay.height = p.height;
    const ctx = overlay.getContext('2d'); ctx.drawImage(p.finalCanvas, 0, 0);
    const scale = Math.max(1, p.width / 600);
    function trace(points, close, color) {
      if (!points?.length) return;
      ctx.beginPath(); points.forEach((v, i) => i ? ctx.lineTo(v.x * p.width, v.y * p.height) : ctx.moveTo(v.x * p.width, v.y * p.height)); if (close) ctx.closePath();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * scale; ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 2 * scale; ctx.stroke();
    }
    project.stages.forEach((stage, i) => {
      if (!stage.enabled) return;
      const color = `hsl(${i * 137.5 % 360} 85% 35%)`;
      trace(stage.zone, true, color); trace(stage.path, false, color);
      if (stage.frame) { const f = stage.frame; trace([{ x:f.x,y:f.y },{ x:f.x+f.width,y:f.y },{ x:f.x+f.width,y:f.y+f.height },{ x:f.x,y:f.y+f.height }], true, '#7828b0'); }
      stage.points.forEach((v, j) => {
        if (!v.enabled) return;
        const x = v.x * p.width, y = v.y * p.height;
        ctx.fillStyle = '#14251e'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.arc(x, y, 15 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${10 * scale}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${i + 1}.${j + 1}`, x, y);
      });
    });
    images['plan.png'] = overlay.toDataURL('image/png');
    return { images, checkpoints };
  }
  async function contactSheet(checkpoints) {
    const width = 240, imageHeight = 300, labelHeight = 42, columns = Math.min(4, checkpoints.length);
    const canvas = document.createElement('canvas'); canvas.width = columns * width; canvas.height = Math.ceil(checkpoints.length / columns) * (imageHeight + labelHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e5e7e3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < checkpoints.length; i++) {
      const item = checkpoints[i], image = await root.PaintPreparation.loadImage(item.image), x = i % columns * width, y = Math.floor(i / columns) * (imageHeight + labelHeight), ratio = Math.min((width - 16) / image.width, (imageHeight - 16) / image.height);
      ctx.drawImage(image, x + (width - image.width * ratio) / 2, y + (imageHeight - image.height * ratio) / 2, image.width * ratio, image.height * ratio);
      ctx.fillStyle = '#14251e'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText(item.name, x + 8, y + imageHeight + 20, width - 16);
    }
    return canvas.toDataURL('image/png');
  }
  root.PaintAutomation = { compile, calculate, previews, contactSheet };
})(typeof window === 'undefined' ? globalThis : window);
