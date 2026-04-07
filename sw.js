/**
 * Service Worker — Offline/PWA support for Global Political Dashboard.
 * Caches the app shell and last-known API responses.
 * Government offices may have restricted or intermittent connectivity.
 */

const CACHE_NAME = 'gpd-v8';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/pmua-logo.webp',
    '/Logo depa-01.png',
    '/smart-city-thailand-logo.svg',
    '/axiom-logo.png'
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
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) return;

    // API requests: network-first with cache fallback
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets: cache-first with network fallback
    event.respondWith(
        caches.match(request)
            .then(cached => cached || fetch(request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            }))
            .catch(() => {
                // Fallback to index.html for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});
