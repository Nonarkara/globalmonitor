import { fetchFleetVessels, getVesselFinderConfig } from '../../server/lib/vesselFinder.mjs';
import { AIS_BOXES_BY_THEATER, fetchAisSnapshotWithRetry } from './aisSnapshot.mjs';
import { getSharedCache } from './cache.mjs';

const AIS_CACHE_KEY = 'vessels:ais:global:v3';
const STATIC_SNAPSHOT_PATH = '/data/ais/ais-snapshot.json';
const AIS_CACHE_TTL_MS = 15 * 60 * 1000;
const AIS_STALE_HOLD_MS = 30 * 60 * 1000;

const THEATER_BBOXES = {
    thailand: [95, 0.5, 108, 22],
    indopacific: [90, -10, 135, 25],
    middleeast: [24, 10, 65, 42],
};

const filterByTheater = (features, theater) => {
    const bbox = THEATER_BBOXES[theater];
    if (!bbox || theater === 'global') return features;

    const [minLon, minLat, maxLon, maxLat] = bbox;
    return features.filter((feature) => {
        const coords = feature.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return false;
        const [lon, lat] = coords;
        return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
    });
};

const mergeFeatures = (primary, supplement) => {
    const byMmsi = new Map();
    for (const feature of primary) {
        const mmsi = feature.properties?.mmsi;
        if (mmsi) byMmsi.set(mmsi, feature);
    }
    for (const feature of supplement) {
        const mmsi = feature.properties?.mmsi;
        if (!mmsi || byMmsi.has(mmsi)) continue;
        byMmsi.set(mmsi, feature);
    }
    return [...byMmsi.values()];
};

/** Static snapshot baked into dist/ — fallback when Worker WebSocket collect is empty. */
async function loadStaticAisSnapshot(origin) {
    if (!origin) return { features: [], meta: null, error: 'no_origin' };

    const cache = getSharedCache();
    const staticKey = 'vessels:ais:static:v1';
    const cached = cache.get(staticKey);
    if (cached?.features?.length > 0) {
        return { features: cached.features, meta: cached.meta || null, cache: 'static-hit' };
    }

    try {
        const url = new URL(STATIC_SNAPSHOT_PATH, origin).href;
        const resp = await fetch(url, { cf: { cacheTtl: 300 } });
        if (!resp.ok) {
            return { features: [], meta: null, error: `static_fetch_${resp.status}` };
        }
        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('json')) {
            return { features: [], meta: null, error: 'static_fetch_not_json' };
        }
        const payload = await resp.json();
        const features = Array.isArray(payload?.features) ? payload.features : [];
        const meta = payload?.meta || null;
        if (features.length > 0) {
            cache.set(staticKey, { features, meta, loadedAt: Date.now() });
        }
        return { features, meta, cache: 'static-miss' };
    } catch (err) {
        return { features: [], meta: null, error: err.message || 'static_fetch_failed' };
    }
}

const cacheAisResult = (cache, now, features, aisSource, staticMeta, error, aisAttempt) => {
    cache.set(AIS_CACHE_KEY, {
        features,
        error: error || null,
        expiresAt: now + AIS_CACHE_TTL_MS,
        staleHoldUntil: now + AIS_STALE_HOLD_MS,
        collectedAt: now,
        aisSource,
        staticMeta,
    });
};

/** One global AIS collect per cache TTL — filter by theater downstream. */
async function getGlobalAisFeatures(apiKey, origin) {
    const cache = getSharedCache();
    const now = Date.now();
    const hit = cache.get(AIS_CACHE_KEY);
    if (hit && hit.expiresAt > now) {
        return { features: hit.features || [], error: hit.error || null, cache: 'hit' };
    }

    let features = [];
    let error = null;
    let aisSource = null;
    let staticMeta = null;
    let staticCache = null;
    let aisAttempt = null;

    if (apiKey) {
        const aisResult = await fetchAisSnapshotWithRetry(apiKey, {
            boundingBoxes: AIS_BOXES_BY_THEATER.global,
            timeoutMs: 22000,
            maxVessels: 8000,
            maxAttempts: 2,
        });
        aisAttempt = aisResult.attempt;
        if (aisResult.features?.length > 0) {
            features = aisResult.features;
            aisSource = 'live-ws';
        } else {
            error = aisResult.error || 'empty_ais_snapshot';
        }
    }

    if (features.length === 0) {
        const staticResult = await loadStaticAisSnapshot(origin);
        staticCache = staticResult.cache;
        staticMeta = staticResult.meta;
        if (staticResult.features.length > 0) {
            features = staticResult.features;
            aisSource = 'static-snapshot';
            error = null;
        } else if (!error) {
            error = staticResult.error || 'empty_ais_snapshot';
        }
    }

    if (features.length > 0) {
        cacheAisResult(cache, now, features, aisSource, staticMeta, null, aisAttempt);
        return {
            features,
            error: null,
            cache: aisSource === 'static-snapshot' ? 'static-fallback' : 'miss',
            aisAttempt,
            aisSource,
            staticMeta,
            staticCache,
        };
    }

    if (hit?.features?.length > 0 && (hit.staleHoldUntil ?? hit.expiresAt) > now) {
        return {
            features: hit.features,
            error,
            cache: 'stale-hold',
            aisAttempt,
            aisSource: hit.aisSource || null,
            staticMeta: hit.staticMeta || null,
        };
    }

    return {
        features: [],
        error,
        cache: 'bypass',
        aisAttempt,
        aisSource: null,
        staticMeta,
        staticCache,
    };
}

