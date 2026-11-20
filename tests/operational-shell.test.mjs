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

test('the release gate sweeps the PLATE at every width, not four', async () => {
  const fit = await read('scripts/plate-fit.mjs');
  // The gate looked at 1440/1024/390/320 and passed while the plate held
  // back a reading at thirty-nine widths in between: the room was measured
  // against a box rounded to whole pixels, and the ceiling was 620px for a
  // font that scales with the viewport. The sweep is what closes that
  // hole, so it has to stay in the gate.
  assert.match(await read('scripts/operational-check.mjs'), /sweepPlateFit/);
  assert.match(fit, /setViewportSize/);
  // A reading cut in half, and a disclosure that does not tell the truth.
  assert.match(fit, /cut/);
  assert.match(fit, /moreCount/);
  // And the promise it keeps: the plate may not hold back a reading IT
  // HAD ROOM FOR — measured, not assumed from the viewport width.
  assert.match(fit, /hadRoom/);
  assert.match(fit, /need/);
  assert.match(fit, /box/);
});

test('session export has accessible dialog and safe download lifetime', async () => {
  const source = await read('src/components/ActivityLogModal.jsx');
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-label="Export session log"/);
  assert.match(source, /document.body.appendChild\(a\)/);
  assert.match(source, /setTimeout\(\(\) => URL.revokeObjectURL/);
  assert.match(await read('src/hooks/useDialogFocus.js'), /Tools and advanced options/);
});

/* ─────────────────────────────────────────────────────────────────────────
   THE CHROME ROW MUST BE A FUNCTION OF THE WIDTH, NOT OF THE ROAD
   ─────────────────────────────────────────────────────────────────────────
   The row is fitted at run time, on every resize. It gave things up and
   never took them back, so a row squeezed at 700 stayed squeezed at
   1200: the same width showed a different row depending on how the
   reader came to it. It was then given a way to take things back, and
   that way made the row depend on the road even harder.

   The release gate could not see it. The chrome sweep resizes ONE page
   from narrow to wide, so it walks the widths in one direction only — it
   never arrives at a width by more than one road, so it can never see a
   row that depends on the road.

   The rule is a function taking the row's state on each road and
   returning the roads that disagree. It is tested here against a
   subject that carries the defect; if the rule goes blind, this test
   fails. */

test('the chrome row is a function of the width, not of the road', async () => {
  const { historyDifferences } = await import('../scripts/lib/history.mjs');

  // A row that is the same row on every road: nothing to report.
  const same = new Map([[1200, 'wordmark=shown theater=shown clocks=4/8']]);
  assert.deepEqual(historyDifferences({ up: same, down: same, fresh: same }), []);

  // A row that changed between the road up and the road down. This is
  // the defect: the same 1200 pixels, two different rows.
  const up = new Map([[1200, 'wordmark=hidden theater=shown clocks=4/8']]);
  const down = new Map([[1200, 'wordmark=shown theater=shown clocks=2/8']]);
  const problems = historyDifferences({ up, down, fresh: down });
  assert.ok(problems.length, 'a row that differs between roads must be reported');
  assert.match(problems[0], /1200px/);
  assert.match(problems[0], /depends on the road/);

  // A row that is fresh-load different from resized — the other road.
  const fresh = new Map([[1440, 'wordmark=shown clocks=2/8']]);
  const swept = new Map([[1440, 'wordmark=hidden clocks=5/8']]);
  const other = historyDifferences({ up: swept, down: swept, fresh });
  assert.ok(other.length, 'a row that differs when loaded fresh must be reported');
  assert.match(other[0], /1440px/);

  // A width that only one road knows about is not a disagreement: the
  // gate did not look there, and it must not invent a difference.
  const half = new Map([[1200, 'a']]);
  assert.deepEqual(historyDifferences({ up: half, down: new Map(), fresh: new Map() }), []);
});

test('the chrome row is put whole again, every time', async () => {
  const app = await read('src/App.jsx');
  // The row starts whole and gives things up again in order, so its state
  // is a function of the width and not of the widths visited before it.
  assert.match(app, /querySelectorAll\('\[data-chrome-drop\]'\)\.forEach\(undrop\)/,
    'the chrome row is not put whole again before it gives things up, so its state depends on the road');
  // There must be exactly ONE order of sacrifice. A second list is the
  // road: a restore order is a function of what was given up before.
  const orders = app.match(/for \(const kind of \[([^\]]*)\]\)/g) || [];
  assert.equal(orders.length, 1,
    `the chrome row declares ${orders.length} orders of sacrifice — a second one is a restore path, and a restore path makes the row depend on the road`);
});

test('the release gate walks the row up AND down, and compares the roads', async () => {
  const gate = await read('scripts/operational-check.mjs');
  // The CALL, not the name: a comment that names the sweep would
  // satisfy a source-scan for the name and the gate would stay blind.
  assert.match(gate, /sweepChromeHistory\(browser,\s*url\)/,
    'the release gate does not run the road sweep');
  const sweep = await read('scripts/chrome-history.mjs');
  // It must actually walk both ways and compare, and it must decide
  // with the same rule the tests take a defective subject to.
  assert.match(sweep, /up\.set/);
  assert.match(sweep, /down\.set/);
  assert.match(sweep, /historyDifferences\(\{\s*up,\s*down,\s*fresh\s*\}\)/);
  assert.match(sweep, /reverse\(\)/);
  // And it must wait for the row to STOP MOVING before it measures it.
  // A row measured mid-settle is a row the reader never sees, and
  // comparing it with a row measured at another moment of the settle
  // is a difference in the timing, not in the row.
  assert.match(sweep, /settleRow/);
  // EVERY width gets all three roads. The pre-fix build was measured
  // differing fresh-vs-resized at 1024 — a width a short list of "the
  // interesting ones" had left out. A gate that only asks about the
  // widths it already knows about is a decoration.
  assert.match(sweep, /freshWidths\(widths\)/);
  const { freshWidths, historyWidths } = await import('../scripts/chrome-history.mjs');
  assert.deepEqual(freshWidths(historyWidths()), historyWidths(),
    'the fresh-load road does not cover every width');
});

test('the sponsor marks reserve their space before their bytes arrive', async () => {
  const app = await read('src/App.jsx');
  // A mark with a height and no width is in the layout at ZERO width
  // until it loads. Four marks arriving one at a time made the row
  // change width four times, and the row's fit — which is measured —
  // was asked the question at four different widths. The row gave up
  // the theater's name on the strength of a row that had not finished
  // arriving, and the same width showed the name on one road and not on
  // another.
  const marks = app.match(/<img[^>]*header-brand-logo[^>]*>/g) || [];
  assert.equal(marks.length, 4, 'the header should carry four marks');
  for (const mark of marks) {
    assert.match(mark, /\swidth="\d+"/, `a mark does not reserve its width: ${mark}`);
    assert.match(mark, /\sheight="\d+"/, `a mark does not reserve its height: ${mark}`);
  }
  // And the declared size is the picture's own size, so nothing is
  // stretched: the ratio the browser reserves is the ratio it renders.
  assert.match(app, /pmua-logo\.webp[\s\S]{0,60}width="2560" height="1233"/);
  assert.match(app, /depa-logo\.png[\s\S]{0,60}width="1182" height="1182"/);
  assert.match(app, /axiom-logo\.png[\s\S]{0,60}width="1080" height="2392"/);
  assert.match(app, /retl-logo\.svg[\s\S]{0,60}width="200" height="120"/);
});
