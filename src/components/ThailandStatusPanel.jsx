import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import thData from '../data/thailandDigital.json';

const STATUS_COLORS = {
    enforced: 'var(--green)',
    active: 'var(--green)',
    operational: 'var(--green)',
    voluntary: 'var(--ink-2)',
    piloting: 'var(--ink-2)',
    construction: 'var(--ink-2)',
    draft: 'var(--ink-3)',
    stalled: 'var(--red)',
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
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid var(--line-2)', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={12} style={{ color: 'var(--ink-2)' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        Thailand Status
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    depa · NESDC · PATSOUTH
                </span>
            </div>

            {/* Digital economy KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {[
                    { label: 'Smart Cities', value: depaSmartCities.operational, suffix: `/${depaSmartCities.totalCities}`, color: 'var(--ink-2)' },
                    { label: 'DE GDP %', value: `${digitalEconomy.gdpContributionPct}%`, color: 'var(--ink-2)' },
                    { label: 'EEC Progress', value: `${eecPct}%`, color: 'var(--ink-2)' },
                ].map(k => (
                    <div key={k.label} style={{
                        textAlign: 'center', padding: '4px',
                        background: '#f2f0ea', borderRadius: 0
                    }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>
                            {k.value}{k.suffix && <span style={{ fontSize: '0.48rem', opacity: 0.6 }}>{k.suffix}</span>}
                        </div>
                        <div style={{ fontSize: '0.34rem', color: 'var(--ink-3)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* EEC progress bar */}
            <div style={{
                padding: '5px 8px', marginBottom: '6px',
                background: 'var(--panel)', borderRadius: 0,
                border: '1px solid var(--line)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.38rem', color: 'var(--ink-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Eastern Economic Corridor — Investment Target
                    </span>
                    <span style={{ fontSize: '0.48rem', fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                        ${eecZone.actualInvestment_usd_bn}B / ${eecZone.totalInvestmentTarget_usd_bn}B
                    </span>
                </div>
                <div style={{ height: '4px', background: '#f2f0ea', borderRadius: 0, overflow: 'hidden' }}>
                    <div style={{
                        width: `${eecPct}%`, height: '100%', borderRadius: 0,
                        background: 'var(--ink-2)'
                    }} />
                </div>
            </div>

            {/* depa Smart City domains */}
            <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
                depa Smart City Domains ({depaSmartCities.operational} cities active)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
                {depaSmartCities.domains.map((d) => (
                    <div key={d.name} style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: '2px 5px', borderRadius: 0,
                        background: '#f2f0ea', border: '1px solid var(--line)'
                    }}>
                        <span style={{ fontSize: '0.34rem', color: 'var(--ink-2)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{d.cities}</span>
                        <span style={{ fontSize: '0.32rem', color: 'var(--ink-2)' }}>{d.name.replace('Smart ', '')}</span>
                    </div>
                ))}
            </div>

            {/* Macro indicators */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '5px' }}>
                {macroIndicators.slice(0, 4).map((ind, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px 0' }}>
                        <span style={{ fontSize: '0.42rem', color: 'var(--ink-2)', flex: 1 }}>{ind.label}</span>
                        <span style={{ fontSize: '0.46rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{ind.value}</span>
                        <span style={{
                            fontSize: '0.38rem', fontWeight: 700,
                            color: ind.isPositive ? 'var(--green)' : 'var(--red)',
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
                background: 'var(--panel)', borderRadius: 0,
                border: '1px solid var(--line)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <AlertTriangle size={10} style={{ color: 'var(--red)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.44rem', fontWeight: 700, color: 'var(--red)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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
                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{k.value}</div>
                            <div style={{ fontSize: '0.3rem', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{k.label}</div>
                        </div>
                    ))}
                </div>
                <div style={{ fontSize: '0.34rem', color: 'var(--ink-3)', marginTop: '3px', lineHeight: 1.4 }}>
                    {southernBorder.peaceDialogueStatus}
                </div>
            </div>

            {/* Myanmar border */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-2)' }}>Myanmar refugees in TH</span>
                <span style={{ fontSize: '0.48rem', fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {myanmar.refugeesInThailand.toLocaleString()}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-2)' }}>TH–MM trade impact</span>
                <span style={{ fontSize: '0.48rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                    {myanmar.tradeDropPct}% YoY
                </span>
            </div>

            {/* Digital Acts toggle */}
            <button
                onClick={() => setShowActs(!showActs)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', width: '100%', marginTop: '2px',
                    padding: '3px', background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 0, color: 'var(--ink-2)',
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
                                background: STATUS_COLORS[act.status] || 'var(--ink-3)', flexShrink: 0
                            }} />
                            <span style={{ fontSize: '0.38rem', color: 'var(--ink-2)', flex: 1 }}>{act.name}</span>
                            <span style={{ fontSize: '0.34rem', color: 'var(--ink-3)' }}>{act.agency}</span>
                            <span style={{
                                fontSize: '0.32rem', fontWeight: 700,
                                color: STATUS_COLORS[act.status] || 'var(--ink-3)',
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
