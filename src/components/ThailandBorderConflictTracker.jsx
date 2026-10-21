import React, { useState } from 'react';
import { ShieldAlert, Navigation } from 'lucide-react';
import { THAILAND_BORDER_ZONES, THAILAND_BORDER_PROVENANCE } from '../data/thailandBorders.js';

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
        <div className="bottom-card border-reference-panel" data-tier="reference" style={{ padding: '12px 14px', background: 'var(--panel)', color: 'var(--ink)', backdropFilter: 'none' }}>
            <div className="panel-header" style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '8px', marginBottom: '10px',
                borderBottom: '1px solid var(--line-2)',
                borderLeft: '3px solid #a72144',
                paddingLeft: '8px'
            }}>
                <div>
                    <div style={{
                        fontSize: 'var(--type-body)', fontWeight: 700, letterSpacing: '0.02em',
                        textTransform: 'uppercase', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <ShieldAlert size={14} style={{ color: '#a72144' }} />
                        Thailand Border Conflict Monitor
                    </div>
                    <div style={{ fontSize: 'var(--type-micro)', color: 'var(--ink-3)', marginTop: '2px' }}>
                        Geographic reference · 3 strategic frontiers
                    </div>
                </div>
                <span style={{
                    fontSize: 'var(--type-micro)', fontWeight: 700, letterSpacing: '0.8px',
                    color: 'var(--ink-2)', padding: '2px 0',
                    background: 'transparent',
                    borderRadius: '0', border: 'none'
                }}>
                    REFERENCE · UNDATED
                </span>
            </div>
            <p style={{ fontSize: 'var(--type-body)', lineHeight: 1.5, color: 'var(--ink-2)', margin: '0 0 12px' }}>
                {THAILAND_BORDER_PROVENANCE.qualification}
                {' '}Source: {THAILAND_BORDER_PROVENANCE.source}. Observation date unavailable.
            </p>

            {/* Zone Selector Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {THAILAND_BORDER_ZONES.map((zone) => {
                    const isSelected = expandedZoneId === zone.id;
                    return (
                        <div
                            key={zone.id}
                            style={{
                                borderRadius: '0',
                                border: `1px solid ${isSelected ? zone.color : 'var(--line)'}`,
                                background: 'var(--panel)',
                                padding: '8px 10px',
                                transition: 'border-color 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: zone.color, flexShrink: 0
                                    }} />
                                    <div>
                                        <div style={{ fontSize: 'var(--type-body)', fontWeight: 700, color: 'var(--ink)' }}>
                                            {zone.shortName}
                                        </div>
                                        <div style={{ fontSize: 'var(--type-micro)', color: 'var(--ink-3)' }}>
                                            {zone.region}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: 'var(--type-micro)', fontWeight: 700, color: 'var(--ink-2)',
                                        padding: '2px 6px', borderRadius: '0',
                                        background: 'transparent', border: '1px solid var(--line)'
                                    }}>
                                        Unverified: {zone.riskLevel} ({zone.riskScore})
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={`Zoom to ${zone.name}`}
                                        aria-expanded={isSelected}
                                        style={{
                                            background: 'var(--panel)',
                                            color: 'var(--ink)',
                                            border: '1px solid var(--line-2)', borderRadius: '0', minHeight: '44px', minWidth: '68px',
                                            padding: '4px 8px', fontSize: 'var(--type-micro)', fontWeight: 600,
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
                                    <div style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: '6px' }}>
                                        Undated reference: {zone.summary}
                                    </div>

                                    <div style={{ fontSize: 'var(--type-micro)', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Checkpoints · statuses below are unverified references:
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '4px' }}>
                                        {zone.checkpoints.map((cp, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    fontSize: 'var(--type-micro)', padding: '3px 6px',
                                                    background: 'var(--panel)', borderRadius: '0',
                                                    border: '1px solid var(--line)', display: 'flex',
                                                    flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center', justifyContent: 'space-between'
                                                }}
                                            >
                                                <span style={{ color: 'var(--ink-2)', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
                                                    {cp.name}
                                                </span>
                                                <span style={{
                                                    fontSize: 'var(--type-micro)', fontWeight: 700,
                                                    color: 'var(--ink-2)'
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
