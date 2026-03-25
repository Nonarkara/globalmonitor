/**
 * Multi-Front Status Board — computes per-front status from cached FIRMS + ticker data.
 * Follows the same pattern as escalation.mjs (cache-based composite scoring).
 */

const FRONTS = [
    {
        id: 'iran',
        name: 'Iran Theater',
        icon: 'crosshair',
        bbox: [44, 25, 63, 40],
        keywords: ['iran', 'irgc', 'tehran', 'isfahan', 'natanz', 'khamenei', 'persian gulf', 'iranian'],
        warStart: '2026-02-28'
    },
    {
        id: 'lebanon',
        name: 'Lebanon / Hezbollah',
        icon: 'shield',
        bbox: [35, 33, 36.5, 34.7],
        keywords: ['hezbollah', 'lebanon', 'beirut', 'south lebanon', 'litani', 'nasrallah'],
        warStart: '2026-03-01'
    },
    {
        id: 'gaza',
        name: 'Gaza Ceasefire',
        icon: 'alert-triangle',
        bbox: [34.1, 31.2, 34.6, 31.6],
        keywords: ['gaza', 'ceasefire', 'hamas', 'violation', 'rafah', 'khan younis'],
        warStart: null
    },
    {
        id: 'iraq',
        name: 'Iraq Militias',
        icon: 'flame',
        bbox: [38, 29, 48, 38],
        keywords: ['iraq', 'militia', 'kurdistan', 'erbil', 'pmu', 'kataib', 'iraqi resistance'],
        warStart: null
    },
    {
        id: 'redsea',
        name: 'Red Sea / Houthi',
        icon: 'anchor',
        bbox: [36, 10, 50, 22],
        keywords: ['houthi', 'red sea', 'bab el-mandeb', 'yemen', 'aden', 'shipping attack'],
        warStart: null
    },
    {
        id: 'hormuz',
        name: 'Strait of Hormuz',
        icon: 'ship',
        bbox: [54, 24, 58, 28],
        keywords: ['hormuz', 'strait', 'shipping', 'tanker', 'blockade', 'persian gulf', 'oil transit'],
        warStart: null
    },
    {
        id: 'syria',
        name: 'Syria Transition',
        icon: 'map',
        bbox: [35, 32, 42, 37],
        keywords: ['syria', 'sdf', 'al-sharaa', 'damascus', 'transition', 'hts', 'idlib'],
        warStart: null
    }
];

const getStatus = (score) => {
    if (score >= 70) return { status: 'CRITICAL', color: '#ef4444' };
    if (score >= 40) return { status: 'ACTIVE', color: '#f59e0b' };
    if (score >= 15) return { status: 'ELEVATED', color: '#eab308' };
    return { status: 'STABLE', color: '#22c55e' };
};

const isInBbox = (lon, lat, bbox) =>
    lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];

export const computeFrontStatus = (serverCache) => {
    // Get FIRMS data
    const firmsEntry = serverCache.get('firms:middleeast');
    const fires = firmsEntry?.payload?.features || [];

    // Get ticker items
    let tickerItems = [];
    for (const [key, entry] of serverCache.entries()) {
        if (key.startsWith('ticker:') && Array.isArray(entry?.payload)) {
            tickerItems = entry.payload;
            break;
        }
    }

    // Get briefing items
    const briefingItems = [];
    for (const [key, entry] of serverCache.entries()) {
        if (key.startsWith('briefing:') && Array.isArray(entry?.payload?.items)) {
            briefingItems.push(...entry.payload.items);
        }
    }

    const allNews = [...tickerItems, ...briefingItems];
    const now = Date.now();

    const fronts = FRONTS.map((front) => {
        // Count fires in bbox
        const fireCount = fires.filter((f) => {
            const [lon, lat] = f.geometry?.coordinates || [];
            return isInBbox(lon, lat, front.bbox);
        }).length;

        // Count keyword hits in news (last 24h)
        const keywordHits = allNews.filter((item) => {
            const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase();
            return front.keywords.some((kw) => text.includes(kw));
        }).length;

        // Find most recent matching news item
        const matchingNews = allNews
            .filter((item) => {
                const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase();
                return front.keywords.some((kw) => text.includes(kw));
            })
            .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

        const lastEvent = matchingNews[0]?.pubDate || null;
        const latestHeadline = matchingNews[0]?.title || null;

        // Composite score (0-100)
        const fireScore = Math.min(40, fireCount * 4);
        const newsScore = Math.min(40, keywordHits * 3);
        const recencyBonus = lastEvent && (now - new Date(lastEvent).getTime()) < 3600000 ? 20 : 0;
        const total = Math.min(100, fireScore + newsScore + recencyBonus);

        const { status, color } = getStatus(total);

        // Day count if war started
        let dayCount = null;
        if (front.warStart) {
            const start = new Date(front.warStart);
            dayCount = Math.floor((now - start.getTime()) / 86400000);
        }

        return {
            id: front.id,
            name: front.name,
            icon: front.icon,
            score: total,
            status,
            color,
            fireCount,
            newsHits: keywordHits,
            lastEvent,
            latestHeadline,
            dayCount
        };
    });

    return {
        fronts,
        updatedAt: new Date().toISOString()
    };
};
