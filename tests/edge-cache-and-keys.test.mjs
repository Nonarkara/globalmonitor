import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { edgeTtlFor, edgeCacheKey, withEdgeCache, NON_LIVE_TTL, EDGE_ROUTES } from '../functions/_lib/edgeCache.mjs';
import fs from 'node:fs';
import { workerFetchAdapter } from '../functions/_lib/axiosWorkerAdapter.mjs';
import { acledOr, getAcledToken, resetAcledTokenCache, missingAcledVars } from '../server/lib/acledAuth.mjs';

const fakeCache = () => {
    const m = new Map();
    return {
        m,
        async match(req) { const r = m.get(req.url); return r ? r.clone() : undefined; },
        async put(req, res) { m.set(req.url, res); },
    };
};

const withFetch = async (impl, fn) => {
    const orig = globalThis.fetch;
    globalThis.fetch = impl;
    try { return await fn(); } finally { globalThis.fetch = orig; }
};

test('edge TTLs: expensive upstream routes cached, isolate-state routes not', () => {
    assert.equal(edgeTtlFor('/api/oil-prices'), 1800);
    assert.equal(edgeTtlFor('/api/markets'), 60);
    assert.equal(edgeTtlFor('/api/briefings/gulf'), 120);
    assert.equal(edgeTtlFor('/api/flights'), 60);
    for (const p of ['/api/health', '/api/escalation', '/api/strike-stats', '/api/fronts', '/api/supabase-health']) {
        assert.equal(edgeTtlFor(p), 0, p);
    }
});

test('edge cache key ignores unknown params so ?x=random cannot bust it', () => {
    const a = edgeCacheKey('https://x.org/api/regional-news?code=SA&region=middleeast&x=1');
    const b = edgeCacheKey('https://x.org/api/regional-news?region=middleeast&code=SA&cb=999');
    assert.equal(a, b);
    assert.notEqual(a, edgeCacheKey('https://x.org/api/regional-news?region=middleeast&code=AE'));
});

test('flood: city is in the key, and /api/flood does not cover /api/flood/directive', () => {
    const cm = edgeCacheKey('https://x.org/api/flood?city=chiangmai');
    const ay = edgeCacheKey('https://x.org/api/flood?city=ayutthaya');
    assert.ok(cm && ay);
    assert.notEqual(cm, ay);
    assert.notEqual(edgeCacheKey('https://x.org/api/flood/directive?city=chiangmai'), cm);
    assert.equal(edgeTtlFor('/api/flood/directive/extra'), 0);
    assert.equal(edgeTtlFor('/api/floodx'), 0);
});

test('flood sandbox simulations are never edge cached; live directive is keyed by city', () => {
    for (const q of ['delta=1.5', 'delta=1.5&km2=40', 'km2=40', 'pois=a|b', 'delta=0']) {
        assert.equal(edgeCacheKey(`https://x.org/api/flood/directive?city=chiangmai&${q}`), null, q);
    }
    assert.notEqual(
        edgeCacheKey('https://x.org/api/flood/directive?city=chiangmai'),
        edgeCacheKey('https://x.org/api/flood/directive?city=ayutthaya'));
});

test('oracle scenarios / what-ifs are never edge cached; baseline keyed by theater', () => {
    for (const q of ['scenario=hormuz', 'escDelta=10', 'p=iran:5', 'escDelta=']) {
        assert.equal(edgeCacheKey(`https://x.org/api/oracle?theater=middleeast&${q}`), null, q);
    }
    const me = edgeCacheKey('https://x.org/api/oracle?theater=middleeast');
    assert.ok(me);
    assert.notEqual(me, edgeCacheKey('https://x.org/api/oracle?theater=indopacific'));
});

test('copernicus preview keys every option the parser reads', () => {
    const base = 'https://x.org/api/copernicus/preview?theater=middleeast';
    const keys = new Set(['', '&preset=ndvi', '&bbox=1,2,3,4', '&width=512', '&height=512',
        '&maxCloudCoverage=10', '&lookbackDays=3', '&from=2026-10-01', '&to=2026-10-10']
        .map((q) => edgeCacheKey(base + q)));
    assert.equal(keys.size, 9);
});

test('withEdgeCache: simulation request calls the handler every time and stores nothing', async () => {
    const cache = fakeCache();
    let calls = 0;
    const handler = async () => { calls += 1; return new Response('{}', { status: 200 }); };
    for (let i = 0; i < 2; i += 1) {
        const r = await withEdgeCache(new Request('https://x.org/api/flood/directive?city=chiangmai&delta=2'), handler, { cache });
        assert.equal(r.headers.get('X-Edge-Cache'), null);
    }
    assert.equal(calls, 2);
    assert.equal(cache.m.size, 0);
});

