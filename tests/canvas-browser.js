(async () => {
  const $ = id => document.getElementById(id), assert = (v,m) => { if (!v) throw new Error(m); };
  const wait = async fn => { const end = performance.now()+30000; while (!fn()) { if (performance.now()>end) throw new Error('Timeout: '+$('status').textContent); await new Promise(r=>setTimeout(r,20)); } };
  const frame = () => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const view = () => TintaColor.getCanvasView(), project = () => TintaColor.getProject();
  const card = i => document.querySelector(`.stage-card[data-stage-index="${i}"]`);
  try {
    await wait(()=>window.TintaColor&&!document.body.classList.contains('busy'));
    const original = JSON.stringify(project()), initialHistory = JSON.stringify(TintaColor.getHistory());
    document.querySelector('[data-canvas-zoom="1"]').click(); assert(Math.abs(view().scale-1)<1e-9,'100%');
    document.querySelector('[data-canvas-zoom="2"]').click(); assert(Math.abs(view().scale-2)<1e-9,'200%');
    const area = $('canvasArea'), bounds = area.getBoundingClientRect(), x = bounds.left+area.clientWidth*.5, y=bounds.top+area.clientHeight*.5;
    const wheel = new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:x,clientY:y,deltaY:-100});
    area.dispatchEvent(wheel); assert(wheel.defaultPrevented && view().scale>2,'Wheel zoom');
    const oldView = JSON.stringify(view()); card(1).querySelector('.stage-select').click(); assert(JSON.stringify(view())===oldView,'Stage selection reset view');
    assert(JSON.stringify(project())===original && JSON.stringify(TintaColor.getHistory())===initialHistory && !TintaColor.hasUnsavedChanges(),'Navigation mutated project/history');
    document.querySelector('[data-canvas-zoom="width"]').click(); assert(Math.abs(view().width-(area.clientWidth-40))<2,'Fit width');
    document.querySelector('[data-canvas-zoom="height"]').click(); assert(Math.abs(view().height-(area.clientHeight-40))<2,'Fit height');
    document.querySelector('[data-canvas-zoom="fit"]').click(); assert(view().width<=area.clientWidth && view().height<=area.clientHeight,'Fit image');
    const beforeDuplicate=project(), count=beforeDuplicate.stages.length;
    card(0).querySelector('.stage-duplicate').click(); assert(project().stages.length===count+1,'Duplicate card did not work');
    const copy=project().stages[1]; assert(JSON.stringify(copy.points)===JSON.stringify(beforeDuplicate.stages[0].points)&&copy.name!==beforeDuplicate.stages[0].name,'Wrong stage duplicated');
    await TintaColor.undo(); assert(project().stages.length===count,'Undo duplication');
    const beforeArm=JSON.stringify(project()), beforeArmHistory=JSON.stringify(TintaColor.getHistory());
    let remove=card(0).querySelector('.stage-delete'); remove.click(); assert(remove.classList.contains('delete-armed')&&JSON.stringify(project())===beforeArm&&JSON.stringify(TintaColor.getHistory())===beforeArmHistory,'First click changed data');
    $('canvasTitle').click(); assert(!remove.classList.contains('delete-armed'),'Outside click did not cancel');
    remove.click(); document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); assert(!remove.classList.contains('delete-armed'),'Escape did not cancel');
    remove.click(); await new Promise(r=>setTimeout(r,2100)); assert(!remove.classList.contains('delete-armed')&&project().stages.length===count,'Timeout did not cancel');
    remove.click(); const other=card(1).querySelector('.stage-delete'); other.click(); assert(!remove.classList.contains('delete-armed')&&other.classList.contains('delete-armed'),'Two armed delete buttons');
    other.click(); assert(project().stages.length===count-1&&project().stages[0].name===beforeDuplicate.stages[0].name,'Delete targeted the wrong card');
    await TintaColor.undo(); assert(project().stages.length===count,'Undo deletion');
    // Lower button follows the same two-phase contract.
    card(0).querySelector('.stage-select').click(); $('deleteStage').click(); assert($('deleteStage').classList.contains('delete-armed'),'Lower delete did not arm'); $('deleteStage').click(); assert(project().stages.length===count-1,'Lower second-click delete'); await TintaColor.undo();
    // Individual card action never deletes a multi-selection as a batch.
    card(0).querySelector('.stage-select').click(); card(1).querySelector('.stage-select').dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
    card(0).querySelector('.stage-delete').click(); card(0).querySelector('.stage-delete').click(); assert(project().stages.length===count-1,'Multi-selection deleted more than one stage'); await TintaColor.undo();
    while(project().stages.length>1){const remove=card(project().stages.length-1).querySelector('.stage-delete');remove.click();remove.click();}
    assert(card(0).querySelector('.stage-delete').disabled,'Last stage can be deleted');
    $('newButton').click(); $('confirmReplace').click(); await wait(()=>!document.body.classList.contains('busy'));
    assert(view().mode==='fit'&&!view().available&&$('panCanvas').disabled,'New project did not reset viewport');
    await frame();
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:project(),images:{},report:{passed:true,zoomPresets:true,wheel:true,viewOnly:true,stageViewPreserved:true,duplicateCard:true,twoPhaseDelete:true,outsideEscapeTimeout:true,individualMultiSelectionAction:true,lastStageProtected:true,undoStageActions:true}})});
  } catch(error) { await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})}); }
})();
