/**
 * NASA FIRMS (Fire Information for Resource Management System) integration.
 * Fetches VIIRS near-real-time fire/thermal anomaly data and converts to GeoJSON.
 */

const FIRMS_MAP_KEY = process.env.FIRMS_MAP_KEY || '';

const THEATER_BBOX = {
    middleeast: '24,10,65,42',
    indopacific: '90,-10,135,25'
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

export const fetchFirmsPayload = async (theater = 'middleeast') => {
    const bbox = THEATER_BBOX[theater] || THEATER_BBOX.middleeast;
    const days = 2;

    // Try MAP_KEY authenticated endpoint first, fall back to open endpoint
    const urls = FIRMS_MAP_KEY
        ? [
            `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${bbox}/${days}`,
            `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/VIIRS_NOAA20_NRT/${bbox}/${days}`
        ]
        : [
            `https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/${bbox}/${days}`
        ];

    const allFeatures = [];

    for (const url of urls) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) continue;

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

    return {
        type: 'FeatureCollection',
        features: allFeatures,
        meta: {
            theater,
            count: allFeatures.length,
            fetchedAt: new Date().toISOString()
        }
    };
};
