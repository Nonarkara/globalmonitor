import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import thData from '../data/thailandDigital.json';

const STATUS_COLORS = {
    enforced: '#22c55e',
    active: '#22c55e',
    operational: '#22c55e',
    voluntary: '#3b82f6',
    piloting: '#f59e0b',
    construction: '#f97316',
    draft: '#94a3b8',
    stalled: '#ef4444',
};

const ThailandStatusPanel = () => {
    const [showActs, setShowActs] = useState(false);
    const { digitalEconomy, depaSmartCities, southernBorder, myanmar, macroIndicators, eecZone, digitalActs } = thData;

    const eecPct = Math.round(eecZone.pctAchieved);

    return (
        <div className="bottom-card flex-column" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid #14b8a6', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={12} style={{ color: '#14b8a6' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                        Thailand Status
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                    depa · NESDC · PATSOUTH
                </span>
            </div>

            {/* Digital economy KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {[
                    { label: 'Smart Cities', value: depaSmartCities.operational, suffix: `/${depaSmartCities.totalCities}`, color: '#14b8a6' },
                    { label: 'DE GDP %', value: `${digitalEconomy.gdpContributionPct}%`, color: '#3b82f6' },
                    { label: 'EEC Progress', value: `${eecPct}%`, color: '#6366f1' },
                ].map(k => (
                    <div key={k.label} style={{
                        textAlign: 'center', padding: '4px',
                        background: 'rgba(255,255,255,0.04)', borderRadius: '4px'
                    }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>
                            {k.value}{k.suffix && <span style={{ fontSize: '0.48rem', opacity: 0.6 }}>{k.suffix}</span>}
                        </div>
                        <div style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* EEC progress bar */}
            <div style={{
                padding: '5px 8px', marginBottom: '6px',
                background: 'rgba(99,102,241,0.06)', borderRadius: '4px',
                border: '1px solid rgba(99,102,241,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Eastern Economic Corridor — Investment Target
                    </span>
                    <span style={{ fontSize: '0.48rem', fontWeight: 700, color: '#6366f1', fontFamily: 'var(--font-mono)' }}>
                        ${eecZone.actualInvestment_usd_bn}B / ${eecZone.totalInvestmentTarget_usd_bn}B
                    </span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${eecPct}%`, height: '100%', borderRadius: '2px',
                        background: 'linear-gradient(90deg, #14b8a6, #6366f1)'
                    }} />
                </div>
            </div>

            {/* depa Smart City domains */}
            <div style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
                depa Smart City Domains ({depaSmartCities.operational} cities active)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
                {depaSmartCities.domains.map((d) => (
                    <div key={d.name} style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: '2px 5px', borderRadius: '3px',
                        background: `${d.color}15`, border: `1px solid ${d.color}30`
                    }}>
                        <span style={{ fontSize: '0.34rem', color: d.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{d.cities}</span>
                        <span style={{ fontSize: '0.32rem', color: 'rgba(255,255,255,0.5)' }}>{d.name.replace('Smart ', '')}</span>
                    </div>
                ))}
            </div>

            {/* Macro indicators */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '5px' }}>
                {macroIndicators.slice(0, 4).map((ind, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.6)', flex: 1 }}>{ind.label}</span>
                        <span style={{ fontSize: '0.46rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-mono)' }}>{ind.value}</span>
                        <span style={{
                            fontSize: '0.38rem', fontWeight: 700,
                            color: ind.isPositive ? '#22c55e' : '#ef4444',
                            display: 'flex', alignItems: 'center', gap: '2px'
                        }}>
                            {ind.isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            {ind.change}
                        </span>
                    </div>
                ))}
            </div>

            {/* Southern border alert */}
            <div style={{
                padding: '5px 8px', marginBottom: '5px',
                background: 'rgba(239,68,68,0.06)', borderRadius: '4px',
                border: '1px solid rgba(239,68,68,0.15)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <AlertTriangle size={10} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.44rem', fontWeight: 700, color: '#ef4444', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Southern Border — PATSOUTH Insurgency
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                    {[
                        { label: 'Incidents / mo', value: southernBorder.incidentsThisMonth },
                        { label: 'Deaths / mo', value: southernBorder.deathsThisMonth },
                        { label: 'Injuries / mo', value: southernBorder.injuriesThisMonth },
                    ].map(k => (
                        <div key={k.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{k.value}</div>
                            <div style={{ fontSize: '0.3rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{k.label}</div>
                        </div>
                    ))}
                </div>
                <div style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.3)', marginTop: '3px', lineHeight: 1.4 }}>
                    {southernBorder.peaceDialogueStatus}
                </div>
            </div>

            {/* Myanmar border */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.5)' }}>Myanmar refugees in TH</span>
                <span style={{ fontSize: '0.48rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                    {myanmar.refugeesInThailand.toLocaleString()}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.5)' }}>TH–MM trade impact</span>
                <span style={{ fontSize: '0.48rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                    {myanmar.tradeDropPct}% YoY
                </span>
            </div>

            {/* Digital Acts toggle */}
            <button
                onClick={() => setShowActs(!showActs)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', width: '100%', marginTop: '2px',
                    padding: '3px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '4px', color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.38rem', cursor: 'pointer', fontFamily: 'inherit'
                }}
            >
                {showActs ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                Digital Governance Acts ({digitalActs.length})
            </button>

            {showActs && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {digitalActs.map((act, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 0' }}>
                            <div style={{
                                width: '5px', height: '5px', borderRadius: '50%',
                                background: STATUS_COLORS[act.status] || '#94a3b8', flexShrink: 0
                            }} />
                            <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.65)', flex: 1 }}>{act.name}</span>
                            <span style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.3)' }}>{act.agency}</span>
                            <span style={{
                                fontSize: '0.32rem', fontWeight: 700,
                                color: STATUS_COLORS[act.status] || '#94a3b8',
                                textTransform: 'uppercase', letterSpacing: '0.3px'
                            }}>{act.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThailandStatusPanel;
