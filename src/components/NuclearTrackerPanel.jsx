import React, { useState } from 'react';
import { Radiation, ChevronDown, ChevronUp, MapPin, AlertTriangle } from 'lucide-react';
import nuclearData from '../data/nuclearProgram.json';

const STATUS_BADGES = {
    destroyed: { bg: 'transparent', border: 'var(--line-2)', color: 'var(--red)' },
    damaged: { bg: 'transparent', border: 'var(--line-2)', color: 'var(--red)' },
    intact: { bg: 'transparent', border: 'var(--line-2)', color: 'var(--green)' },
    unknown: { bg: 'transparent', border: 'var(--line-2)', color: 'var(--ink-2)' }
};

const NuclearTrackerPanel = ({ onFlyTo }) => {
    const [showTimeline, setShowTimeline] = useState(false);

    const destroyed = nuclearData.facilities.filter(f => f.status === 'destroyed').length;
    const damaged = nuclearData.facilities.filter(f => f.status === 'damaged').length;
    const intact = nuclearData.facilities.filter(f => f.status === 'intact').length;

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid var(--ink)', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radiation size={12} style={{ color: 'var(--ink-2)' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Nuclear Program
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    {nuclearData.facilities.length} SITES
                </span>
            </div>

            {/* Breakout estimate */}
            <div style={{
                display: 'flex', gap: '6px', marginBottom: '8px',
                padding: '6px 8px', borderRadius: 0,
                background: 'transparent',
                border: '1px solid var(--line)'
            }}>
                <AlertTriangle size={10} style={{ color: 'var(--ink-2)', marginTop: '1px', flexShrink: 0 }} />
                <div>
                    <div style={{ fontSize: '0.42rem', color: 'var(--ink-2)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Breakout Estimate
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div>
                            <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                                {nuclearData.breakoutEstimate.postWar}
                            </span>
                            <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)', marginLeft: '4px' }}>post-war</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)', textDecoration: 'line-through', opacity: 0.5 }}>
                                {nuclearData.breakoutEstimate.preWar}
                            </span>
                            <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)', marginLeft: '4px' }}>pre-war</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI strip */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {[
                    { label: 'Destroyed', count: destroyed, color: 'var(--red)' },
                    { label: 'Damaged', count: damaged, color: 'var(--red)' },
                    { label: 'Intact', count: intact, color: 'var(--green)' }
                ].map(k => (
                    <div key={k.label} style={{
                        flex: 1, textAlign: 'center', padding: '4px',
                        background: '#f2f0ea', borderRadius: 0
                    }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>{k.count}</div>
                        <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Facility list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {nuclearData.facilities.map(f => {
                    const badge = STATUS_BADGES[f.status] || STATUS_BADGES.unknown;
                    return (
                        <div key={f.id}
                            onClick={() => onFlyTo?.({ longitude: f.lon, latitude: f.lat, zoom: 8, transitionDuration: 1500 })}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '4px 6px', borderRadius: 0,
                                background: 'transparent',
                                cursor: onFlyTo ? 'pointer' : 'default',
                                transition: 'background 0.2s'
                            }}
                        >
                            <div style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: f.statusColor, flexShrink: 0
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.48rem', color: 'var(--ink)', fontWeight: 600 }}>
                                    {f.name}
                                </div>
                                <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>
                                    {f.type} · IAEA: {f.iaeaAccess}
                                </div>
                            </div>
                            <span style={{
                                fontSize: '0.36rem', fontWeight: 700,
                                color: badge.color,
                                padding: '1px 5px',
                                background: badge.bg,
                                border: `1px solid ${badge.border}`,
                                borderRadius: 0,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}>
                                {f.status}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Timeline toggle */}
            <button
                onClick={() => setShowTimeline(!showTimeline)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', width: '100%', marginTop: '6px',
                    padding: '3px', background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 0, color: 'var(--ink-3)',
                    fontSize: '0.4rem', cursor: 'pointer', fontFamily: 'inherit'
                }}
            >
                {showTimeline ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                Nuclear Timeline ({nuclearData.timeline.length} events)
            </button>

            {showTimeline && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {nuclearData.timeline.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', padding: '2px 0' }}>
                            <span style={{
                                fontSize: '0.36rem', color: 'var(--ink-3)',
                                fontFamily: 'var(--font-mono)', width: '38px', flexShrink: 0
                            }}>
                                {t.date.slice(5)}
                            </span>
                            <div style={{
                                width: '4px', height: '4px', borderRadius: '50%', marginTop: '3px',
                                background: t.severity === 'critical' ? 'var(--red)' : t.severity === 'high' ? 'var(--red)' : 'var(--ink-2)',
                                flexShrink: 0
                            }} />
                            <span style={{ fontSize: '0.4rem', color: 'var(--ink-2)', lineHeight: 1.3 }}>
                                {t.event}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NuclearTrackerPanel;
