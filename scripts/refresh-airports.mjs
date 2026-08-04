import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOURCE_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUTPUT_PATH = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../public/data/airports/airports.geojson',
);

export const parseCsvLine = (line) => {
    const fields = [];
    let value = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            if (quoted && line[index + 1] === '"') {
                value += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (char === ',' && !quoted) {
            fields.push(value);
            value = '';
        } else {
            value += char;
        }
    }
    fields.push(value);
    return fields;
};

export const airportsCsvToFeatureCollection = (csv, generatedAt = new Date().toISOString()) => {
    const lines = csv.split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(lines.shift());
    const features = [];

    for (const line of lines) {
        const values = parseCsvLine(line);
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
        if (row.type === 'closed') continue;
        if (row.scheduled_service !== 'yes' && row.type !== 'large_airport') continue;

        const lon = Number(row.longitude_deg);
        const lat = Number(row.latitude_deg);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) continue;

        features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: {
                id: row.ident || row.id,
                name: row.name || row.ident || 'Airport',
                type: row.type || 'airport',
                iata: row.iata_code || '',
                icao: row.icao_code || row.gps_code || row.ident || '',
                municipality: row.municipality || '',
                country: row.iso_country || '',
                elevationFt: Number(row.elevation_ft) || 0,
                scheduledService: row.scheduled_service === 'yes',
                source: 'OurAirports',
            },
        });
    }

    return {
        type: 'FeatureCollection',
        features,
        meta: {
            source: 'OurAirports',
            sourceUrl: SOURCE_URL,
            generatedAt,
            count: features.length,
            scope: 'scheduled-service and large airports worldwide',
            license: 'Public Domain',
        },
    };
};

const run = async () => {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`OurAirports ${response.status}`);
    const collection = airportsCsvToFeatureCollection(await response.text());
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(collection)}\n`, 'utf8');
    console.log(`Wrote ${collection.features.length} airports to ${OUTPUT_PATH}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    run().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
