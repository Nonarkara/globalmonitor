/**
 * Air-quality server proxy — PM2.5 / US AQI for major Asian capitals.
 *
 * Source: Open-Meteo air-quality API (keyless, CORS-allowed). One HTTP call
 * fans out to the same 11 cities the client was hitting directly — moving
 * the 11 parallel requests from the user's browser to the server is faster,
 * keeps Open-Meteo's per-IP rate limits on the dashboard side, and lets us
 * cache the result at the edge for an hour (per city, the field changes
 * over minutes but the *layer* on the map doesn't need to).
 *
 * The US AQI bands are taken verbatim from EPA: 0/50/100/150/200/300 →
 * Good / Moderate / USG / Unhealthy / Very Unhealthy / Hazardous. Six
 * categories, six colors — non-arbitrary.
 *
 * Same honesty rules as the rest of the loaders: never fabricate a number.
 * If Open-Meteo errors, every city reports `null` pm2_5 / aqi with source
 * 'open-meteo-error' and the legend on the map says "AQI unavailable".
 */
const OPEN_METEO_AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export const AQI_CITIES = [
    { name: 'Bangkok',       lat:  13.7563, lon: 100.5018 },
    { name: 'Chiang Mai',    lat:  18.7902, lon:  98.9817 },
    { name: 'Phuket',        lat:   7.8804, lon:  98.3923 },
    { name: 'Singapore',     lat:   1.3521, lon: 103.8198 },
    { name: 'Kuala Lumpur',  lat:   3.1390, lon: 101.6869 },
    { name: 'Jakarta',       lat:  -6.2088, lon: 106.8456 },
    { name: 'Manila',        lat:  14.5995, lon: 120.9842 },
    { name: 'Ho Chi Minh',   lat:  10.8231, lon: 106.6297 },
    { name: 'Yangon',        lat:  16.8409, lon:  96.1451 },
    { name: 'Tokyo',         lat:  35.6762, lon: 139.6503 },
    { name: 'Seoul',         lat:  37.5665, lon: 126.9780 }
];

const AQI_BANDS = [
    { max: 50,  color: '#3b82f6', label: 'Good' },
    { max: 100, color: '#10b981', label: 'Moderate' },
    { max: 150, color: '#f59e0b', label: 'Unhealthy for Sensitive Groups' },
    { max: 200, color: '#ef4444', label: 'Unhealthy' },
    { max: 300, color: '#b91c1c', label: 'Very Unhealthy' },
    { max: Infinity, color: '#7f1d1d', label: 'Hazardous' }
];

const bandFor = (aqi) => AQI_BANDS.find((b) => aqi <= b.max);

const fetchOne = async (city, signal) => {
    const url = `${OPEN_METEO_AIR}?latitude=${city.lat}&longitude=${city.lon}`
        + '&current=us_aqi,pm2_5,pm10&timezone=UTC';
    try {
        const res = await fetch(url, { signal, headers: { 'User-Agent': 'GlobeWatch/1.0 (+https://globalmonitor.nonarkara.org/)' } });
        if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
        const body = await res.json();
        const cur = body?.current || {};
        const aqi = Number.isFinite(cur.us_aqi) ? cur.us_aqi : null;
        const band = aqi == null ? null : bandFor(aqi);
        return {
            city: city.name, lat: city.lat, lon: city.lon,
            aqi, pm25: Number.isFinite(cur.pm2_5) ? cur.pm2_5 : null,
            pm10: Number.isFinite(cur.pm10) ? cur.pm10 : null,
            observedAt: cur.time ? `${cur.time}Z` : null,
            category: band?.label || null,
            color: band?.color || '#9ca3af'
        };
    } catch (err) {
        return { city: city.name, lat: city.lat, lon: city.lon, aqi: null, pm25: null, pm10: null, category: null, color: '#9ca3af', error: String(err?.name || err?.message || err) };
    }
};

export const fetchAirQualityPayload = async () => {
    const observed = await Promise.all(AQI_CITIES.map((c) => fetchOne(c, AbortSignal.timeout(12000))));

    // Pick the most recent observed time as "as of".
    const obs = observed.map((o) => o.observedAt).filter(Boolean).sort();
    const observedAt = obs[obs.length - 1] || null;

    const features = observed.map((o, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [o.lon, o.lat] },
        properties: {
            id: `aqi-${i}`,
            city: o.city,
            title: `Air Quality: ${o.city}`,
            aqi: o.aqi,
            pm25: o.pm25,
            pm10: o.pm10,
            category: o.category,
            color: o.color,
            error: o.error || null,
            observedAt: o.observedAt,
            type: 'aqi'
        }
    }));

    const ok = features.filter((f) => f.properties.aqi != null).length;
    return {
        type: 'FeatureCollection',
        features,
        meta: {
            count: features.length,
            live: ok,
            observedAt,
            fetchedAt: new Date().toISOString(),
            source: 'open-meteo-air-quality',
            note: ok === 0
                ? 'Air-quality upstream did not answer — AQI unavailable; legend shows why.'
                : ok < features.length
                    ? `Live AQI for ${ok} of ${features.length} cities.`
                    : 'Live US AQI / PM2.5 — Open-Meteo air-quality, keyless.'
        }
    };
};
