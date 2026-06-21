import React, { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, Vote } from 'lucide-react';
import responseData from '../data/internationalResponse.json';

const RESULT_STYLES = {
    adopted: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'ADOPTED' },
    vetoed: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'VETOED' },
    pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'PENDING' }
};

const InternationalResponsePanel = () => {
    const [showPositions, setShowPositions] = useState(false);

    const adopted = responseData.unscVotes.filter(v => v.result === 'adopted').length;
    const vetoed = responseData.unscVotes.filter(v => v.result === 'vetoed').length;

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid #0ea5e9', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={12} style={{ color: '#0ea5e9' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        International Response
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    UNSC + UNGA
                </span>
            </div>

            {/* UNSC KPI */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: 'var(--line)', borderRadius: '4px'
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0ea5e9', fontFamily: 'var(--font-mono)' }}>
                        {responseData.unscVotes.length}
                    </div>
                    <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>UNSC Votes</div>
                </div>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: 'var(--line)', borderRadius: '4px'
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>{adopted}</div>
                    <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Adopted</div>
                </div>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: 'var(--line)', borderRadius: '4px'
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{vetoed}</div>
                    <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Vetoed</div>
                </div>
            </div>

            {/* UNGA highlight */}
            <div style={{
                padding: '5px 8px', marginBottom: '6px', borderRadius: '4px',
                background: 'rgba(14,165,233,0.06)',
                border: '1px solid rgba(14,165,233,0.1)'
            }}>
                <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                    UN General Assembly
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
                        {responseData.generalAssembly.for}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>for /</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                        {responseData.generalAssembly.against}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>against /</span>
                    <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {responseData.generalAssembly.abstain}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>abstain</span>
                </div>
                <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', marginTop: '2px' }}>
                    {responseData.generalAssembly.resolution}
                </div>
            </div>

            {/* UNSC votes list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {responseData.unscVotes.map((vote, i) => {
                    const style = RESULT_STYLES[vote.result] || RESULT_STYLES.pending;
                    return (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '3px 0',
                            borderBottom: '1px solid var(--line)'
                        }}>
                            <span style={{
                                fontSize: '0.36rem', color: 'var(--ink-3)',
                                fontFamily: 'var(--font-mono)', width: '30px', flexShrink: 0
                            }}>
                                {vote.date.slice(5)}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '0.44rem', color: 'var(--ink-2)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {vote.resolution}
                                </div>
                                <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                                    {vote.for}Y / {vote.against}N / {vote.abstain}A
                                    {vote.vetoBy && ` · veto: ${vote.vetoBy}`}
                                </div>
                            </div>
                            <span style={{
                                fontSize: '0.32rem', fontWeight: 700,
                                color: style.color,
                                padding: '1px 4px',
                                background: style.bg,
                                borderRadius: '2px',
                                letterSpacing: '0.5px'
                            }}>
                                {style.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Coalition positions toggle */}
            <button
                onClick={() => setShowPositions(!showPositions)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', width: '100%', marginTop: '6px',
                    padding: '3px', background: 'var(--line)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px', color: 'var(--ink-3)',
                    fontSize: '0.4rem', cursor: 'pointer', fontFamily: 'inherit'
                }}
            >
                {showPositions ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                Coalition Positions ({responseData.coalitionPositions.length} nations)
            </button>

            {showPositions && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {responseData.coalitionPositions.map((p, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '3px 4px', borderRadius: '3px',
                            background: 'var(--surface-hover)'
                        }}>
                            <div style={{
                                width: '5px', height: '5px', borderRadius: '50%',
                                background: p.color, flexShrink: 0
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.44rem', color: 'var(--ink-2)', fontWeight: 600 }}>
                                    {p.actor}
                                </div>
                                <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)' }}>
                                    {p.position}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InternationalResponsePanel;
