import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutProblems } from '../scripts/live-suite-check.mjs';
import { THAILAND_BORDER_PROVENANCE, THAILAND_BORDER_GEOJSON } from '../src/data/thailandBorders.js';
import { regionalBriefingItems } from '../src/utils/briefingRelevance.js';

test('real layout guard rejects title overlap, clipped selector and squeezed map independently', () => {
  const good = {overflow:0,mapShare:.82,titleEscapes:false,selectWidth:155,offscreen:[],failed:false};
  assert.deepEqual(layoutProblems(good), []);
  for (const bad of [{titleEscapes:true},{selectWidth:22},{mapShare:.24},{offscreen:['Tools']},{overflow:4}])
    assert.ok(layoutProblems({...good,...bad}).length > 0);
});

test('border reference never manufactures an observation date or live assessment', () => {
  assert.equal(THAILAND_BORDER_PROVENANCE.tier, 'reference');
  assert.equal(THAILAND_BORDER_PROVENANCE.observedAt, null);
  assert.match(THAILAND_BORDER_PROVENANCE.qualification, /unverified.*not current/i);
  for (const f of THAILAND_BORDER_GEOJSON.features) {
    assert.equal(f.properties.tier, 'reference');
    assert.equal(f.properties.observedAt, null);
    assert.equal(f.properties.source, THAILAND_BORDER_PROVENANCE.source);
  }
});
test('Gulf headlines cannot become Myanmar or South China Sea reports through broad wire feeds', () => {
  const gulf = {title:'Yemen Houthis deny launching drones towards Saudi Arabia'};
  const myanmar = {title:'Myanmar border aid reaches Mae Sot'};
  const sea = {title:'Philippines reports patrol at Scarborough Shoal'};
  assert.deepEqual(regionalBriefingItems('myanmarConflict',[gulf,myanmar,sea]).items,[myanmar]);
  assert.deepEqual(regionalBriefingItems('southChinaSea',[gulf,myanmar,sea]).items,[sea]);
  assert.equal(regionalBriefingItems('myanmarConflict',[gulf]).items.length,0);
});
