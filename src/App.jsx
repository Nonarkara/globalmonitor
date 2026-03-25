import React, { useState, useCallback, useEffect } from 'react';
import MapContainer from './components/MapContainer';
import Sidebar from './components/Sidebar';
import RegionSelector from './components/RegionSelector';
import EventDetailsPanel from './components/EventDetailsPanel';
import WorldClock from './components/WorldClock';
import LiveIntelligenceFeed from './components/LiveIntelligenceFeed';
import IntelligencePanel from './components/IntelligencePanel';
import RegionalNewsPanel from './components/RegionalNewsPanel';
import MarketRadarPanel from './components/MarketRadarPanel';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { INTELLIGENCE_SOURCES, APAC_SOURCES } from './services/liveNews';
import { fetchCopernicusPreview } from './services/copernicus';
import { useLiveResource } from './hooks/useLiveResource';
import { Settings, RefreshCw, Eye } from 'lucide-react';
import { getVisitorCount, BASE_COUNT } from './services/visitorTracker';
import EscalationGauge from './components/EscalationGauge';
import StrikeStatsPanel from './components/StrikeStatsPanel';
import MultiFrontBoard from './components/MultiFrontBoard';
import IranWarPanel from './components/IranWarPanel';
import AlertBanner from './components/AlertBanner';

function App() {
  const [activeLayers, setActiveLayers] = useState(['disasters', 'weather', 'economy', 'conflicts', 'aqi', 'firms']);
  const [activeRegion, setActiveRegion] = useState('middleeast');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState('middleeast'); // 'middleeast' or 'depa'

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSources, setActiveSources] = useState(INTELLIGENCE_SOURCES.map((source) => source.id));
  const [copernicusMode, setCopernicusMode] = useState('true-color');
  const [showCopernicusOverlay, setShowCopernicusOverlay] = useState(true);
  const [showStrategicContext, setShowStrategicContext] = useState(false);

  const [visitorCount, setVisitorCount] = useState(BASE_COUNT);
  useEffect(() => { getVisitorCount().then(setVisitorCount); }, []);

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
  const copernicusFetcher = useCallback(
    () => fetchCopernicusPreview(viewMode, copernicusMode),
    [viewMode, copernicusMode]
  );
  const copernicusResource = useLiveResource(copernicusFetcher, {
    cacheKey: `copernicus:${viewMode}:${copernicusMode}`,
    intervalMs: 30 * 60 * 1000,
    isUsable: (payload) => Boolean(payload && typeof payload === 'object')
  });
  const copernicusRuntimeSource = copernicusResource.data?.source === 'copernicus' && copernicusResource.data?.available
    ? 'copernicus'
    : 'public';

  return (
    <>
      {/* Alert Banner — fixed position at top */}
      {viewMode === 'middleeast' && (
        <ErrorBoundary inline label="Alert Banner">
          <AlertBanner />
        </ErrorBoundary>
      )}

      <div className="app-container">
        {/* Full-screen map underneath */}
        <ErrorBoundary label="Map">
          <MapContainer
            viewState={viewState}
            onMove={setViewState}
            activeLayers={activeLayers}
            onMarkerClick={setSelectedEvent}
            copernicusPreview={copernicusResource.data}
            copernicusMode={copernicusMode}
            copernicusRuntimeSource={copernicusRuntimeSource}
            showCopernicusOverlay={showCopernicusOverlay}
            showStrategicContext={showStrategicContext}
          />
        </ErrorBoundary>

        {/* Row 1: World Clock */}
        <ErrorBoundary inline label="World Clock">
          <WorldClock viewMode={viewMode} />
        </ErrorBoundary>

        {/* Row 2: Header bar */}
        <div className="header-bar grid-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <span style={{ fontWeight: 300, letterSpacing: '3px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                GlobeWatch
              </span>
              <span style={{ fontWeight: 500, letterSpacing: '1.5px', fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                {viewMode === 'depa' ? 'Indo-Pacific' : 'Middle East'} · DNGWS · v3.0
              </span>
            </div>
            <ErrorBoundary inline label="Escalation">
              <EscalationGauge />
            </ErrorBoundary>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px',
              fontFamily: 'var(--font-mono)'
            }}>
              <Eye size={10} style={{ opacity: 0.4 }} />
              {visitorCount.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                padding: '5px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontFamily: 'inherit',
                transition: 'all 0.3s',
                letterSpacing: '0.5px'
              }}
            >
              <RefreshCw size={11} /> {viewMode === 'middleeast' ? 'Indo-Pacific' : 'Middle East'}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.35)',
                padding: '5px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontFamily: 'inherit',
                transition: 'all 0.3s'
              }}
            >
              <Settings size={11} />
            </button>
          </div>
        </div>

        {/* Multi-Front Status Board */}
        {viewMode === 'middleeast' && (
          <div style={{ gridColumn: '2 / -1', pointerEvents: 'auto' }}>
            <ErrorBoundary inline label="Multi-Front Board">
              <MultiFrontBoard />
            </ErrorBoundary>
          </div>
        )}

        {/* Row 3-4: Left sidebar — spans down to bottom bar */}
        <div className="left-sidebar">
          <ErrorBoundary inline label="Sidebar">
            <Sidebar
              activeLayers={activeLayers}
              toggleLayer={toggleLayer}
              viewMode={viewMode}
              copernicusMode={copernicusMode}
              setCopernicusMode={setCopernicusMode}
              copernicusRuntimeSource={copernicusRuntimeSource}
              showCopernicusOverlay={showCopernicusOverlay}
              setShowCopernicusOverlay={setShowCopernicusOverlay}
              showStrategicContext={showStrategicContext}
              setShowStrategicContext={setShowStrategicContext}
              copernicusResource={copernicusResource}
            />
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
              <ErrorBoundary inline label="Iran War Theater">
                <IranWarPanel activeSourceIds={activeSources} />
              </ErrorBoundary>
              <ErrorBoundary inline label="Gulf Security">
                <IntelligencePanel key={`gulfSecurity:${sourceSetKey}`} briefingId="gulfSecurity" activeSourceIds={activeSources} />
              </ErrorBoundary>
            </>
          ) : (
            <>
              <RegionalNewsPanel regionName="Thailand" title="Thailand Tech Ecosystem" activeSourceIds={activeSources} />
              <RegionalNewsPanel regionName="DEPA" title="depa & MDES Directives" activeSourceIds={activeSources} />
            </>
          )}
        </div>

        {/* Strike Stats — above bottom bar */}
        {viewMode === 'middleeast' && (
          <div style={{ gridColumn: '2 / -1', display: 'grid', gridTemplateColumns: '1fr', gap: '8px', pointerEvents: 'auto' }}>
            <ErrorBoundary inline label="Strike Stats">
              <StrikeStatsPanel />
            </ErrorBoundary>
          </div>
        )}

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
              <RegionalNewsPanel regionName="SEA" title="Global Technology News" activeSourceIds={activeSources} />
              <RegionalNewsPanel regionName="Global" title="Global Macro & Policy" activeSourceIds={activeSources} />
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
