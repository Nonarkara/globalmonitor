import test from 'node:test';
import assert from 'node:assert/strict';
import { windBarbs } from '../src/utils/windBarbs.js';

/**
 * The wind barb is a CONVENTION, and the convention is the international
 * one: "winds are depicted as blowing from the direction the flags are
 * facing" — the staff runs from the station circle toward where the wind
 * comes FROM, and the flags ride its outer end.
 *
 * This matters more than a taste question. A glyph that looks like a barb
 * but points the other way is not a barb that reads differently, it is a
 * barb that reads WRONG: every direction in the field inverted, for
 * exactly the reader who knows what a barb is. The wall shipped that way
 * once, and the contract enshrined the inversion, so the code and the
 * contract agreed with each other and both disagreed with the world.
 */

const barbFor = (fromDeg, speedKmh = 60) => {
    const fc = windBarbs({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [100, 0] },
            properties: { speedKmh, fromDeg }
        }]
    });
    const shaft = fc.features.find((f) => f.properties.kind === 'shaft');
    const featherFeature = fc.features.find((f) => f.properties.kind === 'barbs');
    return {
        tip: shaft?.geometry.coordinates.slice(-1)[0] || null,
        // The barbs come back as one MultiLineString: an array of lines.
        feathers: featherFeature?.geometry.coordinates || [],
        features: fc.features
    };
};

test('the staff points INTO the wind — toward where the wind comes from', () => {
    // A westerly comes FROM the west, so the staff must reach west.
    const west = barbFor(270);
    assert.ok(west.tip[0] < 100, `a westerly's staff reached ${west.tip[0]} — it must point west, not east`);

    // A northerly comes from the north: the staff reaches north.
    const north = barbFor(0);
    assert.ok(north.tip[1] > 0, `a northerly's staff reached ${north.tip[1]} — it must point north`);

    // An easterly comes from the east.
    const east = barbFor(90);
    assert.ok(east.tip[0] > 100, `an easterly's staff reached ${east.tip[0]} — it must point east`);
});

test('the feathers ride the OUTER end of the staff, not the circle', () => {
    const { tip, feathers } = barbFor(270);
    const [anchor] = feathers[0];
    const distance = Math.hypot(anchor[0] - tip[0], anchor[1] - tip[1]);
    assert.ok(distance < 0.01, 'the feathers must start at the outer end of the staff');
    // And they must not touch the station circle.
    assert.ok(anchor[0] < 99.5, 'the feathers must not reach back to the circle');
});

test('a calm point draws a circle and a staff and NO feathers', () => {
    const { features } = barbFor(0, 0);
    assert.ok(features.some((f) => f.properties.kind === 'station'), 'the circle is missing');
    assert.ok(features.some((f) => f.properties.kind === 'shaft'), 'the staff is missing');
    assert.ok(!features.some((f) => f.properties.kind === 'barbs'), 'a calm point must have no feathers');
});

test('the speed is carried by the NUMBER of feathers, not their length', () => {
    // 30 kt = three full feathers; 35 kt = three full and one half.
    const thirty = barbFor(270, 55.6);     // 30 kt in km/h
    const thirtyFive = barbFor(270, 64.8); // 35 kt in km/h
    assert.equal(thirty.feathers.length, 3, '30 kt is three full feathers');
    assert.equal(thirtyFive.feathers.length, 4, '35 kt is three full feathers and a half');
    // The half feather is shorter than the full ones.
    const lengths = thirtyFive.feathers.map((f) => Math.hypot(f[1][0] - f[0][0], f[1][1] - f[0][1]));
    const shortest = Math.min(...lengths);
    const longest = Math.max(...lengths);
    assert.ok(shortest < longest * 0.75, 'the half feather must be about half the length of a full one');
});
