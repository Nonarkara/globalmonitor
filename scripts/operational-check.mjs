import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const url = process.argv[2];
if (!url || !/^https:\/\//.test(url)) throw new Error('Pass the deployed HTTPS URL');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
await fs.mkdir('non-slop-shots', { recursive: true });
try {
  for (const width of [1440, 1024, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => { if (!e.stack?.includes('youtube.com')) errors.push(e.message); });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response.status(), 200);
    await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(3000);
    const geometry = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
      const visible = selector => [...document.querySelectorAll(selector)].some(el => el.getClientRects().length > 0);
      return { header: rect('.header-bar'), clock: rect('.top-bar-clock'), map: rect('.maplibregl-canvas'),
        // The chrome above the map: the legal marking, the instrument band
        // and the masthead. A band earns its height — on a phone the whole
        // stack may not exceed the budget the contract sets.
        chrome: Math.round(document.querySelector('.maplibregl-canvas')?.getBoundingClientRect().top || 0),
        // The chrome rows are sized in rem so they scale with the fluid root.
        // A budget in fixed pixels measures the wrong thing on a 1440px
        // screen (root 16.56px → a 3.5rem masthead is 58px, not 56).
        rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        // The chrome row must FIT its own width. A row that overflows does
        // not scroll — it clips, and the buttons past the edge are gone. The
        // first one-row bar was built on a ladder of viewport widths and it
        // overflowed at every width from 320 to 1920, with the last two
        // buttons pushed off the side where nobody can reach them.
        rowOverflow: (() => {
          const row = document.querySelector('.header-bar');
          if (!row) return 0;
          return Math.round(row.scrollWidth - row.clientWidth);
        })(),
        // How much of the SOURCES plate is scrolled out of sight. On a desktop
        // the contract is that every reading and every qualification is
        // visible at once, so this must be zero. On a phone the plate is a
        // scrollable list by design and says so.
        plateHidden: (() => {
          const plate = document.querySelector('.map-legend--traffic');
          if (!plate) return 0;
          return Math.round(plate.scrollHeight - plate.clientHeight);
        })(),
        defaultPanels: visible('.left-sidebar,.right-sidebar,.bottom-bar'), failed: /Something went wrong|Map failed to render/.test(document.body.innerText),
        sponsors: [...document.querySelectorAll('.header-brand-logo')].map(i => i.complete && i.naturalWidth > 0) };
    });
    if (width <= 720) {
      // The phone's row is fixed pixels, and the contract fixes it: one 44px
      // line of chrome carrying partners, name, reference clock and controls,
      // plus the 18px legal marking above it. A band earns its height.
      assert.ok(geometry.header.height <= 44.1, `the phone chrome row is ${geometry.header.height}px — it carries one line`);
      if (width <= 430) {
        assert.ok(geometry.chrome <= 62.1, `the top chrome is ${geometry.chrome}px — the phone budget is 62px`);
      }
    } else {
      const rem = (n) => n * geometry.rootPx;
      // The row is sized in rem so it scales with the fluid root. A budget in
      // fixed pixels measures the wrong thing on a 1440px screen (root
      // 16.56px → a 3.25rem row is 53.8px, not 52).
      assert.ok(geometry.header.height <= rem(3.5) + 0.1, `the chrome row exceeds 3.5rem (${rem(3.5).toFixed(1)}px)`);
      assert.ok(geometry.chrome <= 74.1, `the top chrome is ${geometry.chrome}px — the desktop budget is 74px`);
    }
    // ONE band. The clock is an instrument INSIDE the row, not a band above
    // it: if the clock ever moves out of the row, the chrome is two bands
    // again and everything the owner asked for is undone. The row brackets
    // the clock, so this fails the day the clock is hoisted back out.
    assert.ok(geometry.clock, 'the reference clock must be in the DOM');
    assert.ok(geometry.clock.top >= geometry.header.top - 1
      && geometry.clock.bottom <= geometry.header.bottom + 1,
      `the clock is not inside the chrome row (clock ${geometry.clock.top}–${geometry.clock.bottom}, row ${geometry.header.top}–${geometry.header.bottom}) — the chrome must be ONE line`);
    assert.ok(geometry.clock.height <= geometry.header.height + 0.1,
      'the clock is taller than the row it sits in');
    assert.ok(geometry.rowOverflow <= 1,
      `the chrome row overflows by ${geometry.rowOverflow}px — a control is off the side of the screen`);
    if (width > 720) {
      // Every reading and every qualification visible at once. The plate used
      // to be capped at 384px and silently scrolled the cable registry and
      // the cyclone — the two rows that say what the new marks ARE.
      assert.ok(geometry.plateHidden <= 1,
        `the SOURCES plate hides ${geometry.plateHidden}px of its content — a qualifier is scrolled out of sight`);
    }
    assert.ok(geometry.map.height * geometry.map.width >= width * 900 * .6, 'map loses first screen');
    assert.equal(geometry.defaultPanels, false);
    assert.equal(geometry.overflow, false);
    assert.equal(geometry.failed, false);
    assert.equal(geometry.sponsors.length, 4);
    assert.ok(geometry.sponsors.every(Boolean), 'all sponsors load');
    await page.screenshot({ path: 'non-slop-shots/operational-' + width + '.png' });
    for (const [name, selector] of [['layers','.left-sidebar'],['intel','.right-sidebar'],['markets','.bottom-bar']]) {
      const control = page.locator('.map-first-header-' + name).first();
      await control.click();
      await page.locator(selector).waitFor({ state: 'visible' });
      const r = await page.locator(selector).boundingBox();
      assert.ok(r.y >= geometry.header.bottom - 1, 'dock overlaps masthead');
      assert.ok(r.x >= 0 && r.x + r.width <= width + 1, 'dock exceeds viewport');
      await control.click();
      await page.locator(selector).waitFor({ state: 'hidden' });
    }
    if (width === 1440) {
      await page.locator('.map-first-header-layers').first().click();
      for (const name of ['Aircraft','Airports','Ships']) {
        const toggle = page.getByRole('switch', { name: new RegExp(name) }).first();
        if (await toggle.count()) {
          if (await toggle.getAttribute('aria-checked') !== 'true') await toggle.click();
        } else {
          const button = page.getByRole('button', { name: new RegExp('^(Show|Hide) ' + name + ' layer$') }).first();
          if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
        }
      }
      await page.locator('.map-first-header-layers').first().click();
      await page.waitForFunction(async () => {
        const source = window.__GM_MAP__?.getSource('airports-data');
        return source && (await source.getData())?.features?.length > 0;
      }, null, { timeout: 60000 });
      for (const source of ['flights-data','vessels-data','airports-data']) {
        const point = await page.evaluate(async id => {
          const map = window.__GM_MAP__, source = map?.getSource(id);
          const data = source ? await source.getData() : null;
          for (const f of data?.features || []) {
            const xy = f.geometry?.coordinates;
            if (f.geometry?.type !== 'Point' || !xy?.every(Number.isFinite)) continue;
            const p = map.project(xy), r = map.getCanvas().getBoundingClientRect();
            if (p.x > 20 && p.x < r.width - 20 && p.y > 20 && p.y < r.height - 20) return { x:r.x+p.x,y:r.y+p.y };
          }
          return null;
        }, source);
        if (point) {
          await page.waitForTimeout(500);
          await page.mouse.move(point.x, point.y);
          await page.waitForTimeout(300);
          assert.equal(await page.getByText('Something went wrong.', { exact: true }).count(), 0);
        }
      }
    }
    await page.getByRole('button', { name: 'Tools and advanced options' }).click();
    await page.getByRole('menuitem', { name: 'Session log', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Session Activity Log' });
    await dialog.waitFor({ state: 'visible' });
    const downloaded = page.waitForEvent('download', { timeout: 15000 });
    await page.getByRole('button', { name: 'Export session log' }).click();
    const download = await downloaded;
    assert.match(download.suggestedFilename(), /dashboard-activity.*\.log$/);
    assert.equal(await download.failure(), null);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Tools and advanced options' }).evaluate(el => document.activeElement === el), true, 'focus returns to Tools');
    await page.getByRole('button', { name: 'Tools and advanced options' }).click();
    await page.getByRole('menuitem', { name: 'Data health', exact: true }).click();
    const health = page.getByRole('dialog').filter({ hasText: 'Data Provenance' });
    await health.waitFor({ state: 'visible' });
    for (let tab = 0; tab < 10; tab++) {
      await page.keyboard.press('Tab');
      assert.equal(await health.evaluate(el => el.contains(document.activeElement)), true, 'focus remains in source dialog');
    }
    await page.keyboard.press('Escape');
    await health.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Tools and advanced options' }).evaluate(el => document.activeElement === el), true);
    assert.deepEqual(errors, []);
    results.push({ width, status: response.status(), geometry, download: download.suggestedFilename(), errors });
    await context.close();
  }
  console.log(JSON.stringify({ url, results }, null, 2));
} finally { await browser.close(); }
