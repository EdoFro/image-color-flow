# API local, CLI y MCP

[English](AUTOMATION.md) | **Español**

[Volver al paquete](README.es.md)

Utiliza Node.js 22 o posterior. Preparar imágenes/renderizar requiere además Chrome, Edge o Chromium instalado localmente. No hacen falta paquetes npm externos. El editor y los HTML generados funcionan sin Node.js. Las operaciones son locales.

## CLI

Crea una carpeta `work` y coloca allí tu imagen coloreada como `image.png`. Desde la raíz del paquete:

```sh
node automation/cli.mjs create --root work --image image.png --out project.colorflow.json
node automation/cli.mjs validate --root work --project project.colorflow.json
node automation/cli.mjs prepare --root work --project project.colorflow.json --out base-review
node automation/cli.mjs render --root work --project project.colorflow.json --out presentation
```

Revisa `work/base-review/base.png` y `referencia.png` antes de renderizar. La carpeta de presentación contiene `presentacion.html`, `proyecto.colorflow.json`, `informe.json`, `plan.png`, `storyboard.png` y vistas individuales. Abre el HTML directamente; importa el JSON editable en el editor para ajustarlo.

Usa `--initial base.png` en create para aportar tu imagen inicial. Coloca un plan JSON dentro de `work` y añade `--plan plan.json` para personalizar las etapas. Campos y límites: [esquema del plan](schemas/animation.schema.json). Ejecuta `node automation/cli.mjs --help` para inspect/update/schema y más opciones. `--browser` admite la ruta del ejecutable; `--force` permite sobrescribir expresamente.

## API

Ejecuta este código como archivo `.mjs` en la raíz del paquete, después de crear `work` y colocar `image.png` dentro:

```js
import { createAutomation } from './automation/api.mjs';
const api = await createAutomation({ root: './work' });
await api.create({ image: 'image.png', output: 'project.colorflow.json', plan: {
  resolution: 720,
  stages: [{ name: 'Color', points: [{ x: 0.5, y: 0.5 }], maxRadius: 1.5 }]
} });
await api.render({ project: 'project.colorflow.json', outputDir: 'presentation' });
```

## MCP

Utiliza un cliente que pueda iniciar un servidor local por stdio. Sustituye ambas rutas por rutas absolutas de tu equipo; `work` debe existir:

```json
{
  "mcpServers": {
    "tinta-y-color": {
      "command": "node",
      "args": ["C:/ruta/image-color-flow/automation/mcp.mjs", "--root", "C:/ruta/work"]
    }
  }
}
```

El servidor ofrece siete herramientas y los recursos `colorflow://guide` y `colorflow://schema/plan`. El asistente necesita visión para interpretar las imágenes; las herramientas revelan los colores existentes. Consulta la [guía para asistentes](docs/para-ia.md). Conserva las carpetas de ejecución juntas para que estén disponibles la guía y el motor compartido.
