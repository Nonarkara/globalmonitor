/** Burst protection, NOT a distributed provider-quota ledger. */
export const createRequestLimiter = ({ capacity = 90, perMinute = 180, maxKeys = 2048, now = Date.now } = {}) => {
    const buckets = new Map();
    const overflow = { tokens: capacity, at: now() };
    return identity => {
        const time = now();
        // Forget idle callers, without evicting active buckets (which would
        // let new identities reset their budget under memory pressure).
        if (buckets.size >= maxKeys) {
            for (const [key, bucket] of buckets) if (time - bucket.at > 120000) buckets.delete(key);
        }
        let bucket = buckets.get(identity);
        if (!bucket) {
            bucket = buckets.size < maxKeys ? { tokens: capacity, at: time } : overflow;
            if (bucket !== overflow) buckets.set(identity, bucket);
        }
        const rate = perMinute / 60000;
        bucket.tokens = Math.min(capacity, bucket.tokens + Math.max(0, time - bucket.at) * rate);
        bucket.at = time;
        if (bucket.tokens < 1) return { allowed: false, retryAfter: Math.max(1, Math.ceil((1 - bucket.tokens) / rate / 1000)) };
        bucket.tokens -= 1;
        return { allowed: true };
    };
};
