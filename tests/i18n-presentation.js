(async()=>{
  const $=id=>document.getElementById(id),assert=(v,m)=>{if(!v)throw new Error(m);};
  const wait=async f=>{const until=performance.now()+10000;while(!f()){if(performance.now()>until)throw new Error('Timeout: '+$('caption').textContent);await new Promise(r=>setTimeout(r,20));}};
  const language=document.documentElement.lang;
  const labels={
    es:{restart:'Reiniciar',show:'Mostrar controles (H)',hide:'Ocultar controles (H)',initial:'Inicio · clic en la imagen o espacio para comenzar',pause:'Pausar',end:'Animación terminada',prefix:'Inicio'},
    en:{restart:'Restart',show:'Show controls (H)',hide:'Hide controls (H)',initial:'Initial view · click the image or press Space to begin',pause:'Pause',end:'Animation finished',prefix:'Initial view'},
    fr:{restart:'Recommencer',show:'Afficher les commandes (H)',hide:'Masquer les commandes (H)',initial:'Vue initiale · cliquez sur l’image ou appuyez sur Espace pour commencer',pause:'Mettre en pause',end:'Animation terminée',prefix:'Vue initiale'},
    de:{restart:'Zurücksetzen',show:'Steuerung anzeigen (H)',hide:'Steuerung ausblenden (H)',initial:'Startansicht · zum Beginnen auf das Bild klicken oder Leertaste drücken',pause:'Pausieren',end:'Animation beendet',prefix:'Startansicht'}
  },expected=labels[language];
  try {
    await wait(()=>!$('play').disabled);
    assert(expected && $('restart').textContent===expected.restart,'Export language missing');
    assert($('controls').hidden && $('controlsToggle').getAttribute('aria-label')===expected.show,'Initial exported UI');
    $('controlsToggle').click();assert($('controlsToggle').title===expected.hide,'Controls toggle translation');
    const imageBounds=$('painting').getBoundingClientRect();$('controlsToggle').click();
    assert($('painting').getBoundingClientRect().width===imageBounds.width&&$('painting').getBoundingClientRect().height===imageBounds.height,'Controls resized artwork');
    $('controlsToggle').click();
    $('caption').textContent='A'.repeat(180);
    assert(document.documentElement.scrollWidth<=innerWidth+1,'Long caption overflows viewport');
    $('caption').textContent=expected.initial;
    assert($('caption').textContent===expected.initial,'Initial caption');
    $('painting').click();await wait(()=>$('play').textContent===expected.pause||!$('finishRestart').hidden);
    $('progress').value=1000;$('progress').dispatchEvent(new Event('input'));await wait(()=>!$('finishRestart').hidden);
    assert($('caption').textContent===expected.end,'End caption');$('finishRestart').click();
    assert($('finishRestart').hidden && $('caption').textContent.includes(expected.prefix),'Restart lost language');
    assert(!document.querySelector('script[src^="http"]'),'External dependency');
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:{},images:{},report:{passed:true,language,standalone:true,controlsTranslated:true,restartTranslated:true}})});
  }catch(error){await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})});}
})();
