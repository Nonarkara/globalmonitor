import React, { useCallback, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { useLiveResource } from '../hooks/useLiveResource';
import { fetchBackendJson } from '../services/backendClient.js';
import DataStatus from './DataStatus';

const EMPTY_TIMELINE = [];
const CHART_WIDTH = 200;
const CHART_HEIGHT = 60;
const CHART_PAD = 2;
// A localStorage restore older than this is a reading, not a current picture.
const MAX_RESTORE_AGE_MS = 24 * 60 * 60 * 1000;

// GDELT timeline dates arrive as 20260301T000000Z; ISO strings also accepted.
const parseGdeltDate = (value) => {
    if (!value) return null;
    const s = String(value);
    const m = s.match(/^(\d{4})(\d{2})(\d{2})/);
    const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Date.parse(s);
    return Number.isNaN(t) ? null : t;
};

const formatDay = (value) => {
    const t = parseGdeltDate(value);
    if (t == null) return String(value ?? '—');
    return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const formatStamp = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value ?? '—');
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CAPTION_STYLE = { fontSize: '0.45rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' };

const SentimentChart = ({ viewMode = 'middleeast' }) => {
    const fetcher = useCallback(() => fetchBackendJson('/api/sentiment', { theater: viewMode }), [viewMode]);

    const { data, lastUpdated, isLoading, isRefreshing, isStale, isSample, error, retryCount, refresh } = useLiveResource(fetcher, {
        cacheKey: `gdelt-sentiment:${viewMode}`,
        intervalMs: 30 * 60 * 1000,
        isUsable: (d) => d?.timeline?.length >= 3
    });

    // Reference clock taken once at mount — render must stay pure.
    const [mountedAt] = useState(() => Date.now());

    const timeline = data?.timeline || EMPTY_TIMELINE;
    const lastUpdatedMs = lastUpdated ? new Date(lastUpdated).getTime() : NaN;
    const isExpired = !Number.isNaN(lastUpdatedMs) && mountedAt - lastUpdatedMs > MAX_RESTORE_AGE_MS;

    const computed = useMemo(() => {
        if (timeline.length < 3) return null;

        const tones = timeline.map(d => d.tone || 0);
        const minT = Math.min(...tones, -5);
        const maxT = Math.max(...tones, 5);
        const range = Math.max(maxT - minT, 1);
        const toX = (i) => CHART_PAD + (i / (timeline.length - 1)) * (CHART_WIDTH - CHART_PAD * 2);
        const toY = (t) => CHART_PAD + (1 - (t - minT) / range) * (CHART_HEIGHT - CHART_PAD * 2);
        const zeroY = toY(0);
        const linePath = timeline.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.tone || 0).toFixed(1)}`).join(' ');
        const posArea = timeline.map((d, i) => {
            const y = toY(Math.max(d.tone || 0, 0));
            return `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${y.toFixed(1)}`;
        }).join(' ') + ` L${toX(timeline.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${toX(0).toFixed(1)},${zeroY.toFixed(1)} Z`;
        const negArea = timeline.map((d, i) => {
            const y = toY(Math.min(d.tone || 0, 0));
            return `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${y.toFixed(1)}`;
        }).join(' ') + ` L${toX(timeline.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${toX(0).toFixed(1)},${zeroY.toFixed(1)} Z`;
        const avg = tones.reduce((a, b) => a + b, 0) / tones.length;
        const trendWindow = tones.slice(-5);
        const trend = trendWindow.reduce((a, b) => a + b, 0) / trendWindow.length;
        return {
            tones,
            zeroY,
            linePath,
            posArea,
            negArea,
            avg,
            trend,
            toX,
            toY,
            W: CHART_WIDTH,
            H: CHART_HEIGHT,
            PAD: CHART_PAD
        };
    }, [timeline]);

    if (!computed || isExpired) return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid var(--accent-cyan)', paddingLeft: '8px'
            }}>
                <Activity size={12} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>Media Sentiment</span>
            </div>
            <DataStatus isLoading={isLoading} error={error} retryCount={retryCount} data={data} refresh={refresh}
                isRefreshing={isRefreshing} isStale={isStale}
                isEmpty={isExpired || (!isLoading && timeline.length < 3)}
                emptyMessage={isExpired ? `last reading: ${formatStamp(lastUpdated)}` : 'Awaiting GDELT data'} />
        </div>
    );

    const { tones, zeroY, linePath, posArea, negArea, avg, trend, toX, toY, W, H, PAD } = computed;
    const latest = tones[tones.length - 1];
    const label = trend < -3 ? 'VERY NEGATIVE' : trend < -1 ? 'NEGATIVE' : trend < 1 ? 'NEUTRAL' : 'IMPROVING';
    const labelColor = trend < -3 ? '#ef4444' : trend < -1 ? '#f59e0b' : trend < 1 ? 'var(--ink-2)' : '#22c55e';
    const windowCaption = `${formatDay(timeline[0].date)} – ${formatDay(timeline[timeline.length - 1].date)} · ${timeline.length} points`;

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '5px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid #3b82f6', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={12} style={{ color: '#3b82f6' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Media Sentiment
                    </span>
                </div>
                <span style={{
                    fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.8px',
                    color: labelColor,
                    padding: '2px 6px', borderRadius: '3px',
                    background: `${labelColor}18`, border: `1px solid ${labelColor}30`
                }}>
                    {label}
                </span>
            </div>

            <DataStatus
                isLoading={isLoading}
                isRefreshing={isRefreshing}
                isStale={isStale}
                error={error}
                retryCount={retryCount}
                data={data}
                refresh={refresh}
                isDemo={isSample}
                demoLabel="SAMPLE"
            >
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: '70px' }}>
                    <defs>
                        <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
                        </linearGradient>
                    </defs>

                    {/* Zero line */}
                    <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="var(--line-2)" strokeWidth="0.5" />

                    {/* Positive/Negative fills */}
                    <path d={posArea} fill="url(#posGrad)" />
                    <path d={negArea} fill="url(#negGrad)" />

                    {/* Tone line */}
                    <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Latest dot */}
                    <circle cx={toX(timeline.length - 1)} cy={toY(latest)} r="2.5" fill={latest < 0 ? '#ef4444' : '#22c55e'} stroke="var(--ink-3)" strokeWidth="0.5">
                        {!isSample && <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />}
                    </circle>

                    {/* Labels */}
                    <text x={W - PAD} y={PAD + 5} textAnchor="end" fill="rgba(34,197,94,0.4)" fontSize="4" fontFamily="var(--font-mono)">+positive</text>
                    <text x={W - PAD} y={H - PAD} textAnchor="end" fill="rgba(239,68,68,0.4)" fontSize="4" fontFamily="var(--font-mono)">-negative</text>
                </svg>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginTop: '3px' }}>
                    <span style={CAPTION_STYLE}>GDELT tone · {windowCaption}</span>
                    <span style={CAPTION_STYLE}>avg: {avg.toFixed(1)}</span>
                </div>
                {data?.query && (
                    <div
                        title={data.query}
                        style={{ ...CAPTION_STYLE, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        query: {data.query}
                    </div>
                )}
            </DataStatus>
        </div>
    );
};

export default SentimentChart;
