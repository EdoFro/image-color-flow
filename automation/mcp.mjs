#!/usr/bin/env node
// MCP stdio: stdout contiene exclusivamente mensajes JSON-RPC delimitados por LF.
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createAutomation, planSchema, version } from './api.mjs';
import { check, errorData, AutomationError } from './validation.mjs';

const string = { type: 'string', minLength: 1 }, boolean = { type: 'boolean' };
const object = (properties, required = []) => ({ type: 'object', additionalProperties: false, properties, required, ...((properties.plan || properties.patch) ? { $defs: planSchema.$defs } : {}) });
const { $defs: _definitions, $schema: _dialect, ...planInput } = planSchema;
export const tools = [
  { name: 'colorflow_review', description: 'Genera un HTML de edición autocontenido con el borrador cargado y solicita abrirlo en el navegador (open true por defecto). No calcula propagación ni exporta presentación. El usuario continúa editando y guarda .colorflow.json. Puede proponer name y saveAs (ruta dentro de la raíz, extensión .colorflow.json); el editor muestra la ubicación recomendada y el usuario autoriza el guardado. Conserva el borrador original. Si abrir no es posible, devuelve editorUrl y el archivo para apertura manual. No es sincronización en vivo.', inputSchema: object({ project: string, output: string, name: { type: 'string', maxLength: 120 }, saveAs: string, open: boolean, overwrite: boolean }, ['project','output']) },
  { name: 'colorflow_create', description: 'Crea un proyecto editable desde una imagen coloreada local y un plan. La inicial es opcional: sin ella se genera tinta sobre papel según baseGeneration. Destacados separados: highlightEnabled true, highlightLinked false, highlightFrames con lista de rectángulos; su exterior común usa outside. frame sigue siendo el enfoque. Coordenadas normalizadas 0–1; velocidades/radios relativos al ancho; segundos. No interpreta descripciones ni identifica objetos por sí mismo.', inputSchema: object({ image: string, initialImage: string, plan: planInput, output: string, overwrite: boolean }, ['image','output']) },
  { name: 'colorflow_inspect', description: 'Lee nombres de imágenes y el plan completo, sin devolver sus grandes bloques base64. Úsalo antes de modificar un proyecto existente.', inputSchema: object({ project: string }, ['project']), annotations: { readOnlyHint: true } },
  { name: 'colorflow_update', description: 'Modifica un proyecto. Sin stageIndex aplica un parche de nivel superior; stages reemplaza toda la lista. Con stageIndex (desde cero) aplica el parche a esa etapa. Objetos y listas del parche reemplazan el campo completo. Si no se indica output actualiza el mismo proyecto.', inputSchema: object({ project: string, patch: { anyOf: [planInput, { $ref: '#/$defs/stage' }] }, stageIndex: { type: 'integer', minimum: 0, maximum: 63 }, output: string, overwrite: boolean }, ['project','patch']) },
  { name: 'colorflow_validate', description: 'Valida estructura, rangos y geometría, con errores por campo. Todavía no decodifica imágenes ni calcula propagación: render hace esas comprobaciones y devuelve duración real.', inputSchema: object({ project: string }, ['project']), annotations: { readOnlyHint: true } },
  { name: 'colorflow_prepare', description: 'Prepara la imagen inicial sin calcular animación. Entrega base.png completa (sin enfoque ni destacado), referencia.png, comparacion.png, proyecto e informe. Ajusta baseGeneration con colorflow_update y revisa base.png con colorflow_read_image antes de renderizar. method protected usa L por defecto; coherent conserva K; ink conserva el filtro anterior; grayscale conserva la desaturación. baseGeneration.inkMatch permite none, source-to-base (recuperar color original en base) darken (M, mínimo RGB), multiply (N, producto RGB) o base-to-final (copia literal antigua). Revisa referencia.png junto a base.png. Revisa letras, rayas, textura y pigmentos oscuros. Necesita Chrome/Edge/Chromium local.', inputSchema: object({ project: string, outputDir: string, overwrite: boolean, autoAlign: boolean, timeout: { type: 'integer', minimum: 1000, maximum: 600000 } }, ['project','outputDir']) },
  { name: 'colorflow_render', description: 'Calcula y exporta mediante el mismo motor del editor. Produce HTML offline, proyecto editable, informe de tiempos, plan.png con geometría y storyboard.png con Inicio, mitad de cada etapa y final. Necesita Chrome/Edge/Chromium local; no usa internet. Revisa luego plan.png y storyboard.png con colorflow_read_image.', inputSchema: object({ project: string, outputDir: string, overwrite: boolean, autoAlign: boolean, timeout: { type: 'integer', minimum: 1000, maximum: 600000 } }, ['project','outputDir']) },
  { name: 'colorflow_read_image', description: 'Devuelve una imagen local como contenido visual para inspeccionar la fuente, plan.png, storyboard.png u otro fotograma. No reconoce objetos; esa interpretación corresponde al modelo con visión. Máximo 10 MB.', inputSchema: object({ path: string }, ['path']), annotations: { readOnlyHint: true } }
];

