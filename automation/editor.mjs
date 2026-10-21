import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { findBrowser } from './browser.mjs';

// Inline the installed editor, not a second implementation. No runtime file fetches.
export async function buildEditor(project) {
  let html = await readFile(new URL('../app/index.html', import.meta.url), 'utf8');
  const json = JSON.stringify(project).replace(/</g, '\\u003c');
  const css = await readFile(new URL('../app/assets/styles.css', import.meta.url), 'utf8');
  html = html.replace('<link rel="stylesheet" href="assets/styles.css">', () => '<style>' + css + '</style>');
  html = html.replace('</head>', () => `<script type="application/json" id="tinta-color-project">${json}</script></head>`);
  for (const [tag, source] of [...html.matchAll(/<script src="((?:src|demo)\/[a-z0-9/.-]+\.js)"><\/script>/g)]) {
    if (source.includes('..')) throw new Error('Invalid editor asset.');
    const code = await readFile(new URL('../app/' + source, import.meta.url), 'utf8');
    html = html.replace(tag, () => '<script>' + code.replace(/<\/script/gi, '<\\/script') + '</script>');
  }
  return html;
}

export async function openEditor(url, browser) {
  const executable = await findBrowser(browser);
  await new Promise((resolve, reject) => {
    const child = spawn(executable, ['--new-window', url], { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(); });
  });
}
