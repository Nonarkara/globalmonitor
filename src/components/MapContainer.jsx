import React, { useCallback, useState, useRef, useEffect, useMemo, useReducer } from 'react';
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { AlertTriangle } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchNaturalDisasters } from '../services/nasaEonet';
import { fetchConflictsAndCrises } from '../services/reliefWeb';
import { fetchLiveWeather } from '../services/weather';
import { fetchMacroEconomy } from '../services/worldBank';
import { fetchAirQuality } from '../services/airQuality';
import { fetchFirmsData } from '../services/firms';
import { fetchInfrastructure } from '../services/infrastructure';
import { fetchFlights } from '../services/flights.js';
import { fetchVessels } from '../services/vessels.js';
import { fetchRainviewerTiles } from '../services/rainviewer.js';
import { fetchAcledEvents } from '../services/acled.js';
import { useLiveResource } from '../hooks/useLiveResource';
import { EO_TILE_LAYERS, getEoLayerById } from '../services/eoTiles';
import { fetchSdgLayer } from '../services/undpSdg';
import { getRegion } from '../data/regions.js';
import { setFlightStats } from '../services/flightCountBus.js';
import { setVesselStats } from '../services/vesselCountBus.js';
import { formatTrafficLegend } from '../utils/formatTrafficCount.js';
import { loadTrafficIcons, FLIGHT_ICON_IMAGE, VESSEL_ICON_IMAGE } from '../services/mapTrafficIcons.js';
import { isValidLngLat, sanitizePointCollection, spreadSamplePointCollection } from '../utils/geojsonValidate.js';

/** Static traffic snapshot — one fetch per session, frozen until tab close. */
const TRAFFIC_THEATER = 'global';
/** Cap rendered symbols — global pool, painted once (no viewport re-setData on pan). */
const TRAFFIC_SESSION_MAX_FLIGHTS = 1200;
const TRAFFIC_SESSION_MAX_VESSELS = 1200;
/** Defer heavy traffic GeoJSON until basemap + icons are stable (ms after map load). */
const TRAFFIC_DEFER_MS = 3000;

const formatVesselSourceLabel = (meta) => {
    if (meta?.aisSource === 'axiom-overwatch' || meta?.source?.includes('axiom-overwatch')) {
        return 'Axiom Overwatch';
    }
    if (meta?.aisSource === 'static-snapshot') return 'AIS snapshot';
    return meta?.source?.replace('aisstream.io', 'AIS')?.replace('vesselfinder-fleet', 'fleet') || 'AIS';
};

const HOVER_LAYERS = ['flights-icons', 'vessels-icons', 'vessels-labels', 'acled-circles', 'firms-circles'];

