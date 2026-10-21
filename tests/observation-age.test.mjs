import test from 'node:test';
import assert from 'node:assert/strict';
import { observationAge, trafficObservationAt } from '../src/utils/observationAge.js';

test('snapshot observation outranks the freshly assembled response', () => {
  const meta = { source: 'ais-snapshot', staticSnapshotAt: '2026-10-02T12:00:00Z', fetchedAt: '2026-10-21T12:00:00Z' };
  assert.equal(observationAge(trafficObservationAt(meta), Date.parse(meta.fetchedAt)), '19d old');
  assert.notEqual(observationAge(meta.fetchedAt, Date.parse(meta.fetchedAt)), '19d old');
});
test('missing and invalid observation clocks stay unknown', () => {
  for (const value of [null,'nonsense','2030-01-01']) assert.equal(observationAge(value, Date.parse('2026-10-21')), 'age unavailable');
  assert.equal(trafficObservationAt({updatedAt:'2026-10-21'}), null);
});
test('measurement time outranks later collection', () => {
  const meta = { observationAt: '2026-10-21T10:00:00Z', collectedAt: '2026-10-21T12:00:00Z' };
  assert.equal(observationAge(trafficObservationAt(meta), Date.parse(meta.collectedAt)), '2h old');
});
test('an inactive fallback date cannot age an active provider response', () => {
  const meta = {aisSource:'axiom-overwatch',staticSnapshot:false,staticSnapshotAt:'2026-06-23T00:00:00Z',fetchedAt:'2026-10-21T12:00:00Z'};
  assert.equal(trafficObservationAt(meta),meta.fetchedAt);
});
