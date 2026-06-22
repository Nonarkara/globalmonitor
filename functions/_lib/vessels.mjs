import { fetchFleetVessels, getVesselFinderConfig } from '../../server/lib/vesselFinder.mjs';
import { AIS_BOXES_BY_THEATER, fetchAisSnapshotWithRetry } from './aisSnapshot.mjs';
import { getSharedCache } from './cache.mjs';

const AIS_CACHE_KEY = 'vessels:ais:global:v3';
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

/** One global AIS collect per cache TTL — filter by theater downstream. */
async function getGlobalAisFeatures(apiKey) {
    const cache = getSharedCache();
    const now = Date.now();
    const hit = cache.get(AIS_CACHE_KEY);
    if (hit && hit.expiresAt > now) {
        return { features: hit.features || [], error: hit.error || null, cache: 'hit' };
    }

    const aisResult = await fetchAisSnapshotWithRetry(apiKey, {
        boundingBoxes: AIS_BOXES_BY_THEATER.global,
        timeoutMs: 45000,
        maxVessels: 8000,
        maxAttempts: 3,
    });
    const features = aisResult.features || [];
    const error = features.length === 0 ? (aisResult.error || null) : null;

    if (features.length > 0) {
        cache.set(AIS_CACHE_KEY, {
            features,
            error: null,
            expiresAt: now + AIS_CACHE_TTL_MS,
            staleHoldUntil: now + AIS_STALE_HOLD_MS,
            collectedAt: now,
        });
        return { features, error: null, cache: 'miss', aisAttempt: aisResult.attempt };
    }

    if (hit?.features?.length > 0 && (hit.staleHoldUntil ?? hit.expiresAt) > now) {
        return {
            features: hit.features,
            error,
            cache: 'stale-hold',
            aisAttempt: aisResult.attempt,
        };
    }

    return { features: [], error, cache: 'bypass', aisAttempt: aisResult.attempt };
}

/** Worker-safe vessel feed — AIS one-shot snapshot + VesselFinder fleet REST. */
export async function fetchVesselsPayload(theater = 'global') {
    const vfConfig = getVesselFinderConfig();
    const aisKey = process.env.AISSTREAM_API_KEY || '';
    const hasAisKey = Boolean(aisKey);

    const fleetResult = vfConfig.fleetKey ? await fetchFleetVessels() : { vessels: [], fleetSize: 0, error: null };
    const fleet = fleetResult.vessels || [];

    let aisFeatures = [];
    let aisError = null;
    let aisCache = null;
    let aisAttempt = null;
    if (hasAisKey) {
        try {
            const aisResult = await getGlobalAisFeatures(aisKey);
            aisFeatures = aisResult.features;
            aisError = aisResult.error;
            aisCache = aisResult.cache;
            aisAttempt = aisResult.aisAttempt ?? null;
        } catch (err) {
            aisError = err.message;
        }
    }

    const merged = mergeFeatures(fleet, aisFeatures);
    const filtered = filterByTheater(merged, theater);
    const theaterAisCount = filterByTheater(aisFeatures, theater).length;
    const sources = [];
    if (hasAisKey && theaterAisCount > 0) sources.push('aisstream.io');
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
            connected: (hasAisKey && theaterAisCount > 0) || (vfConfig.fleetKey && !fleetResult.error),
            coverage: hasAisKey
                ? (vfConfig.fleetKey ? 'ais-snapshot+fleet' : 'ais-snapshot')
                : (vfConfig.fleetKey ? 'fleet-only' : 'none'),
            requiresKey: !hasAisKey && !vfConfig.fleetKey,
            runtime: 'cloudflare-pages',
            aisGlobalCount: aisFeatures.length,
            aisCache,
            aisNote: hasAisKey
                ? 'Global AIS snapshot (15 min cache, 45s collect + retry) filtered by theater bbox'
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