const formatCoord = (value, axis) => {
    const abs = Math.abs(value);
    const dir = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${abs.toFixed(4)}°${dir}`;
};
const MAP_MIN_ZOOM = 3; // §11.9 — regional dashboard floor, prevents world-copy repetition
const MAP_MAX_ZOOM = 18;

const buildTargetViewState = (viewTarget, fallbackTransitionDuration = 1500) => ({
    ...viewTarget,
    transitionDuration: viewTarget.transitionDuration ?? fallbackTransitionDuration,
});

const mapViewReducer = (state, action) => {
    switch (action.type) {
    case 'move':
        return {
            ...action.viewState,
            zoom: Math.min(Math.max(action.viewState.zoom, MAP_MIN_ZOOM), MAP_MAX_ZOOM),
            transitionDuration: 0,
        };
    case 'target':
        return buildTargetViewState(action.viewTarget, state.transitionDuration);
    default:
        return state;
    }
};

const STRATEGIC_ZONES = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[44, 22], [60, 22], [60, 32], [44, 32], [44, 22]]]
            },
            properties: {
                fill: '#ef4444',
                line: '#fca5a5'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[94, -6], [109, -6], [109, 18], [94, 18], [94, -6]]]
            },
            properties: {
                fill: '#10b981',
                line: '#6ee7b7'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[32, 11], [45, 11], [45, 22], [32, 22], [32, 11]]]
            },
            properties: {
                fill: '#f59e0b',
                line: '#fcd34d'
            }
        }
    ]
};

const OPERATIONAL_CORRIDORS = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[51.47, 25.28], [55.36, 25.25], [72.88, 19.07], [100.5, 13.75]]
            },
            properties: {
                color: '#ef4444',
                width: 2.8,
                glow: 12,
                label: 'Energy Trade Route (Gulf → India → Bangkok)'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[40.0, 16.5], [56.0, 18.2], [72.0, 14.6], [90.0, 8.3], [103.82, 1.35]]
            },
            properties: {
                color: '#f59e0b',
                width: 2.4,
                glow: 10,
                label: 'Maritime Shipping Lane (Red Sea → Singapore)'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[121.47, 31.23], [121.56, 25.03], [120.98, 14.6], [103.82, 1.35]]
            },
            properties: {
                color: '#38bdf8',
                width: 2.2,
                glow: 9,
                label: 'East Asia Trade Corridor (Shanghai → Singapore)'
            }
        }
    ]
};

const ANCHOR_POINTS = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [51.47, 25.28] }, properties: { color: '#ef4444', radius: 10 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [55.36, 25.25] }, properties: { color: '#ef4444', radius: 12 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [53.68, 32.42] }, properties: { color: '#ef4444', radius: 11 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [100.5, 13.75] }, properties: { color: '#10b981', radius: 12 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [103.82, 1.35] }, properties: { color: '#38bdf8', radius: 11 } }
    ]
};

const URBAN_MEGAREGIONS = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[99.7, 13.15], [101.45, 13.15], [101.45, 14.55], [99.7, 14.55], [99.7, 13.15]]]
            },
            properties: {
                color: '#10b981',
                height: 120000,
                base: 0
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[103.45, 1.05], [104.15, 1.05], [104.15, 1.62], [103.45, 1.62], [103.45, 1.05]]]
            },
            properties: {
                color: '#38bdf8',
                height: 140000,
                base: 0
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[54.45, 24.35], [55.85, 24.35], [55.85, 25.65], [54.45, 25.65], [54.45, 24.35]]]
            },
            properties: {
                color: '#ef4444',
                height: 135000,
                base: 0
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[120.55, 24.65], [122.25, 24.65], [122.25, 25.4], [120.55, 25.4], [120.55, 24.65]]]
            },
            properties: {
                color: '#f59e0b',
                height: 105000,
                base: 0
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[106.2, -6.7], [107.25, -6.7], [107.25, -5.8], [106.2, -5.8], [106.2, -6.7]]]
            },
            properties: {
                color: '#8b5cf6',
                height: 110000,
                base: 0
            }
        }
    ]
};

const CITY_NETWORK = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[54.9, 24.8], [72.88, 19.07], [100.5, 13.75], [103.82, 1.35]]
            },
            properties: {
                color: '#38bdf8'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[100.5, 13.75], [106.82, -6.18], [103.82, 1.35], [121.56, 25.03]]
            },
            properties: {
                color: '#10b981'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[103.82, 1.35], [114.17, 22.32], [121.56, 25.03], [139.76, 35.68]]
            },
            properties: {
                color: '#f59e0b'
            }
        }
    ]
};

const CITY_BEACONS = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [100.5, 13.75] },
            properties: { name: 'Bangkok', tier: 'policy engine', color: '#10b981', radius: 8 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [103.82, 1.35] },
            properties: { name: 'Singapore', tier: 'logistics core', color: '#38bdf8', radius: 8 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [55.27, 25.2] },
            properties: { name: 'Dubai', tier: 'airspace hinge', color: '#ef4444', radius: 8 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [121.56, 25.03] },
            properties: { name: 'Taipei', tier: 'tech nexus', color: '#f59e0b', radius: 7 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [106.82, -6.18] },
            properties: { name: 'Jakarta', tier: 'metro scale', color: '#8b5cf6', radius: 7 }
        }
    ]
};

const hasFeatureData = (collection) => Array.isArray(collection?.features) && collection.features.length > 0;
const getPublicSentinelLayerId = (mode) => (mode === 'ndvi' ? 'eo-vegetation' : 'eo-true-color');
const toImageCoordinates = (bbox) => {
    const [west, south, east, north] = bbox;
    return [
        [west, north],
        [east, north],
        [east, south],
        [west, south]
    ];
};
const toFootprintFeature = (preview) => {
    const bbox = preview?.bounds?.bbox;
    if (!Array.isArray(bbox) || bbox.length !== 4) return null;

    const [west, south, east, north] = bbox;
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [west, south],
                        [east, south],
                        [east, north],
                        [west, north],
                        [west, south]
                    ]]
                },
                properties: {
                    label: `${preview.theaterLabel} ${preview.presetLabel}`
                }
            }
        ]
    };
};

const renderSpatialAura = (data, id, color, baseRadius) => {
    if (!data?.features?.length) return null;

    return (
        <Source id={`${id}-aura-source`} type="geojson" data={data}>
            <Layer
                id={`${id}-aura-layer`}
                type="circle"
                paint={{
                    'circle-color': color,
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, baseRadius, 8, baseRadius * 2.4],
                    'circle-opacity': 0.08,
                    'circle-blur': 0.75,
                    'circle-stroke-color': color,
                    'circle-stroke-width': 1,
                    'circle-stroke-opacity': 0.14
                }}
            />
        </Source>
    );
};

// Inline MapLibre style spec for ESRI World Imagery — no API key required.
// Used as the satellite basemap because the MapTiler "hybrid" placeholder key that
// previously lived here was the literal docs example and rendered blank in production.
const ESRI_SATELLITE_STYLE = {
    version: 8,
    sources: {
        'esri-world-imagery': {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN'
        },
        'esri-reference': {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19
        }
    },
    layers: [
        { id: 'esri-world-imagery-layer', type: 'raster', source: 'esri-world-imagery' },
        { id: 'esri-reference-layer', type: 'raster', source: 'esri-reference', paint: { 'raster-opacity': 0.85 } }
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
};

// Each entry can be a URL string or an inline style object — MapLibre accepts both.
// Fallback chain (per style): if the primary URL fails (CORS / 5xx / DNS), the
// onStyleError handler in <Map> will swap to the fallback so the map never goes blank.
const MAP_STYLES = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: ESRI_SATELLITE_STYLE,
    voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
};

const MAP_STYLE_FALLBACKS = {
    dark: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    voyager: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    satellite: 'https://demotiles.maplibre.org/style.json',
};

/** Key-free last resort — MapLibre demo tiles, no token required. */
const MAP_STYLE_ULTIMATE = 'https://demotiles.maplibre.org/style.json';

const resolveMapStyle = (mapStyleKey, fallbackLevel = 0) => {
    const primary = MAP_STYLES[mapStyleKey] || MAP_STYLES.dark;
    if (fallbackLevel <= 0) return primary;
    if (fallbackLevel === 1) return MAP_STYLE_FALLBACKS[mapStyleKey] || MAP_STYLE_ULTIMATE;
    return MAP_STYLE_ULTIMATE;
};

const styleCacheKey = (mapStyleKey, fallbackLevel, style) => (
    typeof style === 'string'
        ? `${mapStyleKey}:${fallbackLevel}:${style}`
        : `${mapStyleKey}:${fallbackLevel}:inline`
);

const MapContainer = ({
    viewTarget,
    activeLayers,
    onMarkerClick,
    copernicusPreview,
    copernicusMode,
    copernicusRuntimeSource,
    showCopernicusOverlay,
    showStrategicContext,
    viewMode = 'middleeast',
    onRegionDotClick,
    mapStyle = 'dark',
}) => {
    const region = getRegion(viewMode);
    const regionDots = region.dots;
    const [viewState, dispatchViewState] = useReducer(
        mapViewReducer,
        viewTarget,
        (initialViewTarget) => buildTargetViewState(initialViewTarget)
    );
    const mapRef = useRef(null);
    // Track which raster sources have failed (auth / 404 / CORS / 5xx) so the
    // user sees what is missing instead of a silently-empty map.
    const [failedSources, setFailedSources] = useState(() => new Set());

    const [mapReady, setMapReady] = useState(false);
    const [trafficDeferredReady, setTrafficDeferredReady] = useState(false);
    const [styleFallbackState, setStyleFallbackState] = useState(() => ({ mapStyleKey: mapStyle, level: 0 }));
    const [rainviewerTiles, setRainviewerTiles] = useState(null);
    const [hoverInfo, setHoverInfo] = useState(null);
    const [cursorCoords, setCursorCoords] = useState(null);

    const handleMove = useCallback((event) => {
        dispatchViewState({ type: 'move', viewState: event.viewState });
    }, []);

    const flightsLayerActive = activeLayers.includes('flights');
    const vesselsLayerActive = activeLayers.includes('vessels');
    const weatherLayerActive = activeLayers.includes('weather');
    const styleFallbackLevel = styleFallbackState.mapStyleKey === mapStyle ? styleFallbackState.level : 0;
    const activeMapStyle = resolveMapStyle(mapStyle, styleFallbackLevel);
    const activeMapStyleKey = styleCacheKey(mapStyle, styleFallbackLevel, activeMapStyle);

    useEffect(() => {
        dispatchViewState({ type: 'target', viewTarget });
    }, [viewTarget]);

    useEffect(() => {
        if (!weatherLayerActive) return undefined;
        let cancelled = false;
        fetchRainviewerTiles()
            .then((payload) => {
                if (!cancelled && payload?.tiles?.length) setRainviewerTiles(payload);
            })
            .catch(() => { /* radar overlay optional */ });
        return () => { cancelled = true; };
    }, [weatherLayerActive]);

    const advanceStyleFallback = useCallback(() => {
        setStyleFallbackState((state) => {
            const level = state.mapStyleKey === mapStyle ? state.level : 0;
            return {
                mapStyleKey: mapStyle,
                level: level >= 2 ? level : level + 1,
            };
        });
    }, [mapStyle]);

    const handleMapError = useCallback((event) => {
        // Tile/source/raster failures are expected — do not swap basemap (that wipes addImage sprites).
        if (event?.sourceId || event?.tile || event?.source) return;

        const message = event?.error?.message || event?.message || '';
        if (message && !/style|stylesheet|glyph/i.test(message)) return;

        advanceStyleFallback();
    }, [advanceStyleFallback]);

    // Wire MapLibre's runtime error events. react-map-gl's <Map onError> only
    // surfaces some errors; the underlying map.on('error') is the canonical hook
    // that fires for tile load failures, source errors, and style errors.
    useEffect(() => {
        const map = mapRef.current?.getMap?.();
        if (!map) return undefined;
        const handler = (e) => {
            const sourceId = e?.sourceId || e?.source?.id || e?.error?.sourceId;
            if (sourceId) {
                setFailedSources((prev) => {
                    if (prev.has(sourceId)) return prev;
                    const next = new Set(prev);
                    next.add(sourceId);
                    return next;
                });
                return;
            }

            const message = e?.error?.message || e?.message || '';
            if (message && /style|stylesheet|glyph/i.test(message)) {
                advanceStyleFallback();
            }
        };
        map.on('error', handler);
        return () => { map.off('error', handler); };
    }, [mapStyle, advanceStyleFallback]);

    // Load custom SVG icons into the MapLibre sprite; re-run on style change
    // because setStyle() wipes all user-added images.
    const loadMapIcons = useCallback(() => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        loadTrafficIcons(map);
    }, []);

    const handleMapLoad = useCallback(() => {
        setMapReady(true);
        loadMapIcons();
        const map = mapRef.current?.getMap?.();
        if (map && typeof window !== 'undefined') {
            window.__GM_MAP__ = map;
        }
    }, [loadMapIcons]);

    useEffect(() => {
        if (!mapReady) {
            setTrafficDeferredReady(false);
            return undefined;
        }
        const timer = window.setTimeout(() => setTrafficDeferredReady(true), TRAFFIC_DEFER_MS);
        return () => window.clearTimeout(timer);
    }, [mapReady]);

    useEffect(() => {
        if (!mapReady) return undefined;
        loadMapIcons();
        const map = mapRef.current?.getMap?.();
        if (!map) return undefined;

        map.on('style.load', loadMapIcons);
        return () => { map.off('style.load', loadMapIcons); };
    }, [mapReady, activeMapStyleKey, loadMapIcons]);

    const handleMouseMove = useCallback((event) => {
        setCursorCoords({ lng: event.lngLat.lng, lat: event.lngLat.lat });
        const feature = event.features?.find(
            (f) => HOVER_LAYERS.includes(f.layer?.id)
        );
        if (feature) {
            const [longitude, latitude] = feature.geometry?.coordinates || [];
            if (isValidLngLat(longitude, latitude)) {
                setHoverInfo({ longitude, latitude, feature });
            } else {
                setHoverInfo(null);
            }
        } else {
            setHoverInfo(null);
        }
    }, []);
    const handleMouseLeave = useCallback(() => {
        setHoverInfo(null);
        setCursorCoords(null);
    }, []);

    const disasterResource = useLiveResource(useCallback(() => fetchNaturalDisasters(), []), {
        cacheKey: 'map:disasters',
        enabled: activeLayers.includes('disasters'),
        intervalMs: 120 * 1000,
        isUsable: hasFeatureData
    });
    const conflictResource = useLiveResource(useCallback(() => fetchConflictsAndCrises(), []), {
        cacheKey: 'map:conflicts',
        enabled: activeLayers.includes('conflicts'),
        intervalMs: 120 * 1000,
        isUsable: hasFeatureData
    });
    const weatherResource = useLiveResource(useCallback(() => fetchLiveWeather(), []), {
        cacheKey: 'map:weather',
        enabled: activeLayers.includes('weather'),
        intervalMs: 120 * 1000,
        isUsable: hasFeatureData
    });
    const economyResource = useLiveResource(useCallback(() => fetchMacroEconomy(), []), {
        cacheKey: 'map:economy',
        enabled: activeLayers.includes('economy'),
        intervalMs: 120 * 1000,
        isUsable: hasFeatureData
    });
    const aqiResource = useLiveResource(useCallback(() => fetchAirQuality(), []), {
        cacheKey: 'map:aqi',
        enabled: activeLayers.includes('aqi'),
        intervalMs: 120 * 1000,
        isUsable: hasFeatureData
    });
    const sdgResource = useLiveResource(useCallback(() => fetchSdgLayer(), []), {
        cacheKey: 'map:sdg',
        enabled: activeLayers.includes('sdg'),
        intervalMs: 24 * 60 * 60 * 1000,
        isUsable: (d) => d?.features?.length > 0
    });
    const firmsResource = useLiveResource(useCallback(() => fetchFirmsData(viewMode), [viewMode]), {
        cacheKey: `map:firms:${viewMode}`,
        enabled: activeLayers.includes('firms'),
        intervalMs: 10 * 60 * 1000,
        isUsable: hasFeatureData
    });
    const infraResource = useLiveResource(useCallback(() => fetchInfrastructure(), []), {
        cacheKey: 'map:infrastructure',
        enabled: activeLayers.includes('infrastructure'),
        intervalMs: 10 * 60 * 1000,
        isUsable: hasFeatureData
    });
    const flightsResource = useLiveResource(useCallback(() => fetchFlights(TRAFFIC_THEATER), []), {
        cacheKey: `map:flights:${TRAFFIC_THEATER}`,
        enabled: activeLayers.includes('flights'),
        freezeAfterLoad: true,
        isUsable: hasFeatureData,
        maxRetries: 2,
        maxStaleMs: 20 * 60 * 1000
    });
    const acledResource = useLiveResource(useCallback(() => fetchAcledEvents(viewMode), [viewMode]), {
        cacheKey: `map:acled:${viewMode}`,
        enabled: activeLayers.includes('conflicts'),
        intervalMs: 60 * 60 * 1000,
        isUsable: hasFeatureData
    });
    const vesselsResource = useLiveResource(useCallback(() => fetchVessels(TRAFFIC_THEATER), []), {
        cacheKey: `map:vessels:${TRAFFIC_THEATER}`,
        enabled: activeLayers.includes('vessels'),
        freezeAfterLoad: true,
        isUsable: (payload) => hasFeatureData(payload) || payload?.meta?.requiresKey,
        maxRetries: 2,
        maxStaleMs: 20 * 60 * 1000
    });

    const disastersData = disasterResource.data;
    const crisesData = conflictResource.data;
    const weatherData = weatherResource.data;
    const economyData = economyResource.data;
    const aqiData = aqiResource.data;
    const sdgData = sdgResource.data;
    const firmsData = firmsResource.data;
    const infraData = infraResource.data;
    const globalFlightsData = flightsResource.data;
    const globalVesselsData = vesselsResource.data;

    /** Session-frozen GeoJSON — computed once on first fetch, never rebuilt on pan/zoom. */
    const sessionFlightsRef = useRef(null);
    const sessionFlightsMetaRef = useRef({ capped: false, total: 0 });
    const flightsGeoJson = useMemo(() => {
        if (sessionFlightsRef.current) return sessionFlightsRef.current;
        const sanitized = sanitizePointCollection(globalFlightsData);
        if (!sanitized?.features?.length) return null;
        const { collection, capped, totalInView } = spreadSamplePointCollection(sanitized, TRAFFIC_SESSION_MAX_FLIGHTS);
        sessionFlightsRef.current = collection;
        sessionFlightsMetaRef.current = { capped, total: totalInView };
        return collection;
    }, [globalFlightsData]);

    const sessionVesselsRef = useRef(null);
    const sessionVesselsMetaRef = useRef({ capped: false, total: 0 });
    const vesselsGeoJson = useMemo(() => {
        if (sessionVesselsRef.current) return sessionVesselsRef.current;
        const sanitized = sanitizePointCollection(globalVesselsData);
        if (!sanitized?.features?.length) return null;
        const { collection, capped, totalInView } = spreadSamplePointCollection(sanitized, TRAFFIC_SESSION_MAX_VESSELS);
        sessionVesselsRef.current = collection;
        sessionVesselsMetaRef.current = { capped, total: totalInView };
        return collection;
    }, [globalVesselsData]);

    const trafficLayersReady = mapReady && trafficDeferredReady;
    const visibleFlightCount = flightsGeoJson?.features?.length ?? 0;
    const visibleVesselCount = vesselsGeoJson?.features?.length ?? 0;
    const flightsGlobalTotal = sessionFlightsMetaRef.current.total || (globalFlightsData?.features?.length ?? 0);
    const vesselsGlobalTotal = sessionVesselsMetaRef.current.total || (globalVesselsData?.features?.length ?? 0);
    const flightsCapped = sessionFlightsMetaRef.current.capped;
    const vesselsCapped = sessionVesselsMetaRef.current.capped;
    const globalFlightCount = globalFlightsData?.features?.length ?? 0;
    const globalVesselCount = globalVesselsData?.features?.length ?? 0;
    const flightSourceLabel = flightsResource.isStale || globalFlightsData?.__meta?.status === 'stale'
        ? 'ADS-B stale'
        : 'ADS-B';
    const vesselsNeedKey = globalVesselsData?.meta?.requiresKey;
    const vesselMeta = globalVesselsData?.meta;
    const vesselSourceLabel = formatVesselSourceLabel(vesselMeta);
    const axiomOverwatchActive = vesselMeta?.aisSource === 'axiom-overwatch'
        || vesselMeta?.source?.includes('axiom-overwatch');
    const prevFlightStatsRef = useRef(null);
    useEffect(() => {
        const next = {
            apiTotal: globalFlightCount,
            rendered: visibleFlightCount,
            total: flightsGlobalTotal,
            capped: flightsCapped,
        };
        const prev = prevFlightStatsRef.current;
        if (
            prev
            && prev.apiTotal === next.apiTotal
            && prev.rendered === next.rendered
            && prev.total === next.total
            && prev.capped === next.capped
        ) return;
        prevFlightStatsRef.current = next;
        setFlightStats(next);
    }, [globalFlightCount, visibleFlightCount, flightsGlobalTotal, flightsCapped]);

    const prevVesselStatsRef = useRef(null);
    useEffect(() => {
        const next = {
            apiTotal: globalVesselCount,
            rendered: visibleVesselCount,
            total: vesselsGlobalTotal,
            capped: vesselsCapped,
        };
        const prev = prevVesselStatsRef.current;
        if (
            prev
            && prev.apiTotal === next.apiTotal
            && prev.rendered === next.rendered
            && prev.total === next.total
            && prev.capped === next.capped
        ) return;
        prevVesselStatsRef.current = next;
        setVesselStats(next);
    }, [globalVesselCount, visibleVesselCount, vesselsGlobalTotal, vesselsCapped]);

    const acledData = useMemo(() => sanitizePointCollection(acledResource.data), [acledResource.data]);
    const publicSentinelLayerId = getPublicSentinelLayerId(copernicusMode);
    const publicSentinelLayer = getEoLayerById(publicSentinelLayerId);
    const publicOverlayVisible = Boolean(
        showCopernicusOverlay
        && copernicusRuntimeSource === 'public'
        && publicSentinelLayer
    );
    const copernicusOverlayVisible = Boolean(
        showCopernicusOverlay
        && copernicusRuntimeSource === 'copernicus'
        && copernicusPreview?.available
        && copernicusPreview?.imageDataUrl
        && Array.isArray(copernicusPreview?.bounds?.bbox)
    );
    const copernicusFootprint = copernicusOverlayVisible ? toFootprintFeature(copernicusPreview) : null;

    const renderMarkers = (data, catClass) => {
        if (!data?.features) return null;

        return data.features.map((feature, index) => {
            const [lng, lat] = feature.geometry?.coordinates || [];
            if (!isValidLngLat(lng, lat)) return null;
            const key = feature.properties.id || `${catClass}-${index}`;
            const markerColor = feature.properties.color || '';

            return (
                <Marker
                    key={key}
                    longitude={lng}
                    latitude={lat}
                    anchor="center"
                    onClick={(event) => {
                        event.originalEvent.stopPropagation();
                        onMarkerClick(feature);
                    }}
                >
                    <div
                        className={`pulse-marker ${catClass}`}
                        style={markerColor ? { '--marker-color': markerColor } : {}}
                    />
                </Marker>
            );
        });
    };

    return (
        <div className="map-wrapper">
            <Map
                ref={mapRef}
                mapLib={maplibregl}
                minZoom={MAP_MIN_ZOOM}
                maxZoom={MAP_MAX_ZOOM}
                renderWorldCopies={false}
                maxPitch={60}
                pitchWithRotate
                dragRotate
                touchZoomRotate
                {...viewState}
                onMove={handleMove}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onLoad={handleMapLoad}
                onError={handleMapError}
                interactiveLayerIds={HOVER_LAYERS}
                style={{ width: '100%', height: '100%' }}
                mapStyle={activeMapStyle}
            >
                {showStrategicContext && (
                    <>
                        <Source id="strategic-zones" type="geojson" data={STRATEGIC_ZONES}>
                            <Layer
                                id="strategic-zones-fill"
                                type="fill"
                                paint={{
                                    'fill-color': ['get', 'fill'],
                                    'fill-opacity': 0.08
                                }}
                            />
                            <Layer
                                id="strategic-zones-line"
                                type="line"
                                paint={{
                                    'line-color': ['get', 'line'],
                                    'line-width': 1.4,
                                    'line-opacity': 0.42,
                                    'line-dasharray': [2, 2]
                                }}
                            />
                        </Source>

                        <Source id="operational-corridors" type="geojson" data={OPERATIONAL_CORRIDORS}>
                            <Layer
                                id="operational-corridors-glow"
                                type="line"
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': ['get', 'glow'],
                                    'line-opacity': 0.08,
                                    'line-blur': 1.3
                                }}
                            />
                            <Layer
                                id="operational-corridors-core"
                                type="line"
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': ['get', 'width'],
                                    'line-opacity': 0.55
                                }}
                            />
                        </Source>

                        <Source id="anchor-points" type="geojson" data={ANCHOR_POINTS}>
                            <Layer
                                id="anchor-points-glow"
                                type="circle"
                                paint={{
                                    'circle-color': ['get', 'color'],
                                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, ['get', 'radius'], 8, ['*', ['get', 'radius'], 1.8]],
                                    'circle-opacity': 0.07,
                                    'circle-blur': 0.7
                                }}
                            />
                            <Layer
                                id="anchor-points-core"
                                type="circle"
                                paint={{
                                    'circle-color': ['get', 'color'],
                                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2, 8, 4],
                                    'circle-opacity': 0.45
                                }}
                            />
                        </Source>

                        <Source id="urban-megaregions" type="geojson" data={URBAN_MEGAREGIONS}>
                            <Layer
                                id="urban-megaregions-extrusion"
                                type="fill-extrusion"
                                paint={{
                                    'fill-extrusion-color': ['get', 'color'],
                                    'fill-extrusion-height': ['get', 'height'],
                                    'fill-extrusion-base': ['get', 'base'],
                                    'fill-extrusion-opacity': 0.18
                                }}
                            />
                            <Layer
                                id="urban-megaregions-outline"
                                type="line"
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': 1.2,
                                    'line-opacity': 0.35
                                }}
                            />
                        </Source>

                        <Source id="city-network" type="geojson" data={CITY_NETWORK}>
                            <Layer
                                id="city-network-glow"
                                type="line"
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': 6,
                                    'line-opacity': 0.06
                                }}
                            />
                            <Layer
                                id="city-network-core"
                                type="line"
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': 1.3,
                                    'line-opacity': 0.32,
                                    'line-dasharray': [1, 1.6]
                                }}
                            />
                        </Source>

                        <Source id="city-beacons" type="geojson" data={CITY_BEACONS}>
                            <Layer
                                id="city-beacons-glow"
                                type="circle"
                                paint={{
                                    'circle-color': ['get', 'color'],
                                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 10, 8, 16],
                                    'circle-opacity': 0.08,
                                    'circle-blur': 0.8
                                }}
                            />
                            <Layer
                                id="city-beacons-core"
                                type="circle"
                                paint={{
                                    'circle-color': ['get', 'color'],
                                    'circle-radius': ['get', 'radius'],
                                    'circle-opacity': 0.2,
                                    'circle-stroke-color': ['get', 'color'],
                                    'circle-stroke-width': 1.2,
                                    'circle-stroke-opacity': 0.45
                                }}
                            />
                            <Layer
                                id="city-beacons-label"
                                type="symbol"
                                layout={{
                                    'text-field': ['get', 'name'],
                                    'text-size': 11,
                                    'text-font': ['Open Sans Bold'],
                                    'text-offset': [0, 1.25],
                                    'text-anchor': 'top'
                                }}
                                paint={{
                                    'text-color': '#dbeafe',
                                    'text-halo-color': 'rgba(5, 14, 32, 0.9)',
                                    'text-halo-width': 1
                                }}
                            />
                        </Source>
                    </>
                )}

                {activeLayers.includes('weather') && rainviewerTiles?.tiles?.length > 0 && (
                    <Source
                        id="rainviewer"
                        type="raster"
                        tiles={rainviewerTiles.tiles}
                        tileSize={256}
                        maxzoom={rainviewerTiles.maxzoom || 12}
                    >
                        <Layer
                            id="rainviewer-layer"
                            type="raster"
                            maxzoom={rainviewerTiles.maxzoom || 12}
                            paint={{ 'raster-opacity': 0.42 }}
                        />
                    </Source>
                )}

                {publicOverlayVisible && (
                    <Source
                        id="public-sentinel-overlay"
                        type="raster"
                        tiles={publicSentinelLayer.tiles}
                        tileSize={publicSentinelLayer.tileSize || 256}
                        attribution={publicSentinelLayer.attribution}
                        maxzoom={publicSentinelLayer.maxzoom || 8}
                    >
                        <Layer
                            id="public-sentinel-overlay-layer"
                            type="raster"
                            paint={{
                                'raster-opacity': copernicusMode === 'ndvi' ? 0.48 : 0.36,
                                'raster-fade-duration': 500
                            }}
                        />
                    </Source>
                )}

                {/* Earth Observation Satellite Tile Layers */}
                {EO_TILE_LAYERS.map((eoLayer) => {
                    if (!activeLayers.includes(eoLayer.id)) return null;
                    if (publicOverlayVisible && eoLayer.id === publicSentinelLayerId) return null;
                    return (
                        <Source
                            key={eoLayer.id}
                            id={eoLayer.id}
                            type="raster"
                            tiles={eoLayer.tiles}
                            tileSize={eoLayer.tileSize || 256}
                            attribution={eoLayer.attribution}
                            maxzoom={eoLayer.maxzoom || 8}
                        >
                            <Layer
                                id={`${eoLayer.id}-layer`}
                                type="raster"
                                maxzoom={eoLayer.maxzoom || 8}
                                paint={{ 'raster-opacity': eoLayer.opacity || 0.6 }}
                            />
                        </Source>
                    );
                })}

                {copernicusOverlayVisible && (
                    <>
                        <Source
                            id="copernicus-preview-image"
                            type="image"
                            url={copernicusPreview.imageDataUrl}
                            coordinates={toImageCoordinates(copernicusPreview.bounds.bbox)}
                        >
                            <Layer
                                id="copernicus-preview-layer"
                                type="raster"
                                paint={{
                                    'raster-opacity': copernicusPreview.preset === 'ndvi' ? 0.72 : 0.78,
                                    'raster-fade-duration': 500
                                }}
                            />
                        </Source>

                        {copernicusFootprint && (
                            <Source id="copernicus-preview-footprint" type="geojson" data={copernicusFootprint}>
                                <Layer
                                    id="copernicus-preview-footprint-fill"
                                    type="fill"
                                    paint={{
                                        'fill-color': copernicusPreview.preset === 'ndvi' ? '#10b981' : '#38bdf8',
                                        'fill-opacity': 0.08
                                    }}
                                />
                                <Layer
                                    id="copernicus-preview-footprint-line"
                                    type="line"
                                    paint={{
                                        'line-color': copernicusPreview.preset === 'ndvi' ? '#10b981' : '#38bdf8',
                                        'line-width': 1.5,
                                        'line-dasharray': [2, 2],
                                        'line-opacity': 0.75
                                    }}
                                />
                            </Source>
                        )}
                    </>
                )}

                {/* UN SDG Choropleth Layer */}
                {activeLayers.includes('sdg') && sdgData && (
                    <Source id="sdg-data" type="geojson" data={sdgData}>
                        {/* Country Fill */}
                        <Layer
                            id="sdg-fill"
                            type="fill"
                            paint={{
                                'fill-color': [
                                    'step',
                                    ['coalesce', ['get', 'sdgValue'], 0],
                                    'rgba(148, 163, 184, 0.2)', // 0 (or null fallback) = grey
                                    20, '#fca5a5',             // 0-20% = light red
                                    40, '#f87171',             // 20-40% = red
                                    60, '#fcd34d',             // 40-60% = yellow
                                    80, '#86efac',             // 60-80% = light green
                                    95, '#4ade80',             // 80-95% = green
                                    100, '#22c55e'             // >95% = dark green
                                ],
                                'fill-opacity': 0.4
                            }}
                        />
                        {/* Country Outline */}
                        <Layer
                            id="sdg-line"
                            type="line"
                            paint={{
                                'line-color': 'var(--ink-3)',
                                'line-width': 1
                            }}
                        />
                    </Source>
                )}

                {/* FIRMS Fire/Strike Layer */}
                {activeLayers.includes('firms') && firmsData?.features?.length > 0 && (
                    <Source id="firms-data" type="geojson" data={firmsData}>
                        <Layer
                            id="firms-heatmap"
                            type="heatmap"
                            maxzoom={8}
                            paint={{
                                'heatmap-weight': ['interpolate', ['linear'], ['get', 'frp'], 0, 0.1, 50, 0.5, 200, 1],
                                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.3, 7, 1],
                                'heatmap-color': [
                                    'interpolate', ['linear'], ['heatmap-density'],
                                    0, 'rgba(0,0,0,0)',
                                    0.2, 'rgba(255,100,50,0.15)',
                                    0.4, 'rgba(255,80,30,0.3)',
                                    0.6, 'rgba(255,50,20,0.5)',
                                    0.8, 'rgba(255,30,10,0.7)',
                                    1, 'rgba(255,255,100,0.9)'
                                ],
                                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 8, 6, 20, 8, 30],
                                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 8, 0]
                            }}
                        />
                        <Layer
                            id="firms-circles"
                            type="circle"
                            minzoom={5}
                            paint={{
                                'circle-color': [
                                    'case',
                                    ['==', ['get', 'confidence'], 'high'], '#ff3b30',
                                    ['==', ['get', 'confidence'], 'h'], '#ff3b30',
                                    '#ff8c42'
                                ],
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 8, 4, 12, 8],
                                'circle-opacity': 0.8,
                                'circle-blur': 0.3,
                                'circle-stroke-width': 0.5,
                                'circle-stroke-color': 'var(--ink-3)'
                            }}
                        />
                    </Source>
                )}

                {/* Infrastructure Layer */}
                {activeLayers.includes('infrastructure') && infraData?.features?.length > 0 && (
                    <Source id="infrastructure-data" type="geojson" data={infraData}>
                        <Layer
                            id="infra-circles"
                            type="circle"
                            paint={{
                                'circle-color': [
                                    'match', ['get', 'status'],
                                    'alert', '#ef4444',
                                    'damaged', '#ef4444',
                                    'closed', '#dc2626',
                                    'at_risk', '#f59e0b',
                                    'intermittent', '#f59e0b',
                                    'monitoring', '#eab308',
                                    '#22c55e'
                                ],
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 8, 8],
                                'circle-opacity': 0.7,
                                'circle-stroke-width': 1.5,
                                'circle-stroke-color': [
                                    'match', ['get', 'status'],
                                    'alert', '#ef4444',
                                    'damaged', '#ef4444',
                                    'closed', '#dc2626',
                                    'at_risk', '#f59e0b',
                                    'intermittent', '#f59e0b',
                                    'monitoring', '#eab308',
                                    '#22c55e'
                                ],
                                'circle-stroke-opacity': 0.3
                            }}
                        />
                        <Layer
                            id="infra-labels"
                            type="symbol"
                            minzoom={6}
                            layout={{
                                'text-field': ['get', 'name'],
                                'text-size': 10,
                                'text-font': ['Open Sans Regular'],
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top'
                            }}
                            paint={{
                                'text-color': 'var(--ink-2)',
                                'text-halo-color': 'rgba(0,0,0,0.8)',
                                'text-halo-width': 1
                            }}
                        />
                    </Source>
                )}

                {/* Flights Layer — icons only (no heatmap/path vectors; WebGL budget) */}
                {trafficLayersReady && flightsLayerActive && visibleFlightCount > 0 && (
                    <Source id="flights-data" type="geojson" data={flightsGeoJson}>
                        <Layer
                            id="flights-icons"
                            type="symbol"
                            layout={{
                                'icon-image': FLIGHT_ICON_IMAGE,
                                'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 1.2, 3, 1.5, 5, 1.8, 7, 1.7, 10, 1.5],
                                'icon-rotate': ['get', 'heading'],
                                'icon-rotation-alignment': 'map',
                                'icon-allow-overlap': true,
                                'icon-ignore-placement': true,
                                'icon-pitch-alignment': 'map',
                            }}
                            paint={{
                                'icon-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.9, 6, 0.96, 10, 1]
                            }}
                        />
                        <Layer
                            id="flights-labels"
                            type="symbol"
                            minzoom={7}
                            layout={{
                                'text-field': ['coalesce', ['get', 'callsign'], ['get', 'hex'], ''],
                                'text-size': 9,
                                'text-font': ['Open Sans Regular'],
                                'text-offset': [0, 1.3],
                                'text-anchor': 'top',
                                'text-allow-overlap': false,
                                'text-optional': true,
                            }}
                            paint={{
                                'text-color': '#fde68a',
                                'text-halo-color': 'rgba(0,0,0,0.8)',
                                'text-halo-width': 1,
                            }}
                        />
                    </Source>
                )}

                {/* ACLED Conflict Events Layer */}
                {activeLayers.includes('conflicts') && acledData?.features?.length > 0 && (
                    <Source id="acled-data" type="geojson" data={acledData}>
                        <Layer
                            id="acled-heatmap"
                            type="heatmap"
                            maxzoom={7}
                            paint={{
                                'heatmap-weight': ['interpolate', ['linear'], ['get', 'fatalities'], 0, 0.2, 10, 0.6, 50, 1],
                                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 6, 1],
                                'heatmap-color': [
                                    'interpolate', ['linear'], ['heatmap-density'],
                                    0, 'rgba(0,0,0,0)',
                                    0.15, 'rgba(255,200,50,0.12)',
                                    0.3, 'rgba(255,120,30,0.25)',
                                    0.5, 'rgba(255,60,20,0.45)',
                                    0.7, 'rgba(200,20,10,0.65)',
                                    1, 'rgba(180,0,0,0.85)'
                                ],
                                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 12, 5, 25, 7, 35],
                                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 8, 0]
                            }}
                        />
                        <Layer
                            id="acled-circles"
                            type="circle"
                            minzoom={5}
                            paint={{
                                'circle-color': [
                                    'match', ['get', 'eventType'],
                                    'Battles', '#ef4444',
                                    'Explosions/Remote violence', '#f97316',
                                    'Violence against civilians', '#dc2626',
                                    'Strategic developments', '#3b82f6',
                                    '#f59e0b'
                                ],
                                'circle-radius': [
                                    'interpolate', ['linear'],
                                    ['coalesce', ['get', 'fatalities'], 0],
                                    0, 3, 5, 5, 20, 8, 100, 14
                                ],
                                'circle-opacity': 0.75,
                                'circle-stroke-width': 1,
                                'circle-stroke-color': 'var(--ink-3)'
                            }}
                        />
                    </Source>
                )}

                {/* Vessels Layer — icons only (no heatmap/path vectors; WebGL budget) */}
                {trafficLayersReady && vesselsLayerActive && visibleVesselCount > 0 && (
                    <Source id="vessels-data" type="geojson" data={vesselsGeoJson}>
                        <Layer
                            id="vessels-icons"
                            type="symbol"
                            layout={{
                                'icon-image': VESSEL_ICON_IMAGE,
                                'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 1.0, 3, 1.25, 5, 1.5, 7, 1.4, 10, 1.2],
                                'icon-rotate': ['get', 'heading'],
                                'icon-rotation-alignment': 'map',
                                'icon-allow-overlap': true,
                                'icon-ignore-placement': true,
                                'icon-pitch-alignment': 'map',
                            }}
                            paint={{
                                'icon-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.88, 6, 0.94, 10, 0.98],
                            }}
                        />
                        <Layer
                            id="vessels-labels"
                            type="symbol"
                            minzoom={6}
                            layout={{
                                'text-field': ['coalesce', ['get', 'name'], ''],
                                'text-size': 10,
                                'text-font': ['Open Sans Regular'],
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top',
                                'text-allow-overlap': false,
                                'text-optional': true,
                            }}
                            paint={{
                                'text-color': '#e2e8f0',
                                'text-halo-color': 'rgba(0,0,0,0.75)',
                                'text-halo-width': 1,
                            }}
                        />
                    </Source>
                )}

                {hoverInfo && (() => {
                    const hoverLayerId = hoverInfo.feature.layer?.id;
                    const tooltipClass = [
                        'traffic-tooltip',
                        hoverLayerId === 'vessels-icons' || hoverLayerId === 'vessels-labels' ? 'traffic-tooltip--vessel'
                            : hoverLayerId === 'flights-icons' || hoverLayerId === 'flights-labels' ? 'traffic-tooltip--flight'
                                : hoverLayerId === 'acled-circles' ? 'traffic-tooltip--conflict'
                                    : hoverLayerId === 'firms-circles' ? 'traffic-tooltip--heat'
                                        : null,
                    ].filter(Boolean).join(' ');

                    return (
                    <Popup
                        longitude={hoverInfo.longitude}
                        latitude={hoverInfo.latitude}
                        anchor="bottom"
                        closeButton={false}
                        closeOnClick={false}
                        offset={[0, -8]}
                        className={tooltipClass}
                    >
                        {(() => {
                            const p = hoverInfo.feature.properties || {};
                            const layerId = hoverInfo.feature.layer?.id;
                            if (layerId === 'acled-circles') {
                                return (
                                    <div className="traffic-tooltip-content">
                                        <div className="traffic-tooltip-header">{p.eventType || 'Conflict event'}</div>
                                        <div className="traffic-tooltip-row">
                                            <span>Location</span>
                                            <span>{[p.region, p.country].filter(Boolean).join(', ') || '—'}</span>
                                        </div>
                                        <div className="traffic-tooltip-row">
                                            <span>Fatalities</span>
                                            <span>{p.fatalities ?? 0}</span>
                                        </div>
                                        <div className="traffic-tooltip-row">
                                            <span>Actor</span>
                                            <span>{p.actor1 || '—'}</span>
                                        </div>
                                        {p.date && (
                                            <div className="traffic-tooltip-row">
                                                <span>Date</span>
                                                <span>{p.date}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            if (layerId === 'firms-circles') {
                                return (
                                    <div className="traffic-tooltip-content">
                                        <div className="traffic-tooltip-header">Thermal signature</div>
                                        <div className="traffic-tooltip-row">
                                            <span>Confidence</span>
                                            <span>{p.confidence || '—'}</span>
                                        </div>
                                        <div className="traffic-tooltip-row">
                                            <span>FRP</span>
                                            <span>{p.frp != null ? `${Math.round(p.frp)} MW` : '—'}</span>
                                        </div>
                                        {p.name && (
                                            <div className="traffic-tooltip-row">
                                                <span>Area</span>
                                                <span>{p.name}</span>
                                            </div>
                                        )}
                                        {p.satellite && (
                                            <div className="traffic-tooltip-row">
                                                <span>Satellite</span>
                                                <span>{p.satellite}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            const isFlight = layerId === 'flights-icons' || layerId === 'flights-labels' || p.hex;
                            if (isFlight) {
                                const header = p.callsign ? p.callsign.toUpperCase() : p.hex;
                                return (
                                    <div className="traffic-tooltip-content">
                                        <div className="traffic-tooltip-header">{header}</div>
                                        <div className="traffic-tooltip-row">
                                            <span>Altitude</span>
                                            <span>{Math.round(p.altitude)} m</span>
                                        </div>
                                        <div className="traffic-tooltip-row">
                                            <span>Speed</span>
                                            <span>{Math.round((p.velocity || 0) * 1.94384)} kt</span>
                                        </div>
                                        <div className="traffic-tooltip-row">
                                            <span>Heading</span>
                                            <span>{Math.round(p.heading)}°</span>
                                        </div>
                                        <div className="traffic-tooltip-row">
                                            <span>Type</span>
                                            <span>{p.type || p.desc || '—'}</span>
                                        </div>
                                        {p.origin && (
                                            <div className="traffic-tooltip-row">
                                                <span>Route</span>
                                                <span>
                                                    {p.origin}
                                                    {p.destination ? ` → ${p.destination}` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <div className="traffic-tooltip-content">
                                    <div className="traffic-tooltip-header">{p.name || p.mmsi || 'Vessel'}</div>
                                    <div className="traffic-tooltip-row">
                                        <span>Type</span>
                                        <span>{p.category || '—'}</span>
                                    </div>
                                    <div className="traffic-tooltip-row">
                                        <span>Speed</span>
                                        <span>{p.speed} kt</span>
                                    </div>
                                    <div className="traffic-tooltip-row">
                                        <span>Course</span>
                                        <span>{Math.round(p.course)}°</span>
                                    </div>
                                    <div className="traffic-tooltip-row">
                                        <span>MMSI</span>
                                        <span>{p.mmsi}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </Popup>
                    );
                })()}

                {activeLayers.includes('conflicts') && renderSpatialAura(crisesData, 'conflicts', '#ef4444', 16)}
                {activeLayers.includes('disasters') && renderSpatialAura(disastersData, 'disasters', '#f59e0b', 14)}
                {activeLayers.includes('weather') && renderSpatialAura(weatherData, 'weather', '#38bdf8', 18)}
                {activeLayers.includes('economy') && renderSpatialAura(economyData, 'economy', '#FFC400', 12)}
                {activeLayers.includes('aqi') && renderSpatialAura(aqiData, 'aqi', '#10b981', 15)}

                {activeLayers.includes('disasters') && renderMarkers(disastersData, 'marker-disaster')}
                {activeLayers.includes('conflicts') && renderMarkers(crisesData, 'marker-conflict')}
                {activeLayers.includes('weather') && renderMarkers(weatherData, 'marker-weather')}
                {activeLayers.includes('economy') && renderMarkers(economyData, 'marker-economy')}
                {activeLayers.includes('aqi') && renderMarkers(aqiData, 'marker-aqi')}

                {/* Region dots (ASEAN capitals or Thai provinces). Rendered as
                    interactive markers so click → flyTo + per-country news. */}
                {regionDots?.features?.length > 0 && regionDots.features.map((f) => {
                    const [lng, lat] = f.geometry.coordinates;
                    return (
                        <Marker
                            key={f.properties.id}
                            longitude={lng}
                            latitude={lat}
                            anchor="center"
                            onClick={(event) => {
                                event.originalEvent.stopPropagation();
                                onRegionDotClick?.({ ...f.properties, longitude: lng, latitude: lat });
                            }}
                        >
                            <div
                                style={{
                                    width: 14,
                                    height: 14,
                                    background: f.properties.color || '#38bdf8',
                                    border: '1.5px solid var(--ink)',
                                    boxShadow: `0 0 12px ${f.properties.color || '#38bdf8'}cc`,
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s'
                                }}
                                title={f.properties.country || f.properties.region}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.4)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            />
                        </Marker>
                    );
                })}
            </Map>

            <div className="map-vignette" aria-hidden="true" />
            <div className="map-grid-overlay" aria-hidden="true" />

            <div className="map-coord-readout" aria-live="polite">
                <span className="map-coord-readout__label">Cursor position</span>
                {cursorCoords
                    ? `${formatCoord(cursorCoords.lat, 'lat')}  ${formatCoord(cursorCoords.lng, 'lng')}`
                    : 'Move cursor over map'}
            </div>

            {/* Tile-health badge — only renders when one or more raster sources have failed.
                Worst-case visibility per Dr Non / §12 (Stoic transparency). */}
            {failedSources.size > 0 && (
                <div
                    className="map-layer-warning"
                    title="Some map layers could not be loaded"
                >
                    <AlertTriangle size={11} />
                    <span>{failedSources.size} layer{failedSources.size === 1 ? '' : 's'} unavailable</span>
                </div>
            )}

            <div
                className="map-legend map-legend--traffic"
                style={{
                    top: 12,
                    bottom: 'auto',
                    right: 10,
                    left: 'auto',
                    visibility: (flightsLayerActive || vesselsLayerActive) ? 'visible' : 'hidden',
                    pointerEvents: (flightsLayerActive || vesselsLayerActive) ? 'auto' : 'none'
                }}
                aria-live="polite"
                aria-hidden={!(flightsLayerActive || vesselsLayerActive)}
            >
                <div className="map-legend-title">LIVE TRAFFIC</div>
                <div
                    className="map-legend-item"
                    style={{ visibility: flightsLayerActive ? 'visible' : 'hidden' }}
                >
                    <span className="map-legend-line" style={{ background: '#facc15' }} />
                    <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: '14ch', display: 'inline-block' }}>
                        {visibleFlightCount > 0
                            ? `${formatTrafficLegend({ rendered: visibleFlightCount, total: flightsGlobalTotal, capped: flightsCapped }) || visibleFlightCount.toLocaleString()} · ${flightSourceLabel}`
                            : globalFlightCount > 0
                                ? `${globalFlightCount.toLocaleString()} global · ${flightSourceLabel}`
                                : '… aircraft · ADS-B'}
                    </span>
                </div>
                <div
                    className="map-legend-item"
                    style={{ visibility: vesselsLayerActive ? 'visible' : 'hidden' }}
                >
                    <span
                        className="map-legend-line"
                        style={{ background: globalVesselCount > 0 ? '#22c55e' : 'rgba(245,158,11,0.35)' }}
                    />
                    <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: '14ch', display: 'inline-block' }}>
                        {visibleVesselCount > 0
                            ? `${formatTrafficLegend({ rendered: visibleVesselCount, total: vesselsGlobalTotal, capped: vesselsCapped }) || visibleVesselCount.toLocaleString()} · ${vesselSourceLabel}`
                            : globalVesselCount > 0
                                ? `${globalVesselCount.toLocaleString()} global · ${vesselSourceLabel}`
                                : vesselsNeedKey ? 'AIS key required' : 'Awaiting AIS feed…'}
                    </span>
                </div>
                {axiomOverwatchActive && vesselsLayerActive && (
                    <div className="map-legend-item map-legend-item--attribution">
                        <span>Ships via Axiom Overwatch · CC-BY 4.0</span>
                    </div>
                )}
            </div>

            <div
                className="map-legend map-legend--strategic"
                style={{
                    visibility: showStrategicContext ? 'visible' : 'hidden',
                    pointerEvents: showStrategicContext ? 'auto' : 'none'
                }}
                aria-hidden={!showStrategicContext}
            >
                    <div className="map-legend-title">STRATEGIC CONTEXT</div>
                    <div className="map-legend-item">
                        <span className="map-legend-line" style={{ background: '#ef4444' }} />
                        <span>Energy route reference</span>
                    </div>
                    <div className="map-legend-item">
                        <span className="map-legend-line" style={{ background: '#f59e0b' }} />
                        <span>Shipping lane reference</span>
                    </div>
                    <div className="map-legend-item">
                        <span className="map-legend-line" style={{ background: '#38bdf8' }} />
                        <span>Regional city network</span>
                    </div>
                    <div className="map-legend-title" style={{ marginTop: '6px' }}>REFERENCE ZONES</div>
                    <div className="map-legend-item">
                        <span className="map-legend-zone" style={{ background: 'rgba(239,68,68,0.3)', borderColor: '#fca5a5' }} />
                        <span>Persian Gulf focus area</span>
                    </div>
                    <div className="map-legend-item">
                        <span className="map-legend-zone" style={{ background: 'rgba(245,158,11,0.3)', borderColor: '#fcd34d' }} />
                        <span>Horn of Africa / Yemen</span>
                    </div>
                    <div className="map-legend-item">
                        <span className="map-legend-zone" style={{ background: 'rgba(16,185,129,0.3)', borderColor: '#6ee7b7' }} />
                        <span>ASEAN urban systems</span>
                    </div>
            </div>

            {/* Active EO Layer Labels */}
            {(() => {
                const activeEoLayers = EO_TILE_LAYERS.filter(l => activeLayers.includes(l.id));
                if (activeEoLayers.length === 0) return null;
                return (
                    <div className="map-eo-labels">
                        {activeEoLayers.map((layer) => (
                            <div key={layer.id} className="map-eo-label">
                                <span className="map-eo-label__name">{layer.name}</span>
                                <span className="map-eo-label__source">{layer.attribution}</span>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
};

export default MapContainer;
