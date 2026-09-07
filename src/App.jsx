import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import WorldClock from './components/WorldClock';
import LiveIntelligenceFeed from './components/LiveIntelligenceFeed';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { getDefaultSourceIdsForRegion } from './services/liveNews';
import { REGIONS, REGION_VIEW_STATES } from './data/regions';
import { formatDayCount } from './data/warConstants';
import { fetchCopernicusPreview } from './services/copernicus';
import { fetchAlphaEarthForRegion } from './services/alphaearth';
import { useLiveResource } from './hooks/useLiveResource';
import { Settings, RefreshCw, Network, Database, FileText, Printer, Info, Menu, ChevronDown, Layers, BarChart3 } from 'lucide-react';

import EscalationGauge from './components/EscalationGauge';
import AlertBanner from './components/AlertBanner';
import ClassificationBanner from './components/ClassificationBanner';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import SourceHealthModal from './components/SourceHealthModal';
import ActivityLogModal from './components/ActivityLogModal';
import BraunManualModal from './components/BraunManualModal';
import PapersModal from './components/PapersModal';
import LegalModal from './components/LegalModal';
import LegalFooterLinks from './components/LegalFooterLinks';
import { LazyMapContainer, LazyPanel } from './components/LazyPanels';
import { logActivity, LOG_TYPES } from './services/activityLog';
import { useEscapeKey } from './hooks/useEscapeKey';
import './styles/print.css';
import './styles/tactical-optics.css';

const DASHBOARD_VERSION = 'v8.5';
// Aerosol and nightlights are on at first paint by request — they are the two
// layers that read as "this is a satellite picture" rather than a plotted map.
// Both were toned down in eoTiles.js so live traffic still reads through them;
// aerosol at its old 0.55 buried the aircraft entirely, which is why it had been
// pulled from this list rather than dimmed.
const DEFAULT_MAP_LAYERS = ['conflicts', 'firms', 'cables', 'dams', 'range-rings', 'military', 'vessels', 'flights', 'eo-aerosol', 'eo-nightlights'];
// Derived from the region registry rather than hardcoded, so the opening camera
// can never drift away from the opening theater again (it was pinned to the Gulf
// while the default tab said Southeast Asia).
const DEFAULT_VIEW_TARGET = { ...REGION_VIEW_STATES.indopacific };

