import React, { useState, useEffect } from 'react';
import { Crosshair, Skull, Zap, Users } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:4000' : '';

const KPI = ({ icon: Icon, label, value, color, sub }) => (
    <div style={{
        padding: '6px 8px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center'
    }}>
        <Icon size={10} style={{ color, marginBottom: '2px' }} />
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
        <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>{sub}</div>}
    </div>
);

const MiniBar = ({ items, maxVal }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map(({ label, count, color }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.4)', width: '55px', textAlign: 'right', flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${Math.max((count / maxVal) * 100, 3)}%`,
                        height: '100%', borderRadius: '3px',
                        background: color
                    }} />
                </div>
                <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', width: '14px' }}>{count}</span>
            </div>
        ))}
    </div>
);

const AcledAnalytics = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/acled`)
            .then(r => r.json())
            .then(setData)
            .catch(() => {});
    }, []);

    if (!data?.features?.length) return null;

    const events = data.features.map(f => f.properties);
    const totalEvents = events.length;
    const totalFatalities = events.reduce((s, e) => s + (e.fatalities || 0), 0);

    // By event type
    const byType = {};
    events.forEach(e => { byType[e.eventType] = (byType[e.eventType] || 0) + 1; });
    const typeItems = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({
            label: label.replace('Explosions/Remote violence', 'Explosions').replace('Violence against civilians', 'Vs Civilians'),
            count,
            color: label.includes('Explosion') ? '#f97316' : label.includes('Battle') ? '#ef4444' : label.includes('Violence') ? '#dc2626' : '#3b82f6'
        }));

    // By country
    const byCountry = {};
    events.forEach(e => { byCountry[e.country] = (byCountry[e.country] || 0) + 1; });
    const countryItems = Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count, color: '#38bdf8' }));

    // Unique actors
    const actors = new Set(events.map(e => e.actor1));

    const maxType = Math.max(...typeItems.map(t => t.count));
    const maxCountry = Math.max(...countryItems.map(c => c.count));

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid #f97316', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Crosshair size={12} style={{ color: '#f97316' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                        Conflict Analytics
                    </span>
                </div>
                <span style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                    ACLED · {data.source === 'acled' ? 'LIVE' : 'CURATED'}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>
                <KPI icon={Zap} label="Events" value={totalEvents} color="#f97316" sub="30 days" />
                <KPI icon={Skull} label="Fatalities" value={totalFatalities} color="#ef4444" sub="confirmed" />
                <KPI icon={Users} label="Actors" value={actors.size} color="#3b82f6" sub="unique" />
            </div>

            <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '3px' }}>By Type</div>
                <MiniBar items={typeItems} maxVal={maxType} />
            </div>

            <div>
                <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '3px' }}>By Country</div>
                <MiniBar items={countryItems} maxVal={maxCountry} />
            </div>
        </div>
    );
};

export default AcledAnalytics;
