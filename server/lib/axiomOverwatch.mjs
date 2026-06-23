/**
 * Axiom Overwatch — free global AIS REST snapshot (no API key).
 * Docs: https://docs.axiomancer.io/overwatch/api/vessels
 * Endpoint: GET https://www.axiomoverwatch.io/api/v1/positions/latest
 * CC-BY 4.0 — attribute https://axiomoverwatch.io
 * Rate limit: 60 req/min, 1,000 req/day per IP. CDN cache 5 min.
 */
const API_BASE = 'https://www.axiomoverwatch.io/api/v1/positions/latest';

const GLOBAL_BBOX = { west: -180, south: -90, east: 180, north: 90 };

/** Map Axiom vessel_type strings to map layer categories. */
export function mapAxiomVesselCategory(vesselType) {
    const t = String(vesselType || '').toLowerCase();
    if (t.includes('tanker') || t === 'lng_carrier') return 'tanker';
    if (t.includes('bulk') || t === 'cargo' || t === 'general_cargo' || t === 'container') return 'cargo';
    if (t.includes('passenger')) return 'passenger';
    if (t.includes('fishing')) return 'fishing';
    if (t.includes('tug') || t === 'service') return 'tug';
    if (t.includes('pleasure')) return 'pleasure';
    return 'other';
}

function axiomFeatureToGeoJson(feature) {
    const p = feature?.properties || {};
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;

    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

    const imo = p.imo ? String(p.imo) : null;
    const name = (p.name || '').trim();
    const id = imo || name;
    if (!id) return null;

    const course = Number(p.course) || 0;

    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
            mmsi: imo || id,
            imo,
            name: name || imo || 'Unknown',
            heading: course,
            course,
            speed: Number(p.speed) || 0,
            shipType: 0,
            category: mapAxiomVesselCategory(p.vessel_type),
            destination: p.destination || null,
            source: 'axiom-overwatch.io',
            timestamp: p.timestamp || p.last_seen || null,
        },
    };
}

/** Fetch global vessel positions via REST — works on Cloudflare Pages (no WebSocket). */
export async function fetchAxiomGlobalSnapshot({ timeoutMs = 45_000 } = {}) {
    const params = new URLSearchParams({
        west: String(GLOBAL_BBOX.west),
        south: String(GLOBAL_BBOX.south),
        east: String(GLOBAL_BBOX.east),
        north: String(GLOBAL_BBOX.north),
    });

    try {
        const resp = await fetch(`${API_BASE}?${params}`, {
            signal: AbortSignal.timeout(timeoutMs),
            headers: { Accept: 'application/json' },
        });

        if (!resp.ok) {
            return { features: [], error: `axiom_http_${resp.status}`, meta: null, truncated: false };
        }

        const payload = await resp.json();
        const features = (Array.isArray(payload?.features) ? payload.features : [])
            .map(axiomFeatureToGeoJson)
            .filter(Boolean);

        return {
            features,
            error: features.length ? null : 'empty_axiom_snapshot',
            meta: payload.meta || null,
            truncated: Boolean(payload.meta?.truncated),
        };
    } catch (err) {
        return {
            features: [],
            error: err.message || 'axiom_fetch_failed',
            meta: null,
            truncated: false,
        };
    }
}