test('every query param router.mjs reads on a cached route is in that route\'s key (or bypasses it)', () => {
    const src = fs.readFileSync(new URL('../functions/_lib/router.mjs', import.meta.url), 'utf8');
    const blocks = src.split(/if \(url\.pathname (?:===|\.startsWith\()\s*/).slice(1);
    for (const block of blocks) {
        const path = block.match(/^'([^']+)'/)?.[1];
        const route = path && EDGE_ROUTES[path];
        if (!route) continue;
        const body = block.split(/\n        if \(url\.pathname/)[0];
        const read = new Set([...body.matchAll(/searchParams\.(?:get|has)\('([^']+)'\)/g)].map((m) => m[1]));
        if (/parseFloodSimulation\(url\.searchParams\)/.test(body)) ['delta', 'km2', 'pois'].forEach((p) => read.add(p));
        if (/sourceIds/.test(body)) read.add('sourceIds');
        const covered = new Set([...route.params, ...(route.bypassIf || [])]);
        for (const p of read) assert.ok(covered.has(p), `${path} reads ?${p} but it is not in the edge key`);
    }
});

test('withEdgeCache: miss then hit; upstream called once', async () => {
    const cache = fakeCache();
    let calls = 0;
    const handler = async () => { calls += 1; return new Response('{"a":1}', { status: 200, headers: { 'X-Tech-Status': 'live' } }); };
    const r1 = await withEdgeCache(new Request('https://x.org/api/oil-prices?z=1'), handler, { cache });
    assert.equal(r1.headers.get('X-Edge-Cache'), 'MISS');
    assert.match(r1.headers.get('Cache-Control'), /s-maxage=1800/);
    const r2 = await withEdgeCache(new Request('https://x.org/api/oil-prices?z=2'), handler, { cache });
    assert.equal(r2.headers.get('X-Edge-Cache'), 'HIT');
    assert.equal(await r2.text(), '{"a":1}');
    assert.equal(calls, 1);
});

test('withEdgeCache: non-live answers get the short TTL; errors are never cached', async () => {
    const cache = fakeCache();
    const sample = await withEdgeCache(new Request('https://x.org/api/acled'),
        async () => new Response('{}', { status: 200, headers: { 'X-Tech-Status': 'sample' } }), { cache });
    assert.equal(sample.headers.get('X-Edge-TTL'), String(NON_LIVE_TTL));
    await withEdgeCache(new Request('https://x.org/api/markets'), async () => new Response('{}', { status: 500 }), { cache });
    assert.equal(cache.m.size, 1);
    const uncached = await withEdgeCache(new Request('https://x.org/api/escalation'), async () => new Response('{}'), { cache });
    assert.equal(uncached.headers.get('X-Edge-Cache'), null);
});

test('worker axios adapter never sends the unimplemented `cache` field and parses JSON', async () => {
    let seen;
    await withFetch(async (url, init) => { seen = { url, init }; return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }); }, async () => {
        const res = await axios.get('https://api.example.com/q', { params: { a: 1, b: 'x y' }, timeout: 5000, adapter: workerFetchAdapter });
        assert.deepEqual(res.data, { ok: true });
    });
    assert.equal(seen.url, 'https://api.example.com/q?a=1&b=x+y');
    assert.equal('cache' in seen.init, false);
    assert.equal(seen.init.method, 'GET');
});

test('worker axios adapter rejects non-2xx like axios does', async () => {
    await withFetch(async () => new Response('nope', { status: 503 }), async () => {
        await assert.rejects(axios.get('https://api.example.com/q', { adapter: workerFetchAdapter }), (e) => e.response?.status === 503);
    });
});

test('FIRMS key is read per call (Pages fills process.env after module load) and FIRMS_API_KEY is an alias', async () => {
    delete process.env.FIRMS_MAP_KEY; delete process.env.FIRMS_API_KEY;
    const { firmsKey } = await import('../server/lib/firms.mjs');
    assert.equal(firmsKey(), '');
    process.env.FIRMS_API_KEY = 'alias-key';
    assert.equal(firmsKey(), 'alias-key');
    process.env.FIRMS_MAP_KEY = 'map-key';
    assert.equal(firmsKey(), 'map-key');
    delete process.env.FIRMS_MAP_KEY; delete process.env.FIRMS_API_KEY;
});

test('FIRMS without a key returns an explicit empty payload, never a silent calm', async () => {
    delete process.env.FIRMS_MAP_KEY; delete process.env.FIRMS_API_KEY;
    const { fetchFirmsPayload } = await import('../server/lib/firms.mjs');
    const p = await fetchFirmsPayload('middleeast');
    assert.equal(p.meta.source, 'no_firms_key');
    assert.equal(p.features.length, 0);
});

test('ACLED: OR syntax, missing-var naming, OAuth token request', async () => {
    assert.equal(acledOr('country', ['Iran', 'Iraq']), 'Iran:OR:country=Iraq');
    delete process.env.ACLED_EMAIL; delete process.env.ACLED_PASSWORD;
    assert.deepEqual(missingAcledVars(), ['ACLED_EMAIL', 'ACLED_PASSWORD']);
    assert.equal(await getAcledToken(), null);
    process.env.ACLED_EMAIL = 'a@b.c'; process.env.ACLED_PASSWORD = 'pw';
    resetAcledTokenCache();
    let body;
    const token = await getAcledToken({ fetchImpl: async (url, init) => { body = String(init.body); assert.equal(url, 'https://acleddata.com/oauth/token'); return new Response('{"access_token":"T","expires_in":86400}'); } });
    assert.equal(token, 'T');
    assert.match(body, /grant_type=password/);
    assert.match(body, /client_id=acled/);
    delete process.env.ACLED_EMAIL; delete process.env.ACLED_PASSWORD;
    resetAcledTokenCache();
});

test('ACLED without credentials serves labelled demo events, never source=acled', async () => {
    delete process.env.ACLED_EMAIL; delete process.env.ACLED_PASSWORD; delete process.env.ACLED_API_KEY;
    const { fetchAcledEvents } = await import('../server/lib/acled.mjs');
    const p = await fetchAcledEvents({ theater: 'middleeast' });
    assert.notEqual(p.source, 'acled');
});

test('infrastructure registry carries its curated source and real as-of date', async () => {
    const { computeInfrastructureStatus, INFRA_REGISTRY_AS_OF } = await import('../server/lib/infrastructure.mjs');
    const p = computeInfrastructureStatus(new Map());
    assert.equal(p.source, 'curated_registry');
    assert.equal(p.asOf, INFRA_REGISTRY_AS_OF);
    assert.ok(p.updatedAt.startsWith(INFRA_REGISTRY_AS_OF));
});
