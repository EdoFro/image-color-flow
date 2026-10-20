// Solo para desarrollo. El editor no necesita Node.js ni este generador.
import { readFile, writeFile } from 'node:fs/promises';

const examples = new URL('../examples/', import.meta.url);
const definitions = [
  ['initial', 'samurai-inicial.jpg', 'image/jpeg'],
  ['final', 'samurai-final.png', 'image/png']
];
const images = Object.fromEntries(await Promise.all(definitions.map(async ([key, name, mime]) => {
  const bytes = await readFile(new URL(`images/${name}`, examples));
  return [key, { name, data: `data:${mime};base64,${bytes.toString('base64')}` }];
})));
const script = '// Generado por scripts/generar-demo.mjs a partir de examples/images/. No editar a mano.\n' +
  `window.PAINT_DEMO = ${JSON.stringify(images)};\n`;
await writeFile(new URL('../app/demo/demo-data.js', import.meta.url), script, 'utf8');
console.log('Actualizado app/demo/demo-data.js con las dos imágenes originales.');
