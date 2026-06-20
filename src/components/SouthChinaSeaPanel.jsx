import React, { useState } from 'react';
import { Anchor, ChevronDown, ChevronUp, AlertTriangle, Shield } from 'lucide-react';
import scsData from '../data/southChinaSeaData.json';

const STATUS_COLORS = {
    active: '#22c55e',
    surge: '#3b82f6',
    expanding: '#6366f1',
    negotiating: '#f59e0b',
    operational: '#22c55e',
    upgrading: '#f59e0b',
    reinforcing: '#f97316',
};

const SubFront = ({ label, value, color, note }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
        <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: color, boxShadow: `0 0 5px ${color}60`, flexShrink: 0
        }} />
        <span style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.7)', flex: 1 }}>{label}</span>
        {note && <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.35)' }}>{note}</span>}
        <span style={{ fontSize: '0.42rem', fontWeight: 700, color, letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
            {value}
        </span>
    </div>
);

const SouthChinaSeaPanel = () => {
    const [showFlows, setShowFlows] = useState(false);
    const { scsStatus, taiwanStrait, scsIncidents, militarization, defenseSystems, armsFlows } = scsData;

    const kpis = [
        { label: 'PLAAF Crossings / wk', value: taiwanStrait.weeklyPLAAFCrossings, color: '#ef4444' },
        { label: 'SCS Incidents / wk', value: scsIncidents.weeklyTotal, color: '#f97316' },
        { label: 'CCG Vessels', value: scsIncidents.chinaCCGVessels, color: '#f59e0b' },
    ];

    return (
        <div className="bottom-card flex-column" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `2px solid ${scsStatus.overallColor}`, paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Anchor size={12} style={{ color: scsStatus.overallColor }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                        Indo-Pacific Theater
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '0.38rem', fontWeight: 700, letterSpacing: '1px',
                        color: scsStatus.overallColor, textTransform: 'uppercase',
                        padding: '1px 5px', background: `${scsStatus.overallColor}20`, borderRadius: '3px',
                        border: `1px solid ${scsStatus.overallColor}40`
                    }}>
                        {scsStatus.overallLevel}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
                        AMTI · INDOPACOM
                    </span>
                </div>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {kpis.map(k => (
                    <div key={k.label} style={{
                        textAlign: 'center', padding: '4px',
                        background: 'rgba(255,255,255,0.04)', borderRadius: '4px'
                    }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>{k.value}</div>
                        <div style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3px', textTransform: 'uppercase', lineHeight: 1.3 }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Taiwan Strait bar */}
            <div style={{
                padding: '5px 8px', marginBottom: '6px',
                background: 'rgba(239,68,68,0.06)', borderRadius: '4px',
                border: '1px solid rgba(239,68,68,0.12)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Taiwan Strait — PLAAF Median Line Crossings (30d)
                    </span>
                    <span style={{ fontSize: '0.52rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                        {taiwanStrait.monthlyMedianLine}
                    </span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${Math.min(100, (taiwanStrait.monthlyMedianLine / 40) * 100)}%`,
                        height: '100%', borderRadius: '2px',
                        background: 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    }} />
                </div>
            </div>

            {/* SCS Hotspots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '5px' }}>
                <SubFront label={scsIncidents.primaryHotspot} value="CRITICAL" color="#ef4444" note="Water cannon + ramming" />
                <SubFront label={scsIncidents.secondaryHotspot} value="HIGH" color="#f59e0b" note="China access denied" />
                <SubFront label="Taiwan Strait air corridor" value={`${taiwanStrait.carrierGroupsNearby} USN CSGs`} color="#3b82f6" note="" />
            </div>

            {/* Militarized features */}
            <div style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                SCS Militarized Features
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '5px' }}>
                {militarization.slice(0, 4).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: STATUS_COLORS[f.status] || '#94a3b8', flexShrink: 0
                        }} />
                        <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.65)', flex: 1 }}>{f.feature}</span>
                        <span style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.3)' }}>{f.operator}</span>
                        <span style={{
                            fontSize: '0.34rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: STATUS_COLORS[f.status] || '#94a3b8', textTransform: 'uppercase'
                        }}>{f.status}</span>
                    </div>
                ))}
            </div>

            {/* Defense systems */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                {defenseSystems.slice(0, 3).map((sys, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <Shield size={8} style={{ color: STATUS_COLORS[sys.status] || '#94a3b8', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.65)', flex: 1 }}>{sys.name}</span>
                        <span style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.3)' }}>{sys.operator}</span>
                        <span style={{
                            fontSize: '0.34rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: STATUS_COLORS[sys.status] || '#94a3b8', textTransform: 'uppercase'
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
                    padding: '3px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '4px', color: 'rgba(255,255,255,0.4)',
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
                            <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.5)', width: '38px', flexShrink: 0 }}>{flow.from}</span>
                            <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.2)' }}>&rarr;</span>
                            <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.5)', width: '42px', flexShrink: 0 }}>{flow.to}</span>
                            <span style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.3)', flex: 1 }}>{flow.type}</span>
                            <span style={{
                                fontSize: '0.3rem', fontWeight: 700,
                                color: flow.color || '#94a3b8',
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
