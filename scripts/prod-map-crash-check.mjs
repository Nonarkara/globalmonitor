#!/usr/bin/env node
/**
 * Production map stability + traffic visibility verification.
 * Usage: node scripts/prod-map-crash-check.mjs [url]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.argv[2] || 'https://globalmonitor.pages.dev/';
const waitMs = 5000;
const panCount = 22;
const outDir = path.join(process.cwd(), 'scripts', '.prod-map-check');

const pageErrors = [];
const consoleErrors = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

page.on('pageerror', (err) => {
  pageErrors.push(String(err?.message || err));
});

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});

await mkdir(outDir, { recursive: true });

// Hard refresh — simulate fresh user (no cache)
await context.clearCookies();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch { /* ignore */ }
});
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });

await page.waitForSelector('.maplibregl-canvas', { timeout: 90000 }).catch(() => {});

// Ensure flights + vessels layers ON via sidebar toggles if legend hidden
const trafficLegend = page.locator('.map-legend--traffic');
const legendVisible = await trafficLegend.isVisible().catch(() => false);
if (!legendVisible) {
  for (const label of ['Flights', 'Vessels', 'Aircraft', 'Ships']) {
    const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
    }
  }
}

// Wait for deferred traffic layers (3s defer + slow flights API on cold cache)
await Promise.all([
  page.waitForResponse((r) => r.url().includes('/api/vessels') && r.status() === 200, { timeout: 120000 }).catch(() => null),
  page.waitForResponse((r) => r.url().includes('/api/flights') && r.status() === 200, { timeout: 120000 }).catch(() => null),
]);
await page.waitForFunction(() => {
  const t = document.querySelector('.map-legend--traffic')?.innerText || '';
  const flightsReady = /\d[\d,]*\s+of\s+[\d,]+\s+shown/.test(t) || /\d[\d,]*\s+global\s+·\s+ADS-B/.test(t);
  const vesselsReady = (/\d[\d,]*\s+of\s+[\d,]+\s+shown/.test(t) || /\d[\d,]*\s+global/.test(t)) && !t.includes('Awaiting AIS');
  return flightsReady && vesselsReady;
}, { timeout: 120000 }).catch(() => {});
await page.waitForFunction(() => {
  const map = window.__GM_MAP__;
  return map?.getStyle()?.layers?.some((l) => l.id === 'flights-icons')
    && map.getStyle().layers.some((l) => l.id === 'vessels-labels');
}, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(3000);

await page.screenshot({ path: path.join(outDir, '01-after-load.png'), fullPage: false });

const mapStateAfterLoad = await page.evaluate(() => {
  const canvas = document.querySelector('.maplibregl-canvas');
  const mapErr = document.body.innerText.includes('Map failed to render');
  const legend = document.querySelector('.map-legend--traffic');
  const legendText = legend?.innerText || '';
  return {
    canvasPresent: Boolean(canvas),
    mapFailedText: mapErr,
    trafficLegendText: legendText.slice(0, 300),
  };
});

// Pan map repeatedly to stress WebGL / traffic layers
const canvas = page.locator('.maplibregl-canvas').first();
for (let i = 0; i < panCount; i += 1) {
  const box = await canvas.boundingBox().catch(() => null);
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(
      cx + 120 * (i % 2 === 0 ? 1 : -1),
      cy + 60 * (i % 3 === 0 ? 1 : -1),
      { steps: 8 },
    );
    await page.mouse.up();
  }
  await page.waitForTimeout(200);
}

// Zoom in/out between zoom 3–8 range
for (let i = 0; i < 8; i += 1) {
  await page.mouse.wheel(0, i % 2 === 0 ? -500 : 500);
  await page.waitForTimeout(350);
}

await page.waitForTimeout(waitMs);

await page.screenshot({ path: path.join(outDir, '02-after-pan-zoom.png'), fullPage: false });

