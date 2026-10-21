import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export function layoutProblems(m) {
  const problems = [];
  if (m.overflow > 1) problems.push('document overflow');
  if (m.mapShare < .6) problems.push('map loses first screen');
  if (m.titleEscapes) problems.push('title crosses masthead');
  if (m.selectWidth > 0 && m.selectWidth < 110) problems.push('theater selector unreadable');
  if (m.offscreen.length) problems.push('unreachable controls: ' + m.offscreen.join(', '));
  if (m.failed) problems.push('application error surface');
  return problems;
}

export async function measureLayout(page) {
  return page.evaluate(() => {
    const visible = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const map = document.querySelector('.maplibregl-canvas,.leaflet-container')?.getBoundingClientRect();
    const header = document.querySelector('.header-bar,.hdr')?.getBoundingClientRect();
    const title = document.querySelector('.header-title-lockup')?.getBoundingClientRect();
    const select = document.querySelector('.compact-region-select');
    const mapH = map ? Math.max(0, Math.min(innerHeight, map.bottom) - Math.max(0, map.top)) : 0;
    const mapW = map ? Math.max(0, Math.min(innerWidth, map.right) - Math.max(0, map.left)) : 0;
    return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth,
      mapShare: mapH * mapW / (innerWidth * innerHeight), headerHeight: header?.height,
      titleEscapes: Boolean(header && title?.width > 0 && title?.height > 0 && (title.top < header.top - 1 || title.bottom > header.bottom + 1)),
      selectWidth: visible(select) ? select.getBoundingClientRect().width : 0,
      offscreen: [...document.querySelectorAll('.header-controls button,.header-controls select,.tabs .tab,#mob-nav button')]
        .filter(visible).filter(e => {const r=e.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1;})
        .map(e => e.getAttribute('aria-label') || e.textContent.trim()),
      failed: /Something went wrong|Map failed to render/.test(document.body.innerText) };
  });
}

export async function verifySuiteTarget(url, name, out = '.qa/live-suite-release') {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [], measurements = [];
  page.on('pageerror', e => { if (!e.stack?.includes('youtube.com')) errors.push(e.message); });
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response.status(), 200);
    await page.locator('.maplibregl-canvas,.leaflet-container').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(1800);
    // Own CSS breakpoints and their neighbours, rather than the four widths
    // that happened to work during development. Cross-origin sheets are not read.
    const breakpoints = await page.evaluate(() => {
      const widths = new Set();
      const read = rules => { for (const rule of rules) {
        if (rule.conditionText) for (const m of rule.conditionText.matchAll(/(?:min|max)-width:\s*(\d+)px/g)) widths.add(Number(m[1]));
        if (rule.cssRules) read(rule.cssRules);
      }};
      for (const sheet of document.styleSheets) { try {read(sheet.cssRules);} catch { /* cross-origin provider CSS */ } }
      return [...widths];
    });
    const widths = [...new Set([320,390,768,1024,1440,...breakpoints.flatMap(w => [w-1,w,w+1])])]
      .filter(w => w >= 320 && w <= 1920).sort((a,b) => b-a);
    await fs.mkdir(out, { recursive: true });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await measureLayout(page);
      assert.deepEqual(layoutProblems(m), [], `${name} ${width}px: ${JSON.stringify(m)}`);
      measurements.push(m);
      if ([320,390,768,1024,1440].includes(width)) await page.screenshot({ path: `${out}/${name}-${width}.png` });
    }
    // Falsify the actual rendered guard, not a separate toy assertion.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (await page.locator('.header-title-lockup').count()) {
      await page.locator('.header-title-lockup').evaluate(e => e.style.setProperty('transform','translateY(-200px)','important'));
      assert.ok(layoutProblems(await measureLayout(page)).includes('title crosses masthead'), 'overlap mutant must fail');
    } else {
      await page.locator('.maplibregl-canvas,.leaflet-container').first().evaluate(e => e.style.setProperty('height','100px','important'));
      assert.ok(layoutProblems(await measureLayout(page)).includes('map loses first screen'), 'squeezed map mutant must fail');
    }
    assert.deepEqual(errors, []);
    return { name, url, status: response.status(), checked: widths.length, measurements, errors, mutation: 'caught' };
  } finally { await context.close(); await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [url,name = 'site',out] = process.argv.slice(2);
  if (!url || !/^https?:\/\//.test(url)) throw new Error('Pass a deployed URL or local candidate URL');
  console.log(JSON.stringify(await verifySuiteTarget(url,name,out), null, 2));
}
