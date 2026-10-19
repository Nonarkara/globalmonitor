import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { validateApiRequest, parseFloodSimulation } from '../server/lib/publicApiInput.mjs';
import { handleApiRequest } from '../functions/_lib/router.mjs';
import { buildForecast } from '../server/lib/oracle/index.mjs';
import { groqChat } from '../server/lib/groqClient.mjs';
import { openrouterChat, isOpenRouterEnabled } from '../server/lib/openrouter.mjs';
import { generateBriefingSummary } from '../server/lib/gemini.mjs';
import { describeCacheEntries } from '../server/lib/cacheHealth.mjs';
import { resolveSourceHealth } from '../src/services/sourceHealth.js';
import { createRequestLimiter } from '../server/lib/requestLimit.mjs';

const url = query => new URL(`https://example.test${query}`);

test('request bursts throttle, refill and stay bounded without evicting active identities', () => {
    let time = 0;
    const limit = createRequestLimiter({ capacity: 2, perMinute: 60, maxKeys: 1, now: () => time });
    assert.equal(limit('a').allowed, true);
    assert.equal(limit('a').allowed, true);
    assert.deepEqual(limit('a'), { allowed: false, retryAfter: 1 });
    assert.equal(limit('b').allowed, true);
    assert.equal(limit('c').allowed, true);
    assert.equal(limit('d').allowed, false, 'overflow identities share one bounded bucket');
    assert.equal(limit('a').allowed, false, 'memory pressure never resets an active caller');
    time = 1000;
    assert.equal(limit('a').allowed, true);
    assert.equal(limit('a').allowed, false);
});

test('Pages rate limit returns 429 and Retry-After without an upstream request', async () => {
    let response;
    for (let i = 0; i < 100; i++) response = await handleApiRequest(new Request(url('/api/health'), { headers: { 'CF-Connecting-IP': 'qa-isolated-caller' } }), {});
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('Retry-After')) >= 1);
});

test('public validation rejects abusive variants before any loader call', async () => {
    const requests = [
        '/api/flights?theater=unknown', '/api/oracle?scenario=unknown',
        '/api/oracle?escDelta=NaN', '/api/oracle?escDelta=21',
        '/api/oracle?p=iran:Infinity', '/api/oracle?p=iran:0.1,iran:0.2',
        '/api/oracle?p=__proto__:0.5', '/api/oracle?theater=thailand&scenario=ceasefire',
        '/api/flood/directive?delta=', '/api/flood/directive?delta=0&km2=-1',
        '/api/flood/directive?km2=1', '/api/flood?city=unknown',
        '/api/flood/directive?delta=1&pois=' + encodeURIComponent('<script>'),
        '/api/ticker?sourceIds=nonexistent', '/api/briefings/nonexistent',
        '/api/news-rss?q=' + 'a'.repeat(301), '/api/health?theater=global&theater=thailand',
        '/api/regional-news?region=nonexistent&code=TH',
    ];
    for (const query of requests) {
        const response = await handleApiRequest(new Request(url(query)), {});
        assert.equal(response.status, 400, query);
    }
});

test('equivalent slider variants have canonical cache keys; valid UI extremes work', () => {
    const a = url('/api/oracle?theater=worldwide&p=usa:0.10,iran:-0.20&escDelta=020');
    const b = url('/api/oracle?theater=global&p=iran:-0.2,usa:0.1&escDelta=20');
    validateApiRequest(a); validateApiRequest(b);
    assert.equal(a.searchParams.get('p'), b.searchParams.get('p'));
    assert.equal(a.searchParams.get('theater'), 'global');
    assert.equal(a.searchParams.get('escDelta'), '20');
    validateApiRequest(url('/api/oracle?theater=thailand&scenario=border_incident&p=thai_gov:1&escDelta=-20'));
});

test('no flood simulation parameter means null, not an invented zero-area run', () => {
    assert.equal(parseFloodSimulation(new URLSearchParams()), null);
    assert.deepEqual(parseFloodSimulation(new URLSearchParams('delta=0')), { deltaM: 0, floodedKm2: null, floodedPois: [] });
});

