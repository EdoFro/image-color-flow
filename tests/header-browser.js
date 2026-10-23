/* Compact header layout and session/default separation in the real editor. */
(async()=>{
 const $=id=>document.getElementById(id),assert=(value,message)=>{if(!value)throw new Error(message);};
 const wait=async fn=>{const end=performance.now()+30000;while(!fn()){if(performance.now()>end)throw new Error('Timeout');await new Promise(r=>setTimeout(r,20));}};
 const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 try{
  await wait(()=>window.TintaColor?.getPrepared()&&!document.body.classList.contains('busy'));
  const language=document.documentElement.dataset.i18nTestLanguage||'es';PaintI18n.setLanguage(language);
  const compact=()=>$('appHeader').classList.contains('header-compact');
  assert(!compact()&&!TintaColor.getPreferences().editor.compactHeader,'Factory startup is not expanded');
  const original=JSON.stringify(TintaColor.getProject()),revision=TintaColor.getRevision(),history=JSON.stringify(TintaColor.getHistory());
  document.querySelector('[data-canvas-zoom="2"]').click();await frame();const before=TintaColor.getCanvasView(),height=$('canvasArea').clientHeight;
  $('toggleHeader').click();await frame();
  assert(compact()&&$('headerDetails').hidden&&$('projectBar').hidden&&!$('compactIdentity').hidden,'Header not fully collapsed');
  assert($('appHeader').getBoundingClientRect().height===34,'Compact strip is not 34 px');
  assert($('toggleHeader').getAttribute('aria-expanded')==='false'&&$('toggleHeader').title===PaintI18n.t('expand_header'),'Expand action inaccessible');
  assert($('compactProjectName').textContent===(TintaColor.getProject().name||PaintI18n.t('untitled_project')),'Project label incorrect');
  assert(!TintaColor.getPreferences().editor.compactHeader,'Toggle modified startup preference');
  assert(TintaColor.getCanvasView().scale===before.scale&&TintaColor.getCanvasView().mode===before.mode,'Toggle lost manual zoom');
  if(matchMedia('(min-width:901px) and (min-height:650px)').matches)assert($('canvasArea').clientHeight>height,'Canvas did not gain space');
  $('toggleHeader').click();await frame();assert(!compact()&&!$('headerDetails').hidden&&!$('projectBar').hidden,'Expand did not restore controls');
  assert(JSON.stringify(TintaColor.getProject())===original&&TintaColor.getRevision()===revision&&JSON.stringify(TintaColor.getHistory())===history&&!TintaColor.hasUnsavedChanges(),'Layout changed project, revision or history');
  // The new checkbox survives draft translation and canceled changes do not apply.
  $('preferencesButton').click();$('pref-editor-compactHeader').checked=true;
  PaintI18n.setLanguage(language==='es'?'en':'es');await frame();assert($('pref-editor-compactHeader').checked,'Language change lost header preference draft');PaintI18n.setLanguage(language);
  $('cancelPreferences').click();assert(!TintaColor.getPreferences().editor.compactHeader,'Cancel saved startup preference');
  $('preferencesButton').click();$('pref-editor-compactHeader').checked=true;$('savePreferences').click();await frame();
  assert(TintaColor.getPreferences().editor.compactHeader&&!compact(),'Startup preference changed current session');
  assert(JSON.parse(localStorage.getItem(PaintPreferences.key)).editor.compactHeader,'Preference was not persisted');
  $('newButton').click();await wait(()=>!document.body.classList.contains('busy')&&!TintaColor.getPrepared());assert(!compact(),'New project applied startup preference mid-session');
  $('toggleHeader').click();$('exampleButton').click();await wait(()=>!document.body.classList.contains('busy')&&TintaColor.getPrepared());assert(compact(),'Loading example lost session layout');
  $('toggleHeader').click();
  const name='<b>Español — un proyecto con nombre largo</b>';
  $('projectName').value=name;$('projectName').dispatchEvent(new Event('input',{bubbles:true}));$('projectName').dispatchEvent(new Event('change'));
  $('toggleHeader').click();assert($('compactProjectName').textContent===name&&!$('compactProjectName').children.length&&$('compactProjectName').title===name,'Project name not safely shown as text');
  $('toggleHeader').click();await TintaColor.undo();assert($('compactProjectName').textContent===(TintaColor.getProject().name||PaintI18n.t('untitled_project')),'Undo did not refresh compact name');
  await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:TintaColor.getProject(),images:{},report:{passed:true,language,compactStrip:true,canvasGainsSpace:true,manualZoomRetained:true,startupIndependent:true,preferenceDraftProtected:true,projectNameSafe:true,historyUnchanged:true}})});
 }catch(error){await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})});}
})();
