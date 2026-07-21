/**
 * Airplanes.live — live ADS-B positions (github.com/airplanes-live/api).
 * Free, no API key. Rate limit: 1 req/sec. Max radius: 250 nm per point.
 * Middle East theater uses multiple query points for coverage.
 */

import { THEATERS } from './theaters.mjs';

const MAX_RADIUS_NM = 250;
const REQUEST_STAGGER_MS = 350;

// Bounds + overlapping 250 nm query circles come from the shared theater
// registry (theaters.mjs).
const THEATER_BOUNDS = Object.fromEntries(
    Object.entries(THEATERS).map(([id, t]) => [id, t.bounds])
);
// Back-compat alias: callers historically used 'worldwide' for the global feed.
THEATER_BOUNDS.worldwide = THEATERS.global.bounds;

/** Overlapping 250 nm circles to cover each theater bbox. */
const THEATER_QUERY_POINTS = {
    global: THEATERS.global.queryPoints,
    worldwide: null, // alias → global
    middleeast: THEATERS.middleeast.queryPoints,
    indopacific: THEATERS.indopacific.queryPoints,
    thailand: THEATERS.thailand.queryPoints
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const inBounds = (lat, lon, bounds) =>
    lat >= bounds.lamin && lat <= bounds.lamax && lon >= bounds.lomin && lon <= bounds.lomax;

const fetchPoint = async (lat, lon, attempt = 0) => {
    const url = `https://api.airplanes.live/v2/point/${lat}/${lon}/${MAX_RADIUS_NM}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (res.status === 429 && attempt < 3) {
        await sleep(1500 * (attempt + 1));
        return fetchPoint(lat, lon, attempt + 1);
    }
    if (!res.ok) throw new Error(`Airplanes.live ${res.status}`);
    const data = await res.json();
    return data.ac || [];
};

const toFeature = (ac) => {
    let alt = ac.alt_geom ?? ac.alt_baro;
    if (alt === 'ground') alt = 0;

    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [ac.lon, ac.lat]
        },
        properties: {
            callsign: (ac.flight || '').trim() || ac.r || ac.hex,
            hex: ac.hex || '',
            origin: '',
            altitude: (Number(alt) || 0) * 0.3048,
            velocity: (ac.gs || 0) * 0.514444,
            heading: ac.track ?? ac.true_heading ?? ac.mag_heading ?? 0,
            onGround: ac.alt_baro === 'ground' || (Number(alt) || 0) < 50,
            type: ac.t || 'Unknown',
            desc: ac.desc || '',
            military: Boolean(ac.mil)
        }
    };
};

const resolveTheater = (theater) => {
    if (theater === 'worldwide') return 'global';
    return THEATER_BOUNDS[theater] ? theater : 'global';
};

export const fetchAirplanesLivePayload = async (theater = 'global') => {
    const resolved = resolveTheater(theater);
    const bounds = THEATER_BOUNDS[resolved];
    const points = THEATER_QUERY_POINTS[resolved] || THEATER_QUERY_POINTS.global;
    const byHex = new Map();
    const pointErrors = [];

    try {
        // Staggered parallel fetches — sequential 1.5s gaps exceeded Workers wall-clock
        // budgets and cached sparse theater payloads (e.g. 1 aircraft for all of ME).
        const results = await Promise.allSettled(
            points.map((point, index) =>
                sleep(index * REQUEST_STAGGER_MS).then(() => fetchPoint(point.lat, point.lon))
            )
        );

        for (const result of results) {
            if (result.status === 'rejected') {
                pointErrors.push(result.reason?.message || 'point fetch failed');
                continue;
            }
            for (const ac of result.value) {
                if (ac.lat == null || ac.lon == null) continue;
                if (!inBounds(ac.lat, ac.lon, bounds)) continue;
                const key = ac.hex || `${ac.lat},${ac.lon},${ac.flight || ''}`;
                if (!byHex.has(key)) byHex.set(key, toFeature(ac));
            }
        }

        const features = [...byHex.values()];
        return {
            type: 'FeatureCollection',
            features,
            meta: {
                theater: resolved,
                count: features.length,
                fetchedAt: new Date().toISOString(),
                source: 'airplanes.live',
                coverage: resolved === 'global' ? 'worldwide' : resolved,
                ...(features.length === 0 && pointErrors.length ? { error: pointErrors[0] } : {})
            }
        };
    } catch (err) {
        console.error('Airplanes.live error:', err.message);
        return {
            type: 'FeatureCollection',
            features: [],
            meta: {
                theater: resolved,
                count: 0,
                fetchedAt: new Date().toISOString(),
                source: 'airplanes.live',
                coverage: resolved === 'global' ? 'worldwide' : resolved,
                error: err.message
            }
        };
    }
};
