/**
 * USGS Earthquake API — free, no auth required.
 * Fetches recent M3+ earthquakes in the Middle East region.
 * Large explosions from military strikes can register as seismic events.
 */

import { getTheater, resolveTheater } from './theaters.mjs';

export const fetchUsgsQuakes = async (theater = 'middleeast') => {
    const resolved = resolveTheater(theater);
    // Global omits bbox params entirely — USGS rejects -180..180 bounds.
    const usgsParams = getTheater(resolved).usgsParams || {};
    const params = new URLSearchParams({
        format: 'geojson',
        minmagnitude: '2.5',
        limit: '50',
        orderby: 'time',
        ...Object.fromEntries(Object.entries(usgsParams).map(([k, v]) => [k, String(v)]))
    });

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`USGS API returned ${res.status}`);

    const data = await res.json();
    const features = (data.features || []).map(f => {
        const p = f.properties;
        const [lon, lat, depth] = f.geometry.coordinates;
        return {
            id: f.id,
            magnitude: p.mag,
            place: p.place,
            time: p.time,
            depth,
            lat,
            lon,
            type: p.type,
            tsunami: p.tsunami,
            url: p.url,
            felt: p.felt,
            significance: p.sig
        };
    });

    // Classify notable events
    const significant = features.filter(f => f.magnitude >= 4.5);
    const recent24h = features.filter(f => Date.now() - f.time < 86400000);

    return {
        type: 'FeatureCollection',
        features: data.features || [],
        theater: resolved,
        summary: {
            total: features.length,
            significant: significant.length,
            last24h: recent24h.length,
            maxMagnitude: features.length > 0 ? Math.max(...features.map(f => f.magnitude)) : 0,
            latest: features[0] || null
        },
        updatedAt: new Date().toISOString()
    };
};
