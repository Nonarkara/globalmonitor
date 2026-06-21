import { chromium } from 'playwright';

/**
 * Simulates production crash path: cached flights in localStorage,
 * then live fetch completes ~3s later and interpolation runs.
 */
const pageErrors = [];
const consoleLogs = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

page.on('pageerror', (err) => {
  pageErrors.push({ message: err.message, stack: err.stack?.split('\n').slice(0, 6).join('\n') });
});
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' && (text.includes('ErrorBoundary') || text.includes('TypeError') || text.includes('Cannot read'))) {
    consoleLogs.push(text);
  }
});

const url = process.argv[2] || 'https://globalmonitor.pages.dev/';

// Seed stale cache so first paint shows aircraft, then live fetch replaces it
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);

const snapshots = [];
for (const ms of [2500, 4000, 6000, 10000, 15000]) {
  await page.waitForTimeout(ms === 2500 ? 2500 : ms === 4000 ? 1500 : ms === 6000 ? 2000 : ms === 10000 ? 4000 : 5000);
  const state = await page.evaluate(() => ({
    errorBoundary: document.body.innerText.includes('Something went wrong'),
    mapFailed: document.body.innerText.includes('Map failed to render'),
    mapCanvas: document.querySelectorAll('.maplibregl-canvas').length,
    aircraft: (document.body.innerText.match(/(\d+) aircraft/) || [])[1] || '0',
  }));
  snapshots.push({ ms, ...state });
}

console.log(JSON.stringify({ url, snapshots, pageErrors, consoleLogs }, null, 2));
await browser.close();

process.exit(pageErrors.length > 0 || snapshots.some((s) => s.errorBoundary || s.mapFailed) ? 1 : 0);
