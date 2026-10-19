import test from 'node:test';
import assert from 'node:assert/strict';
import { AQI_CITIES, fetchAirQualityPayload } from '../server/lib/airQuality.mjs';

test('AQI_CITIES covers Jakarta and the regional capitals', () => {
    const names = AQI_CITIES.map((c) => c.name);
    assert.ok(names.includes('Jakarta'), 'Jakarta must be in AQI_CITIES');
    assert.ok(names.includes('Singapore'));
    assert.ok(names.includes('Bangkok'));
    // 11 cities shipped from the original client service; keep the count so
    // a surprise deletion surfaces here, not in production.
    assert.equal(AQI_CITIES.length, 11);
});

test('fetchAirQualityPayload never invents a number — every city is null or numeric', async () => {
    const r = await fetchAirQualityPayload();
    assert.equal(r.type, 'FeatureCollection');
    assert.equal(r.features.length, AQI_CITIES.length);
    for (const f of r.features) {
        const p = f.properties;
        assert.equal(typeof p.city, 'string');
        if (p.aqi !== null) assert.ok(Number.isFinite(p.aqi));
        if (p.pm25 !== null) assert.ok(Number.isFinite(p.pm25));
        if (p.color) assert.match(p.color, /^#[0-9a-f]{6}$/i);
        // Either US-AQI band label or null (when upstream is down).
        if (p.category !== null) {
            assert.ok(['Good', 'Moderate', 'Unhealthy for Sensitive Groups',
                'Unhealthy', 'Very Unhealthy', 'Hazardous'].includes(p.category),
                `unknown category ${p.category} for ${p.city}`);
        }
    }
    assert.ok(r.meta.fetchedAt);
});

test('fetchAirQualityPayload reports source as open-meteo', async () => {
    const r = await fetchAirQualityPayload();
    assert.equal(r.meta.source, 'open-meteo-air-quality');
});
