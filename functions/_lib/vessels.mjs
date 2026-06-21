import { fetchFleetVessels, getVesselFinderConfig } from '../../server/lib/vesselFinder.mjs';
import { AIS_BOXES_BY_THEATER, fetchAisSnapshot } from './aisSnapshot.mjs';
import { getSharedCache } from './cache.mjs';

const AIS_CACHE_KEY = 'vessels:ais:global:v2';
const AIS_CACHE_TTL_MS = 8 * 60 * 1000;

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

    const aisResult = await fetchAisSnapshot(apiKey, {
        boundingBoxes: AIS_BOXES_BY_THEATER.global,
        timeoutMs: 15000,
        maxVessels: 8000,
    });
    const features = aisResult.features || [];
    const error = aisResult.error && features.length === 0 ? aisResult.error : null;

    if (features.length > 0) {
        cache.set(AIS_CACHE_KEY, {
            features,
            error: null,
            expiresAt: now + AIS_CACHE_TTL_MS,
        });
    }

    return { features, error, cache: features.length > 0 ? 'miss' : 'bypass' };
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
    if (hasAisKey) {
        try {
            const aisResult = await getGlobalAisFeatures(aisKey);
            aisFeatures = aisResult.features;
            aisError = aisResult.error;
            aisCache = aisResult.cache;
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
                ? 'Global AIS snapshot (8 min cache) filtered by theater bbox'
                : null,
            aisError,
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
