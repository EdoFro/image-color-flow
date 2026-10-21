import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createAutomation } from '../automation/api.mjs';
import { createServer } from 'node:http';
export async function runIntegrationBrowser(browser, dir) {
 dir=resolve(dir);await mkdir(dir,{recursive:true});
const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1440,height:1050}});
const errors=[];context.on('page',p=>{p.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});});
try {
 const source=await context.newPage();const images=await source.evaluate(()=>{
  const c=document.createElement('canvas');c.width=360;c.height=180;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,360,180);
  function scene(color){for(let i=0;i<3;i++){x.fillStyle=color?['#e77853','#7eae91','#6f96c4'][i]:'#fff';x.strokeStyle='#14251e';x.lineWidth=3;x.beginPath();x.arc(65+i*115,90,40,0,2*Math.PI);x.fill();x.stroke();}}
  scene(false);const base=c.toDataURL();scene(true);return{base,final:c.toDataURL()};});await source.close();
 await writeFile(resolve(dir,'image.png'),Buffer.from(images.final.split(',')[1],'base64'));await writeFile(resolve(dir,'base.png'),Buffer.from(images.base.split(',')[1],'base64'));
 const api=await createAutomation({root:dir});await api.create({image:'image.png',initialImage:'base.png',output:'draft.colorflow.json',overwrite:true,plan:{resolution:720,presentation:{background:'transparent'},stages:[0,1,2].map(i=>({name:'Momento '+(i+1),points:[{x:(65+i*115)/360,y:.5}],radius:.18,maxRadius:.18,speed:.6,clarity:0,ink:0,fade:.1,cameraDuration:0,hold:.7}))}});
 const review=await api.review({project:'draft.colorflow.json',output:'editar.html',open:false,overwrite:true});
 const editor=await context.newPage();await editor.goto(review.editorUrl);await editor.waitForFunction(()=>window.TintaColor?.getPrepared());
 assert.equal(await editor.evaluate(()=>TintaColor.getProject().stages.length),3);assert.equal(await editor.locator('script[src]').count(),0);
 await editor.locator('#stageName').fill('Revisado por el usuario');await editor.locator('#maxRadius').fill('19');await editor.locator('#maxRadius').dispatchEvent('input');
 const save=editor.waitForEvent('download');await editor.locator('#saveButton').click();const saved=await save;await saved.saveAs(resolve(dir,'usuario.colorflow.json'));
 const edited=JSON.parse(await readFile(resolve(dir,'usuario.colorflow.json'),'utf8'));assert.equal(edited.stages[0].name,'Revisado por el usuario');assert.equal(edited.stages[0].maxRadius,.19);
 await editor.locator('#exportButton').click();await editor.locator('#exportMode').selectOption('integrated');const exporting=editor.waitForEvent('download');await editor.locator('#confirmExport').click();const download=await exporting;assert.ok(download.suggestedFilename().endsWith('.zip'));await download.saveAs(resolve(dir,'animacion-integrada.zip'));
 const bytes=await readFile(resolve(dir,'animacion-integrada.zip'));let at=0;const names=[];while(bytes.readUInt32LE(at)===0x04034b50){const len=bytes.readUInt16LE(at+26),size=bytes.readUInt32LE(at+18),name=bytes.subarray(at+30,at+30+len).toString();assert.match(name,/^[a-zA-Z0-9._-]+$/);await writeFile(resolve(dir,name),bytes.subarray(at+30+len,at+30+len+size));names.push(name);at+=30+len+size;}
 assert.deepEqual(names.sort(),['LEEME.txt','animacion.html','ejemplo.html','tinta-color-host.js'].sort());
 await editor.screenshot({path:resolve(dir,'editor.png'),fullPage:true});
 const page=await context.newPage();await page.goto(pathToFileURL(resolve(dir,'ejemplo.html')).href);await page.waitForFunction(()=>a.ready&&b.ready,{},{timeout:8000}).catch(async e=>{console.log('HOST',await page.evaluate(()=>({aReady:a.ready,bReady:b.ready,aState:a.state,aError:a.error,origin:location.origin})));for(const f of page.frames().slice(1))console.log('FRAME',await f.evaluate(()=>({origin:location.origin,href:location.href,state:window.TintaColorPlayer?.getState()})));throw e;});
 await page.evaluate(()=>{window.stray=0;document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')window.stray++;});});
 const state=()=>page.evaluate(()=>({a:a.state,b:b.state,index:sequence.index,stray:window.stray,text:document.getElementById('text').hidden,slide2:document.getElementById('slide2').hidden}));
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>a.state.playing);await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');assert.equal((await state()).a.position,0);assert.equal((await state()).text,true);
 const fa=await page.locator('#a').elementHandle().then(h=>h.contentFrame());const fb=await page.locator('#b').elementHandle().then(h=>h.contentFrame());
 await fa.locator('#painting').focus();await page.keyboard.press('ArrowRight');assert.equal((await state()).index,0);
 await page.waitForFunction(()=>a.state.waiting);await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>a.state.position===1&&a.state.playing);await page.keyboard.press('Shift+ArrowRight');await page.waitForFunction(()=>a.state.waiting);assert.equal((await state()).a.position,1);
 await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>a.state.position===0&&a.state.waiting);await page.keyboard.press('Home');await page.waitForFunction(()=>a.state.atStart);assert.equal((await state()).a.playing,false);
 // Wrong channel and wrong source (even with A's token) must not change A.
 await page.evaluate(()=>{const w=document.getElementById('a').contentWindow;w.postMessage({protocol:'tinta-color',version:1,channel:'0'.repeat(48),kind:'command',id:55,command:'finish'},'*');});
 const token=await page.locator('#a').getAttribute('src').then(s=>new URLSearchParams(new URL(s).hash.slice(1)).get('tc-channel'));
 await fb.evaluate(token=>parent.postMessage({protocol:'tinta-color',version:1,channel:token,kind:'event',event:'state',state:{ended:true}},'*'),token);await page.waitForTimeout(50);assert.equal((await state()).a.atStart,true);
 await page.keyboard.press('End');await page.waitForFunction(()=>a.state.ended);await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>!document.getElementById('text').hidden);await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>b.state.playing);await page.keyboard.press('ArrowRight');assert.equal((await state()).index,2);
 await fb.locator('#painting').focus();await page.keyboard.press('End');await page.waitForFunction(()=>b.state.ended);await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>!document.getElementById('slide2').hidden);
 // Reset through the image button returns its place in the sequence, not the next slide.
 await page.evaluate(()=>a.restart());await page.waitForFunction(()=>sequence.index===0&&!document.getElementById('slide1').hidden);await page.evaluate(()=>a.finish());await page.waitForFunction(()=>a.state.ended);
 await fa.locator('#painting').hover();await fa.locator('#finishRestart').click();await page.waitForFunction(()=>a.state.atStart);assert.equal((await state()).a.playing,false);assert.equal((await state()).index,0);
 assert.equal((await state()).stray,0);assert.equal(await fa.locator('#controlsToggle').isVisible(),false);await page.screenshot({path:resolve(dir,'integracion.png'),fullPage:true});
 await page.evaluate(()=>sequence.restart());await page.waitForFunction(()=>a.state.atStart&&b.state.atStart);await page.locator('#a').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>a.state.playing);
 // Retain the captured result when the active animation changes during a restart request.
 await page.evaluate(async()=>{await a.finish();await sequence.advance();await sequence.advance();});
 await page.waitForFunction(()=>b.state.playing);await page.evaluate(()=>a.restart());
 assert.equal((await state()).index,2);await page.evaluate(()=>sequence.advance(true));await page.waitForFunction(()=>b.state.waiting);
 await page.evaluate(()=>sequence.advance());await page.waitForFunction(()=>a.state.playing&&sequence.index===0);assert.equal((await state()).b.playing,false);
 // Real Node renderer also supplies integration companions for an external work root.
 await api.update({project:'draft.colorflow.json',patch:{presentation:{mode:'integrated'}},output:'integrated.colorflow.json',overwrite:true});
 const render=await api.render({project:'integrated.colorflow.json',outputDir:'node-export',overwrite:true});
 assert.ok(render.artifacts['tinta-color-host.js']&&render.artifacts['ejemplo.html']);
 // Serve exactly the generated fixture files to test the non-file transport too.
 const allowed=new Set(['ejemplo.html','animacion.html','tinta-color-host.js','bad.html']);
 const good=await readFile(resolve(dir,'animacion.html'),'utf8');await writeFile(resolve(dir,'bad.html'),good.replace(/"base":"data:image\/png;base64,[^"]+"/,'"base":"data:image/png;base64,AAAA"'));
 const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!allowed.has(name)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(await readFile(resolve(dir,name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const online=await browser.newContext();const httpPage=await online.newPage();
 try {
  await httpPage.goto(`http://127.0.0.1:${server.address().port}/ejemplo.html`);await httpPage.waitForFunction(()=>a.ready&&b.ready);
  await httpPage.keyboard.press('ArrowRight');await httpPage.waitForFunction(()=>a.state.playing);
  const early=await httpPage.evaluate(()=>{const f=document.createElement('iframe');f.src='animacion.html';document.body.append(f);window.extra=TintaColorHost.attach(f);return extra.advance();});assert.equal(early.error,'NOT_READY');
  await httpPage.waitForFunction(()=>extra.ready);assert.equal(await httpPage.evaluate(()=>extra.state.atStart),true);await httpPage.evaluate(()=>extra.destroy());
  await httpPage.evaluate(()=>{const f=document.createElement('iframe');f.src='bad.html';document.body.append(f);window.bad=TintaColorHost.attach(f,{onError:e=>window.expectedError=e});});
  await httpPage.waitForFunction(()=>bad.error);assert.equal(await httpPage.evaluate(()=>bad.ready),false);assert.equal((await httpPage.evaluate(()=>bad.advance())).error,'INITIALIZATION_FAILED');
 } finally {await online.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,offline:true,http:true,editor:review.editorUrl,checks:['embedded editable draft','user edits/download','integrated ZIP','all five commands','manual stage boundaries','busy input discard','keyboard inside/outside iframe','two animations + text + slide','hover restart returns sequence','restart during other animation','wrong source/channel ignored','no duplicate keyboard events','not-ready is not queued','initialization error','real Node render'],artifacts:dir}));
} finally {await context.close();}
}
