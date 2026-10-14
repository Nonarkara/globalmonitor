const KEYS = {
    acled: theater => [`acled:${theater}`], firms: theater => [`firms:${theater}`],
    gdelt: theater => [`gdelt:${theater}`], usgs: theater => [`quakes:${theater}`],
    reliefweb: theater => [`humanitarian:${theater}`],
    eia: () => ['oil-prices'], markets: () => ['markets'],
    'airplanes-live': () => ['flights:v3:global', 'flights:global'],
    opensky: () => ['flights:v3:global', 'flights:global'],
    aisstream: () => ['vessels:global'], vesselfinder: () => ['vessels:global'],
};
const PROVIDERS = { 'airplanes-live': /airplanes/i, opensky: /opensky/i, aisstream: /aisstream/i, vesselfinder: /vesselfinder/i, eia: /eia/i, reliefweb: /reliefweb/i };

export const resolveSourceHealth = (id, payload, theater) => {
    const keys = KEYS[id]?.(theater) || [];
    const entry = payload?.cacheEntries?.find(item => keys.includes(item.key));
    if (!entry) return { status: 'not observed', color: 'var(--ink-3)' };
    const detail = { source: entry.source, observedAt: entry.observedAt, cachedAt: entry.cachedAt };
    if (entry.status === 'sample') return { ...detail, status: 'sample', color: 'var(--ink-2)' };
    if (entry.status === 'stale') return { ...detail, status: 'stale', color: 'var(--red)' };
    if (PROVIDERS[id] && !PROVIDERS[id].test(entry.source || '')) return { ...detail, status: 'other source', color: 'var(--ink-3)' };
    return { ...detail, status: 'cached', color: 'var(--ink-2)' };
};
