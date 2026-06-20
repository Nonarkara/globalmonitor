import React, { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, Vote } from 'lucide-react';
import responseData from '../data/internationalResponse.json';

const RESULT_STYLES = {
    adopted: { bg: 'transparent', color: 'var(--green)', label: 'ADOPTED' },
    vetoed: { bg: 'transparent', color: 'var(--red)', label: 'VETOED' },
    pending: { bg: 'transparent', color: 'var(--ink-2)', label: 'PENDING' }
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
                borderLeft: '2px solid var(--ink)', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={12} style={{ color: 'var(--ink-2)' }} />
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
                    background: '#f2f0ea', borderRadius: 0
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {responseData.unscVotes.length}
                    </div>
                    <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>UNSC Votes</div>
                </div>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: '#f2f0ea', borderRadius: 0
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{adopted}</div>
                    <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Adopted</div>
                </div>
                <div style={{
                    flex: 1, textAlign: 'center', padding: '4px',
                    background: '#f2f0ea', borderRadius: 0
                }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{vetoed}</div>
                    <div style={{ fontSize: '0.36rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Vetoed</div>
                </div>
            </div>

            {/* UNGA highlight */}
            <div style={{
                padding: '5px 8px', marginBottom: '6px', borderRadius: 0,
                background: 'transparent',
                border: '1px solid var(--line)'
            }}>
                <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                    UN General Assembly
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                        {responseData.generalAssembly.for}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>for /</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                        {responseData.generalAssembly.against}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>against /</span>
                    <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
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
                                borderRadius: 0,
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
                    padding: '3px', background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 0, color: 'var(--ink-3)',
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
                            padding: '3px 4px', borderRadius: 0,
                            background: 'transparent'
                        }}>
                            <div style={{
                                width: '5px', height: '5px', borderRadius: '50%',
                                background: p.color, flexShrink: 0
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.44rem', color: 'var(--ink)', fontWeight: 600 }}>
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
