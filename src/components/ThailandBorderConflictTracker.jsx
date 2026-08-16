import React, { useState } from 'react';
import { ShieldAlert, MapPin, AlertTriangle, ChevronRight, Navigation, CheckCircle2 } from 'lucide-react';
import { THAILAND_BORDER_ZONES } from '../data/thailandBorders.js';

/**
 * Thailand 3-Border Conflict Monitor & Early Warning HUD
 * Allows 1-click flyTo camera targeting for:
 * 1. Thailand-Myanmar Border (Tak / Mae Sot)
 * 2. Thailand-Cambodia Border (Preah Vihear / Surin)
 * 3. Thailand-Malaysia Border (Deep South / Yala & Narathiwat)
 */
const ThailandBorderConflictTracker = ({ onFlyToBorder, activeBorderId }) => {
    const [expandedZoneId, setExpandedZoneId] = useState(activeBorderId || 'border-myanmar');

    const handleSelectZone = (zone) => {
        setExpandedZoneId(zone.id);
        if (onFlyToBorder) {
            onFlyToBorder(zone.coordinates, zone.id);
        }
    };

    return (
        <div className="bottom-card" style={{ padding: '12px 14px', background: 'rgba(12, 16, 26, 0.85)', backdropFilter: 'blur(20px)' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '8px', marginBottom: '10px',
                borderBottom: '1px solid var(--line-2)',
                borderLeft: '3px solid #ef4444',
                paddingLeft: '8px'
            }}>
                <div>
                    <div style={{
                        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.2px',
                        textTransform: 'uppercase', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <ShieldAlert size={14} style={{ color: '#ef4444' }} />
                        Thailand Border Conflict Monitor
                    </div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--ink-3)', marginTop: '2px' }}>
                        Geopolitical Risk &amp; Early Warning System · 3 Strategic Frontiers
                    </div>
                </div>
                <span style={{
                    fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.8px',
                    color: '#22c55e', padding: '2px 8px',
                    background: 'rgba(34, 197, 94, 0.12)',
                    borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                    3 ZONES MONITORED
                </span>
            </div>

            {/* Zone Selector Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {THAILAND_BORDER_ZONES.map((zone) => {
                    const isSelected = expandedZoneId === zone.id;
                    return (
                        <div
                            key={zone.id}
                            style={{
                                borderRadius: '6px',
                                border: `1px solid ${isSelected ? zone.color : 'var(--line)'}`,
                                background: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.2)',
                                padding: '8px 10px',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleSelectZone(zone)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: zone.color, boxShadow: `0 0 8px ${zone.color}`
                                    }} />
                                    <div>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--ink)' }}>
                                            {zone.shortName}
                                        </div>
                                        <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)' }}>
                                            {zone.region}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '0.48rem', fontWeight: 700, color: zone.color,
                                        padding: '2px 6px', borderRadius: '3px',
                                        background: `${zone.color}15`, border: `1px solid ${zone.color}35`
                                    }}>
                                        {zone.riskLevel} ({zone.riskScore})
                                    </span>
                                    <button
                                        type="button"
                                        style={{
                                            background: isSelected ? zone.color : 'var(--line-2)',
                                            color: isSelected ? '#000' : 'var(--ink-2)',
                                            border: 'none', borderRadius: '4px',
                                            padding: '4px 8px', fontSize: '0.5rem', fontWeight: 600,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectZone(zone);
                                        }}
                                    >
                                        <Navigation size={10} /> Zoom
                                    </button>
                                </div>
                            </div>

                            {isSelected && (
                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--line-2)' }}>
                                    <div style={{ fontSize: '0.54rem', color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: '6px' }}>
                                        {zone.summary}
                                    </div>

                                    <div style={{ fontSize: '0.48rem', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Key Border Checkpoints &amp; Outposts:
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                        {zone.checkpoints.map((cp, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    fontSize: '0.48rem', padding: '3px 6px',
                                                    background: 'rgba(255,255,255,0.02)', borderRadius: '3px',
                                                    border: '1px solid var(--line)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'space-between'
                                                }}
                                            >
                                                <span style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                                                    {cp.name}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.44rem', fontWeight: 700,
                                                    color: cp.status === 'ALERT' ? '#ef4444' : cp.status === 'MONITORED' ? '#f59e0b' : '#22c55e'
                                                }}>
                                                    {cp.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ThailandBorderConflictTracker;
