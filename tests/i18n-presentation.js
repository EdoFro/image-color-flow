(async()=>{
  const $=id=>document.getElementById(id),assert=(v,m)=>{if(!v)throw new Error(m);};
  const wait=async f=>{const until=performance.now()+10000;while(!f()){if(performance.now()>until)throw new Error('Timeout: '+$('caption').textContent);await new Promise(r=>setTimeout(r,20));}};
  try {
    await wait(()=>!$('play').disabled);
    assert(document.documentElement.lang==='en' && $('restart').textContent==='Restart','Export language missing');
    assert($('controls').hidden && $('controlsToggle').getAttribute('aria-label')==='Show controls (H)','Initial exported UI');
    $('controlsToggle').click();assert($('controlsToggle').title==='Hide controls (H)','Controls toggle translation');
    assert($('caption').textContent==='Initial view · click the image or press Space to begin','Initial caption');
    $('painting').click();await wait(()=>$('play').textContent==='Pause'||!$('finishRestart').hidden);
    $('progress').value=1000;$('progress').dispatchEvent(new Event('input'));await wait(()=>!$('finishRestart').hidden);
    assert($('caption').textContent==='Animation finished','End caption');$('finishRestart').click();
    assert($('finishRestart').hidden && $('caption').textContent.includes('Initial view'),'Restart lost language');
    assert(!document.querySelector('script[src^="http"]'),'External dependency');
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:{},images:{},report:{passed:true,englishStandalone:true,controlsTranslated:true,restartTranslated:true}})});
  }catch(error){await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})});}
})();
