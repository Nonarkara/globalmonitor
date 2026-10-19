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
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        defaultPanels: visible('.left-sidebar,.right-sidebar,.bottom-bar'), failed: /Something went wrong|Map failed to render/.test(document.body.innerText),
        sponsors: [...document.querySelectorAll('.header-brand-logo')].map(i => i.complete && i.naturalWidth > 0) };
    });
    assert.ok(geometry.header.height <= 56.1, 'masthead exceeds 56px');
    assert.ok(geometry.clock.height <= 28.1, 'clock exceeds 28px');
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