test('configured external AI keys do not authorize public calls', async () => {
    const originalFetch = globalThis.fetch;
    const old = process.env.GROQ_API_KEY;
    const oldGemini = process.env.GEMINI_API_KEY;
    const oldOpenRouter = process.env.OPENROUTER_API_KEY;
    let calls = 0;
    process.env.GROQ_API_KEY = 'test-only-not-a-secret';
    process.env.GEMINI_API_KEY = 'test-only-not-a-secret';
    process.env.OPENROUTER_API_KEY = 'test-only-not-a-secret';
    globalThis.fetch = async () => { calls++; throw new Error('Unexpected external AI call'); };
    try {
        assert.equal(await groqChat([{ role: 'user', content: 'test' }]), null);
        assert.equal(await openrouterChat([{ role: 'user', content: 'test' }]), null);
        assert.equal(isOpenRouterEnabled(), true);
        assert.equal(await generateBriefingSummary('test', [{ title: 'test', source: 'test' }]), null);
        const report = await buildForecast(new Map(), 'global');
        assert.equal(report.meta.aiPowered, false);
        assert.equal(report.theater, 'middleeast');
        assert.match(report.scopeNote, /no calibrated global forecast/);
        const response = await handleApiRequest(new Request(url('/api/oracle?theater=global')), {});
        assert.equal(response.status, 200);
        assert.equal((await response.json()).meta.aiPowered, false);
        assert.equal(calls, 0);
    } finally {
        globalThis.fetch = originalFetch;
        if (old === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = old;
        if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
        if (oldOpenRouter === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = oldOpenRouter;
    }
});

test('openrouter client refuses public calls and returns null without a key', async () => {
    const originalFetch = globalThis.fetch;
    const oldKey = process.env.OPENROUTER_API_KEY;
    let calls = 0;
    delete process.env.OPENROUTER_API_KEY;
    globalThis.fetch = async () => { calls++; throw new Error('Unexpected external AI call'); };
    try {
        assert.equal(isOpenRouterEnabled(), false);
        // No key → returns null without hitting the network.
        assert.equal(await openrouterChat([{ role: 'user', content: 'hi' }]), null);
        assert.equal(calls, 0);
        // allowExternalAi must be true even with a key — public paths never
        // set it, so the call still returns null and never leaves the box.
        process.env.OPENROUTER_API_KEY = 'test-only-not-a-secret';
        assert.equal(await openrouterChat([{ role: 'user', content: 'hi' }]), null);
        assert.equal(calls, 0);
    } finally {
        globalThis.fetch = originalFetch;
        if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = oldKey;
    }
});

test('health uses exact theater and distinguishes snapshot, sample and provider evidence', () => {
    const cache = new Map([
        ['acled:middleeast', { payload: { source: 'demo_offline_no_acled_key' }, updatedAt: '2026-10-02', expiresAt: 200 }],
        ['acled:thailand', { payload: { source: 'acled' }, updatedAt: '2026-10-02', expiresAt: 200 }],
        ['flights:v3:global', { payload: { meta: { source: 'adsb-snapshot', staticSnapshot: true, collectedAt: '2026-01-01' } }, updatedAt: '2026-10-02', expiresAt: 200 }],
        ['vessels:global', { payload: { meta: { source: 'aisstream.io', fetchedAt: '2026-10-02' } }, updatedAt: '2026-10-02', expiresAt: 200 }],
    ]);
    const payload = { cacheEntries: describeCacheEntries(cache, 100) };
    assert.equal(resolveSourceHealth('acled', payload, 'middleeast').status, 'sample');
    assert.equal(resolveSourceHealth('acled', payload, 'thailand').status, 'cached');
    assert.equal(resolveSourceHealth('acled', payload, 'global').status, 'not observed');
    assert.equal(resolveSourceHealth('opensky', payload, 'global').status, 'stale');
    assert.equal(resolveSourceHealth('opensky', payload, 'global').observedAt, '2026-01-01');
    assert.equal(resolveSourceHealth('vesselfinder', payload, 'global').status, 'other source');
});

test('public routers explicitly keep external-AI paths off', async () => {
    for (const file of ['functions/_lib/router.mjs', 'server/index.mjs']) {
        const text = await fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
        assert.match(text, /buildOracleForecast\(cache, theater, injection, \{ narrate: false \}\)/);
        assert.match(text, /buildFloodDirective\(opsResult.payload, sim, \{ allowLlm: false \}\)/);
        assert.match(text, /validateApiRequest\(url\)/);
    }
});
