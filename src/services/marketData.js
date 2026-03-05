import axios from 'axios';
import { fetchBackendJson } from './backendClient.js';

const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];
const FOREX_API = 'https://open.er-api.com/v6/latest/USD';

// Reference spot values in USD — anchors for energy and precious metals
// relevant to Iran conflict (oil, gold as safe haven, defense-linked metals)
const REFERENCE_COMMODITIES = {
    'Gold': 2345.5,
    'Brent Oil': 82.5,
    'WTI Crude': 78.2
};

const previousQuotes = new Map();

const getDelta = (key, value) => {
    const previous = previousQuotes.get(key);
    previousQuotes.set(key, value);

    if (!previous || previous === 0) {
        return {
            changePerc: '0.00%',
            isPositive: true
        };
    }

    const delta = ((value - previous) / previous) * 100;

    return {
        changePerc: `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`,
        isPositive: delta >= 0
    };
};

export const fetchMarketRadar = async () => {
    try {
        const backendData = await fetchBackendJson('/api/markets');
        if (backendData && backendData.length > 0) return backendData;
    } catch (error) {
        // Fall back to direct fetching if backend proxy is offline
    }

    try {
        const results = [];
        let rates = null;
        let thbRate = 35.0;

        try {
            const forexResponse = await axios.get(FOREX_API, { timeout: 15000 });
            rates = forexResponse.data?.rates || null;
            thbRate = rates?.THB || thbRate;
        } catch (error) {
            console.warn('Forex API failed', error.message);
        }

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

        if (rates) {
            // Iran-relevant FX: USD base pairs for key conflict currencies
            [
                { id: 'EUR', name: 'EUR/USD', invert: true },
                { id: 'GBP', name: 'GBP/USD', invert: true },
                { id: 'ILS', name: 'USD/ILS', invert: false },
                { id: 'SAR', name: 'USD/SAR', invert: false },
                { id: 'AED', name: 'USD/AED', invert: false },
                { id: 'THB', name: 'USD/THB', invert: false }
            ].forEach((cross) => {
                if (!rates[cross.id]) return;

                const price = cross.invert ? (1 / rates[cross.id]) : rates[cross.id];
                const delta = getDelta(cross.name, price);

                results.push({
                    symbol: cross.name,
                    price: price.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4
                    }),
                    changePerc: delta.changePerc,
                    isPositive: delta.isPositive
                });
            });
        }

        Object.entries(REFERENCE_COMMODITIES).forEach(([symbol, usdPrice]) => {
            const delta = getDelta(symbol, usdPrice);

            results.push({
                symbol,
                price: usdPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                changePerc: delta.changePerc,
                isPositive: delta.isPositive
            });
        });

        // Ensure gold and oil are always present even if rates fail
        if (results.length === 0) {
            Object.entries(REFERENCE_COMMODITIES).forEach(([symbol, usdPrice]) => {
                results.push({
                    symbol,
                    price: usdPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    changePerc: '0.00%',
                    isPositive: true
                });
            });
        }

        return results;
    } catch (error) {
        console.warn('Market radar failed', error.message);
        return [];
    }
};
