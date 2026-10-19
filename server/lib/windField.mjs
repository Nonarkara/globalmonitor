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

// AsiaWatch theaters — same bboxes the dashboard already uses for FIRMS and
// vessels. Adding entries here is the single change when a theater wants the
// haze-drift overlay.
const THEATER_BBOX = {
    indopacific: [90, -12, 142, 25],   // south edge -12 so the Sumatran/Marine Sumatra peat fires are inside
    eastasia:    [100, 18, 148, 47],
    southasia:   [60, 5, 92, 37],
    thailand:    [97, 5, 106, 21],
    gulf:        [33, 10, 60, 32],      // not rendered by this dashboard; reserved
    middleeast:  [24, 10, 65, 42]
};

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
// 4 degrees, not 2.5. Open-Meteo's free tier weights a multi-point request by
// its location count, so the 315-point grid cost 315 calls of a 10,000/day
// allowance every refresh. ~120 points keeps one refresh an hour well inside it,
// and on a phone they still sit ~29px apart — airy enough that the fires show.
const STEP_DEG = 4;

// One request carrying every point in the theater was measured at 8.7 s, and
// from a shared Cloudflare egress IP it regularly runs past 25 s and returns
// nothing at all. The grid is therefore split into chunks fetched in parallel;
// a chunk that fails costs that chunk's arrows, not the whole layer. The meta
// records when the field is partial so the legend can say so.
const CHUNK_SIZE = 20;
const CHUNK_TIMEOUT_MS = 10000;

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

const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const fetchChunk = async (lats, lons) => {
    const url = `${OPEN_METEO}?latitude=${lats.join(',')}&longitude=${lons.join(',')}`
        + '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=UTC';

    const res = await fetch(url, { signal: AbortSignal.timeout(CHUNK_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const body = await res.json();
    return Array.isArray(body) ? body : [body];
};

export const fetchWindField = async (theater = 'indopacific') => {
    const bbox = THEATER_BBOX[theater];
    if (!bbox) throw new Error(`windField: no bbox configured for theater "${theater}"`);
    const { lats, lons } = gridFor(bbox);

    const latChunks = chunk(lats, CHUNK_SIZE);
    const lonChunks = chunk(lons, CHUNK_SIZE);
    const requested = latChunks.length;

    const settled = await Promise.allSettled(
        latChunks.map((_, i) => fetchChunk(latChunks[i], lonChunks[i]))
    );

    const failed = settled.filter((s) => s.status === 'rejected');
    if (failed.length === requested) {
        throw new Error(`Open-Meteo: all ${requested} grid chunks failed — ${failed[0].reason?.message || 'unknown'}`);
    }

    const rows = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));

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
            theater,
            count: features.length,
            gridStepDeg: STEP_DEG,
            level: '10 m above ground',
            direction: 'meteorological (blowing FROM); arrows are drawn downwind',
            observedAt: observedAt ? `${observedAt}Z` : null,
            fetchedAt: new Date().toISOString(),
            source: 'open-meteo',
            // Honest about gaps: a partial field says so rather than passing
            // a short grid off as a complete one.
            requestedChunks: requested,
            failedChunks: failed.length,
            partial: failed.length > 0
        },
    };
};
