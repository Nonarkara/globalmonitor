import http from 'node:http';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { stampWorker } from './stamp-service-worker.mjs';

// Two real releases at one origin, with an already-controlled legacy tab.
// This is a regression test, not the production browser/visual release gate.
let phase = 'legacy';
const helper = await fs.readFile(new URL('../src/services/appUpdates.js', import.meta.url), 'utf8');
const source = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const html = modern => `<html><head><script type="module" src="/assets/${modern ? 'new' : 'old'}.js"></script></head><body><header style="height:${modern ? 56 : 233}px">GlobeWatch</header><main data-shell="${modern ? 'compact' : 'legacy'}">Map</main></body></html>`;
const legacyWorker = `self.addEventListener('install',e=>e.waitUntil(caches.open('gpd-legacy').then(c=>c.add('/')).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(caches.match('/').then(c=>c||fetch(e.request)));});`;
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Cache-Control', 'no-store');
    if (pathname === '/sw.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(phase === 'legacy' ? legacyWorker : stampWorker(phase === 'without-migration' ? source.replace('.then(refreshOutdatedClients)', '') : source, html(true))); }
    else if (pathname === '/appUpdates.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(helper); }
    else if (pathname === '/assets/old.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(`navigator.serviceWorker.register('/sw.js');`); }
    else if (pathname === '/assets/new.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(`import {registerAppUpdates} from '/appUpdates.js';registerAppUpdates();`); }
    else { res.setHeader('Content-Type', 'text/html'); res.end(html(phase !== 'legacy')); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 366, height: 802 } });
    context.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
    const page = await context.newPage();
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.goto(origin);
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    assert.equal(await page.locator('header').evaluate(el => el.getBoundingClientRect().height), 233);
    phase = 'without-migration';
    await page.evaluate(async () => {
        const changed = new Promise((resolve, reject) => {
            const done = () => { clearTimeout(timer); resolve(); };
            const timer = setTimeout(() => {
                navigator.serviceWorker.removeEventListener('controllerchange', done);
                reject(new Error('Updated worker did not claim the legacy tab within20s'));
            }, 20000);
            navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
        });
        await (await navigator.serviceWorker.getRegistration()).update();
        await changed;
    });
    assert.equal(await page.locator('header').evaluate(el => el.getBoundingClientRect().height), 233, 'claiming the updated worker alone leaves the old layout running');
    assert.equal(navigations, 1);
    phase = 'modern';
    // Updating the worker used to leave this tab's old JS and CSS running.
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(registration => registration.update()));
    await page.locator('[data-shell="compact"]').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('header').evaluate(el => el.getBoundingClientRect().height), 56);
    assert.equal(navigations, 2, 'legacy tab advances exactly once');
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(registration => registration.update()));
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(navigations, 2, 'unchanged release must not reload current tab');
    assert.equal(await page.locator('header').evaluate(el => el.getBoundingClientRect().height), 56);
    console.log(JSON.stringify({ returningSession: 'PASS', beforeHeader: 233, afterHeader: 56, migration: 'automatic, no cache clearing or manual reload', navigations }));
    await context.close();
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
