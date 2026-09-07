import React from 'react';

const AGENCIES = [
    { id: 'nasa', label: 'NASA', flag: '🇺🇸', status: 'integrated', source: 'GIBS / FIRMS / EONET' },
    { id: 'esa', label: 'ESA', flag: '🇪🇺', status: 'integrated', source: 'Sentinel-2 / Copernicus' },
    { id: 'jaxa', label: 'JAXA', flag: '🇯🇵', status: 'integrated', source: 'Himawari / ALOS' },
    { id: 'isro', label: 'ISRO', flag: '🇮🇳', status: 'catalog', source: 'Bhuvan WMS' },
    { id: 'roscosmos', label: 'Roscosmos', flag: '🇷🇺', status: 'catalog', source: 'Meteor-M / Elektro-L' },
    { id: 'noaa', label: 'NOAA', flag: '🇺🇸', status: 'integrated', source: 'VIIRS / IMERG' },
    { id: 'eox', label: 'EOX', flag: '🇦🇹', status: 'integrated', source: 'S2 Cloudless Mosaic' },
    { id: 'jrc', label: 'JRC', flag: '🇪🇺', status: 'integrated', source: 'Surface Water' },
];

// No health check backs these entries — "integrated" means wired into the app, not verified up.
// Never green for an unchecked source.
const statusColor = (s) => {
    if (s === 'integrated') return 'var(--ink-3)';
    if (s === 'catalog') return 'rgba(59, 130, 246, 0.6)';
    return 'var(--ink-3)';
};

const SourceStack = () => (
    <div className="source-stack">
        <div className="source-stack-grid">
            {AGENCIES.map((a) => (
                <div key={a.id} className="source-stack-item">
                    <span className="source-stack-dot" style={{ background: statusColor(a.status) }} />
                    <span className="source-stack-flag">{a.flag}</span>
                    <div className="source-stack-info">
                        <span className="source-stack-label">{a.label}</span>
                        <span className="source-stack-detail">{a.source}</span>
                    </div>
                </div>
            ))}
        </div>
        <div className="source-stack-legend">
            <span><span className="source-stack-dot" style={{ background: 'var(--ink-3)', position: 'relative', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 4 }} />Integrated</span>
            <span><span className="source-stack-dot" style={{ background: 'rgba(59, 130, 246, 0.6)', position: 'relative', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 4 }} />Catalog</span>
        </div>
    </div>
);

export default SourceStack;
