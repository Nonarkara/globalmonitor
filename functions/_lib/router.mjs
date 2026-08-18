import {
    buildCopernicusUnavailablePayload,
    fetchCopernicusPreview,
    isCopernicusConfigured,
    parseCopernicusPreviewOptions
} from '../../server/lib/copernicus.mjs';
import { fetchBriefingPayload, fetchTickerPayload } from '../../server/lib/intelligence.mjs';
import { fetchMarketPayload } from '../../server/lib/marketData.mjs';
import { fetchFirmsPayload } from '../../server/lib/firms.mjs';
import { computeEscalation } from '../../server/lib/escalation.mjs';
import { computeStrikeStats } from '../../server/lib/strikeStats.mjs';
import { fetchHumanitarianPayload } from '../../server/lib/humanitarian.mjs';
import { computeInfrastructureStatus } from '../../server/lib/infrastructure.mjs';
import { fetchGdeltSentiment } from '../../server/lib/gdelt.mjs';
import { fetchFlightsPayload } from '../../server/lib/flights.mjs';
import { FLIGHTS_CACHE_TTL_MS } from '../../server/lib/airplanesLive.mjs';
import { computeFrontStatus } from '../../server/lib/frontStatus.mjs';
import { fetchNgaWarnings } from '../../server/lib/ngaWarnings.mjs';
import { fetchUsgsQuakes } from '../../server/lib/usgsQuakes.mjs';
import { fetchAcledEvents } from '../../server/lib/acled.mjs';
import { fetchOilPriceTimeline } from '../../server/lib/eia.mjs';
import { searchStacScenes } from '../../server/lib/stacCatalog.mjs';
import { searchPlanetaryComputer } from '../../server/lib/planetaryComputer.mjs';
import { listPresets as listEvalscriptPresets } from '../../server/lib/evalscripts.mjs';
import { probeCog } from '../../server/lib/cogReader.mjs';
import { ingestRegionalNews, fetchArbitraryRssQuery } from '../../server/lib/regionalNewsIngest.mjs';
import { getRainviewerRadarTilesWorker as getRainviewerRadarTiles } from './rainviewerWorker.mjs';
import {
    isSupabaseEnabled,
    getSupabaseStatusMessage,
    upsertAcledEvents,
    upsertFirmsHotspots,
    upsertMarketQuotes,
    upsertSentimentReadings
} from '../../server/lib/supabase.mjs';
import { getSharedCache, recordHealth, useCached, getCacheEntries, getLoaderHealth } from './cache.mjs';
import { fetchVesselsPayload } from './vessels.mjs';
import { jsonResponse, optionsResponse } from './response.mjs';

const applyEnv = (env = {}) => {
    for (const [key, value] of Object.entries(env)) {
        if (value != null && value !== '') {
            process.env[key] = String(value);
        }
    }
};

const parseSourceIds = (searchParams) => {
    const raw = searchParams.get('sourceIds');
    if (!raw) return null;
    return raw.split(',').map((value) => value.trim()).filter(Boolean);
};

