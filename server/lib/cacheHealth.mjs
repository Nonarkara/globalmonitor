/** Edge-local evidence only: this is not global provider availability. */
export const describeCacheEntries = (cache, now = Date.now()) => Array.from(cache.entries()).map(([key, value]) => {
    const payload = value.payload;
    const source = payload?.meta?.source ?? payload?.source ?? null;
    const sample = /sample|fallback|curated|mock|demo|unconfigured|no_[a-z_]*key/i.test(source || '');
    const stale = value.expiresAt <= now || payload?.meta?.stale || payload?.meta?.staticSnapshot;
    return {
        key,
        updatedAt: value.updatedAt,
        cachedAt: value.updatedAt,
        observedAt: payload?.meta?.staticSnapshotAt || payload?.meta?.collectedAt || payload?.meta?.fetchedAt || payload?.fetchedAt || payload?.updatedAt || null,
        expiresInMs: Math.max(0, value.expiresAt - now),
        source,
        status: sample ? 'sample' : stale ? 'stale' : 'cached',
    };
});
