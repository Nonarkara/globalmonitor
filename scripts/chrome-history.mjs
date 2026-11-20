/**
 * THE CHROME ROW MUST BE A FUNCTION OF THE WIDTH, NOT OF THE WAY THE
 * READER CAME TO IT.
 *
 * The row is fitted at run time, on every resize. The first fit gave
 * things up and never took them back, so a row that had been squeezed at
 * 700 pixels stayed squeezed at 1200 — the same 1200 the reader could
 * also reach directly showed a different row: the theater's name gone on
 * one road and present on the other. A chrome row that lies about itself
 * once a minute is a chrome row that lies.
 *
 * Then the fit was given a way to take things back, and the way it took
 * them back made the row depend on the road even harder: it restored in
 * the opposite order and gave up again in the middle, so the state at a
 * width was a function of the widths visited before it.
 *
 * A gate that only looks where it already looked is a decoration. The
 * chrome sweep resizes one page from narrow to wide and measures the row
 * at every width — but it walks the widths in ONE direction, so it can
 * never see a row that depends on the road. The road is the thing that
 * was broken.
 *
 * So this sweep walks the widths UP and then DOWN, and compares the row's
 * state at each width on the two roads. It also loads three widths fresh
 * and compares them with the swept state, because "fresh" is the road a
 * reader takes first and must match the others.
 *
 * What it asserts, at every width:
 *
 *   1. the row's state on the way up is the row's state on the way down;
 *   2. the row's state at a width reached by a fresh load is the row's
 *      state at the same width reached by resizing;
 *   3. the state it compares is the WHOLE state — every drop, every
 *      visibility, the number of clocks still standing, the row's own
 *      height. A row that shows a different clock is a different row.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { historyDifferences } from './lib/history.mjs';

/** The widths the row is walked through. */
export const historyWidths = () => [
  320, 360, 390, 430, 600, 720, 768, 900, 1024, 1200, 1440, 1600,
];

/** The widths that are also loaded fresh, and compared with the sweep. */
export const freshWidths = () => [1200, 390, 1440];

const settle = (page) => page.evaluate(
  () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
);

/**
 * The WHOLE state of the row, as one string. If two roads disagree on any
 * part of it, the roads disagree on the row.
 */
const signature = async (page) => page.evaluate(() => {
  const row = document.querySelector('.header-bar');
  const parts = [];
  // Every droppable thing, and whether it is standing.
  const droppables = [...document.querySelectorAll('[data-chrome-drop]')];
  for (let i = 0; i < droppables.length; i++) {
    const el = droppables[i];
    const kind = el.getAttribute('data-chrome-drop');
    const shown = getComputedStyle(el).display !== 'none';
    parts.push(`${kind}#${i}=${shown ? 'shown' : 'hidden'}`);
  }
  // The sponsor's anchor mark, which is never dropped but is sometimes
  // hidden by the stylesheet, and the number of clocks still standing.
  const pmua = document.querySelector('.header-brand-logo-pmua');
  const pr = pmua?.getBoundingClientRect();
  parts.push(`pmua=${pr && pr.width > 0 && pr.height > 0 ? 'shown' : 'hidden'}`);
  const clocks = [...document.querySelectorAll('[data-chrome-drop="clock"]')];
  parts.push(`clocks=${clocks.filter((c) => getComputedStyle(c).display !== 'none').length}/${clocks.length}`);
  // And the row itself.
  const rr = row?.getBoundingClientRect();
  parts.push(`h=${rr ? Math.round(rr.height * 10) / 10 : 'none'}`);
  parts.push(`over=${row ? Math.round(row.scrollWidth - row.clientWidth) : 'none'}`);
  return parts.join(' ');
});

const load = async (browser, url, width) => {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    serviceWorkers: 'block',
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!response || response.status() !== 200) throw new Error(`${url} answered ${response?.status()}`);
    await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);
    await settle(page);
    return await signature(page);
  } finally {
    await context.close();
  }
};

/**
 * Walk the widths up, walk them down, and compare.
 * Returns { checked, failures } — failures carry the width and the reason.
 */
export async function sweepChromeHistory(browser, url, widths = historyWidths()) {
  const failures = [];
  const context = await browser.newContext({
    viewport: { width: widths[0], height: 900 },
    serviceWorkers: 'block',
  });
  const up = new Map();
  const down = new Map();
  try {
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!response || response.status() !== 200) throw new Error(`${url} answered ${response?.status()}`);
    await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await settle(page);
      up.set(width, await signature(page));
    }
    for (const width of [...widths].reverse()) {
      await page.setViewportSize({ width, height: 900 });
      await settle(page);
      down.set(width, await signature(page));
    }
  } finally {
    await context.close();
  }

  // A fresh load is the first road. It must agree with the swept one.
  const fresh = new Map();
  for (const width of freshWidths()) {
    fresh.set(width, await load(browser, url, width));
  }

  // THE RULE DECIDES, not the caller. `historyDifferences` is the same
  // function the tests take a defective subject to, so what the gate
  // enforces and what the test proves are one piece of code.
  for (const why of historyDifferences({ up, down, fresh })) {
    const width = Number((why.match(/^(\d+)px/) || [])[1]);
    failures.push({ width, why });
  }

  return { checked: widths.length * 2 + freshWidths().length, failures };
}
// Run it on its own:  node scripts/chrome-history.mjs <url>
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.argv[2] || 'https://asia.nonarkara.org/';
  const browser = await chromium.launch({ headless: true });
  try {
    const started = Date.now();
    const { checked, failures } = await sweepChromeHistory(browser, url);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (failures.length) {
      console.log(`✗ ${failures.length} failure(s) in ${checked} measurements (${seconds}s):`);
      for (const f of failures) console.log(`  ${f.width}px  ${f.why}`);
      process.exitCode = 1;
    } else {
      console.log(`✓ the row is the same row at every width, on every road (${seconds}s)`);
    }
  } finally {
    await browser.close();
  }
}
