import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { buildPackages } from '../scripts/empaquetar.mjs';
import { archiveName, zip, crc32 } from '../scripts/lib/zip.mjs';
const repo = fileURLToPath(new URL('../', import.meta.url));
await mkdir(resolve(repo, 'output'), { recursive: true });
const temp = await mkdtemp(resolve(repo, 'output/test-packages-'));
function unpack(bytes) {
  const end = bytes.length - 22; assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  const count = bytes.readUInt16LE(end + 10), files = new Map(); let at = bytes.readUInt32LE(end + 16);
  assert.equal(at + bytes.readUInt32LE(end + 12), end);
  for (let i = 0; i < count; i++) {
    assert.equal(bytes.readUInt32LE(at), 0x02014b50); assert.equal(bytes.readUInt16LE(at + 10), 8);
    const size = bytes.readUInt32LE(at + 20), rawSize = bytes.readUInt32LE(at + 24), length = bytes.readUInt16LE(at + 28), local = bytes.readUInt32LE(at + 42);
    const name = bytes.subarray(at + 46, at + 46 + length).toString('utf8'); archiveName(name);
    assert.equal(bytes.readUInt32LE(local), 0x04034b50); assert.equal(bytes.readUInt16LE(local + 8), 8);
    assert.equal(bytes.subarray(local + 30, local + 30 + bytes.readUInt16LE(local + 26)).toString('utf8'), name);
    const offset = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28), data = inflateRawSync(bytes.subarray(offset, offset + size));
    assert.equal(data.length, rawSize); assert.equal(crc32(data), bytes.readUInt32LE(at + 16)); assert.ok(!files.has(name)); files.set(name, data);
    at += 46 + length + bytes.readUInt16LE(at + 30) + bytes.readUInt16LE(at + 32);
  }
  assert.equal(at, end); return files;
}
try {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  for (const name of ['../escape','/absolute','C:/drive','a\\b','a/../b','a//b','a\nname']) assert.throws(() => archiveName(name));
  assert.throws(() => zip([{ name: 'same', data: '' }, { name: 'same', data: '' }]));
  const first = await buildPackages({ outDir: resolve(temp, 'one') }), second = await buildPackages({ outDir: resolve(temp, 'two') });
  assert.equal(first.length, 2); assert.deepEqual(first.map(p => p.sha256), second.map(p => p.sha256), 'Archives are not reproducible');
  const maps = {};
  for (const result of first) {
    const archive = unpack(await readFile(result.path)), prefix = result.filename.slice(0, -4) + '/';
    const files = new Map([...archive].map(([name, data]) => { assert.ok(name.startsWith(prefix)); return [name.slice(prefix.length), data]; })); maps[result.kind] = files;
    assert.equal(files.size, result.files); assert.ok(files.has('app/index.html') && files.has('app/demo/demo-data.js') && files.has('app/LICENSE') && files.has('app/NOTICE.md'));
    for (const name of files.keys()) assert.ok(!/(^|\/)(tests|scripts|exampleVideos|output|dist|node_modules|\.git)(\/|$)/.test(name), name);
    const html = files.get('app/index.html').toString();
    for (const [, path] of html.matchAll(/(?:src|href)="((?:src|assets|demo)\/[^"?#]+)"/g)) assert.ok(files.has('app/' + path), path);
    for (const [name, data] of files) if (name.endsWith('.md')) for (const [, path] of data.toString().matchAll(/\]\(([^)]+)\)/g)) {
      if (/^[a-z]+:/i.test(path)) continue;
      const location = relative(temp, resolve(temp, name, '..', decodeURIComponent(path.split('#')[0]))).replaceAll('\\', '/');
      assert.ok(files.has(location), name + ': ' + path);
    }
    const destination = resolve(temp, result.kind);
    for (const [name, data] of files) { const path = resolve(destination, name); assert.ok(path.startsWith(destination + (process.platform === 'win32' ? '\\' : '/'))); await mkdir(resolve(path, '..'), { recursive: true }); await writeFile(path, data); }
  }
  assert.ok([...maps.editor.keys()].every(name => name.startsWith('app/')));
  for (const [name, data] of maps.editor) assert.ok(data.equals(maps.complete.get(name)), name + ': app differs between packages');
  const complete = resolve(temp, 'complete'), pkg = JSON.parse(maps.complete.get('package.json'));
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ['colorflow', 'mcp']);
  const { version, createAutomation } = await import(pathToFileURL(resolve(complete, 'automation/api.mjs'))); assert.equal(version, pkg.version);
  const api = await createAutomation({ root: complete }); assert.ok(api.schema.$defs);
  const { createHandler } = await import(pathToFileURL(resolve(complete, 'automation/mcp.mjs'))), handler = createHandler(api);
  await handler.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' }); await handler.handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const guide = await handler.handle({ jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri: 'colorflow://guide' } }); assert.ok(guide.result.contents[0].text.includes('colorflow_create'));
  const cli = spawnSync(process.execPath, [resolve(complete, 'automation/cli.mjs'), '--help'], { cwd: complete, encoding: 'utf8', windowsHide: true }); assert.equal(cli.status, 0, cli.stderr); assert.ok(cli.stdout.includes('render'));
  console.log(`Two reproducible ZIPs verified: ${maps.editor.size} editor files, ${maps.complete.size} complete files; resources, notices, docs, API, CLI and MCP guide work after isolated extraction.`);
} finally {
  const path = relative(resolve(repo, 'output'), temp); if (!/^test-packages-[^/\\:]+$/.test(path)) throw new Error('Unsafe test folder'); await rm(temp, { recursive: true, force: true });
}
