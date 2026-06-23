#!/usr/bin/env node
/**
 * Capture pageerror + console.error on production; pan map to stress traffic layers.
 * Usage: node scripts/prod-map-crash-check.mjs [url]
 */
import { chromium } from 'playwright';

const url = process.argv[2] || 'https://globalmonitor.pages.dev/';
const waitMs = 15000;
const panCount = 10;

const pageErrors = [];
const consoleErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('pageerror', (err) => {
  pageErrors.push(String(err?.message || err));
});

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.maplibregl-canvas', { timeout: 60000 }).catch(() => {});

// Pan map repeatedly to stress WebGL / traffic layers
const canvas = page.locator('.maplibregl-canvas').first();
for (let i = 0; i < panCount; i += 1) {
  const box = await canvas.boundingBox().catch(() => null);
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80 * (i % 2 === 0 ? 1 : -1), cy + 40, { steps: 8 });
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
}

await page.waitForTimeout(waitMs);

const errorBoundaryText = await page.locator('text=Something went wrong').count();
const mapFailedText = await page.locator('text=Map failed to render').count();
const canvasCount = await page.locator('.maplibregl-canvas').count();

console.log(JSON.stringify({
  url,
  waitMs,
  panCount,
  pageErrors,
  consoleErrors,
  errorBoundaryVisible: errorBoundaryText > 0 || mapFailedText > 0,
  errorBoundaryText: errorBoundaryText > 0 ? 'Something went wrong' : (mapFailedText > 0 ? 'Map failed to render' : null),
  mapCanvasPresent: canvasCount > 0,
  canvasCount,
}, null, 2));

await browser.close();
