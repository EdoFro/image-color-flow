# Local API, CLI and MCP

**English** | [Español](AUTOMATION.es.md)

[Back to the package](README.md)

Use Node.js 22 or later. Image preparation/rendering additionally needs Chrome, Edge or Chromium installed locally. No external npm packages are required. The editor and generated HTML work without Node.js. All operations run locally.

## CLI

Create a `work` folder and put your colored image there as `image.png`. From the package root:

```sh
node automation/cli.mjs create --root work --image image.png --out project.colorflow.json
node automation/cli.mjs validate --root work --project project.colorflow.json
node automation/cli.mjs prepare --root work --project project.colorflow.json --out base-review
node automation/cli.mjs render --root work --project project.colorflow.json --out presentation
```

Inspect `work/base-review/base.png` and `referencia.png` before rendering. The presentation folder contains `presentacion.html`, `proyecto.colorflow.json`, `informe.json`, `plan.png`, `storyboard.png` and individual previews. Open the HTML directly; import the editable JSON in the editor to adjust it.

Use `--initial base.png` with create to supply your own initial image. Put a plan JSON inside `work` and pass `--plan plan.json` for custom stages. Fields and limits: [plan schema](schemas/animation.schema.json). Run `node automation/cli.mjs --help` for inspect/update/schema and additional options. `--browser` accepts the browser's executable path; `--force` explicitly permits overwriting.

## API

Run this as an `.mjs` file in the package root, after creating `work` and placing `image.png` inside:

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

Use a client that can launch a local stdio server. Replace both paths with absolute paths on your computer; `work` must exist:

```json
{
  "mcpServers": {
    "tinta-y-color": {
      "command": "node",
      "args": ["C:/path/image-color-flow/automation/mcp.mjs", "--root", "C:/path/work"]
    }
  }
}
```

The server provides eight tools and the `colorflow://guide` and `colorflow://schema/plan` resources. The assistant needs vision to interpret images; the tools reveal existing colors. See the [assistant workflow](docs/en/for-ai.md). Keep the runtime folders together so the guide and shared engine remain available.

See [drafts and embedding](docs/en/embedding.md) to open a preloaded editor and export animations controlled by another presentation.
