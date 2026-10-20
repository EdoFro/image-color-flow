/* Real editor interactions: changing language must not alter authored data or calculations. */
(async () => {
  const $=id=>document.getElementById(id), assert=(v,m)=>{if(!v)throw new Error(m);};
  const wait=async f=>{const until=performance.now()+30000;while(!f()){if(performance.now()>until)throw new Error('Timeout: '+$('status').textContent);await new Promise(r=>setTimeout(r,20));}};
  const change=(id,value,event='change')=>{ $(id).value=value;$(id).dispatchEvent(new Event(event)); };
  const target = document.documentElement.dataset.i18nTestLanguage || 'en', alternate = target === 'es' ? 'en' : 'es';
  const labels = {
    es:{images:'Imágenes',play:'Reproducir',review:'Aplicar a toda la presentación',ink:'Radio de tinta',ready:'Actualizada',restart:'Reiniciar'},
    en:{images:'Images',play:'Play',review:'Apply to the whole presentation',ink:'Ink radius',ready:'Up to date',restart:'Restart'},
    fr:{images:'Images',play:'Lire',review:'Appliquer à toute la présentation',ink:'Rayon d’encre',ready:'À jour',restart:'Recommencer'},
    de:{images:'Bilder',play:'Abspielen',review:'Auf die gesamte Präsentation anwenden',ink:'Tuscheradius',ready:'Aktuell',restart:'Zurücksetzen'}
  }, expected = labels[target];
  try {
    await wait(()=>window.TintaColor && !document.body.classList.contains('busy'));
    assert(document.documentElement.lang==='es','Fixture initial language');
    const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,64,64);ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.strokeRect(8,8,48,48);
    const initial=c.toDataURL();ctx.fillStyle='#d85d70';ctx.fillRect(12,12,40,40);const final=c.toDataURL();
    const input={format:'tinta-y-color',version:10,resolution:720,baseMode:'uploaded',images:{final:{name:'Mi imagen Español.png',data:final},initial:{name:'Base propia.png',data:initial}},stages:[{name:'Mi etapa Español <b>literal</b>',points:[{x:.5,y:.5}],radius:.1,maxRadius:.12,speed:.6,fade:.05,cameraDuration:.1,hold:.1},{name:'Final personal',points:[],path:[],cameraDuration:.1,hold:.1}]};
    const files=new DataTransfer();files.items.add(new File([JSON.stringify(input)],'prueba.colorflow.json',{type:'application/json'}));$('projectFile').files=files.files;$('projectFile').dispatchEvent(new Event('change'));await wait(()=>!document.body.classList.contains('busy'));
    assert(JSON.stringify([...$('languageSelect').options].map(o=>o.value))===JSON.stringify(['es','en','fr','de']),'Missing language options');
    const project=JSON.stringify(TintaColor.getProject()), revision=TintaColor.getRevision();
    change('languageSelect',alternate);change('languageSelect',target);assert(document.documentElement.lang===target && $('imagesButton').textContent===expected.images,'Static translation');
    assert($('playButton').getAttribute('aria-label')===expected.play,'Translated accessible name');
    assert(document.querySelector('.stage-select strong').textContent===input.stages[0].name,'Authored stage name changed');
    assert(JSON.stringify(TintaColor.getProject())===project && TintaColor.getRevision()===revision,'Language mutated project or invalidated computation');
    assert(localStorage.getItem('colorflow.language')===target,'Preference not stored');
    for (const button of document.querySelectorAll('.toolbar button')) {
      assert(getComputedStyle(button.querySelector('span')).display!=='none','Toolbar label hidden: '+button.textContent);
    }
    const pointMode=document.querySelector('.point-mode select');pointMode.style.width='80px';
    await wait(()=>pointMode.nextElementSibling?.classList.contains('select-value')&&!pointMode.nextElementSibling.hidden);
    assert(pointMode.nextElementSibling.textContent===pointMode.selectedOptions[0].textContent,'Full selected value missing');
    assert(pointMode.title===pointMode.selectedOptions[0].textContent,'Select tooltip incomplete');pointMode.style.width='';
    $('generalCard').click();change('general-radius','35','input');change('general-number-speed','999','input');
    assert($('general-number-speed').getAttribute('aria-invalid')==='true','Invalid input fixture');
    change('languageSelect',alternate);assert($('general-number-speed').value==='999' && $('general-number-speed').getAttribute('aria-invalid')==='true','Invalid input lost');
    assert($('general-radius').value==='35','Pending value lost');
    change('general-number-speed','20','input');$('reviewGeneral').click();assert($('generalDialog').open,'Review not opened');
    PaintI18n.setLanguage(target);assert($('generalDialogTitle').textContent===expected.review,'Open review not translated');
    assert($('generalReview').textContent.includes(expected.ink),'Metadata not translated');$('cancelGeneralReview').click();
    const stages=()=>[...document.querySelectorAll('.stage-select')];stages()[0].click();stages()[1].dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
    change('languageSelect',alternate);assert(document.querySelectorAll('.stage-card.selected').length===2,'Multi-selection changed');
    assert(JSON.stringify(TintaColor.getProject())===project,'Pending changes applied on language switch');
    stages()[0].click();$('imagesButton').click();assert(getComputedStyle($('finalFile')).opacity==='0','Native file label is still visible');change('baseMode','derived');change('resolution','720');change('basePreset','protected');$('generateBase').click();change('basePreviewZoom','2');
    const before=TintaColor.getBasePreviewState();change('imagesLanguage',target);
    assert(TintaColor.getBasePreviewState().revision===before.revision,'Language restarted preview');
    await wait(()=>TintaColor.getBasePreviewState().complete);
    const complete=TintaColor.getBasePreviewState();change('imagesLanguage',alternate);
    assert(TintaColor.getBasePreviewState().revision===complete.revision && JSON.stringify(TintaColor.getBasePreviewState().view)===JSON.stringify(complete.view),'Preview view/calculation changed');
    assert($('basePreviewState').textContent===labels[alternate].ready,'Ready indicator not translated');$('imagesDialog').close();
    await TintaColor.calculateFields();const cached=TintaColor.getRevision();$('playButton').click();await wait(()=>TintaColor.getPlayer() && !document.body.classList.contains('busy'));
    const running=TintaColor.getPlayer(), runningTime=running.getState().elapsed;change('languageSelect',target);
    assert(TintaColor.getPlayer()===running && running.getState().playing && running.getState().elapsed>=runningTime,'Running playback interrupted');
    $('playButton').click();await wait(()=>!document.body.classList.contains('busy'));const player=TintaColor.getPlayer(), time=player.getState().elapsed;
    change('languageSelect',alternate);assert(TintaColor.getPlayer()===player && player.getState().elapsed===time && !player.getState().playing,'Playback reset');change('languageSelect',target);
    assert(TintaColor.getRevision()===cached,'Cached fields invalidated');
    let exportHTML;const build=PaintPresentation.build;PaintPresentation.build=data=>{exportHTML=build(data);return exportHTML;};
    $('exportButton').click();assert($('exportLanguage').value===target,'Default export language');change('exportLanguage',alternate);assert(PaintI18n.language===target,'Export language changed editor');change('exportLanguage',target);$('confirmExport').click();await wait(()=>exportHTML && !document.body.classList.contains('busy'));
    assert(exportHTML.includes('<html lang="'+target+'">') && exportHTML.includes('>'+expected.restart+'<'),'Export not localized');
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:TintaColor.getProject(),images:{},report:{passed:true,language:target,exportHTML,catalogKeys:Object.keys(PaintI18n.messages()).length,projectUnchanged:true,invalidDraftPreserved:true,multiSelectionPreserved:true,previewNotRestarted:true,viewPreserved:true,playbackPreserved:true,exportLanguageIndependent:true}})});
  } catch(error) { await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})}); }
})();
