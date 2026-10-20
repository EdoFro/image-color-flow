# Distribution: editor and complete package

**English** | [Español](../distribucion.md)

[Back to the project](../../README.md)

Two ZIPs are prepared per version. Downloads are attached to a version in [GitHub Releases](https://github.com/EdoFro/image-color-flow/releases); building ZIPs locally neither publishes a release nor uploads them to GitHub.

## Portable editor

File: `image-color-flow-editor-vX.Y.Z.zip`.

Extract the ZIP and open `app/index.html` inside the extracted folder. It includes scripts, styles, four languages, embedded introductory example, English/Spanish instructions, license and example-image notices. Keep the complete `app/` folder when moving it; it works without installation, server or internet access.

Preferences are stored in the browser. Export/import them from Preferences to transfer them when changing browsers or locations. Editable projects and presentations are downloaded separately.

## Complete package

File: `image-color-flow-complete-vX.Y.Z.zip`.

Includes exactly the same `app/` folder as the editor package, plus:

- `automation/`: local API, CLI, MCP and renderer.
- `schemas/animation.schema.json`: plan contract.
- `docs/para-ia.md` and `docs/en/for-ai.md`: guides used by MCP.
- Runtime `package.json`, license and bilingual `README` and `AUTOMATION` instructions.

For the editor, open `app/index.html`. Automation uses Node.js 22 or later; preparation/rendering additionally needs local Chrome, Edge or Chromium. There are no external npm packages to install. Keep the complete package's folders together and run commands from its root. Included guides use your own images in a workspace folder.

Both packages contain runtime files and instructions. Videos, tests, extra example sources, development screenshots and packaging tools remain in the repository.

## Build both ZIPs

From the repository root, with Node.js:

```sh
npm run package
```

Alternatively run `node scripts/empaquetar.mjs`. Both generate these files under `dist/`:

```text
image-color-flow-editor-vX.Y.Z.zip
image-color-flow-complete-vX.Y.Z.zip
SHA256SUMS.txt
```

Version comes from `package.json`. Each ZIP has a single top-level folder with its name/version. Allowlisted paths, compression and fixed timestamps make the same files produce identical ZIPs with the same Node.js version. Symbolic links are rejected and the `app/` license must match the main license. Git ignores `dist/`.

`node tests/distribution.test.mjs` checks both ZIPs, editor resources, identical `app/` files, included documentation, exact file reconstruction, API/CLI and the MCP guide after extraction. Editor browser tests use the commands in [architecture](architecture.md).

## Publish a version

1. Check the version and run tests.
2. Build both ZIPs.
3. Create the matching GitHub release and attach both ZIPs and `SHA256SUMS.txt` from `dist/`.

Downloads are provided through Releases. The repository retains source/development files; its root `index.html` redirects to `app/index.html` to preserve the previous entry point.
