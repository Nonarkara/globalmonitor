import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import armsData from '../data/armsDefense.json';
import scsData from '../data/southChinaSeaData.json';
import thData from '../data/thailandDigital.json';

const STATUS_COLORS = {
    active: 'var(--green)',
    degraded: 'var(--ink-2)',
    destroyed: 'var(--red)',
    surge: 'var(--ink-2)',
    covert: 'var(--ink-2)',
    restricted: 'var(--ink-2)',
    negotiating: 'var(--ink-2)',
    expanding: 'var(--ink-2)',
    operational: 'var(--green)',
};

const FlowRow = ({ flow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 0' }}>
        <span style={{ fontSize: '0.5rem', color: 'var(--ink-2)', width: '38px', flexShrink: 0 }}>{flow.from}</span>
        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)' }}>&rarr;</span>
        <span style={{ fontSize: '0.5rem', color: 'var(--ink-2)', width: '42px', flexShrink: 0 }}>{flow.to}</span>
        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)', flex: 1 }}>{flow.type}</span>
        <span style={{
            fontSize: '0.5rem', fontWeight: 700,
            color: STATUS_COLORS[flow.status] || 'var(--ink-3)',
            letterSpacing: '0.3px', textTransform: 'uppercase'
        }}>{flow.status}</span>
    </div>
);

const MiddleEastView = () => {
    const [showFlows, setShowFlows] = useState(false);
    const { arsenalUsage } = armsData;

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {[
                    { label: 'Iran Missiles', value: arsenalUsage.iraniMissilesLaunched, color: 'var(--red)' },
                    { label: 'Iran Drones', value: arsenalUsage.iraniDronesLaunched, color: 'var(--ink-2)' },
                    { label: 'Intercepted', value: arsenalUsage.interceptionsTotal, color: 'var(--ink-2)' }
                ].map(k => (
                    <div key={k.label} style={{ textAlign: 'center', padding: '4px', background: '#f2f0ea', borderRadius: 0 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>{k.value}</div>
                        <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{k.label}</div>
                    </div>
                ))}
            </div>
            <div style={{ padding: '4px 8px', marginBottom: '6px', background: 'var(--panel)', borderRadius: 0, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Overall Interception Rate</span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{arsenalUsage.interceptionRate}</span>
                </div>
                <div style={{ height: '4px', background: '#f2f0ea', borderRadius: 0, overflow: 'hidden' }}>
                    <div style={{ width: arsenalUsage.interceptionRate, height: '100%', borderRadius: 0, background: 'var(--ink-2)' }} />
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                {armsData.defenseSystems.map((sys, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 0' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[sys.status] || 'var(--ink-3)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-2)', flex: 1 }}>{sys.name}</span>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)' }}>{sys.operator}</span>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: STATUS_COLORS[sys.status] || 'var(--ink-3)' }}>{sys.interceptRate}</span>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowFlows(!showFlows)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', marginTop: '2px', padding: '3px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 0, color: 'var(--ink-2)', fontSize: '0.5rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {showFlows ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                Arms Flows ({armsData.armsFlows.length} routes)
            </button>
            {showFlows && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {armsData.armsFlows.map((flow, i) => <FlowRow key={i} flow={flow} />)}
                </div>
            )}
        </>
    );
};

