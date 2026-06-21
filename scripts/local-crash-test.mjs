import { chromium } from 'playwright';

const pageErrors = [];
const consoleLogs = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('pageerror', (err) => {
  pageErrors.push({ message: err.message, stack: err.stack?.split('\n').slice(0, 10).join('\n') });
});
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' || text.includes('ErrorBoundary') || text.includes('TypeError')) {
    consoleLogs.push({ type: msg.type(), text });
  }
});

const url = process.argv[2] || 'http://127.0.0.1:5180/';
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(12000);

const state = await page.evaluate(() => ({
  errorBoundary: document.body.innerText.includes('Something went wrong'),
  mapFailed: document.body.innerText.includes('Map failed to render'),
  mapCanvas: document.querySelectorAll('.maplibregl-canvas').length,
  aircraftMatch: (document.body.innerText.match(/(\d+) aircraft/) || [])[0] || null,
}));

console.log('FINAL', JSON.stringify(state));
console.log('PAGE_ERRORS', JSON.stringify(pageErrors, null, 2));
console.log('CONSOLE', JSON.stringify(consoleLogs.slice(0, 25), null, 2));
await browser.close();
