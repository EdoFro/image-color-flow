# Tinta y color

**English** | [Español](README.es.md)

A local editor for animating the gradual reveal of color in ink drawings, watercolors and other artwork. Start with an initial image and a colored version, direct the spread of color, and export a web presentation that works offline.

## Watch an animation

https://github.com/user-attachments/assets/471e49d0-e96d-4b8b-8240-7e7ae76120ce

[Watch more animation examples](exampleVideos/README.md)

The videos were recorded in small windows to keep file sizes down. Their resolution and detail do not show the full quality of the generated presentations.

![Editor showing starting points and propagation radii; interface currently in Spanish](docs/images/vista-editor.png)

## Get started

The interface supports **English and Spanish**. Use the language selector in the header or Images dialog; your choice is remembered locally. On first use, a supported browser language is selected, falling back to Spanish. Switching languages preserves the project and playback. French and German will follow in a separate change. See [language support](docs/en/languages.md).

1. Download or copy the complete project, keeping its folder structure.
2. Open [index.html](index.html) in Chrome or Edge. No installation, server or connection is needed.
3. Try the included example or load your images through **Imágenes** (Images).
4. Define stages, regions, points and brush paths; adjust propagation and play the animation.
5. Use **Guardar proyecto** (Save project) to continue editing later, and **Exportar HTML** (Export HTML) to present it.

The editor prepares and aligns images. It can also generate an initial ink-on-paper image from the colored version using **Tinta y líneas (L)** (Ink and lines), with robust background estimation, fine-stroke protection, line recovery and protection of connected dark areas. Controls remove pigments, adjust grays and let you compare the result before applying it. Original images remain embedded and unchanged.

Points support ordering, activation, delays and individual radii. Stages can paint or change only the camera and highlighting, with gradual transitions, an initial painting delay and an additional hold. **General** reviews and unifies parameters across the presentation. Disable individual stages or use Ctrl + click to edit a group.

Image preparation offers **Darken (M)** and **Multiply (N)**, synchronized zoom and pan, a navigation thumbnail and progressive recalculation that prioritizes the visible detail. A status light and text indicate when the visible area or the whole image is up to date. Older projects retain their generation method.

Separate highlighting supports multiple rectangles in a stage or the initial view (**Inicio**). Ctrl + drag adds a rectangle; the list and handles let you edit it. The chosen outside treatment applies outside their union. Camera framing remains independent, and exported HTML preserves all rectangles.

Export with a hatched, solid or transparent background, without a border or shadow around the artwork. Presentation controls start hidden; show them using the logo or H. Clicking the artwork starts or advances playback; Space pauses or resumes it. A high-contrast restart button appears at the end.

## Use with an AI assistant

Optional automation provides a local API, CLI commands and an MCP server with seven tools. A vision-capable assistant can create projects from images and JSON plans, prepare and inspect the initial image without calculating propagation, and export HTML. Preparation and rendering require Node.js 22 or later and Chrome/Edge/Chromium; there are no external package dependencies. The editor still opens directly without installation.

See the [automation and MCP setup guide](docs/en/automation.md), [plan schema](schemas/animation.schema.json) and [assistant guide](docs/en/for-ai.md).

## Documentation and examples

- [User guide](docs/en/user-guide.md): tools, timing, radii, camera, highlighting and presentation.
- [Architecture and development](docs/en/architecture.md): modules, algorithm and optional commands.
- [Project format](docs/en/project-format.md): saved data and compatibility.
- [Verification](docs/en/verification.md): checks performed and their limits.
- [Maintaining bilingual documentation](docs/en/documentation.md).
- [Changelog](CHANGELOG.md).
- [Editable example project](examples/ejemplo.colorflow.json): open it with **Abrir proyecto** (Open project).
- [Example presentation](examples/presentacion-ejemplo.html): one HTML file with images and the player embedded.

## Layout

```text
index.html       Editor entry point
src/             JavaScript source
assets/          Editor styles
automation/      Local API, CLI, MCP server and renderer
schemas/         Automation plan contract
examples/        Images, embedded data, project and presentation
exampleVideos/   Video recordings and bilingual gallery
tests/           Browser and automation tests
docs/            Spanish guides, references, screenshots and coloring prompt
docs/en/         English guides and references
scripts/         Optional development utilities
```

No external libraries or build steps are needed. Open [tests/index.html](tests/index.html) to run browser tests. With Node.js 22 or later, run the cases that do not need a DOM:

```sh
node scripts/ejecutar-pruebas.mjs
```

## License and example resources

Code and documentation are distributed under the [MIT License](LICENSE). Example images and the images shown in recordings are excluded. The project owner does not hold their rights; inclusion as examples does not grant permission to reuse them. See [license and resources](docs/en/license-and-resources.md) for provenance and scope.
