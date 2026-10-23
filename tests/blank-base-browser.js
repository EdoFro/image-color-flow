(async () => {
  const $=id=>document.getElementById(id), assert=(v,m)=>{if(!v)throw new Error(m);};
  const wait=async fn=>{const end=performance.now()+30000;while(!fn()){if(performance.now()>end)throw new Error('Timeout: '+$('status').textContent);await new Promise(r=>setTimeout(r,20));}};
  const idle=()=>wait(()=>!document.body.classList.contains('busy'));
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));};
  const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  const uniform=(pixels,rgb,alpha=255)=>pixels.every((v,i)=>v===(i%4===3?alpha:rgb[i%4]));
  try {
    await wait(()=>window.TintaColor&&!document.body.classList.contains('busy'));
    const c=document.createElement('canvas');c.width=64;c.height=48;const ctx=c.getContext('2d');
    ctx.fillStyle='rgb(248,244,230)';ctx.fillRect(0,0,64,48);ctx.fillStyle='#233f81';ctx.fillRect(5,5,20,22);ctx.fillStyle='#111';ctx.fillRect(32,8,3,30);
    const source={name:'paper.png',data:c.toDataURL()}, expected=new Uint8ClampedArray(ctx.getImageData(0,0,64,48).data), image=await PaintPreparation.loadImage(source.data);
    const input={format:'tinta-y-color',version:12,name:'Hoja vacía',images:{final:source},resolution:720,baseMode:'blank',baseGeneration:{paper:'white',method:'protected',inkMatch:'source-to-base'},stages:[{name:'Aparece el dibujo',points:[{x:.5,y:.5}],radius:1.5,maxRadius:1.5,speed:1,ink:0,clarity:0,hueResistance:0,fade:.05,hold:0,cameraDuration:0}]};
    const originalDerive=PaintBase.derive,originalMatch=PaintBase.matchInk;
    PaintBase.derive=()=>{throw new Error('Blank must bypass extraction');};PaintBase.matchInk=()=>{throw new Error('Blank must bypass ink matching');};
    try {
      for(const paper of ['white','matched','transparent'])for(const inkMatch of ['none','source-to-base','base-to-final','darken','multiply']){
        const options={...input,alignment:{x:.2,y:.2,sx:1.2,sy:1.2,angle:6},baseGeneration:{...input.baseGeneration,paper,inkMatch}};
        const p=PaintPreparation.prepare(image,image,options);
        assert(uniform(p.base.data,paper==='white'?[255,255,255]:paper==='transparent'?[0,0,0]:[248,244,230],paper==='transparent'?0:255),'Base is not a uniform '+paper+' sheet');
        assert(equal(p.final.data,expected)&&p.inkMatchPixels===0&&p.baseSourceSize===null,'Blank modified the final image or ran extraction');
      }
    } finally {PaintBase.derive=originalDerive;PaintBase.matchInk=originalMatch;}
    const compiled=await PaintAutomation.compile(input), playerCanvas=document.createElement('canvas');
    const player=createPaintPlayer(playerCanvas,{width:compiled.prepared.width,height:compiled.prepared.height,base:compiled.prepared.base.data,final:compiled.prepared.final.data,fields:compiled.fields,initialView:compiled.project.initialView});
    assert(uniform(playerCanvas.getContext('2d').getImageData(0,0,64,48).data,[255,255,255]),'Playback does not begin on a blank sheet');
    player.seek(player.getState().total);assert(equal(playerCanvas.getContext('2d').getImageData(0,0,64,48).data,expected),'Playback does not reach the final image');player.destroy();
    assert(compiled.html.includes('<html')&&compiled.project.baseMode==='blank'&&compiled.project.version===14,'Blank export contract');
    const transparentCompiled=await PaintAutomation.compile({...input,baseGeneration:{paper:'transparent'}}),tc=document.createElement('canvas');
    const tp=createPaintPlayer(tc,{width:64,height:48,base:transparentCompiled.prepared.base.data,final:transparentCompiled.prepared.final.data,fields:transparentCompiled.fields});
    assert(uniform(tc.getContext('2d').getImageData(0,0,64,48).data,[0,0,0],0),'Playback must start fully transparent');
    const field=transparentCompiled.fields[0],idx=24*64+32;tp.seek(field.fullTimes[idx]+field.fade/2);
    const mid=tc.getContext('2d').getImageData(32,24,1,1).data;assert(Math.abs(mid[3]-128)<=1&&[0,1,2].every(k=>Math.abs(mid[k]-expected[idx*4+k])<=2),'Transparent fade darkens or loses hue');
    tp.finish();assert(equal(tc.getContext('2d').getImageData(0,0,64,48).data,expected),'Transparent playback final differs');tp.restart();assert(uniform(tc.getContext('2d').getImageData(0,0,64,48).data,[0,0,0],0),'Restart lost transparency');tp.destroy();
    const hp=createPaintPlayer(tc,{width:64,height:48,base:transparentCompiled.prepared.base.data,final:transparentCompiled.prepared.final.data,fields:transparentCompiled.fields,initialView:{highlightEnabled:true,highlightLinked:false,highlightFrames:[{x:.25,y:.25,width:.5,height:.5}],outside:'black'}});
    assert(tc.getContext('2d').getImageData(32,24,1,1).data[3]===0&&tc.getContext('2d').getImageData(0,0,1,1).data[3]===255,'Highlight fills transparent interior');hp.destroy();
    const files=new DataTransfer();files.items.add(new File([JSON.stringify(input)],'blank.colorflow.json',{type:'application/json'}));$('projectFile').files=files.files;$('projectFile').dispatchEvent(new Event('change'));await idle();
    assert(TintaColor.getProject().baseMode==='blank'&&uniform(TintaColor.getPrepared().base.data,[255,255,255]),'Opening blank project changed mode');
    $('imagesButton').click();assert(TintaColor.getBasePreviewState().complete&&$('baseInkControls').hidden&&$('imageAlignment').hidden&&!$('applyImages').disabled,'Blank preview not ready or wrong controls');
    change('basePreviewZoom','2');const view={...TintaColor.getBasePreviewState().view};change('basePaper','matched');
    assert(TintaColor.getBasePreviewState().complete&&JSON.stringify(TintaColor.getBasePreviewState().view)===JSON.stringify(view),'Paper adjustment reset comparison view');
    $('applyImages').click();await idle();assert(TintaColor.getProject().baseMode==='blank'&&uniform(TintaColor.getPrepared().base.data,[248,244,230]),'Applying blank matched paper switched to derived');
    await TintaColor.undo();assert(uniform(TintaColor.getPrepared().base.data,[255,255,255]),'Undo blank paper');await TintaColor.redo();assert(uniform(TintaColor.getPrepared().base.data,[248,244,230]),'Redo blank paper');
    $('imagesButton').click();change('baseMode','derived');change('baseMode','blank');await new Promise(r=>setTimeout(r,150));assert(TintaColor.getBasePreviewState().complete&&$('baseInkControls').hidden,'Old worker tiles replaced blank preview');
    const currentView={...TintaColor.getBasePreviewState().view};change('basePaper','transparent');assert(TintaColor.getBasePreviewState().complete&&JSON.stringify(TintaColor.getBasePreviewState().view)===JSON.stringify(currentView),'Transparent preview reset view');let downloaded;
    const originalURL=URL.createObjectURL;URL.createObjectURL=blob=>{if(blob.type==='image/png')downloaded=blob;return originalURL.call(URL,blob);};$('downloadBase').click();await idle();assert(downloaded,'Blank PNG download missing');
    const bitmap=await createImageBitmap(downloaded),dc=document.createElement('canvas');dc.width=bitmap.width;dc.height=bitmap.height;dc.getContext('2d').drawImage(bitmap,0,0);assert(uniform(dc.getContext('2d').getImageData(0,0,dc.width,dc.height).data,[0,0,0],0),'Downloaded PNG lost transparency');bitmap.close();URL.createObjectURL=originalURL;
    $('applyImages').click();await idle();assert(TintaColor.getProject().baseGeneration.paper==='transparent'&&uniform(TintaColor.getPrepared().base.data,[0,0,0],0),'Apply lost transparent sheet');
    change('viewMode','initial');assert($('canvasWrap').classList.contains('transparent')&&uniform($('canvas').getContext('2d').getImageData(0,0,64,48).data,[0,0,0],0),'Editor initial view lost transparency or checkerboard');
    await TintaColor.undo();assert(uniform(TintaColor.getPrepared().base.data,[248,244,230]),'Undo transparent background');await TintaColor.redo();assert(uniform(TintaColor.getPrepared().base.data,[0,0,0],0),'Redo transparent background');
    $('imagesDialog').close();
    // A preferred empty sheet survives loading a final image in a new project.
    $('newButton').click();if($('replaceDialog').open)$('confirmReplace').click();await idle();
    $('imagesButton').click();change('baseMode','blank');const fileBytes=Uint8Array.from(atob(source.data.split(',')[1]),c=>c.charCodeAt(0));const imageFiles=new DataTransfer();imageFiles.items.add(new File([fileBytes],'loaded.png',{type:'image/png'}));$('finalFile').files=imageFiles.files;$('finalFile').dispatchEvent(new Event('change'));await idle();
    assert($('baseMode').value==='blank'&&TintaColor.getBasePreviewState().complete,'Loading final image discarded blank mode');$('applyImages').click();await idle();
    assert(TintaColor.getProject().baseMode==='blank','New image/apply discarded blank mode');
    await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:TintaColor.getProject(),images:{},report:{passed:true,pureWhite:true,matchedPaper:true,transparent:true,premultipliedFade:true,highlightTransparency:true,inkMethodsBypassed:true,finalUnmodified:true,playbackEndpoints:true,automaticPreview:true,comparisonViewPreserved:true,modeTransitions:true,pngDownload:true,undoRedo:true,loadAndApply:true}})});
  }catch(error){await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:error.stack||error.message})});}
})();
