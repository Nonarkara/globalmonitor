import React from 'react';
import { Plane } from 'lucide-react';

const FlightRadarEmbed = () => (
    <div className="bottom-card" style={{ padding: '6px 8px', flexShrink: 0 }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            marginBottom: '4px', paddingBottom: '3px',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
            <Plane size={10} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
                Live Airspace
            </span>
            <span style={{
                fontSize: '0.4rem', fontWeight: 700, letterSpacing: '0.5px',
                color: '#22c55e', padding: '1px 5px', borderRadius: '3px',
                background: 'rgba(34,197,94,0.12)', marginLeft: 'auto'
            }}>LIVE</span>
        </div>
        <div style={{ borderRadius: '6px', overflow: 'hidden', height: '130px', background: '#0a0a0a' }}>
            <iframe
                src="https://globe.adsbexchange.com/?lat=29.0&lon=47.0&zoom=4.5&showTrace=false&mil=true&noFilters=true"
                style={{ width: '100%', height: '100%', border: 'none', opacity: 0.85 }}
                title="Live Airspace"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    </div>
);

export default FlightRadarEmbed;
