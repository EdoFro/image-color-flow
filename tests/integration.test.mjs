import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createContext, runInContext, Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { createAutomation } from '../automation/api.mjs';
import { createHandler } from '../automation/mcp.mjs';
import { main as cli } from '../automation/cli.mjs';
import { crc32 } from '../scripts/lib/zip.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
let now = 0, serial = 0; const queue = new Map();
const context = createContext({ TextEncoder, Blob, URL, URLSearchParams, console, requestAnimationFrame(fn) { queue.set(++serial,fn); return serial; }, cancelAnimationFrame(id) { queue.delete(id); } });
for (const name of ['engine','ink-lines','base-generation','project','player','integration']) runInContext(await readFile(new URL(`../app/src/${name}.js`,import.meta.url),'utf8'),context);
function tick() { for (const delta of [1,1100]) { now+=delta; const calls=[...queue.values()]; queue.clear(); calls.forEach(fn=>fn(now)); } }
let pixel;
const canvas={getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData:f=>pixel=[...f.data]})};
const fields=[0,1,2].map(index=>({stageIndex:index*2,duration:1,fade:.1,times:new Float32Array([0]),pauseAfter:false,name:'Stage '+index}));
const player=context.createPaintPlayer(canvas,{width:1,height:1,base:[255,255,255,255],final:[255,0,0,255],fields,manual:true});
assert.equal(player.getState().atStart,true);
player.advance(); assert.equal(player.advance().reason,'busy'); tick();
assert.equal(player.getState().waiting,true); assert.equal(player.getState().position,0); assert.equal(player.getState().index,0);
player.advance(); player.advance(false); assert.equal(player.getState().position,1); assert.equal(player.getState().waiting,true); assert.equal(pixel[1],0);
player.back(); assert.equal(player.getState().position,0); assert.equal(player.getState().time,1); assert.equal(player.getState().playing,false);
player.back(); assert.equal(player.getState().atStart,true); assert.equal(pixel[1],255);
player.advance(false); assert.equal(player.getState().position,0); player.advance(false); assert.equal(player.getState().position,1);
player.advance(); tick(); assert.equal(player.getState().ended,true); assert.equal(player.advance().consumed,false);
player.restart(); assert.equal(player.getState().atStart,true); assert.equal(player.getState().playing,false);
player.finish(); assert.equal(player.getState().ended,true); player.back(); assert.equal(player.getState().position,1);
player.restart(); player.advance(); player.pause(); assert.equal(player.getState().phase,'paused'); player.advance(); assert.equal(player.getState().position,0); player.back(); assert.equal(player.getState().atStart,true);
player.destroy();
// Zero-duration stages must remain separate manual checkpoints.
const zero=context.createPaintPlayer(canvas,{width:1,height:1,base:[255,255,255,255],final:[255,0,0,255],fields:fields.map(f=>({...f,duration:0})),manual:true});
zero.advance(false); assert.equal(zero.getState().position,0); zero.advance(false); assert.equal(zero.getState().position,1); zero.finish(); assert.equal(zero.getState().ended,true); zero.destroy();
const zip=new Uint8Array(await context.PaintIntegration.zip({'one.txt':'áβ', 'two.html':'<h1>Test</h1>'}).arrayBuffer());
const view=new DataView(zip.buffer); let at=0;
for(const [name,text] of Object.entries({'one.txt':'áβ','two.html':'<h1>Test</h1>'})) {
 assert.equal(view.getUint32(at,true),0x04034b50); const length=view.getUint16(at+26,true),size=view.getUint32(at+18,true),start=at+30+length;
 assert.equal(new TextDecoder().decode(zip.slice(at+30,start)),name);const bytes=zip.slice(start,start+size);assert.equal(new TextDecoder().decode(bytes),text);assert.equal(view.getUint32(at+14,true),crc32(bytes));at=start+size;
}
await mkdir(resolve(repo,'output'),{recursive:true});const temp=await mkdtemp(resolve(repo,'output/test-integration-'));
try {
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=','base64');await writeFile(resolve(temp,'image.png'),png);
 const api=await createAutomation({root:temp,renderer:async project=>({project,html:'<!doctype html>',images:{},report:{warnings:[]}})});
 const name='</script><script>window.unwanted=true</script>';
 await api.create({image:'image.png',output:'draft.json',plan:{presentation:{mode:'integrated'},stages:[{name,points:[{x:.2,y:.3,inheritRadii:false,maxRadius:.1}]}]}});
 const review=await api.review({project:'draft.json',output:'editor.html',open:false});assert.equal(review.opened,false);assert.ok(review.editorUrl.startsWith('file:'));
 const html=await readFile(resolve(temp,review.path),'utf8');assert.ok(!/<script src="(?:src|demo)\//.test(html));assert.ok(!html.includes(name));assert.ok(html.includes('tinta-color-project'));
 const embedded=JSON.parse(html.match(/id="tinta-color-project">([\s\S]*?)<\/script>/)[1]);assert.equal(embedded.stages[0].name,name);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if(!match[0].includes('type="application/json"')) new Script(match[1]);
 await assert.rejects(api.review({project:'draft.json',output:'../escape.html',open:false}),e=>e.code==='OUTSIDE_WORKSPACE');
 await assert.rejects(api.review({project:'draft.json',output:'editor.html',open:false}));
 const rendered=await api.render({project:'draft.json',outputDir:'delivery'});assert.ok(rendered.artifacts['tinta-color-host.js']);assert.ok(rendered.artifacts['ejemplo.html']);
 const handler=createHandler(api);await handler.handle({jsonrpc:'2.0',id:1,method:'initialize'});await handler.handle({jsonrpc:'2.0',method:'notifications/initialized'});
 const result=await handler.handle({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'colorflow_review',arguments:{project:'draft.json',output:'mcp-editor.html',open:false}}});assert.equal(result.result.structuredContent.opened,false);
 let out='';const code=await cli(['review','--root',temp,'--project','draft.json','--out','cli-editor.html'],{stdout:{write:t=>out+=t},stderr:{write:t=>out+=t}});assert.equal(code,0,out);assert.equal(JSON.parse(out).opened,false);
 console.log('Integration: manual checkpoints, busy/skip/back/restart/end, zero-duration stages, ZIP CRC/Unicode, standalone editor escaping, file roots, API/CLI/MCP review and integration delivery passed.');
} finally { if(!/^test-integration-[^/\\:]+$/.test(relative(resolve(repo,'output'),temp))) throw new Error('Unsafe temporary path');await rm(temp,{recursive:true,force:true}); }