export function createHandler(api) {
  let initialized = false, ready = false;
  const active = new Map();
  return {
    cancelAll() { for (const controller of active.values()) controller.abort(); },
    async handle(message) {
      const id = message?.id;
      const rpcError = (code, text) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message: text } });
      if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || (id !== undefined && typeof id !== 'string' && typeof id !== 'number')) return rpcError(-32600, 'Solicitud JSON-RPC no válida.');
      const reply = result => id === undefined ? undefined : { jsonrpc: '2.0', id, result };
      if (message.method === 'notifications/cancelled') { active.get(message.params?.requestId)?.abort(); return; }
      if (message.method === 'notifications/initialized') { ready = initialized; return; }
      if (id === undefined) return;
      if (message.method === 'ping') return reply({});
      if (message.method === 'initialize') {
        if (initialized) return rpcError(-32600, 'La sesión ya fue inicializada.');
        initialized = true;
        const supported = ['2025-11-25','2025-06-18','2025-03-26'];
        return reply({ protocolVersion: supported.includes(message.params?.protocolVersion) ? message.params.protocolVersion : supported[0], capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'tinta-y-color', version }, instructions: 'Lee colorflow://guide. Analiza la imagen y acuerda la idea. Para un borrador crea pocas etapas y usa colorflow_review para abrirlo en el editor; no calcules una entrega final prematura. Para entregar una animación terminada renderiza y revisa plan.png y storyboard.png. Para integrar usa presentation.mode integrated y el controlador incluido. Todas las rutas están limitadas a la raíz configurada.' });
      }
      if (!ready) return rpcError(-32002, 'Inicializa la sesión antes de utilizar herramientas.');
      if (message.method === 'tools/list') return reply({ tools });
      if (message.method === 'resources/list') return reply({ resources: [
        { uri: 'colorflow://schema/plan', name: 'Contrato de animación', mimeType: 'application/schema+json' },
        { uri: 'colorflow://guide', name: 'Guía para asistentes', mimeType: 'text/markdown' }
      ] });
      if (message.method === 'resources/read') {
        const uri = message.params?.uri;
        if (uri === 'colorflow://schema/plan') return reply({ contents: [{ uri, mimeType: 'application/schema+json', text: JSON.stringify(planSchema) }] });
        if (uri === 'colorflow://guide') return reply({ contents: [{ uri, mimeType: 'text/markdown', text: await readFile(new URL('../docs/para-ia.md', import.meta.url), 'utf8') }] });
        return rpcError(-32002, 'Recurso desconocido.');
      }
      if (message.method !== 'tools/call') return rpcError(-32601, 'Método no disponible.');
      const tool = tools.find(t => t.name === message.params?.name);
      if (!tool) return rpcError(-32602, 'Herramienta desconocida.');
      const args = message.params.arguments || {};
      const controller = new AbortController(); active.set(id, controller);
      try {
        const errors = check(args, tool.inputSchema, '$', tool.inputSchema);
        if (errors.length) throw new AutomationError('INVALID_ARGUMENTS', 'Revisa los argumentos de la herramienta.', errors);
        if (tool.name === 'colorflow_read_image') {
          const image = await api.readImage(args); return reply({ content: [{ type: 'image', ...image }] });
        }
        const method = tool.name.slice('colorflow_'.length);
        const result = await api[method]({ ...args, signal: controller.signal });
        return reply({ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, ...(result.valid === false ? { isError: true } : {}) });
      } catch (error) {
        const result = { error: errorData(error) };
        return reply({ isError: true, content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result });
      } finally { active.delete(id); }
    }
  };
}

export async function serveMcp(api, { input = process.stdin, output = process.stdout } = {}) {
  const session = createHandler(api), pending = new Set();
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let message;
    try { if (line.length > 8 * 1024 * 1024) throw new Error('Mensaje demasiado grande.'); message = JSON.parse(line); }
    catch { output.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido o mensaje superior a 8 MB.' } }) + '\n'); continue; }
    const task = session.handle(message).then(reply => { if (reply) output.write(JSON.stringify(reply) + '\n'); }).catch(error => { output.write(JSON.stringify({ jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32603, message: error.message } }) + '\n'); });
    pending.add(task); task.finally(() => pending.delete(task));
  }
  session.cancelAll(); await Promise.all(pending);
}

export async function main(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--root','--browser'].includes(args[i]) || !args[i + 1] || flags[args[i]]) throw new Error('Uso: node automation/mcp.mjs --root carpeta [--browser ejecutable]');
    flags[args[i]] = args[i + 1];
  }
  const api = await createAutomation({ root: flags['--root'], browser: flags['--browser'] });
  await serveMcp(api);
}
if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(process.argv.slice(2)); } catch (error) { process.stderr.write(JSON.stringify({ error: errorData(error) }) + '\n'); process.exitCode = 1; }
}
