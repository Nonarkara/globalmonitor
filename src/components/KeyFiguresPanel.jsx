import React, { useState } from 'react';
import { User, ChevronDown, ChevronUp } from 'lucide-react';
import keyFigures from '../data/keyFigures.json';

const FACTION_COLORS = {
    iran: 'var(--fill-1)',
    israel: 'var(--fill-3)',
    usa: 'var(--fill-3)',
    hezbollah: 'var(--fill-1)',
    houthis: 'var(--fill-1)',
    saudi: 'var(--fill-2)',
    international: 'var(--fill-4)'
};

const STATUS_STYLES = {
    active: { color: 'var(--green)', label: 'ACTIVE' },
    unknown: { color: 'var(--ink-2)', label: 'UNKNOWN' },
    neutralized: { color: 'var(--red)', label: 'KIA' },
    detained: { color: 'var(--red)', label: 'DETAINED' }
};

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
                borderLeft: '2px solid var(--ink)', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={12} style={{ color: 'var(--ink-2)' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Key Figures
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    {keyFigures.length} TRACKED
                </span>
            </div>

            {/* Figure cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {displayed.map(fig => {
                    const factionColor = FACTION_COLORS[fig.faction] || 'var(--ink-2)';
                    const statusStyle = STATUS_STYLES[fig.status] || STATUS_STYLES.unknown;

                    return (
                        <div key={fig.id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '4px 6px', borderRadius: 0,
                            background: 'transparent',
                            borderLeft: `2px solid var(--line)`
                        }}>
                            {/* Avatar circle */}
                            <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: 'transparent',
                                border: `1.5px solid var(--line-2)`,
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
                                background: 'transparent',
                                border: '1px solid var(--line)',
                                borderRadius: 0,
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
                        padding: '3px', background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: 0, color: 'var(--ink-3)',
                        fontSize: '0.4rem', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                >
                    {expanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    {expanded ? 'Show fewer' : `Show all ${keyFigures.length}`}
                </button>
            )}
        </div>
    );
};

export default KeyFiguresPanel;
