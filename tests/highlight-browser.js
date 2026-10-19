/* Unión real en Canvas y edición de destacados en el editor completo. */
(async () => {
  const $=id=>document.getElementById(id),assert=(v,m)=>{if(!v)throw new Error(m);};
  const wait=async predicate=>{const end=performance.now()+30000;while(!predicate()){if(performance.now()>end)throw new Error('Tiempo agotado: '+$('status').textContent);await new Promise(r=>setTimeout(r,20));}};
  const check=(id,value)=>{$(id).checked=value;$(id).dispatchEvent(new Event('change'));};
  try{
    const {project}=await(await fetch('job.json')).json();await wait(()=>window.TintaColor&&!document.body.classList.contains('busy'));
    const engine=PaintEngine,source=document.createElement('canvas'),out=document.createElement('canvas');source.width=out.width=64;source.height=out.height=64;
    const s=source.getContext('2d'),ctx=out.getContext('2d'),renderer=PaintView.createRenderer(),a={x:.1,y:.1,width:.25,height:.25},b={x:.65,y:.65,width:.25,height:.25};
    const pixel=(x,y)=>[...ctx.getImageData(x,y,1,1).data],same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    for(const outside of ['show','black','white','color','transparent','blur']){
      s.fillStyle='#ff0000';s.fillRect(0,0,64,64);
      if(outside==='blur')for(let y=0;y<64;y++)for(let x=0;x<64;x++){s.fillStyle=(x+y)%2?'#ffffff':'#000000';s.fillRect(x,y,1,1);}
      renderer.draw(ctx,source,64,64,{highlightEnabled:true,highlightLinked:false,highlightFrames:[a,b],outside,outsideColor:'#123456',blur:40});
      for(const [x,y] of [[12,12],[48,48]])assert(same(pixel(x,y),[...s.getImageData(x,y,1,1).data]),'Se alteró un interior: '+outside);
      const gap=pixel(32,32);
      if(outside==='blur')assert(gap[0]>20&&gap[0]<235,'No se desenfoca el espacio entre rectángulos');
      else assert(same(gap,outside==='show'?[255,0,0,255]:outside==='black'?[0,0,0,255]:outside==='white'?[255,255,255,255]:outside==='color'?[18,52,86,255]:[0,0,0,0]),'Exterior incorrecto: '+outside);
    }
    s.clearRect(0,0,64,64);s.fillStyle='rgba(240,80,50,.5)';s.fillRect(0,0,64,64);
    renderer.draw(ctx,source,64,64,{highlightEnabled:true,highlightLinked:false,highlightFrames:[{x:.1,y:.1,width:.6,height:.6},{x:.35,y:.35,width:.5,height:.5}],outside:'transparent'});
    assert(pixel(32,32)[3]===pixel(12,12)[3]&&pixel(32,32)[3]>=127&&pixel(32,32)[3]<=128,'El solapamiento acumula alfa');
    s.clearRect(0,0,64,64);s.fillStyle='#ff0000';s.fillRect(0,0,64,64);
    const from={highlightEnabled:true,highlightLinked:false,highlightFrames:[a,b],outside:'transparent'},to={...from,highlightFrames:[a]};
    renderer.transition(ctx,source,64,64,from,to,.5);assert(pixel(48,48)[3]>=126&&pixel(48,48)[3]<=129&&pixel(32,32)[3]===0,'Transición de cantidades genera un rectángulo envolvente');
    renderer.transition(ctx,source,64,64,from,to,1);assert(pixel(48,48)[3]===0&&pixel(12,12)[3]===255,'No se alcanza la máscara final');
    renderer.transition(ctx,source,64,64,{...from,outside:'black'},{...from,outside:'white'},.5);assert(pixel(32,32)[0]>=126&&pixel(32,32)[0]<=129,'No hay transición gradual del exterior');
    // Gestos del editor, con eventos sintéticos dentro de la aplicación de prueba.
    const overlay=$('overlay');overlay.setPointerCapture=()=>{};
    const drag=(p,q,ctrl=false,cancel=false)=>{const r=overlay.getBoundingClientRect(),event=(type,v)=>overlay.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,button:0,ctrlKey:ctrl,clientX:r.left+v.x*r.width,clientY:r.top+v.y*r.height}));event('pointerdown',p);event('pointermove',q);event(cancel?'pointercancel':'pointerup',q);};
    const stage=()=>TintaColor.getProject().stages[0],originalFrame=JSON.stringify(stage().frame);
    $('viewMode').value='edit';$('viewMode').dispatchEvent(new Event('change'));check('highlightEnabled',true);check('highlightLinked',false);$('setHighlight').click();
    drag({x:.07,y:.4},{x:.27,y:.6});assert(stage().highlightFrames.length===1,'Dibujo normal no reemplaza');const first=JSON.stringify(stage().highlightFrames[0]);
    drag({x:.6,y:.65},{x:.9,y:.9},true);assert(stage().highlightFrames.length===2&&JSON.stringify(stage().highlightFrames[0])===first,'Ctrl borra el anterior');
    drag({x:.1,y:.45},{x:.2,y:.55},true);assert(stage().highlightFrames.length===3,'Ctrl dentro de un destacado no agrega');
    $('highlightList').querySelector('button').click();drag({x:.15,y:.55},{x:.17,y:.57});assert(Math.abs(stage().highlightFrames[0].x-.09)<1e-8,'No se mueve el seleccionado: '+JSON.stringify(stage().highlightFrames[0])+' canvas '+JSON.stringify({width:overlay.getBoundingClientRect().width,height:overlay.getBoundingClientRect().height}));
    drag({x:.29,y:.62},{x:.34,y:.67});assert(Math.abs(stage().highlightFrames[0].width-.25)<1e-8,'No se redimensiona con el asa');
    const before=JSON.stringify(stage().highlightFrames);drag({x:.4,y:.4},{x:.5,y:.5},true,true);assert(JSON.stringify(stage().highlightFrames)===before,'Cancelar modifica la lista');
    drag({x:.35,y:.75},{x:.5,y:.9});assert(stage().highlightFrames.length===1,'El reemplazo conserva rectángulos anteriores');
    drag({x:.65,y:.1},{x:.9,y:.3},true);const separate=JSON.stringify(stage().highlightFrames);check('highlightLinked',true);check('highlightLinked',false);assert(JSON.stringify(stage().highlightFrames)===separate,'Vincular borra los separados');assert(JSON.stringify(stage().frame)===originalFrame,'Se modificó el enfoque');
    $('highlightList').querySelector('button').click();overlay.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true}));assert(stage().highlightFrames.length===1,'Suprimir no elimina seleccionado');
    $('highlightList').querySelector('button[aria-label]').click();assert(!stage().highlightEnabled&&stage().highlightFrames.length===0,'Eliminar último no deshabilita');
    $('initialCard').click();check('highlightEnabled',true);check('highlightLinked',false);$('setHighlight').click();drag({x:.05,y:.05},{x:.2,y:.2});drag({x:.6,y:.6},{x:.9,y:.9},true);assert(TintaColor.getProject().initialView.highlightFrames.length===2,'Inicio no admite varios destacados');
    // HTML autónomo de prueba, para ejecutar el reproductor exportado en una segunda pasada.
    const field=engine.compute({width:64,height:64,rgba:s.getImageData(0,0,64,64).data,stage:{points:[],hold:1,cameraDuration:0,highlightEnabled:true,highlightLinked:false,highlightFrames:[a,{x:.65,y:.1,width:.25,height:.25}],outside:'black'}});
    const png=source.toDataURL('image/png'),exportHTML=PaintPresentation.build({width:64,height:64,base:png,final:png,fields:[PaintCodec.pack(field)],initialView:from});
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,images:{},report:{passed:true,unionAllOutsideModes:true,overlapAlphaOnce:true,transitions:true,ctrlAdds:true,moveResizeCancelReplace:true,linkedListPreserved:true,deleteLastDisables:true,initialView:true,exportHTML}})});
  }catch(error){await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})});}
})();