const layerProbe = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const map = window.__GM_MAP__;
  if (!map?.queryRenderedFeatures) {
    return { error: 'window.__GM_MAP__ not ready', styleLoaded: false };
  }

  // Fly to world view then zoom in for icon/name checks
  map.easeTo({ center: [0, 20], zoom: 3, duration: 0 });
  await sleep(1500);
  const worldFeatures = map.queryRenderedFeatures(undefined, { layers: ['flights-icons', 'vessels-icons'] });
  const worldFlightIcons = worldFeatures.filter((f) => f.layer?.id === 'flights-icons').length;
  const worldVesselIcons = worldFeatures.filter((f) => f.layer?.id === 'vessels-icons').length;

  map.easeTo({ center: [103.8, 1.35], zoom: 7, duration: 0 });
  await sleep(2000);
  const sgFeatures = map.queryRenderedFeatures(undefined, { layers: ['flights-icons', 'vessels-icons', 'vessels-labels'] });
  const sgFlightIcons = sgFeatures.filter((f) => f.layer?.id === 'flights-icons').length;
  const sgVesselIcons = sgFeatures.filter((f) => f.layer?.id === 'vessels-icons').length;
  const vesselNames = sgFeatures
    .filter((f) => f.layer?.id === 'vessels-labels' || (f.layer?.id === 'vessels-icons' && f.properties?.name))
    .map((f) => f.properties?.name)
    .filter(Boolean)
    .slice(0, 8);

  const style = map.getStyle?.();
  const layerIds = (style?.layers || []).map((l) => l.id);
  const hasFlightLayer = layerIds.includes('flights-icons');
  const hasVesselLayer = layerIds.includes('vessels-icons');
  const hasVesselLabels = layerIds.includes('vessels-labels');

  return {
    zoom: map.getZoom(),
    hasFlightLayer,
    hasVesselLayer,
    hasVesselLabels,
    worldFlightIcons,
    worldVesselIcons,
    sgFlightIcons,
    sgVesselIcons,
    vesselNameSamples: vesselNames,
    styleLoaded: Boolean(style),
  };
});

const errorBoundaryText = await page.locator('text=Something went wrong').count();
const mapFailedText = await page.locator('text=Map failed to render').count();
const canvasCount = await page.locator('.maplibregl-canvas').count();
const canvasVisible = canvasCount > 0
  ? await page.locator('.maplibregl-canvas').first().isVisible().catch(() => false)
  : false;

const bundleHash = await page.evaluate(() => {
  const script = [...document.querySelectorAll('script[src*="assets/index-"]')][0];
  return script?.src?.match(/index-([^.]+)\.js/)?.[1] || null;
});

const flightIconsVisible = (layerProbe.worldFlightIcons ?? 0) > 0 || (layerProbe.sgFlightIcons ?? 0) > 0;
const vesselIconsVisible = (layerProbe.worldVesselIcons ?? 0) > 0 || (layerProbe.sgVesselIcons ?? 0) > 0;
const shipNamesOnMap = Array.isArray(layerProbe.vesselNameSamples) && layerProbe.vesselNameSamples.length > 0;
const noCrash = !errorBoundaryText && !mapFailedText && canvasCount > 0 && canvasVisible;

const pass = noCrash
  && layerProbe.hasFlightLayer
  && layerProbe.hasVesselLayer
  && layerProbe.hasVesselLabels
  && flightIconsVisible
  && vesselIconsVisible
  && shipNamesOnMap;

const report = {
  url,
  waitMs,
  panCount,
  bundleHash,
  pageErrors,
  consoleErrors: consoleErrors.slice(0, 10),
  errorBoundaryVisible: errorBoundaryText > 0 || mapFailedText > 0,
  errorBoundaryText: errorBoundaryText > 0 ? 'Something went wrong' : (mapFailedText > 0 ? 'Map failed to render' : null),
  pinkError: mapFailedText > 0,
  mapCanvasPresent: canvasCount > 0,
  mapCanvasVisible: canvasVisible,
  canvasCount,
  mapStateAfterLoad,
  layerProbe,
  flightIconLayer: layerProbe.hasFlightLayer ? 'yes' : 'no',
  flightIconsVisible: flightIconsVisible ? 'yes' : 'no',
  shipNamesOnMap: shipNamesOnMap ? 'yes' : 'no',
  screenshots: [
    path.join(outDir, '01-after-load.png'),
    path.join(outDir, '02-after-pan-zoom.png'),
  ],
  pass,
};

await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

await browser.close();
process.exit(pass ? 0 : 1);
