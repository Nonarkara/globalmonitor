/**
 * Surface wind field for a theater — the arrows that show where haze drifts.
 *
 * Source: Open-Meteo forecast API, `current` 10 m wind, keyless. One request
 * carries the whole grid (measured: 204 points in 1.7 s). 10 m is the level the
 * ASEAN Specialised Meteorological Centre draws on its regional haze maps, which
 * is the convention a reader of this layer will already know.
 *
 * Direction convention, because it is easy to get backwards: meteorological
 * `wind_direction_10m` is where the wind comes FROM. A haze arrow has to point
 * where the smoke is going, so the client rotates by direction + 180. This file
 * returns the raw meteorological value and says so in meta.
 */
import { getTheater } from './theaters.mjs';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
// 4 degrees, not 2.5. Open-Meteo's free tier weights a multi-point request by
// its location count, so the 315-point grid cost 315 calls of a 10,000/day
// allowance every refresh. ~120 points keeps one refresh an hour well inside it,
// and on a phone they still sit ~29px apart — airy enough that the fires show.
const STEP_DEG = 4;

const gridFor = ([minLon, minLat, maxLon, maxLat]) => {
    const lats = [];
    const lons = [];
    // Half-step inset so no arrow sits on the theater edge with its head clipped.
    for (let lat = minLat + STEP_DEG / 2; lat <= maxLat; lat += STEP_DEG) {
        for (let lon = minLon + STEP_DEG / 2; lon <= maxLon; lon += STEP_DEG) {
            lats.push(+lat.toFixed(2));
            lons.push(+lon.toFixed(2));
        }
    }
    return { lats, lons };
};

export const fetchWindField = async (theater = 'indopacific') => {
    const t = getTheater(theater);
    const { lats, lons } = gridFor(t.bbox);
    const url = `${OPEN_METEO}?latitude=${lats.join(',')}&longitude=${lons.join(',')}`
        + '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=UTC';

    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const body = await res.json();
    const rows = Array.isArray(body) ? body : [body];

    const features = [];
    let observedAt = null;
    for (const row of rows) {
        const speed = row?.current?.wind_speed_10m;
        const from = row?.current?.wind_direction_10m;
        if (!Number.isFinite(speed) || !Number.isFinite(from)) continue;
        observedAt = observedAt || row.current.time;
        features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [row.longitude, row.latitude] },
            properties: { speedKmh: speed, fromDeg: from },
        });
    }
    if (!features.length) throw new Error('Open-Meteo returned no wind values');

    return {
        type: 'FeatureCollection',
        features,
        meta: {
            theater: t.id,
            count: features.length,
            gridStepDeg: STEP_DEG,
            level: '10 m above ground',
            direction: 'meteorological (blowing FROM); arrows are drawn downwind',
            observedAt: observedAt ? `${observedAt}Z` : null,
            fetchedAt: new Date().toISOString(),
            source: 'open-meteo',
        },
    };
};
