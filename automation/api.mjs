import { readFile, writeFile, mkdir, realpath, stat, rename, link, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildEditor, openEditor } from './editor.mjs';
import { resolve, relative, dirname, basename, extname, isAbsolute } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { randomBytes } from 'node:crypto';
import { assertPlan, planSchema, AutomationError } from './validation.mjs';
import { renderInBrowser } from './browser.mjs';

const context = createContext({});
for (const name of ['engine', 'ink-lines', 'base-generation', 'project', 'integration']) runInContext(await readFile(new URL(`../app/src/${name}.js`, import.meta.url), 'utf8'), context);
const normalize = input => JSON.parse(JSON.stringify(context.PaintProject.normalize(input)));
const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp', '.avif': 'image/avif' };
export const version = '0.17.0';
export { planSchema };

export async function createAutomation({ root = process.cwd(), browser, renderer = renderInBrowser } = {}) {
  const workspace = await realpath(resolve(root));
  if (!(await stat(workspace)).isDirectory()) throw new AutomationError('INVALID_ROOT', 'La raíz debe ser una carpeta.');
  function inside(path) {
    const rel = relative(workspace, path);
    if (rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || isAbsolute(rel)) throw new AutomationError('OUTSIDE_WORKSPACE', 'La ruta debe quedar dentro de la carpeta de trabajo.');
    return path;
  }
  async function filePath(path, output = false) {
    if (typeof path !== 'string' || !path.trim()) throw new AutomationError('INVALID_PATH', 'Indica una ruta de archivo.');
    const target = inside(resolve(workspace, path));
    try { return inside(await realpath(target)); } catch (e) {
      if (e.code !== 'ENOENT' || !output) throw e;
      // Verificar ancestros antes de crear directorios evita atravesar enlaces fuera de la raíz.
      let ancestor = dirname(target), suffix = [];
      for (;;) {
        try { inside(await realpath(ancestor)); break; } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          suffix.unshift(basename(ancestor)); ancestor = dirname(ancestor);
        }
      }
      const parent = resolve(await realpath(ancestor), ...suffix); inside(parent);
      await mkdir(parent, { recursive: true });
      return resolve(inside(await realpath(parent)), basename(target));
    }
  }
  async function save(path, data, overwrite = false) {
    const target = await filePath(path, true), temp = `${target}.${randomBytes(8).toString('hex')}.tmp`;
    try {
      await writeFile(temp, data, { flag: 'wx' });
      if (overwrite) await rename(temp, target);
      else { await link(temp, target); await unlink(temp); }
    } finally { await unlink(temp).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
    return relative(workspace, target).replaceAll('\\', '/');
  }
  async function json(path) {
    const target = await filePath(path);
    if ((await stat(target)).size > 150000000) throw new AutomationError('FILE_TOO_LARGE', 'El JSON supera 150 MB.');
    try { return JSON.parse(await readFile(target, 'utf8')); } catch (error) { throw new AutomationError('INVALID_JSON', `No se pudo leer el JSON: ${error.message}`); }
  }
  async function image(path) {
    const target = await filePath(path), mime = mimeTypes[extname(target).toLowerCase()];
    if (!mime) throw new AutomationError('INVALID_IMAGE', 'Utiliza PNG, JPEG, WebP, GIF, BMP o AVIF.');
    if ((await stat(target)).size > 40000000) throw new AutomationError('FILE_TOO_LARGE', 'La imagen supera 40 MB.');
    const data = await readFile(target);
    return { name: basename(target), data: `data:${mime};base64,${data.toString('base64')}` };
  }
  function planOf(project) {
    const { images, format, version: formatVersion, ...plan } = project; return plan;
  }
  function summary(project, path) {
    return { path, formatVersion: project.version, images: Object.fromEntries(Object.entries(project.images).map(([key, value]) => [key, { name: value.name, bytes: Buffer.from(value.data.split(',')[1], 'base64').length }])), plan: planOf(project) };
  }
  async function load(path) {
    try { return normalize(await json(path)); } catch (error) { if (error instanceof AutomationError) throw error; throw new AutomationError('INVALID_PROJECT', error.message); }
  }
  async function generate({ project, outputDir, overwrite = false, autoAlign = false, timeout = 120000, signal }, operation) {
    const validation = await api.validate({ project });
    if (!validation.valid) throw new AutomationError('INVALID_PROJECT', 'El proyecto tiene valores fuera del contrato.', validation.errors);
    const target = await filePath(outputDir, true);
    try { const info = await stat(target); if (!info.isDirectory() || !overwrite) throw new AutomationError('OUTPUT_EXISTS', 'El destino ya existe. Usa otro directorio o overwrite: true.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const result = await renderer(await load(project), { browser, operation, autoAlign, timeout, signal });
    const artifacts = {};
    const put = async (name, content) => { artifacts[name] = await save(resolve(target, name), content, overwrite); };
    if (operation === 'render') {
      await put('presentacion.html', result.html);
      if (result.project.presentation?.mode === 'integrated') {
        for (const [name, content] of Object.entries(context.PaintIntegration.files('presentacion.html'))) await put(name, content);
      }
    }
    await put('proyecto.colorflow.json', JSON.stringify(normalize(result.project)));
    const warnings = operation === 'prepare' ? validation.warnings.filter(w => ['DERIVED_BASE','INK_BASE_APPROXIMATION'].includes(w.code)) : validation.warnings;
    result.report.warnings = [...warnings, ...(result.report.warnings || [])];
    await put('informe.json', JSON.stringify(result.report, null, 2) + '\n');
    for (const [name, data] of Object.entries(result.images)) {
      if (!/^(base|referencia|comparacion|inicio|final|plan|storyboard|etapa-\d{2})\.png$/.test(name) || !/^data:image\/png;base64,/.test(data)) throw new AutomationError('INVALID_RENDER_RESULT', 'Vista previa no válida.');
      await put(name, Buffer.from(data.split(',')[1], 'base64'));
    }
    return { artifacts, report: result.report };
  }
  const api = {
    root: workspace, schema: planSchema,
    readJson: json,
    async create({ image: finalPath, initialImage, plan = {}, output, overwrite = false }) {
      assertPlan(plan);
      const images = { final: await image(finalPath) }; if (initialImage) images.initial = await image(initialImage);
      if (plan.baseMode === 'uploaded' && !initialImage) throw new AutomationError('INITIAL_IMAGE_REQUIRED', 'baseMode uploaded necesita una imagen inicial.');
      const project = normalize({ format: 'tinta-y-color', version: 10, ...plan, baseMode: plan.baseMode || (initialImage ? 'uploaded' : 'derived'), images, stages: plan.stages || [{ maxRadius: .4 }] });
      const path = await save(output, JSON.stringify(project), overwrite);
      return summary(project, path);
    },
    async review({ project, output, open = true, overwrite = false }) {
      const value = await load(project), html = await buildEditor(value);
      const path = await save(output, html, overwrite), url = pathToFileURL(await filePath(path)).href;
      let opened = false, openError;
      if (open) try { await openEditor(url, browser); opened = true; } catch (error) { openError = error.message; }
      return { path, editorUrl: url, opened, ...(openError ? { openError } : {}), note: 'Editor con borrador cargado. Guarda tus cambios como .colorflow.json; este HTML conserva el borrador inicial al recargar.' };
    },
    async inspect({ project }) { return summary(await load(project), project); },
    async update({ project: path, patch, stageIndex, output = path, overwrite = output === path }) {
      assertPlan(patch, stageIndex !== undefined);
      // Un parche antiguo del rectángulo único debe actualizar también la lista canónica.
      if (stageIndex !== undefined && Object.hasOwn(patch, 'highlightFrame') && !Object.hasOwn(patch, 'highlightFrames')) patch = { ...patch, highlightFrames: patch.highlightFrame ? [patch.highlightFrame] : [] };
      const project = await load(path);
      if (stageIndex !== undefined) {
        if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= project.stages.length) throw new AutomationError('INVALID_STAGE', 'stageIndex debe ser un índice existente, comenzando en cero.');
        project.stages[stageIndex] = { ...project.stages[stageIndex], ...patch };
      } else Object.assign(project, patch);
      if (project.baseMode === 'uploaded' && !project.images.initial) throw new AutomationError('INITIAL_IMAGE_REQUIRED', 'No hay imagen inicial para uploaded.');
      const next = normalize(project); const saved = await save(output, JSON.stringify(next), overwrite);
      return summary(next, saved);
    },
    async validate({ project }) {
      // Revisar antes de normalizar: las recetas automáticas nunca silencian coordenadas erróneas.
      const raw = await json(project), normalized = normalize(raw), errors = [];
      try { assertPlan(planOf(raw)); } catch (e) { errors.push(...(e.details || [{ path: '$', message: e.message }])); }
      const warnings = [];
      if (normalized.stages.every(s => !s.enabled)) warnings.push({ code: 'NO_ENABLED_STAGES', message: 'Todas las etapas están deshabilitadas.' });
      if (normalized.baseMode === 'derived') warnings.push(normalized.baseGeneration.method === 'grayscale' ? { code: 'DERIVED_BASE', message: 'La desaturación conserva sombras; no reconstruye la tinta original.' } : { code: 'INK_BASE_APPROXIMATION', message: 'La detección de pigmentos es aproximada. Revisa base.png antes de presentar.' });
      normalized.stages.forEach((s, index) => {
        if (s.enabled && s.zone && s.points.some(p => p.enabled && !context.PaintEngine.inPolygon(p.x, p.y, s.zone))) warnings.push({ code: 'OUTSIDE_ZONE', stageIndex: index, message: 'Hay puntos activos fuera de la zona.' });
      });
      return { valid: !errors.length, errors, warnings, imageDecodingChecked: false, calculationChecked: false, formatVersion: normalized.version };
    },
    async prepare(options) { return generate(options, 'prepare'); },
    async render(options) { return generate(options, 'render'); },
    async readImage({ path }) {
      const item = await image(path), [prefix, data] = item.data.split(',');
      if (Buffer.from(data, 'base64').length > 10000000) throw new AutomationError('FILE_TOO_LARGE', 'Para inspección visual usa una vista previa de menos de 10 MB.');
      return { mimeType: prefix.slice(5).split(';')[0], data };
    }
  };
  return api;
}
