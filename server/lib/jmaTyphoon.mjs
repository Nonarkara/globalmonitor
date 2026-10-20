/**
 * JMA tropical cyclone analysis — the "depression wind" the haze layer needs.
 *
 * Source: the Japan Meteorological Agency's public typhoon bulletin, keyless.
 *   targetTc.json            the systems JMA is analysing right now
 *   <tc>/specifications.json  the analysed state — maximum wind, gust, central
 *                             pressure, centre, movement, and the QUADRANT
 *                             radii of the gale area and the storm area
 *   <tc>/forecast.json        the past track and the forecast centres to 120 h
 * JMA issues about four times a day, so the route caches for half an hour.
 *
 * The wind areas are NOT circles, and that is the whole reason the quadrant
 * radii are read rather than averaged. This storm's gale area reaches 650 km
 * to the north-east and 500 km to the south-west: two numbers, because the
 * field is lopsided, and the lopsided side is the side the smoke rides on. A
 * circle drawn from the mean of the two would claim a symmetry the
 * observation does not support. So the polygon is built from the quadrant
 * radii themselves — one arc per quadrant, the quadrants JMA did not name
 * taking the mean of their two named neighbours, so the outline closes
 * without inventing a fourth number. It approximates JMA's own
 * analyst-drawn boundary (JMA smooths the same idea into a curve) and it is
 * deliberately not a circle.
 *
 * Nothing here is invented. If JMA has no active system the collection comes
 * back empty and says so. If the bulletin cannot be read the fetch throws,
 * so the route can report an outage — an unreachable feed must not be
 * rendered as a quiet sky over a storm that is there.
 *
 * Direction and units are stated, never assumed: `fromDeg` (where the wind
 * comes FROM), kilometres, hectopascals, m/s and knots, all carried in the
 * properties so a label can say which is which.
 */

const JMA_BASE = 'https://www.jma.go.jp/bosai/typhoon/data';
const TARGET_URL = `${JMA_BASE}/targetTc.json`;
const TIMEOUT_MS = 12000;
const METRES_PER_DEGREE = 111320;

/* ── plain-English names ───────────────────────────────────────────────────
   JMA writes these fields in Japanese. The raw value is kept beside the
   English one; where a term is not in the table the raw value stands alone
   and the English field is null, because a guess is worse than a gap. */

const COURSE_EN = {
    '北': 'North', '北北東': 'North-northeast', '東北東': 'East-northeast',
    '東': 'East', '東南東': 'East-southeast', '南東': 'Southeast',
    '南南東': 'South-southeast', '南': 'South', '南南西': 'South-southwest',
    '南西': 'Southwest', '西南西': 'West-southwest', '西': 'West',
    '西北西': 'West-northwest', '北西': 'Northwest', '北北西': 'North-northwest',
    '停滞': 'stationary'
};

const CATEGORY_EN = {
    TD: 'Tropical depression', TS: 'Tropical storm', STS: 'Severe tropical storm',
    TY: 'Typhoon', 'TY+': 'Violent typhoon', ET: 'Extratropical'
};

const INTENSITY_EN = {
    '猛烈な': 'violent', '強い': 'strong', 'やや強い': 'fairly strong',
    'やや弱い': 'fairly weak', '弱い': 'weak'
};

const SCALE_EN = { '大型': 'large', '小型': 'small' };

// "<place>の<direction>" — the shape JMA uses for a position ("east of the
// Philippines"). The place table is short on purpose: an unknown place keeps
// the raw Japanese rather than being translated into something approximate.
const PLACE_EN = {
    'フィリピン': 'the Philippines', '沖縄': 'Okinawa', '東シナ海': 'the East China Sea',
    '南シナ海': 'the South China Sea', '先島諸島': 'the Ryukyu Islands',
    '硫黄島': 'Iwo Jima', '小笠原諸島': 'the Bonin Islands', '奄美': 'Amami',
    '九州': 'Kyushu', '四国': 'Shikoku', '本州': 'Honshu', '北海道': 'Hokkaido',
    '日本': 'Japan', '台湾': 'Taiwan', '上海': 'Shanghai', '香港': 'Hong Kong'
};
const DIRECTION_EN = {
    '東': 'east', '西': 'west', '北': 'north', '南': 'south',
    '北東': 'northeast', '南東': 'southeast', '南西': 'southwest', '北西': 'northwest',
    '沖': 'off'
};