const IndoPacificView = () => {
    const [showFlows, setShowFlows] = useState(false);
    const { aseanDefenseBudgets, armsFlows, defenseSystems } = scsData;

    return (
        <>
            <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                ASEAN Defense Budgets (USD bn)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px' }}>
                {aseanDefenseBudgets.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-2)', width: '52px', flexShrink: 0 }}>{d.country}</span>
                        <div style={{ flex: 1, height: '4px', background: '#f2f0ea', borderRadius: 0, overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.min(100, (d.budget_usd_bn / 14) * 100)}%`,
                                height: '100%', borderRadius: 0,
                                background: d.trend === 'up' ? 'var(--green)' : 'var(--ink-2)'
                            }} />
                        </div>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', width: '22px', textAlign: 'right' }}>
                            ${d.budget_usd_bn}B
                        </span>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)', width: '28px' }}>{d.gdp_pct} GDP</span>
                    </div>
                ))}
            </div>
            <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Key Defense Systems
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                {defenseSystems.slice(0, 4).map((sys, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <Shield size={8} style={{ color: STATUS_COLORS[sys.status] || 'var(--ink-3)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-2)', flex: 1 }}>{sys.name}</span>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)' }}>{sys.operator}</span>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: STATUS_COLORS[sys.status] || 'var(--ink-3)', textTransform: 'uppercase' }}>{sys.status}</span>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowFlows(!showFlows)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', marginTop: '2px', padding: '3px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 0, color: 'var(--ink-2)', fontSize: '0.5rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {showFlows ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                Regional Arms Flows ({armsFlows.length} routes)
            </button>
            {showFlows && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {armsFlows.map((flow, i) => <FlowRow key={i} flow={flow} />)}
                </div>
            )}
        </>
    );
};

const ThailandView = () => {
    const [showFlows, setShowFlows] = useState(false);
    const { southernBorder, myanmar } = thData;
    const myanmarFlows = scsData.armsFlows.filter(f => f.to === 'Myanmar' || f.from === 'Myanmar');
    const allFlows = myanmarFlows.length > 0 ? myanmarFlows : scsData.armsFlows.slice(0, 3);

    const thSystems = [
        { name: 'JAS-39 Gripen C/D', operator: 'RTAF', status: 'active', note: '12 airframes' },
        { name: 'T-50TH Golden Eagle', operator: 'RTAF', status: 'active', note: '14 airframes' },
        { name: 'DTAC / Centurion (Border)', operator: 'RTA', status: 'active', note: 'Deployed PATSOUTH' },
        { name: 'OPV Sukhothai Class', operator: 'RTN', status: 'active', note: 'Gulf + Andaman' },
        { name: 'VT4 MBT (Ukraine-origin)', operator: 'RTA', status: 'active', note: '48 units' },
    ];

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {[
                    { label: 'Southern Border Incidents', value: southernBorder.incidentsThisMonth, color: 'var(--red)' },
                    { label: 'Myanmar Refugees', value: `${(myanmar.refugeesInThailand / 1000).toFixed(0)}K`, color: 'var(--ink-2)' },
                    { label: 'Border Incidents', value: myanmar.borderIncidentsThisMonth, color: 'var(--ink-2)' },
                ].map(k => (
                    <div key={k.label} style={{ textAlign: 'center', padding: '4px', background: '#f2f0ea', borderRadius: 0 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>{k.value}</div>
                        <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', letterSpacing: '0.3px', textTransform: 'uppercase', lineHeight: 1.3 }}>{k.label}</div>
                    </div>
                ))}
            </div>
            <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Royal Thai Armed Forces — Key Assets
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                {thSystems.map((sys, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[sys.status] || 'var(--ink-3)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-2)', flex: 1 }}>{sys.name}</span>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)' }}>{sys.operator}</span>
                        <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>{sys.note}</span>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowFlows(!showFlows)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', marginTop: '2px', padding: '3px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 0, color: 'var(--ink-2)', fontSize: '0.5rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {showFlows ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                Myanmar Arms Flows ({allFlows.length} routes tracked)
            </button>
            {showFlows && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {allFlows.map((flow, i) => <FlowRow key={i} flow={flow} />)}
                </div>
            )}
        </>
    );
};

const THEATER_LABELS = {
    middleeast: 'MIDDLE EAST',
    indopacific: 'INDO-PACIFIC',
    thailand: 'THAILAND',
};

const THEATER_SOURCES = {
    middleeast: 'SIPRI + OSINT',
    indopacific: 'IISS + AMTI + OSINT',
    thailand: 'IISS + RTARF + OSINT',
};

const ArmsDefensePanel = ({ viewMode = 'middleeast' }) => (
    <div className="bottom-card" style={{ padding: '10px 12px' }}>
        <div className="panel-header" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: '5px', marginBottom: '6px',
            borderBottom: '1px solid var(--line)',
            borderLeft: '2px solid var(--line-2)', paddingLeft: '8px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={12} style={{ color: 'var(--ink-2)' }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                    Arms & Defense
                </span>
            </div>
            <span style={{ fontSize: '0.5rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                {THEATER_SOURCES[viewMode] || 'SIPRI + OSINT'} · {THEATER_LABELS[viewMode] || viewMode.toUpperCase()}
            </span>
        </div>
        {viewMode === 'middleeast' && <MiddleEastView />}
        {viewMode === 'indopacific' && <IndoPacificView />}
        {viewMode === 'thailand' && <ThailandView />}
    </div>
);

export default ArmsDefensePanel;
