/* Real editor interactions: changing language must not alter authored data or calculations. */
(async () => {
  const $=id=>document.getElementById(id), assert=(v,m)=>{if(!v)throw new Error(m);};
  const wait=async f=>{const until=performance.now()+30000;while(!f()){if(performance.now()>until)throw new Error('Timeout: '+$('status').textContent);await new Promise(r=>setTimeout(r,20));}};
  const change=(id,value,event='change')=>{ $(id).value=value;$(id).dispatchEvent(new Event(event)); };
  try {
    await wait(()=>window.TintaColor && !document.body.classList.contains('busy'));
    assert(document.documentElement.lang==='es','Fixture initial language');
    const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,64,64);ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.strokeRect(8,8,48,48);
    const initial=c.toDataURL();ctx.fillStyle='#d85d70';ctx.fillRect(12,12,40,40);const final=c.toDataURL();
    const input={format:'tinta-y-color',version:10,resolution:720,baseMode:'uploaded',images:{final:{name:'Mi imagen Español.png',data:final},initial:{name:'Base propia.png',data:initial}},stages:[{name:'Mi etapa Español <b>literal</b>',points:[{x:.5,y:.5}],radius:.1,maxRadius:.12,speed:.6,fade:.05,cameraDuration:.1,hold:.1},{name:'Final personal',points:[],path:[],cameraDuration:.1,hold:.1}]};
    const files=new DataTransfer();files.items.add(new File([JSON.stringify(input)],'prueba.colorflow.json',{type:'application/json'}));$('projectFile').files=files.files;$('projectFile').dispatchEvent(new Event('change'));await wait(()=>!document.body.classList.contains('busy'));
    const project=JSON.stringify(TintaColor.getProject()), revision=TintaColor.getRevision();
    change('languageSelect','en');assert(document.documentElement.lang==='en' && $('imagesButton').textContent==='Images','Static translation');
    assert($('playButton').getAttribute('aria-label')==='Play','Translated accessible name');
    assert(document.querySelector('.stage-select strong').textContent===input.stages[0].name,'Authored stage name changed');
    assert(JSON.stringify(TintaColor.getProject())===project && TintaColor.getRevision()===revision,'Language mutated project or invalidated computation');
    assert(localStorage.getItem('colorflow.language')==='en','Preference not stored');
    $('generalCard').click();change('general-radius','35','input');change('general-number-speed','999','input');
    assert($('general-number-speed').getAttribute('aria-invalid')==='true','Invalid input fixture');
    change('languageSelect','es');assert($('general-number-speed').value==='999' && $('general-number-speed').getAttribute('aria-invalid')==='true','Invalid input lost');
    assert($('general-radius').value==='35','Pending value lost');
    change('general-number-speed','20','input');$('reviewGeneral').click();assert($('generalDialog').open,'Review not opened');
    PaintI18n.setLanguage('en');assert($('generalDialogTitle').textContent==='Apply to the whole presentation','Open review not translated');
    assert($('generalReview').textContent.includes('Ink radius'),'Metadata not translated');$('cancelGeneralReview').click();
    const stages=()=>[...document.querySelectorAll('.stage-select')];stages()[0].click();stages()[1].dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
    change('languageSelect','es');assert(document.querySelectorAll('.stage-card.selected').length===2,'Multi-selection changed');
    assert(JSON.stringify(TintaColor.getProject())===project,'Pending changes applied on language switch');
    stages()[0].click();$('imagesButton').click();assert(getComputedStyle($('finalFile')).opacity==='0','Native file label is still visible');change('baseMode','derived');change('resolution','720');change('basePreset','protected');$('generateBase').click();change('basePreviewZoom','2');
    const before=TintaColor.getBasePreviewState();change('imagesLanguage','en');
    assert(TintaColor.getBasePreviewState().revision===before.revision,'Language restarted preview');
    await wait(()=>TintaColor.getBasePreviewState().complete);
    const complete=TintaColor.getBasePreviewState();change('imagesLanguage','es');
    assert(TintaColor.getBasePreviewState().revision===complete.revision && JSON.stringify(TintaColor.getBasePreviewState().view)===JSON.stringify(complete.view),'Preview view/calculation changed');
    assert($('basePreviewState').textContent==='Actualizada','Ready indicator not translated');$('imagesDialog').close();
    await TintaColor.calculateFields();const cached=TintaColor.getRevision();$('playButton').click();await wait(()=>TintaColor.getPlayer() && !document.body.classList.contains('busy'));
    const running=TintaColor.getPlayer(), runningTime=running.getState().elapsed;change('languageSelect','en');
    assert(TintaColor.getPlayer()===running && running.getState().playing && running.getState().elapsed>=runningTime,'Running playback interrupted');
    $('playButton').click();await wait(()=>!document.body.classList.contains('busy'));const player=TintaColor.getPlayer(), time=player.getState().elapsed;
    change('languageSelect','es');assert(TintaColor.getPlayer()===player && player.getState().elapsed===time && !player.getState().playing,'Playback reset');change('languageSelect','en');
    assert(TintaColor.getRevision()===cached,'Cached fields invalidated');
    let exportHTML;const build=PaintPresentation.build;PaintPresentation.build=data=>{exportHTML=build(data);return exportHTML;};
    $('exportButton').click();assert($('exportLanguage').value==='en','Default export language');change('exportLanguage','es');assert(PaintI18n.language==='en','Export language changed editor');change('exportLanguage','en');$('confirmExport').click();await wait(()=>exportHTML && !document.body.classList.contains('busy'));
    assert(exportHTML.includes('<html lang="en">') && exportHTML.includes('>Restart<'),'Export not localized');
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:TintaColor.getProject(),images:{},report:{passed:true,exportHTML,catalogKeys:Object.keys(PaintI18n.messages()).length,projectUnchanged:true,invalidDraftPreserved:true,multiSelectionPreserved:true,previewNotRestarted:true,viewPreserved:true,playbackPreserved:true,exportLanguageIndependent:true}})});
  } catch(error) { await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})}); }
})();
