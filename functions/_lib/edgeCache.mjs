/**
 * Edge cache for /api/* (Cloudflare Cache API, per data centre).
 *
 * The in-memory cache in cache.mjs lives inside one isolate; Pages spins up
 * many isolates, so every cold isolate re-hit the upstreams on its first
 * request. Cloudflare has no spend cap on Functions, so a traffic spike (or a
 * client retry loop) multiplied upstream calls and Function CPU. This layer
 * answers repeat requests from the edge cache for a short, per-route TTL.
 *
 * Correctness rules (a shared cache must never hand one request another's
 * answer):
 *  - Routes match EXACTLY (or by an explicit `prefix: true` entry), so
 *    /api/flood never covers /api/flood/directive.
 *  - Each route lists every query parameter its handler reads (router.mjs /
 *    the parsers it calls). The key is built from exactly those, read with
 *    URLSearchParams.get() — the same first-value semantics the handler uses —
 *    so unknown params (`?x=<random>`) cannot bust the cache, and every param
 *    that changes the answer is in the key.
 *  - Simulation / scenario / what-if requests (`bypassIf`) are never edge
 *    cached; only the plain live default is.
 *  - Not cached: health/diagnostic routes, routes computed from isolate state
 *    (escalation, strike-stats, fronts), unlisted routes, and any non-200.
 *  - Non-live answers (sample / stale / unconfigured) get a short TTL so a feed
 *    that recovers shows up within a minute.
 */

const COPERNICUS_PARAMS = ['theater', 'preset', 'bbox', 'width', 'height', 'maxCloudCoverage', 'lookbackDays', 'from', 'to'];

export const EDGE_ROUTES = {
    '/api/ticker': { ttl: 180, params: ['sourceIds'] },
    '/api/briefings/': { ttl: 120, params: ['sourceIds'], prefix: true },
    '/api/news-rss': { ttl: 300, params: ['q', 'hl'] },
    '/api/regional-news': { ttl: 300, params: ['region', 'code'] },
    '/api/firms': { ttl: 600, params: ['theater'] },
    '/api/humanitarian': { ttl: 3600, params: ['theater'] },
    '/api/infrastructure': { ttl: 300, params: [] },
    '/api/nga-warnings': { ttl: 900, params: [] },
    '/api/quakes': { ttl: 300, params: ['theater'] },
    '/api/sentiment': { ttl: 900, params: ['theater'] },
    '/api/flights': { ttl: 60, params: ['theater'] },
    '/api/vessels': { ttl: 120, params: ['theater'] },
    '/api/rainviewer': { ttl: 300, params: [] },
    '/api/acled': { ttl: 3600, params: ['theater', 'since'] },
    '/api/oil-prices': { ttl: 1800, params: [] },
    '/api/markets': { ttl: 60, params: [] },
    '/api/outages': { ttl: 600, params: [] },
    '/api/wind': { ttl: 1800, params: ['theater'] },
    '/api/jaxa-aerosol': { ttl: 1800, params: [] },
    // Live flood ops per city. City is in the key: Chiang Mai ≠ Ayutthaya.
    '/api/flood': { ttl: 300, params: ['city'] },
    // Live directive only; any sandbox simulation param bypasses the cache.
    '/api/flood/directive': { ttl: 300, params: ['city'], bypassIf: ['delta', 'km2', 'pois'] },
    // Baseline forecast only; scenario / what-if injections bypass the cache.
    '/api/oracle': { ttl: 300, params: ['theater'], bypassIf: ['scenario', 'escDelta', 'p'] },
    '/api/stac/search': { ttl: 1800, params: ['bbox', 'datetime', 'maxCloudCover', 'source'] },
    '/api/stac/presets': { ttl: 86400, params: [] },
    '/api/cog/probe': { ttl: 3600, params: ['url'] },
    '/api/copernicus/preview': { ttl: 1200, params: COPERNICUS_PARAMS },
};

export const NON_LIVE_TTL = 60;

export const edgeRouteFor = (pathname) => {
    const exact = EDGE_ROUTES[pathname];
    if (exact && !exact.prefix) return exact;
    for (const [path, route] of Object.entries(EDGE_ROUTES)) {
        if (route.prefix && pathname.startsWith(path) && pathname.length > path.length) return route;
    }
    return null;
};

export const edgeTtlFor = (pathname) => edgeRouteFor(pathname)?.ttl ?? 0;

/** Cache key for a request, or null when the request must not be edge cached. */
export const edgeCacheKey = (requestUrl) => {
    const url = new URL(requestUrl);
    const route = edgeRouteFor(url.pathname);
    if (!route) return null;
    if ((route.bypassIf || []).some((p) => url.searchParams.has(p))) return null;
    const key = new URL(url.origin + url.pathname);
    for (const p of [...route.params].sort()) {
        const v = url.searchParams.get(p);
        if (v !== null) key.searchParams.set(p, v);
    }
    return key.toString();
};

const isLiveStatus = (status) => !status || status === 'live';

export const withEdgeCache = async (request, handler, { cache, waitUntil } = {}) => {
    const url = new URL(request.url);
    const ttl = request.method === 'GET' ? edgeTtlFor(url.pathname) : 0;
    const keyUrl = ttl ? edgeCacheKey(request.url) : null;
    const store = cache ?? (typeof caches !== 'undefined' ? caches.default : null);
    if (!ttl || !keyUrl || !store) return handler(request);

    const key = new Request(keyUrl, { method: 'GET' });
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
