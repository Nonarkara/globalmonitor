#!/usr/bin/env node
/**
 * Capture pageerror + console.error on production over 15s.
 * Usage: node scripts/prod-map-crash-check.mjs [url]
 */
import { chromium } from 'playwright';

const url = process.argv[2] || 'https://globalmonitor.pages.dev/';
const waitMs = 15000;

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
await page.waitForTimeout(waitMs);

const errorBoundaryText = await page.locator('text=Something went wrong').count();
const mapFailedText = await page.locator('text=Map failed to render').count();
const canvasCount = await page.locator('.maplibregl-canvas').count();

console.log(JSON.stringify({
  url,
  waitMs,
  pageErrors,
  consoleErrors,
  errorBoundaryVisible: errorBoundaryText > 0 || mapFailedText > 0,
  errorBoundaryText: errorBoundaryText > 0 ? 'Something went wrong' : (mapFailedText > 0 ? 'Map failed to render' : null),
  mapCanvasPresent: canvasCount > 0,
  canvasCount,
}, null, 2));

await browser.close();
