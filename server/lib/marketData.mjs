import axios from 'axios';

const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];
const CURRENCY_API = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
const CURRENCY_API_FALLBACK = 'https://latest.currency-api.pages.dev/v1/currencies/usd.json';
const YAHOO_BASE = 'https://query2.finance.yahoo.com/v8/finance/chart/';

const YAHOO_SYMBOLS = [
    { symbol: 'CL%3DF', label: 'WTI Crude' },
    { symbol: 'BZ%3DF', label: 'Brent Oil' },
    { symbol: '%5EGSPC', label: 'S&P 500' },
    { symbol: '%5ETASI.SR', label: 'TASI (Saudi)' },
    { symbol: '%5ETA125.TA', label: 'TA-125 (Israel)' },
];

const FX_PAIRS = [
    { id: 'eur', name: 'EUR/USD', invert: true },
    { id: 'gbp', name: 'GBP/USD', invert: true },
    { id: 'ils', name: 'USD/ILS', invert: false },
    { id: 'sar', name: 'USD/SAR', invert: false },
    { id: 'aed', name: 'USD/AED', invert: false },
    { id: 'irr', name: 'USD/IRR', invert: false },
    { id: 'try', name: 'USD/TRY', invert: false },
    { id: 'thb', name: 'USD/THB', invert: false },
    { id: 'jpy', name: 'USD/JPY', invert: false },
    { id: 'cny', name: 'USD/CNY', invert: false },
];

const previousQuotes = new Map();

const getDelta = (key, value) => {
    const previous = previousQuotes.get(key);
    previousQuotes.set(key, value);
    if (!previous || previous === 0) return { changePerc: '0.00%', isPositive: true };
    const delta = ((value - previous) / previous) * 100;
    return {
        changePerc: `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`,
        isPositive: delta >= 0
    };
};

const formatPrice = (price) => {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};

const fetchYahooQuote = async (symbolEncoded) => {
    const url = `${YAHOO_BASE}${symbolEncoded}?interval=1d&range=1d`;
    const response = await axios.get(url, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    });

    const inner = response.data;
    if (!inner?.chart?.result?.[0]?.meta) {
        throw new Error(`Invalid Yahoo response for ${symbolEncoded}`);
    }

    const meta = inner.chart.result[0].meta;
    return { price: meta.regularMarketPrice, previousClose: meta.chartPreviousClose || meta.regularMarketPrice };
};

const fetchCurrencyRates = async () => {
    try {
        const resp = await axios.get(CURRENCY_API, { timeout: 12000 });
        if (resp.data?.usd) return resp.data.usd;
    } catch {
        // try fallback
    }
    try {
        const resp = await axios.get(CURRENCY_API_FALLBACK, { timeout: 12000 });
        if (resp.data?.usd) return resp.data.usd;
    } catch {
        // try open.er-api
    }
    try {
        const resp = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 12000 });
        if (resp.data?.rates) {
            // Convert to lowercase keys to match the format expected
            const rates = {};
            for (const [key, value] of Object.entries(resp.data.rates)) {
                rates[key.toLowerCase()] = value;
            }
            return rates;
        }
    } catch {
        // all failed
    }
    return null;
};

export const fetchMarketPayload = async () => {
    const results = [];

    // Crypto (Binance — reliable, no auth needed)
    try {
        const cryptoResponses = await Promise.all(
            CRYPTO_SYMBOLS.map((sym) => axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`, { timeout: 15000 }))
        );
        cryptoResponses.forEach((response) => {
            const data = response.data;
            const change = parseFloat(data.priceChangePercent);
            results.push({
                symbol: data.symbol.replace('USDT', ''),
                price: parseFloat(data.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                changePerc: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                isPositive: change >= 0
            });
        });
    } catch (e) { console.warn('Crypto failed', e.message); }

    // Yahoo Finance: Oil + Indices (may fail from server, that's okay)
    const yahooResults = await Promise.all(YAHOO_SYMBOLS.map(async ({ symbol, label }) => {
        try {
            const q = await fetchYahooQuote(symbol);
            const change = ((q.price - q.previousClose) / q.previousClose) * 100;
            return {
                symbol: label,
                price: label.includes('Oil') || label.includes('Crude')
                    ? q.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    : formatPrice(q.price),
                changePerc: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                isPositive: change >= 0
            };
        } catch (e) { console.warn(`Yahoo ${label} failed`, e.message); return null; }
    }));
    yahooResults.filter(Boolean).forEach((item) => results.push(item));

    // Currency API: Gold + Forex (with multi-source fallback)
    const rates = await fetchCurrencyRates();
    if (rates) {
        if (rates.xau > 0) {
            const goldPrice = 1 / rates.xau;
            const delta = getDelta('Gold', goldPrice);
            results.push({ symbol: 'Gold', price: goldPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), ...delta });
        }
        FX_PAIRS.forEach((cross) => {
            const rate = rates[cross.id];
            if (!rate || rate <= 0) return;
            const price = cross.invert ? (1 / rate) : rate;
            if (!isFinite(price) || isNaN(price)) return;
            const delta = getDelta(cross.name, price);
            results.push({
                symbol: cross.name,
                price: cross.id === 'irr' ? Math.round(price).toLocaleString('en-US') : formatPrice(price),
                ...delta
            });
        });
    }

    return results;
};
