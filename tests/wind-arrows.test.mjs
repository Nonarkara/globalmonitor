/**
 * Wind arrows point DOWNWIND. Meteorological direction is where wind comes FROM,
 * so a sign error here would draw haze drifting the wrong way across the region —
 * plausible-looking and completely wrong, the worst kind of map error.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { windArrows } from '../src/utils/windArrows.js';

const tipOf = (fromDeg, speedKmh = 20) => {
    const arrow = windArrows({ features: [{ geometry: { coordinates: [100, 0] }, properties: { speedKmh, fromDeg } }] });
    return arrow.features[0].geometry.coordinates[0][1];
};

test('a northerly (from 0°) points south', () => {
    const [lon, lat] = tipOf(0);
    assert.ok(lat < 0);
    assert.ok(Math.abs(lon - 100) < 1e-9);
});

test('a westerly (from 270°) points east — the SW monsoon carrying Sumatran haze to Malaysia', () => {
    const [lon, lat] = tipOf(270);
    assert.ok(lon > 100);
    assert.ok(Math.abs(lat) < 1e-9);
});

test('stronger wind draws a longer shaft, capped below the 4° grid', () => {
    const shaft = (kmh) => {
        const [[tail, tip]] = windArrows({ features: [{ geometry: { coordinates: [100, 0] }, properties: { speedKmh: kmh, fromDeg: 90 } }] }).features[0].geometry.coordinates;
        return Math.hypot(tip[0] - tail[0], tip[1] - tail[1]);
    };
    assert.ok(shaft(30) > shaft(5));
    assert.ok(shaft(500) <= 3.2 + 1e-9);
});
