import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const url = process.argv[2];
if (!url) throw new Error('Pass the deployed URL to test:browser');
await fs.mkdir('.qa/globewatch', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const results = [];
try {
    for (const width of [1280, 768, 375]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        page.setDefaultTimeout(60000);
        page.on('pageerror', (error) => {
            if (!error.stack?.includes('https://www.youtube.com/')) errors.push({ width, message: error.message });
        });
        page.on('console', (message) => {
            if (message.type() === 'error' && /Worker failed|DOMTokenList|Maximum update depth/.test(message.text())) {
                errors.push({ width, message: message.text() });
            }
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.locator('.maplibregl-canvas').waitFor({ state: 'visible' });
        await page.waitForFunction(() => window.__GM_MAP__?.isStyleLoaded());
        await page.screenshot({ path: `.qa/globewatch/dashboard-${width}.png`, fullPage: true });
        const layout = await page.evaluate(() => ({
            fits: document.documentElement.scrollWidth <= innerWidth + 1,
            canvas: document.querySelectorAll('.maplibregl-canvas').length,
            failed: /Something went wrong|Map failed to render/.test(document.body.innerText),
            sponsors: [...document.querySelectorAll('.header-brand-logo')].map(i => ({ alt: i.alt, loaded: i.complete && i.naturalWidth > 0 })),
            brand: [...document.querySelectorAll('.gw-header-mark')].every(i => i.complete && i.naturalWidth > 0 && getComputedStyle(i).filter === 'none'),
        }));
        assert.ok(layout.fits, `horizontal overflow at ${width}`);
        assert.equal(layout.canvas, 1);
        assert.equal(layout.failed, false);
        assert.equal(layout.sponsors.length, 4);
        assert.ok(layout.sponsors.every(x => x.loaded));
        assert.ok(layout.brand);
        if (width === 1280) {
            const alpha = await page.evaluate(async () => {
                const results = [];
                for (const variant of ['mark', 'lockup', 'monochrome']) {
                    const img = new Image(); img.src = `/brand/globewatch-${variant}.png`; await img.decode();
                    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
                    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    let transparent = 0, white = 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] === 0) transparent++;
                        if (pixels[i + 3] > 250 && pixels[i] > 245 && pixels[i + 1] > 245 && pixels[i + 2] > 245) white++;
                    }
                    results.push({ variant, transparent, white });
                }
                return results;
            });
            assert.ok(alpha.every(asset => asset.transparent > 0 && asset.white === 0));
            await page.emulateMedia({ media: 'print' });
            assert.ok(await page.locator('.gw-print-mark').isVisible());
            await page.emulateMedia({ media: 'screen' });
        }

        await page.getByRole('button', { name: 'Android & iPhone web app' }).click();
        const install = page.getByRole('dialog', { name: 'GlobeWatch on your home screen' });
        await install.waitFor({ state: 'visible' });
        assert.match(await install.innerText(), /Available on Android and iPhone as a web app/);
        await page.screenshot({ path: `.qa/globewatch/install-${width}.png` });
        await page.keyboard.press('Escape');
        await install.waitFor({ state: 'hidden' });

        await page.getByRole('button', { name: 'Tools and advanced options' }).click();
        await page.getByRole('menuitem', { name: 'About', exact: true }).click();
        const about = page.getByRole('dialog', { name: 'Global Political Dashboard', exact: true });
        await about.waitFor({ state: 'visible' });
        await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] img')].every(i => i.complete && i.naturalWidth > 0));
        const aboutText = await about.innerText();
        assert.match(aboutText, /FUNDED BY/); assert.match(aboutText, /EXECUTED BY/);
        assert.match(aboutText, /Dr\. Non Arkaraprasertkul/); assert.match(aboutText, /Dr\. Poon Thiengburanathum/);
        await page.screenshot({ path: `.qa/globewatch/about-${width}.png` });
        await page.keyboard.press('Escape');

        if (width === 1280) {
            const toggle = page.getByRole('button', { name: 'Toggle layers panel' });
            if (await toggle.isVisible()) await toggle.click();
            for (const name of ['Aircraft', 'Airports', 'Ships']) {
                const button = page.getByRole('button', { name: new RegExp(`^(Show|Hide) ${name} layer$`, 'i') }).first();
                if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
            }
            const readLayers = () => page.evaluate(async () => {
                const sources = ['flights-data', 'vessels-data', 'airports-data'].map(id => [id, window.__GM_MAP__.getSource(id)]);
                return Object.fromEntries(await Promise.all(sources.map(async ([id, source]) => [id, source ? (await source.getData()).features.length : 0])));
            });
            let layers = {};
            for (let attempt = 0; attempt < 60; attempt++) {
                layers = await readLayers();
                if (Object.values(layers).every(count => count > 0)) break;
                await page.waitForTimeout(500);
            }
            assert.ok(Object.values(layers).every(count => count > 0));
            for (const source of ['flights-data', 'vessels-data', 'airports-data']) {
                const point = await page.evaluate(async (id) => {
                    const map = window.__GM_MAP__;
                    const rect = map.getCanvas().getBoundingClientRect();
                    for (const f of (await map.getSource(id).getData()).features) {
                        const p = map.project(f.geometry.coordinates);
                        const x = rect.left + p.x, y = rect.top + p.y;
                        if (p.x > 20 && p.y > 20 && p.x < rect.width - 20 && p.y < rect.height - 20 && document.elementFromPoint(x, y)?.classList.contains('maplibregl-canvas')) return { x, y };
                    }
                    return null;
                }, source);
                if (point) {
                    await page.mouse.move(point.x, point.y);
                    await page.locator('.maplibregl-popup').waitFor({ state: 'visible', timeout: 5000 });
                }
            }
            await page.evaluate(() => {
                for (let i = 0; i < 100; i++) window.__GM_MAP__.fire('error', { sourceId: 'qa-missing-source' });
            });
            await page.waitForTimeout(1000);
            assert.ok(!/Something went wrong|Map failed to render/.test(await page.locator('body').innerText()));
            results.push({ width, layout, layers });
        } else results.push({ width, layout });
        await context.close();
    }
    // Service-worker installation and offline provenance, without trusting a previous shell.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const swActive = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
    assert.ok(swActive, 'service worker must activate');
    await page.evaluate(async () => {
        const c = await caches.open('gpd-v8-20261002-globewatch');
        await c.put('/api/qa-offline', new Response(JSON.stringify({ count: 7 }), {
            headers: { 'Content-Type': 'application/json', 'X-Tech-Status': 'live', 'X-Tech-Updated-At': '2026-01-01T00:00:00Z' }
        }));
    });
    await context.setOffline(true);
    const offline = await page.evaluate(async () => {
        const r = await fetch('/api/qa-offline');
        return { status: r.status, tech: r.headers.get('X-Tech-Status'), age: r.headers.get('X-Tech-Updated-At'), data: await r.json() };
    });
    assert.equal(offline.tech, 'stale'); assert.equal(offline.age, '2026-01-01T00:00:00Z');
    await context.close();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ url, results, swActive, offline, errors }, null, 2));
} finally { await browser.close(); }
