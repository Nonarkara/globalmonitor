import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAirLabsFlights } from '../server/lib/airLabs.mjs';
import { airportsCsvToFeatureCollection } from '../scripts/refresh-airports.mjs';
import { sanitizePointCollection } from '../src/utils/geojsonValidate.js';
import { buildPopupClassName } from '../src/utils/mapPopup.js';

test('AirLabs records normalize to safe MapLibre points', () => {
    const features = normalizeAirLabsFlights([
        {
            hex: 'ABC123', lat: 13.69, lng: 100.75, alt: 10000, speed: 720,
            dir: 91, flight_icao: 'THA123', dep_iata: 'BKK', arr_iata: 'HKT',
            aircraft_icao: 'A320', status: 'en-route',
        },
        { hex: 'bad', lat: null, lng: 500 },
    ], 'global');

    assert.equal(features.length, 1);
    assert.deepEqual(features[0].geometry.coordinates, [100.75, 13.69]);
    assert.equal(features[0].properties.velocity, 200);
    assert.equal(features[0].properties.source, 'airlabs');
});

test('airport build keeps worldwide scheduled and large airports only', () => {
    const csv = [
        'id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords,icao_code',
        '1,VTBS,large_airport,Suvarnabhumi,13.69,100.75,5,AS,TH,TH-10,Bangkok,yes,VTBS,BKK,,,,,VTBS',
        '2,SMALL,small_airport,Private Strip,14,101,3,AS,TH,TH-10,,no,,,,,,,',
        '3,CLOSED,closed,Closed Field,15,102,4,AS,TH,TH-10,,yes,,,,,,,',
        '4,EGLL,large_airport,Heathrow,51.47,-0.4543,83,EU,GB,GB-ENG,London,yes,EGLL,LHR,,,,,EGLL',
    ].join('\n');

    const collection = airportsCsvToFeatureCollection(csv, '2026-08-04T00:00:00.000Z');
    assert.equal(collection.features.length, 2);
    assert.deepEqual(collection.features.map((feature) => feature.properties.iata), ['BKK', 'LHR']);
    assert.equal(collection.meta.source, 'OurAirports');
});

test('traffic sanitization rejects invalid aircraft and vessel coordinates', () => {
    const collection = sanitizePointCollection({
        type: 'FeatureCollection',
        features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [100, 13] }, properties: {} },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [NaN, 13] }, properties: {} },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [181, 13] }, properties: {} },
        ],
    });
    assert.equal(collection.features.length, 1);
});

test('popup class names never contain an empty DOMTokenList token', () => {
    for (const layerId of ['flights-icons', 'vessels-icons', 'airports-points', 'unknown']) {
        const className = buildPopupClassName(layerId);
        assert.ok(className);
        assert.equal(className.split(' ').some((token) => token.length === 0), false);
    }
});
