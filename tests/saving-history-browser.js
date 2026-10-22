/* User-facing transactions in the real editor, with a controlled local writer. */
(async () => {
  const $ = id => document.getElementById(id), assert = (v, m) => { if (!v) throw new Error(m); };
  const wait = async fn => { const end = performance.now() + 30000; while (!fn()) { if (performance.now() > end) throw new Error('Timeout: ' + $('status').textContent); await new Promise(r => setTimeout(r, 20)); } };
  const idle = () => wait(() => !document.body.classList.contains('busy'));
  const change = (id, value, type = 'input') => { $(id).value = value; $(id).dispatchEvent(new Event(type, { bubbles: true })); };
  const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const key = (target, value) => target.dispatchEvent(new KeyboardEvent('keydown', { key: value, ctrlKey: true, bubbles: true, cancelable: true }));
  try {
    await wait(() => window.TintaColor && !document.body.classList.contains('busy'));
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#d96030'; ctx.fillRect(0, 0, 32, 32); const image = c.toDataURL();
    const input = { format: 'tinta-y-color', version: 10, name: 'Mi presentación', images: { final: { name: 'color.png', data: image }, initial: { name: 'base.png', data: image } }, baseMode: 'uploaded', resolution: 720, stages: [{ points: [{ x: .5, y: .5 }], speed: .13 }] };
    const dt = new DataTransfer(); dt.items.add(new File([JSON.stringify(input)], 'original.colorflow.json', { type: 'application/json' })); $('projectFile').files = dt.files; $('projectFile').dispatchEvent(new Event('change'));
    await idle(); assert($('projectName').value === 'Mi presentación' && !TintaColor.getHistory().canUndo, 'Project load/name/history reset');
    const speed = TintaColor.getProject().stages[0].speed;
    change('speed', 21); change('speed', 30); change('speed', 42); $('speed').dispatchEvent(new Event('change', { bubbles: true }));
    key($('overlay'), 'z'); await idle(); assert(TintaColor.getProject().stages[0].speed === speed && !TintaColor.hasUnsavedChanges(), 'Slider undo should restore saved state in one step');
    key($('overlay'), 'y'); await idle(); assert(TintaColor.getProject().stages[0].speed === .42, 'Ctrl+Y failed');
    await TintaColor.undo(); change('speed', 33); assert(!TintaColor.getHistory().canRedo, 'New edit retained obsolete redo');
    let picks = 0, written = [], canceled = false, failed = false;
    window.showSaveFilePicker = async options => {
      picks++; if (canceled) throw new DOMException('Canceled', 'AbortError');
      return { name: options.suggestedName, async createWritable() { return { async write(text) { if (failed) throw new Error('Disk full'); written.push(JSON.parse(text)); }, async close() {}, async abort() {} }; } };
    };
    $('saveAsButton').click(); await idle(); assert(picks === 1 && written.length === 1 && written[0].name === input.name && !TintaColor.hasUnsavedChanges(), 'Save As did not save named project');
    change('speed', 40); $('saveButton').click(); await idle(); assert(picks === 1 && !TintaColor.hasUnsavedChanges(), 'Save did not reuse selected file');
    await TintaColor.undo(); assert(TintaColor.hasUnsavedChanges(), 'Undo after saving should mark dirty');
    await TintaColor.redo(); assert(!TintaColor.hasUnsavedChanges(), 'Redo to saved state should be clean');
    change('speed', 45); canceled = true; $('saveAsButton').click(); await idle(); assert(TintaColor.hasUnsavedChanges() && written.length === 2, 'Cancel discarded changes');
    canceled = false; failed = true; $('saveButton').click(); await idle(); assert(TintaColor.hasUnsavedChanges() && $('status').classList.contains('error'), 'Failed write marked clean'); failed = false;
    const gesture = (from, to) => {
      const overlay = $('overlay'), rect = overlay.getBoundingClientRect(), capture = overlay.setPointerCapture;
      overlay.setPointerCapture = () => {};
      const event = p => ({ bubbles: true, button: 0, pointerId: 1, clientX: rect.x + p[0] * rect.width, clientY: rect.y + p[1] * rect.height });
      overlay.dispatchEvent(new PointerEvent('pointerdown', event(from)));
      overlay.dispatchEvent(new PointerEvent('pointermove', event(to)));
      overlay.dispatchEvent(new PointerEvent('pointerup', event(to)));
      overlay.setPointerCapture = capture;
    };
    gesture([.5,.5], [.4,.4]); assert(Math.abs(TintaColor.getProject().stages[0].points[0].x - .4) < .001, 'Move point');
    await TintaColor.undo(); assert(TintaColor.getProject().stages[0].points[0].x === .5, 'Undo point drag');
    await TintaColor.redo(); assert(Math.abs(TintaColor.getProject().stages[0].points[0].x - .4) < .001, 'Redo point drag');
    document.querySelector('[data-tool="path"]').click(); gesture([.1,.1], [.8,.8]); assert(TintaColor.getProject().stages[0].path.length > 1, 'Brush gesture');
    await TintaColor.undo(); assert(!TintaColor.getProject().stages[0].path.length, 'Undo brush gesture');
    await TintaColor.redo(); assert(TintaColor.getProject().stages[0].path.length > 1, 'Redo brush gesture');
    ctx.fillStyle = '#1049d5'; ctx.fillRect(0, 0, 32, 32); const secondImage = c.toDataURL(), bytes = Uint8Array.from(atob(secondImage.split(',')[1]), c => c.charCodeAt(0));
    $('imagesButton').click(); const imageFiles = new DataTransfer(); imageFiles.items.add(new File([bytes], 'replacement.png', { type: 'image/png' })); $('finalFile').files = imageFiles.files; $('finalFile').dispatchEvent(new Event('change')); await idle();
    $('applyImages').click(); await idle(); assert(TintaColor.getProject().images.final.data === secondImage, 'Apply image');
    await TintaColor.undo(); assert(TintaColor.getProject().images.final.data === image && TintaColor.getPrepared(), 'Undo image preparation');
    await TintaColor.redo(); assert(TintaColor.getProject().images.final.data === secondImage && TintaColor.getPrepared(), 'Redo image preparation');
    const stages = TintaColor.getProject().stages.length; $('addStage').click(); assert(TintaColor.getProject().stages.length === stages + 1, 'Add stage');
    await TintaColor.undo(); assert(TintaColor.getProject().stages.length === stages, 'Undo add stage'); await TintaColor.redo(); assert(TintaColor.getProject().stages.length === stages + 1, 'Redo add stage');
    const previousSpeeds = TintaColor.getProject().stages.map(stage => stage.speed);
    $('generalCard').click();
    const bulkSpeed = document.querySelector('[data-parameter="speed"] input[type="range"]');
    bulkSpeed.value = 27; bulkSpeed.dispatchEvent(new Event('input', { bubbles:true }));
    $('reviewGeneral').click(); $('confirmGeneral').click();
    assert(TintaColor.getProject().stages.every(stage => stage.speed === .27), 'Bulk change not applied');
    await TintaColor.undo(); assert(JSON.stringify(TintaColor.getProject().stages.map(stage => stage.speed)) === JSON.stringify(previousSpeeds), 'Bulk undo must be one transaction');
    await TintaColor.redo(); assert(TintaColor.getProject().stages.every(stage => stage.speed === .27), 'Bulk redo');
    // Text editing retains the browser's native undo; shortcuts do not traverse project history.
    const before = JSON.stringify(TintaColor.getProject()), native = key($('projectName'), 'z'); assert(native && JSON.stringify(TintaColor.getProject()) === before, 'Text field shortcut hijacked');
    $('newButton').click(); $('confirmReplace').click(); await idle(); assert(!TintaColor.getHistory().canUndo && !TintaColor.getPrepared(), 'New project retained history');
    window.showSaveFilePicker = undefined; let download = false; const original = URL.createObjectURL; URL.createObjectURL = blob => { download ||= blob.type === 'application/json'; return original.call(URL, blob); };
    change('projectName', 'Otro proyecto'); $('saveButton').click(); await idle(); assert(download, 'Download fallback unavailable');
    await frame();
    await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: TintaColor.getProject(), images: {}, report: { passed: true, naming: true, groupedUndoRedo: true, savedState: true, nativeSave: true, canceledAndFailedSave: true, fallback: true, historyReset: true, textShortcuts: true } }) });
  } catch (error) { await fetch('result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.stack || error.message }) }); }
})();