function App() {
  // First paint should read as a composed war-room map. Dense live traffic stays opt-in.
  const [activeLayers, setActiveLayers] = useState(DEFAULT_MAP_LAYERS);
  const [mapStyle, setMapStyle] = useState('dark');
  const [tacticalOptics, setTacticalOptics] = useState('standard');
  const [selectedEvent, setSelectedEvent] = useState(null);
  // Three-way region nav: 'middleeast' | 'indopacific' | 'thailand'
  // Asia dashboard: open on Southeast Asia, not the Gulf.
  const [viewMode, setViewMode] = useState('indopacific');
  // Selected country (Indo-Pacific) or province (Thailand) — drives CountryNewsPanel
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isPapersOpen, setIsPapersOpen] = useState(false);
  const [isSourceHealthOpen, setIsSourceHealthOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState('about');
  const openLegalModal = useCallback((tab = 'about') => {
    setLegalInitialTab(tab);
    setIsLegalOpen(true);
  }, []);
  useEscapeKey(isLegalOpen, () => setIsLegalOpen(false));
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState('none');
  const toolsRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    if (toolsOpen) document.addEventListener('pointerdown', onDocClick);
    return () => document.removeEventListener('pointerdown', onDocClick);
  }, [toolsOpen]);
  const [activeSources, setActiveSources] = useState(getDefaultSourceIdsForRegion('middleeast'));
  const [copernicusMode, setCopernicusMode] = useState('true-color');
  const [showCopernicusOverlay, setShowCopernicusOverlay] = useState(false);
  const [showAlphaEarthOverlay, setShowAlphaEarthOverlay] = useState(false);
  const [showStrategicContext, setShowStrategicContext] = useState(false);

  const { backendUp } = useOnlineStatus();

  // Global refresh — broadcasts to every useLiveResource consumer in one shot.
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const handleRefreshAll = useCallback(() => {
    setIsRefreshingAll(true);
    window.dispatchEvent(new CustomEvent('gm:refresh-all'));
    logActivity(LOG_TYPES.USER_ACTION, 'Global refresh triggered');
    // Visual feedback window — actual refreshes complete asynchronously.
    setTimeout(() => setIsRefreshingAll(false), 1500);
  }, []);

  const [viewTarget, setViewTarget] = useState(DEFAULT_VIEW_TARGET);

  const [timeMachineDate, setTimeMachineDate] = useState(null);
  const [mapRecoverKey, setMapRecoverKey] = useState(0);

  const handleMapRecover = useCallback(() => {
    console.warn('Map crashed — remounting map (traffic layers kept)');
    setMapRecoverKey((key) => key + 1);
  }, []);

  const toggleLayer = useCallback((layerId) => {
    setActiveLayers((prev) => {
      const next = prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId];
      logActivity(LOG_TYPES.USER_ACTION, `Layer ${layerId}: ${next.includes(layerId) ? 'on' : 'off'}`);
      return next;
    });
  }, []);

  const resetCoreLayers = useCallback(() => {
    setActiveLayers(DEFAULT_MAP_LAYERS);
    logActivity(LOG_TYPES.USER_ACTION, 'Core operational map layers restored');
  }, []);

  const handleMapFlyTo = useCallback((target) => {
    setViewTarget(prev => ({
      ...prev,
      ...target,
      transitionDuration: target.transitionDuration || 1500,
    }));
  }, []);

  const toggleSource = (sourceId) => {
    setActiveSources(prev =>
      prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
    );
  };

  const setAllSources = (enable) => {
    setActiveSources(enable ? getDefaultSourceIdsForRegion(viewMode) : []);
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

  const alphaEarthFetcher = useCallback(
    () => fetchAlphaEarthForRegion(viewMode),
    [viewMode]
  );
  const alphaEarthResource = useLiveResource(alphaEarthFetcher, {
    cacheKey: `alphaearth:${viewMode}`,
    intervalMs: 24 * 60 * 60 * 1000,
    freezeAfterLoad: true,
    isUsable: (payload) => Boolean(payload?.primary?.sidecar)
  });
  const alphaEarthLayer = alphaEarthResource.data?.primary || null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'o') {
        const OPTICS_MODES = ['standard', 'flir', 'nvg', 'crt'];
        setTacticalOptics((prev) => {
          const idx = OPTICS_MODES.indexOf(prev);
          return OPTICS_MODES[(idx + 1) % OPTICS_MODES.length];
        });
      } else if (key === 'm') {
        toggleLayer('military');
      } else if (key === 'c') {
        toggleLayer('cables');
      } else if (key === 'd') {
        toggleLayer('dams');
      } else if (key === 'r') {
        toggleLayer('range-rings');
      } else if (e.key === '?') {
        setIsManualOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLayer]);

  return (
    <>
      {/* Alert Banner — fixed position at top */}
      {viewMode === 'middleeast' && (
        <ErrorBoundary inline label="Alert Banner">
          <AlertBanner />
        </ErrorBoundary>
      )}

      <div
        className="app-container"
        id="main-content"
        role="main"
        data-layout="map-first"
        data-optics={tacticalOptics}
        data-sidebar-open={sidebarOpen ? 'true' : 'false'}
        data-layers-open={sidebarOpen || mobileDrawer === 'layers' ? 'true' : 'false'}
        data-mobile-drawer={mobileDrawer}
      >
        {/* Full-screen map underneath */}
        <ErrorBoundary inline label="Map" recoverKey={mapRecoverKey} onRecover={handleMapRecover}>
          <Suspense fallback={<div className="map-loading" />}>
            <LazyMapContainer
              key={mapRecoverKey}
              viewTarget={viewTarget}
              activeLayers={activeLayers}
              onMarkerClick={setSelectedEvent}
              copernicusPreview={copernicusResource.data}
              copernicusMode={copernicusMode}
              copernicusRuntimeSource={copernicusRuntimeSource}
              showCopernicusOverlay={showCopernicusOverlay}
              showStrategicContext={showStrategicContext}
              alphaEarthLayer={alphaEarthLayer}
              showAlphaEarthOverlay={showAlphaEarthOverlay}
              mapStyle={mapStyle}
              timeMachineDate={timeMachineDate}
              viewMode={viewMode}
              onRegionDotClick={(props) => {
                const code = props?.countryCode || props?.regionCode;
                if (code) setSelectedCountryCode(code);
                if (typeof props?.latitude === 'number' && typeof props?.longitude === 'number') {
                  setViewTarget((prev) => ({
                    ...prev,
                    longitude: props.longitude,
                    latitude: props.latitude,
                    zoom: Math.max(prev.zoom, viewMode === 'thailand' ? 6.5 : 4.5),
                    transitionDuration: 800,
                  }));
                }
              }}
            />
          </Suspense>
        </ErrorBoundary>

        {/* Row 1: World Clock */}
        <ErrorBoundary inline label="World Clock">
          <WorldClock viewMode={viewMode} />
        </ErrorBoundary>

        {/* Row 2: Header bar — 3-section layout: logos | center title | controls */}
        <div className="header-bar grid-panel">
          {/* Left: Sponsor logos in white pill */}
          <div className="header-brand-strip" aria-label="Project partners">
            <img src={`${import.meta.env.BASE_URL}pmua-logo.webp`} alt="PMUA" className="header-brand-logo header-brand-logo-pmua" />
            <img src={`${import.meta.env.BASE_URL}depa-logo.png`} alt="depa" className="header-brand-logo header-brand-logo-depa" />
            <img src={`${import.meta.env.BASE_URL}axiom-logo.png`} alt="Axiom" className="header-brand-logo header-brand-logo-axiom" />
            <img src={`${import.meta.env.BASE_URL}retl-logo.svg`} alt="ReTL" className="header-brand-logo header-brand-logo-retl" />
          </div>

          {/* Center: Title + Escalation */}
          <div className="header-status">
            <div className="header-title-lockup">
              <span className="header-title">
                Asia Political Dashboard
              </span>
              <span className="header-subtitle">
                {formatDayCount()}
              </span>
            </div>
            <ErrorBoundary inline label="Escalation">
              <EscalationGauge viewMode={viewMode} />
            </ErrorBoundary>
          </div>
          {/* Right: Controls */}
          <div className="header-controls">
            <button
              type="button"
              onClick={() => {
                const opening = mobileDrawer !== 'layers' || !sidebarOpen;
                setSidebarOpen(opening);
                setMobileDrawer(opening ? 'layers' : 'none');
              }}
              aria-pressed={sidebarOpen || mobileDrawer === 'layers'}
              aria-label="Toggle map layers panel"
              className="header-icon-button map-first-header-layers"
            >
              <Layers size={13} aria-hidden="true" />
              <span className="header-icon-label">Layers</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileDrawer((d) => (d === 'intel' ? 'none' : 'intel'));
                setSidebarOpen(false);
              }}
              aria-pressed={mobileDrawer === 'intel'}
              aria-label="Toggle intelligence panels"
              className="header-icon-button map-first-header-intel"
            >
              <Network size={13} aria-hidden="true" />
              <span className="header-icon-label">Intel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileDrawer((d) => (d === 'markets' ? 'none' : 'markets'));
                setSidebarOpen(false);
              }}
              aria-pressed={mobileDrawer === 'markets'}
              aria-label="Toggle markets panel strip"
              className="header-icon-button map-first-header-markets"
            >
              <BarChart3 size={13} aria-hidden="true" />
              <span className="header-icon-label">Markets</span>
            </button>
            <button
              onClick={() => setIsManualOpen(true)}
              aria-label="Open System Manual"
              className="header-button header-button-manual"
            >
              <Info size={11} aria-hidden="true" /> Manual
            </button>
            <button
              onClick={() => setIsPapersOpen(true)}
              aria-label="About this dashboard"
              className="header-button header-button-manual header-button-papers"
            >
              <FileText size={11} aria-hidden="true" /> About
            </button>
            <div
              className="header-region-tabs"
              role="tablist"
              aria-label="Theater region selector"
            >
              {Object.values(REGIONS).map((r) => {
                const isActive = viewMode === r.id;
                return (
                  <button
                    key={r.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Switch dashboard to ${r.label}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => {
                      setViewMode(r.id);
                      setViewTarget({ ...r.viewState, transitionDuration: 1200 });
                      setActiveSources(getDefaultSourceIdsForRegion(r.id));
                      setSelectedCountryCode(null);
                    }}
                    className={`header-region-tab ${isActive ? 'is-active' : ''}`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Tools dropdown — collapses secondary operator actions to reduce header noise */}
            <div className="header-tools-dropdown" ref={toolsRef}>
              <button
                type="button"
                onClick={() => setToolsOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={toolsOpen}
                aria-label="Tools and advanced options"
                className={`header-icon-button header-tools-trigger ${!backendUp ? 'has-warning' : ''}`}
              >
                <Menu size={13} aria-hidden="true" />
                <span className="header-icon-label">Tools</span>
                <ChevronDown size={10} aria-hidden="true" className={`header-tools-chevron ${toolsOpen ? 'open' : ''}`} />
              </button>
              {toolsOpen && (
                <div className="header-tools-menu" role="menu">
                  <button role="menuitem" onClick={() => { setToolsOpen(false); setIsPapersOpen(true); }}>
                    <FileText size={12} aria-hidden="true" /> Papers
                  </button>
                  <button role="menuitem" onClick={() => { setToolsOpen(false); setIsSourceHealthOpen(true); }}>
                    <Database size={12} aria-hidden="true" /> Data health
                  </button>
                  <button role="menuitem" onClick={() => { setToolsOpen(false); setIsActivityLogOpen(true); }}>
                    <FileText size={12} aria-hidden="true" /> Session log
                  </button>
                  <button role="menuitem" onClick={() => { setToolsOpen(false); setIsSettingsOpen(true); }}>
                    <Settings size={12} aria-hidden="true" /> News sources
                  </button>
                  <button role="menuitem" onClick={() => { setToolsOpen(false); logActivity(LOG_TYPES.USER_ACTION, 'Print briefing initiated'); window.print(); }}>
                    <Printer size={12} aria-hidden="true" /> Print briefing
                  </button>
                  <button role="menuitem" onClick={() => { setToolsOpen(false); openLegalModal('about'); }}>
                    <Info size={12} aria-hidden="true" /> About
                  </button>
                  <button role="menuitem" onClick={() => { setToolsOpen(false); handleRefreshAll(); }} disabled={isRefreshingAll}>
                    <RefreshCw size={12} aria-hidden="true" className={isRefreshingAll ? 'spin-anim' : ''} /> Refresh data
                    {!backendUp && <span className="header-tools-warning-dot" aria-hidden="true" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Multi-Front Status Board */}
        {viewMode === 'middleeast' && (
          <div className="multi-front-row">
            <ErrorBoundary inline label="Multi-Front Board">
              <LazyPanel name="MultiFrontBoard" viewMode={viewMode} />
            </ErrorBoundary>
          </div>
        )}

        {/* Row 3-5: Left sidebar — layer controls drawer */}
        <button
          type="button"
          className="map-first-backdrop"
          aria-label="Close layers panel"
          onClick={() => {
            setSidebarOpen(false);
            setMobileDrawer('none');
          }}
        />
        <div className="map-first-layers-rail" aria-label="Map controls">
          <button
            type="button"
            className="map-first-rail-btn"
            aria-pressed={sidebarOpen}
            aria-label="Toggle layers panel"
            onClick={() => {
              const next = !sidebarOpen;
              setSidebarOpen(next);
              setMobileDrawer(next ? 'layers' : 'none');
            }}
          >
            <Layers size={18} aria-hidden="true" />
          </button>
        </div>
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
              alphaEarthLayer={alphaEarthLayer}
              showAlphaEarthOverlay={showAlphaEarthOverlay}
              setShowAlphaEarthOverlay={setShowAlphaEarthOverlay}
              onMapFlyTo={handleMapFlyTo}
              mapStyle={mapStyle}
              setMapStyle={setMapStyle}
              tacticalOptics={tacticalOptics}
              setTacticalOptics={setTacticalOptics}
              dashboardVersion={DASHBOARD_VERSION}
              onResetCoreLayers={resetCoreLayers}
            />
          </ErrorBoundary>
          {viewMode === 'middleeast' && (
            <ErrorBoundary inline label="Flight Radar">
              <LazyPanel
                name="FlightRadarEmbed"
                flightsActive={activeLayers.includes('flights')}
                onToggleFlights={() => toggleLayer('flights')}
              />
            </ErrorBoundary>
          )}
          {/* Live TV is always present so switching regions just swaps channels
              instead of unmounting the iframe — keeps panel stable across nav. */}
          <ErrorBoundary inline label="Live TV">
            <LazyPanel name="LiveTVPanel" viewMode={viewMode} />
          </ErrorBoundary>
        </div>

        {/* Intelligence panels — right rail + bottom strip (mobile drawer) */}
        <div className="intel-zone">
          <div className="intel-drawer-host">
            <div className="right-sidebar">
              {selectedEvent && (
                <LazyPanel
                  name="EventDetailsPanel"
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                />
              )}
              {viewMode === 'middleeast' && (
                <>
                  <ErrorBoundary inline label="Iran War Theater">
                    <LazyPanel name="IranWarPanel" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Humanitarian Impact">
                    <LazyPanel name="HumanitarianPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Conflict Analytics">
                    <LazyPanel name="AcledAnalytics" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="TimesFM Forecast">
                    <LazyPanel name="TimesFMPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Key Figures">
                    <LazyPanel name="KeyFiguresPanel" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="International Response">
                    <LazyPanel name="InternationalResponsePanel" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Displacement Tracker">
                    <LazyPanel name="RefugeePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Arms & Defense">
                    <LazyPanel name="ArmsDefensePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Gulf Security">
                    <LazyPanel name="IntelligencePanel" panelKey={`gulfSecurity:${sourceSetKey}`} briefingId="gulfSecurity" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Energy & Oil Impact">
                    <LazyPanel name="IntelligencePanel" panelKey={`energyMarkets:${sourceSetKey}`} briefingId="energyMarkets" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Regional Headlines">
                    <LazyPanel name="RegionalNewsPanel" regionName="Middle East" title="Regional Headlines" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'indopacific' && (
                <>
                  <ErrorBoundary inline label="ASEAN Country News">
                    <LazyPanel name="CountryNewsPanel" mode="indopacific"
                      selectedCode={selectedCountryCode}
                      onSelect={setSelectedCountryCode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="South China Sea">
                    <LazyPanel name="IntelligencePanel" panelKey={`southChinaSea:${sourceSetKey}`} briefingId="southChinaSea" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="ASEAN Geopolitics">
                    <LazyPanel name="IntelligencePanel" panelKey={`aseanDiplomacy:${sourceSetKey}`} briefingId="aseanDiplomacy" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Myanmar Conflict">
                    <LazyPanel name="IntelligencePanel" panelKey={`myanmarConflict:${sourceSetKey}`} briefingId="myanmarConflict" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Humanitarian Crisis">
                    <LazyPanel name="HumanitarianPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Displacement Tracker">
                    <LazyPanel name="RefugeePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Conflict Analytics">
                    <LazyPanel name="AcledAnalytics" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="TimesFM Forecast">
                    <LazyPanel name="TimesFMPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Arms & Defense">
                    <LazyPanel name="ArmsDefensePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'thailand' && (
                <>
                  <ErrorBoundary inline label="Thailand Region News">
                    <LazyPanel name="CountryNewsPanel" mode="thailand"
                      selectedCode={selectedCountryCode}
                      onSelect={setSelectedCountryCode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Thailand Security">
                    <LazyPanel name="IntelligencePanel" panelKey={`thaiSecurity:${sourceSetKey}`} briefingId="thaiSecurity" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Thailand Border Conflict Monitor">
                    <LazyPanel name="ThailandBorderConflictTracker" onFlyToBorder={handleMapFlyTo} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Thailand Oil Shipment Tracker">
                    <LazyPanel name="ThailandOilShipmentTracker" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Myanmar Border Crisis">
                    <LazyPanel name="IntelligencePanel" panelKey={`myanmarConflict:${sourceSetKey}`} briefingId="myanmarConflict" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Humanitarian Crisis">
                    <LazyPanel name="HumanitarianPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Displacement Tracker">
                    <LazyPanel name="RefugeePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Conflict Analytics">
                    <LazyPanel name="AcledAnalytics" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="TimesFM Forecast">
                    <LazyPanel name="TimesFMPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Thai Tech Ecosystem">
                    <LazyPanel name="RegionalNewsPanel" regionName="Thailand" title="Thailand Tech Ecosystem" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="depa Directives">
                    <LazyPanel name="RegionalNewsPanel" regionName="DEPA" title="depa & MDES Directives" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'eastasia' && (
                <>
                  <ErrorBoundary inline label="Taiwan Strait">
                    <LazyPanel name="IntelligencePanel" panelKey={`taiwanStrait:${sourceSetKey}`} briefingId="taiwanStrait" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Korean Peninsula">
                    <LazyPanel name="IntelligencePanel" panelKey={`koreanPeninsula:${sourceSetKey}`} briefingId="koreanPeninsula" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="South China Sea">
                    <LazyPanel name="IntelligencePanel" panelKey={`southChinaSea:${sourceSetKey}`} briefingId="southChinaSea" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Humanitarian Crisis">
                    <LazyPanel name="HumanitarianPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Conflict Analytics">
                    <LazyPanel name="AcledAnalytics" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="TimesFM Forecast">
                    <LazyPanel name="TimesFMPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Arms & Defense">
                    <LazyPanel name="ArmsDefensePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'southasia' && (
                <>
                  <ErrorBoundary inline label="India–Pakistan">
                    <LazyPanel name="IntelligencePanel" panelKey={`indiaPakistan:${sourceSetKey}`} briefingId="indiaPakistan" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Indian Ocean">
                    <LazyPanel name="IntelligencePanel" panelKey={`indianOcean:${sourceSetKey}`} briefingId="indianOcean" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Humanitarian Crisis">
                    <LazyPanel name="HumanitarianPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Displacement Tracker">
                    <LazyPanel name="RefugeePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Conflict Analytics">
                    <LazyPanel name="AcledAnalytics" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="TimesFM Forecast">
                    <LazyPanel name="TimesFMPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Arms & Defense">
                    <LazyPanel name="ArmsDefensePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'global' && (
                <>
                  <ErrorBoundary inline label="Global Macro">
                    <LazyPanel name="RegionalNewsPanel" regionName="Global" title="Global Macro & Policy" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Humanitarian Impact">
                    <LazyPanel name="HumanitarianPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Conflict Analytics">
                    <LazyPanel name="AcledAnalytics" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="TimesFM Forecast">
                    <LazyPanel name="TimesFMPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Displacement Tracker">
                    <LazyPanel name="RefugeePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Maritime Warnings">
                    <LazyPanel name="MaritimeWarningsPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Arms & Defense">
                    <LazyPanel name="ArmsDefensePanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
            </div>
            <div className="bottom-bar">
              <ErrorBoundary inline label="Crisis Radio">
                <LazyPanel key={`crisis-radio:${viewMode}`} name="CrisisRadioPanel" viewMode={viewMode} />
              </ErrorBoundary>
              <ErrorBoundary inline label="Market Radar">
                <LazyPanel name="MarketRadarPanel" viewMode={viewMode} />
              </ErrorBoundary>
              {viewMode === 'middleeast' && (
                <>
                  {/* Row 1: Economics & Markets */}
                  <ErrorBoundary inline label="Oil Price Chart">
                    <LazyPanel name="OilPriceChart" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="ME Oil Dependence">
                    <LazyPanel name="MiddleEastOilDependency" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="War Cost">
                    <LazyPanel name="WarCostTracker" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Sanctions Tracker">
                    <LazyPanel name="SanctionsPanel" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Hormuz Crisis">
                    <LazyPanel name="HormuzTracker" />
                  </ErrorBoundary>
                  {/* Row 2: Military & Intelligence */}
                  <ErrorBoundary inline label="Nuclear Program">
                    <LazyPanel name="NuclearTrackerPanel" onFlyTo={handleMapFlyTo} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Diplomacy & Sanctions">
                    <LazyPanel name="IntelligencePanel" panelKey={`iranDiplomacy:${sourceSetKey}`} briefingId="iranDiplomacy" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Proxy Theater">
                    <LazyPanel name="IntelligencePanel" panelKey={`proxyTheater:${sourceSetKey}`} briefingId="proxyTheater" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Media Sentiment">
                    <LazyPanel name="SentimentChart" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Seismic Activity">
                    <LazyPanel name="SeismicPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'indopacific' && (
                <>
                  <ErrorBoundary inline label="South China Sea Watch">
                    <LazyPanel name="RegionalNewsPanel" regionName="SouthChinaSea" title="South China Sea Watch" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Taiwan Strait">
                    <LazyPanel name="RegionalNewsPanel" regionName="Taiwan" title="Taiwan Strait" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="ASEAN Diplomacy">
                    <LazyPanel name="RegionalNewsPanel" regionName="ASEAN" title="ASEAN Diplomacy" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Global Tech News">
                    <LazyPanel name="RegionalNewsPanel" regionName="SEA" title="Indo-Pacific Tech" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Global Macro">
                    <LazyPanel name="RegionalNewsPanel" regionName="Global" title="Global Macro & Policy" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Maritime Warnings">
                    <LazyPanel name="MaritimeWarningsPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Media Sentiment">
                    <LazyPanel name="SentimentChart" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Seismic Activity">
                    <LazyPanel name="SeismicPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'thailand' && (
                <>
                  <ErrorBoundary inline label="Thailand Border Conflict Monitor">
                    <LazyPanel name="ThailandBorderConflictTracker" onFlyToBorder={handleMapFlyTo} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Thailand Oil Shipment Tracker">
                    <LazyPanel name="ThailandOilShipmentTracker" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Thailand Flight Tracker">
                    <LazyPanel name="ThailandFlightTracker" />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Myanmar Border Crisis">
                    <LazyPanel name="RegionalNewsPanel" regionName="Myanmar" title="Myanmar Border Crisis" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="ASEAN Watch">
                    <LazyPanel name="RegionalNewsPanel" regionName="ASEAN" title="ASEAN Watch" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Thailand Tech">
                    <LazyPanel name="RegionalNewsPanel" regionName="Thailand" title="Thailand Tech Ecosystem" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="depa Directives">
                    <LazyPanel name="RegionalNewsPanel" regionName="DEPA" title="depa & MDES" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Media Sentiment">
                    <LazyPanel name="SentimentChart" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Seismic Activity">
                    <LazyPanel name="SeismicPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'eastasia' && (
                <>
                  <ErrorBoundary inline label="Taiwan Strait Watch">
                    <LazyPanel name="RegionalNewsPanel" regionName="Taiwan" title="Taiwan Strait" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Korean Peninsula Watch">
                    <LazyPanel name="RegionalNewsPanel" regionName="KoreanPeninsula" title="Korean Peninsula" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="East China Sea">
                    <LazyPanel name="RegionalNewsPanel" regionName="EastChinaSea" title="East China Sea" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Maritime Warnings">
                    <LazyPanel name="MaritimeWarningsPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Media Sentiment">
                    <LazyPanel name="SentimentChart" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Seismic Activity">
                    <LazyPanel name="SeismicPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'southasia' && (
                <>
                  <ErrorBoundary inline label="India–Pakistan Watch">
                    <LazyPanel name="RegionalNewsPanel" regionName="IndiaPakistan" title="India–Pakistan" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Indian Ocean Watch">
                    <LazyPanel name="RegionalNewsPanel" regionName="IndianOcean" title="Indian Ocean" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Afghanistan Watch">
                    <LazyPanel name="RegionalNewsPanel" regionName="Afghanistan" title="Afghanistan" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Media Sentiment">
                    <LazyPanel name="SentimentChart" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Seismic Activity">
                    <LazyPanel name="SeismicPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
              {viewMode === 'global' && (
                <>
                  <ErrorBoundary inline label="Global Macro">
                    <LazyPanel name="RegionalNewsPanel" regionName="Global" title="Global Macro & Policy" activeSourceIds={activeSources} viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Maritime Warnings">
                    <LazyPanel name="MaritimeWarningsPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Media Sentiment">
                    <LazyPanel name="SentimentChart" viewMode={viewMode} />
                  </ErrorBoundary>
                  <ErrorBoundary inline label="Seismic Activity">
                    <LazyPanel name="SeismicPanel" viewMode={viewMode} />
                  </ErrorBoundary>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="map-first-mobile-tabs" aria-label="Panel navigation">
          <button
            type="button"
            className="map-first-mobile-tab"
            role="tab"
            aria-selected={mobileDrawer === 'layers'}
            onClick={() => {
              const next = mobileDrawer === 'layers' ? 'none' : 'layers';
              setMobileDrawer(next);
              setSidebarOpen(next === 'layers');
            }}
          >
            Layers
          </button>
          <button
            type="button"
            className="map-first-mobile-tab"
            role="tab"
            aria-selected={mobileDrawer === 'intel'}
            onClick={() => {
              setMobileDrawer((d) => (d === 'intel' ? 'none' : 'intel'));
              setSidebarOpen(false);
            }}
          >
            Intel
          </button>
          <button
            type="button"
            className="map-first-mobile-tab"
            role="tab"
            aria-selected={mobileDrawer === 'markets'}
            onClick={() => {
              setMobileDrawer((d) => (d === 'markets' ? 'none' : 'markets'));
              setSidebarOpen(false);
            }}
          >
            <BarChart3 size={12} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Markets
          </button>
        </nav>

        <ErrorBoundary inline label="Live Feed">
          <LiveIntelligenceFeed key={`ticker:${viewMode}:${sourceSetKey}`} activeSourceIds={activeSources} viewMode={viewMode} />
        </ErrorBoundary>

        {/* Time Machine — date slider for historical data */}
        {viewMode === 'middleeast' && (
          <ErrorBoundary inline label="Time Machine">
            <LazyPanel name="TimeMachine" onDateChange={setTimeMachineDate} />
          </ErrorBoundary>
        )}

        {/* Modal: Settings */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          activeSources={activeSources}
          toggleSource={toggleSource}
          setAllSources={setAllSources}
        />

        {/* Modal: Manual */}
        <BraunManualModal
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
        />
        <PapersModal
          isOpen={isPapersOpen}
          onClose={() => setIsPapersOpen(false)}
          systemId="asia"
        />

        {/* Modal: Source Health */}
        <SourceHealthModal
          isOpen={isSourceHealthOpen}
          onClose={() => setIsSourceHealthOpen(false)}
        />

        {/* Modal: Activity Log */}
        <ActivityLogModal
          isOpen={isActivityLogOpen}
          onClose={() => setIsActivityLogOpen(false)}
        />

        {isLegalOpen && (
          <LegalModal
            isOpen
            onClose={() => setIsLegalOpen(false)}
            initialTab={legalInitialTab}
            onOpenDataProvenance={() => {
              setIsLegalOpen(false);
              setIsSourceHealthOpen(true);
            }}
          />
        )}
      </div>

      <LegalFooterLinks onOpenSection={openLegalModal} />

      {/* Classification Banner — always visible, top and bottom of viewport */}
      <ClassificationBanner level="FOUO" />
    </>
  );
}

export default App;
