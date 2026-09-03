import React, { useCallback } from 'react';
import { TrendingUp, TrendingDown, Droplets } from 'lucide-react';
import { useLiveResource } from '../hooks/useLiveResource';
import { fetchBackendJson } from '../services/backendClient.js';
import DataStatus from './DataStatus';

const WAR_EVENTS = [
    { date: '2026-02-28', label: 'War starts', color: '#ef4444' },
    { date: '2026-03-04', label: 'Hormuz closed', color: '#f59e0b' },
    { date: '2026-03-08', label: '$100 crossed', color: '#f97316' },
    { date: '2026-03-18', label: 'Peak $126', color: '#dc2626' }
];

// Series dates are YYYY-MM-DD; parse them as UTC days so labels never slip a
// day in negative-offset timezones.
const toDayMs = (date) => {
    const t = Date.parse(String(date ?? '').slice(0, 10));
    return Number.isNaN(t) ? null : t;
};

const formatDay = (date) => {
    const t = toDayMs(date);
    if (t == null) return String(date ?? '—');
    return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const nearestIndex = (series, date) => {
    const target = toDayMs(date);
    if (target == null) return -1;
    let best = -1;
    let bestGap = Infinity;
    series.forEach((d, i) => {
        const t = toDayMs(d.date);
        if (t == null) return;
        const gap = Math.abs(t - target);
        if (gap < bestGap) { bestGap = gap; best = i; }
    });
    return best;
};

const OilPriceChart = () => {
    const fetcher = useCallback(() => fetchBackendJson('/api/oil-prices'), []);

    const { data, isLoading, isRefreshing, isStale, isSample, error, retryCount, refresh } = useLiveResource(fetcher, {
        cacheKey: 'oil-prices',
        intervalMs: 30 * 60 * 1000,
        isUsable: (d) => d?.brent?.length > 0
    });

    // Anything that is not an EIA observation is curated — badge it in red.
    const isDemo = isSample || data?.source !== 'eia';

    if (!data?.brent?.length) return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid var(--accent-amber)', paddingLeft: '8px'
            }}>
                <Droplets size={12} style={{ color: 'var(--accent-amber)' }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>Oil Price</span>
            </div>
            <DataStatus isLoading={isLoading} error={error} retryCount={retryCount} data={data} refresh={refresh}
                isEmpty={!isLoading && !data?.brent?.length} emptyMessage="Awaiting EIA data" />
        </div>
    );

    const brent = data.brent;
    const prices = brent.map(d => d.price);
    const minP = Math.min(...prices) - 5;
    const maxP = Math.max(...prices) + 5;
    const W = 220, H = 100, PAD = 2;

    const toX = (i) => PAD + (i / (brent.length - 1)) * (W - PAD * 2);
    const toY = (p) => PAD + (1 - (p - minP) / (maxP - minP)) * (H - PAD * 2);

    const linePath = brent.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`).join(' ');
    const areaPath = linePath + ` L${toX(brent.length - 1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z`;

    const latest = brent[brent.length - 1];
    const first = brent[0];
    const firstMs = toDayMs(first.date);
    const lastMs = toDayMs(latest.date);
    // Window: latest point vs the first point in the series.
    const change = (latest.price - first.price) / first.price * 100;
    const ChangeIcon = change < 0 ? TrendingDown : TrendingUp;
    const sourceLabel = isDemo ? `curated · as of ${formatDay(latest.date)}` : 'EIA spot';

    // $100 threshold line
    const y100 = toY(100);

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '6px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid #ef4444', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Droplets size={12} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Brent Crude
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: latest.price > 100 ? '#ef4444' : '#f59e0b' }}>
                        ${latest.price.toFixed(1)}
                    </span>
                    <span
                        title={`vs first point in series (${formatDay(first.date)})`}
                        style={{
                            fontSize: '0.5rem', fontWeight: 700,
                            color: change > 0 ? '#ef4444' : '#22c55e',
                            padding: '1px 5px', borderRadius: '3px',
                            background: change > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'
                        }}
                    >
                        <ChangeIcon size={8} style={{ display: 'inline', marginRight: '2px' }} />
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                </div>
            </div>

            <DataStatus
                isLoading={isLoading}
                isRefreshing={isRefreshing}
                isStale={isStale}
                error={error}
                retryCount={retryCount}
                data={data}
                refresh={refresh}
                isDemo={isDemo}
                demoLabel="CURATED — NO EIA KEY"
            >
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: '120px' }}>
                    <defs>
                        <linearGradient id="oilGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    {/* $100 threshold */}
                    {y100 > PAD && y100 < H - PAD && (
                        <>
                            <line x1={PAD} y1={y100} x2={W - PAD} y2={y100} stroke="rgba(239,68,68,0.2)" strokeWidth="0.5" strokeDasharray="3,3" />
                            <text x={W - PAD - 1} y={y100 - 2} textAnchor="end" fill="rgba(239,68,68,0.4)" fontSize="5" fontFamily="var(--font-mono)">$100</text>
                        </>
                    )}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#oilGrad)" />

                    {/* Price line */}
                    <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Event markers — only inside the series window, snapped to the nearest date */}
                    {WAR_EVENTS.map((evt, ei) => {
                        const evtMs = toDayMs(evt.date);
                        if (evtMs == null || firstMs == null || lastMs == null) return null;
                        if (evtMs < firstMs || evtMs > lastMs) return null;
                        const idx = nearestIndex(brent, evt.date);
                        if (idx < 0) return null;
                        const x = toX(idx), y = toY(brent[idx].price);
                        return (
                            <g key={ei}>
                                <line x1={x} y1={y} x2={x} y2={H} stroke={evt.color} strokeWidth="0.4" strokeDasharray="2,2" opacity="0.5" />
                                <circle cx={x} cy={y} r="2.5" fill={evt.color} stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />
                                <text x={x} y={H - 2} textAnchor="middle" fill={evt.color} fontSize="3.5" fontFamily="var(--font-mono)" opacity="0.8">
                                    {evt.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Latest price dot — pulses only on a live observation */}
                    <circle cx={toX(brent.length - 1)} cy={toY(latest.price)} r="3" fill="#ef4444" stroke="var(--ink-2)" strokeWidth="0.8">
                        {!isDemo && <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite" />}
                    </circle>
                </svg>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.45rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{formatDay(first.date)}</span>
                    <span style={{ fontSize: '0.45rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                        {sourceLabel} · Δ vs first pt · {brent.length} pts
                    </span>
                    <span style={{ fontSize: '0.45rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{formatDay(latest.date)}</span>
                </div>
            </DataStatus>
        </div>
    );
};

export default OilPriceChart;
