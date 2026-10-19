/* Prueba del HTML exportado, sin cargar módulos del editor. */
(async()=>{
  const $=id=>document.getElementById(id),assert=(v,m)=>{if(!v)throw new Error(m);};
  try{
    const {project}=await(await fetch('job.json')).json(),canvas=$('painting'),end=performance.now()+15000;
    while(!canvas.onclick){if(performance.now()>end)throw new Error('Presentación no inició: '+$('caption').textContent);await new Promise(r=>setTimeout(r,20));}
    const ctx=canvas.getContext('2d'),pixel=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
    assert(pixel(12,12)[0]===255&&pixel(48,48)[0]===255&&pixel(32,32)[3]===0,'Inicio exportado perdió la unión transparente');
    $('progress').value='1000';$('progress').oninput();
    assert(pixel(12,12)[0]===255&&pixel(48,12)[0]===255,'Exportación perdió un rectángulo');assert(pixel(32,32)[0]===0&&pixel(32,32)[3]===255,'Exterior exportado incorrecto');
    $('restart').click();assert(pixel(48,48)[0]===255&&pixel(32,32)[3]===0,'Reinicio no restaura varios destacados');
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,images:{},report:{passed:true,standalonePresentation:true,initialUnion:true,stageUnion:true,restartRestoresUnion:true}})});
  }catch(error){await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})});}
})();
