import test from 'node:test';
import assert from 'node:assert/strict';

import { EO_TILE_LAYERS, getEoLayerById } from '../src/services/eoTiles.js';
import { SKY_LAYERS, SKY_LAYER_IDS } from '../src/data/skyLayers.js';
import { isStormEvent } from '../src/services/nasaEonet.js';

test('sky strip names the daily NASA photo, not the Esri mosaic', () => {
    assert.equal(SKY_LAYERS[0].id, 'eo-true-color');
    assert.equal(SKY_LAYERS[0].title, 'Photo');
    assert.ok(SKY_LAYER_IDS.includes('eo-cloud'));
    assert.ok(SKY_LAYER_IDS.includes('eo-aerosol'));
    assert.ok(SKY_LAYER_IDS.includes('weather'));
    assert.ok(SKY_LAYER_IDS.includes('typhoons'));
});

test('latest photo tiles are NOAA-20 VIIRS true color', () => {
    const layer = getEoLayerById('eo-true-color');
    assert.ok(layer);
    assert.equal(layer.name, 'Latest photo');
    assert.ok(layer.tiles[0].includes('VIIRS_NOAA20_CorrectedReflectance_TrueColor'));
    // NASA's default time resolves to that product's latest available day.
    // Do not invent a one-day observation age or import a retired date helper.
    assert.ok(layer.tiles[0].includes('/default/default/'));
});

test('cloud fraction layer is on the catalog', () => {
    assert.ok(EO_TILE_LAYERS.some((layer) => layer.id === 'eo-cloud'));
    const cloud = getEoLayerById('eo-cloud');
    assert.ok(cloud.tiles[0].includes('Cloud_Fraction'));
});

test('storm filter matches cyclone titles', () => {
    assert.equal(isStormEvent({ properties: { title: 'Tropical Storm Lala', category: 'Severe Storms' } }), true);
    assert.equal(isStormEvent({ properties: { title: 'Wildfire', category: 'Wildfires' } }), false);
});
