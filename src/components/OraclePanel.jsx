import React, { useCallback } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, Cpu, Sliders } from 'lucide-react';
import { fetchOracle } from '../services/oracle';
import { useLiveResource } from '../hooks/useLiveResource';
import OracleTrajectory from './OracleTrajectory';

const TrendIcon = ({ trend }) => {
    if (trend === 'rising') return <TrendingUp size={12} style={{ color: '#ef4444' }} />;
    if (trend === 'easing') return <TrendingDown size={12} style={{ color: '#22c55e' }} />;
    return <Minus size={12} style={{ color: '#94a3b8' }} />;
};

const OutcomeBar = ({ outcome, max }) => {
    const pct = max > 0 ? (outcome.prob / max) * 100 : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1.5px 0' }}>
            <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.6)', width: '74px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {outcome.label}
            </span>
            <div style={{ flex: 1, height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: outcome.color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: '0.46rem', fontWeight: 700, color: outcome.color, fontFamily: 'var(--font-mono)', width: '30px', textAlign: 'right' }}>
                {outcome.prob}%
            </span>
        </div>
    );
};

const OraclePanel = ({ viewMode = 'middleeast', onOpenSandbox }) => {
    const fetcher = useCallback(() => fetchOracle(viewMode), [viewMode]);
    const { data, isLoading, isStale, error } = useLiveResource(fetcher, {
        cacheKey: `oracle:${viewMode}`,
        intervalMs: 5 * 60 * 1000,
        isUsable: (d) => Array.isArray(d?.forecast?.outcomes),
    });

    const fc = data?.forecast;
    const head = fc?.headline;
    const maxProb = fc ? Math.max(...fc.outcomes.map((o) => o.prob)) : 0;
    const statusLabel = isStale ? 'STALE' : (error && !data ? 'OFFLINE' : 'LIVE');

    return (
        <div className="bottom-card flex-column" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid #a855f7', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} style={{ color: '#a855f7' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
                        GPD Oracle
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.36rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Cpu size={9} /> {data?.meta?.aiPowered ? 'ABM+LLM' : 'ABM·MC'}
                    </span>
                    <span className={`live-pill ${statusLabel !== 'LIVE' ? 'live-pill-muted' : ''}`}>{statusLabel}</span>
                </div>
            </div>

            {!fc && (
                <div style={{ padding: '14px 4px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', fontStyle: 'italic' }}>
                    {isLoading ? 'Running Monte-Carlo forecast…' : 'Forecast unavailable.'}
                </div>
            )}

            {fc && (
                <>
                    {/* Headline forecast */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                8-week forecast
                            </span>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: head.color, letterSpacing: '0.2px' }}>
                                {head.outcome}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 200, fontFamily: 'var(--font-mono)', color: head.color, lineHeight: 1 }}>
                                {head.confidence}%
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <TrendIcon trend={head.trend} />
                            </div>
                        </div>
                    </div>

                    {/* Live escalation → expected, with trajectory band */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            ESC <span style={{ color: '#fff', fontWeight: 700 }}>{data.live.escalation}</span>
                            <span style={{ opacity: 0.4 }}> → </span>
                            <span style={{ color: head.color, fontWeight: 700 }}>{fc.expectedFinal}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <OracleTrajectory trajectory={fc.trajectory} height={34} color={head.color} />
                        </div>
                        <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            P<sub>crit</sub> <span style={{ color: fc.probCritical >= 40 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{fc.probCritical}%</span>
                        </div>
                    </div>

                    {/* Outcome distribution */}
                    <div style={{ marginBottom: '6px' }}>
                        {fc.outcomes.map((o) => <OutcomeBar key={o.key} outcome={o} max={maxProb} />)}
                    </div>

                    {/* Top drivers */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '7px' }}>
                        <span style={{ fontSize: '0.36rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', alignSelf: 'center' }}>
                            Drivers
                        </span>
                        {fc.drivers.slice(0, 3).map((d) => (
                            <span key={d.id} style={{
                                fontSize: '0.36rem', padding: '1px 5px', borderRadius: '2px',
                                background: `${d.color}18`, border: `1px solid ${d.color}30`, color: 'rgba(255,255,255,0.7)',
                                fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '3px'
                            }}>
                                {d.label}
                                <span style={{ color: d.delta >= 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                                    {d.delta >= 0 ? '+' : ''}{d.delta}
                                </span>
                            </span>
                        ))}
                    </div>

                    {/* Sandbox CTA */}
                    <button
                        onClick={onOpenSandbox}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            width: '100%', padding: '6px', cursor: 'pointer',
                            background: 'linear-gradient(90deg, rgba(168,85,247,0.18), rgba(99,102,241,0.18))',
                            border: '1px solid rgba(168,85,247,0.35)', borderRadius: '3px',
                            color: '#c4b5fd', fontSize: '0.46rem', fontWeight: 700, letterSpacing: '1px',
                            textTransform: 'uppercase', fontFamily: 'inherit'
                        }}
                    >
                        <Sliders size={11} /> Open War-Game Sandbox
                    </button>
                </>
            )}
        </div>
    );
};

export default OraclePanel;
