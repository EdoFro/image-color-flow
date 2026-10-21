import { verifyHostInput } from './host-input-browser.mjs';
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
 const host=await verifyHostInput(context,pathToFileURL(resolve(dir,'ejemplo.html')).href);
 await host.page.evaluate(async()=>{await sequence.advance();await a.advance(true);});await host.page.screenshot({path:resolve(dir,'integracion.png'),fullPage:true});
 // Opened independently, the same file keeps direct gestures and the final hover restart.
 const bare=await context.newPage();await bare.goto(pathToFileURL(resolve(dir,'animacion.html')).href);await bare.waitForFunction(()=>TintaColorPlayer?.getState().ready);
 assert.equal(await bare.evaluate(()=>TintaColorPlayer.getState().interaction),'animation');
 await bare.keyboard.press('ArrowRight');await bare.waitForFunction(()=>TintaColorPlayer.getState().state.playing);
 await bare.locator('#painting').click();await bare.waitForFunction(()=>TintaColorPlayer.getState().state.position===1&&TintaColorPlayer.getState().state.playing);
 await bare.keyboard.press('End');await bare.waitForFunction(()=>TintaColorPlayer.getState().state.ended);await bare.locator('#painting').hover();await bare.locator('#finishRestart').click();
 await bare.waitForFunction(()=>TintaColorPlayer.getState().state.atStart);assert.equal(await bare.evaluate(()=>TintaColorPlayer.getState().state.playing),false);await bare.close();
 await api.update({project:'draft.colorflow.json',patch:{presentation:{mode:'integrated'}},output:'integrated.colorflow.json',overwrite:true});
 const render=await api.render({project:'integrated.colorflow.json',outputDir:'node-export',overwrite:true});assert.ok(render.artifacts['tinta-color-host.js']&&render.artifacts['ejemplo.html']);
 const good=await readFile(resolve(dir,'animacion.html'),'utf8');await writeFile(resolve(dir,'bad.html'),good.replace(/"base":"data:image\/png;base64,[^"]+"/,'"base":"data:image/png;base64,AAAA"'));
 await writeFile(resolve(dir,'legacy.html'),good.replace("interaction: hostControlled ? 'host' : 'animation'", "interaction: 'animation'"));
 const allowed=new Set(['ejemplo.html','animacion.html','tinta-color-host.js','bad.html','legacy.html']);
 const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!allowed.has(name)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(await readFile(resolve(dir,name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const online=await browser.newContext();online.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
 try {
  const {page:httpPage}=await verifyHostInput(online,`http://127.0.0.1:${server.address().port}/ejemplo.html`);
  const early=await httpPage.evaluate(()=>{const f=document.createElement('iframe');f.src='animacion.html';f.style.pointerEvents='auto';f.tabIndex=2;document.body.append(f);const first=TintaColorHost.attach(f);window.extra=TintaColorHost.attach(f);first.destroy();return extra.advance();});assert.equal(early.error,'NOT_READY');
  await httpPage.waitForFunction(()=>extra.ready);assert.equal(await httpPage.evaluate(()=>extra.state.atStart),true);
  const extraFrame=await httpPage.locator('iframe').last().elementHandle().then(h=>h.contentFrame());
  await httpPage.evaluate(()=>extra.destroy());await extraFrame.waitForFunction(()=>TintaColorPlayer.getState().interaction==='animation');
  assert.deepEqual(await httpPage.evaluate(()=>({inert:extra.iframe.inert,tab:extra.iframe.tabIndex,pointer:extra.iframe.style.pointerEvents})),{inert:false,tab:2,pointer:'auto'});
  assert.equal((await httpPage.evaluate(()=>extra.command('state'))).error,'DESTROYED');
  await httpPage.evaluate(()=>{const f=document.createElement('iframe');f.src='bad.html';document.body.append(f);window.bad=TintaColorHost.attach(f);});
  await httpPage.waitForFunction(()=>bad.error);assert.equal(await httpPage.evaluate(()=>bad.ready),false);assert.equal((await httpPage.evaluate(()=>bad.advance())).error,'INITIALIZATION_FAILED');
  await httpPage.evaluate(()=>{const f=document.createElement('iframe');f.src='legacy.html';document.body.append(f);window.legacy=TintaColorHost.attach(f);});
  await httpPage.waitForFunction(()=>legacy.error);assert.match(await httpPage.evaluate(()=>legacy.error),/HOST_INPUT_UNSUPPORTED/);assert.equal(await httpPage.evaluate(()=>legacy.ready),false);
  assert.equal(await httpPage.evaluate(()=>{const f=document.createElement('iframe');f.src='data:text/html,bad';try{TintaColorHost.attach(f);}catch(e){return !f.inert&&!f.style.pointerEvents&&!f.hasAttribute('tabindex');}}),true);
  await httpPage.evaluate(()=>{const f=document.createElement('iframe');f.src='animacion.html';document.body.append(f);window.removed=TintaColorHost.attach(f);});
  await httpPage.waitForFunction(()=>removed.ready);await httpPage.evaluate(()=>{removed.iframe.remove();removed.destroy();});assert.equal(await httpPage.evaluate(()=>removed.ready),false);
 } finally {await online.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,offline:true,http:true,editor:review.editorUrl,checks:['editor and ZIP export','host-only mouse and keyboard','image and margin hit testing','three animations / four slides','single input binding and replacement','controls execute once','native inputs and links','focus excluded','advance while painting','last stage stays before slide change','back and external resets','independent hover restart','wrong source/channel ignored','disconnect restores attributes','unsupported exports and load errors','real Node render'],artifacts:dir}));
} finally {await context.close();}
}
