import { chromium } from 'playwright';

const errors = [];
const pageErrors = [];
const consoleLogs = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('pageerror', (err) => {
  pageErrors.push({ type: 'pageerror', message: err.message, stack: err.stack });
});
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' || text.includes('ErrorBoundary') || text.includes('Error')) {
    consoleLogs.push({ type: msg.type(), text });
  }
});

try {
  await page.goto('https://globalmonitor.pages.dev/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(12000);

  const errorBoundary = await page.locator('text=Something went wrong').count();
  const mapFailed = await page.locator('text=Map failed to render').count();
  const aircraftText = await page.locator('text=/\\d+ aircraft/').first().textContent().catch(() => null);
  const mapCanvas = await page.locator('.maplibregl-canvas').count();

  console.log(JSON.stringify({
    errorBoundary,
    mapFailed,
    aircraftText,
    mapCanvas,
    pageErrors,
    consoleLogs: consoleLogs.slice(0, 30),
  }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ fatal: e.message, pageErrors, consoleLogs }, null, 2));
} finally {
  await browser.close();
}
