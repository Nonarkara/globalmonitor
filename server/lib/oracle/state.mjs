/**
 * Oracle live-state ingestion — turns the dashboard's OWN live caches into the
 * simulation's initial conditions, so every forecast is grounded in real data
 * (FIRMS heat, ACLED events, strike/news signal density, escalation index).
 *
 * Returns a normalized seed the engine consumes, plus a deterministic numeric
 * seed so the same data snapshot always yields the same forecast (no jitter).
 */

import { computeEscalation } from '../escalation.mjs';

const STRIKE_TAGS = new Set(['strikes', 'conflict', 'nuclear', 'airspace', 'naval', 'proxy']);

const featureCount = (cache, key) => {
    const entry = cache.get(key);
    const feats = entry?.payload?.features;
    return Array.isArray(feats) ? feats.length : 0;
};

/** Strike-tagged news density across all cached tickers (recency-weighted, capped). */
const newsSignal = (cache) => {
    const now = Date.now();
    let score = 0;
    for (const [key, entry] of cache.entries()) {
        if (!key.startsWith('ticker:') || !Array.isArray(entry?.payload)) continue;
        for (const item of entry.payload) {
            const tags = item.tags || [];
            if (!tags.some((t) => STRIKE_TAGS.has(t))) continue;
            const age = item.pubDate ? now - new Date(item.pubDate).getTime() : Infinity;
            const recency = age < 3.6e6 ? 3 : age < 2.16e7 ? 2 : 1;
            score += recency;
        }
    }
    return Math.min(100, score);
};

/** FNV-1a hash → 32-bit unsigned, used to seed the PRNG from the data snapshot. */
const hashSeed = (...nums) => {
    let h = 0x811c9dc5;
    const str = nums.map((n) => Math.round((Number(n) || 0) * 1000)).join(',');
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};

/**
 * Build the initial condition for a theater from live caches.
 * @returns {{ escalation:number, signals:object, seed:number, level:string }}
 */
export const readLiveState = (cache, theater) => {
    const firms = featureCount(cache, `firms:${theater}`);
    const acled = featureCount(cache, `acled:${theater}`);
    const quakes = featureCount(cache, `quakes:${theater}`);
    const news = newsSignal(cache);

    // Middle East has a purpose-built escalation index; reuse it directly. Other
    // theaters synthesize a comparable 0-100 from their live signal mix.
    let escalation;
    if (theater === 'middleeast') {
        const esc = computeEscalation(cache);
        escalation = typeof esc?.score === 'number' ? esc.score : 45;
    } else {
        escalation = Math.min(
            100,
            Math.min(35, firms * 0.6) + Math.min(35, acled * 1.2) + Math.min(30, news * 0.8)
        );
    }
    // Floor so a cold cache still yields a plausible, non-degenerate baseline.
    escalation = Math.max(12, Math.round(escalation));

    const signals = { firms, acled, quakes, news, escalation };
    const seed = hashSeed(escalation, firms, acled, news, theater.length);
    const level =
        escalation >= 70 ? 'CRITICAL' :
        escalation >= 50 ? 'ELEVATED' :
        escalation >= 30 ? 'WATCH' : 'LOW';

    return { escalation, signals, seed, level };
};
