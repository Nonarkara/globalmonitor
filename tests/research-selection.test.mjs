import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedResearchContext } from '../src/research/selection.js';

test('research uses an explicit event label and supplied times, never geometry or a regional centroid', () => {
  const result = selectedResearchContext({ properties: { title: 'Public report', publishedAt: '2026-10-25T01:00:00Z' }, geometry: { coordinates: [1, 2] } }, null, 'global');
  assert.equal(result.label, 'Public report'); assert.equal(result.publishedAt, '2026-10-25T01:00:00Z');
  assert.equal(result.observedAt, undefined); assert.equal('coordinates' in result, false);
});
test('country selection is resolved within the current theater and an absent selection stays absent', () => {
  assert.equal(selectedResearchContext(null, 'MY', 'indopacific')?.label, 'Malaysia');
  assert.equal(selectedResearchContext(null, 'MY', 'thailand'), null);
  assert.equal(selectedResearchContext(null, null, 'indopacific'), null);
  assert.equal(selectedResearchContext(null, 'unmapped', 'global'), null);
});
