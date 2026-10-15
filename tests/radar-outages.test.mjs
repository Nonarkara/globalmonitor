/**
 * Outage placement is where this layer could lie: a pin in the wrong country is
 * a false claim that its internet went down. These cases pin the rules.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const LOCATIONS = [
    { alpha2: 'IQ', name: 'Iraq', latitude: '33.2', longitude: '43.7' },
    { alpha2: 'AE', name: 'United Arab Emirates', latitude: '23.4', longitude: '53.8' },
    { alpha2: 'ET', name: 'Ethiopia', latitude: '9.1', longitude: '40.5' },
    { alpha2: 'ER', name: 'Eritrea', latitude: '15.2', longitude: '39.8' },
];

const ANNOTATIONS = [
    // Stated country Iraq; one affected network is registered in the UAE.
    { id: 'a1', locations: ['IQ'], asnsDetails: [{ name: 'X', location: { code: 'AE' } }],
      outage: { outageCause: 'GOVERNMENT_DIRECTED', outageType: 'REGIONAL' }, startDate: '2026-10-10', endDate: '2026-10-10', description: 'Exam shutdown' },
    // No country, no network — only a sentence naming one country.
    { id: 'a2', locations: [], asnsDetails: [],
      outage: { outageCause: 'GOVERNMENT_DIRECTED' }, startDate: '2026-09-24', endDate: null,
      description: "Internet restricted after fighting breaks out in Ethiopia's Tigray region" },
    // A sentence naming two countries cannot be placed honestly.
    { id: 'a3', locations: [], asnsDetails: [],
      outage: { outageCause: 'CABLE_CUT' }, startDate: '2026-09-20', endDate: '2026-09-21',
      description: 'Cable damage between Ethiopia and Eritrea' },
];

globalThis.fetch = async (url) => {
    const result = String(url).includes('entities/locations')
        ? { locations: LOCATIONS }
        : { annotations: ANNOTATIONS };
    return { ok: true, status: 200, json: async () => ({ success: true, result }) };
};

const { fetchRadarOutages } = await import('../server/lib/radarOutages.mjs');

test('without a token the layer is empty and says why', async () => {
    delete process.env.CLOUDFLARE_RADAR_TOKEN;
    const r = await fetchRadarOutages();
    assert.equal(r.features.length, 0);
    assert.equal(r.meta.source, 'no_radar_key');
});

test('a network registered abroad does not add a pin in that country', async () => {
    process.env.CLOUDFLARE_RADAR_TOKEN = 'test';
    const r = await fetchRadarOutages();
    const codes = r.features.filter((f) => f.properties.id.startsWith('a1')).map((f) => f.properties.countryCode);
    assert.deepEqual(codes, ['IQ']);
});

test('a sentence naming exactly one country is placed, and marked as such', async () => {
    const r = await fetchRadarOutages();
    const et = r.features.find((f) => f.properties.id.startsWith('a2'));
    assert.equal(et.properties.countryCode, 'ET');
    assert.equal(et.properties.placedBy, 'description');
    assert.equal(et.properties.ongoing, true);
});

test('a sentence naming two countries stays unplaced and is counted', async () => {
    const r = await fetchRadarOutages();
    assert.equal(r.features.some((f) => f.properties.id.startsWith('a3')), false);
    assert.equal(r.meta.unplaced, 1);
});

test('outages group to one point per country, deliberate if any cut was', async () => {
    const { outagesByCountry } = await import('../src/utils/outagesByCountry.js');
    const g = outagesByCountry({ features: [
        { geometry: { coordinates: [43.7, 33.2] }, properties: { countryCode: 'IQ', causeClass: 'technical', startDate: '2026-10-01', ongoing: false } },
        { geometry: { coordinates: [43.7, 33.2] }, properties: { countryCode: 'IQ', causeClass: 'state', startDate: '2026-10-10', ongoing: true } },
    ] });
    assert.equal(g.features.length, 1);
    const p = g.features[0].properties;
    assert.equal(p.count, 2);
    assert.equal(p.deliberate, true);
    assert.equal(p.ongoing, true);
    assert.equal(p.startDate, '2026-10-10'); // latest leads the card
});
