#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { createAutomation } from './api.mjs';
import { AutomationError, errorData } from './validation.mjs';

const help = `Tinta y color · Automatización local (Node.js 22+)

node automation/cli.mjs create --image imagen.png --plan plan.json --out trabajo.colorflow.json
node automation/cli.mjs review --project trabajo.colorflow.json --out editar.html [--open]
node automation/cli.mjs inspect --project trabajo.colorflow.json
node automation/cli.mjs validate --project trabajo.colorflow.json
node automation/cli.mjs update --project trabajo.colorflow.json --plan cambios.json [--stage 0] [--out copia.colorflow.json]
node automation/cli.mjs prepare --project trabajo.colorflow.json --out output/base [--auto-align]
node automation/cli.mjs render --project trabajo.colorflow.json --out output/presentacion [--auto-align]
node automation/cli.mjs schema

Opciones: --root carpeta, --browser ejecutable, --initial imagen.jpg (create),
--force (sobrescribir), --timeout milisegundos (prepare/render, 120000 por defecto).
Las rutas se resuelven dentro de --root (por defecto la carpeta actual).
create/update/inspect/validate/schema no necesitan navegador. prepare/render utilizan Chrome/Edge/Chromium.
Salida JSON; errores JSON por stderr y código de salida 1. No se envían imágenes a servicios externos.
`;

export async function main(argv, { stdout = process.stdout, stderr = process.stderr, createApi = createAutomation } = {}) {
  try {
    const [command, ...args] = argv;
    if (!command || ['help', '--help', '-h'].includes(command)) { stdout.write(help); return 0; }
    if (!['create', 'inspect', 'validate', 'update', 'prepare', 'render', 'review', 'schema'].includes(command)) throw new AutomationError('INVALID_COMMAND', 'Comando desconocido. Usa --help.');
    const flags = {}, booleans = new Set(['force', 'auto-align', 'open']);
    const allowed = new Set(['root','browser','image','initial','plan','out','stage','project','force','auto-align','timeout','open']);
    for (let i = 0; i < args.length; i++) {
      const key = args[i].slice(2);
      if (!args[i].startsWith('--') || !allowed.has(key) || Object.hasOwn(flags, key)) throw new AutomationError('INVALID_ARGUMENT', `Opción no válida: ${args[i]}`);
      if (booleans.has(key)) flags[key] = true;
      else { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new AutomationError('INVALID_ARGUMENT', `Falta el valor de --${key}.`); flags[key] = args[++i]; }
    }
    const api = await createApi({ root: flags.root, browser: flags.browser });
    let result;
    const common = { project: flags.project };
    if (command === 'schema') result = api.schema;
    if (command === 'create') result = await api.create({ image: flags.image, initialImage: flags.initial, plan: flags.plan ? await api.readJson(flags.plan) : {}, output: flags.out, overwrite: !!flags.force });
    if (command === 'review') result = await api.review({ ...common, output: flags.out, open: !!flags.open, overwrite: !!flags.force });
    if (command === 'inspect') result = await api.inspect(common);
    if (command === 'validate') result = await api.validate(common);
    if (command === 'update') result = await api.update({ ...common, patch: await api.readJson(flags.plan), stageIndex: flags.stage === undefined ? undefined : Number(flags.stage), output: flags.out || flags.project, overwrite: flags.force || !flags.out || flags.out === flags.project });
    if (command === 'render' || command === 'prepare') result = await api[command]({ ...common, outputDir: flags.out, overwrite: !!flags.force, autoAlign: !!flags['auto-align'], timeout: flags.timeout === undefined ? undefined : Number(flags.timeout) });
    stdout.write(JSON.stringify(result, null, 2) + '\n');
    return command === 'validate' && !result.valid ? 1 : 0;
  } catch (error) { stderr.write(JSON.stringify({ error: errorData(error) }) + '\n'); return 1; }
}

if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main(process.argv.slice(2));