export const fetchFlightSnapshot = async (request, livePayload, next) => {
    const snapshotUrl = new URL('/data/flights/opensky-snapshot.geojson', request.url);
    const snapshotRequest = new Request(snapshotUrl, {
        headers: { accept: 'application/geo+json, application/json' },
    });
    const response = next
        ? await next(snapshotRequest)
        : await fetch(snapshotRequest, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return livePayload;
    const snapshot = await response.json();
    if (!Array.isArray(snapshot?.features) || snapshot.features.length < 50) return livePayload;
    return {
        ...snapshot,
        meta: {
            ...snapshot.meta,
            source: 'opensky-snapshot',
            stale: true,
            liveError: livePayload?.meta?.error || 'Live flight providers unavailable',
        },
    };
};

export async function handleApiRequest(request, env, next) {
    applyEnv(env);

    if (request.method === 'OPTIONS') {
        return optionsResponse();
    }

    if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { status: 'offline' });
    }

    const url = new URL(request.url);
    const sourceIds = parseSourceIds(url.searchParams);
    const cache = getSharedCache();

    try {
        if (url.pathname === '/api/health') {
            return jsonResponse({
                ok: true,
                now: new Date().toISOString(),
                runtime: 'cloudflare-pages',
                cacheEntries: getCacheEntries(),
                loaderHealth: Object.fromEntries(getLoaderHealth().entries())
            });
        }

        if (url.pathname === '/api/supabase-health') {
            return jsonResponse({
                enabled: isSupabaseEnabled(),
                message: getSupabaseStatusMessage()
            });
        }

        if (url.pathname === '/api/ticker') {
            const result = await useCached(
                `ticker:${sourceIds?.join(',') || 'default'}`,
                180000,
                () => fetchTickerPayload(sourceIds),
                (payload) => Array.isArray(payload) && payload.length > 0
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname.startsWith('/api/briefings/')) {
            const briefingId = decodeURIComponent(url.pathname.replace('/api/briefings/', ''));
            const result = await useCached(
                `briefing:${briefingId}:${sourceIds?.join(',') || 'default'}`,
                120000,
                () => fetchBriefingPayload(briefingId, sourceIds),
                (payload) => Array.isArray(payload?.items) && payload.items.length > 0
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/news-rss') {
            const q = url.searchParams.get('q');
            const hl = url.searchParams.get('hl') || 'en-US';
            if (!q) {
                return jsonResponse({ error: 'Missing required ?q param' }, 400);
            }
            try {
                const result = await useCached(
                    `news-rss:${q}:${hl}`,
                    5 * 60 * 1000,
                    () => fetchArbitraryRssQuery(q, hl),
                    (items) => Array.isArray(items) && items.length > 0
                );
                recordHealth('news-rss', !!result.payload?.length, result.payload?.length ? null : 'empty RSS result');
                return jsonResponse(result.payload, 200, result.meta);
            } catch (error) {
                recordHealth('news-rss', false, error.message);
                return jsonResponse([], 200, { status: 'error', updatedAt: new Date().toISOString(), cache: 'miss' });
            }
        }

        if (url.pathname === '/api/regional-news') {
            const region = url.searchParams.get('region') || 'indopacific';
            const code = (url.searchParams.get('code') || '').toUpperCase();
            if (!code) {
                return jsonResponse({ error: 'Missing required ?code param' }, 400);
            }
            const result = await useCached(
                `regional-news:${region}:${code}`,
                5 * 60 * 1000,
                () => ingestRegionalNews(region, code),
                (payload) => Array.isArray(payload?.items) && payload.items.length > 0
            );
            recordHealth('regional-news', !!result.payload?.items?.length, result.payload?.status || null);
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/firms') {
            const theater = url.searchParams.get('theater') || 'middleeast';
            const result = await useCached(
                `firms:${theater}`,
                10 * 60 * 1000,
                () => fetchFirmsPayload(theater),
                (payload) => payload?.type === 'FeatureCollection'
            );
            if (result.meta.cache !== 'hit') upsertFirmsHotspots(result.payload, theater).catch(() => {});
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/escalation') {
            const payload = computeEscalation(cache);
            return jsonResponse(payload, 200, { status: 'live', updatedAt: payload.updatedAt, cache: 'miss' });
        }

        if (url.pathname === '/api/strike-stats') {
            const payload = computeStrikeStats(cache);
            return jsonResponse(payload, 200, { status: 'live', updatedAt: new Date().toISOString(), cache: 'miss' });
        }

        if (url.pathname === '/api/humanitarian') {
            const theater = url.searchParams.get('theater') || 'middleeast';
            const result = await useCached(
                `humanitarian:${theater}`,
                60 * 60 * 1000,
                () => fetchHumanitarianPayload(theater),
                (p) => p?.geojson?.type === 'FeatureCollection'
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/infrastructure') {
            const payload = computeInfrastructureStatus(cache);
            return jsonResponse(payload, 200, { status: 'live', updatedAt: payload.updatedAt, cache: 'miss' });
        }

        if (url.pathname === '/api/fronts') {
            const payload = computeFrontStatus(cache);
            return jsonResponse(payload, 200, { status: 'live', updatedAt: payload.updatedAt, cache: 'miss' });
        }

        if (url.pathname === '/api/nga-warnings') {
            try {
                const result = await useCached(
                    'nga-warnings',
                    30 * 60 * 1000,
                    () => fetchNgaWarnings(),
                    (p) => Array.isArray(p?.warnings)
                );
                return jsonResponse(result.payload, 200, result.meta);
            } catch (error) {
                recordHealth('nga-warnings', false, error.message);
                return jsonResponse(
                    { warnings: [], total: 0, highThreat: 0, elevatedThreat: 0, updatedAt: null, error: error.message },
                    200,
                    { status: 'error', updatedAt: new Date().toISOString(), cache: 'miss' }
                );
            }
        }

        if (url.pathname === '/api/quakes') {
            const theater = url.searchParams.get('theater') || 'middleeast';
            const result = await useCached(
                `quakes:${theater}`,
                10 * 60 * 1000,
                () => fetchUsgsQuakes(theater),
                (p) => p?.summary != null
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/sentiment') {
            const theater = url.searchParams.get('theater') || 'middleeast';
            const result = await useCached(
                `gdelt:${theater}`,
                30 * 60 * 1000,
                () => fetchGdeltSentiment(theater),
                (p) => Array.isArray(p?.timeline) && p.timeline.length > 0
            );
            if (result.meta.cache !== 'hit') upsertSentimentReadings(result.payload).catch(() => {});
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/flights') {
            const theater = url.searchParams.get('theater') || 'global';
            const minCount = theater === 'global' ? 50 : 3;
            const result = await useCached(
                `flights:v3:${theater}`,
                FLIGHTS_CACHE_TTL_MS,
                async () => {
                    const livePayload = await fetchFlightsPayload(theater);
                    if ((livePayload.features?.length ?? 0) >= minCount || theater !== 'global') {
                        return livePayload;
                    }
                    return fetchFlightSnapshot(request, livePayload, next);
                },
                (p) => p?.type === 'FeatureCollection' && (p.features?.length ?? 0) >= minCount
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/vessels') {
            const theater = url.searchParams.get('theater') || 'global';
            const cacheKey = `vessels:v7:${theater}`;
            const ttlMs = FLIGHTS_CACHE_TTL_MS;
            const now = Date.now();
            const cached = getSharedCache().get(cacheKey);
            if (cached && cached.expiresAt > now) {
                recordHealth(cacheKey, true, null);
                const payload = cached.payload;
                return jsonResponse(payload, 200, {
                    status: payload.meta?.connected ? 'live' : (payload.meta?.requiresKey ? 'unconfigured' : 'stale'),
                    cache: 'hit',
                    updatedAt: cached.updatedAt,
                });
            }

            const payload = await fetchVesselsPayload(theater, { origin: url.origin, next });
            const count = payload.features?.length ?? 0;
            const usable = payload?.type === 'FeatureCollection' && (count > 0 || payload.meta?.requiresKey);
            if (usable) {
                const updatedAt = new Date().toISOString();
                getSharedCache().set(cacheKey, {
                    payload,
                    updatedAt,
                    expiresAt: now + ttlMs,
                });
                recordHealth(cacheKey, true, null);
            } else if (cached?.payload?.features?.length > 0) {
                recordHealth(cacheKey, true, payload.meta?.aisError || 'stale hold');
                return jsonResponse(cached.payload, 200, {
                    status: 'stale',
                    cache: 'stale-hold',
                    updatedAt: cached.updatedAt,
                });
            } else {
                recordHealth(cacheKey, false, payload.meta?.aisError || 'empty vessel snapshot');
            }

            return jsonResponse(payload, 200, {
                status: payload.meta?.connected ? 'live' : (payload.meta?.requiresKey ? 'unconfigured' : 'stale'),
                cache: usable ? 'miss' : 'bypass',
                updatedAt: payload.meta?.fetchedAt,
            });
        }

        if (url.pathname === '/api/rainviewer') {
            const result = await useCached(
                'rainviewer:radar',
                5 * 60 * 1000,
                () => getRainviewerRadarTiles(),
                (p) => Array.isArray(p?.tiles) && p.tiles.length > 0
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/acled') {
            const since = url.searchParams.get('since');
            const theater = url.searchParams.get('theater') || 'middleeast';
            const cacheKey = since ? `acled:${theater}:${since}` : `acled:${theater}`;
            const result = await useCached(
                cacheKey,
                60 * 60 * 1000,
                () => fetchAcledEvents(since ? { since, theater } : { theater }),
                (p) => p?.type === 'FeatureCollection'
            );
            if (result.meta.cache !== 'hit') upsertAcledEvents(result.payload).catch(() => {});
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/oil-prices') {
            const result = await useCached(
                'oil-prices',
                30 * 60 * 1000,
                () => fetchOilPriceTimeline(),
                (p) => Array.isArray(p?.brent)
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/markets') {
            const result = await useCached(
                'markets',
                60000,
                () => fetchMarketPayload(),
                (payload) => Array.isArray(payload) && payload.length > 0
            );
            if (result.meta.cache !== 'hit') upsertMarketQuotes(result.payload).catch(() => {});
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/stac/search') {
            const bbox = url.searchParams.get('bbox');
            if (!bbox) {
                return jsonResponse({ error: 'bbox parameter required (west,south,east,north)' }, 400);
            }
            const bboxArr = bbox.split(',').map(Number);
            if (bboxArr.length !== 4 || bboxArr.some((n) => !Number.isFinite(n))) {
                return jsonResponse({ error: 'bbox must be 4 comma-separated numbers' }, 400);
            }
            const datetime = url.searchParams.get('datetime') || undefined;
            const maxCloudCover = Number(url.searchParams.get('maxCloudCover') || 20);
            const source = url.searchParams.get('source') || 'copernicus';
            const cacheKeySuffix = `${bbox}_${datetime || 'latest'}_${maxCloudCover}_${source}`;
            const result = await useCached(
                `stac:${cacheKeySuffix}`,
                30 * 60 * 1000,
                async () => {
                    if (source === 'planetary-computer') {
                        return searchPlanetaryComputer({ bbox: bboxArr, datetime, maxCloudCover });
                    }
                    return searchStacScenes({ bbox: bboxArr, datetime, maxCloudCover });
                },
                (p) => p?.type === 'FeatureCollection'
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        if (url.pathname === '/api/stac/presets') {
            return jsonResponse(listEvalscriptPresets());
        }

        if (url.pathname === '/api/cog/probe') {
            const cogUrl = url.searchParams.get('url');
            if (!cogUrl) {
                return jsonResponse({ error: 'url parameter required' }, 400);
            }
            const probeResult = await probeCog(cogUrl);
            return jsonResponse(probeResult);
        }

        if (url.pathname === '/api/copernicus/preview') {
            const options = parseCopernicusPreviewOptions(url.searchParams);

            if (!isCopernicusConfigured()) {
                return jsonResponse(
                    buildCopernicusUnavailablePayload(options),
                    200,
                    { status: 'live', updatedAt: '', cache: 'miss' }
                );
            }

            const cacheKey = `copernicus:${JSON.stringify(options)}`;
            const result = await useCached(
                cacheKey,
                20 * 60 * 1000,
                () => fetchCopernicusPreview(options),
                (payload) => payload?.available === true
                    && typeof payload?.imageDataUrl === 'string'
                    && payload.imageDataUrl.startsWith('data:image/')
            );
            return jsonResponse(result.payload, 200, result.meta);
        }

        return jsonResponse({ error: 'Not found' }, 404, { status: 'offline' });
    } catch (error) {
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            { status: 'offline' }
        );
    }
}
