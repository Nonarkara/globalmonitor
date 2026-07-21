/**
 * Airlabs flight enrichment — adds route, airline, flight number, aircraft type
 * and country flag to live aircraft, keyed by ICAO hex.
 *
 * The free tier is capped at ~1000 requests/MONTH, so this is a sparse, long-
 * cached enrichment layer (NOT a polling source). Each theater self-refreshes at
 * most once every 3h (~720 calls/month across 3 theaters), decoupled from the
 * 35s flight cache: flight payloads enrich from whatever snapshot exists.
 *
 * Requires env: AIRLABS_API_KEY (airlabs.co).
 */

import { THEATERS } from './theaters.mjs';

// Airlabs bbox = "minLat,minLng,maxLat,maxLng" — sourced from the shared
// theater registry (theaters.mjs). Unknown theaters fall back to 'global'
// in getAirlabsEnrichment below (historical behavior preserved).
const THEATER_BBOX = Object.fromEntries(
    Object.entries(THEATERS).map(([id, t]) => [id, t.airlabsBbox])
);

const TTL_MS = 3 * 60 * 60 * 1000; // 3h — well under the monthly cap
const cache = new Map();           // theater -> { byHex:Map, fetchedAt:number }
const inflight = new Map();        // theater -> Promise (dedupe concurrent refresh)

export const isAirlabsEnabled = () => Boolean(process.env.AIRLABS_API_KEY);

const refresh = async (theater) => {
    const key = process.env.AIRLABS_API_KEY;
    const bbox = THEATER_BBOX[theater];
    if (!key || !bbox) return;
    try {
        const url = `https://airlabs.co/api/v9/flights?api_key=${key}&bbox=${bbox}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return;
        const data = await res.json();
        const byHex = new Map();
        for (const f of data.response || []) {
            if (!f.hex) continue;
            byHex.set(String(f.hex).toLowerCase(), {
                flightIata: f.flight_iata || null,
                airlineIata: f.airline_iata || null,
                depIata: f.dep_iata || null,
                arrIata: f.arr_iata || null,
                aircraft: f.aircraft_icao || null,
                flag: f.flag || null,
                reg: f.reg_number || null,
                status: f.status || null,
            });
        }
        if (byHex.size) cache.set(theater, { byHex, fetchedAt: Date.now() });
    } catch {
        /* keep last snapshot on error */
    }
};

/**
 * Return the current hex→enrichment map for a theater, kicking off a background
 * refresh when the snapshot is missing or older than the TTL. Non-blocking: the
 * caller enriches with whatever exists now (empty on the very first call).
 */
export const getAirlabsEnrichment = (theater) => {
    if (!isAirlabsEnabled()) return null;
    const t = THEATER_BBOX[theater] ? theater : 'global';
    const entry = cache.get(t);
    const stale = !entry || Date.now() - entry.fetchedAt > TTL_MS;
    if (stale && !inflight.has(t)) {
        inflight.set(t, refresh(t).finally(() => inflight.delete(t)));
    }
    return entry?.byHex || null;
};

/** Mutating enrichment of a flight FeatureCollection in place. Returns count. */
export const enrichFlights = (payload, theater) => {
    const byHex = getAirlabsEnrichment(theater);
    if (!byHex || !payload?.features?.length) return 0;
    let enriched = 0;
    for (const feature of payload.features) {
        const hex = String(feature.properties?.hex || '').toLowerCase();
        const e = hex && byHex.get(hex);
        if (!e) continue;
        const p = feature.properties;
        if (e.depIata && e.arrIata) p.route = `${e.depIata}→${e.arrIata}`;
        if (e.airlineIata) p.airline = e.airlineIata;
        if (e.flightIata) p.flightIata = e.flightIata;
        if (e.aircraft) p.aircraftType = e.aircraft;
        if (e.flag) p.flag = e.flag;
        if (e.reg && !p.reg) p.reg = e.reg;
        enriched++;
    }
    if (enriched) payload.meta = { ...payload.meta, airlabsEnriched: enriched };
    return enriched;
};
