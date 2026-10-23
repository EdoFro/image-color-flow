(async()=>{
 const $=id=>document.getElementById(id),assert=(v,m)=>{if(!v)throw new Error(m);};
 const wait=async fn=>{const end=performance.now()+30000;while(!fn()){if(performance.now()>end)throw new Error('Timeout');await new Promise(r=>setTimeout(r,20));}};
 const snapshot=()=>JSON.stringify(TintaColor.getProject());
 try{
  await wait(()=>window.TintaColor?.getPrepared()&&!document.body.classList.contains('busy'));
  const language=document.documentElement.dataset.i18nTestLanguage||'es';PaintI18n.setLanguage(language);
  const stages=JSON.stringify(TintaColor.getProject().stages);
  $('initialCard').click();assert(!$('initialPauseField').hidden&&$('initialPauseAfter').checked,'Initial wait checkbox missing or not enabled by default');
  $('initialPauseAfter').checked=false;$('initialPauseAfter').dispatchEvent(new Event('change'));
  assert(TintaColor.getProject().initialView.pauseAfter===false&&TintaColor.hasUnsavedChanges(),'Checkbox not saved to project');
  assert($('initialSummary').textContent===PaintI18n.t('initial_automatic_summary'),'Initial card still says waiting');
  PaintI18n.setLanguage(language==='es'?'en':'es');assert(!$('initialPauseAfter').checked,'Language reset initial waiting');PaintI18n.setLanguage(language);
  assert(JSON.stringify(TintaColor.getProject().stages)===stages,'Initial waiting changed authored stages');
  await TintaColor.undo();assert($('initialPauseAfter').checked&&TintaColor.getProject().initialView.pauseAfter===true,'Undo initial waiting');
  await TintaColor.redo();assert(TintaColor.getProject().initialView.pauseAfter===false&&!$('initialPauseAfter').checked&&JSON.stringify(TintaColor.getProject().stages)===stages,'Redo initial waiting');
  // Save/download and reopen must retain automatic startup, without starting the editor itself.
  let downloaded;const originalURL=URL.createObjectURL;URL.createObjectURL=blob=>{if(blob.type==='application/json')blob.text().then(s=>downloaded=JSON.parse(s));return originalURL.call(URL,blob);};window.showSaveFilePicker=undefined;
  $('saveButton').click();await wait(()=>downloaded);URL.createObjectURL=originalURL;
  assert(downloaded.version===14&&downloaded.initialView.pauseAfter===false,'Saved draft lost initial waiting');
  const files=new DataTransfer();files.items.add(new File([JSON.stringify(downloaded)],'automatic.colorflow.json',{type:'application/json'}));$('projectFile').files=files.files;$('projectFile').dispatchEvent(new Event('change'));
  await wait(()=>!document.body.classList.contains('busy'));assert(TintaColor.getProject().initialView.pauseAfter===false&&!TintaColor.getPlayer(),'Reopening auto draft started the editor');
  $('initialCard').click();assert(!$('initialPauseAfter').checked,'Opened inspector lost waiting setting');
  $('stageList').querySelector('.stage-select').click();assert($('initialPauseField').hidden,'Initial checkbox leaks into stage inspector');
  $('initialCard').click();assert(!$('initialPauseField').hidden&&!$('initialPauseAfter').checked,'Stage selection reset initial waiting');
  await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:TintaColor.getProject(),images:{},report:{passed:true,language,initialCheckbox:true,defaultWait:true,stageIndependence:true,undoRedo:true,saveReopen:true,editingDoesNotAutoplay:true}})});
 }catch(error){await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})});}
})();
