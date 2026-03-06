import axios from 'axios';
import { fetchBackendJson } from './backendClient.js';

const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];
const YAHOO_PROXY = 'https://corsproxy.io/?';
const YAHOO_BASE = 'https://query2.finance.yahoo.com/v8/finance/chart/';

const YAHOO_SYMBOLS = [
    { symbol: 'CL%3DF', label: 'WTI Crude', category: 'commodity' },
    { symbol: 'BZ%3DF', label: 'Brent Oil', category: 'commodity' },
    { symbol: '%5EGSPC', label: 'S&P 500', category: 'index' },
    { symbol: '%5ETASI.SR', label: 'TASI (Saudi)', category: 'index' },
    { symbol: '%5ETA125.TA', label: 'TA-125 (Israel)', category: 'index' },
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

    if (!previous || previous === 0) {
        return { changePerc: '0.00%', isPositive: true };
    }

    const delta = ((value - previous) / previous) * 100;
    return {
        changePerc: `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`,
        isPositive: delta >= 0
    };
};

const formatPrice = (price, opts = {}) => {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0, ...opts });
    if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, ...opts });
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4, ...opts });
};

const fetchYahooQuote = async (symbolEncoded) => {
    const url = `${YAHOO_BASE}${symbolEncoded}?interval=1d&range=1d`;
    const proxied = `${YAHOO_PROXY}${encodeURIComponent(url)}`;
    const response = await axios.get(proxied, { timeout: 15000 });
    const inner = response.data;
    const meta = inner.chart.result[0].meta;
    return {
        price: meta.regularMarketPrice,
        previousClose: meta.chartPreviousClose || meta.regularMarketPrice,
        symbol: meta.symbol,
    };
};

export const fetchMarketRadar = async () => {
    try {
        const backendData = await fetchBackendJson('/api/markets');
        if (backendData && backendData.length > 0) return backendData;
    } catch {
        // Fall back to direct fetching if backend proxy is offline
    }

    const results = [];

    // 1. Crypto (Binance)
    try {
        const cryptoResponses = await Promise.all(
            CRYPTO_SYMBOLS.map((symbol) => axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, { timeout: 15000 }))
        );
        cryptoResponses.forEach((response) => {
            const data = response.data;
            const changeValue = parseFloat(data.priceChangePercent);
            results.push({
                symbol: data.symbol.replace('USDT', ''),
                price: parseFloat(data.lastPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                changePerc: `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`,
                isPositive: changeValue >= 0
            });
        });
    } catch (error) {
        console.warn('Crypto API failed', error.message);
    }

    // 2. Commodities + Stock Indices (Yahoo Finance via allorigins proxy)
    const yahooPromises = YAHOO_SYMBOLS.map(async ({ symbol, label }) => {
        try {
            const quote = await fetchYahooQuote(symbol);
            const change = ((quote.price - quote.previousClose) / quote.previousClose) * 100;
            return {
                symbol: label,
                price: label.includes('Oil') || label.includes('Crude')
                    ? quote.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    : formatPrice(quote.price),
                changePerc: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                isPositive: change >= 0
            };
        } catch (error) {
            console.warn(`Yahoo quote failed for ${label}`, error.message);
            return null;
        }
    });
    const yahooResults = await Promise.all(yahooPromises);
    yahooResults.filter(Boolean).forEach((item) => results.push(item));

    try {
        const forexResponse = await axios.get('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', { timeout: 15000 });
        const rates = forexResponse.data?.usd;

        if (rates) {
            // Gold from XAU rate
            try {
                if (rates.xau && rates.xau > 0) {
                    const goldPrice = 1 / rates.xau;
                    const delta = getDelta('Gold', goldPrice);
                    results.push({
                        symbol: 'Gold',
                        price: formatPrice(goldPrice, { style: 'currency', currency: 'USD' }),
                        changePerc: delta.changePerc,
                        isPositive: delta.isPositive
                    });
                }
            } catch (e) { console.warn('Gold price calc failed', e.message); }

            // FX pairs
            FX_PAIRS.forEach((cross) => {
                try {
                    const rate = rates[cross.id];
                    if (!rate || rate <= 0) return;

                    const price = cross.invert ? (1 / rate) : rate;
                    if (!isFinite(price) || isNaN(price)) return;

                    const delta = getDelta(cross.name, price);

                    results.push({
                        symbol: cross.name,
                        price: cross.id === 'irr' ? Math.round(price).toLocaleString('en-US') : formatPrice(price),
                        changePerc: delta.changePerc,
                        isPositive: delta.isPositive
                    });
                } catch (e) {
                    console.warn(`FX pair ${cross.name} failed`, e.message);
                }
            });
        }
    } catch (error) {
        console.warn('Currency API failed', error.message);
        // Fallback to open.er-api for basic forex
        try {
            const fallback = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 15000 });
            const rates = fallback.data?.rates;
            if (rates) {
                FX_PAIRS.forEach((cross) => {
                    try {
                        const key = cross.id.toUpperCase();
                        if (!rates[key] || rates[key] <= 0) return;

                        const price = cross.invert ? (1 / rates[key]) : rates[key];
                        if (!isFinite(price) || isNaN(price)) return;

                        const delta = getDelta(cross.name, price);
                        results.push({
                            symbol: cross.name,
                            price: cross.id === 'irr' ? Math.round(price).toLocaleString('en-US') : formatPrice(price),
                            changePerc: delta.changePerc,
                            isPositive: delta.isPositive
                        });
                    } catch (e) {
                        console.warn(`Fallback FX pair ${cross.name} failed`, e.message);
                    }
                });
            }
        } catch (fallbackError) {
            console.warn('Forex fallback also failed', fallbackError.message);
        }
    }

    return results;
};
