import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { stampWorker } from '../scripts/stamp-service-worker.mjs';
import { registerAppUpdates } from '../src/services/appUpdates.js';

test('every changed entry produces a different stamped service worker', async () => {
    const source = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
    const html = hash => `<script type="module" crossorigin src="/assets/index-${hash}.js"></script>`;
    assert.notEqual(stampWorker(source, html('one')), stampWorker(source, html('two')));
    assert.notEqual(stampWorker(source, html('one') + '<link rel="stylesheet" href="/assets/one.css">'), stampWorker(source, html('one') + '<link rel="stylesheet" href="/assets/two.css">'));
    assert.ok(!stampWorker(source, html('one')).includes('__APP_ENTRY__'));
    assert.throws(() => stampWorker(source, '<html>no entry</html>'));
});

test('returning tabs answer release checks and recheck on foreground/online', async () => {
    const events = {}, listeners = {}; let checks = 0;
    const worker = { addEventListener: (name, handler) => { events[name] = handler; }, register: async (url, options) => {
        assert.equal(url, 'https://example.test/sw.js');
        assert.equal(options.updateViaCache, 'none');
        return { update: async () => { checks++; } };
    } };
    registerAppUpdates({ navigator: { serviceWorker: worker, onLine: true },
        document: { readyState: 'complete', hidden: false, querySelector: () => ({ src: 'https://example.test/assets/new.js' }), querySelectorAll: () => [{src:'https://example.test/assets/new.js'}], addEventListener: (n,h) => { listeners[n] = h; } },
        location: { href: 'https://example.test/', origin:'https://example.test' }, addEventListener: (n,h) => { listeners[n] = h; },
        setInterval: (handler, delay) => { assert.equal(delay, 300000); listeners.interval = handler; },
    });
    await Promise.resolve();
    let response;
    events.message({ data: { type: 'GPD_RELEASE_CHECK' }, ports: [{ postMessage: value => { response = value; } }] });
    assert.equal(response.entry, '/assets/new.js');
    listeners.visibilitychange(); listeners.online(); listeners.interval();
    assert.equal(checks, 4);
});

test('activation refreshes legacy/mismatched tabs but does not reload current tabs', async () => {
    const handlers = {}, navigated = [], deleted = [];
    class Channel {
        port1 = { close() {}, onmessage: null };
        port2 = { postMessage: data => queueMicrotask(() => this.port1.onmessage?.({ data })) };
    }
    const client = (id, entry) => ({ url: `https://example.test/${id}`, postMessage: (_, ports) => {
        if (entry) ports[0].postMessage({ entry });
    }, navigate: async url => { navigated.push(url); } });
    const source = stampWorker(await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), '<script type="module" src="/assets/new.js"></script>');
    vm.runInNewContext(source, { URL, MessageChannel: Channel, clearTimeout,
        setTimeout: handler => setTimeout(handler, 5),
        self: { addEventListener: (event, handler) => { handlers[event] = handler; }, clients: {
            claim: async () => {}, matchAll: async () => [client('legacy'), client('old', '/assets/old.js'), client('current', '/assets/new.js')],
        } },
        caches: { keys: async () => ['gpd-old', 'another-app'], delete: async key => { deleted.push(key); } },
    });
    let completed;
    handlers.activate({ waitUntil: value => { completed = value; } });
    await completed;
    assert.deepEqual(navigated.sort(), ['https://example.test/legacy', 'https://example.test/old']);
    assert.deepEqual(deleted, ['gpd-old']);
});
