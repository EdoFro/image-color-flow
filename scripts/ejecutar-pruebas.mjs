// Ejecuta los mismos casos sin DOM usados por tests/index.html.
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { Buffer } from 'node:buffer';

const context = createContext({
  console,
  btoa: text => Buffer.from(text, 'binary').toString('base64'),
  atob: text => Buffer.from(text, 'base64').toString('binary'),
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {}
});
for (const file of ['src/engine.js', 'src/base-generation.js', 'src/project.js', 'src/view.js', 'src/player.js', 'src/codec.js', 'src/general.js', 'tests/tests.js']) {
  runInContext(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
const results = context.PAINT_TEST_RESULTS;
const failures = results.filter(result => !result.pass);
for (const failure of failures) console.error(`✗ ${failure.name}: ${failure.error}`);
console.log(`${results.length - failures.length} / ${results.length} pruebas correctas (sin DOM).`);
if (failures.length) throw new Error(`${failures.length} pruebas fallaron.`);
