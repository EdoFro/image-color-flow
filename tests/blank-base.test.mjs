import assert from 'node:assert/strict';
import { createContext,runInContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { assertPlan } from '../automation/validation.mjs';
const context=createContext({});
for(const name of ['engine','ink-lines','base-generation','project','general','preferences'])runInContext(await readFile(new URL('../app/src/'+name+'.js',import.meta.url),'utf8'),context);
for(const paper of ['white','matched','transparent']){
  assertPlan({baseMode:'blank',baseGeneration:{paper}});
  const p=context.PaintProject.normalize({format:'tinta-y-color',version:12,images:{final:{data:'data:image/png;base64,AA'}},baseMode:'blank',baseGeneration:{paper},stages:[{}]});
  assert.equal(p.baseMode,'blank');assert.equal(p.baseGeneration.paper,paper);assert.equal(p.version,13);
}
const settings=context.PaintPreferences.factory();settings.baseMode='blank';settings.baseGeneration.paper='matched';
const validated=context.PaintPreferences.validate(settings),empty=context.PaintPreferences.project(validated,'Stage');
assert.equal(empty.baseMode,'blank');assert.equal(empty.baseGeneration.paper,'matched');assert.equal(context.PaintProject.normalize(empty,{allowEmpty:true}).baseMode,'blank');
assert.equal(context.PaintPreferences.factory().baseMode,'derived');
for(let version=1;version<=12;version++){
 const p=context.PaintProject.normalize({format:'tinta-y-color',version,images:{final:{data:'data:image/png;base64,AA'}},stages:[{}]});assert.equal(p.baseMode,'derived');assert.equal(p.version,13);
}
assert.throws(()=>assertPlan({baseMode:'other'}));assert.throws(()=>assertPlan({baseMode:'blank',baseGeneration:{paper:'other'}}));
settings.baseGeneration.paper='transparent';assert.equal(context.PaintPreferences.project(context.PaintPreferences.validate(settings),'Transparent').baseGeneration.paper,'transparent');
runInContext(await readFile(new URL('../app/src/player.js',import.meta.url),'utf8'),context);
let pixels;const canvas={getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData:value=>pixels=[...value.data]})};
const model={width:1,height:1,base:new Uint8ClampedArray([99,33,150,0]),final:new Uint8ClampedArray([200,80,40,255]),fields:[{times:new Float32Array([0]),fade:1,duration:1}]};
const player=context.createPaintPlayer(canvas,model);assert.deepEqual(pixels,[0,0,0,0]);assert.equal(player.getState().transparent,true);
player.seek(.5);assert.deepEqual(pixels,[200,80,40,128],'Alpha fade must retain the final hue rather than darkening from hidden RGB');
player.finish();assert.deepEqual(pixels,[200,80,40,255]);player.restart();assert.deepEqual(pixels,[0,0,0,0]);player.destroy();
const partial=context.createPaintPlayer(canvas,{...model,base:new Uint8ClampedArray([200,0,0,128]),final:new Uint8ClampedArray([0,0,200,64])});partial.seek(.5);assert.deepEqual(pixels,[133,0,67,96]);partial.destroy();
console.log('Blank white/matched/transparent schema, projects, preferences, formats 1–12 and premultiplied alpha playback verified.');
