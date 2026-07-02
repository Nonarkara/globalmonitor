/**
 * FloodOps — real-time flood intelligence for Thai cities, built on the
 * HII / ThaiWater national telemetry network (api-v3.thaiwater.net, open, no key).
 *
 *   waterlevel_load : ~775 stations, 10-min cadence — level vs bank height,
 *                     % channel capacity, discharge (m³/s), situation level 1–5
 *   rain_24h        : ~4,300 gauges — 1h / 24h accumulation with province geocode
 *
 * On top of the telemetry we encode the physical Chao Phraya river network —
 * Ping / Yom / Nan headwaters converging at Nakhon Sawan (C.2), through the
 * Chao Phraya Dam (C.13) down to Ayutthaya (C.35) and Bangkok — with reach
 * travel times from Royal Irrigation Department flood-routing practice, so a
 * city gets: how much water is coming, from where, and when it arrives.
 *
 * Travel times are operational approximations (±30%): flood waves move
 * ~1–2 m/s in these reaches; RID's published routing tables for the 2011 and
 * 2021–22 events are the anchor. They parameterize ETA display, not hydraulics.
 */

const TW_BASE = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public';
const HEADERS = { accept: 'application/json', 'user-agent': 'GlobalWatch/8 (flood-ops; depa/PMUA research)' };

/** The Chao Phraya cascade — nodes are real HII/RID telemetry stations. */
const CASCADE_NODES = {
    'P.1':  { river: 'Ping', place: 'Chiang Mai — Nawarat Bridge' },
    'P.17': { river: 'Ping', place: 'Banphot Phisai' },
    'Y.4':  { river: 'Yom', place: 'Sukhothai' },
    'N.5A': { river: 'Nan', place: 'Phitsanulok' },
    'N.67': { river: 'Nan', place: 'Chum Saeng (Yom–Nan confluence)' },
    'C.2':  { river: 'Chao Phraya', place: 'Nakhon Sawan (Ping–Nan confluence)' },
    'C.13': { river: 'Chao Phraya', place: 'below Chao Phraya Dam, Chai Nat' },
    'C.3':  { river: 'Chao Phraya', place: 'Sing Buri' },
    'C.35': { river: 'Chao Phraya', place: 'Ayutthaya — Ban Pom' },
};

/**
 * Directed reaches with RID-practice wave travel times (hours) and a few
 * waypoints so flow corridors follow the river's course, not a chord.
 * Coordinates are [lon, lat].
 */
const CASCADE_EDGES = [
    { from: 'P.1', to: 'P.17', hours: 48, via: [[98.99, 18.45], [99.02, 17.65], [99.12, 16.88], [99.72, 16.3]] },
    { from: 'P.17', to: 'C.2', hours: 24, via: [[99.98, 15.8]] },
    { from: 'Y.4', to: 'N.67', hours: 72, via: [[99.9, 16.5], [100.12, 16.0]] },
    { from: 'N.5A', to: 'N.67', hours: 48, via: [[100.26, 16.35], [100.3, 16.05]] },
    { from: 'N.67', to: 'C.2', hours: 12, via: [] },
    { from: 'C.2', to: 'C.13', hours: 24, via: [[100.12, 15.4]] },
    { from: 'C.13', to: 'C.3', hours: 18, via: [[100.32, 15.02]] },
    { from: 'C.3', to: 'C.35', hours: 24, via: [[100.45, 14.6]] },
];

/** Rain catchments as real province sets (TIS-1099 codes) feeding each limb. */
const RAIN_BASINS = [
    { id: 'ping', label: 'Upper Ping (Chiang Mai / Lamphun)', provinces: ['50', '51'], feeds: 'P.1' },
    { id: 'wang', label: 'Wang (Lampang)', provinces: ['52'], feeds: 'P.17' },
    { id: 'yom', label: 'Yom (Phrae / Sukhothai)', provinces: ['54', '64'], feeds: 'Y.4' },
    { id: 'nan', label: 'Nan (Nan / Uttaradit / Phitsanulok)', provinces: ['55', '53', '65'], feeds: 'N.5A' },
    { id: 'lower', label: 'Lower basin (Nakhon Sawan → Ayutthaya)', provinces: ['60', '18', '17', '15', '14'], feeds: 'C.35' },
];

