/**
 * NASA FIRMS (Fire Information for Resource Management System) integration.
 * Fetches VIIRS near-real-time fire/thermal anomaly data and converts to GeoJSON.
 *
 * There is deliberately NO sample generator in this file. The previous one
 * invented hotspots at named real places (Gaza, Beirut, Baghdad…), gave each a
 * randomised brightness and attributed it to SNPP or NOAA-20 — a fabricated
 * satellite reading at a real conflict site, stamped with the current
 * acquisition time. tests/data-honesty.test.mjs asserts no random value and no
 * mock generator ever returns to this file. Without a key the honest answer is an empty layer
 * that says why; the escalation gauge and front board treat that as
 * "offline", never as calm.
 */

const FIRMS_MAP_KEY = process.env.FIRMS_MAP_KEY || '';

const THEATER_BBOX = {
    middleeast: '24,10,65,42',
    indopacific: '90,-10,135,25',
    eastasia: '100,18,148,47',
    southasia: '60,5,92,37',
    thailand: '97,5,106,21'
};

const parseCsvLine = (line) => {
    const parts = line.split(',');
    return {
        latitude: parseFloat(parts[0]),
        longitude: parseFloat(parts[1]),
        bright_ti4: parseFloat(parts[2]),
        scan: parseFloat(parts[3]),
        track: parseFloat(parts[4]),
        acq_date: parts[5],
        acq_time: parts[6],
        satellite: parts[7],
        confidence: parts[8]?.trim(),
        version: parts[9],
        bright_ti5: parseFloat(parts[10]),
        frp: parseFloat(parts[11]),
        daynight: parts[12]?.trim()
    };
};

const emptyPayload = (theater, source, note) => ({
    type: 'FeatureCollection',
    features: [],
    meta: {
        theater,
        count: 0,
        fetchedAt: new Date().toISOString(),
        source,
        note
    }
});

export const fetchFirmsPayload = async (theater = 'middleeast') => {
    // An unknown theater must not silently receive another region's fires.
    const bbox = THEATER_BBOX[theater];
    if (!bbox) {
        return emptyPayload(theater, 'no_coverage_for_theater',
            `No FIRMS bounding box is defined for theater "${theater}".`);
    }

    if (!FIRMS_MAP_KEY) {
        return emptyPayload(theater, 'no_firms_key',
            'FIRMS_MAP_KEY is not set. Live NASA VIIRS detections require a key; no sample data is substituted.');
    }

    const days = 2;
    const urls = [
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${bbox}/${days}`,
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/VIIRS_NOAA20_NRT/${bbox}/${days}`
    ];

    const allFeatures = [];
    let answered = 0;

    for (const url of urls) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) continue;
            answered += 1;

            const text = await res.text();
            const lines = text.trim().split('\n');

            // Skip header row
            for (let i = 1; i < lines.length; i++) {
                const row = parseCsvLine(lines[i]);

                if (isNaN(row.latitude) || isNaN(row.longitude)) continue;
                if (row.confidence === 'low' || row.confidence === 'l') continue;

                allFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [row.longitude, row.latitude]
                    },
                    properties: {
                        confidence: row.confidence,
                        frp: isNaN(row.frp) ? 0 : row.frp,
                        brightness: row.bright_ti4,
                        acq_date: row.acq_date,
                        acq_time: row.acq_time,
                        daynight: row.daynight,
                        satellite: row.satellite
                    }
                });
            }
        } catch (err) {
            console.error(`FIRMS fetch error for ${url}:`, err.message);
        }
    }

    // Neither satellite feed answered: that is an outage, not "no fires".
    // Throw so useCached serves its last good payload as STALE instead of
    // caching a successful-looking empty result (same rule as gdelt.mjs).
    if (answered === 0) {
        throw new Error('FIRMS: no VIIRS endpoint answered');
    }

    return {
        type: 'FeatureCollection',
        features: allFeatures,
        meta: {
            theater,
            count: allFeatures.length,
            satellitesAnswered: answered,
            windowDays: days,
            fetchedAt: new Date().toISOString(),
            source: 'nasa-firms-live'
        }
    };
};
