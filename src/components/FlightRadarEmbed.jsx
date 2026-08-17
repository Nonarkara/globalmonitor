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
            <Plane size={10} style={{ color: 'var(--ink-2)' }} aria-hidden="true" />
            <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
                Live Airspace
            </span>
            <span style={{
                fontSize: '0.4rem', fontWeight: 700, letterSpacing: '0.5px',
                color: flightsActive ? 'var(--green)' : 'var(--ink-3)',
                padding: '1px 5px', borderRadius: 0,
                background: flightsActive ? '#f2f0ea' : 'transparent',
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
                borderRadius: 0,
                background: flightsActive ? '#f2f0ea' : 'transparent',
                border: `1px solid ${flightsActive ? 'var(--line-2)' : 'var(--line)'}`,
                transition: 'background 0.2s, border-color 0.2s',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
                padding: 0
            }}
        >
            <Plane size={18} style={{ color: 'var(--ink-2)', opacity: flightsActive ? 0.95 : 0.4 }} />
            <span style={{ fontSize: 'var(--type-xs)', color: flightsActive ? 'var(--ink)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                ADS-B · adsb.lol · airplanes.live
            </span>
            <span style={{ fontSize: '0.5rem', color: flightsActive ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                {flightsActive && flightCount > 0
                    ? `${flightCount.toLocaleString()} aircraft on map · heading vectors`
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
