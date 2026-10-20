/**
 * The chrome row is fitted at RUN TIME, so it has to be checked at run
 * time, at every width — not at four hand-picked ones.
 *
 * The first release gate tested 1440 / 1024 / 390 / 320 and passed while
 * the row overflowed at every width from 721 to 840 and from 341 to 390,
 * with the last control pushed off the side of the screen. The four widths
 * it tested were the four widths that happened to work. A gate that only
 * looks where it already looked is a decoration, not a gate.
 *
 * This sweep resizes ONE page and measures the row at every width in
 * between. It is the check the first gate should have been.
 *
 * What it asserts, at every width:
 *
 *   1. the row does not overflow its own width;
 *   2. every control in it is REACHABLE — no button pushed past the edge
 *      of the screen, which is the failure a reader actually feels;
 *   3. the reference clock is still there and still inside the row: the
 *      clock is the instrument and it is never the thing that is sacrificed;
 *   4. a drop that did not take is a failure. The row's stylesheet sets
 *      `display:flex!important` on the theater label, and a plain inline
 *      `display:none` loses to it: the label stayed in the row, the row
 *      kept measuring it, and the fit kept giving up things that were
 *      never freed. A drop that the stylesheet overrode is a silent lie;
 *   5. the row's height is within its own budget, measured in the same
 *      rem the row is sized in (the row scales with the fluid root, so a
 *      fixed pixel budget only holds at one width).
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const BAND = 18;           // the legal marking above the row, in px
const ROW_REM = 3.5;       // the row's ceiling, in rem
const PHONE_ROW = 44.1;    // the phone row's fixed height, in px

/** Every width the row has to hold: the breakpoints and the devices. */
export const sweepWidths = () => {
  const widths = [];
  for (let w = 320; w <= 1920; w += 4) widths.push(w);
  for (const w of [
    320, 360, 375, 390, 393, 414, 430, 431, 480, 600, 720, 721, 768,
    800, 840, 900, 901, 1024, 1180, 1181, 1280, 1366, 1440, 1600, 1920,
  ]) if (!widths.includes(w)) widths.push(w);
  return widths.sort((a, b) => a - b);
};

const measure = async (page) => page.evaluate(({ band, rowRem, phoneRow }) => {
  const row = document.querySelector('.header-bar');
  const rr = row?.getBoundingClientRect();
  const canvas = document.querySelector('.maplibregl-canvas');
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

  // A drop that did not take. The inline declaration is checked for its
  // priority as well as its effect: a drop without `important` can lose to
  // the stylesheet, and a drop with it that still shows has already lost.
  const phantomDrops = [...document.querySelectorAll('[data-chrome-drop]')]
    .filter((el) => {
      const value = el.style.getPropertyValue('display');
      if (!value) return false;
      if (el.style.getPropertyPriority('display') !== 'important') return true;
      return getComputedStyle(el).display !== 'none';
    })
    .map((el) => `${el.getAttribute('data-chrome-drop')}:${(el.textContent || '').trim().slice(0, 18)}`);

  // Every control in the row has to be reachable. A control past the edge
  // of the screen is not on the product any more.
  const offScreen = [...document.querySelectorAll('.header-controls button, .header-controls select')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      return r.right > innerWidth + 1 || r.left < -1;
    })
    .map((el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30));

  const clock = document.querySelector('.primary-clock-center');
  const cr = clock?.getBoundingClientRect();
  const clockVisible = Boolean(cr && cr.width > 0 && cr.height > 0);
  const clockInRow = Boolean(rr && cr && cr.top >= rr.top - 1 && cr.bottom <= rr.bottom + 1);

  return {
    rowOverflow: row ? Math.round(row.scrollWidth - row.clientWidth) : 0,
    rowH: rr ? Math.round(rr.height * 10) / 10 : 0,
    chrome: canvas ? Math.round(canvas.getBoundingClientRect().top) : 0,
    rootPx,
    phantomDrops,
    offScreen,
    clockVisible,
    clockInRow,
    budget: Math.min(phoneRow, rowRem * rootPx),
  };
}, { band: BAND, rowRem: ROW_REM, phoneRow: PHONE_ROW });

/**
 * Sweep the row at every width and report what fails.
 * Returns { checked, failures } — failures carry the width and the reason.
 */
export async function sweepChromeFit(browser, url, widths = sweepWidths()) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const failures = [];
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!response || response.status() !== 200) throw new Error(`${url} answered ${response?.status()}`);
    await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      // Two frames: the ResizeObserver fires after layout, and the fit it
      // runs must be allowed to settle before the row is measured.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await measure(page);
      const phone = width <= 720;
      const rowBudget = phone ? PHONE_ROW : ROW_REM * m.rootPx;

      if (m.rowOverflow > 1) failures.push({ width, why: `the row overflows by ${m.rowOverflow}px` });
      if (m.offScreen.length) failures.push({ width, why: `control off the side of the screen: ${m.offScreen.join(', ')}` });
      if (m.phantomDrops.length) failures.push({ width, why: `a drop did not take: ${m.phantomDrops.join(', ')}` });
      if (!m.clockVisible) failures.push({ width, why: 'the reference clock is gone' });
      if (!m.clockInRow) failures.push({ width, why: 'the reference clock left the row' });
      if (m.rowH > rowBudget + 0.1) failures.push({ width, why: `the row is ${m.rowH}px — its budget is ${rowBudget.toFixed(1)}px` });
      if (m.chrome > BAND + rowBudget + 0.1) failures.push({ width, why: `the chrome is ${m.chrome}px — its budget is ${(BAND + rowBudget).toFixed(1)}px` });
    }
  } finally {
    await context.close();
  }
  return { checked: widths.length, failures };
}

// Run it on its own:  node scripts/chrome-fit.mjs <url>
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.argv[2] || 'https://asia.nonarkara.org/';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const started = Date.now();
    const { checked, failures } = await sweepChromeFit(browser, url);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (failures.length) {
      console.log(`✗ ${failures.length} failure(s) across ${checked} widths (${seconds}s):`);
      for (const f of failures) console.log(`  ${f.width}px  ${f.why}`);
      process.exitCode = 1;
    } else {
      console.log(`✓ the chrome row holds at all ${checked} widths (${seconds}s)`);
    }
  } finally {
    await browser.close();
  }
}
