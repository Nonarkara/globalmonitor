/**
 * Internet outages — Cloudflare Radar outage annotations.
 *
 * Why this layer: connectivity loss is one of the few conflict signals that is
 * both measured and attributed. Cloudflare sees a share of the world's traffic,
 * detects drops, and its analysts annotate each confirmed outage with a cause —
 * MILITARY_ACTION, GOVERNMENT_DIRECTED, CABLE_CUT, POWER_OUTAGE, NATURAL_DISASTER.
 * When this was wired (2026-10-15) the list held an ongoing military-action
 * outage in Russia and a government restriction in Ethiopia "after fighting
 * breaks out" — the questions a "is it safe to send someone" decision needs.
 *
 * This is the measured counterpart to src/data/conflictBlackouts.js, which is a
 * hand-written list. Nothing here is typed by us: every point is a Cloudflare
 * annotation, placed at the country coordinates Radar itself publishes.
 *
 * Needs CLOUDFLARE_RADAR_TOKEN (an API token with Account > Radar > Read).
 * Without it the layer is empty and says why — no stand-in data.
 */
const API = 'https://api.cloudflare.com/client/v4/radar';
const WINDOW = '28d';
const LOCATIONS_TTL_MS = 24 * 60 * 60 * 1000;

let locationsCache = null; // { byCode: Map, loadedAt }

const radarGet = async (path, token) => {
    const res = await fetch(`${API}/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
        const msg = body?.errors?.[0]?.message || `HTTP ${res.status}`;
        throw new Error(`Cloudflare Radar: ${msg}`);
    }
    return body.result;
};

const getLocations = async (token) => {
    if (locationsCache && Date.now() - locationsCache.loadedAt < LOCATIONS_TTL_MS) return locationsCache.byCode;
    const result = await radarGet('entities/locations?limit=300&format=json', token);
    const byCode = new Map();
    for (const l of result.locations || []) {
        const lat = Number(l.latitude);
        const lon = Number(l.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) byCode.set(l.alpha2, { lat, lon, name: l.name });
    }
    locationsCache = { byCode, loadedAt: Date.now() };
    return byCode;
};

/** Country codes whose full name appears as a whole word in `text`. */
const countriesNamedIn = (text = '', locations) => {
    const found = [];
    for (const [code, loc] of locations) {
        const name = loc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${name}\\b`, 'i').test(text)) found.push(code);
    }
    return found;
};

/** Plain-language cause, and the coarse class the map colours by. */
const CAUSE = {
    MILITARY_ACTION: ['Military action', 'conflict'],
    GOVERNMENT_DIRECTED: ['Government-directed', 'state'],
    CABLE_CUT: ['Cable cut', 'infrastructure'],
    POWER_OUTAGE: ['Power outage', 'infrastructure'],
    NATURAL_DISASTER: ['Natural disaster', 'hazard'],
    WEATHER: ['Weather', 'hazard'],
    TECHNICAL_PROBLEM: ['Technical problem', 'technical'],
    NETWORK_PROBLEM: ['Network problem', 'technical'],
    MAINTENANCE: ['Maintenance', 'technical'],
    UNKNOWN: ['Cause not stated', 'unknown'],
};

export const emptyOutages = (source, note) => ({
    type: 'FeatureCollection',
    features: [],
    meta: { count: 0, window: WINDOW, fetchedAt: new Date().toISOString(), source, note },
});

export const fetchRadarOutages = async () => {
    const token = process.env.CLOUDFLARE_RADAR_TOKEN || '';
    if (!token) {
        return emptyOutages('no_radar_key',
            'CLOUDFLARE_RADAR_TOKEN is not set. Internet outages come from Cloudflare Radar; nothing is shown in its place.');
    }

    const [result, locations] = await Promise.all([
        radarGet(`annotations/outages?dateRange=${WINDOW}&limit=100&format=json`, token),
        getLocations(token),
    ]);

    const features = [];
    let unplaced = 0;
    for (const a of result.annotations || []) {
        // Country from the annotation; if it names only networks, take the
        // networks' country. An outage with neither cannot be placed honestly.
        // Networks are a fallback only: an Iraqi exam shutdown names one network
        // registered in the UAE, and merging both put a false pin on the UAE.
        const stated = a.locations || [];
        let placedBy = 'annotation';
        let codes = new Set(stated.length
            ? stated
            : (a.asnsDetails || []).map((n) => n?.location?.code).filter(Boolean));
        // Last resort: some annotations carry only a sentence ("Internet restricted
        // after fighting breaks out in Ethiopia's Tigray region" had no country,
        // no network). Place it only if exactly one country is named; say so.
        if (!codes.size) {
            const named = countriesNamedIn(a.description, locations);
            if (named.length === 1) { codes = new Set(named); placedBy = 'description'; }
        }
        if (!codes.size) { unplaced += 1; continue; }

        const rawCause = a.outage?.outageCause || 'UNKNOWN';
        const [cause, causeClass] = CAUSE[rawCause] || [rawCause.replace(/_/g, ' ').toLowerCase(), 'unknown'];
        const ongoing = !a.endDate;
        const networks = (a.asnsDetails || []).map((n) => n.name).filter(Boolean).slice(0, 4);

        for (const code of codes) {
            const loc = locations.get(code);
            if (!loc) { unplaced += 1; continue; }
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [loc.lon, loc.lat] },
                properties: {
                    id: `${a.id}-${code}`,
                    country: loc.name,
                    countryCode: code,
                    cause,
                    causeClass,
                    scope: a.outage?.outageType || null, // NATIONWIDE | REGIONAL | NETWORK
                    startDate: a.startDate || null,
                    endDate: a.endDate || null,
                    ongoing,
                    description: a.description || '',
                    networks: networks.join(', '),
                    linkedUrl: a.linkedUrl || null,
                    placedBy,
                },
            });
        }
    }

    return {
        type: 'FeatureCollection',
        features,
        meta: {
            count: features.length,
            ongoing: features.filter((f) => f.properties.ongoing).length,
            unplaced,
            window: WINDOW,
            fetchedAt: new Date().toISOString(),
            source: 'cloudflare-radar',
            note: 'Outages confirmed and annotated by Cloudflare Radar analysts, placed at country coordinates published by Radar.',
        },
    };
};
