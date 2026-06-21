import React from 'react';
import { X, Calendar, MapPin, ShieldAlert } from 'lucide-react';

const EventDetailsPanel = ({ event, onClose }) => {
    if (!event) return null;

    const { properties } = event;

    // Format dates nicely if available
    const formattedDate = properties.date
        ? new Date(properties.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Ongoing / Real-time';

    // Determine Category CSS
    let catClass = 'cat-economy';
    let catLabel = 'Insight';

    if (properties.type === 'disaster') {
        catClass = 'cat-disaster';
        catLabel = properties.category || 'Natural Disaster';
    } else if (properties.type === 'conflict') {
        catClass = 'cat-conflict';
        catLabel = properties.types || 'Humanitarian Crisis';
    } else if (properties.type === 'weather') {
        catClass = 'cat-weather';
        catLabel = 'Weather Alert';
    } else if (properties.type === 'aqi') {
        catClass = 'cat-aqi';
        catLabel = 'Air Quality';
    }

    return (
        <div className="grid-panel" style={{ padding: '24px', position: 'relative' }}>
            <button className="details-close-btn" onClick={onClose} aria-label="Close details" style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--line-2)', border: 'none', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>
                <X size={18} />
            </button>

            <div>
                <span className={`details-category ${catClass}`}>
                    {catLabel}
                </span>
            </div>

            <h2 className="details-title">{properties.title || properties.city || properties.country}</h2>

            <div className="details-meta">
                {properties.country && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {properties.country}
                    </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {formattedDate}
                </span>
            </div>

            <div className="details-desc">
                {/* Render dynamic attributes based on the exact event payload */}
                {properties.type === 'economy' && (
                    <p>
                        <strong>GDP Growth:</strong> {properties.growth.toFixed(2)}%<br />
                        <strong>Latest Year:</strong> {properties.year || 'Most recent available'}<br /><br />
                        A macro baseline for fiscal resilience, demand, and investment capacity.
                    </p>
                )}
                {properties.type === 'weather' && (
                    <p>
                        <strong>Current Temp:</strong> {properties.temp}°C<br />
                        Live weather metrics tracking for urban density centers. High temperatures can correlate to increased infrastructure power draw.
                    </p>
                )}
                {properties.type === 'aqi' && (
                    <p>
                        <strong>PM2.5 Level:</strong> {properties.pm25} µg/m³<br />
                        <strong>US AQI:</strong> {properties.aqi} ({properties.category})<br /><br />
                        Live environmental scanning over Southeast Asian metro hubs. Air quality metrics are a critical proxy for industrial output and civic health.
                    </p>
                )}
                {(properties.type === 'disaster' || properties.type === 'conflict') && (
                    <p>
                        This is an active geo-tagged event being tracked for operational awareness.<br /><br />
                        {properties.severity && (
                            <>
                                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <ShieldAlert size={14} /> Severity:
                                </strong> {properties.severity}<br />
                            </>
                        )}
                        {properties.status && (
                            <>
                                <strong>Status:</strong> {properties.status}<br />
                            </>
                        )}
                        {properties.operationalFocus && (
                            <>
                                <strong>Operational Focus:</strong> {properties.operationalFocus}
                            </>
                        )}
                    </p>
                )}
            </div>

        </div>
    );
};

export default EventDetailsPanel;
