import React, { useCallback } from 'react';
import { Target } from 'lucide-react';
import { fetchStrikeStats } from '../services/strikeStats';
import { useLiveResource } from '../hooks/useLiveResource';

const StatCard = ({ label, current, week, daily, color }) => {
    const maxDay = Math.max(1, ...daily.map(d => d));
    return (
        <div style={{ flex: 1, minWidth: '60px' }}>
            <div style={{
                fontSize: '1.4rem',
                fontWeight: 200,
                fontFamily: 'var(--font-mono)',
                color: current > 0 ? color : 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1
            }}>
                {week}
            </div>
            <div style={{
                fontSize: '0.48rem',
                fontWeight: 600,
                letterSpacing: '1.2px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginTop: '3px'
            }}>
                {label}
            </div>
            {/* 7-day mini bar chart */}
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '16px', marginTop: '6px' }}>
                {daily.map((val, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: `${Math.max(2, (val / maxDay) * 16)}px`,
                            background: val > 0 ? color : 'rgba(255,255,255,0.06)',
                            borderRadius: '1px',
                            opacity: val > 0 ? 0.6 : 0.3,
                            transition: 'height 0.5s ease'
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

const StrikeStatsPanel = () => {
    const fetcher = useCallback(() => fetchStrikeStats(), []);
    const { data, isLoading } = useLiveResource(fetcher, {
        cacheKey: 'strike-stats',
        intervalMs: 5 * 60 * 1000,
        isUsable: (d) => d?.weekTotal != null
    });

    if (!data && isLoading) {
        return (
            <div className="bottom-card flex-column" style={{ padding: '12px', opacity: 0.5 }}>
                <div className="panel-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Target size={14} /> STRIKE STATISTICS
                    </span>
                </div>
                <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Loading...
                </div>
            </div>
        );
    }

    const { weekTotal = {}, daily = [] } = data || {};

    return (
        <div className="bottom-card flex-column">
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={14} /> STRIKE STATISTICS
                </span>
                <span className="live-pill">7D</span>
            </div>
            <div className="panel-content" style={{ display: 'flex', gap: '12px', padding: '12px' }}>
                <StatCard
                    label="Missiles"
                    current={data?.current?.missiles || 0}
                    week={weekTotal.missiles || 0}
                    daily={daily.map(d => d.missiles || 0)}
                    color="#ef4444"
                />
                <StatCard
                    label="Drones"
                    current={data?.current?.drones || 0}
                    week={weekTotal.drones || 0}
                    daily={daily.map(d => d.drones || 0)}
                    color="#f59e0b"
                />
                <StatCard
                    label="Intercept"
                    current={data?.current?.interceptions || 0}
                    week={weekTotal.interceptions || 0}
                    daily={daily.map(d => d.interceptions || 0)}
                    color="#3b82f6"
                />
                <StatCard
                    label="Casualties"
                    current={data?.current?.casualties || 0}
                    week={weekTotal.casualties || 0}
                    daily={daily.map(d => d.casualties || 0)}
                    color="#ef4444"
                />
            </div>
        </div>
    );
};

export default StrikeStatsPanel;
