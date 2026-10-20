import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
const context=createContext({console});
for(const name of ['engine','base-generation','project','general','preferences'])runInContext(await readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8'),context,{filename:name+'.js'});
const {PaintPreferences:p,PaintEngine:engine,PaintProject:projects}=context,copy=value=>JSON.parse(JSON.stringify(value));
let count=0;const test=(name,fn)=>{try{fn();count++;}catch(e){throw new Error(name,{cause:e});}};
test('Factory uses the introductory example, empty geometry and editor defaults',()=>{
 const f=p.factory();assert.equal(f.startup,'example');assert.equal(f.stage.maxRadius,.4);assert.equal(f.baseGeneration.method,'protected');assert.equal(f.point.enabled,true);
 const project=p.project(f,'First stage');assert.equal(project.stages[0].name,'First stage');assert.equal(project.stages[0].points.length,0);assert.equal(project.stages[0].path.length,0);assert.equal(project.stages[0].zone,null);assert.equal(project.stages[0].frame,null);assert.equal(project.initialView.highlightFrames.length,0);assert.deepEqual(copy(project.images),{});
});
test('Factories and validation return independent data',()=>{const a=p.factory(),b=p.factory();a.stage.speed=.4;assert.equal(b.stage.speed,.12);const next=p.validate(a);next.stage.speed=.2;assert.equal(a.stage.speed,.4);});
test('All numeric, enum, shape, version and color errors are rejected',()=>{
 for(const change of [f=>f.stage.speed=999,f=>f.stage.speed='0.2',f=>f.stage.speed=NaN,f=>f.point.delay=-1,f=>f.startup='unknown',f=>f.version=99,f=>f.stage.frame={},f=>delete f.stage.radius,f=>f.resolution=999,f=>f.presentation.color='red',f=>f.point.enabled='yes',f=>f.baseGeneration.sensitivity=1.1,f=>f.baseGeneration.paper='pink',f=>f.stage.outside='unknown',f=>f.baseGeneration.method='unknown']){const f=p.factory();change(f);assert.throws(()=>p.validate(f));}
});
test('Thresholds are validated without silently changing them',()=>{const f=p.factory();f.baseGeneration.blackPoint=.5;f.baseGeneration.whitePoint=.5;assert.throws(()=>p.validate(f),/preferences_thresholds/);f.baseGeneration.whitePoint=.51;assert.equal(p.validate(f).baseGeneration.whitePoint,.51);});
test('Imported numeric values use the same increments as preference controls',()=>{for(const change of [f=>f.stage.speed=.1234,f=>f.point.delay=.15,f=>f.baseGeneration.sensitivity=.705]){const f=p.factory();change(f);assert.throws(()=>p.validate(f));}});
test('Preferences JSON round trip and storage preserve every value',()=>{
 const f=p.factory();f.startup='empty';f.stage.windStrength=.8;f.point.startMode='delay';f.point.delay=2;f.baseGeneration.inkMatch='multiply';let raw;
 const storage={getItem:()=>raw,setItem:(k,v)=>{assert.equal(k,p.key);raw=v;}};assert.equal(p.save(storage,f).stored,true);assert.deepEqual(copy(p.load(storage).value),copy(f));assert.deepEqual(copy(p.validate(JSON.parse(JSON.stringify(f)))),copy(f));
});
test('Corrupt, unsupported and inaccessible saved settings recover safely',()=>{
 for(const storage of [{getItem:()=>'{bad'},{getItem:()=>JSON.stringify({version:99})},{getItem(){throw new Error('blocked');}}]){const result=p.load(storage);assert.equal(result.reset,true);assert.equal(result.value.startup,'example');}
 assert.equal(p.load(undefined).value.startup,'example');
});
test('Failed persistence retains the requested defaults for this session',()=>{
 const f=p.factory();f.startup='empty';for(const storage of [undefined,{setItem(){throw new Error('quota');}}]){const saved=p.save(storage,f);assert.equal(saved.stored,false);assert.equal(saved.value.startup,'empty');}
});
test('New projects and stages use preferences without sharing objects',()=>{
 const f=p.factory();f.resolution=720;f.stage.radius=.7;f.stage.zoom=.3;f.stage.outside='transparent';f.stage.pauseAfter=true;f.presentation.background='transparent';const a=p.project(f,'A'),b=p.stage(f,1,'B');
 assert.equal(a.resolution,720);assert.equal(a.stages[0].radius,.7);assert.equal(b.radius,.7);assert.equal(a.initialView.zoom,.3);assert.equal(a.initialView.outside,'transparent');assert.equal(a.stages[0].pauseAfter,true);assert.equal(a.presentation.background,'transparent');a.stages[0].radius=.1;assert.equal(b.radius,.7);assert.equal(f.stage.radius,.7);
});
test('Empty drafts round trip only through the explicit editor option',()=>{
 const f=p.factory();f.baseMode='uploaded';const blank=p.project(f,'Draft');assert.throws(()=>projects.normalize(blank));const result=projects.normalize(copy(blank),{allowEmpty:true});assert.deepEqual(copy(result),copy(blank));
 assert.throws(()=>projects.normalize({...blank,images:[]},{allowEmpty:true}));assert.throws(()=>projects.normalize({...blank,images:{initial:{data:'invalid'}}},{allowEmpty:true}));
});
test('Personal defaults do not affect the engine or existing project normalization',()=>{
 const f=p.factory();f.stage.radius=1.2;p.project(f,'New');assert.equal(engine.normalizeStage().radius,.25);
 const input={format:'tinta-y-color',version:8,images:{final:{name:'x',data:'data:image/png;base64,AA=='}},stages:[{}]};const result=projects.normalize(input);assert.equal(result.stages[0].radius,.25);assert.equal(result.baseGeneration.method,'coherent');assert.equal(Object.hasOwn(result,'startup'),false);
});
console.log(`${count} preferences and empty-project tests passed.`);
