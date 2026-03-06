import React, { useCallback } from 'react';
import { fetchMarketRadar } from '../services/marketData';
import { Activity, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useLiveResource } from '../hooks/useLiveResource';

const CATEGORIES = [
    { label: 'COMMODITIES', match: (s) => s?.includes && (s.includes('Gold') || s.includes('Silver') || s.includes('Oil') || s.includes('Crude')) },
    { label: 'INDICES', match: (s) => s?.startsWith && (s.startsWith('S&P') || s.startsWith('TASI') || s.startsWith('TA-125')) },
    { label: 'CRYPTO', match: (s) => s && ['BTC', 'ETH'].includes(s) },
    { label: 'FX RATES', match: (s) => s?.includes && s.includes('/') },
];

const categorize = (items) => {
    const groups = CATEGORIES.map((cat) => ({
        label: cat.label,
        items: items.filter((item) => cat.match(item.symbol))
    }));
    const matched = new Set(groups.flatMap((g) => g.items.map((i) => i.symbol)));
    const rest = items.filter((item) => !matched.has(item.symbol));
    if (rest.length > 0) groups.push({ label: 'OTHER', items: rest });
    return groups.filter((g) => g.items.length > 0);
};

const MarketRadarPanel = () => {
    const fetcher = useCallback(() => fetchMarketRadar(), []);
    const {
        data: markets = [],
        lastUpdated,
        isRefreshing,
        isLoading,
        isStale,
        error,
        refresh
    } = useLiveResource(fetcher, {
        cacheKey: 'market-radar',
        intervalMs: 60000,
        isUsable: (items) => Array.isArray(items) && items.length > 0
    });
    const safeMarkets = markets || [];
    const statusLabel = isStale ? 'STALE' : (error && safeMarkets.length === 0 ? 'OFFLINE' : 'LIVE');
    const groups = categorize(safeMarkets);

    return (
        <div className="bottom-card flex-column">
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={14} /> MARKET RADAR
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={refresh}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                        title="Refresh market data"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
                    </button>
                    <span className={`live-pill ${statusLabel !== 'LIVE' ? 'live-pill-muted' : ''}`}>{statusLabel}</span>
                </div>
            </div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="panel-lead" style={{ marginBottom: 0, fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.3px' }}>
                    {lastUpdated ? `Last update ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for first live quote...'}
                </div>
                <div className="radar-groups">
                    {groups.map((group) => (
                        <div key={group.label} className="radar-group">
                            <div className="radar-group-label">{group.label}</div>
                            <ul className="radar-list">
                                {group.items.map((item, index) => (
                                    <li key={index} className="radar-item">
                                        <div className="radar-token">
                                            <strong>{item.symbol}</strong>
                                        </div>
                                        <div className="radar-price">
                                            <span>{item.price}</span>
                                            <span className={`change ${item.isPositive ? 'positive' : 'negative'}`}>
                                                {item.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {item.changePerc}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {safeMarkets.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            {isLoading ? 'Connecting to live markets...' : 'No live market data available right now.'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketRadarPanel;
