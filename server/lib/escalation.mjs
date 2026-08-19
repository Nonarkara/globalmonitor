/**
 * Escalation Risk Index — composite 0-100 score combining
 * FIRMS fire density, news signals, market volatility, and strike frequency.
 * V4: Includes medium-confidence fires, aggregates ALL briefings,
 *     expands strike keywords, and applies recency weighting.
 */

const history = []; // up to 24 hourly data points
let lastHistoryHour = -1;

const getLevel = (score) => {
    if (score >= 70) return { level: 'red', label: 'CRITICAL' };
    if (score >= 50) return { level: 'amber', label: 'ELEVATED' };
    if (score >= 30) return { level: 'amber', label: 'WATCH' };
    return { level: 'green', label: 'LOW' };
};

const STRIKE_TAGS = ['strikes', 'conflict', 'nuclear', 'airspace', 'naval', 'proxy'];
const CRITICAL_TAGS = ['strikes', 'nuclear', 'airspace'];

export const computeEscalation = (serverCache) => {
    const now = Date.now();

    // 1. FIRMS density (0-30) — include medium AND high confidence
    let firmsScore = 0;
    const firmsEntry = serverCache.get('firms:middleeast');
    const isSampleData = firmsEntry?.payload?.meta?.source === 'sample-data';
    if (firmsEntry?.payload?.features && !isSampleData) {
        const features = firmsEntry.payload.features;
        const highConf = features.filter(
            f => f.properties?.confidence === 'high' || f.properties?.confidence === 'h'
        ).length;
        const medConf = features.filter(
            f => f.properties?.confidence === 'nominal' || f.properties?.confidence === 'n' ||
                 f.properties?.confidence === 'medium'
        ).length;
        firmsScore = Math.min(30, (highConf * 2) + (medConf * 0.8));
    }

    // 2. News signals (0-25) — aggregate ALL ticker + briefing sources, weight by recency
    let newsScore = 0;
    const allNewsItems = [];

    for (const [key, entry] of serverCache.entries()) {
        if (key.startsWith('ticker:') && Array.isArray(entry?.payload)) {
            allNewsItems.push(...entry.payload);
        }
    }

    for (const item of allNewsItems) {
        const tags = item.tags || [];
        const hasElevatedTag = tags.some(t => STRIKE_TAGS.includes(t));
        if (!hasElevatedTag) continue;

        // Recency bonus: items from last hour worth 3x, last 6h worth 2x, older worth 1x
        const age = item.pubDate ? now - new Date(item.pubDate).getTime() : Infinity;
        const recencyMultiplier = age < 3600000 ? 3 : age < 21600000 ? 2 : 1;
        const isCritical = tags.some(t => CRITICAL_TAGS.includes(t));

        newsScore += (isCritical ? 3 : 1.5) * recencyMultiplier;
    }
    newsScore = Math.min(25, newsScore);

    // 3. Market volatility (0-25) — oil + gold change %
    let marketScore = 0;
    const marketsEntry = serverCache.get('markets');
    if (Array.isArray(marketsEntry?.payload)) {
        for (const item of marketsEntry.payload) {
            const pct = parseFloat((item.changePerc || '0').replace('%', ''));
            if (item.symbol?.includes('Oil') || item.symbol?.includes('Crude') || item.symbol?.includes('Brent')) {
                marketScore += Math.abs(pct) * 3;
            }
            if (item.symbol === 'Gold') {
                marketScore += Math.abs(pct) * 2;
            }
        }
        marketScore = Math.min(25, marketScore);
    }

    // 4. Strike frequency (0-20) — aggregate ALL briefings, expanded tags
    let strikeScore = 0;
    for (const [key, entry] of serverCache.entries()) {
        if (!key.startsWith('briefing:')) continue;
        if (!Array.isArray(entry?.payload?.items)) continue;

        for (const item of entry.payload.items) {
            const tags = item.tags || [];
            const title = (item.title || '').toLowerCase();

            // Tag-based scoring
            if (tags.includes('strikes')) strikeScore += 4;
            else if (tags.includes('conflict')) strikeScore += 2;

            // Keyword-based scoring for items that missed tag classification
            if (/missile|drone|intercept|bomb|airstrike|barrage|rocket/.test(title)) {
                strikeScore += 3;
            }
        }
    }
    strikeScore = Math.min(20, strikeScore);

    const total = Math.round(firmsScore + newsScore + marketScore + strikeScore);
    const clamped = Math.min(100, Math.max(0, total));

    // Track source health
    const sourceHealth = {
        firms: firmsEntry?.payload?.features ? (isSampleData ? 'sample' : 'live') : 'offline',
        news: allNewsItems.length > 0 ? 'live' : 'offline',
        markets: Array.isArray(marketsEntry?.payload) && marketsEntry.payload.length > 0 ? 'live' : 'offline',
        briefings: strikeScore > 0 ? 'live' : 'no-data'
    };

    // Every scorer reads an in-memory cache that a cold Cloudflare isolate starts
    // empty — and on a static Pages deploy, cold is the normal case. All four
    // silent therefore produced total=0, which getLevel() reads as a green "LOW":
    // absence of signal rendered as a measured all-clear. Report the absence
    // instead. The gauge already gates on `typeof score === 'number'` and falls
    // back to its neutral shell, so null shows an empty arc rather than a hole.
    const hasSignal = sourceHealth.firms !== 'offline'
        || sourceHealth.news !== 'offline'
        || sourceHealth.markets !== 'offline'
        || sourceHealth.briefings !== 'no-data';

    if (!hasSignal) {
        return {
            score: null,
            level: 'unknown',
            label: 'NO DATA',
            components: { firms: 0, news: 0, market: 0, strikes: 0 },
            sourceHealth,
            history: [...history],
            updatedAt: new Date().toISOString()
        };
    }

    const { level, label } = getLevel(clamped);

    // Record hourly history — only once there is real signal, so a cold isolate
    // no longer writes a fabricated 0 into the 24h trend.
    const currentHour = new Date().getHours();
    if (currentHour !== lastHistoryHour) {
        history.push({ t: new Date().toISOString(), score: clamped });
        if (history.length > 24) history.shift();
        lastHistoryHour = currentHour;
    }

    return {
        score: clamped,
        level,
        label,
        components: {
            firms: Math.round(firmsScore),
            news: Math.round(newsScore),
            market: Math.round(marketScore),
            strikes: Math.round(strikeScore)
        },
        sourceHealth,
        history: [...history],
        updatedAt: new Date().toISOString()
    };
};