export const FLOOD_CITIES = {
    ayutthaya: {
        id: 'ayutthaya',
        label: 'Phra Nakhon Si Ayutthaya',
        gauge: 'C.35',
        river: 'Chao Phraya',
        anchor: { lat: 14.3532, lon: 100.5689 },
        populationNote: '~53,000 municipal population, island core',
        upstreamPath: ['C.3', 'C.13', 'C.2', 'N.67', 'P.17', 'Y.4', 'N.5A', 'P.1'],
    },
    chiangmai: {
        id: 'chiangmai',
        label: 'Chiang Mai',
        gauge: 'P.1',
        river: 'Ping',
        anchor: { lat: 18.7883, lon: 98.9853 },
        populationNote: '~127,000 municipal population',
        upstreamPath: [],
    },
};

const fetchJson = async (path) => {
    const res = await fetch(`${TW_BASE}/${path}`, { headers: HEADERS, signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error(`thaiwater ${path}: HTTP ${res.status}`);
    return res.json();
};

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const stationName = (st) => st?.tele_station_name?.en || st?.tele_station_name?.th || 'Unknown';

/** Normalize one waterlevel_load record into the shape the dashboard uses. */
const normalizeStation = (r) => {
    const st = r.station || {};
    const lat = num(st.tele_station_lat);
    const lon = num(st.tele_station_long);
    if (lat == null || lon == null) return null;
    const msl = num(r.waterlevel_msl);
    const prev = num(r.waterlevel_msl_previous);
    return {
        code: st.tele_station_oldcode || String(st.id || r.id),
        name: stationName(st),
        lat,
        lon,
        msl,
        pct: num(r.storage_percent),
        discharge: num(r.discharge) ?? num(r.flow_rate),
        level: r.situation_level ?? null,
        // Δ per 10-min reading → cm/hour instantaneous trend.
        trendCmH: msl != null && prev != null ? Math.round((msl - prev) * 100 * 6 * 10) / 10 : null,
        bankMsl: num(st.min_bank),
        groundMsl: num(st.ground_level),
        isKey: Boolean(st.is_key_station),
        basin: r.basin?.basin_name?.en || null,
        province: r.geocode?.province_name?.en || null,
        at: r.waterlevel_datetime || null,
    };
};

/** Hours from an upstream node to the city gauge along the cascade. */
const travelHoursTo = (fromCode, gaugeCode) => {
    // Walk edges downstream, summing hours. The graph is a small tree → BFS.
    const next = new Map(CASCADE_EDGES.map((e) => [e.from, e]));
    let code = fromCode;
    let hours = 0;
    const guard = new Set();
    while (code && code !== gaugeCode && !guard.has(code)) {
        guard.add(code);
        const edge = next.get(code);
        if (!edge) return null;
        hours += edge.hours;
        code = edge.to;
    }
    return code === gaugeCode ? hours : null;
};

const riskRating = (score) => {
    if (score >= 70) return 'CRITICAL';
    if (score >= 45) return 'HIGH';
    if (score >= 25) return 'ELEVATED';
    return 'NORMAL';
};

/**
 * Composite 0–100 city risk. Transparent weights:
 *  50% city gauge channel capacity, 30% worst upstream situation,
 *  20% upstream basin rain loading (100mm/24h ≈ saturated).
 */
const cityRiskScore = (gauge, inbound, rainBasins) => {
    const pct = gauge?.pct ?? 0;
    const capacity = Math.min(1, Math.max(0, pct / 100));
    const worstUp = inbound.length ? Math.max(...inbound.map((s) => s.level || 0)) : 0;
    const upstream = Math.min(1, worstUp / 5);
    const maxRain = rainBasins.length ? Math.max(...rainBasins.map((b) => b.max24h || 0)) : 0;
    const rain = Math.min(1, maxRain / 100);
    return Math.round((capacity * 0.5 + upstream * 0.3 + rain * 0.2) * 100);
};

export const buildFloodOps = async (cityId = 'ayutthaya') => {
    const city = FLOOD_CITIES[cityId] || FLOOD_CITIES.ayutthaya;

    const [wlRaw, rainRaw] = await Promise.all([
        fetchJson('waterlevel_load'),
        fetchJson('rain_24h'),
    ]);

    const stations = (wlRaw?.waterlevel_data?.data || [])
        .map(normalizeStation)
        .filter(Boolean);
    if (!stations.length) throw new Error('thaiwater returned no stations');

    const byCode = new Map(stations.map((s) => [s.code, s]));
    const gauge = byCode.get(city.gauge) || null;

    // ── Inbound water: live state of every upstream cascade node + ETA ──
    const inbound = city.upstreamPath
        .map((code) => {
            const s = byCode.get(code);
            if (!s) return null;
            return {
                ...s,
                place: CASCADE_NODES[code]?.place || s.name,
                river: CASCADE_NODES[code]?.river || s.basin,
                etaHours: travelHoursTo(code, city.gauge),
            };
        })
        .filter(Boolean)
        .sort((a, b) => (a.etaHours ?? 1e9) - (b.etaHours ?? 1e9));

    // ── Basin rain loading (rain gauges grouped by real province sets) ──
    const rainRecords = rainRaw?.data || [];
    const rainBasins = RAIN_BASINS.map((basin) => {
        const inBasin = rainRecords.filter((r) =>
            basin.provinces.includes(String(r.geocode?.province_code || '')));
        const vals = inBasin.map((r) => num(r.rain_24h)).filter((v) => v != null);
        const max24h = vals.length ? Math.max(...vals) : 0;
        const heavy = vals.filter((v) => v >= 35).length; // ≥35mm = HII heavy-rain threshold (r35mm dataset)
        return {
            ...basin,
            stations: vals.length,
            max24h: Math.round(max24h * 10) / 10,
            avg24h: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0,
            heavyStations: heavy,
        };
    });

    // ── National situation ──
    const level5 = stations.filter((s) => s.level === 5);
    const level4 = stations.filter((s) => s.level === 4);
    const national = {
        level5: level5.length,
        level4: level4.length,
        overbank: level5
            .slice(0, 6)
            .map((s) => ({ code: s.code, name: s.name, pct: s.pct, province: s.province })),
    };

    // ── GeoJSON for the map: gauges + flow corridors ──
    const stationsGeo = {
        type: 'FeatureCollection',
        features: stations.map((s) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
            properties: {
                code: s.code, name: s.name, msl: s.msl, pct: s.pct,
                discharge: s.discharge, level: s.level ?? 0, isKey: s.isKey,
                trendCmH: s.trendCmH, province: s.province,
                onCascade: Boolean(CASCADE_NODES[s.code]),
            },
        })),
    };

    const corridorsGeo = {
        type: 'FeatureCollection',
        features: CASCADE_EDGES.map((e) => {
            const a = byCode.get(e.from);
            const b = byCode.get(e.to);
            if (!a || !b) return null;
            const coords = [[a.lon, a.lat], ...e.via, [b.lon, b.lat]];
            const upstreamLevel = a.level ?? 0;
            return {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: coords },
                properties: {
                    from: e.from, to: e.to, hours: e.hours,
                    discharge: a.discharge ?? 0,
                    level: upstreamLevel,
                    label: `${e.from} → ${e.to} · ${a.discharge != null ? `${Math.round(a.discharge)} m³/s` : 'n/a'} · ~${e.hours}h`,
                },
            };
        }).filter(Boolean),
    };

    const riskScore = cityRiskScore(gauge, inbound, rainBasins);

    return {
        city: {
            id: city.id,
            label: city.label,
            river: city.river,
            anchor: city.anchor,
            populationNote: city.populationNote,
            gauge,
        },
        riskScore,
        rating: riskRating(riskScore),
        inbound,
        rainBasins,
        national,
        geo: { stations: stationsGeo, corridors: corridorsGeo },
        cities: Object.values(FLOOD_CITIES).map((c) => ({ id: c.id, label: c.label })),
        meta: {
            source: 'HII / ThaiWater national telemetry (api-v3.thaiwater.net)',
            stations: stations.length,
            rainStations: rainRecords.length,
            fetchedAt: new Date().toISOString(),
            note: 'Travel times are RID flood-routing approximations (±30%); trend is instantaneous 10-min slope.',
        },
    };
};
