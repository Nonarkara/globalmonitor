import React, { useEffect, useRef } from 'react';
import { Layers, Activity, CloudRain, Flame, AlertTriangle, Wind, Zap, Building2, Plane } from 'lucide-react';
import CopernicusPreviewPanel from './CopernicusPreviewPanel';
import SourceStack from './SourceStack';
import LiveTVPanel from './LiveTVPanel';
import { EO_TILE_LAYERS } from '../services/eoTiles';

const Sidebar = ({
    activeLayers,
    toggleLayer,
    viewMode,
    copernicusMode,
    setCopernicusMode,
    copernicusRuntimeSource,
    showCopernicusOverlay,
    setShowCopernicusOverlay,
    showStrategicContext,
    setShowStrategicContext,
    copernicusResource
}) => {
    const contentRef = useRef(null);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [viewMode]);

    const layerConfigs = [
        {
            id: 'firms',
            title: 'Fire / Strikes',
            desc: 'NASA VIIRS thermal anomalies',
            icon: <Zap size={18} />
        },
        {
            id: 'conflicts',
            title: 'Conflicts',
            desc: 'Hotspots & humanitarian risk',
            icon: <Flame size={18} />
        },
        {
            id: 'disasters',
            title: 'Disasters',
            desc: 'Active events (NASA EONET)',
            icon: <AlertTriangle size={18} />
        },
        {
            id: 'economy',
            title: 'Economy',
            desc: 'GDP baselines (World Bank)',
            icon: <Activity size={18} />
        },
        {
            id: 'weather',
            title: 'Weather',
            desc: 'Conditions (Open-Meteo)',
            icon: <CloudRain size={18} />
        },
        {
            id: 'aqi',
            title: 'Air Quality',
            desc: 'PM2.5 & AQI',
            icon: <Wind size={18} />
        },
        {
            id: 'infrastructure',
            title: 'Infrastructure',
            desc: 'Energy, ports, chokepoints',
            icon: <Building2 size={18} />
        },
        {
            id: 'flights',
            title: 'Flight Tracking',
            desc: 'OpenSky live aircraft',
            icon: <Plane size={18} />
        }
    ];
    const earthObservationLayers = EO_TILE_LAYERS.filter((layer) => !['eo-true-color', 'eo-vegetation'].includes(layer.id));

    return (
        <aside className="grid-panel" style={{ flex: 1 }}>
            <div className="sidebar-header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Logo strip — white pill for visibility */}
                    <div style={{
                        background: '#ffffff',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <img src="/pmua-logo.webp" alt="PMUA" style={{ height: '22px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                        <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />
                        <img src="/Logo depa-01.png" alt="depa" style={{ height: '16px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                        <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />
                        <img src="/axiom-logo.png" alt="Axiom" style={{ height: '16px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                        <img src="/retl-logo.svg" alt="ReTL" style={{ height: '15px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.3px', color: 'var(--text-main)' }}>Global Political Dashboard</span>
                        <span style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.25)', fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                            {viewMode === 'depa' ? 'Indo-Pacific' : 'Middle East'} · GlobeWatch v8.0
                        </span>
                    </div>
                </div>
            </div>
            <div ref={contentRef} className="sidebar-content">
                <div>
                    <h3 className="section-title">Data Layers</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {layerConfigs.map((layer) => {
                            const isActive = activeLayers.includes(layer.id);
                            return (
                                <div
                                    key={layer.id}
                                    className={`layer-card ${isActive ? 'active' : ''}`}
                                    onClick={() => toggleLayer(layer.id)}
                                >
                                    <div className="layer-icon-wrapper">
                                        {layer.icon}
                                    </div>
                                    <div className="layer-info">
                                        <span className="layer-title">{layer.title}</span>
                                        <span className="layer-desc">{layer.desc}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="section-title">Sentinel Hub</h3>
                    <CopernicusPreviewPanel
                        viewMode={viewMode}
                        preset={copernicusMode}
                        onPresetChange={setCopernicusMode}
                        runtimeSource={copernicusRuntimeSource}
                        showOverlay={showCopernicusOverlay}
                        onToggleOverlay={() => setShowCopernicusOverlay((value) => !value)}
                        previewResource={copernicusResource}
                    />
                </div>

                <div>
                    <h3 className="section-title">Map Framing</h3>
                    <div
                        className={`layer-card ${showStrategicContext ? 'active' : ''}`}
                        onClick={() => setShowStrategicContext((value) => !value)}
                    >
                        <div className="layer-icon-wrapper">
                            <Layers size={20} />
                        </div>
                        <div className="layer-info">
                            <span className="layer-title">Strategic Context</span>
                            <span className="layer-desc">Optional reference corridors, zones, and city anchors</span>
                        </div>
                    </div>
                </div>

                {/* Earth Observation Satellite Layers */}
                <div>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🛰️</span> Earth Observation
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
                        Additional public overlays from NASA GIBS, JAXA, and ESA. Sentinel optical and vegetation modes are controlled above.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {earthObservationLayers.map((layer) => {
                            const isActive = activeLayers.includes(layer.id);
                            return (
                                <div
                                    key={layer.id}
                                    className={`layer-card ${isActive ? 'active' : ''}`}
                                    onClick={() => toggleLayer(layer.id)}
                                    style={{ padding: '10px 14px', gap: '10px' }}
                                >
                                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{layer.icon}</span>
                                    <div className="layer-info">
                                        <span className="layer-title" style={{ fontSize: '0.85rem' }}>{layer.name}</span>
                                        <span className="layer-desc" style={{ fontSize: '0.72rem' }}>{layer.description}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="section-title">Source Agencies</h3>
                    <SourceStack />
                </div>

                {/* Live TV moved to floating panel in App.jsx */}
                {false && (
                    <div>
                        <LiveTVPanel />
                    </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <p style={{ marginBottom: '8px', opacity: 0.8 }}>
                        Data from NASA, ESA, JAXA, World Bank, ReliefWeb, Open-Meteo, and Binance.
                    </p>
                    <p style={{ opacity: 0.9 }}>
                        <strong>Contact Dr. Non Arkara:</strong><br />
                        Email: <a href="mailto:non.ar@depa.or.th" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>non.ar@depa.or.th</a><br />
                        LinkedIn: <a href="https://www.linkedin.com/in/drnon/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>linkedin.com/in/drnon/</a>
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
