/**
 * Service Worker — Offline/PWA support for Global Political Dashboard.
 * Caches the app shell and last-known API responses.
 * Government offices may have restricted or intermittent connectivity.
 */

const CACHE_NAME = 'gpd-v8-20261002-globewatch';
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
];

// Cache static assets on install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Clean old caches on activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k.startsWith('gpd-') && k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
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
    if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(request)
                .then(response => cacheResponse(request, response))
                .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
        );
        return;
    }

    // API requests: network-first with cache fallback
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetch(request)
                .then(response => response.ok ? cacheResponse(request, response) : offlineApiResponse(request))
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
