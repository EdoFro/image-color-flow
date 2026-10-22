// Usa el lanzador headless con una copia temporal de la aplicación y el runner.
import { mkdtemp, mkdir, readFile, writeFile, copyFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, relative } from 'node:path';
const repo = fileURLToPath(new URL('../', import.meta.url));
await mkdir(resolve(repo, 'output'), { recursive: true });
const temp = await mkdtemp(resolve(repo, 'output/test-preview-'));
const editor = process.argv.includes('--editor'), highlights = process.argv.includes('--highlights'), i18n = process.argv.includes('--i18n'), projects = process.argv.includes('--projects');
const workflow = process.argv.includes('--workflow');
const withEditor = editor || highlights || i18n || projects || workflow;
try {
  await cp(resolve(repo, 'app'), resolve(temp, 'app'), { recursive: true });
  await mkdir(resolve(temp, 'automation')); await mkdir(resolve(temp, 'schemas'));
  const editorHTML = await readFile(resolve(repo, 'app/index.html'), 'utf8');
  const resources = [...editorHTML.matchAll(/(?:src|href)="((?:src|demo|assets)\/[^"?#]+)"/g)].map(match => match[1]);
  let browser = await readFile(resolve(repo, 'automation/browser.mjs'), 'utf8');
  // Amplía la enumeración sólo en este fixture; la lista de producción sigue intacta.
  browser = browser.replace('const assets = new Map([', 'const assets = new Map([\n' + resources.map(name => `[${JSON.stringify(name)}, new URL(${JSON.stringify('../app/' + name)}, import.meta.url)],`).join('\n'));
  if (highlights || i18n) browser = browser.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");
  await writeFile(resolve(temp, 'automation/browser.mjs'), browser);
  for (const name of ['validation.mjs','runner.css']) await copyFile(resolve(repo, 'automation', name), resolve(temp, 'automation', name));
  await copyFile(resolve(repo, 'schemas/animation.schema.json'), resolve(temp, 'schemas/animation.schema.json'));
  let html = withEditor ? editorHTML : await readFile(resolve(repo, 'automation/runner.html'), 'utf8');
  html = html.replace('<html lang="es">', '<html lang="es" data-language="es" data-startup="example">');
  html = withEditor ? html.replace('</body>', '<script src="runner.js"></script></body>') : html.replace('<script src="runner.js">', '<script src="src/base-preview.js"></script><script src="src/image-comparison.js"></script><script src="runner.js">');
  const runnerSource = await readFile(resolve(repo, workflow ? 'tests/saving-history-browser.js' : projects ? 'tests/projects-browser.js' : i18n ? 'tests/i18n-browser.js' : highlights ? 'tests/highlight-browser.js' : editor ? 'tests/editor-browser.js' : 'tests/preview-browser.js'), 'utf8');
  const { renderInBrowser } = await import(pathToFileURL(resolve(temp, 'automation/browser.mjs')));
  const image = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(repo, 'examples/images/samurai-final.png');
  const mime = /\.jpe?g$/i.test(image) ? 'image/jpeg' : 'image/png';
  const project = { format: 'tinta-y-color', version: 10, resolution: 720, baseMode: 'derived', images: { final: { name: 'Prueba', data: `data:${mime};base64,${(await readFile(image)).toString('base64')}` } }, stages: [{}] };
  for (const language of i18n || projects ? ['es','en','fr','de'] : [null]) {
    await writeFile(resolve(temp, 'automation/runner.html'), language ? html.replace('data-language="es"', `data-language="es" data-i18n-test-language="${language}"`) : html);
    await writeFile(resolve(temp, 'automation/runner.js'), runnerSource);
    const result = await renderInBrowser(project, { operation: 'prepare', timeout: 120000 });
    if (!result.report.passed) throw new Error('No se confirmaron las pruebas');
    const { exportHTML, ...report } = result.report; console.log(JSON.stringify(report));
    if (highlights || i18n) {
      await writeFile(resolve(temp, 'automation/runner.html'), exportHTML.replace('</body>', '<script src="runner.js"></script></body>'));
      await copyFile(resolve(repo, i18n ? 'tests/i18n-presentation.js' : 'tests/highlight-presentation.js'), resolve(temp, 'automation/runner.js'));
      const exported = await renderInBrowser(project, { operation: 'prepare', timeout: 30000 });
      if (!exported.report.passed) throw new Error('Falló el HTML exportado'); console.log(JSON.stringify(exported.report));
    }
  }
} finally {
  const path = relative(resolve(repo, 'output'), resolve(temp));
  if (!path.startsWith('test-preview-') || path.includes('/') || path.includes('\\') || path.includes(':')) throw new Error('Carpeta temporal fuera del directorio de pruebas');
  await rm(temp, { recursive: true, force: true });
}
