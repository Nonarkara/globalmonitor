/**
 * EIA (Energy Information Administration) — oil price & production data.
 * Free API: https://api.eia.gov/v2/
 * Historical data back to 1990. Perfect for time machine feature.
 */
import axios from 'axios';

const EIA_BASE = 'https://api.eia.gov/v2';

/**
 * Fetch daily Brent & WTI crude oil spot prices.
 * Returns a timeline array for charting.
 */
export const fetchOilPriceTimeline = async (options = {}) => {
    const {
        key = process.env.EIA_API_KEY,
        daysBack = 90
    } = options;

    // If no API key, return curated war-period oil prices
    if (!key) {
        return buildFallbackOilPrices();
    }

    const since = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);

    try {
        const [brent, wti] = await Promise.all([
            axios.get(`${EIA_BASE}/petroleum/pri/spt/data`, {
                params: {
                    api_key: key,
                    frequency: 'daily',
                    'data[0]': 'value',
                    'facets[series][]': 'RBRTE',  // Brent spot
                    start: since,
                    sort: '[{"column":"period","direction":"asc"}]'
                },
                timeout: 10000
            }),
            axios.get(`${EIA_BASE}/petroleum/pri/spt/data`, {
                params: {
                    api_key: key,
                    frequency: 'daily',
                    'data[0]': 'value',
                    'facets[series][]': 'RWTC',  // WTI spot
                    start: since,
                    sort: '[{"column":"period","direction":"asc"}]'
                },
                timeout: 10000
            })
        ]);

        const brentData = brent.data?.response?.data || [];
        const wtiData = wti.data?.response?.data || [];

        return {
            brent: brentData.map(d => ({ date: d.period, price: parseFloat(d.value) })),
            wti: wtiData.map(d => ({ date: d.period, price: parseFloat(d.value) })),
            source: 'eia',
            updatedAt: new Date().toISOString()
        };
    } catch (err) {
        console.warn('[EIA] API fetch failed, using fallback:', err.message);
        return buildFallbackOilPrices();
    }
};

/**
 * Curated oil price data for the war period (Feb-Mar 2026).
 * Based on verified reporting: Brent crossed $100 on Mar 8, peaked at ~$126.
 */
function buildFallbackOilPrices() {
    const prices = [
        { date: '2026-02-27', brent: 78.5, wti: 73.2 },
        { date: '2026-02-28', brent: 85.3, wti: 79.8 },  // War begins
        { date: '2026-03-01', brent: 89.7, wti: 83.5 },
        { date: '2026-03-03', brent: 92.1, wti: 86.4 },
        { date: '2026-03-04', brent: 96.8, wti: 90.2 },   // Hormuz closure
        { date: '2026-03-06', brent: 98.5, wti: 92.1 },
        { date: '2026-03-08', brent: 101.2, wti: 94.8 },  // Brent crosses $100
        { date: '2026-03-10', brent: 108.5, wti: 96.3 },
        { date: '2026-03-13', brent: 118.7, wti: 98.5 },  // US bombs Iran military
        { date: '2026-03-15', brent: 122.4, wti: 99.1 },
        { date: '2026-03-18', brent: 126.0, wti: 100.8 }, // Peak — South Pars hit
        { date: '2026-03-20', brent: 119.5, wti: 99.3 },
        { date: '2026-03-22', brent: 116.2, wti: 98.7 },
        { date: '2026-03-24', brent: 114.8, wti: 99.1 },
        { date: '2026-03-26', brent: 113.1, wti: 99.5 },  // Trump grants extension
        { date: '2026-03-28', brent: 112.6, wti: 99.6 },  // Houthi entry
        { date: '2026-03-29', brent: 112.5, wti: 99.7 }
    ];

    // A hand-typed series is only as fresh as its last row. Stamp the payload
    // with that date — never now() — so no consumer can present it as current.
    const asOf = `${prices[prices.length - 1].date}T00:00:00.000Z`;

    return {
        brent: prices.map(p => ({ date: p.date, price: p.brent })),
        wti: prices.map(p => ({ date: p.date, price: p.wti })),
        source: 'curated_fallback',
        updatedAt: asOf,
        fetchedAt: asOf
    };
}
