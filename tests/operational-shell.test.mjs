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
  // The chrome rows are sized in rem so they scale with the type scale. A
  // fluid root under fixed-px rows is a half-implemented idea: the type grows
  // and the row does not, and the clock strip eats its own labels.
  assert.match(css, /--op-header: 3\.5rem/);
  assert.match(css, /--op-clock: 1\.75rem/);
  assert.match(css, /--op-bottom: 2\.75rem/);
  assert.doesNotMatch(css, /--op-header: 56px/);
  assert.match(css, /data-mobile-drawer="intel"/);
  assert.match(css, /pointer-events:auto!important/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.operational-alert.*top:110px!important/);
});
test('the interface has no font size outside the three-token ladder', async () => {
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const root = new URL('../src/', import.meta.url).pathname;
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(jsx?|css)$/.test(entry)) files.push(full);
    }
  };
  walk(root);

  const offenders = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    const text = readFileSync(file, 'utf8');
    text.split('\n').forEach((line, i) => {
      // The root font-size is the scale itself, not a step on it.
      if (/^\s*html\s*\{/.test(line)) return;
      const jsx = line.match(/fontSize:\s*'(\d+(?:\.\d+)?(?:px|rem))'/);
      if (jsx) offenders.push(`${rel}:${i + 1} fontSize: '${jsx[1]}'`);
      const css = line.match(/font-size:\s*(\d+(?:\.\d+)?(?:px|rem))(?![\w-])/);
      if (css) offenders.push(`${rel}:${i + 1} font-size: ${css[1]}`);
    });
  }
  assert.deepEqual(offenders, [], `literal font sizes bypass the ladder:\n${offenders.join('\n')}`);
});

test('the chrome row drops what it says it drops', async () => {
  const app = await read('src/App.jsx');
  // A drop has to WIN. The theater label is styled `display:flex!important`
  // in the compact shell, and a plain inline `display:none` LOSES to an
  // important stylesheet declaration: the label stayed in the row, the row
  // kept measuring it, the fit kept giving up things that were never
  // freed, and the last control sat off the side of the screen at every
  // width from 721 to 840. The drop must be an important inline
  // declaration, which outranks the stylesheet.
  assert.match(app, /setProperty\('display',\s*'none',\s*'important'\)/,
    'the chrome row drops with a plain inline style, which a stylesheet !important can beat');
  assert.doesNotMatch(app, /\.style\.display\s*=\s*'none'/,
    'the chrome row drops with a plain inline style, which a stylesheet !important can beat');
  // The drop order is measured at run time and it is written down: the
  // world-clock index from the tail, the theater's name, the subtitle, the
  // product's own wordmark, and the partner marks with PMUA last.
  const order = app.match(/for \(const kind of \[([^\]]*)\]\)/);
  assert.ok(order, 'the chrome row must declare its drop order');
  assert.match(order[1], /'theater'.*'subtitle'.*'wordmark'.*'brand'/);
  // The wordmark is the next thing to give way — between 341 and 390
  // pixels the phone row was 14 to 48 pixels too wide.
  assert.match(app, /data-chrome-drop="wordmark"/);
});

test('the release gate sweeps the chrome row at every width, not four', async () => {
  const fit = await read('scripts/chrome-fit.mjs');
  // The first gate tested 1440/1024/390/320 and passed while the row
  // overflowed at every width from 721 to 840 and from 341 to 390. The
  // sweep is what closed that hole, so it has to stay in the gate.
  assert.match(await read('scripts/operational-check.mjs'), /sweepChromeFit/);
  assert.match(fit, /setViewportSize/);
  // It must look for the two failures the four-width gate missed: a row
  // that overflows, and a control that is off the side of the screen.
  assert.match(fit, /rowOverflow/);
  assert.match(fit, /offScreen/);
  // And it must catch a drop that did not take — the bug this wave fixed.
  assert.match(fit, /phantomDrops/);
});

test('session export has accessible dialog and safe download lifetime', async () => {
  const source = await read('src/components/ActivityLogModal.jsx');
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-label="Export session log"/);
  assert.match(source, /document.body.appendChild\(a\)/);
  assert.match(source, /setTimeout\(\(\) => URL.revokeObjectURL/);
  assert.match(await read('src/hooks/useDialogFocus.js'), /Tools and advanced options/);
});
