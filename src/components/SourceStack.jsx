import React from 'react';

const AGENCIES = [
    { id: 'nasa', label: 'NASA', flag: '🇺🇸', status: 'live', source: 'GIBS / FIRMS / EONET' },
    { id: 'esa', label: 'ESA', flag: '🇪🇺', status: 'live', source: 'Sentinel-2 / Copernicus' },
    { id: 'jaxa', label: 'JAXA', flag: '🇯🇵', status: 'live', source: 'Himawari / ALOS' },
    { id: 'isro', label: 'ISRO', flag: '🇮🇳', status: 'catalog', source: 'Bhuvan WMS' },
    { id: 'roscosmos', label: 'Roscosmos', flag: '🇷🇺', status: 'catalog', source: 'Meteor-M / Elektro-L' },
    { id: 'noaa', label: 'NOAA', flag: '🇺🇸', status: 'live', source: 'VIIRS / IMERG' },
    { id: 'eox', label: 'EOX', flag: '🇦🇹', status: 'live', source: 'S2 Cloudless Mosaic' },
    { id: 'jrc', label: 'JRC', flag: '🇪🇺', status: 'live', source: 'Surface Water' },
];

const statusColor = (s) => {
    if (s === 'live') return 'rgba(34, 197, 94, 0.8)';
    if (s === 'catalog') return 'rgba(59, 130, 246, 0.6)';
    return 'rgba(255, 255, 255, 0.2)';
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
            <span><span className="source-stack-dot" style={{ background: 'rgba(34, 197, 94, 0.8)', position: 'relative', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 4 }} />Live</span>
            <span><span className="source-stack-dot" style={{ background: 'rgba(59, 130, 246, 0.6)', position: 'relative', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 4 }} />Catalog</span>
        </div>
    </div>
);

export default SourceStack;
