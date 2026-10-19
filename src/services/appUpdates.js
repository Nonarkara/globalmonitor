// A release must reach returning tabs, not only fresh browser contexts.
export function registerAppUpdates(platform = window) {
    const { navigator, document, location } = platform;
    if (!navigator.serviceWorker) return;
    const script = document.querySelector('script[type="module"][src]');
    if (!script) return;
    const entry = [...document.querySelectorAll('script[type="module"][src],link[rel="stylesheet"][href]')]
        .map(element => new URL(element.src || element.href, location.href))
        .filter(url => url.origin === location.origin && url.pathname.includes('/assets/'))
        .map(url => url.pathname).sort().join('|');
    const workerUrl = new URL('../sw.js', script.src).href;
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'GPD_RELEASE_CHECK') event.ports[0]?.postMessage({ entry });
    });
    let registration;
    const check = () => {
        if (!document.hidden && navigator.onLine !== false) registration?.update().catch(() => {});
    };
    const start = () => {
        navigator.serviceWorker.register(workerUrl, { updateViaCache: 'none' })
            .then(value => { registration = value; check(); })
            .catch(() => { /* Offline app remains usable; retry on the next visit. */ });
    };
    if (document.readyState === 'complete') start();
    else platform.addEventListener('load', start, { once: true });
    document.addEventListener('visibilitychange', check);
    platform.addEventListener('online', check);
    platform.setInterval(check, 5 * 60 * 1000);
}
