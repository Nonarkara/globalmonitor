import React from 'react';
import { Eye, EyeOff, Globe2 } from 'lucide-react';

const formatYearPair = (years) => {
    if (!years?.a || !years?.b) return 'Annual comparison';
    return `${years.a} → ${years.b}`;
};

const formatL2 = (value) => {
    if (value == null || Number.isNaN(value)) return '—';
    return value.toFixed(3);
};

const AlphaEarthPanel = ({
    layer,
    showOverlay,
    onToggleOverlay,
    onFlyTo,
}) => {
    if (!layer?.sidecar) return null;

    const { stats, bounds, years, dataset } = layer.sidecar;
    const canOverlay = Boolean(layer.imageUrl && bounds);

    const handleFly = () => {
        if (!bounds || !onFlyTo) return;
        const centerLng = (bounds.west + bounds.east) / 2;
        const centerLat = (bounds.south + bounds.north) / 2;
        onFlyTo({
            longitude: centerLng,
            latitude: centerLat,
            zoom: 10,
            transitionDuration: 1200,
        });
    };

    return (
        <div className="eo-preview-card alphaearth-card">
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe2 size={14} /> ALPHAEARTH CHANGE
                </span>
                <span className="live-pill live-pill-public">STATIC</span>
            </div>

            <div className="panel-content eo-preview-content">
                <div className="eo-preview-toolbar">
                    <div className="eo-chip-row" style={{ flex: 1 }}>
                        <span className="eo-chip">{layer.label}</span>
                        <span className="eo-chip">{formatYearPair(years)}</span>
                    </div>
                    <button
                        type="button"
                        className={`eo-overlay-toggle ${showOverlay && canOverlay ? 'active' : ''}`}
                        onClick={onToggleOverlay}
                        disabled={!canOverlay}
                        aria-label={showOverlay && canOverlay ? 'Turn change overlay off' : 'Turn change overlay on'}
                        aria-pressed={showOverlay && canOverlay}
                    >
                        {showOverlay && canOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                        {showOverlay && canOverlay ? 'Overlay On' : 'Overlay Off'}
                    </button>
                </div>

                <div className="eo-preview-frame">
                    <img
                        src={layer.imageUrl}
                        alt={`${layer.label} embedding change ${formatYearPair(years)}`}
                        className="eo-preview-image"
                    />
                </div>

                <div className="eo-chip-row">
                    <span className="eo-chip">median L2 {formatL2(stats?.median_l2)}</span>
                    <span className="eo-chip">max L2 {formatL2(stats?.max_l2)}</span>
                    {stats?.pixel_count != null && (
                        <span className="eo-chip">{stats.pixel_count.toLocaleString()} px</span>
                    )}
                </div>

                <div className="eo-insight-card">
                    <span className="eo-insight-kicker">What You Learn</span>
                    <p>
                        Annual satellite embedding distance between {years?.a} and {years?.b}.
                        Brighter pixels mark stronger year-over-year change in the AlphaEarth representation —
                        structural damage, land-cover shift, or urban transformation. Not a live strike feed.
                    </p>
                </div>

                <div className="eo-preview-caption">
                    <strong>{formatYearPair(years)} · {layer.label}</strong>
                    <span>
                        {' '}
                        Source: Google DeepMind AlphaEarth Foundations ({dataset}).
                        Pre-computed offline; overlay is illustrative, not real-time.
                    </span>
                </div>

                {canOverlay && onFlyTo && (
                    <button
                        type="button"
                        className="eo-overlay-toggle alphaearth-fly-btn"
                        onClick={handleFly}
                        aria-label={`Fly map to ${layer.label}`}
                    >
                        Fly to AOI
                    </button>
                )}
            </div>
        </div>
    );
};

export default AlphaEarthPanel;
