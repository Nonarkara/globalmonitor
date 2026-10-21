/**
 * Service Worker — Offline/PWA support for Global Political Dashboard.
 * Caches the app shell and last-known API responses.
 * Government offices may have restricted or intermittent connectivity.
 */

const APP_ENTRY = '/globalmonitor/assets/index--RxIXDGo.css|/globalmonitor/assets/index-R7_F-d5_.js';
const APP_BASE = '/globalmonitor/';
const CACHE_NAME = 'gpd-v8-release-' + APP_ENTRY;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/pmua-logo.webp',
    '/depa-logo.png',
    '/smart-city-thailand-logo.svg',
    '/axiom-logo.png',
    '/retl-logo.svg',
    '/manifest.json',
    '/brand/icon-192.png',
    '/brand/icon-512.png',
    '/brand/apple-touch-icon.png',
    '/brand/globewatch-mark.png',
    '/brand/globewatch-lockup.png',
    '/brand/globewatch-monochrome.png'
].map(path => APP_BASE + path.slice(1));

// Cache static assets on install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Ask each tab which bundle it is actually running. Claiming a tab alone does
// not replace its already-executing JavaScript or CSS. Legacy tabs cannot reply.
const refreshOutdatedClients = async () => {
    if (!APP_ENTRY.startsWith('/')) return;
    const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
        .filter(client => new URL(client.url).pathname.startsWith(APP_BASE));
    await Promise.all(windows.map(async client => {
        const entry = await new Promise(resolve => {
            const channel = new MessageChannel();
            const finish = value => { clearTimeout(timer); channel.port1.close(); resolve(value); };
            const timer = setTimeout(() => finish(null), 3000);
            channel.port1.onmessage = event => finish(event.data?.entry);
            try { client.postMessage({ type: 'GPD_RELEASE_CHECK' }, [channel.port2]); }
            catch { finish(null); }
        });
        // Do not await navigation inside activation: its fetch waits for this
        // activation to finish. Awaiting both creates a circular wait.
        if (entry !== APP_ENTRY) client.navigate(client.url).catch(() => {
            // A tab closed during the version check needs no migration.
        });
    }));
};

// Clean only this app's old caches and migrate stale open tabs once per release.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k.startsWith('gpd-') && k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim()).then(refreshOutdatedClients)
    );
});

const cacheResponse = async (request, response) => {
    if (!response || !response.ok) return response;
    const cache = await caches.open(CACHE_NAME);
    try {
        await cache.put(request, response.clone());
        // Query variants must not grow the offline cache without bound.
        const keys = await cache.keys();
        const apiKeys = keys.filter(key => new URL(key.url).pathname.startsWith('/api/'));
        await Promise.all(apiKeys.slice(0, Math.max(0, apiKeys.length - 80)).map(key => cache.delete(key)));
    } catch { /* Cache quota failures must not fail a successful network response. */ }
    return response;
};

const offlineApiResponse = async (request) => {
    const cached = await caches.match(request);
    if (!cached) return new Response(JSON.stringify({ error: 'Offline; no cached data available' }), {
        status: 503, headers: { 'Content-Type': 'application/json', 'X-Tech-Status': 'offline' }
    });
    const headers = new Headers(cached.headers);
    // Preserve sample classification and the original timestamp; offline never means live.
    if (headers.get('X-Tech-Status') !== 'sample') headers.set('X-Tech-Status', 'stale');
    headers.set('X-Tech-Cache', 'offline');
    return new Response(cached.body, { status: cached.status, headers });
};

// Network-first for API and navigations; cache fallback only when offline.
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and all cross-origin requests. API routes are same-origin
    // on globalmonitor.pages.dev via Pages Functions; only third-party fetches
    // should bypass this service worker.
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    // Always fetch the HTML shell from the network first. A cache-first shell can
    // trap users on a bad deployment even after Cloudflare has been corrected.
    if (request.mode === 'navigate' || url.pathname === APP_BASE || url.pathname === APP_BASE + 'index.html') {
        event.respondWith(
            fetch(request)
                .then(response => cacheResponse(request, response))
                .catch(() => caches.match(request).then(cached => cached || caches.match(APP_BASE + 'index.html')))
        );
        return;
    }

    // API requests: network-first with cache fallback
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetch(request)
                .then(response => response.ok ? cacheResponse(request, response) : response.status < 500 ? response : offlineApiResponse(request))
                .catch(() => offlineApiResponse(request))
        );
        return;
    }

    // Static assets: cache-first with network fallback
    event.respondWith(
        caches.match(request)
            .then(cached => cached || fetch(request).then(response => cacheResponse(request, response)))
    );
});