const locationEn = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    for (const [place, english] of Object.entries(PLACE_EN)) {
        if (!raw.startsWith(place)) continue;
        const rest = raw.slice(place.length).replace(/^の/, '');
        for (const [ja, dir] of Object.entries(DIRECTION_EN)) {
            if (!rest.startsWith(ja)) continue;
            if (ja === '沖') return `off the coast of ${english}`;
            return `${dir} of ${english}`;
        }
        return english;
    }
    return null;
};

/* ── parsing helpers ─────────────────────────────────────────────────────── */

const num = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const isTitle = (part) => part?.part === 'title';
const partName = (part) => (typeof part?.part === 'string' ? part.part : part?.part?.en || '');
const isAnalysis = (part) => !isTitle(part) && Number(part?.advancedHours) === 0;

const fetchJson = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`JMA ${res.status} for ${url.replace(JMA_BASE, '')}`);
    return res.json();
};

/** Centre position, arc-minute precision when JMA gives it, degrees otherwise. */
const positionOf = (part) => {
    const dm = part?.position?.dm;
    if (Array.isArray(dm) && dm.length >= 2 && Array.isArray(dm[0]) && Array.isArray(dm[1])) {
        const lat = num(dm[0][0]) + num(dm[0][1]) / 60;
        const lon = num(dm[1][0]) + num(dm[1][1]) / 60;
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    const deg = part?.position?.deg;
    if (Array.isArray(deg) && deg.length >= 2) {
        const lat = num(deg[0]);
        const lon = num(deg[1]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    return null;
};

const windOf = (part) => {
    const sustained = part?.maximumWind?.sustained || {};
    const gust = part?.maximumWind?.gust || {};
    return {
        maxWindMs: num(sustained['m/s']),
        maxWindKt: num(sustained.kt),
        gustMs: num(gust['m/s']),
        gustKt: num(gust.kt)
    };
};

const movementOf = (part) => {
    const course = typeof part?.course === 'string' ? part.course : null;
    const courseEn = course ? (COURSE_EN[course] || null) : null;
    const speedKmh = num(part?.speed?.['km/h']);
    const speedKt = num(part?.speed?.kt);
    let movement = null;
    if (courseEn && speedKmh !== null) movement = `${courseEn} at ${speedKmh} km/h`;
    else if (courseEn) movement = courseEn;
    else if (course) movement = course;
    return { course, courseEn, speedKmh, speedKt, movement };
};

/* ── the wind area ───────────────────────────────────────────────────────── */

/** JMA names the quadrants in Japanese; NE/SE/SW/NW in the order below. */
const QUADRANTS = [
    { key: 'NE', mid: 45 },
    { key: 'SE', mid: 135 },
    { key: 'SW', mid: 225 },
    { key: 'NW', mid: 315 }
];

// A diagonal (北東) names one quadrant. A half-plane (東) names two.
const AREA_TO_QUADRANTS = {
    '北東': ['NE'], '南東': ['SE'], '南西': ['SW'], '北西': ['NW'],
    '東': ['NE', 'SE'], '南': ['SE', 'SW'], '西': ['SW', 'NW'], '北': ['NW', 'NE']
};

const angularDistance = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
};

/**
 * The four quadrant radii, in km, from JMA's gale-area or storm-area list.
 * A quadrant JMA did not name takes the mean of its two named neighbours —
 * the interpolation is linear in azimuth, so with only the north-east and the
 * south-west named (the common case) the two unnamed quadrants land on the
 * mean. The result is a four-lobed outline, not a circle.
 */
const areaRadii = (list) => {
    const direct = {};
    const halves = [];
    for (const item of Array.isArray(list) ? list : []) {
        const km = num(item?.range?.km);
        const keys = AREA_TO_QUADRANTS[item?.area];
        if (km === null || !keys) continue;
        if (keys.length === 1) direct[keys[0]] = km;
        else halves.push({ keys, km });
    }
    if (!Object.keys(direct).length && !halves.length) return null;

    const radii = { ...direct };
    for (const half of halves) {
        for (const key of half.keys) if (radii[key] === undefined) radii[key] = half.km;
    }
    for (const q of QUADRANTS) {
        if (radii[q.key] !== undefined) continue;
        const named = QUADRANTS
            .filter((n) => radii[n.key] !== undefined)
            .map((n) => ({ d: angularDistance(q.mid, n.mid), km: radii[n.key] }))
            .sort((a, b) => a.d - b.d);
        if (!named.length) continue;
        if (named.length === 1) { radii[q.key] = named[0].km; continue; }
        const [a, b] = named;
        const total = a.d + b.d;
        radii[q.key] = total > 0 ? a.km + (b.km - a.km) * (a.d / total) : (a.km + b.km) / 2;
    }
    return radii;
};

const project = (lat, lon, azDeg, km, cosLat) => {
    const az = (azDeg * Math.PI) / 180;
    const d = (km * 1000) / METRES_PER_DEGREE;
    return [
        +(lon + (d * Math.sin(az)) / cosLat).toFixed(4),
        +(lat + d * Math.cos(az)).toFixed(4)
    ];
};

/**
 * The radius at an arbitrary bearing, blended between the quadrant figures.
 *
 * JMA states the wind radii per quadrant (north-east, south-east, south-west,
 * north-west). Drawing one arc per quadrant at a constant radius leaves a
 * radial STEP at every quadrant boundary, and a step is an artefact of the
 * sampling rather than a claim about the wind: the first version of this
 * polygon rendered the storm's gale area as a lumpy shape with square
 * notches in it, which looked like a rendering fault and was one.
 *
 * The radius is therefore blended linearly between the two nearest quadrant
 * figures, which is the ordinary reading of a quadrant radius. The quadrant
 * values themselves are still in the mark's popup, so the reader can see the
 * figures the shape was built from.
 */
const radiusAt = (azDeg, radii) => {
    const d = ((azDeg % 360) + 360) % 360;
    const named = QUADRANTS
        .map((q) => ({ d: angularDistance(d, q.mid), km: radii?.[q.key] }))
        .filter((q) => Number.isFinite(q.km))
        .sort((a, b) => a.d - b.d);
    if (!named.length) return null;
    if (named.length === 1) return named[0].km;
    const [a, b] = named;
    const total = a.d + b.d;
    if (total <= 0) return a.km;
    return a.km + (b.km - a.km) * (a.d / total);
};

/** One closed ring around the centre, the radius blended every 3°. */
const windAreaPolygon = (lat, lon, radii, stepDeg = 3) => {
    const cosLat = Math.cos((lat * Math.PI) / 180) || 1;
    const ring = [];
    for (let az = 0; az < 360; az += stepDeg) {
        const km = radiusAt(az, radii);
        if (!Number.isFinite(km)) continue;
        ring.push(project(lat, lon, az, km, cosLat));
    }
    if (ring.length < 3) return null;
    ring.push(ring[0]);
    return { type: 'Polygon', coordinates: [ring] };
};

/* ── one storm ───────────────────────────────────────────────────────────── */

const stormFromBulletin = (id, entry, specParts, fcParts) => {
    const spec = Array.isArray(specParts) ? specParts : [];
    const fc = Array.isArray(fcParts) ? fcParts : [];
    const title = spec.find(isTitle) || fc.find(isTitle) || {};
    const analysis = spec.find(isAnalysis) || fc.find(isAnalysis) || null;
    const fcAnalysis = fc.find(isAnalysis) || null;
    if (!analysis && !fcAnalysis) return null;

    const observedAt = title?.issue?.UTC || null;
    const name = title?.name?.en || null;
    const nameJp = title?.name?.jp || null;
    const category = analysis?.category?.en || title?.category?.en || entry?.category || null;
    const categoryJp = analysis?.category?.jp || title?.category?.jp || null;
    const wind = windOf(analysis);
    const movement = movementOf(analysis);
    const position = positionOf(analysis) || (fcAnalysis?.center
        ? { lat: Number(fcAnalysis.center[0]), lon: Number(fcAnalysis.center[1]) }
        : null);
    if (!position) return null;

    const features = [];
    const common = { observedAt, source: 'JMA', stormId: id, name };

    features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [position.lon, position.lat] },
        properties: {
            ...common,
            kind: 'centre',
            name,
            nameJp,
            category,
            categoryJp,
            categoryEn: category ? (CATEGORY_EN[category] || null) : null,
            maxWindMs: wind.maxWindMs,
            maxWindKt: wind.maxWindKt,
            gustMs: wind.gustMs,
            gustKt: wind.gustKt,
            pressureHpa: num(analysis?.pressure),
            movement: movement.movement,
            course: movement.course,
            courseEn: movement.courseEn,
            movementSpeedKmh: movement.speedKmh,
            movementSpeedKt: movement.speedKt,
            location: typeof analysis?.location === 'string' ? analysis.location : null,
            locationEn: locationEn(analysis?.location),
            intensity: typeof analysis?.intensity === 'string' ? analysis.intensity : null,
            intensityEn: analysis?.intensity ? (INTENSITY_EN[analysis.intensity] || null) : null,
            scale: typeof analysis?.scale === 'string' ? analysis.scale : null,
            scaleEn: analysis?.scale ? (SCALE_EN[analysis.scale] || null) : null,
            validAt: analysis?.validtime?.UTC || null
        }
    });

    // Gale area (強風域) and storm area (暴風域), each from its own quadrant radii.
    for (const [kind, list] of [['galeArea', analysis?.galeWarning], ['stormArea', analysis?.stormWarning]]) {
        const radii = areaRadii(list);
        if (!radii) continue;
        const geometry = windAreaPolygon(position.lat, position.lon, radii);
        if (!geometry) continue;
        features.push({
            type: 'Feature',
            geometry,
            properties: {
                ...common,
                kind,
                name,
                category,
                categoryEn: category ? (CATEGORY_EN[category] || null) : null,
                radiiKm: radii,
                radiusMaxKm: Math.max(...QUADRANTS.map((q) => radii[q.key]).filter(Number.isFinite)),
                centre: [position.lon, position.lat]
            }
        });
    }

    // The track: past centres, then the forecast centres out to 120 h.
    const past = [];
    const track = fcAnalysis?.track || {};
    for (const group of [track.preTyphoon, track.typhoon]) {
        for (const p of Array.isArray(group) ? group : []) {
            if (!Array.isArray(p) || p.length < 2) continue;
            const lat = num(p[0]);
            const lon = num(p[1]);
            if (lat === null || lon === null) continue;
            past.push({ lat, lon });
        }
    }
    const future = [];
    for (const part of fc.filter((p) => !isTitle(p) && Number(p?.advancedHours) > 0)) {
        const c = part?.center;
        if (!Array.isArray(c) || c.length < 2) continue;
        const lat = num(c[0]);
        const lon = num(c[1]);
        if (lat === null || lon === null) continue;
        future.push({
            lat, lon,
            hours: Number(part.advancedHours),
            validAt: part?.validtime?.UTC || null
        });
    }
    future.sort((a, b) => a.hours - b.hours);

    const analysisValidAt = fcAnalysis?.validtime?.UTC || analysis?.validtime?.UTC || null;
    const points = [
        ...past.map((p, i) => ({
            lon: p.lon,
            lat: p.lat,
            forecast: false,
            validAt: i === past.length - 1 ? analysisValidAt : null,
            hours: null
        })),
        ...future.map((p) => ({
            lon: p.lon, lat: p.lat, forecast: true, validAt: p.validAt, hours: p.hours
        }))
    ];
    if (points.length >= 2) {
        const forecastFrom = points.findIndex((p) => p.forecast);
        const trackProperties = {
            ...common,
            kind: 'track',
            name,
            category,
            // The feature is the observed track; the future centres inside it
            // are flagged per point, and forecastFrom is where they begin.
            forecast: forecastFrom >= 0,
            forecastFrom: forecastFrom >= 0 ? forecastFrom : null,
            pastPoints: past.length,
            forecastPoints: future.length,
            points
        };
        // The track is drawn as two lines, not one: the centres already passed
        // and the centres still to come are different kinds of claim. A
        // reader must be able to see where the observation stops and the
        // forecast begins — a single line says the whole track happened.
        // The combined geometry is not emitted: nothing draws it, and a
        // payload that carries a geometry nobody can see is a claim nobody
        // can check.
        const pastCoords = points.filter((p) => !p.forecast).map((p) => [p.lon, p.lat]);
        const futureCoords = points.filter((p) => p.forecast).map((p) => [p.lon, p.lat]);
        if (pastCoords.length >= 2) {
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: pastCoords },
                properties: { ...trackProperties, kind: 'trackPast', forecast: false, forecastFrom: null }
            });
        }
        if (futureCoords.length >= 2) {
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: futureCoords },
                properties: { ...trackProperties, kind: 'trackForecast', forecast: true, forecastFrom: 0 }
            });
        }
    }

    return {
        id,
        name,
        category,
        observedAt,
        maxWindMs: wind.maxWindMs,
        maxWindKt: wind.maxWindKt,
        gustMs: wind.gustMs,
        pressureHpa: num(analysis?.pressure),
        features
    };
};

