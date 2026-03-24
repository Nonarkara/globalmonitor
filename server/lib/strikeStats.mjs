/**
 * Strike Statistics — extracts missile/drone/interception counts
 * from intelligence feed items using regex patterns.
 */

const dailyStats = new Map(); // date -> { missiles, drones, interceptions, casualties }
let lastCleanup = Date.now();

const PATTERNS = {
    missiles: /(\d+)\s*(?:missiles?|rockets?|ballistic)/gi,
    drones: /(\d+)\s*(?:drones?|UAVs?|UAS)/gi,
    interceptions: /intercept(?:ed|ion|s)/gi,
    casualties: /(\d+)\s*(?:killed|dead|casualties|fatalities)/gi
};

const extractCount = (text, pattern) => {
    let total = 0;
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) total += num;
    }
    return total;
};

const getDateKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const computeStrikeStats = (serverCache) => {
    // Cleanup old entries (older than 8 days)
    if (Date.now() - lastCleanup > 3600000) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 8);
        const cutoffKey = getDateKey(cutoff);
        for (const [key] of dailyStats) {
            if (key < cutoffKey) dailyStats.delete(key);
        }
        lastCleanup = Date.now();
    }

    const todayKey = getDateKey(new Date());
    const sources = new Set();

    // Scan all briefing caches
    const briefingEntries = Array.from(serverCache.entries())
        .filter(([key]) => key.startsWith('briefing:'));

    for (const [, entry] of briefingEntries) {
        if (!Array.isArray(entry?.payload?.items)) continue;

        for (const item of entry.payload.items) {
            const title = item.title || '';
            const dateKey = item.pubDate ? getDateKey(item.pubDate) : todayKey;

            if (!dailyStats.has(dateKey)) {
                dailyStats.set(dateKey, { missiles: 0, drones: 0, interceptions: 0, casualties: 0 });
            }
            const day = dailyStats.get(dateKey);

            day.missiles += extractCount(title, PATTERNS.missiles);
            day.drones += extractCount(title, PATTERNS.drones);
            day.interceptions += (title.match(PATTERNS.interceptions) || []).length;
            day.casualties += extractCount(title, PATTERNS.casualties);

            if (item.source) sources.add(item.source);
        }
    }

    // Build 7-day array
    const daily = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = getDateKey(d);
        daily.push({
            date: key,
            ...(dailyStats.get(key) || { missiles: 0, drones: 0, interceptions: 0, casualties: 0 })
        });
    }

    const weekTotal = daily.reduce((acc, d) => ({
        missiles: acc.missiles + d.missiles,
        drones: acc.drones + d.drones,
        interceptions: acc.interceptions + d.interceptions,
        casualties: acc.casualties + d.casualties
    }), { missiles: 0, drones: 0, interceptions: 0, casualties: 0 });

    const current = dailyStats.get(todayKey) || { missiles: 0, drones: 0, interceptions: 0, casualties: 0 };

    return {
        current,
        daily,
        weekTotal,
        sources: Array.from(sources).slice(0, 6)
    };
};
