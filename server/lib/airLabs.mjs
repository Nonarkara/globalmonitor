/**
 * AirLabs real-time flight supplement.
 * One upstream refresh per hour keeps the intended path below 744 calls in a 31-day month.
 */

const API_URL = 'https://airlabs.co/api/v9/flights';
export const AIRLABS_CACHE_TTL_MS = 60 * 60 * 1000;

const THEATER_BOUNDS = {
    middleeast: [24, 10, 65, 42],
    indopacific: [90, -10, 135, 25],
    thailand: [97, 5, 106, 21],
};

let cache = {
    payload: null,
    expiresAt: 0,
    blockedUntil: 0,
    error: null,
};

const emptyPayload = (theater, extra = {}) => ({
    type: 'FeatureCollection',
    features: [],
    meta: {
        theater,
        count: 0,
        fetchedAt: new Date().toISOString(),
        source: 'airlabs',
        ...extra,
    },
});

const nextUtcMonth = (now = new Date()) => Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
);

const inTheater = (lat, lon, theater) => {
    const bounds = THEATER_BOUNDS[theater];
    if (!bounds) return true;
    const [minLon, minLat, maxLon, maxLat] = bounds;
    return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
};

const selectTheater = (payload, theater) => {
    if (!payload || theater === 'global' || theater === 'worldwide') return payload;
    const features = payload.features.filter((feature) => {
        const [lon, lat] = feature.geometry.coordinates;
        return inTheater(lat, lon, theater);
    });
    return {
        ...payload,
        features,
        meta: { ...payload.meta, theater, count: features.length },
    };
};

export const isAirLabsConfigured = () => Boolean(process.env.AIRLABS_API_KEY);

export const airLabsFlightToFeature = (flight) => {
    const lon = Number(flight?.lng);
    const lat = Number(flight?.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;

    const callsign = flight.flight_icao || flight.flight_iata || flight.flight_number
        || flight.reg_number || flight.hex || 'Unknown';

    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
            callsign,
            hex: String(flight.hex || '').toLowerCase(),
            origin: flight.dep_iata || flight.dep_icao || '',
            destination: flight.arr_iata || flight.arr_icao || '',
            altitude: Number(flight.alt) || 0,
            velocity: (Number(flight.speed) || 0) / 3.6,
            heading: Number(flight.dir) || 0,
            onGround: flight.status === 'landed' || (Number(flight.alt) || 0) < 50,
            type: flight.aircraft_icao || flight.reg_number || 'Unknown',
            desc: flight.reg_number || '',
            originCountry: flight.flag || '',
            updatedAt: Number(flight.updated) || null,
            source: 'airlabs',
            military: false,
        },
    };
};

export const normalizeAirLabsFlights = (records, theater = 'global') => {
    const byId = new Map();
    for (const record of Array.isArray(records) ? records : []) {
        const feature = airLabsFlightToFeature(record);
        if (!feature) continue;
        const [lon, lat] = feature.geometry.coordinates;
        if (!inTheater(lat, lon, theater)) continue;
        const key = feature.properties.hex
            || `${feature.properties.callsign}:${lat.toFixed(4)}:${lon.toFixed(4)}`;
        if (!byId.has(key)) byId.set(key, feature);
    }
    return [...byId.values()];
};

export const fetchAirLabsFlightsPayload = async (theater = 'global') => {
    const apiKey = process.env.AIRLABS_API_KEY || '';
    if (!apiKey) return emptyPayload(theater, { configured: false });

    const now = Date.now();
    if (cache.payload && cache.expiresAt > now) {
        return selectTheater({
            ...cache.payload,
            meta: { ...cache.payload.meta, cache: 'hit' },
        }, theater);
    }
    if (cache.blockedUntil > now) {
        return emptyPayload(theater, {
            configured: true,
            cache: 'quota-blocked',
            error: cache.error || 'month_limit_exceeded',
            nextRefreshAt: new Date(cache.blockedUntil).toISOString(),
        });
    }

    const url = new URL(API_URL);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('_fields', [
        'hex', 'reg_number', 'flag', 'lat', 'lng', 'alt', 'dir', 'speed',
        'flight_number', 'flight_icao', 'flight_iata', 'dep_icao', 'dep_iata',
        'arr_icao', 'arr_iata', 'aircraft_icao', 'updated', 'status',
    ].join(','));
    url.searchParams.set('zoom', '2');
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await response.json();
        const errorCode = data?.error?.code || data?.error?.message || null;
        if (!response.ok || errorCode) {
            if (errorCode === 'month_limit_exceeded') {
                cache.blockedUntil = nextUtcMonth();
                cache.error = errorCode;
            }
            return emptyPayload(theater, {
                configured: true,
                error: errorCode || `AirLabs ${response.status}`,
                nextRefreshAt: cache.blockedUntil
                    ? new Date(cache.blockedUntil).toISOString()
                    : null,
            });
        }

        const features = normalizeAirLabsFlights(data?.response, 'global');
        const payload = {
            type: 'FeatureCollection',
            features,
            meta: {
                theater: 'global',
                count: features.length,
                fetchedAt: new Date().toISOString(),
                source: 'airlabs',
                configured: true,
                cache: 'miss',
                refreshIntervalMs: AIRLABS_CACHE_TTL_MS,
                nextRefreshAt: new Date(now + AIRLABS_CACHE_TTL_MS).toISOString(),
            },
        };
        cache = {
            payload,
            expiresAt: now + AIRLABS_CACHE_TTL_MS,
            blockedUntil: 0,
            error: null,
        };
        return selectTheater(payload, theater);
    } catch (error) {
        return emptyPayload(theater, {
            configured: true,
            error: error.message,
        });
    }
};
