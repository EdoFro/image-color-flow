import assert from 'node:assert/strict';
import { createContext,runInContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { assertPlan } from '../automation/validation.mjs';
const context=createContext({});
for(const name of ['engine','ink-lines','base-generation','project','general','preferences'])runInContext(await readFile(new URL('../app/src/'+name+'.js',import.meta.url),'utf8'),context);
for(const paper of ['white','matched']){
  assertPlan({baseMode:'blank',baseGeneration:{paper}});
  const p=context.PaintProject.normalize({format:'tinta-y-color',version:12,images:{final:{data:'data:image/png;base64,AA'}},baseMode:'blank',baseGeneration:{paper},stages:[{}]});
  assert.equal(p.baseMode,'blank');assert.equal(p.baseGeneration.paper,paper);assert.equal(p.version,12);
}
const settings=context.PaintPreferences.factory();settings.baseMode='blank';settings.baseGeneration.paper='matched';
const validated=context.PaintPreferences.validate(settings),empty=context.PaintPreferences.project(validated,'Stage');
assert.equal(empty.baseMode,'blank');assert.equal(empty.baseGeneration.paper,'matched');assert.equal(context.PaintProject.normalize(empty,{allowEmpty:true}).baseMode,'blank');
assert.equal(context.PaintPreferences.factory().baseMode,'derived');
for(let version=1;version<=11;version++){
 const p=context.PaintProject.normalize({format:'tinta-y-color',version,images:{final:{data:'data:image/png;base64,AA'}},stages:[{}]});assert.equal(p.baseMode,'derived');assert.equal(p.version,12);
}
assert.throws(()=>assertPlan({baseMode:'other'}));assert.throws(()=>assertPlan({baseMode:'blank',baseGeneration:{paper:'other'}}));
console.log('Blank-sheet plan/schema, project round-trip, preferences, defaults and formats 1–11 verified.');
