/**
 * Airplanes.live — live ADS-B positions (github.com/airplanes-live/api).
 * Free, no API key. Rate limit: 1 req/sec. Max radius: 250 nm per point.
 * Middle East theater uses multiple query points for coverage.
 */

import { THEATERS } from './theaters.mjs';

const MAX_RADIUS_NM = 250;
const REQUEST_STAGGER_MS = 250;
// Hard wall for one theater fetch. Whatever query points have answered by
// then are served (and cached) — partial live beats a browser-side timeout.
const FETCH_DEADLINE_MS = 11000;

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

// readsb/tar1090 "v2 point" API — airplanes.live began returning 403 to
// unregistered callers in Aug 2026 ("Please contact us…"), so adsb.lol (same
// API shape, no key, CC-BY) is tried next. First host to answer wins.
const READSB_HOSTS = [
    'https://api.airplanes.live/v2/point',
    'https://api.adsb.lol/v2/point'
];

const fetchPointFrom = async (base, lat, lon, attempt = 0) => {
    const url = `${base}/${lat}/${lon}/${MAX_RADIUS_NM}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status === 429 && attempt < 3) {
        await sleep(1500 * (attempt + 1));
        return fetchPointFrom(base, lat, lon, attempt + 1);
    }
    if (!res.ok) throw new Error(`${new URL(base).host} ${res.status}`);
    const data = await res.json();
    return data.ac || [];
};

// Which host actually answered — surfaced in meta.source so the UI credits
// the real provider instead of claiming airplanes.live when adsb.lol served it.
const answeredHosts = new Set();

const fetchPoint = async (lat, lon) => {
    let lastError;
    for (const base of READSB_HOSTS) {
        try {
            const ac = await fetchPointFrom(base, lat, lon);
            answeredHosts.add(new URL(base).host.replace(/^api\./, ''));
            return ac;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('No ADS-B host answered');
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
        const deadline = sleep(FETCH_DEADLINE_MS).then(() => { throw new Error('deadline'); });
        const results = await Promise.allSettled(
            points.map((point, index) =>
                Promise.race([
                    sleep(index * REQUEST_STAGGER_MS).then(() => fetchPoint(point.lat, point.lon)),
                    deadline
                ])
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
                source: answeredHosts.size ? [...answeredHosts].join('+') : 'airplanes.live',
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
                source: answeredHosts.size ? [...answeredHosts].join('+') : 'airplanes.live',
                coverage: resolved === 'global' ? 'worldwide' : resolved,
                error: err.message
            }
        };
    }
};
