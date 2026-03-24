/**
 * Escalation Risk Index — composite 0-100 score combining
 * FIRMS fire density, news signals, market volatility, and strike frequency.
 */

const history = []; // up to 24 hourly data points
let lastHistoryHour = -1;

const getLevel = (score) => {
    if (score >= 70) return { level: 'red', label: 'CRITICAL' };
    if (score >= 30) return { level: 'amber', label: 'ELEVATED' };
    return { level: 'green', label: 'LOW' };
};

export const computeEscalation = (serverCache) => {
    // 1. FIRMS density (0-30)
    let firmsScore = 0;
    const firmsEntry = serverCache.get('firms:middleeast');
    if (firmsEntry?.payload?.features) {
        const highConf = firmsEntry.payload.features.filter(
            f => f.properties?.confidence === 'high' || f.properties?.confidence === 'h'
        ).length;
        firmsScore = Math.min(30, highConf * 1.5);
    }

    // 2. News signals (0-25) — count elevated-tagged items from ticker
    let newsScore = 0;
    const tickerEntries = Array.from(serverCache.entries())
        .filter(([key]) => key.startsWith('ticker:'));
    for (const [, entry] of tickerEntries) {
        if (!Array.isArray(entry?.payload)) continue;
        const elevated = entry.payload.filter(item =>
            (item.tags || []).some(t => ['strikes', 'conflict', 'nuclear', 'airspace'].includes(t))
        ).length;
        newsScore = Math.min(25, elevated * 2.5);
        break;
    }

    // 3. Market volatility (0-25) — oil + gold change %
    let marketScore = 0;
    const marketsEntry = serverCache.get('markets');
    if (Array.isArray(marketsEntry?.payload)) {
        for (const item of marketsEntry.payload) {
            const pct = parseFloat((item.changePerc || '0').replace('%', ''));
            if (item.symbol?.includes('Oil') || item.symbol?.includes('Crude')) {
                marketScore += Math.abs(pct) * 3;
            }
            if (item.symbol === 'Gold') {
                marketScore += Math.abs(pct) * 2;
            }
        }
        marketScore = Math.min(25, marketScore);
    }

    // 4. Strike frequency (0-20) — items tagged "strikes" from briefings
    let strikeScore = 0;
    const briefingEntries = Array.from(serverCache.entries())
        .filter(([key]) => key.startsWith('briefing:'));
    for (const [, entry] of briefingEntries) {
        if (!Array.isArray(entry?.payload?.items)) continue;
        const strikeItems = entry.payload.items.filter(item =>
            (item.tags || []).includes('strikes')
        ).length;
        strikeScore += strikeItems * 4;
    }
    strikeScore = Math.min(20, strikeScore);

    const total = Math.round(firmsScore + newsScore + marketScore + strikeScore);
    const clamped = Math.min(100, Math.max(0, total));
    const { level, label } = getLevel(clamped);

    // Record hourly history
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
        history: [...history],
        updatedAt: new Date().toISOString()
    };
};
