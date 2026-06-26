import React, { useCallback, useMemo } from 'react';
import { TrendingUp, Activity } from 'lucide-react';
import { useLiveResource } from '../hooks/useLiveResource';
import DataStatus from './DataStatus';
import { fetchTimesFmForRegion } from '../services/timefm';

const W = 260;
const H = 110;
const PAD = 4;

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const TimesFMPanel = ({ viewMode = 'middleeast' }) => {
    const fetcher = useCallback(
        () => fetchTimesFmForRegion(viewMode),
        [viewMode]
    );

    const { data, isLoading, error, retryCount, refresh } = useLiveResource(fetcher, {
        cacheKey: `timefm:${viewMode}`,
        intervalMs: 24 * 60 * 60 * 1000,
        freezeAfterLoad: true,
        isUsable: (payload) => Boolean(payload?.primary?.payload?.forecast?.point?.length),
    });

    const forecast = data?.primary;
    const payload = forecast?.payload;

    const chart = useMemo(() => {
        if (!payload?.forecast?.point?.length) return null;

        const point = payload.forecast.point;
        const q10 = payload.forecast.q10 || [];
        const q90 = payload.forecast.q90 || [];
        const timestamps = payload.forecast.timestamps || [];

        const allValues = [
            ...point,
            ...q10,
            ...q90,
            payload.input?.min,
            payload.input?.max,
        ].filter((v) => typeof v === 'number' && !Number.isNaN(v));

        const minV = Math.min(...allValues) - 1;
        const maxV = Math.max(...allValues) + 1;

        const n = point.length;
        const toX = (i) => PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2);
        const toY = (v) => PAD + (1 - (v - minV) / (maxV - minV)) * (H - PAD * 2);

        const bandPath = q10.length === n && q90.length === n
            ? [
                ...q90.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
                ...q10.slice().reverse().map((v, i) => `L${toX(n - 1 - i).toFixed(1)},${toY(v).toFixed(1)}`),
                'Z',
            ].join(' ')
            : null;

        const linePath = point
            .map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
            .join(' ');

        const lastPoint = point[point.length - 1];
        const lastQ90 = q90[q90.length - 1];
        const lastQ10 = q10[q10.length - 1];

        return {
            bandPath,
            linePath,
            minV,
            maxV,
            lastPoint,
            lastQ90,
            lastQ10,
            horizonEnd: timestamps[timestamps.length - 1],
            horizonStart: timestamps[0],
        };
    }, [payload]);

    if (!payload?.forecast?.point?.length) {
        return (
            <div className="bottom-card timesfm-card">
                <div className="panel-header timesfm-header">
                    <Activity size={12} />
                    <span>TimesFM Forecast</span>
                </div>
                <DataStatus
                    isLoading={isLoading}
                    error={error}
                    retryCount={retryCount}
                    data={data}
                    refresh={refresh}
                    isEmpty={!isLoading && !payload?.forecast?.point?.length}
                    emptyMessage="No forecast for this theater"
                />
            </div>
        );
    }

    const inputMean = payload.input?.mean;
    const delta = chart.lastPoint != null && inputMean != null
        ? ((chart.lastPoint - inputMean) / inputMean * 100)
        : null;

    return (
        <div className="bottom-card timesfm-card">
            <div className="panel-header timesfm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={12} style={{ color: 'var(--accent-amber)' }} />
                    <span>TimesFM · {forecast.label || 'event-count'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="timesfm-value">{chart.lastPoint.toFixed(1)}</span>
                    {delta != null && (
                        <span className={`timesfm-delta ${delta >= 0 ? 'up' : 'down'}`}>
                            <TrendingUp size={8} />
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="timesfm-chart" aria-label="TimesFM forecast chart">
                {chart.bandPath && (
                    <path d={chart.bandPath} fill="rgba(245, 158, 11, 0.18)" stroke="none" />
                )}
                <path d={chart.linePath} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round" />
                {chart.lastQ90 != null && (
                    <line
                        x1={PAD}
                        y1={PAD + (1 - (chart.lastQ90 - chart.minV) / (chart.maxV - chart.minV)) * (H - PAD * 2)}
                        x2={W - PAD}
                        y2={PAD + (1 - (chart.lastQ90 - chart.minV) / (chart.maxV - chart.minV)) * (H - PAD * 2)}
                        stroke="rgba(239, 68, 68, 0.45)"
                        strokeWidth="0.8"
                        strokeDasharray="3 2"
                    />
                )}
            </svg>

            <div className="timesfm-meta">
                <span>{forecast.aoi} · {payload.forecast.horizon}d horizon</span>
                <span>Last obs {formatDate(payload.input?.last_observed)}</span>
            </div>

            <div className="timesfm-bands">
                <span>Q10 worst-case floor: <strong>{chart.lastQ10?.toFixed(1) ?? '—'}</strong></span>
                <span>Q90 stress ceiling: <strong>{chart.lastQ90?.toFixed(1) ?? '—'}</strong></span>
            </div>

            <div className="timesfm-footnote">
                Model: {payload.model || forecast.model}. Point forecast only — not official intelligence.
                Trained on {payload.input?.count ?? '—'} daily observations; updates when pipeline refreshes bundle.
            </div>
        </div>
    );
};

export default TimesFMPanel;
