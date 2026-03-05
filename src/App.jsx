import React, { useState, useCallback } from 'react';
import MapContainer from './components/MapContainer';
import Sidebar from './components/Sidebar';
import RegionSelector from './components/RegionSelector';
import EventDetailsPanel from './components/EventDetailsPanel';
import WorldClock from './components/WorldClock';
import LiveIntelligenceFeed from './components/LiveIntelligenceFeed';
import IntelligencePanel from './components/IntelligencePanel';
import RegionalNewsPanel from './components/RegionalNewsPanel';
import LiveMediaPanel from './components/LiveMediaPanel';
import MarketRadarPanel from './components/MarketRadarPanel';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { INTELLIGENCE_SOURCES, APAC_SOURCES } from './services/liveNews';
import { Settings, RefreshCw } from 'lucide-react';

function App() {
  const [activeLayers, setActiveLayers] = useState(['disasters', 'weather', 'economy', 'conflicts', 'aqi']);
  const [activeRegion, setActiveRegion] = useState('middleeast');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState('middleeast'); // 'middleeast' or 'depa'

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSources, setActiveSources] = useState(INTELLIGENCE_SOURCES.map((source) => source.id));

  const [viewState, setViewState] = useState({
    longitude: 53,
    latitude: 30,
    zoom: 4.5,
    pitch: 25,
    bearing: -8
  });

  const toggleLayer = (layerId) => {
    setActiveLayers(prev =>
      prev.includes(layerId)
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const handleRegionSelect = useCallback((regionId, targetViewState) => {
    setActiveRegion(regionId);
    setViewState(prev => ({
      ...prev,
      ...targetViewState,
      transitionDuration: 1500,
    }));
  }, []);

  const toggleSource = (sourceId) => {
    setActiveSources(prev =>
      prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
    );
  };

  const setAllSources = (enable) => {
    const list = viewMode === 'depa' ? APAC_SOURCES : INTELLIGENCE_SOURCES;
    setActiveSources(enable ? list.map((source) => source.id) : []);
  };

  const sourceSetKey = activeSources.join(',');
  const activeUrls = activeSources.map(id => INTELLIGENCE_SOURCES.find(s => s.id === id)?.url).filter(Boolean);

  return (
    <>
      <div className="app-container">
        {/* Full-screen map underneath */}
        <ErrorBoundary label="Map">
          <MapContainer
            viewState={viewState}
            onMove={setViewState}
            activeLayers={activeLayers}
            onMarkerClick={setSelectedEvent}
          />
        </ErrorBoundary>

        {/* Row 1: World Clock */}
        <ErrorBoundary inline label="World Clock">
          <WorldClock />
        </ErrorBoundary>

        {/* Row 2: Header bar */}
        <div className="header-bar grid-panel" style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {viewMode === 'depa' && <img src="/depa-logo.png" alt="depa" style={{ height: '24px' }} />}
            <span style={{ fontWeight: 700, letterSpacing: '2.5px', fontSize: '0.9rem', color: viewMode === 'depa' ? '#10b981' : '#ef4444' }}>
              {viewMode === 'depa' ? 'V3 COMMAND CENTER' : 'IRAN CONFLICT MONITOR'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                const newMode = viewMode === 'middleeast' ? 'depa' : 'middleeast';
                setViewMode(newMode);
                setActiveRegion(newMode === 'middleeast' ? 'middleeast' : 'asean');
                setViewState(newMode === 'middleeast'
                  ? { longitude: 53, latitude: 30, zoom: 4.5, pitch: 25, bearing: -8 }
                  : { longitude: 105, latitude: 10, zoom: 4, pitch: 0, bearing: 0 }
                );
                setActiveSources(newMode === 'middleeast' ? INTELLIGENCE_SOURCES.map(s => s.id) : APAC_SOURCES.map(s => s.id));
              }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '5px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                marginRight: '10px'
              }}
            >
              <RefreshCw size={13} /> Switch to {viewMode === 'middleeast' ? 'DEPA Monitor' : 'Middle East Tracker'}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-muted)',
                padding: '5px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontFamily: 'inherit',
                transition: 'all 0.2s'
              }}
            >
              <Settings size={13} /> Sources
            </button>
          </div>
        </div>

        {/* Row 3: Left sidebar */}
        <div className="left-sidebar">
          <ErrorBoundary inline label="Sidebar">
            <Sidebar activeLayers={activeLayers} toggleLayer={toggleLayer} />
          </ErrorBoundary>
        </div>

        {/* Row 3: Live media (tiny corner) */}
        <div className="live-media-dock">
          <ErrorBoundary inline label="Live Media">
            <LiveMediaPanel />
          </ErrorBoundary>
        </div>

        {/* Row 3: Right sidebar */}
        <div className="right-sidebar">
          {selectedEvent && (
            <EventDetailsPanel
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
          {viewMode === 'middleeast' ? (
            <>
              <ErrorBoundary inline label="Iran Strikes">
                <IntelligencePanel key={`iranStrikes:${sourceSetKey}`} briefingId="iranStrikes" activeSourceIds={activeSources} />
              </ErrorBoundary>
              <ErrorBoundary inline label="Gulf Security">
                <IntelligencePanel key={`gulfSecurity:${sourceSetKey}`} briefingId="gulfSecurity" activeSourceIds={activeSources} />
              </ErrorBoundary>
            </>
          ) : (
            <>
              <RegionalNewsPanel regionName="Thailand" title="Thailand Tech Ecosystem" activeUrls={activeUrls} />
              <RegionalNewsPanel regionName="DEPA" title="depa & MDES Directives" activeUrls={activeUrls} />
            </>
          )}
        </div>

        {/* Row 4: Bottom bar */}
        <div className="bottom-bar">
          <ErrorBoundary inline label="Market Radar">
            <MarketRadarPanel />
          </ErrorBoundary>
          {viewMode === 'middleeast' ? (
            <>
              <ErrorBoundary inline label="Diplomacy & Sanctions">
                <IntelligencePanel key={`iranDiplomacy:${sourceSetKey}`} briefingId="iranDiplomacy" activeSourceIds={activeSources} />
              </ErrorBoundary>
              <ErrorBoundary inline label="Proxy Theater">
                <IntelligencePanel key={`proxyTheater:${sourceSetKey}`} briefingId="proxyTheater" activeSourceIds={activeSources} />
              </ErrorBoundary>
            </>
          ) : (
            <>
              <RegionalNewsPanel regionName="SEA" title="Global Technology News" activeUrls={activeUrls} />
              <RegionalNewsPanel regionName="Global" title="Global Macro & Policy" activeUrls={activeUrls} />
            </>
          )}
        </div>

        {/* Row 5: Live news ticker */}
        <ErrorBoundary inline label="Live Feed">
          <LiveIntelligenceFeed key={`ticker:${sourceSetKey}`} activeSourceIds={activeSources} />
        </ErrorBoundary>

        {/* Floating: Region selector */}
        <RegionSelector
          activeRegion={activeRegion}
          onSelectRegion={handleRegionSelect}
          viewMode={viewMode}
        />

        {/* Modal: Settings */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          activeSources={activeSources}
          toggleSource={toggleSource}
          setAllSources={setAllSources}
        />
      </div>
    </>
  );
}

export default App;
