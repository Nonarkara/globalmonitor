import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { airportsCsvToFeatureCollection } from '../scripts/refresh-airports.mjs';
import { fetchFlightSnapshot } from '../functions/_lib/router.mjs';
import { fetchVesselsPayload } from '../functions/_lib/vessels.mjs';
import { getSharedCache, useCached } from '../functions/_lib/cache.mjs';
import { readLiveState } from '../server/lib/oracle/state.mjs';

test('Oracle baseline never treats demo features as observed input', () => {
    const cache = new Map([['acled:middleeast', { payload: { source: 'demo_offline_no_acled_key', features: Array.from({ length: 16 }, () => ({})) } }]]);
    const state = readLiveState(cache, 'middleeast');
    assert.equal(state.signals.acled, 0);
    assert.equal(state.hasObservedInputs, false);
});

test('install manifest has real PNG sizes and permits portrait phones', async () => {
    const manifest = JSON.parse(await fs.readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
    assert.equal(manifest.short_name, 'GlobeWatch');
    assert.equal(manifest.orientation, 'any');
    for (const icon of manifest.icons) {
        const png = await fs.readFile(new URL(`../public${icon.src}`, import.meta.url));
        const [width, height] = icon.sizes.split('x').map(Number);
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), height);
    }
});

test('simultaneous cache misses share one upstream call', async () => {
    let calls = 0;
    const loader = async () => { calls += 1; await new Promise(resolve => setTimeout(resolve, 5)); return { value: 1 }; };
    await Promise.all(Array.from({ length: 20 }, () => useCached('qa:singleflight', 1000, loader, () => true)));
    assert.equal(calls, 1);
});

test('standalone brand PNGs preserve alpha, not an opaque white background', async () => {
    for (const variant of ['lockup', 'mark', 'monochrome']) {
        const png = await fs.readFile(new URL(`../public/brand/globewatch-${variant}.png`, import.meta.url));
        assert.equal(png[25], 6, `${variant} must be RGBA`);
    }
});

const worker = async ({ cached = null, network = async () => { throw new Error('offline'); } } = {}) => {
    const handlers = {};
    const context = vm.createContext({
        URL, Request, Response, Headers, fetch: network,
        self: { location: { origin: 'https://example.test' }, addEventListener: (event, handler) => { handlers[event] = handler; } },
        caches: { match: async () => cached, open: async () => ({ put: async () => {}, keys: async () => [] }) }
    });
    vm.runInContext(await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
    return { handlers, context };
};

test('every service-worker precache entry exists locally', async () => {
    const { context } = await worker();
    const assets = vm.runInContext('STATIC_ASSETS', context);
    for (const asset of assets) {
        if (asset === '/' || asset === '/index.html') continue;
        await fs.access(new URL(`../public${asset}`, import.meta.url));
    }
});

test('offline API data keeps observation age and becomes stale; samples stay samples', async () => {
    for (const status of ['live', 'sample']) {
        const cached = new Response('{}', { headers: { 'X-Tech-Status': status, 'X-Tech-Updated-At': '2026-01-01T00:00:00Z' } });
        const { handlers } = await worker({ cached });
        let result;
        handlers.fetch({ request: new Request('https://example.test/api/test'), respondWith: value => { result = value; } });
        const response = await result;
        assert.equal(response.headers.get('X-Tech-Status'), status === 'sample' ? 'sample' : 'stale');
        assert.equal(response.headers.get('X-Tech-Updated-At'), '2026-01-01T00:00:00Z');
    }
});

test('offline cache misses return a defined 503 response', async () => {
    const { handlers } = await worker();
    let result;
    handlers.fetch({ request: new Request('https://example.test/api/test'), respondWith: value => { result = value; } });
    assert.equal((await result).status, 503);
});

test('airport import refuses empty coordinates and closed airfields', () => {
    const csv = 'ident,type,name,latitude_deg,longitude_deg,scheduled_service\nBKK,large_airport,Bangkok,13.69,100.75,yes\nBAD,large_airport,Missing,,,yes\nOLD,closed,Closed,13,100,yes';
    const airports = airportsCsvToFeatureCollection(csv);
    assert.equal(airports.features.length, 1);
    assert.equal(airports.features[0].properties.id, 'BKK');
});

test('flight static fallback keeps original collection timestamp', async () => {
    const snapshot = { type: 'FeatureCollection', features: Array.from({ length: 50 }, () => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [53, 30] }, properties: {} })), meta: { collectedAt: '2026-01-01T00:00:00Z' } };
    const result = await fetchFlightSnapshot(new Request('https://example.test/api/flights'), {}, async () => new Response(JSON.stringify(snapshot)));
    assert.equal(result.meta.stale, true);
    assert.equal(result.meta.collectedAt, '2026-01-01T00:00:00Z');
});

test('Axiom attribution inside an old AIS file never means a connected live feed', async () => {
    const originalFetch = globalThis.fetch;
    getSharedCache().clear();
    globalThis.fetch = async () => new Response('', { status: 503 });
    const snapshot = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [53, 25] }, properties: { mmsi: '1', source: 'axiom-overwatch.io' } }], meta: { source: 'axiom-overwatch.io', collectedAt: '2026-01-01T00:00:00Z' } };
    try {
        const result = await fetchVesselsPayload('global', { origin: 'https://example.test', next: async () => new Response(JSON.stringify(snapshot), { headers: { 'Content-Type': 'application/json' } }) });
        assert.equal(result.meta.connected, false);
        assert.equal(result.meta.staticSnapshot, true);
        assert.equal(result.meta.staticSnapshotAt, '2026-01-01T00:00:00Z');
    } finally { globalThis.fetch = originalFetch; getSharedCache().clear(); }
});