/** Worker-safe vessel feed — AIS one-shot snapshot + VesselFinder fleet REST. */
export async function fetchVesselsPayload(theater = 'global', { origin } = {}) {
    const vfConfig = getVesselFinderConfig();
    const aisKey = process.env.AISSTREAM_API_KEY || '';
    const hasAisKey = Boolean(aisKey);

    const fleetResult = vfConfig.fleetKey ? await fetchFleetVessels() : { vessels: [], fleetSize: 0, error: null };
    const fleet = fleetResult.vessels || [];

    let aisFeatures = [];
    let aisError = null;
    let aisCache = null;
    let aisAttempt = null;
    let aisSource = null;
    let staticMeta = null;
    if (hasAisKey) {
        try {
            const aisResult = await getGlobalAisFeatures(aisKey, origin);
            aisFeatures = aisResult.features;
            aisError = aisResult.error;
            aisCache = aisResult.cache;
            aisAttempt = aisResult.aisAttempt ?? null;
            aisSource = aisResult.aisSource ?? null;
            staticMeta = aisResult.staticMeta ?? null;
        } catch (err) {
            aisError = err.message;
        }
    } else {
        const staticResult = await loadStaticAisSnapshot(origin);
        if (staticResult.features.length > 0) {
            aisFeatures = staticResult.features;
            aisSource = 'static-snapshot';
            staticMeta = staticResult.meta;
            aisCache = staticResult.cache;
        }
    }

    const merged = mergeFeatures(fleet, aisFeatures);
    const filtered = filterByTheater(merged, theater);
    const theaterAisCount = filterByTheater(aisFeatures, theater).length;
    const sources = [];
    if ((hasAisKey || aisSource === 'static-snapshot') && theaterAisCount > 0) sources.push('aisstream.io');
    if (vfConfig.fleetKey) sources.push('vesselfinder-fleet');
    const fleetEmpty = vfConfig.fleetKey && fleet.length === 0;

    return {
        type: 'FeatureCollection',
        features: filtered,
        meta: {
            count: filtered.length,
            fetchedAt: new Date().toISOString(),
            source: sources.length ? sources.join('+') : 'none',
            sources,
            connected: ((hasAisKey || aisSource === 'static-snapshot') && theaterAisCount > 0) || (vfConfig.fleetKey && !fleetResult.error),
            coverage: (hasAisKey || aisSource === 'static-snapshot')
                ? (vfConfig.fleetKey ? 'ais-snapshot+fleet' : 'ais-snapshot')
                : (vfConfig.fleetKey ? 'fleet-only' : 'none'),
            requiresKey: !hasAisKey && !vfConfig.fleetKey,
            runtime: 'cloudflare-pages',
            aisGlobalCount: aisFeatures.length,
            aisCache,
            aisSource,
            staticSnapshotAt: staticMeta?.collectedAt ?? null,
            aisNote: hasAisKey
                ? (aisSource === 'static-snapshot'
                    ? 'Static AIS snapshot fallback (Worker WS empty) — refresh via scripts/refresh-ais-snapshot.mjs'
                    : 'Global AIS snapshot (15 min cache, 22s+8s collect + stale hold) filtered by theater bbox')
                : null,
            aisError,
            aisKeyPresent: hasAisKey,
            aisAttempt,
            vesselfinder: {
                fleetKey: vfConfig.fleetKey,
                apiKey: vfConfig.apiKey,
                fleetCount: fleet.length,
                fleetEmpty,
                fleetHint: fleetEmpty
                    ? 'Add vessels to your VesselFinder fleet (up to 10 on free plan) for tracked overlay'
                    : null,
                livedataNote: 'Worldwide area queries (LiveData) require paid VesselFinder subscription',
            },
            keyHint: (hasAisKey || vfConfig.fleetKey) ? null
                : 'Set AISSTREAM_API_KEY (aisstream.io) and/or VESSELFINDER_FLEET_KEY (vesselfinder.com)',
        },
    };
}
