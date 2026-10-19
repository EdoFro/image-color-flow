import { createServer } from 'node:http';
import { readFile, access, mkdtemp, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { AutomationError } from './validation.mjs';

const assets = new Map([
  ['runner.html', new URL('./runner.html', import.meta.url)],
  ['runner.js', new URL('./runner.js', import.meta.url)],
  ['runner.css', new URL('./runner.css', import.meta.url)],
  ...['engine', 'base-generation', 'project', 'preparation', 'view', 'player', 'codec', 'presentation', 'automation'].map(name => [`src/${name}.js`, new URL(`../src/${name}.js`, import.meta.url)])
]);

// Transporte efímero para el renderizador: sólo loopback, ruta aleatoria y recursos enumerados.
export async function startRenderJob(project, { autoAlign = false, operation = 'render', timeout = 120000, signal } = {}) {
  if (!['render', 'prepare'].includes(operation)) throw new AutomationError('INVALID_OPERATION', 'Operación de navegador desconocida.');
  if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 600000) throw new AutomationError('INVALID_TIMEOUT', 'timeout debe estar entre 1000 y 600000 ms.');
  const token = randomBytes(24).toString('hex');
  let resolveResult, rejectResult, finished = false, origin;
  const result = new Promise((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  result.catch(() => {}); // Evita rechazo no observado mientras se inicia el navegador.
  const fail = error => { if (!finished) { finished = true; rejectResult(error); } };
  const server = createServer(async (req, res) => {
    const reply = (status, body, type = 'text/plain; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'self'; worker-src blob:; frame-ancestors 'none'" }); res.end(body); };
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) return reply(403, 'Origen no permitido.');
    const prefix = `/${token}/`;
    if (!req.url.startsWith(prefix)) return reply(404, 'No encontrado.');
    const name = req.url.slice(prefix.length);
    try {
      if (req.method === 'GET' && name === 'job.json') return reply(200, JSON.stringify({ project, options: { autoAlign, operation } }), 'application/json');
      if (req.method === 'POST' && name === 'result') {
        if (finished) return reply(409, 'Trabajo terminado.');
        if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, 'Se esperaba JSON.');
        let size = 0; const chunks = [];
        for await (const chunk of req) { size += chunk.length; if (size > 256 * 1024 * 1024) throw new Error('El resultado supera 256 MB.'); chunks.push(chunk); }
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (data.error) { fail(new AutomationError('RENDER_FAILED', String(data.error))); return reply(200, 'Error recibido.'); }
        if ((operation === 'render' && typeof data.html !== 'string') || !data.images || !data.report || !data.project) throw new Error('Resultado de renderizado incompleto.');
        finished = true; resolveResult(data); return reply(200, 'Resultado recibido.');
      }
      if (req.method === 'GET' && assets.has(name)) return reply(200, await readFile(assets.get(name)), name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
      return reply(404, 'No encontrado.');
    } catch (error) { fail(error); reply(400, error.message); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  const timer = setTimeout(() => fail(new AutomationError('RENDER_TIMEOUT', 'El navegador no terminó dentro del tiempo permitido.')), timeout);
  const abort = () => fail(new AutomationError('CANCELLED', 'Renderizado cancelado.'));
  signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
  return {
    url: `${origin}/${token}/runner.html`, result,
    async close() { clearTimeout(timer); signal?.removeEventListener('abort', abort); fail(new AutomationError('CANCELLED', 'Trabajo cerrado.')); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  };
}

export async function findBrowser(explicit) {
  if (explicit) { await access(explicit); return explicit; }
  const candidates = process.platform === 'win32' ? [
    join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env.PROGRAMFILES || 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
  ] : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium'] : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/opt/google/chrome/chrome', '/usr/bin/microsoft-edge'];
  for (const candidate of candidates) { try { await access(candidate); return candidate; } catch {} }
  throw new AutomationError('BROWSER_NOT_FOUND', 'Instala Chrome/Edge/Chromium o indica su ejecutable con --browser.');
}

export async function renderInBrowser(project, options = {}) {
  const executable = await findBrowser(options.browser);
  const profilesRoot = resolve(tmpdir()), profile = await mkdtemp(join(profilesRoot, 'colorflow-browser-'));
  let job, child;
  try {
    job = await startRenderJob(project, options);
    const launch = options.launch || spawn;
    child = launch(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--user-data-dir=${profile}`, job.url], { windowsHide: true, stdio: 'ignore' });
    const failure = new Promise((_, reject) => { child.once('error', reject); child.once('exit', code => reject(new AutomationError('BROWSER_EXITED', `El navegador terminó antes de entregar el resultado (${code}).`))); });
    return await Promise.race([job.result, failure]);
  } finally {
    if (child && child.exitCode === null && child.pid) {
      await new Promise(resolveExit => {
        const timer = setTimeout(() => { child.kill('SIGKILL'); resolveExit(); }, 2000);
        child.once('exit', () => { clearTimeout(timer); resolveExit(); }); child.kill();
      });
    }
    await job?.close();
    if (dirname(profile) !== profilesRoot || !basename(profile).startsWith('colorflow-browser-')) throw new Error('Ruta de perfil temporal inesperada.');
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
