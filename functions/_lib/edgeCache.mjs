/**
 * Edge cache for /api/* (Cloudflare Cache API, per data centre).
 *
 * The in-memory cache in cache.mjs lives inside one isolate; Pages spins up
 * many isolates, so before this every cold isolate re-hit Yahoo, GDELT,
 * OpenSky, Copernicus... on its first request. Cloudflare has no spend cap on
 * Functions, so a traffic spike (or a client retry loop) multiplied upstream
 * calls and Function CPU. This layer answers repeat requests from the edge
 * cache for a short, per-route TTL, and normalises the cache key to the query
 * parameters each route actually reads — so `?x=<random>` cannot bust it.
 *
 * Not cached: health/diagnostic routes and routes computed from isolate state
 * (escalation, strike-stats, fronts), and anything that is not a 200.
 * Non-live answers (sample / stale / unconfigured) get a short TTL so a feed
 * that recovers shows up within a minute.
 */

// path prefix → TTL seconds. First match wins; order specific before general.
export const EDGE_TTLS = [
    ['/api/ticker', 180],
    ['/api/briefings/', 120],
    ['/api/news-rss', 300],
    ['/api/regional-news', 300],
    ['/api/firms', 600],
    ['/api/humanitarian', 3600],
    ['/api/infrastructure', 300],
    ['/api/nga-warnings', 900],
    ['/api/quakes', 300],
    ['/api/sentiment', 900],
    ['/api/flights', 60],
    ['/api/military-flights', 60],
    ['/api/vessels', 120],
    ['/api/rainviewer', 300],
    ['/api/acled', 3600],
    ['/api/oil-prices', 1800],
    ['/api/markets', 60],
    ['/api/sar', 1800],
    ['/api/outages', 600],
    ['/api/wind', 1800],
    ['/api/jaxa-aerosol', 1800],
    ['/api/flood', 300],
    ['/api/oracle', 300],
    ['/api/stac/search', 1800],
    ['/api/stac/presets', 86400],
    ['/api/cog/probe', 3600],
    ['/api/copernicus/preview', 1200],
];

export const NON_LIVE_TTL = 60;

// Query parameters any route reads. Everything else is dropped from the key.
const KEY_PARAMS = new Set([
    'sourceIds', 'q', 'hl', 'region', 'code', 'theater', 'since', 'bbox',
    'datetime', 'maxCloudCover', 'source', 'url', 'limit', 'days', 'lat',
    'lon', 'zoom', 'width', 'height', 'preset', 'date', 'from', 'to', 'mode',
    'layer', 'country', 'id',
]);

// Copernicus / COG previews parse arbitrary option names; keep every param.
const KEEP_ALL_PARAMS = ['/api/copernicus/preview', '/api/cog/probe'];

export const edgeTtlFor = (pathname) => {
    for (const [prefix, ttl] of EDGE_TTLS) {
        if (prefix.endsWith('/')) {
            if (pathname.startsWith(prefix)) return ttl;
        } else if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
            return ttl;
        }
    }
    return 0;
};

export const edgeCacheKey = (requestUrl) => {
    const url = new URL(requestUrl);
    const keepAll = KEEP_ALL_PARAMS.some((p) => url.pathname.startsWith(p));
    const entries = [...url.searchParams.entries()]
        .filter(([k]) => keepAll || KEY_PARAMS.has(k))
        .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
    const key = new URL(url.origin + url.pathname);
    for (const [k, v] of entries) key.searchParams.append(k, v);
    return key.toString();
};

const isLiveStatus = (status) => !status || status === 'live';

export const withEdgeCache = async (request, handler, { cache, waitUntil } = {}) => {
    const url = new URL(request.url);
    const ttl = request.method === 'GET' ? edgeTtlFor(url.pathname) : 0;
    const store = cache ?? (typeof caches !== 'undefined' ? caches.default : null);
    if (!ttl || !store) return handler(request);

    const key = new Request(edgeCacheKey(request.url), { method: 'GET' });
    try {
        const hit = await store.match(key);
        if (hit) {
            const out = new Response(hit.body, hit);
            out.headers.set('X-Edge-Cache', 'HIT');
            return out;
        }
    } catch {
        // Cache API unavailable (local dev) — fall through to the handler.
    }

    const response = await handler(request);
    if (response.status !== 200) return response;

    const live = isLiveStatus(response.headers.get('X-Tech-Status'));
    const effectiveTtl = live ? ttl : Math.min(ttl, NON_LIVE_TTL);
    const out = new Response(response.body, response);
    out.headers.set('Cache-Control', `public, max-age=0, s-maxage=${effectiveTtl}`);
    out.headers.set('X-Edge-Cache', 'MISS');
    out.headers.set('X-Edge-TTL', String(effectiveTtl));
    try {
        const put = store.put(key, out.clone());
        if (waitUntil) waitUntil(put.catch(() => {}));
        else await put.catch(() => {});
    } catch {
        // never fail the request because the cache write failed
    }
    return out;
};
