import React from 'react';
import { Plane, ExternalLink } from 'lucide-react';
import { useFlightCount } from '../hooks/useFlightCount';

const FlightRadarEmbed = ({ flightsActive, onToggleFlights }) => {
    const flightCount = useFlightCount();

    return (
    <div className="bottom-card" style={{ padding: '6px 8px', flexShrink: 0 }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            marginBottom: '4px', paddingBottom: '3px',
            borderBottom: '1px solid var(--line)'
        }}>
            <Plane size={10} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
                Live Airspace
            </span>
            <span style={{
                fontSize: '0.4rem', fontWeight: 700, letterSpacing: '0.5px',
                color: flightsActive ? 'var(--accent-green)' : 'var(--ink-3)',
                padding: '1px 5px', borderRadius: '3px',
                background: flightsActive ? 'rgba(34,197,94,0.1)' : 'var(--line)',
                marginLeft: 'auto'
            }}>
                {flightsActive ? 'MAP ON' : 'MAP OFF'}
            </span>
        </div>

        <button
            type="button"
            onClick={onToggleFlights}
            aria-pressed={flightsActive}
            aria-label={flightsActive ? 'Hide ADS-B flight tracking on map' : 'Show ADS-B flight tracking on map'}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '6px', width: '100%', height: '80px',
                borderRadius: '6px',
                background: flightsActive ? 'rgba(56,189,248,0.08)' : 'var(--line)',
                border: `1px solid ${flightsActive ? 'rgba(56,189,248,0.22)' : 'var(--line)'}`,
                transition: 'background 0.2s, border-color 0.2s',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
                padding: 0
            }}
        >
            <Plane size={18} style={{ color: 'var(--accent-cyan)', opacity: flightsActive ? 0.95 : 0.4 }} />
            <span style={{ fontSize: 'var(--type-xs)', color: flightsActive ? 'var(--ink)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                ADS-B Exchange · airplanes.live
            </span>
            <span style={{ fontSize: '0.5rem', color: flightsActive ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                {flightsActive && flightCount > 0
                    ? `${flightCount.toLocaleString()} aircraft on map · 15 min snapshot`
                    : 'Tap to show live aircraft on map'}
            </span>
        </button>

        <a
            href="https://globe.adsbexchange.com/?lat=29.0&lon=47.0&zoom=4.5&mil=true"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open ADS-B Exchange globe in new tab"
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                marginTop: '6px', fontSize: '0.48rem', color: 'var(--ink-3)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', textDecoration: 'none'
            }}
        >
            Civ-Mil Radar · full screen <ExternalLink size={8} />
        </a>
    </div>
    );
};

export default FlightRadarEmbed;