const buildStorm = async (entry) => {
    const id = entry?.tropicalCyclone;
    if (!id) return null;
    const [spec, fc] = await Promise.all([
        fetchJson(`${JMA_BASE}/${id}/specifications.json`),
        fetchJson(`${JMA_BASE}/${id}/forecast.json`)
    ]);
    return stormFromBulletin(id, entry, spec, fc);
};

/* ── the feed ────────────────────────────────────────────────────────────── */

export const fetchJmaTyphoon = async () => {
    const target = await fetchJson(TARGET_URL);
    const entries = Array.isArray(target)
        ? target
        : (Array.isArray(target?.targetTc) ? target.targetTc : []);

    const fetchedAt = new Date().toISOString();

    if (!entries.length) {
        return {
            type: 'FeatureCollection',
            features: [],
            meta: {
                source: 'JMA',
                stormId: null,
                stormName: null,
                category: null,
                maxWindMs: null,
                maxWindKt: null,
                gustMs: null,
                pressureHpa: null,
                observedAt: null,
                fetchedAt,
                isForecast: false,
                quadrantRadii: true,
                storms: [],
                count: 0,
                note: 'No active tropical cyclone in the JMA bulletin at the time of reading — nothing to draw.'
            }
        };
    }

    const settled = await Promise.allSettled(entries.map((entry) => buildStorm(entry)));
    const storms = settled
        .filter((s) => s.status === 'fulfilled' && s.value)
        .map((s) => s.value);
    const failures = settled.filter((s) => s.status === 'rejected');
    if (!storms.length) {
        throw new Error(`JMA: no storm could be read — ${failures[0]?.reason?.message || 'unknown'}`);
    }

    // The strongest system leads the meta; every system is still drawn and
    // listed, because a second storm is a second storm.
    const primary = storms.slice().sort((a, b) => (b.maxWindMs ?? -1) - (a.maxWindMs ?? -1))[0];
    const features = storms.flatMap((s) => s.features);

    return {
        type: 'FeatureCollection',
        features,
        meta: {
            source: 'JMA',
            stormId: primary.id,
            stormName: primary.name,
            category: primary.category,
            maxWindMs: primary.maxWindMs,
            maxWindKt: primary.maxWindKt,
            gustMs: primary.gustMs,
            pressureHpa: primary.pressureHpa,
            observedAt: primary.observedAt,
            fetchedAt,
            isForecast: false,
            quadrantRadii: true,
            count: features.length,
            storms: storms.map((s) => ({
                id: s.id,
                name: s.name,
                category: s.category,
                maxWindMs: s.maxWindMs,
                pressureHpa: s.pressureHpa,
                observedAt: s.observedAt
            })),
            failedStorms: failures.length,
            note: 'JMA analysis — satellite-based inputs and a numerical model, not a raw satellite wind retrieval'
        }
    };
};
