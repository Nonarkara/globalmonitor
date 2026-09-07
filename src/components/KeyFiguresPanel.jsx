import React, { useState } from 'react';
import { User, ChevronDown, ChevronUp } from 'lucide-react';
import keyFiguresData from '../data/keyFigures.json';

const FACTION_COLORS = {
    iran: '#ef4444',
    israel: '#3b82f6',
    usa: '#3b82f6',
    hezbollah: '#ef4444',
    houthis: '#ef4444',
    saudi: '#22c55e',
    international: '#38bdf8'
};

const STATUS_STYLES = {
    active: { color: '#22c55e', label: 'ACTIVE' },
    unknown: { color: '#f59e0b', label: 'UNKNOWN' },
    neutralized: { color: '#ef4444', label: 'KIA' },
    detained: { color: '#f97316', label: 'DETAINED' }
};

// Hand-maintained profiles — stamp the header with its git date, never "now".
const { items: keyFigures } = keyFiguresData;
const AS_OF = new Date(`${keyFiguresData.asOf}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

const KeyFiguresPanel = () => {
    const [expanded, setExpanded] = useState(false);
    const displayed = expanded ? keyFigures : keyFigures.slice(0, 6);

    // Group by faction
    const factionCounts = {};
    keyFigures.forEach(f => {
        factionCounts[f.faction] = (factionCounts[f.faction] || 0) + 1;
    });

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid #06b6d4', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={12} style={{ color: '#06b6d4' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Key Figures
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    {keyFigures.length} PROFILED · AS OF {AS_OF}
                </span>
            </div>

            {/* Figure cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {displayed.map(fig => {
                    const factionColor = FACTION_COLORS[fig.faction] || '#94a3b8';
                    const statusStyle = STATUS_STYLES[fig.status] || STATUS_STYLES.unknown;

                    return (
                        <div key={fig.id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '4px 6px', borderRadius: '4px',
                            background: 'var(--surface-hover)',
                            borderLeft: `2px solid ${factionColor}20`
                        }}>
                            {/* Avatar circle */}
                            <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: `${factionColor}15`,
                                border: `1.5px solid ${factionColor}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.42rem', fontWeight: 700, color: factionColor,
                                fontFamily: 'var(--font-mono)', flexShrink: 0
                            }}>
                                {fig.name.split(' ').pop().substring(0, 2).toUpperCase()}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '0.48rem', fontWeight: 600,
                                    color: 'var(--ink)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {fig.name}
                                </div>
                                <div style={{
                                    fontSize: '0.38rem', color: 'var(--ink-3)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {fig.role}
                                </div>
                            </div>

                            <span style={{
                                fontSize: '0.34rem', fontWeight: 700,
                                color: statusStyle.color,
                                padding: '1px 4px',
                                background: `${statusStyle.color}15`,
                                borderRadius: '2px',
                                letterSpacing: '0.5px',
                                flexShrink: 0
                            }}>
                                {statusStyle.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {keyFigures.length > 6 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '4px', width: '100%', marginTop: '4px',
                        padding: '3px', background: 'var(--line)',
                        border: '1px solid var(--line)',
                        borderRadius: '4px', color: 'var(--ink-3)',
                        fontSize: '0.4rem', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                >
                    {expanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    {expanded ? 'Show fewer' : `Show all ${keyFigures.length}`}
                </button>
            )}

            {/* Source note */}
            <div style={{
                fontSize: '0.32rem', color: 'var(--ink-3)',
                marginTop: '4px', lineHeight: 1.3, fontStyle: 'italic'
            }}>
                {keyFiguresData.sources}
            </div>
        </div>
    );
};

export default KeyFiguresPanel;
