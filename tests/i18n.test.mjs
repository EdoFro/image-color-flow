import { readFile } from 'node:fs/promises';
import { createContext, runInContext, Script } from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url), context = createContext({ console });
for (const file of ['src/i18n.js','src/locales/es.js','src/locales/en.js','src/engine.js','src/project.js','src/player.js','src/codec.js','src/view.js','src/presentation.js']) runInContext(await readFile(new URL(file,root),'utf8'),context,{filename:file});
const i = context.PaintI18n;
const es = i.catalog('es'), en = i.catalog('en');
assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
for (const [key, value] of Object.entries(en)) {
  assert.ok(value.length, key);
  const original = new Set(es[key].match(/\{\w+\}/g) || []);
  for (const name of value.match(/\{\w+\}/g) || []) assert.ok(original.has(name), `${key}: unknown placeholder ${name}`);
}
const html = await readFile(new URL('index.html',root),'utf8');
for (const [,key] of html.matchAll(/data-i18n(?:-title|-aria-label|-placeholder)?="([^"]+)"/g)) assert.ok(Object.hasOwn(es,key),key);
assert.equal(i.choose(null,['en-GB','es']), 'en'); assert.equal(i.choose('es',['en-US']), 'es'); assert.equal(i.choose(null,['fr-FR']), 'es');
i.setLanguage('en'); assert.equal(i.t('language'),'Language');
const userName = '<img src=x onerror=alert(1)> Español';
assert.equal(i.t('selection_reference',{count:2,name:userName}),`2 stages · reference: ${userName}`);
assert.equal(i.error('Revisa Radio máximo.'),'Check Maximum radius.');
assert.equal(i.error('Una cadena desconocida'), 'Una cadena desconocida');
let writes=0, notices=0;
const instance = context.createPaintI18n({ catalogs:{es,en}, storage:{ setItem(){ writes++;throw new Error('blocked'); } } });
instance.subscribe(()=>notices++); instance.setLanguage('en'); instance.setLanguage('en'); instance.setLanguage('es');
assert.equal(writes,3);assert.equal(notices,2);assert.equal(instance.language,'es');
const fallback = context.createPaintI18n({ catalogs:{es:{example:'Texto base'},en:{}},language:'en' });assert.equal(fallback.t('example'),'Texto base');
const serialized = runInContext('('+context.createPaintI18n.toString()+')',createContext({}));assert.equal(serialized({catalogs:{es,en},language:'en'}).t('language'),'Language');
for (const language of ['es','en']) {
  const output=context.PaintPresentation.build({language,width:2,height:2,base:'data:image/png;base64,AA==',final:'data:image/png;base64,AA==',fields:[]});
  assert.ok(output.includes(`<html lang="${language}">`));assert.ok(output.includes(language==='en'?'>Restart<':'>Reiniciar<'));
  assert.ok(!/src="https?:/.test(output));
  const script=output.match(/<script>([\s\S]*)<\/script>/)[1];new Script(script);
}
assert.equal(context.PaintPresentation.build({width:2,height:2,fields:[]}).includes('<html lang="es">'),true);
console.log(`${Object.keys(es).length} catalog keys, placeholders, HTML bindings, fallback, detection, storage and standalone export verified.`);
