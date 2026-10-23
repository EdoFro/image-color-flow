import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import {assertPlan} from '../automation/validation.mjs';
const c=createContext({});
for(const name of ['engine','base-generation','project','general','preferences'])runInContext(await readFile(new URL('../app/src/'+name+'.js',import.meta.url),'utf8'),c);
const input={format:'tinta-y-color',version:13,images:{final:{data:'data:image/png;base64,AA=='}},stages:[{}]};
for(let version=1;version<=13;version++)assert.equal(c.PaintProject.normalize({...input,version}).initialView.pauseAfter,true);
for(const pauseAfter of [false,true]){
 assertPlan({initialView:{pauseAfter}});
 const p=c.PaintProject.normalize({...input,initialView:{pauseAfter,zoom:.3}});
 assert.equal(p.initialView.pauseAfter,pauseAfter);assert.equal(p.version,14);assert.equal(p.stages[0].pauseAfter,false);
 assert.equal(c.PaintProject.normalize(JSON.parse(JSON.stringify(p))).initialView.pauseAfter,pauseAfter);
 c.PaintGeneral.apply(p,{zoom:.5},true);assert.equal(p.initialView.pauseAfter,pauseAfter,'View updates changed initial waiting');
}
for(const pauseAfter of [null,'false',0])assert.throws(()=>assertPlan({initialView:{pauseAfter}}));
const defaults=c.PaintPreferences.factory();defaults.stage.pauseAfter=false;
assert.equal(c.PaintPreferences.project(defaults,'New').initialView.pauseAfter,true);
console.log('Initial wait: legacy defaults, explicit booleans, schema, round-trip, stage independence and new-project defaults verified.');
