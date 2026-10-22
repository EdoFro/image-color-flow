import { readFile, readdir, lstat, mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { zip, archiveName } from './lib/zip.mjs';
const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const sha256 = data => createHash('sha256').update(data).digest('hex');
export async function packageFiles(root = sourceRoot) {
  root = resolve(root); const files = new Map();
  async function add(source, name = source) {
    archiveName(name); const path = resolve(root, source), rel = relative(root, path);
    if (rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Source outside repository.');
    // Reject links in every component so allowlisted sources cannot escape the root.
    let current = root; for (const part of rel.split(/[\\/]/)) { current = resolve(current, part); if ((await lstat(current)).isSymbolicLink()) throw new Error('Linked package source: ' + source); }
    if (!(await lstat(path)).isFile()) throw new Error('Not a file: ' + source);
    files.set(name, await readFile(path));
  }
  const app = ['app/index.html','app/assets/styles.css','app/demo/demo-data.js','app/README.md','app/README.es.md','app/LICENSE','app/NOTICE.md'];
  for (const folder of ['app/src','app/src/locales']) for (const name of (await readdir(resolve(root, folder))).sort()) if (/^[a-z0-9-]+\.js$/.test(name)) app.push(folder + '/' + name);
  for (const name of app) await add(name);
  if (!files.get('app/LICENSE').equals(await readFile(resolve(root, 'LICENSE')))) throw new Error('Synchronize app/LICENSE with LICENSE.');
  const editor = new Map(files);
  for (const name of ['editor.mjs','api.mjs','browser.mjs','cli.mjs','mcp.mjs','runner.js','runner.html','runner.css','validation.mjs']) await add('automation/' + name);
  for (const name of ['schemas/animation.schema.json','docs/para-ia.md','docs/en/for-ai.md','docs/integracion.md','docs/en/embedding.md','LICENSE']) await add(name);
  for (const name of ['README.md','README.es.md','AUTOMATION.md','AUTOMATION.es.md']) await add('packaging/complete/' + name, name);
  const original = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(original.version)) throw new Error('Invalid package version.');
  const editorVersion = files.get('app/index.html').toString('utf8').match(/class="app-version">v([^<]+)</)?.[1];
  if (editorVersion !== original.version) throw new Error('Synchronize the editor header version with package.json.');
  const runtime = Object.fromEntries(['name','version','private','license','description','engines'].map(key => [key, original[key]]));
  runtime.scripts = { colorflow: 'node automation/cli.mjs', mcp: 'node automation/mcp.mjs' };
  files.set('package.json', Buffer.from(JSON.stringify(runtime, null, 2) + '\n'));
  return { version: original.version, editor, complete: files };
}
export async function buildPackages({ root = sourceRoot, outDir = resolve(root, 'dist') } = {}) {
  const inputs = await packageFiles(root), results = []; await mkdir(outDir, { recursive: true });
  for (const kind of ['editor', 'complete']) {
    const name = `image-color-flow-${kind}-v${inputs.version}`, files = inputs[kind];
    const entries = [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, data]) => ({ name: name + '/' + path, data }));
    const bytes = zip(entries), filename = name + '.zip', path = resolve(outDir, filename), temporary = path + '.' + randomUUID() + '.tmp';
    await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, path);
    results.push({ kind, filename, path, bytes: bytes.length, files: files.size, sha256: sha256(bytes) });
  }
  await writeFile(resolve(outDir, 'SHA256SUMS.txt'), results.map(r => `${r.sha256}  ${r.filename}\n`).join(''));
  return results;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { for (const result of await buildPackages()) console.log(`${result.filename} · ${result.bytes} bytes · ${result.files} files · SHA256 ${result.sha256}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
