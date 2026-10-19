// Usa el lanzador headless de la aplicación con una copia temporal del runner.
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, relative } from 'node:path';
const repo = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(resolve(repo, 'output/test-preview-'));
const editor = process.argv.includes('--editor');
try {
  await mkdir(resolve(temp, 'automation')); await mkdir(resolve(temp, 'src'));
  const names = ['engine','ink-lines','base-generation','project','preparation','view','player','codec','presentation','automation','base-preview','image-comparison','general','app'];
  for (const name of names) await copyFile(resolve(repo, 'src', name + '.js'), resolve(temp, 'src', name + '.js'));
  let browser = await readFile(resolve(repo, 'automation/browser.mjs'), 'utf8');
  browser = browser.replace("'engine', 'ink-lines'", "'base-preview', 'image-comparison', 'general', 'app', 'engine', 'ink-lines'");
  browser = browser.replace('const assets = new Map([', "const assets = new Map([\n['assets/styles.css', new URL('../assets/styles.css', import.meta.url)],\n['examples/demo-data.js', new URL('../examples/demo-data.js', import.meta.url)],");
  await writeFile(resolve(temp, 'automation/browser.mjs'), browser);
  await copyFile(resolve(repo, 'automation/validation.mjs'), resolve(temp, 'automation/validation.mjs'));
  await mkdir(resolve(temp, 'schemas')); await copyFile(resolve(repo, 'schemas/animation.schema.json'), resolve(temp, 'schemas/animation.schema.json'));
  await copyFile(resolve(repo, 'automation/runner.css'), resolve(temp, 'automation/runner.css'));
  await mkdir(resolve(temp, 'assets')); await mkdir(resolve(temp, 'examples')); await copyFile(resolve(repo, 'assets/styles.css'), resolve(temp, 'assets/styles.css')); await copyFile(resolve(repo, 'examples/demo-data.js'), resolve(temp, 'examples/demo-data.js'));
  let html = await readFile(resolve(repo, editor ? 'index.html' : 'automation/runner.html'), 'utf8');
  html = editor ? html.replace('</body>', '<script src="runner.js"></script></body>') : html.replace('<script src="runner.js">', '<script src="src/base-preview.js"></script><script src="src/image-comparison.js"></script><script src="runner.js">');
  await writeFile(resolve(temp, 'automation/runner.html'), html); await copyFile(resolve(repo, editor ? 'tests/editor-browser.js' : 'tests/preview-browser.js'), resolve(temp, 'automation/runner.js'));
  const { renderInBrowser } = await import(pathToFileURL(resolve(temp, 'automation/browser.mjs')));
  const image = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(repo, 'examples/images/samurai-final.png');
  const mime = /\.jpe?g$/i.test(image) ? 'image/jpeg' : 'image/png';
  const project = { format: 'tinta-y-color', version: 9, resolution: 720, baseMode: 'derived', images: { final: { name: 'Prueba', data: `data:${mime};base64,${(await readFile(image)).toString('base64')}` } }, stages: [{}] };
  const result = await renderInBrowser(project, { operation: 'prepare', timeout: 120000 });
  if (!result.report.passed) throw new Error('No se confirmaron las pruebas');
  console.log(JSON.stringify(result.report));
} finally {
  const path = relative(resolve(repo, 'output'), resolve(temp));
  if (!path.startsWith('test-preview-') || path.includes('/') || path.includes('\\') || path.includes(':')) throw new Error('Carpeta temporal fuera del directorio de pruebas');
  await rm(temp, { recursive: true, force: true });
}
