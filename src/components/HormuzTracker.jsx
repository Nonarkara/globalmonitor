import React from 'react';
import { Ship, AlertTriangle, DollarSign, Anchor } from 'lucide-react';
import { getDayCount } from '../data/warConstants';

/**
 * Strait of Hormuz Crisis Tracker — curated war-time status panel.
 * Data is manually curated from verified sources (updated periodically).
 */

const warDay = getDayCount();

const HORMUZ_STATUS = {
    status: 'CLOSED',
    statusColor: 'var(--red)',
    irgcToll: '$2M per vessel',
    tankersSinceWarStart: 21,
    normalDailyTransits: '100+',
    vesselsAnchored: '150+',
    oilPremium: '$14-18/bbl',
    brentPrice: '~$112',
    lastUpdate: '2026-03-29',
    attacks: 21,
    notes: [
        'IRGC declared Hormuz shut to US/Israel-allied vessels (Mar 4)',
        'Maersk, CMA CGM, Hapag-Lloyd suspended all transits',
        'Trump granted Iran extension on deadline to reopen (Mar 26)',
        'Houthi entry into war threatens Bab el-Mandeb (Mar 28)',
        '150+ tankers anchored outside strait awaiting passage'
    ]
};

const Stat = ({ icon, label, value, color }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 8px',
        background: '#f2f0ea',
        borderRadius: 0,
        border: '1px solid var(--line)'
    }}>
        {React.createElement(icon, { size: 12, style: { color: color || 'var(--ink-3)', flexShrink: 0 } })}
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--ink-2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {label}
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: color || 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                {value}
            </div>
        </div>
    </div>
);

const HormuzTracker = () => (
    <div className="bottom-card" style={{ padding: '10px 12px' }}>
        <div className="panel-header" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: '6px', marginBottom: '8px',
            borderBottom: '1px solid var(--line)',
            borderLeft: '2px solid var(--red)',
            paddingLeft: '8px'
        }}>
            <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                    Strait of Hormuz
                </div>
                <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', marginTop: '1px' }}>
                    Day {warDay} of conflict
                </div>
            </div>
            <span style={{
                fontSize: '0.5rem', fontWeight: 700, letterSpacing: '1px',
                color: HORMUZ_STATUS.statusColor,
                padding: '2px 8px',
                background: '#f2f0ea',
                borderRadius: 0,
                border: '1px solid var(--line-2)'
            }}>
                {HORMUZ_STATUS.status}
            </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
            <Stat icon={Ship} label="Transits since Feb 28" value={HORMUZ_STATUS.tankersSinceWarStart} color="var(--red)" />
            <Stat icon={Anchor} label="Vessels anchored" value={HORMUZ_STATUS.vesselsAnchored} color="var(--ink-2)" />
            <Stat icon={DollarSign} label="IRGC toll" value={HORMUZ_STATUS.irgcToll} color="var(--ink-2)" />
            <Stat icon={AlertTriangle} label="Attacks on ships" value={HORMUZ_STATUS.attacks} color="var(--red)" />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <div style={{
                flex: 1, padding: '5px 8px', borderRadius: 0,
                background: '#f2f0ea',
                border: '1px solid var(--line)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', letterSpacing: '0.5px' }}>BRENT CRUDE</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                    {HORMUZ_STATUS.brentPrice}
                </div>
            </div>
            <div style={{
                flex: 1, padding: '5px 8px', borderRadius: 0,
                background: '#f2f0ea',
                border: '1px solid var(--line)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', letterSpacing: '0.5px' }}>WAR PREMIUM</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {HORMUZ_STATUS.oilPremium}
                </div>
            </div>
        </div>

        {/* Live Vessel Map */}
        <div style={{ borderRadius: 0, overflow: 'hidden', height: '100px', marginBottom: '6px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <iframe
                src="https://www.vesselfinder.com/aismap?lat=26.5&lon=56.3&zoom=8&width=300&height=100&names=true&mmsi=0&track=false&fleet=false&fleet_name=false&fleet_hide_old_positions=false&default_overground_speed_kts=3&default_sea_speed_kts=12"
                style={{ width: '100%', height: '100%', border: 'none', opacity: 0.8 }}
                title="Hormuz Vessel Tracker"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
            />
        </div>

        <div style={{ overflow: 'hidden', flex: 1 }}>
            {HORMUZ_STATUS.notes.slice(0, 3).map((note, i) => (
                <div key={i} style={{
                    fontSize: '0.52rem',
                    color: 'var(--ink-2)',
                    lineHeight: 1.4,
                    padding: '2px 0',
                    borderBottom: i < 2 ? '1px solid var(--line)' : 'none'
                }}>
                    {note}
                </div>
            ))}
        </div>
    </div>
);

export default HormuzTracker;
