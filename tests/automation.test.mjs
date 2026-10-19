import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rm, symlink, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { request } from 'node:http';
import { createContext, runInContext, Script } from 'node:vm';
import { createAutomation } from '../automation/api.mjs';
import { assertPlan, check, planSchema } from '../automation/validation.mjs';
import { main as cli } from '../automation/cli.mjs';
import { createHandler, serveMcp } from '../automation/mcp.mjs';
import { startRenderJob, renderInBrowser } from '../automation/browser.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
await mkdir(resolve(repo, 'output'), { recursive: true });
const temp = await mkdtemp(resolve(repo, 'output/test-automation-'));
const workspace = resolve(temp, 'workspace'); await mkdir(workspace);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64');
await writeFile(resolve(workspace, 'imagen.png'), png);
const outcomes = [];
async function test(name, fn) { try { await fn(); outcomes.push({ name, pass: true }); } catch (error) { outcomes.push({ name, pass: false, error: error.stack }); } }
const plan = { stages: [{ name: 'Primera', points: [{ x: .3, y: .5 }] }, { name: 'Enfoque', points: [], hold: 1 }] };
const fakeRenderer = async (project, options) => ({ html: '<!doctype html><title>Prueba</title>', project, images: { [options.operation==='prepare'?'base.png':'plan.png']: `data:image/png;base64,${png.toString('base64')}` }, report: { duration: 2, calculationChecked: options.operation!=='prepare', warnings: [] } });
const api = await createAutomation({ root: workspace, renderer: fakeRenderer });
const callHttp = (url, { method = 'GET', headers = {}, body } = {}) => new Promise((resolveRequest, reject) => {
  const req = request(url, { method, headers }, res => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolveRequest({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') })); }); req.on('error', reject); req.end(body);
});
try {
  await test('Contrato rechaza coordenadas, tipos, campos desconocidos y rectángulos fuera de la imagen', () => {
    for (const invalid of [{ stages: [{ points: [{ x: 3, y: .5 }] }] }, { stages: [{ enabled: 'sí' }] }, { speed: .2 }, { initialView: { frame: { x: .8, y: 0, width: .5, height: .5 } } }]) assert.throws(() => assertPlan(invalid), e => e.code === 'INVALID_PLAN' && e.details[0].path.startsWith('$'));
    assert.equal(check(plan).length, 0);
  });
  await test('Create incorpora la imagen exacta y devuelve un plan sin base64', async () => {
    const result = await api.create({ image: 'imagen.png', plan, output: 'animacion.colorflow.json' });
    assert.equal(result.plan.baseMode, 'derived'); assert.equal(result.images.final.bytes, png.length); assert.equal(result.images.final.data, undefined);
    const saved = JSON.parse(await readFile(resolve(workspace, result.path), 'utf8')); assert.equal(saved.images.final.data.split(',')[1], png.toString('base64')); assert.equal(saved.version, 7);
  });
  await test('Crear con inicial conserva uploaded y los valores omitidos reciben valores del motor', async () => {
    const result = await api.create({ image: 'imagen.png', initialImage: 'imagen.png', output: 'dos.json' }); assert.equal(result.plan.baseMode, 'uploaded'); assert.equal(result.plan.stages[0].paintDelay, 0);
  });
  await test('La generación de base se valida por campo y rechaza umbrales invertidos', () => {
    assertPlan({baseGeneration:{method:'ink',colorToGray:0,sensitivity:.8,blackPoint:.1,whitePoint:.9,paper:'matched'}});
    for (const baseGeneration of [{colorToGray:2},{method:'inventado'},{blackPoint:.8,whitePoint:.5},{whitePoint:.1}]) assert.throws(()=>assertPlan({baseGeneration}),e=>e.details[0].path.startsWith('$.baseGeneration'));
  });
  await test('Create no sobrescribe archivos existentes y uploaded exige inicial', async () => {
    await assert.rejects(api.create({ image: 'imagen.png', output: 'dos.json' }), e => e.code === 'EEXIST');
    await assert.rejects(api.create({ image: 'imagen.png', plan: { baseMode: 'uploaded' }, output: 'invalido.json' }), e => e.code === 'INITIAL_IMAGE_REQUIRED');
  });
  await test('Update de una etapa conserva emisores y las otras etapas', async () => {
    const result = await api.update({ project: 'animacion.colorflow.json', stageIndex: 0, patch: { paintDelay: 1.2, name: 'Modificada' } });
    assert.equal(result.plan.stages[0].paintDelay, 1.2); assert.equal(result.plan.stages[0].points[0].x, .3); assert.equal(result.plan.stages[1].name, 'Enfoque');
    await assert.rejects(api.update({ project: 'animacion.colorflow.json', stageIndex: 9, patch: {} }), e => e.code === 'INVALID_STAGE');
  });
  await test('Update inválido no modifica el proyecto', async () => {
    const before = await readFile(resolve(workspace, 'animacion.colorflow.json'), 'utf8');
    await assert.rejects(api.update({ project: 'animacion.colorflow.json', patch: { stages: [{ speed: 99 }] } }));
    assert.equal(await readFile(resolve(workspace, 'animacion.colorflow.json'), 'utf8'), before);
  });
  await test('Un proyecto anterior mantiene sus datos y recibe desfase cero', async () => {
    const raw = JSON.parse(await readFile(resolve(workspace, 'dos.json'), 'utf8')); raw.version = 5; delete raw.stages[0].paintDelay;
    await writeFile(resolve(workspace, 'anterior.json'), JSON.stringify(raw)); const result = await api.inspect({project:'anterior.json'});
    assert.equal(result.formatVersion,7); assert.equal(result.plan.stages[0].paintDelay,0); assert.equal(result.plan.stages[0].points[0].x,.5);
  });
  await test('Validación detecta errores antes de que la normalización pueda ocultarlos', async () => {
    const raw = JSON.parse(await readFile(resolve(workspace, 'animacion.colorflow.json'), 'utf8')); raw.stages[0].points[0].x = 9;
    await writeFile(resolve(workspace, 'mal.json'), JSON.stringify(raw)); const result = await api.validate({ project: 'mal.json' });
    assert.equal(result.valid, false); assert.equal(result.errors[0].path, '$.stages[0].points[0].x');
    await assert.rejects(api.render({ project: 'mal.json', outputDir: 'rechazado' }), e => e.code === 'INVALID_PROJECT');
  });
  await test('La API limita lecturas y escrituras a la raíz configurada', async () => {
    await assert.rejects(api.inspect({ project: '../secreto.json' }), e => e.code === 'OUTSIDE_WORKSPACE');
    await assert.rejects(api.create({ image: 'imagen.png', output: '../escape.json' }), e => e.code === 'OUTSIDE_WORKSPACE');
  });
  await test('Los enlaces de directorio no permiten atravesar la raíz', async () => {
    const outside = resolve(temp, 'outside'); await mkdir(outside); await writeFile(resolve(outside, 'otro.json'), '{}');
    await symlink(outside, resolve(workspace, 'enlace'), 'junction');
    await assert.rejects(api.inspect({ project: 'enlace/otro.json' }), e => e.code === 'OUTSIDE_WORKSPACE');
    await assert.rejects(api.create({ image: 'imagen.png', output: 'enlace/nuevo.json' }), e => e.code === 'OUTSIDE_WORKSPACE');
  });
  await test('Render guarda los artefactos y protege un directorio de salida existente', async () => {
    const result = await api.render({ project: 'animacion.colorflow.json', outputDir: 'resultado' });
    assert.ok(result.artifacts['presentacion.html']); assert.deepEqual(await readFile(resolve(workspace, result.artifacts['plan.png'])), png);
    assert.equal(JSON.parse(await readFile(resolve(workspace, result.artifacts['proyecto.colorflow.json']), 'utf8')).stages[0].name, 'Modificada');
    await assert.rejects(api.render({ project: 'animacion.colorflow.json', outputDir: 'resultado' }), e => e.code === 'OUTPUT_EXISTS');
  });
  await test('ReadImage entrega contenido visual exacto', async () => { const result = await api.readImage({ path: 'resultado/plan.png' }); assert.equal(result.mimeType, 'image/png'); assert.equal(result.data, png.toString('base64')); });
  await test('Prepare entrega la base sin generar HTML ni calcular la animación', async () => {
    const result = await api.prepare({project:'animacion.colorflow.json',outputDir:'preparacion'});
    assert.ok(result.artifacts['base.png']); assert.equal(result.artifacts['presentacion.html'],undefined); assert.equal(result.report.calculationChecked,false);
    const saved=JSON.parse(await readFile(resolve(workspace,result.artifacts['proyecto.colorflow.json']),'utf8')); assert.equal(saved.baseGeneration.method,'ink');
    await api.update({project:'animacion.colorflow.json',patch:{baseGeneration:{method:'ink',colorToGray:.4,blackPoint:.1,whitePoint:.9}}});
    assert.equal((await api.inspect({project:'animacion.colorflow.json'})).plan.baseGeneration.colorToGray,.4);
  });
  await test('CLI devuelve JSON, errores separados y código 1 para validación fallida', async () => {
    let out = '', err = ''; const streams = { stdout: { write: s => { out += s; } }, stderr: { write: s => { err += s; } } };
    assert.equal(await cli(['inspect','--root',workspace,'--project','animacion.colorflow.json'], streams), 0); assert.equal(JSON.parse(out).plan.stages[0].name, 'Modificada'); assert.equal(err, '');
    out = ''; assert.equal(await cli(['validate','--root',workspace,'--project','mal.json'], streams), 1); assert.equal(JSON.parse(out).valid, false);
    out = ''; assert.equal(await cli(['create','--desconocido'], streams), 1); assert.equal(out, ''); assert.equal(JSON.parse(err).error.code, 'INVALID_ARGUMENT');
  });
  await test('CLI prepare transmite los ajustes de ejecución y devuelve los artefactos de la base', async () => {
    let received, result='';
    const code=await cli(['prepare','--project','a.json','--out','salida','--auto-align','--timeout','30000'],{stdout:{write:s=>{result+=s;}},stderr:{write:s=>{throw new Error(s);}},createApi:async()=>({prepare:async args=>{received=args;return {artifacts:{'base.png':'salida/base.png'}};}})});
    assert.equal(code,0); assert.equal(received.autoAlign,true); assert.equal(received.timeout,30000); assert.equal(received.project,'a.json'); assert.equal(JSON.parse(result).artifacts['base.png'],'salida/base.png');
  });
  await test('MCP exige inicialización y expone herramientas y contratos', async () => {
    const session = createHandler(api);
    assert.equal((await session.handle({ jsonrpc:'2.0',id:1,method:'tools/list' })).error.code, -32002);
    const init = await session.handle({ jsonrpc:'2.0',id:2,method:'initialize',params:{ protocolVersion:'2025-11-25' } }); assert.equal(init.result.protocolVersion, '2025-11-25');
    assert.equal(await session.handle({ jsonrpc:'2.0',method:'notifications/initialized' }), undefined);
    assert.equal((await session.handle({ jsonrpc:'2.0',id:3,method:'tools/list' })).result.tools.length, 7);
    const resource = await session.handle({ jsonrpc:'2.0',id:4,method:'resources/read',params:{ uri:'colorflow://schema/plan' } }); assert.equal(JSON.parse(resource.result.contents[0].text).title, planSchema.title);
    const invalid = await session.handle({ jsonrpc:'2.0',id:5,method:'tools/call',params:{name:'colorflow_create',arguments:{image:'imagen.png',output:'mcp.json',plan:{stages:[{speed:9}]}}} }); assert.equal(invalid.result.isError,true); assert.ok(invalid.result.structuredContent.error.details.length);
    const inspect = await session.handle({ jsonrpc:'2.0',id:6,method:'tools/call',params:{name:'colorflow_inspect',arguments:{project:'animacion.colorflow.json'}} }); assert.equal(inspect.result.structuredContent.plan.stages[0].name, 'Modificada');
    const created = await session.handle({jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'colorflow_create',arguments:{image:'imagen.png',output:'mcp.json',plan:{stages:[{points:[{x:.4,y:.5}],frame:{x:.1,y:.1,width:.5,height:.5}}]}}}}); assert.equal(created.result.isError,undefined);
    const updated = await session.handle({jsonrpc:'2.0',id:8,method:'tools/call',params:{name:'colorflow_update',arguments:{project:'mcp.json',stageIndex:0,patch:{paintDelay:2}}}}); assert.equal(updated.result.structuredContent.plan.stages[0].paintDelay,2);
    const guide = await session.handle({jsonrpc:'2.0',id:9,method:'resources/read',params:{uri:'colorflow://guide'}}); assert.ok(guide.result.contents[0].text.includes('storyboard.png'));
    const prepared=await session.handle({jsonrpc:'2.0',id:10,method:'tools/call',params:{name:'colorflow_prepare',arguments:{project:'mcp.json',outputDir:'mcp-base'}}}); assert.equal(prepared.result.isError,undefined); assert.ok(prepared.result.structuredContent.artifacts['base.png']);
  });
  await test('MCP permite cancelar un render en curso', async () => {
    const session = createHandler({ render: ({signal}) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Cancelado')))) });
    await session.handle({jsonrpc:'2.0',id:1,method:'initialize'}); await session.handle({jsonrpc:'2.0',method:'notifications/initialized'});
    const rendering = session.handle({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'colorflow_render',arguments:{project:'x.json',outputDir:'salida'}}});
    await session.handle({jsonrpc:'2.0',method:'notifications/cancelled',params:{requestId:2}}); assert.equal((await rendering).result.isError, true);
  });
  await test('Transporte stdio admite mensajes fragmentados, Unicode y responde sólo JSON-RPC', async () => {
    const input = new PassThrough(), output = new PassThrough(); let text = ''; output.on('data', c => { text += c; });
    const serving = serveMcp(api, { input, output });
    input.write('{"jsonrpc":"2.0","id":1,"method":"init'); input.write('ialize"}\n');
    input.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    input.write('{"jsonrpc":"2.0","id":"á","method":"tools/list"}\n'); input.write('JSON inválido\n'); input.end(); await serving;
    const messages = text.trim().split('\n').map(line => JSON.parse(line)); assert.equal(messages.length,3); assert.ok(messages.every(m => m.jsonrpc === '2.0')); assert.ok(messages.some(m => m.id === 'á' && m.result.tools.length === 7)); assert.ok(messages.some(m => m.error?.code === -32700));
  });
  await test('Renderizador local limita origen, recursos y registra errores de cálculo', async () => {
    const job = await startRenderJob({}, { timeout: 1000 });
    try {
      assert.equal((await callHttp(job.url)).status,200);
      assert.equal((await callHttp(new URL('job.json',job.url),{headers:{Origin:'https://example.com'}})).status,403);
      assert.equal((await callHttp(new URL('src/app.js',job.url))).status,404);
      await callHttp(new URL('result',job.url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Emisor fuera de la zona'})});
      await assert.rejects(job.result, e => e.code === 'RENDER_FAILED');
    } finally { await job.close(); }
  });
  await test('El constructor compartido produce JavaScript válido y escapa texto HTML', async () => {
    const context = createContext({}); for (const name of ['engine','base-generation','project','view','player','codec','presentation']) runInContext(await readFile(new URL(`../src/${name}.js`,import.meta.url),'utf8'),context);
    const html = context.PaintPresentation.build({width:2,height:2,base:'data:image/png;base64,AA',final:'data:image/png;base64,AA',fields:[],name:'</script><script>alert(1)</script>'});
    assert.equal((html.match(/<script>/g)||[]).length,1); new Script(html.match(/<script>([\s\S]*)<\/script>/)[1]); assert.ok(html.includes('finishRestart')); assert.ok(!/<script[^>]+src=/.test(html));
  });
  await test('El trabajo de navegador responde a cancelación y tiempo máximo', async () => {
    const controller = new AbortController(), job = await startRenderJob({}, {signal:controller.signal});
    try { controller.abort(); await assert.rejects(job.result,e=>e.code==='CANCELLED'); } finally { await job.close(); }
    const timed = await startRenderJob({}, {timeout:1000});
    try { await assert.rejects(timed.result,e=>e.code==='RENDER_TIMEOUT'); } finally { await timed.close(); }
  });
  await test('Lanzador usa perfil propio, recibe resultado y cierra proceso, servidor y perfil', async () => {
    let profile, url, killed = false;
    const result = await renderInBrowser({}, {browser:resolve(workspace,'imagen.png'),launch:(_exe,args,options)=>{
      assert.equal(options.windowsHide,true); assert.equal(options.stdio,'ignore'); assert.ok(args.includes('--headless=new'));
      profile = args.find(v=>v.startsWith('--user-data-dir=')).slice('--user-data-dir='.length); url=args.at(-1);
      const child = new EventEmitter(); child.pid=1; child.exitCode=null; child.kill=()=>{killed=true;child.exitCode=0;child.emit('exit',0);};
      setTimeout(()=>{callHttp(new URL('result',url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html:'OK',images:{},report:{},project:{}})}).catch(()=>{});},0);
      return child;
    }});
    assert.equal(result.html,'OK'); assert.equal(killed,true); await assert.rejects(stat(profile),e=>e.code==='ENOENT'); await assert.rejects(callHttp(url));
  });
  await test('Un fallo al iniciar el proceso también limpia el perfil y el servidor', async () => {
    let profile, url;
    await assert.rejects(renderInBrowser({}, {browser:resolve(workspace,'imagen.png'),launch:(_exe,args)=>{
      profile=args.find(v=>v.startsWith('--user-data-dir=')).slice('--user-data-dir='.length); url=args.at(-1);
      const child=new EventEmitter(); setTimeout(()=>child.emit('error',new Error('Fallo de arranque')),0); return child;
    }}),/Fallo de arranque/);
    await assert.rejects(stat(profile),e=>e.code==='ENOENT'); await assert.rejects(callHttp(url));
  });
} finally {
  // Sólo se elimina el directorio de prueba recién creado, dentro de output/.
  const path = relative(resolve(repo,'output'),temp); if (path.startsWith('test-automation-') && !path.includes('..')) await rm(temp,{recursive:true,force:true});
}
for (const result of outcomes) if (!result.pass) console.error(`✗ ${result.name}\n${result.error}`);
console.log(`${outcomes.filter(t=>t.pass).length} / ${outcomes.length} pruebas de automatización correctas.`);
if (outcomes.some(t=>!t.pass)) throw new Error('Fallaron pruebas de automatización.');
