import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read = file => fs.readFile(new URL('../' + file, import.meta.url), 'utf8');
test('release enforces Non-Slop and keeps the map-first shell', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.match(pkg.scripts.prebuild, /design:check/);
  assert.match(pkg.scripts['design:check'], /fail-on=P1/);
  assert.match(await read('src/App.jsx'), /data-shell="compact"/);
  const css = await read('src/styles/operational-shell.css');
  assert.match(css, /--op-header: 56px/);
  assert.match(css, /data-mobile-drawer="intel"/);
  assert.match(css, /pointer-events:auto!important/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
test('session export has accessible dialog and safe download lifetime', async () => {
  const source = await read('src/components/ActivityLogModal.jsx');
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-label="Export session log"/);
  assert.match(source, /document.body.appendChild\(a\)/);
  assert.match(source, /setTimeout\(\(\) => URL.revokeObjectURL/);
  assert.match(await read('src/hooks/useDialogFocus.js'), /Tools and advanced options/);
});
