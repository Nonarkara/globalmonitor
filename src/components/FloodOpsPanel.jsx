import React, { useCallback, useMemo, useState } from 'react';
import { Waves, ArrowDown, CloudRain, Radio } from 'lucide-react';
import { fetchFloodOps } from '../services/flood';
import { useLiveResource } from '../hooks/useLiveResource';
import DataStatus from './DataStatus';

const RATING_COLOR = {
    CRITICAL: 'var(--red)',
    HIGH: 'var(--red)',
    ELEVATED: 'var(--ink-2)',
    NORMAL: 'var(--green)',
};

const LEVEL_COLOR = ['var(--ink-3)', 'var(--green)', 'var(--ink-3)', 'var(--ink-2)', 'var(--red)', '#7c2b1c'];

const etaLabel = (h) => {
    if (h == null) return '—';
    if (h < 24) return `${h}h`;
    return `${Math.round(h / 24 * 10) / 10}d`;
};

/**
 * Water Inbound — the mayor's upstream picture. Live HII/ThaiWater cascade:
 * how much water is moving down the river network, from where, arriving when.
 */
const FloodOpsPanel = ({ onOpenSandbox }) => {
    const [city, setCity] = useState('ayutthaya');
    const fetcher = useCallback(() => fetchFloodOps(city), [city]);
    const resource = useLiveResource(fetcher, {
        cacheKey: `flood:${city}`,
        intervalMs: 10 * 60 * 1000,
        isUsable: (p) => Boolean(p?.city),
    });
    const ops = resource.data;

    const gauge = ops?.city?.gauge;
    const rising = (gauge?.trendCmH ?? 0) > 0;
    const inbound = useMemo(() => (ops?.inbound || []).slice(0, 6), [ops]);
    const wetBasins = useMemo(
        () => (ops?.rainBasins || []).filter((b) => b.heavyStations > 0).sort((a, b) => b.max24h - a.max24h),
        [ops],
    );

    return (
        <div className="bottom-card flex-column" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid var(--line-2)', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Waves size={12} style={{ color: 'var(--ink-2)' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Water Inbound
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                    {(ops?.cities || [{ id: 'ayutthaya', label: 'Ayutthaya' }, { id: 'chiangmai', label: 'Chiang Mai' }]).map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCity(c.id)}
                            aria-pressed={city === c.id}
                            style={{
                                fontSize: '0.4rem', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase',
                                padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit',
                                background: city === c.id ? 'var(--ink)' : 'transparent',
                                color: city === c.id ? '#fff' : 'var(--ink-3)',
                                border: '1px solid var(--line-2)',
                            }}
                        >
                            {c.label.split(' ').pop()}
                        </button>
                    ))}
                </div>
            </div>

            <DataStatus
                isLoading={resource.isLoading}
                isRefreshing={resource.isRefreshing}
                isStale={resource.isStale}
                error={resource.error}
                retryCount={resource.retryCount}
                data={ops}
                isEmpty={Boolean(ops) && !ops.city}
                emptyMessage="No HII telemetry"
                refresh={resource.refresh}
            >
                {ops && (
                    <>
                        {/* City gauge hero */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: '4px', marginBottom: '6px' }}>
                            <div style={{ textAlign: 'center', padding: '5px 4px', background: '#f2f0ea' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: RATING_COLOR[ops.rating] || 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                                    {ops.riskScore}
                                </div>
                                <div style={{ fontSize: '0.34rem', color: 'var(--ink-3)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                    Risk · {ops.rating}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '5px 4px', background: '#f2f0ea' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: (gauge?.pct ?? 0) >= 80 ? 'var(--red)' : 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                                    {gauge?.pct != null ? `${Math.round(gauge.pct)}%` : '—'}
                                </div>
                                <div style={{ fontSize: '0.34rem', color: 'var(--ink-3)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                    Bank · {gauge?.code || '—'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '5px 4px', background: '#f2f0ea' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: rising ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                                    {gauge?.trendCmH != null ? `${gauge.trendCmH > 0 ? '+' : ''}${gauge.trendCmH}` : '—'}
                                </div>
                                <div style={{ fontSize: '0.34rem', color: 'var(--ink-3)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                    cm/h {rising ? 'rising' : 'falling'}
                                </div>
                            </div>
                        </div>

                        {/* Upstream cascade — what is coming, when */}
                        {inbound.length > 0 && (
                            <div style={{ marginBottom: '6px' }}>
                                <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '3px' }}>
                                    <ArrowDown size={8} style={{ verticalAlign: '-1px' }} /> Upstream cascade → {ops.city.label.split(' ').pop()}
                                </div>
                                {inbound.map((s) => (
                                    <div key={s.code} style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '3px 6px', borderBottom: '1px solid var(--line)',
                                        fontSize: '0.46rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums'
                                    }}>
                                        <span style={{
                                            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                                            background: LEVEL_COLOR[s.level ?? 0] || 'var(--ink-3)'
                                        }} />
                                        <span style={{ fontWeight: 700, color: 'var(--ink)', minWidth: '30px' }}>{s.code}</span>
                                        <span style={{ color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.place}
                                        </span>
                                        <span style={{ color: 'var(--ink-2)', minWidth: '52px', textAlign: 'right' }}>
                                            {s.discharge != null ? `${Math.round(s.discharge)} m³/s` : '—'}
                                        </span>
                                        <span style={{ color: 'var(--ink)', fontWeight: 700, minWidth: '34px', textAlign: 'right' }}>
                                            {etaLabel(s.etaHours)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Basin rain loading */}
                        {wetBasins.length > 0 && (
                            <div style={{ marginBottom: '6px' }}>
                                <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '3px' }}>
                                    <CloudRain size={8} style={{ verticalAlign: '-1px' }} /> Basin rain · 24h
                                </div>
                                {wetBasins.slice(0, 3).map((b) => (
                                    <div key={b.id} style={{
                                        display: 'flex', justifyContent: 'space-between', gap: '6px',
                                        padding: '2px 6px', fontSize: '0.44rem',
                                        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums'
                                    }}>
                                        <span style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                                        <span style={{ color: b.max24h >= 90 ? 'var(--red)' : 'var(--ink)', fontWeight: 700, flexShrink: 0 }}>
                                            {b.max24h}mm · {b.heavyStations} hvy
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* National alert strip + God's Mode */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '4px', borderTop: '1px solid var(--line)' }}>
                            <span style={{ fontSize: '0.4rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                                <Radio size={8} style={{ verticalAlign: '-1px', color: (ops.national?.level5 ?? 0) > 0 ? 'var(--red)' : 'var(--ink-3)' }} />
                                {' '}{ops.national?.level5 ?? 0} overbank · {ops.national?.level4 ?? 0} lvl-4 · {ops.meta?.stations} stations
                            </span>
                            <button
                                type="button"
                                onClick={() => onOpenSandbox?.(city)}
                                aria-label="Open flood simulation planning mode"
                                style={{
                                    fontSize: '0.42rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
                                    padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
                                    background: 'var(--green)', color: '#fff', border: 'none'
                                }}
                            >
                                God&apos;s Mode
                            </button>
                        </div>
                    </>
                )}
            </DataStatus>
        </div>
    );
};

export default FloodOpsPanel;
