import React, { useState } from 'react';
import { Anchor, ChevronDown, ChevronUp, AlertTriangle, Shield } from 'lucide-react';
import scsData from '../data/southChinaSeaData.json';

const STATUS_COLORS = {
    active: 'var(--green)',
    surge: 'var(--ink-2)',
    expanding: 'var(--ink-2)',
    negotiating: 'var(--ink-2)',
    operational: 'var(--green)',
    upgrading: 'var(--ink-2)',
    reinforcing: 'var(--ink-2)',
};

const SubFront = ({ label, value, color, note }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
        <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: color, flexShrink: 0
        }} />
        <span style={{ fontSize: '0.48rem', color: 'var(--ink-2)', flex: 1 }}>{label}</span>
        {note && <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>{note}</span>}
        <span style={{ fontSize: '0.42rem', fontWeight: 700, color, letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
            {value}
        </span>
    </div>
);

const SouthChinaSeaPanel = () => {
    const [showFlows, setShowFlows] = useState(false);
    const { scsStatus, taiwanStrait, scsIncidents, militarization, defenseSystems, armsFlows } = scsData;

    const kpis = [
        { label: 'PLAAF Crossings / wk', value: taiwanStrait.weeklyPLAAFCrossings, color: 'var(--red)' },
        { label: 'SCS Incidents / wk', value: scsIncidents.weeklyTotal, color: 'var(--ink-2)' },
        { label: 'CCG Vessels', value: scsIncidents.chinaCCGVessels, color: 'var(--ink-2)' },
    ];

    return (
        <div className="bottom-card flex-column" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: `2px solid ${scsStatus.overallColor}`, paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Anchor size={12} style={{ color: scsStatus.overallColor }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Indo-Pacific Theater
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '0.38rem', fontWeight: 700, letterSpacing: '1px',
                        color: scsStatus.overallColor, textTransform: 'uppercase',
                        padding: '1px 5px', background: '#f2f0ea', borderRadius: 0,
                        border: '1px solid var(--line)'
                    }}>
                        {scsStatus.overallLevel}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                        AMTI · INDOPACOM
                    </span>
                </div>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {kpis.map(k => (
                    <div key={k.label} style={{
                        textAlign: 'center', padding: '4px',
                        background: '#f2f0ea', borderRadius: 0
                    }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>{k.value}</div>
                        <div style={{ fontSize: '0.34rem', color: 'var(--ink-3)', letterSpacing: '0.3px', textTransform: 'uppercase', lineHeight: 1.3 }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Taiwan Strait bar */}
            <div style={{
                padding: '5px 8px', marginBottom: '6px',
                background: 'var(--panel)', borderRadius: 0,
                border: '1px solid var(--line)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Taiwan Strait — PLAAF Median Line Crossings (30d)
                    </span>
                    <span style={{ fontSize: '0.52rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                        {taiwanStrait.monthlyMedianLine}
                    </span>
                </div>
                <div style={{ height: '4px', background: '#f2f0ea', borderRadius: 0, overflow: 'hidden' }}>
                    <div style={{
                        width: `${Math.min(100, (taiwanStrait.monthlyMedianLine / 40) * 100)}%`,
                        height: '100%', borderRadius: 0,
                        background: 'var(--red)'
                    }} />
                </div>
            </div>

            {/* SCS Hotspots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '5px' }}>
                <SubFront label={scsIncidents.primaryHotspot} value="CRITICAL" color="var(--red)" note="Water cannon + ramming" />
                <SubFront label={scsIncidents.secondaryHotspot} value="HIGH" color="var(--ink-2)" note="China access denied" />
                <SubFront label="Taiwan Strait air corridor" value={`${taiwanStrait.carrierGroupsNearby} USN CSGs`} color="var(--ink-2)" note="" />
            </div>

            {/* Militarized features */}
            <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                SCS Militarized Features
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '5px' }}>
                {militarization.slice(0, 4).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: STATUS_COLORS[f.status] || 'var(--ink-3)', flexShrink: 0
                        }} />
                        <span style={{ fontSize: '0.42rem', color: 'var(--ink-2)', flex: 1 }}>{f.feature}</span>
                        <span style={{ fontSize: '0.34rem', color: 'var(--ink-3)' }}>{f.operator}</span>
                        <span style={{
                            fontSize: '0.34rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: STATUS_COLORS[f.status] || 'var(--ink-3)', textTransform: 'uppercase'
                        }}>{f.status}</span>
                    </div>
                ))}
            </div>

            {/* Defense systems */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                {defenseSystems.slice(0, 3).map((sys, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <Shield size={8} style={{ color: STATUS_COLORS[sys.status] || 'var(--ink-3)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.42rem', color: 'var(--ink-2)', flex: 1 }}>{sys.name}</span>
                        <span style={{ fontSize: '0.34rem', color: 'var(--ink-3)' }}>{sys.operator}</span>
                        <span style={{
                            fontSize: '0.34rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: STATUS_COLORS[sys.status] || 'var(--ink-3)', textTransform: 'uppercase'
                        }}>{sys.status}</span>
                    </div>
                ))}
            </div>

            {/* Arms flows toggle */}
            <button
                onClick={() => setShowFlows(!showFlows)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', width: '100%', marginTop: '2px',
                    padding: '3px', background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 0, color: 'var(--ink-2)',
                    fontSize: '0.38rem', cursor: 'pointer', fontFamily: 'inherit'
                }}
            >
                {showFlows ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                Regional Arms Flows ({armsFlows.length} routes)
            </button>

            {showFlows && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {armsFlows.map((flow, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 0' }}>
                            <span style={{ fontSize: '0.38rem', color: 'var(--ink-2)', width: '38px', flexShrink: 0 }}>{flow.from}</span>
                            <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)' }}>&rarr;</span>
                            <span style={{ fontSize: '0.38rem', color: 'var(--ink-2)', width: '42px', flexShrink: 0 }}>{flow.to}</span>
                            <span style={{ fontSize: '0.34rem', color: 'var(--ink-3)', flex: 1 }}>{flow.type}</span>
                            <span style={{
                                fontSize: '0.3rem', fontWeight: 700,
                                color: flow.color || 'var(--ink-3)',
                                letterSpacing: '0.3px', textTransform: 'uppercase'
                            }}>{flow.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SouthChinaSeaPanel;
