/**
 * EIA (Energy Information Administration) — oil price & production data.
 * Free API: https://api.eia.gov/v2/
 * Historical data back to 1990. Perfect for time machine feature.
 *
 * Fallback: Yahoo Finance chart endpoint for daily Brent/WTI (last 6 months
 * by default). Lets the war dashboard show current crude prices when EIA
 * key is unset, instead of the 7-month-stale curated series.
 */
import axios from 'axios';

const EIA_BASE = 'https://api.eia.gov/v2';
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

const YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

const fetchYahooHistory = async (symbolEncoded, range = '6mo', interval = '1d') => {
    // Use native fetch — axios in Cloudflare Workers adds a `cache` field to
    // the RequestInit that this runtime does not implement, and the call
    // fails before any data returns.
    const response = await fetch(`${YAHOO_CHART}/${symbolEncoded}?interval=${interval}&range=${range}`, {
        signal: AbortSignal.timeout(15000),
        headers: YAHOO_HEADERS
    });
    if (!response.ok) throw new Error(`Yahoo: HTTP ${response.status}`);
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
        throw new Error('Yahoo: empty history');
    }
    const ts = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const series = [];
    for (let i = 0; i < ts.length; i += 1) {
        const close = closes[i];
        if (typeof close !== 'number' || !Number.isFinite(close)) continue;
        const date = new Date(ts[i] * 1000).toISOString().slice(0, 10);
        series.push({ date, price: close });
    }
    if (!series.length) throw new Error('Yahoo: no valid points');
    return series;
};

/**
 * Fetch daily Brent & WTI crude oil spot prices.
 * Returns a timeline array for charting.
 */
export const fetchOilPriceTimeline = async (options = {}) => {
    const {
        key = process.env.EIA_API_KEY,
        daysBack = 90
    } = options;

    // Live path: EIA with API key (free, official, historical depth).
    if (key) {
        const since = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
        try {
            const [brent, wti] = await Promise.all([
                axios.get(`${EIA_BASE}/petroleum/pri/spt/data`, {
                    params: {
                        api_key: key,
                        frequency: 'daily',
                        'data[0]': 'value',
                        'facets[series][]': 'RBRTE',
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
                        'facets[series][]': 'RWTC',
                        start: since,
                        sort: '[{"column":"period","direction":"asc"}]'
                    },
                    timeout: 10000
                })
            ]);
            const brentData = brent.data?.response?.data || [];
            const wtiData = wti.data?.response?.data || [];
            if (brentData.length || wtiData.length) {
                return {
                    brent: brentData.map(d => ({ date: d.period, price: parseFloat(d.value) })),
                    wti: wtiData.map(d => ({ date: d.period, price: parseFloat(d.value) })),
                    source: 'eia',
                    updatedAt: new Date().toISOString()
                };
            }
            // Both empty — fall through to Yahoo.
        } catch (err) {
            console.warn('[EIA] API fetch failed, falling back to Yahoo:', err.message);
        }
    }

    // Live path: Yahoo Finance daily history. No key needed; same source the
    // market panel uses, so Brent / WTI agree across the dashboard.
    try {
        const [brent, wti] = await Promise.all([
            fetchYahooHistory('BZ%3DF', '6mo', '1d'),
            fetchYahooHistory('CL%3DF', '6mo', '1d')
        ]);
        return {
            brent,
            wti,
            source: 'yahoo-finance',
            updatedAt: new Date().toISOString()
        };
    } catch (err) {
        console.warn('[OIL] Yahoo fetch failed, using curated series:', err.message);
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
