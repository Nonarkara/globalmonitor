import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('city wall initial probe is deferred and both scheduled probes are cancelled on unmount', () => {
  const source = readFileSync(new URL('../src/components/CityWallPanel.jsx', import.meta.url), 'utf8');
  const end = source.indexOf('}, [load]);');
  const start = source.lastIndexOf('useEffect(() => {', end) + 'useEffect(() => {'.length;
  assert.ok(end > start);
  const pending = new Map(); let calls = 0, id = 0;
  const cleanup = vm.runInNewContext('(function(){' + source.slice(start, end) + '})()', {
    load: () => { calls++; }, POLL_MS: 60000, setStamp: () => {}, Date,
    setTimeout: fn => { pending.set(++id, fn); return id; },
    setInterval: fn => { pending.set(++id, fn); return id; },
    clearTimeout: key => pending.delete(key), clearInterval: key => pending.delete(key),
  });
  assert.equal(calls, 0, 'no synchronous state update during effect setup');
  assert.equal(pending.size, 2);
  pending.values().next().value(); assert.equal(calls, 1, 'initial probe still runs when scheduled');
  cleanup(); assert.equal(pending.size, 0, 'unmount cancels initial timeout and polling interval');
});
