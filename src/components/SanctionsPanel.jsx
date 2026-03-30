import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import sanctionsData from '../data/sanctions.json';
import { WAR_START } from '../data/warConstants';

const IMPACT_COLORS = {
    severe: '#ef4444',
    high: '#f59e0b',
    moderate: '#3b82f6'
};

const TYPE_ICONS = {
    Financial: '🏦',
    Energy: '⛽',
    Individual: '👤',
    Maritime: '🚢',
    Technology: '🔧',
    Comprehensive: '📋',
    'Arms Embargo': '🔫',
    Industrial: '🏭',
    Secondary: '🔗',
    Cyber: '💻'
};

const SanctionsPanel = () => {
    const [expanded, setExpanded] = useState(false);
    const sorted = [...sanctionsData].sort((a, b) => b.date.localeCompare(a.date));
    const displayed = expanded ? sorted : sorted.slice(0, 4);

    const severeCount = sanctionsData.filter(s => s.impact === 'severe').length;
    const totalCount = sanctionsData.length;
    const uniqueTargets = new Set(sanctionsData.map(s => s.target)).size;

    const byImposer = {};
    sanctionsData.forEach(s => { byImposer[s.imposedBy] = (byImposer[s.imposedBy] || 0) + 1; });

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid #8b5cf6', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={12} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                        Sanctions Tracker
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                    {totalCount} ACTIVE
                </span>
            </div>

            {/* KPI strip */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '4px'
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8b5cf6', fontFamily: 'var(--font-mono)' }}>{totalCount}</div>
                    <div style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total</div>
                </div>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '4px'
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{severeCount}</div>
                    <div style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Severe</div>
                </div>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '4px'
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>{uniqueTargets}</div>
                    <div style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Targets</div>
                </div>
            </div>

            {/* Imposer breakdown */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {Object.entries(byImposer).sort((a, b) => b[1] - a[1]).map(([who, count]) => (
                    <span key={who} style={{
                        fontSize: '0.4rem', fontWeight: 600,
                        padding: '2px 6px', borderRadius: '3px',
                        background: 'rgba(139,92,246,0.1)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        color: 'rgba(255,255,255,0.6)',
                        letterSpacing: '0.3px'
                    }}>
                        {who} ({count})
                    </span>
                ))}
            </div>

            {/* Sanctions list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {displayed.map((s, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '3px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                    }}>
                        <span style={{ fontSize: '0.55rem', width: '16px', textAlign: 'center' }}>
                            {TYPE_ICONS[s.type] || '📄'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '0.46rem', color: 'rgba(255,255,255,0.7)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {s.target}
                            </div>
                            <div style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.3)' }}>
                                {s.imposedBy} · {s.date}
                            </div>
                        </div>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: IMPACT_COLORS[s.impact] || '#3b82f6',
                            flexShrink: 0
                        }} />
                    </div>
                ))}
            </div>

            {sorted.length > 4 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '4px', width: '100%', marginTop: '4px',
                        padding: '3px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '4px', color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.4rem', cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.2s'
                    }}
                >
                    {expanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    {expanded ? 'Show less' : `Show all ${sorted.length}`}
                </button>
            )}
        </div>
    );
};

export default SanctionsPanel;
