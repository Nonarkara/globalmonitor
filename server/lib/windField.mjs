/**
 * Wind field for a theater — the arrows that show where haze drifts.
 *
 * Source: Open-Meteo forecast API, `current` wind, keyless. One request
 * carries the whole grid (measured: 204 points in 1.7 s).
 *
 * Two levels, because they answer two different questions:
 *   10 m      the level the ASEAN Specialised Meteorological Centre draws on
 *             its regional haze maps, which is the convention a reader of this
 *             layer will already know — what the air is doing at the surface.
 *   850 hPa   the transport level, ~1500 m above ground, which is where the
 *             haze actually goes. Surface wind is the air near the ground;
 *             it is not the same air that carries the smoke over a basin, and
 *             it can even oppose it. The 850 hPa field is the answer to
 *             "where is the smoke being pushed".
 *
 * Open-Meteo is a MODEL at both levels, not a satellite retrieval, and the
 * meta says so (`model: true`); the 10 m field is not an observation either.
 *
 * Direction convention, because it is easy to get backwards: a meteorological
 * `wind_direction_*` is where the wind comes FROM, at every level. A haze
 * arrow has to point where the smoke is going, so the client rotates by
 * direction + 180. This file returns the raw meteorological value and says so
 * in meta. The meaning of `speedKmh` and `fromDeg` is identical at both
 * levels, so one client renderer serves both.
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

// The two levels this file serves. The keys are the Open-Meteo `current`
// parameters; the label is what the legend and the meta say the level is, in
// words, because "wind_speed_850hPa" is a parameter name, not a description.
export const WIND_LEVELS = {
    '10m': {
        current: 'wind_speed_10m,wind_direction_10m',
        speedKey: 'wind_speed_10m',
        directionKey: 'wind_direction_10m',
        label: '10 m above ground'
    },
    '850hPa': {
        current: 'wind_speed_850hPa,wind_direction_850hPa',
        speedKey: 'wind_speed_850hPa',
        directionKey: 'wind_direction_850hPa',
        label: '850 hPa (~1500 m) transport'
    }
};

/** Anything that is not a level this file serves is the surface field. */
const resolveLevel = (level) => {
    const key = String(level || '10m').trim().toLowerCase();
    return key === '850hpa' ? '850hPa' : '10m';
};

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
// How many grid chunks are in flight at once. Six at once tripped
// Open-Meteo's limiter and came back as a field with holes in it.
const CHUNK_CONCURRENCY = 3;

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

const fetchChunk = async (lats, lons, level) => {
    const url = `${OPEN_METEO}?latitude=${lats.join(',')}&longitude=${lons.join(',')}`
        + `&current=${level.current}&wind_speed_unit=kmh&timezone=UTC`;

    const res = await fetch(url, { signal: AbortSignal.timeout(CHUNK_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const body = await res.json();
    return Array.isArray(body) ? body : [body];
};

export const fetchWindField = async (theater = 'indopacific', { level = '10m' } = {}) => {
    const bbox = THEATER_BBOX[theater];
    if (!bbox) throw new Error(`windField: no bbox configured for theater "${theater}"`);
    const levelKey = resolveLevel(level);
    const levelSpec = WIND_LEVELS[levelKey];
    const { lats, lons } = gridFor(bbox);

    const latChunks = chunk(lats, CHUNK_SIZE);
    const lonChunks = chunk(lons, CHUNK_SIZE);
    const requested = latChunks.length;

    // Six requests at once is enough to trip Open-Meteo's rate limiter, and a
    // throttled fetch is not a thin field — it is a field with holes in it,
    // which is a different claim from "the wind is this weak here". The
    // chunks are therefore taken three at a time, and the ones that failed
    // are retried one at a time afterwards: a second burst at the same
    // limiter would fail the same way.
    const settled = new Array(requested);
    for (let i = 0; i < requested; i += CHUNK_CONCURRENCY) {
        const slice = [];
        for (let j = i; j < Math.min(i + CHUNK_CONCURRENCY, requested); j += 1) {
            slice.push(
                fetchChunk(latChunks[j], lonChunks[j], levelSpec).then(
                    (value) => ({ status: 'fulfilled', value }),
                    (reason) => ({ status: 'rejected', reason })
                )
            );
        }
        const done = await Promise.all(slice);
        done.forEach((outcome, offset) => { settled[i + offset] = outcome; });
    }

    const failedIndexes = [];
    settled.forEach((outcome, i) => { if (outcome.status === 'rejected') failedIndexes.push(i); });

    // The retry pass: sequential, with a pause, so the limiter has room.
    for (const i of failedIndexes) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (i + 1)));
        try {
            settled[i] = { status: 'fulfilled', value: await fetchChunk(latChunks[i], lonChunks[i], levelSpec) };
        } catch (error) {
            settled[i] = { status: 'rejected', reason: error };
        }
    }

    const failed = settled.filter((s) => s.status === 'rejected');
    if (failed.length === requested) {
        throw new Error(`Open-Meteo: all ${requested} grid chunks failed — ${failed[0].reason?.message || 'unknown'}`);
    }

    const rows = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));

    const features = [];
    let observedAt = null;
    for (const row of rows) {
        const speed = row?.current?.[levelSpec.speedKey];
        const from = row?.current?.[levelSpec.directionKey];
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
            level: levelSpec.label,
            direction: 'meteorological (blowing FROM); arrows are drawn downwind',
            observedAt: observedAt ? `${observedAt}Z` : null,
            fetchedAt: new Date().toISOString(),
            source: 'open-meteo',
            // Open-Meteo is a numerical model, not a satellite retrieval. The
            // field is never described as an observation.
            model: true,
            // Honest about gaps: a partial field says so rather than passing
            // a short grid off as a complete one.
            requestedChunks: requested,
            failedChunks: failed.length,
            partial: failed.length > 0
        },
    };
};
