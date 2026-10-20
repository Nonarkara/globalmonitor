import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl/maplibre';
import { AlertTriangle } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
// Must be imported before a Map is constructed: it points MapLibre at the
// bundled worker chunk. Without it no GeoJSON source ever loads.
import '../services/maplibreWorker.js';
import { fetchNaturalDisasters } from '../services/nasaEonet';
import { fetchSar } from '../services/sar';
import { fetchConflictsAndCrises } from '../services/reliefWeb';
import { fetchLiveWeather } from '../services/weather';
import { fetchMacroEconomy } from '../services/worldBank';
import { fetchAirQuality } from '../services/airQuality';
import { fetchFirmsData } from '../services/firms';
import { fetchWind, fetchTransportWind } from '../services/wind';
import { fetchTyphoon } from '../services/typhoon';
import { windBarbs } from '../utils/windBarbs';
import { fetchInfrastructure } from '../services/infrastructure';
import { fetchAirportLocations } from '../services/airports.js';
import { fetchFlights } from '../services/flights.js';
import { fetchVessels } from '../services/vessels.js';
import { fetchRainviewerTiles } from '../services/rainviewer.js';
import { fetchAcledEvents } from '../services/acled.js';
import { useLiveResource } from '../hooks/useLiveResource';
import { EO_TILE_LAYERS, getEoLayerById } from '../services/eoTiles';
import { getRegion } from '../data/regions.js';
import { THAILAND_BORDER_GEOJSON } from '../data/thailandBorders.js';
import { SUBMARINE_CABLES_GEOJSON } from '../data/submarineCables.js';
import { STRATEGIC_DAMS_GEOJSON } from '../data/strategicDams.js';
import { getStrikeRangeRingsGeoJson } from '../data/strikeRangeRings.js';
import { getConflictBlackoutsGeoJson } from '../data/conflictBlackouts.js';
import { getKineticTrajectoriesGeoJson, generateKineticPulsesGeoJson } from '../data/conflictKineticAnimations.js';
import { fetchMilitaryFlights, FALLBACK_MILITARY_FLIGHTS } from '../services/militaryFlights.js';
import { setFlightStats } from '../services/flightCountBus.js';
import { setVesselStats } from '../services/vesselCountBus.js';
import { isValidLngLat, sanitizePointCollection, spreadSamplePointCollection } from '../utils/geojsonValidate.js';
import { buildPopupClassName } from '../utils/mapPopup.js';
import { MARK, LEGEND_KEY, STRATEGIC_KEY, VESSEL_CLASSES, groundInk, wash } from '../data/mapPalette.js';
import { ESRI_SATELLITE_STYLE, OSM_RASTER_STYLE, ESRI_STREET_STYLE, ESRI_DARK_STYLE, MAP_STYLES, MAP_STYLE_FALLBACKS, MAP_STYLE_ULTIMATE } from '../data/basemaps';

/** Static traffic snapshot — one fetch per session, frozen until tab close. */
// Hand-typed demo events must show how old they are, not read as current.
/**
 * A row's key: every colour the map paints for that source, in order.
 *
 * One bar cannot speak for six vessel classes, and a bar that speaks for one
 * of them is a key that lies about the other five. The strip is the same
 * twenty pixels the bar occupied, segmented once per colour the map draws.
 */
const LegendKey = ({ marks }) => (
    <span
        className={`map-legend-key${marks.length > 2 ? ' map-legend-key--dense' : ''}`}
        aria-hidden="true"
    >
        {marks.map((m) => (
            <span key={m.mark} className="map-legend-chip" style={{ background: MARK[m.mark] }} />
        ))}
    </span>
);

/** The names of the marks a strip stands for, said in words under the reading. */
const LegendClasses = ({ marks }) => (
    <span className="map-legend-classes">{marks.map((m) => m.label).join(' · ')}</span>
);

const acledDemoRange = (features) => {
    const dates = (features || []).map((f) => f?.properties?.date).filter(Boolean).sort();
    if (!dates.length) return 'undated';
    return dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} → ${dates[dates.length - 1]}`;
};

const TRAFFIC_THEATER = 'global';
/** Cap rendered symbols — global pool, painted once (no viewport re-setData on pan). */
const TRAFFIC_SESSION_MAX_FLIGHTS = 1200;
const TRAFFIC_SESSION_MAX_VESSELS = 1200;
/** Defer heavy traffic GeoJSON until basemap + icons are stable (ms after map load). */
const TRAFFIC_DEFER_MS = 3000;
/** How long to wait for MapLibre's `load` before admitting the map is stuck.
    Generous: a slow link must not be reported as a broken map. */
const MAP_LOAD_STALL_MS = 30000;
const TRAFFIC_HOVER_THROTTLE_MS = 80;

const EMPTY_TRAFFIC_FC = Object.freeze({ type: 'FeatureCollection', features: [] });
/**
 * Survives MapContainer remount (ErrorBoundary recover) so pan stress does not drop traffic.
 * Module-scoped object: properties are mutated (never the binding reassigned), which keeps
 * the render path pure for react-hooks/globals while still outliving a remount.
 */
const moduleTrafficSession = {
    flights: null,
    flightsMeta: { capped: false, total: 0 },
    vessels: null,
    vesselsMeta: { capped: false, total: 0 },
};

const formatVesselSourceLabel = (meta) => {
    if (meta?.aisSource === 'axiom-overwatch' || meta?.source?.includes('axiom-overwatch')) {
        return 'Axiom Overwatch';
    }
    if (meta?.aisSource === 'static-snapshot') return 'AIS snapshot';
    return meta?.source?.replace('aisstream.io', 'AIS')?.replace('vesselfinder-fleet', 'fleet') || 'AIS';
};

/** Machine identifiers, said in words. A legend row should read like a
    source note, not like a log line. */
const FIRMS_SOURCE_LABELS = {
    'nasa-firms-public-24h': 'NASA FIRMS public file · 24h',
    'nasa-firms-live': 'NASA FIRMS live',
    'no_firms_key': 'no FIRMS key — nothing shown',
};

/** How many named cables the registry holds. Counted from the data, not typed
    in, so the plate cannot claim a number the map does not draw. */
const CABLE_COUNT = SUBMARINE_CABLES_GEOJSON?.features?.length || 0;

/** Month-scale window for the hand-typed demo events. "Mar 2026" says the
    events are months old without spending a line on six exact days. The
    full range stays available in the row's tooltip and the ACLED panel. */
const acledDemoWindow = (features) => {
    const dates = (features || []).map((f) => f?.properties?.date).filter(Boolean).sort();
    if (!dates.length) return 'date unknown';
    const first = dates[0];
    const last = dates[dates.length - 1];
    const month = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return null;
        return d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
    };
    const ma = month(first);
    const mb = month(last);
    if (!ma || !mb) return first;
    if (ma === mb) return `${ma} ${String(last).slice(0, 4)}`;
    if (String(first).slice(0, 4) === String(last).slice(0, 4)) {
        return `${ma}–${mb} ${String(last).slice(0, 4)}`;
    }
    return `${ma} ${String(first).slice(0, 4)} – ${mb} ${String(last).slice(0, 4)}`;
};

/** Exact UTC, compact. "19 Oct 17:15Z" — no invented precision, no ISO blob. */
const compactUtc = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getUTCDate();
    const mon = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${mon} ${hh}:${mm}Z`;
};

const HOVER_LAYERS = [
    'flights-icons', 'vessels-icons', 'airports-points', 'airports-labels', 'acled-circles', 'firms-circles',
    'cables-lines', 'dams-points', 'military-flights-icons', 'range-rings-lines', 'strike-origins-points',
    'blackout-center-core', 'blackout-zones-fill', 'kinetic-targets-core', 'kinetic-pulses-centers', 'kinetic-trajectories-line'
];

const formatCoord = (value, axis) => {
    const abs = Math.abs(value);
    const dir = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${abs.toFixed(4)}°${dir}`;
};

const sameHoverTarget = (current, next) => {
    if (!current || !next) return current === next;
    const currentProperties = current.feature?.properties || {};
    const nextProperties = next.feature?.properties || {};
    const currentId = currentProperties.id || currentProperties.hex || currentProperties.mmsi || currentProperties.ident;
    const nextId = nextProperties.id || nextProperties.hex || nextProperties.mmsi || nextProperties.ident;
    return current.longitude === next.longitude
        && current.latitude === next.latitude
        && current.feature?.layer?.id === next.feature?.layer?.id
        && currentId === nextId;
};
const MAP_MIN_ZOOM = 3; // §11.9 — regional dashboard floor, prevents world-copy repetition
const MAP_MAX_ZOOM = 18;
/* How much room a named tag must keep from a viewport edge before it is
   pushed back inside. */
const EDGE_TAG_MARGIN_PX = 8;

const buildTargetViewState = (viewTarget, fallbackTransitionDuration = 1500) => ({
    ...viewTarget,
    transitionDuration: viewTarget.transitionDuration ?? fallbackTransitionDuration,
});

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
                fill: MARK.zoneGulf,
                line: MARK.zoneGulf
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[94, -6], [109, -6], [109, 18], [94, 18], [94, -6]]]
            },
            properties: {
                fill: MARK.zoneSouthEast,
                line: MARK.zoneSouthEast
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[32, 11], [45, 11], [45, 22], [32, 22], [32, 11]]]
            },
            properties: {
                fill: MARK.zoneRedSea,
                line: MARK.zoneRedSea
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
                color: MARK.routeEnergy,
                width: 2.8,
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
                color: MARK.routeLane,
                width: 2.4,
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
                color: MARK.routeEast,
                width: 2.2,
                label: 'East Asia Trade Corridor (Shanghai → Singapore)'
            }
        }
    ]
};

const ANCHOR_POINTS = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [51.47, 25.28] }, properties: { color: '#a72144', radius: 10 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [55.36, 25.25] }, properties: { color: '#a72144', radius: 12 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [53.68, 32.42] }, properties: { color: '#a72144', radius: 11 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [100.5, 13.75] }, properties: { color: '#1a7444', radius: 12 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [103.82, 1.35] }, properties: { color: '#006eb8', radius: 11 } }
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
                color: '#1a7444',
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
                color: '#006eb8',
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
                color: '#a72144',
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
                color: '#4f4086',
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
                color: '#006eb8'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[100.5, 13.75], [106.82, -6.18], [103.82, 1.35], [121.56, 25.03]]
            },
            properties: {
                color: '#1a7444'
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
            properties: { name: 'Bangkok', tier: 'policy engine', color: '#1a7444', radius: 8 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [103.82, 1.35] },
            properties: { name: 'Singapore', tier: 'logistics core', color: '#006eb8', radius: 8 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [55.27, 25.2] },
            properties: { name: 'Dubai', tier: 'airspace hinge', color: '#a72144', radius: 8 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [121.56, 25.03] },
            properties: { name: 'Taipei', tier: 'tech nexus', color: '#f59e0b', radius: 7 }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [106.82, -6.18] },
            properties: { name: 'Jakarta', tier: 'metro scale', color: '#4f4086', radius: 7 }
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

// `featureColor` makes the aura take each feature's own colour instead of one
// flat tone. AQI needs it: the EPA band colour IS the reading, so a single
// green aura over an Unhealthy city would be a lie.
const renderSpatialAura = (data, id, color, baseRadius, { featureColor = false } = {}) => {
    if (!data?.features?.length) return null;
    const fill = featureColor ? ['coalesce', ['get', 'color'], color] : color;

    return (
        <Source id={`${id}-aura-source`} type="geojson" data={data}>
            <Layer
                id={`${id}-aura-layer`}
                type="circle"
                paint={{
                    'circle-color': fill,
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, baseRadius, 8, baseRadius * 2.4],
                    /* A zone, not a glow and not a reticle. The old version was
                       a blurred 8% disc — a HUD halo of importance around every
                       point. A flat translucent fill with a clean edge reads
                       as the area a crisis touches, and lets the point inside
                       carry the weight. */
                    'circle-opacity': 0.09,
                    'circle-blur': 0,
                    'circle-stroke-width': 0
                }}
            />
        </Source>
    );
};

// Inline MapLibre style spec for ESRI World Imagery — no API key required.
// Used as the satellite basemap because the MapTiler "hybrid" placeholder key that
// previously lived here was the literal docs example and rendered blank in production.


/** Basemap source ids — tile failures here trigger style fallback (not overlay layers). */
const BASEMAP_SOURCE_PATTERN = /^(carto|esri|openmaptiles|composite|basemap|demotiles|protomaps|osm)/i;

const resolveMapStyle = (mapStyleKey, fallbackLevel = 0) => {
    const primary = MAP_STYLES[mapStyleKey] || MAP_STYLES.topographic;
    if (fallbackLevel <= 0) return primary;
    if (fallbackLevel === 1) return MAP_STYLE_FALLBACKS[mapStyleKey] || OSM_RASTER_STYLE;
    if (fallbackLevel === 2) return MAP_STYLE_ULTIMATE;
    return OSM_RASTER_STYLE;
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
    mapStyle = 'topographic',
}) => {
    const region = getRegion(viewMode);
    const regionDots = region.dots;
    const initialViewStateRef = useRef(buildTargetViewState(viewTarget, 0));
    const mapRef = useRef(null);
    const wrapperRef = useRef(null);
    const basemapFailCountRef = useRef(0);
    // Track which raster sources have failed (auth / 404 / CORS / 5xx) so the
    // user sees what is missing instead of a silently-empty map.
    const [failedSources, setFailedSources] = useState(() => new Set());
    const failedSourcesRef = useRef(new Set());
    // MapLibre rejects a malformed layer spec by firing an 'error' event and
    // then carrying on — the layer is simply absent. Nothing tells the user,
    // so the legend can promise a reading the map never drew. Track it.
    const [rejectedLayers, setRejectedLayers] = useState(() => new Set());
    const rejectedLayersRef = useRef(new Set());

    const [mapReady, setMapReady] = useState(false);
    const [trafficDeferredReady, setTrafficDeferredReady] = useState(false);
    // MapLibre's `load` event fires only when every source has resolved. If
    // the worker cannot start, the basemap still paints but no data layer
    // ever loads and `load` never arrives. Silence would read as "no events";
    // this flag says the truth instead.
    const [mapLoadStalled, setMapLoadStalled] = useState(false);
    const [styleFallbackState, setStyleFallbackState] = useState(() => ({ mapStyleKey: mapStyle, level: 0 }));
    const [rainviewerTiles, setRainviewerTiles] = useState(null);
    const [hoverInfo, setHoverInfo] = useState(null);
    const [cursorCoords, setCursorCoords] = useState(null);
    const lastHoverUpdateRef = useRef(0);

    const flightsLayerActive = activeLayers.includes('flights');
    const vesselsLayerActive = activeLayers.includes('vessels');
    const airportsLayerActive = activeLayers.includes('airports');
    const weatherLayerActive = activeLayers.includes('weather');
    const styleFallbackLevel = styleFallbackState.mapStyleKey === mapStyle ? styleFallbackState.level : 0;
    const activeMapStyle = resolveMapStyle(mapStyle, styleFallbackLevel);
    const activeMapStyleKey = styleCacheKey(mapStyle, styleFallbackLevel, activeMapStyle);
    // Ink for line work drawn ON the basemap. It has to follow the basemap that
    // is actually painted, not the name of the button: `dark` resolves to the
    // Esri STREET style, so the old `mapStyle === 'light'` test never matched and
    // the wind arrows were drawn in pale ink on a light map — invisible.
    // Both dark grounds — the Esri imagery and the Esri dark canvas — need
    // paper ink for the wind; ink-2 would vanish into them.
    const basemapIsDark = activeMapStyle === ESRI_SATELLITE_STYLE || activeMapStyle === ESRI_DARK_STYLE;
    // The wind legend's swatch is --ink-2, so the arrows have to be ink-2 too
    // on the paper basemap. On the dark satellite basemap they are paper.
    // The same ink the legend swatch uses: groundInk() is the single fact.
    const basemapInk = groundInk(basemapIsDark);

    /* The label voice follows the ground it sits on. On paper: ink #101010
       with a paper halo. On a dark ground: paper #f7f5ef with an ink halo.
       Same voice, opposite polarity — a printed label over imagery knocks
       the ground out rather than wearing a black outline. */
    const labelInk = basemapIsDark ? '#f7f5ef' : '#101010';
    const labelHalo = basemapIsDark ? 'rgba(16,16,16,0.85)' : 'rgba(247,245,239,0.9)';
    /* Two labels keep an accent because they annotate a coloured mark. The
       accent flips brightness with the ground so it stays legible. */
    const labelSeverity = basemapIsDark ? '#f37420' : '#a72144';
    const labelMilitary = basemapIsDark ? '#f99d1b' : '#8a5a00';

    useEffect(() => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.flyTo({
            center: [viewTarget.longitude, viewTarget.latitude],
            zoom: viewTarget.zoom,
            bearing: viewTarget.bearing ?? 0,
            pitch: viewTarget.pitch ?? 0,
            duration: viewTarget.transitionDuration ?? 1500,
            essential: true,
        });
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
            if (state.mapStyleKey === mapStyle && level >= 2) return state;
            return {
                mapStyleKey: mapStyle,
                level: level + 1,
            };
        });
    }, [mapStyle]);

    const isBasemapSourceId = useCallback((sourceId) => (
        Boolean(sourceId && BASEMAP_SOURCE_PATTERN.test(String(sourceId)))
    ), []);

    const noteBasemapFailure = useCallback(() => {
        // Raster tiles self-heal; swapping style on tile misses during pan/zoom was
        // demoting ESRI → OSM and stripping flights/vessels MapLibre layers.
    }, []);

    // One place that understands what a MapLibre error means.
    //
    // The map's `error` event reaches us twice: through react-map-gl's
    // `onError` prop and through `map.on('error')`. Both land here, and the
    // same event object is deduped by a WeakSet so a single failure cannot
    // advance the style fallback twice.
    const seenMapErrorsRef = useRef(new WeakSet());

    const recordMapError = useCallback((event) => {
        if (event && typeof event === 'object') {
            if (seenMapErrorsRef.current.has(event)) return;
            seenMapErrorsRef.current.add(event);
        }

        const sourceId = event?.sourceId || event?.source?.id || event?.error?.sourceId;
        if (sourceId) {
            if (isBasemapSourceId(sourceId)) noteBasemapFailure();
            if (!failedSourcesRef.current.has(sourceId)) {
                const next = new Set(failedSourcesRef.current);
                next.add(sourceId);
                failedSourcesRef.current = next;
                setFailedSources(next);
            }
            return;
        }

        const message = event?.error?.message || event?.message || '';
        // "layers.<id>.paint.<prop>: …" — the layer was refused by the style
        // validator and will never draw. MapLibre does not throw for this and
        // does not log it: without this the map silently disagrees with its
        // own legend, which is the one thing this console must never do.
        const rejected = /^layers\.([^.\s]+)\./.exec(message);
        if (rejected) {
            const layerId = rejected[1];
            if (!rejectedLayersRef.current.has(layerId)) {
                const next = new Set(rejectedLayersRef.current);
                next.add(layerId);
                rejectedLayersRef.current = next;
                setRejectedLayers(next);
            }
            return;
        }

        if (message && /style|stylesheet|glyph/i.test(message)) {
            advanceStyleFallback();
        }
    }, [advanceStyleFallback, isBasemapSourceId, noteBasemapFailure]);

    const handleMapError = useCallback((event) => {
        recordMapError(event);
    }, [recordMapError]);

    // Wire MapLibre's runtime error events. react-map-gl publishes the map
    // instance only after an async import, so this effect has to wait for
    // `mapReady` — at mount `mapRef.current` is still null and the handler
    // was never attached at all.
    useEffect(() => {
        const map = mapRef.current?.getMap?.();
        if (!map) return undefined;
        const handler = (e) => recordMapError(e);
        map.on('error', handler);
        return () => { map.off('error', handler); };
    }, [mapReady, recordMapError]);

    const repaintMap = useCallback(() => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.resize();
        map.triggerRepaint();
    }, []);

    // Map-first layout sizes the wrapper after lazy mount — resize when the box changes.
    useEffect(() => {
        const el = wrapperRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => {
            repaintMap();
        });
        observer.observe(el);
        return () => { observer.disconnect(); };
    }, [repaintMap]);

    useEffect(() => {
        basemapFailCountRef.current = 0;
    }, [mapStyle, styleFallbackLevel]);

    // Map-first layout sizes the wrapper after lazy mount — repaint after load settles.
    useEffect(() => {
        if (!mapReady) return undefined;
        repaintMap();
        const raf = requestAnimationFrame(repaintMap);
        const t1 = window.setTimeout(repaintMap, 120);
        const t2 = window.setTimeout(repaintMap, 500);
        const t3 = window.setTimeout(repaintMap, 1500);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(t1);
            window.clearTimeout(t2);
            window.clearTimeout(t3);
        };
    }, [mapReady, activeMapStyleKey, repaintMap]);

    const handleMapLoad = useCallback(() => {
        setMapReady(true);
        setMapLoadStalled(false);
        const map = mapRef.current?.getMap?.();
        if (map && typeof window !== 'undefined') {
            window.__GM_MAP__ = map;
            const repaint = () => {
                map.resize();
                map.triggerRepaint();
            };
            repaint();
            map.once('idle', repaint);
            window.setTimeout(repaint, 250);
            window.setTimeout(repaint, 1000);
        }
    }, []);

    /* Honest failure: a map that never settles has no data layers. Say so
       rather than let an empty theatre imply an empty world.

       The watchdog asks the map before accusing it. `load` is a one-shot — it
       fires once per map instance and never again after a basemap switch — so
       trusting the event alone raised "Data layers unavailable" over a map
       whose layers were all drawn. A false alarm in the one place the map is
       allowed to complain is worse than no alarm.

       `map.loaded()` is the authority: it is true only when the style is
       loaded AND every source has loaded, which is exactly the state the
       notice claims is missing. */
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const map = mapRef.current?.getMap?.();
            if (map?.loaded?.()) {
                setMapReady(true);
                setMapLoadStalled(false);
                return;
            }
            setMapLoadStalled(true);
        }, MAP_LOAD_STALL_MS);
        return () => window.clearTimeout(timer);
    }, [mapReady, activeMapStyleKey]);

    // A basemap switch is a fresh load: re-arm the watchdog, or a style that
    // never arrives after a switch could never be reported. The ready flag is
    // NOT cleared — the map instance is the same, only its style changed, and
    // clearing it detached the error handler for no reason.
    useEffect(() => {
        setMapLoadStalled(false);
    }, [activeMapStyleKey]);

    // `load` fires once; `idle` settles after every style change. This is
    // what clears the notice the moment the new basemap is actually drawn.
    useEffect(() => {
        if (!mapReady) return undefined;
        const map = mapRef.current?.getMap?.();
        if (!map) return undefined;
        const settle = () => {
            if (!map.loaded?.()) return;
            setMapReady(true);
            setMapLoadStalled(false);
        };
        map.on('idle', settle);
        return () => { map.off('idle', settle); };
    }, [mapReady]);

    useEffect(() => {
        if (!mapReady) return undefined;
        const timer = window.setTimeout(() => setTrafficDeferredReady(true), TRAFFIC_DEFER_MS);
        return () => window.clearTimeout(timer);
    }, [mapReady]);

    /* A named tag is pushed inwards at a viewport edge. The border tags used
       to be centred on their point, so on a phone the Cambodia tag hung half
       off the screen and read as a clipped name — a lie about what is there.
       react-map-gl's Marker has no `anchor` prop (it is silently ignored),
       so the tag is moved with a pixel `offset` instead, sized from the tag's
       own measured width. */
    const borderTagRefs = useRef({});
    const [markerOffsets, setMarkerOffsets] = useState({});
    useEffect(() => {
        if (!mapReady) return undefined;
        const map = mapRef.current?.getMap?.();
        if (!map) return undefined;
        let frame = 0;
        const recompute = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const width = map.getContainer?.().clientWidth || 0;
                if (!width) return;
                const next = {};
                for (const b of THAILAND_BORDER_GEOJSON.features) {
                    const point = map.project(b.geometry.coordinates);
                    const tagWidth = borderTagRefs.current[b.properties.id]?.offsetWidth || 0;
                    let x = 0;
                    /* Only a tag whose point is on screen gets pushed in. A tag
                       for a point outside the view stays out of the view, the
                       way MapLibre leaves it — otherwise a name appears at the
                       edge pointing at nothing. */
                    if (tagWidth && point.x >= 0 && point.x <= width) {
                        if (point.x - tagWidth / 2 < EDGE_TAG_MARGIN_PX) x = tagWidth / 2 + EDGE_TAG_MARGIN_PX - point.x;
                        else if (point.x + tagWidth / 2 > width - EDGE_TAG_MARGIN_PX) x = width - EDGE_TAG_MARGIN_PX - point.x - tagWidth / 2;
                    }
                    next[b.properties.id] = { x, y: 0 };
                }
                setMarkerOffsets((prev) => {
                    const same = Object.keys(next).length === Object.keys(prev).length
                        && Object.entries(next).every(([id, o]) => prev[id] && prev[id].x === o.x && prev[id].y === o.y);
                    return same ? prev : next;
                });
            });
        };
        map.on('move', recompute);
        map.on('resize', recompute);
        recompute();
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            map.off('move', recompute);
            map.off('resize', recompute);
        };
    }, [mapReady]);

    const interactiveLayerIds = useMemo(() => {
        const layers = [];
        if (flightsLayerActive) layers.push('flights-icons');
        if (vesselsLayerActive) layers.push('vessels-icons');
        if (airportsLayerActive) layers.push('airports-points', 'airports-labels');
        if (activeLayers.includes('conflicts')) layers.push('acled-circles');
        if (activeLayers.includes('firms')) layers.push('firms-circles');
        if (activeLayers.includes('cables')) layers.push('cables-lines');
        if (activeLayers.includes('dams')) layers.push('dams-points');
        if (activeLayers.includes('military')) layers.push('military-flights-icons');
        if (activeLayers.includes('range-rings')) layers.push('range-rings-lines', 'strike-origins-points');
        if (activeLayers.includes('blackouts')) layers.push('blackout-center-core', 'blackout-zones-fill');
        if (activeLayers.includes('kinetic')) layers.push('kinetic-targets-core', 'kinetic-pulses-centers', 'kinetic-trajectories-line');
        return layers;
    }, [activeLayers, airportsLayerActive, flightsLayerActive, vesselsLayerActive]);

    const handleMouseMove = useCallback((event) => {
        const now = window.performance?.now?.() ?? Date.now();
        if (now - lastHoverUpdateRef.current < TRAFFIC_HOVER_THROTTLE_MS) return;
        lastHoverUpdateRef.current = now;

        setCursorCoords((current) => {
            const next = { lng: event.lngLat.lng, lat: event.lngLat.lat };
            return current?.lng === next.lng && current?.lat === next.lat ? current : next;
        });
        const feature = event.features?.find(
            (f) => HOVER_LAYERS.includes(f.layer?.id)
        );
        if (feature) {
            const isPoint = feature.geometry?.type === 'Point';
            const [longitude, latitude] = isPoint
                ? (feature.geometry?.coordinates || [])
                : [event.lngLat.lng, event.lngLat.lat];

            if (isValidLngLat(longitude, latitude)) {
                setHoverInfo((current) => {
                    const next = { longitude, latitude, feature };
                    return sameHoverTarget(current, next) ? current : next;
                });
            } else {
                setHoverInfo((current) => current === null ? current : null);
            }
        } else {
            setHoverInfo((current) => current === null ? current : null);
        }
    }, []);
    const handleMouseLeave = useCallback(() => {
        lastHoverUpdateRef.current = 0;
        setHoverInfo((current) => current === null ? current : null);
        setCursorCoords((current) => current === null ? current : null);
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
    const loadSdgLayer = useCallback(async () => {
        const { fetchSdgLayer } = await import('../services/undpSdg');
        return fetchSdgLayer();
    }, []);
    const sdgResource = useLiveResource(loadSdgLayer, {
        cacheKey: 'map:sdg',
        enabled: activeLayers.includes('sdg'),
        intervalMs: 24 * 60 * 60 * 1000,
        isUsable: (d) => d?.features?.length > 0
    });
    // Sentinel-1 radar. Only fetched when the layer is on: it is a STAC search, not
    // a tile read, and there is no reason to spend it on a reader who never asks.
    const sarResource = useLiveResource(useCallback(() => fetchSar(viewMode), [viewMode]), {
        cacheKey: `map:sar:${viewMode}`,
        enabled: activeLayers.includes('sar'),
        intervalMs: 30 * 60 * 1000,
        isUsable: (d) => Boolean(d?.latest?.id)
    });
    const sarScene = sarResource.data?.latest || null;

    const firmsResource = useLiveResource(useCallback(() => fetchFirmsData(viewMode), [viewMode]), {
        cacheKey: `map:firms:${viewMode}`,
        enabled: activeLayers.includes('firms'),
        intervalMs: 10 * 60 * 1000,
        isUsable: hasFeatureData
    });
    const windResource = useLiveResource(useCallback(() => fetchWind(viewMode), [viewMode]), {
        cacheKey: `map:wind:${viewMode}`,
        enabled: activeLayers.includes('wind'),
        intervalMs: 15 * 60 * 1000,
        isUsable: hasFeatureData
    });
    // The transport level — 850 hPa, about 1500 m up — is the air that actually
    // carries the haze, so it is the level the map draws when it has it. The
    // surface field is the fallback, and the plate says which one is on the
    // map: a level swap that nobody states would be the map quietly changing
    // what it is telling you.
    const transportWindResource = useLiveResource(useCallback(() => fetchTransportWind(viewMode), [viewMode]), {
        cacheKey: `map:wind850:${viewMode}`,
        enabled: activeLayers.includes('wind'),
        intervalMs: 30 * 60 * 1000,
        isUsable: hasFeatureData
    });
    const windDrawnData = transportWindResource.data?.features?.length
        ? transportWindResource.data
        : windResource.data;
    const windDrawnIsTransport = windDrawnData === transportWindResource.data;
    const windBarbData = useMemo(() => windBarbs(windDrawnData), [windDrawnData]);
    const typhoonResource = useLiveResource(useCallback(() => fetchTyphoon(), []), {
        cacheKey: 'map:typhoon',
        enabled: activeLayers.includes('typhoon'),
        intervalMs: 30 * 60 * 1000,
        isUsable: hasFeatureData
    });
    const infraResource = useLiveResource(useCallback(() => fetchInfrastructure(), []), {
        cacheKey: 'map:infrastructure',
        enabled: activeLayers.includes('infrastructure'),
        intervalMs: 10 * 60 * 1000,
        isUsable: hasFeatureData
    });
    const airportsResource = useLiveResource(useCallback(() => fetchAirportLocations(), []), {
        cacheKey: 'map:airports:worldwide',
        enabled: airportsLayerActive,
        freezeAfterLoad: true,
        isUsable: (payload) => payload?.type === 'FeatureCollection' && Array.isArray(payload.features),
        maxRetries: 1,
        maxStaleMs: 30 * 24 * 60 * 60 * 1000
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
        isUsable: hasFeatureData,
        maxRetries: 2,
        maxStaleMs: 20 * 60 * 1000
    });
    const militaryFlightsResource = useLiveResource(useCallback(() => fetchMilitaryFlights(viewMode), [viewMode]), {
        cacheKey: `map:military-flights:${viewMode}`,
        enabled: activeLayers.includes('military'),
        intervalMs: 30 * 1000,
        isUsable: hasFeatureData,
        initialData: FALLBACK_MILITARY_FLIGHTS
    });

    const disastersData = disasterResource.data;
    const crisesData = conflictResource.data;
    const weatherData = weatherResource.data;
    const economyData = economyResource.data;
    const aqiData = aqiResource.data;
    const sdgData = sdgResource.data;
    const firmsData = firmsResource.data;
    const infraData = infraResource.data;
    const militaryFlightsData = militaryFlightsResource.data ?? FALLBACK_MILITARY_FLIGHTS;
    const rangeRingsGeoJson = useMemo(() => getStrikeRangeRingsGeoJson(), []);
    const kineticTrajectoriesGeoJson = useMemo(() => getKineticTrajectoriesGeoJson(), []);
    const blackoutsGeoJson = useMemo(() => getConflictBlackoutsGeoJson(viewMode), [viewMode]);

    // Initial frame only; the animation below writes straight to the MapLibre
    // source. Driving it through React state re-rendered this whole component
    // 25x a second and tripped React's "Maximum update depth exceeded" (#185)
    // on the Middle East build whenever the kinetic layer was on.
    const [pulseGeoJson] = useState(() => generateKineticPulsesGeoJson(Date.now()));
    useEffect(() => {
        if (!activeLayers.includes('kinetic')) return;
        let animId;
        let lastUpdate = 0;
        const animate = (time) => {
            if (time - lastUpdate > 40) {
                lastUpdate = time;
                const source = mapRef.current?.getMap?.()?.getSource?.('kinetic-pulses-data');
                if (source && typeof source.setData === 'function') {
                    source.setData(generateKineticPulsesGeoJson(Date.now()));
                }
            }
            animId = requestAnimationFrame(animate);
        };
        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [activeLayers]);
    const airportsData = useMemo(
        () => sanitizePointCollection(airportsResource.data) ?? EMPTY_TRAFFIC_FC,
        [airportsResource.data]
    );
    const globalFlightsData = flightsResource.data;
    const globalVesselsData = vesselsResource.data;

    /**
     * Session-frozen GeoJSON — computed once on first fetch, never rebuilt on pan/zoom.
     * The memo stays pure; module-scope persistence happens after commit so a
     * recovered MapContainer can reuse the same traffic snapshot.
     */
    const flightsSnapshot = useMemo(() => {
        if (moduleTrafficSession.flights) {
            return {
                collection: moduleTrafficSession.flights,
                meta: moduleTrafficSession.flightsMeta
            };
        }
        const sanitized = sanitizePointCollection(globalFlightsData);
        if (!sanitized?.features?.length) {
            return { collection: null, meta: { capped: false, total: 0 } };
        }
        const { collection, capped, totalInView } = spreadSamplePointCollection(sanitized, TRAFFIC_SESSION_MAX_FLIGHTS);
        return {
            collection,
            meta: { capped, total: totalInView }
        };
    }, [globalFlightsData]);

    const vesselsSnapshot = useMemo(() => {
        if (moduleTrafficSession.vessels) {
            return {
                collection: moduleTrafficSession.vessels,
                meta: moduleTrafficSession.vesselsMeta
            };
        }
        const sanitized = sanitizePointCollection(globalVesselsData);
        if (!sanitized?.features?.length) {
            return { collection: null, meta: { capped: false, total: 0 } };
        }
        const { collection, capped, totalInView } = spreadSamplePointCollection(sanitized, TRAFFIC_SESSION_MAX_VESSELS);
        return {
            collection,
            meta: { capped, total: totalInView }
        };
    }, [globalVesselsData]);

    // Persist the freshly-computed session back to module scope after commit, so it
    // survives a later remount. Skips when null/empty (no usable payload yet).
    useEffect(() => {
        if (flightsSnapshot.collection && !moduleTrafficSession.flights) {
            moduleTrafficSession.flights = flightsSnapshot.collection;
            moduleTrafficSession.flightsMeta = flightsSnapshot.meta;
        }
    }, [flightsSnapshot]);
    useEffect(() => {
        if (vesselsSnapshot.collection && !moduleTrafficSession.vessels) {
            moduleTrafficSession.vessels = vesselsSnapshot.collection;
            moduleTrafficSession.vesselsMeta = vesselsSnapshot.meta;
        }
    }, [vesselsSnapshot]);

    const trafficLayersReady = mapReady && trafficDeferredReady;
    const flightsGeoJson = flightsSnapshot.collection;
    const vesselsGeoJson = vesselsSnapshot.collection;
    const visibleFlightCount = flightsGeoJson?.features?.length ?? 0;
    const visibleVesselCount = vesselsGeoJson?.features?.length ?? 0;
    const flightsGlobalTotal = flightsSnapshot.meta.total || (globalFlightsData?.features?.length ?? 0);
    const vesselsGlobalTotal = vesselsSnapshot.meta.total || (globalVesselsData?.features?.length ?? 0);
    const flightsCapped = flightsSnapshot.meta.capped;
    const vesselsCapped = vesselsSnapshot.meta.capped;
    const globalFlightCount = globalFlightsData?.features?.length ?? 0;
    const globalVesselCount = globalVesselsData?.features?.length ?? 0;
    // "session" said nothing to a reader and implied currency the data does not have:
    // flights are served from a committed snapshot that can be days old. State the
    // age instead, so the legend answers "how old is this?" without being asked.
    const flightCollectedAt = globalFlightsData?.meta?.collectedAt || globalFlightsData?.meta?.fetchedAt;
    const ageLabel = (iso) => {
        if (!iso) return null;
        const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (!Number.isFinite(mins) || mins < 0) return null;
        if (mins < 2) return 'just now';
        if (mins < 60) return `${mins}m old`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h old`;
        return `${Math.floor(hrs / 24)}d old`;
    };
    // Offline is not calm. A feed that ERRORED is not a feed that found
    // nothing: the plate has to say which of the two it is.
    const flightSourceLabel = visibleFlightCount > 0
        ? `ADS-B · ${ageLabel(flightCollectedAt) || 'age unknown'}`
        : (flightsResource.isLoading
            ? 'Loading ADS-B…'
            : flightsResource.error
                ? 'ADS-B feed unavailable'
                : (flightsResource.isStale ? 'ADS-B stale' : 'ADS-B'));
    const vesselsNeedKey = globalVesselsData?.meta?.requiresKey;
    const vesselMeta = globalVesselsData?.meta;
    const vesselSourceLabel = vesselsResource.error && !globalVesselCount
        ? 'AIS feed unavailable'
        : formatVesselSourceLabel(vesselMeta);
    const axiomOverwatchActive = vesselMeta?.aisSource === 'axiom-overwatch'
        || vesselMeta?.source?.includes('axiom-overwatch');
    // FIRMS and ACLED sit on the same map as traffic with no provenance line of
    // their own. Same format as the traffic rows: count · source · age.
    const firmsMeta = firmsData?.meta;
    const firmsLive = firmsMeta?.source === 'nasa-firms-live';
    const firmsCount = firmsData?.features?.length ?? 0;
    const firmsSourceLabel = firmsLive
        ? firmsCount + ' thermal · VIIRS · ' + (ageLabel(firmsMeta?.fetchedAt) || 'age unknown')
        : firmsMeta?.source === 'no_firms_key' ? 'Thermal: no FIRMS key — nothing shown'
            : firmsResource.isLoading ? 'Loading thermal…'
                : firmsMeta?.source ? 'Thermal: ' + String(firmsMeta.source).replace(/_/g, ' ') : 'Thermal: no data';
    const acledRaw = acledResource.data;
    const acledLive = acledRaw?.source === 'acled';
    const acledCount = acledRaw?.features?.length ?? 0;
    const acledSourceLabel = acledLive
        ? acledCount + (acledRaw?.truncated ? '+' : '') + ' events · ACLED · since ' + (acledRaw?.since || '—')
        : acledCount > 0 ? acledCount + ' sample events · ' + acledDemoRange(acledRaw?.features) + ' · ACLED not connected'
            : acledResource.isLoading ? 'Loading events…' : 'Events: no data';
    // The haze reading, stated plainly. A map layer that carries a number has
    // to carry the number, not just a colour.
    const worstAqi = useMemo(() => {
        let worst = null;
        for (const feature of aqiData?.features || []) {
            const aqi = feature.properties?.aqi;
            if (!Number.isFinite(aqi)) continue;
            if (worst === null || aqi > worst.aqi) {
                worst = {
                    aqi,
                    city: feature.properties?.city,
                    color: feature.properties?.color,
                    category: feature.properties?.category
                };
            }
        }
        return worst;
    }, [aqiData]);
    const windMeta = windDrawnData?.meta;
    const typhoonMeta = typhoonResource.data?.meta;

    const legendVisible = flightsLayerActive || vesselsLayerActive
        || activeLayers.includes('firms') || activeLayers.includes('conflicts')
        || activeLayers.includes('aqi') || activeLayers.includes('wind')
        || activeLayers.includes('cables') || activeLayers.includes('typhoon');
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
        <div className="map-wrapper" ref={wrapperRef}>
            <Map
                attributionControl={{ compact: true }}
                ref={mapRef}
                minZoom={viewMode === 'global' ? 1.5 : MAP_MIN_ZOOM}
                maxZoom={MAP_MAX_ZOOM}
                renderWorldCopies={false}
                maxPitch={60}
                pitchWithRotate
                dragRotate
                touchZoomRotate
                antialias
                trackResize
                initialViewState={initialViewStateRef.current}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onLoad={handleMapLoad}
                onError={handleMapError}
                interactiveLayerIds={interactiveLayerIds}
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
                                    'text-font': ['Noto Sans Bold'],
                                    'text-offset': [0, 1.25],
                                    'text-anchor': 'top'
                                }}
                                paint={{
                                    'text-color': labelInk,
                                    'text-halo-color': labelHalo,
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
                {/* Sentinel-1 radar: one strip, not a mosaic. The outline is drawn with
                    the image so the edge of what the satellite actually saw is visible —
                    without it a reader reads the empty area around the strip as "nothing
                    there" rather than "not looked at". */}
                {activeLayers.includes('sar') && sarScene?.tiles?.length && (
                    <Source id="sar-scene" type="raster" tiles={sarScene.tiles} tileSize={256} maxzoom={14}
                        attribution="Sentinel-1 GRD · ESA / Microsoft Planetary Computer">
                        <Layer id="sar-scene-layer" type="raster" paint={{ 'raster-opacity': 0.85 }} />
                    </Source>
                )}
                {activeLayers.includes('sar') && sarScene?.geometry && (
                    <Source id="sar-footprint" type="geojson"
                        data={{ type: 'Feature', geometry: sarScene.geometry, properties: {} }}>
                        <Layer id="sar-footprint-line" type="line"
                            paint={{ 'line-color': '#006eb8', 'line-width': 1, 'line-opacity': 0.7 }} />
                    </Source>
                )}
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
                                        'fill-color': copernicusPreview.preset === 'ndvi' ? '#1a7444' : '#006eb8',
                                        'fill-opacity': 0.08
                                    }}
                                />
                                <Layer
                                    id="copernicus-preview-footprint-line"
                                    type="line"
                                    paint={{
                                        'line-color': copernicusPreview.preset === 'ndvi' ? '#1a7444' : '#006eb8',
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
                                    20, '#a72144',             // 0-20% = light red
                                    40, '#a72144',             // 20-40% = red
                                    60, '#8a5a00',             // 40-60% = yellow
                                    80, '#489b6e',             // 60-80% = light green
                                    95, '#1a7444',             // 80-95% = green
                                    100, '#1a7444'             // >95% = dark green
                                ],
                                'fill-opacity': 0.4
                            }}
                        />
                        {/* Country Outline */}
                        <Layer
                            id="sdg-line"
                            type="line"
                            paint={{
                                'line-color': '#6b665e',
                                'line-width': 1
                            }}
                        />
                    </Source>
                )}

                {/* WIND BARBS — the synoptic glyph. The shaft points downwind:
                    the way the air moves, the way the haze is pushed. The
                    feathers carry the strength, one full feather per 10 knots.
                    Same basemap-aware ink the wind has always had: dark on the
                    light paper, pale on dark and satellite. */}
                {activeLayers.includes('wind') && (
                    <Source id="wind-barbs" type="geojson" data={windBarbData}>
                        {/* The circle is the place the reading belongs to. Without
                            it the staff floats and the reader has to guess which
                            end is the origin. */}
                        <Layer
                            id="wind-barbs-station"
                            type="circle"
                            filter={['==', ['get', 'kind'], 'station']}
                            paint={{
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.6, 6, 2.4, 10, 3.2],
                                'circle-color': basemapInk,
                                'circle-opacity': [
                                    'interpolate', ['linear'], ['get', 'speedKmh'],
                                    0, 0.5, 35, 0.95
                                ]
                            }}
                        />
                        {/* The staff is drawn heavier than the feathers, as a
                            barb is. Two layers, because one line layer carries
                            one weight, and a field of uniform hair is not the
                            glyph anyone recognises. */}
                        <Layer
                            id="wind-barbs-staff"
                            type="line"
                            filter={['==', ['get', 'kind'], 'shaft']}
                            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                            paint={{
                                'line-color': basemapInk,
                                // `zoom` may only be the input of a TOP-LEVEL
                                // interpolate. Wrapping it in `['*', …]` made
                                // MapLibre reject the whole layer in silence —
                                // the legend promised 117 arrows and the map
                                // drew none.
                                'line-width': [
                                    'interpolate', ['linear'], ['zoom'],
                                    3, 1.5, 6, 2.1, 10, 2.9
                                ],
                                'line-opacity': [
                                    'interpolate', ['linear'], ['get', 'speedKmh'],
                                    0, 0.4, 35, 0.9
                                ]
                            }}
                        />
                        <Layer
                            id="wind-barbs-feathers"
                            type="line"
                            filter={['==', ['get', 'kind'], 'barbs']}
                            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                            paint={{
                                'line-color': basemapInk,
                                'line-width': [
                                    'interpolate', ['linear'], ['zoom'],
                                    3, 1.1, 6, 1.6, 10, 2.2
                                ],
                                'line-opacity': [
                                    'interpolate', ['linear'], ['get', 'speedKmh'],
                                    0, 0.4, 35, 0.95
                                ]
                            }}
                        />
                    </Source>
                )}

                {/* THE DEPRESSION — JMA's analysed tropical cyclone.
                    The gale and storm areas are the analyst's quadrant radii,
                    not a measured wind swath; the track is a forecast after
                    the last observed centre. The plate says which is which. */}
                {activeLayers.includes('typhoon') && typhoonResource.data?.features?.length > 0 && (
                    <Source id="typhoon-data" type="geojson" data={typhoonResource.data}>
                        <Layer
                            id="typhoon-gale-fill"
                            type="fill"
                            filter={['==', ['get', 'kind'], 'galeArea']}
                            paint={{
                                'fill-color': wash(MARK.storm, 0.18),
                                'fill-outline-color': MARK.storm,
                                'fill-opacity': 0.9
                            }}
                        />
                        <Layer
                            id="typhoon-storm-fill"
                            type="fill"
                            filter={['==', ['get', 'kind'], 'stormArea']}
                            paint={{
                                'fill-color': wash(MARK.storm, 0.36),
                                'fill-outline-color': MARK.storm,
                                'fill-opacity': 0.95
                            }}
                        />
                        <Layer
                            id="typhoon-track-past"
                            type="line"
                            filter={['==', ['get', 'kind'], 'trackPast']}
                            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                            paint={{
                                'line-color': MARK.storm,
                                'line-width': 2.2,
                                'line-opacity': 0.9
                            }}
                        />
                        <Layer
                            id="typhoon-track-forecast"
                            type="line"
                            filter={['==', ['get', 'kind'], 'trackForecast']}
                            layout={{ 'line-cap': 'butt', 'line-join': 'round' }}
                            paint={{
                                'line-color': MARK.storm,
                                'line-width': 1.6,
                                'line-opacity': 0.6,
                                'line-dasharray': [3, 3]
                            }}
                        />
                        <Layer
                            id="typhoon-centre"
                            type="circle"
                            filter={['==', ['get', 'kind'], 'centre']}
                            paint={{
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 6, 7, 10, 10],
                                'circle-color': MARK.storm,
                                'circle-stroke-color': labelHalo,
                                'circle-stroke-width': 1.6
                            }}
                        />
                        <Layer
                            id="typhoon-centre-label"
                            type="symbol"
                            filter={['==', ['get', 'kind'], 'centre']}
                            layout={{
                                'text-field': ['concat', ['get', 'name'], ' · ', ['to-string', ['get', 'maxWindKt']], ' kt'],
                                'text-size': 11,
                                'text-font': ['Noto Sans Regular'],
                                'text-offset': [0, 1.6],
                                'text-anchor': 'top',
                                'text-allow-overlap': false
                            }}
                            paint={{
                                'text-color': labelInk,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1.4
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
                                /* One hue, deepening with density. The old ramp ran
                                   red → pale yellow, so the densest cells printed
                                   brighter than the paper ground and took the map
                                   over — and the yellow core contradicted the red
                                   swatch the legend promises. A density field
                                   has to agree with its own key. */
                                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.2, 7, 0.85],
                                'heatmap-color': [
                                    'interpolate', ['linear'], ['heatmap-density'],
                                    0, 'rgba(167,33,68,0)',
                                    0.25, 'rgba(167,33,68,0.16)',
                                    0.5, 'rgba(167,33,68,0.34)',
                                    0.75, 'rgba(167,33,68,0.56)',
                                    1, 'rgba(167,33,68,0.78)'
                                ],
                                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 8, 6, 18, 8, 26],
                                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.75, 8, 0]
                            }}
                        />
                        <Layer
                            id="firms-circles"
                            type="circle"
                            minzoom={5}
                            paint={{
                                'circle-color': [
                                    'case',
                                    ['==', ['get', 'confidence'], 'high'], MARK.thermal,
                                    ['==', ['get', 'confidence'], 'h'], MARK.thermal,
                                    MARK.thermalLow
                                ],
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 8, 4, 12, 8],
                                'circle-opacity': 0.8,
                                /* No blur. A mark is drawn once, at one weight:
                                   a soft-edged detection is a glow with a
                                   smaller budget, and the plate's key claims a
                                   flat red. */
                                'circle-stroke-width': 0.5,
                                'circle-stroke-color': '#6b665e'
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
                                    'alert', '#a72144',
                                    'damaged', '#a72144',
                                    'closed', '#a72144',
                                    'at_risk', '#f59e0b',
                                    'intermittent', '#f59e0b',
                                    'monitoring', '#8a5a00',
                                    '#1a7444'
                                ],
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 8, 8],
                                'circle-opacity': 0.7,
                                'circle-stroke-width': 1.5,
                                'circle-stroke-color': [
                                    'match', ['get', 'status'],
                                    'alert', '#a72144',
                                    'damaged', '#a72144',
                                    'closed', '#a72144',
                                    'at_risk', '#f59e0b',
                                    'intermittent', '#f59e0b',
                                    'monitoring', '#8a5a00',
                                    '#1a7444'
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
                                'text-font': ['Noto Sans Regular'],
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top'
                            }}
                            paint={{
                                'text-color': labelInk,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1
                            }}
                        />
                    </Source>
                )}

                {/* Flights Layer — lightweight circles; labels only at close zoom. */}
                {trafficLayersReady && flightsLayerActive && (
                    <Source id="flights-data" type="geojson" data={flightsGeoJson ?? EMPTY_TRAFFIC_FC}>
                        <Layer
                            id="flights-icons"
                            type="circle"
                            paint={{
                                'circle-color': [
                                    'case',
                                    ['==', ['get', 'military'], true],
                                    MARK.military,
                                    MARK.aircraft
                                ],
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2.1, 5, 3, 8, 4.5],
                                'circle-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.62, 6, 0.82, 10, 0.9],
                                'circle-stroke-color': '#101010',
                                'circle-stroke-width': 0.6
                            }}
                        />
                        <Layer
                            id="flights-labels"
                            type="symbol"
                            minzoom={8.5}
                            layout={{
                                'text-field': ['coalesce', ['get', 'callsign'], ['get', 'hex'], ''],
                                'text-size': 9,
                                'text-font': ['Noto Sans Regular'],
                                'text-offset': [0, 1.3],
                                'text-anchor': 'top',
                                'text-allow-overlap': false,
                                'text-optional': true,
                            }}
                            paint={{
                                'text-color': labelInk,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1,
                            }}
                        />
                    </Source>
                )}

                {/* Worldwide scheduled-service and large airports — static, zero API quota. */}
                {trafficLayersReady && airportsLayerActive && (
                    <Source id="airports-data" type="geojson" data={airportsData}>
                        <Layer
                            id="airports-points"
                            type="circle"
                            paint={{
                                'circle-color': [
                                    'case',
                                    ['==', ['get', 'type'], 'large_airport'],
                                    '#f59e0b',
                                    '#f7f5ef'
                                ],
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 5, 2.4, 9, 4.2],
                                'circle-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.55, 6, 0.82],
                                'circle-stroke-color': '#101010',
                                'circle-stroke-width': 0.8
                            }}
                        />
                        <Layer
                            id="airports-labels"
                            type="symbol"
                            minzoom={6.5}
                            layout={{
                                'text-field': ['coalesce', ['get', 'iata'], ['get', 'icao'], ''],
                                'text-size': 9,
                                'text-font': ['Noto Sans Regular'],
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top',
                                'text-allow-overlap': false,
                                'text-optional': true,
                            }}
                            paint={{
                                'text-color': labelInk,
                                'text-halo-color': labelHalo,
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
                                /* Same rule as the FIRMS field: one hue, deepening
                                   with density. The old ramp ran yellow → orange
                                   → red and printed the densest cells brighter
                                   than the paper ground. */
                                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.3, 6, 0.9],
                                'heatmap-color': [
                                    'interpolate', ['linear'], ['heatmap-density'],
                                    0, 'rgba(167,33,68,0)',
                                    0.25, 'rgba(167,33,68,0.16)',
                                    0.5, 'rgba(167,33,68,0.34)',
                                    0.75, 'rgba(167,33,68,0.54)',
                                    1, 'rgba(167,33,68,0.72)'
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
                                /* One mark, one colour. The event used to be
                                   painted in four colours by event type while
                                   the legend promised a single grey swatch — the
                                   map and its own key disagreed. The type is
                                   read in the popup, where there is room for a
                                   sentence; on the map an event is an event. */
                                'circle-color': MARK.conflict,
                                'circle-radius': [
                                    'interpolate', ['linear'],
                                    ['coalesce', ['get', 'fatalities'], 0],
                                    0, 3, 5, 5, 20, 8, 100, 14
                                ],
                                'circle-opacity': 0.75,
                                'circle-stroke-width': 1,
                                'circle-stroke-color': '#101010'
                            }}
                        />
                    </Source>
                )}

                {/* Vessels Layer — lightweight circles; labels only at close zoom. */}
                {trafficLayersReady && vesselsLayerActive && (
                    <Source id="vessels-data" type="geojson" data={vesselsGeoJson ?? EMPTY_TRAFFIC_FC}>
                        <Layer
                            id="vessels-icons"
                            type="circle"
                            paint={{
                                'circle-color': [
                                    'match', ['get', 'category'],
                                    'cargo', MARK.vesselCargo,
                                    'tanker', MARK.vesselTanker,
                                    'passenger', MARK.vesselPassenger,
                                    'fishing', MARK.vesselFishing,
                                    'tug', MARK.vesselTug,
                                    'pleasure', MARK.vesselPleasure,
                                    MARK.vesselOther
                                ],
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2, 5, 2.8, 8, 4.2],
                                'circle-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.58, 6, 0.78, 10, 0.88],
                                'circle-stroke-color': '#101010',
                                'circle-stroke-width': 0.6
                            }}
                        />
                        <Layer
                            id="vessels-labels"
                            type="symbol"
                            minzoom={8}
                            layout={{
                                'text-field': ['coalesce', ['get', 'name'], ''],
                                'text-size': 10,
                                'text-font': ['Noto Sans Regular'],
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top',
                                'text-allow-overlap': false,
                                'text-optional': true,
                            }}
                            paint={{
                                'text-color': labelInk,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1,
                            }}
                        />
                    </Source>
                )}

                {/* Submarine Telecom Cables Layer.
                    No blurred under-layer: a cable is a line, and a line has
                    one weight. The glow was a HUD flourish that also made the
                    route read as a boundary rather than a route.

                    The cables now wear their OWN mark — the dark navy a chart
                    draws a cable in — instead of the same mid-blue as the
                    Shanghai → Singapore corridor. Ten blue lines that shared a
                    colour with everything else blue, and appeared in no plate
                    at all, are why "what are the blue lines?" had no answer.

                    The casing under the cable is the ground's own ink, so the
                    navy core stays readable on the dark and satellite grounds
                    as well as on the paper one. It is a halo, not a second
                    colour of the mark: the key shows the navy, the map draws
                    the navy. */}
                {activeLayers.includes('cables') && (
                    <Source id="cables-data" type="geojson" data={SUBMARINE_CABLES_GEOJSON}>
                        <Layer
                            id="cables-casing"
                            type="line"
                            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                            paint={{
                                'line-color': basemapInk,
                                'line-width': 3.4,
                                'line-opacity': 0.35
                            }}
                        />
                        <Layer
                            id="cables-lines"
                            type="line"
                            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                            paint={{
                                'line-color': MARK.cable,
                                'line-width': 1.6,
                                'line-opacity': 0.95
                            }}
                        />
                        {/* The cable names used to wait for zoom 5, and the
                            Southeast Asia view sits at 4.4 — so the one thing
                            that would have told the reader what the blue
                            lines were was switched off. The names are drawn
                            from zoom 3 and MapLibre drops the ones that would
                            collide. */}
                        <Layer
                            id="cables-labels"
                            type="symbol"
                            minzoom={3}
                            layout={{
                                'text-field': ['get', 'name'],
                                'text-size': 10,
                                'text-font': ['Noto Sans Regular'],
                                'symbol-placement': 'line',
                                'text-offset': [0, 1]
                            }}
                            paint={{
                                'text-color': labelInk,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1.2
                            }}
                        />
                    </Source>
                )}

                {/* Strategic Water Dams Layer */}
                {activeLayers.includes('dams') && (
                    <Source id="dams-data" type="geojson" data={STRATEGIC_DAMS_GEOJSON}>
                        <Layer
                            id="dams-points"
                            type="circle"
                            paint={{
                                'circle-color': ['get', 'color'],
                                'circle-radius': 5.5,
                                'circle-stroke-color': '#101010',
                                'circle-stroke-width': 1.2,
                                'circle-opacity': 0.9
                            }}
                        />
                        <Layer
                            id="dams-labels"
                            type="symbol"
                            minzoom={5}
                            layout={{
                                'text-field': ['get', 'name'],
                                'text-size': 10,
                                'text-font': ['Noto Sans Regular'],
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top'
                            }}
                            paint={{
                                'text-color': labelInk,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1.2
                            }}
                        />
                    </Source>
                )}

                {/* Ballistic & Drone Strike Range Rings Layer */}
                {activeLayers.includes('range-rings') && (
                    <Source id="range-rings-data" type="geojson" data={rangeRingsGeoJson}>
                        <Layer
                            id="range-rings-lines"
                            type="line"
                            paint={{
                                'line-color': ['get', 'color'],
                                'line-width': 1.4,
                                'line-opacity': 0.85,
                                'line-dasharray': [3, 2]
                            }}
                        />
                        <Layer
                            id="range-rings-labels"
                            type="symbol"
                            minzoom={3}
                            layout={{
                                'text-field': ['coalesce', ['get', 'rangeKm'], ''],
                                'text-size': 9,
                                'text-font': ['Noto Sans Regular'],
                                'symbol-placement': 'line',
                                'text-offset': [0, -0.8]
                            }}
                            paint={{
                                'text-color': labelSeverity,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1.2
                            }}
                        />
                        <Layer
                            id="strike-origins-points"
                            type="circle"
                            filter={['==', ['get', 'kind'], 'strike-origin']}
                            paint={{
                                'circle-color': ['get', 'color'],
                                'circle-radius': 6,
                                'circle-stroke-color': '#101010',
                                'circle-stroke-width': 1.5
                            }}
                        />
                    </Source>
                )}

                {/* Military / ISR Flights Layer */}
                {activeLayers.includes('military') && (
                    <Source id="military-flights-data" type="geojson" data={militaryFlightsData}>
                        <Layer
                            id="military-flights-icons"
                            type="circle"
                            paint={{
                                'circle-color': MARK.military,
                                'circle-radius': 5,
                                'circle-stroke-color': '#101010',
                                'circle-stroke-width': 1.4,
                                'circle-opacity': 0.95
                            }}
                        />
                        <Layer
                            id="military-flights-labels"
                            type="symbol"
                            layout={{
                                'text-field': ['concat', ['get', 'callsign'], ' [MIL]'],
                                'text-size': 10,
                                'text-font': ['Noto Sans Regular'],
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top'
                            }}
                            paint={{
                                'text-color': labelMilitary,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1.2
                            }}
                        />
                    </Source>
                )}

                {/* Conflict Power Grid Blackouts & Nightlight Loss Layer */}
                {activeLayers.includes('blackouts') && (
                    <Source id="blackout-zones-data" type="geojson" data={blackoutsGeoJson}>
                        <Layer
                            id="blackout-zones-fill"
                            type="fill"
                            filter={['==', ['get', 'kind'], 'blackout-polygon']}
                            paint={{
                                'fill-color': '#101010',
                                'fill-opacity': 0.62
                            }}
                        />
                        <Layer
                            id="blackout-zones-line"
                            type="line"
                            filter={['==', ['get', 'kind'], 'blackout-polygon']}
                            paint={{
                                'line-color': '#a72144',
                                'line-width': 1.6,
                                'line-opacity': 0.85,
                                'line-dasharray': [3, 2]
                            }}
                        />
                        <Layer
                            id="blackout-center-core"
                            type="circle"
                            filter={['==', ['get', 'kind'], 'blackout-center']}
                            paint={{
                                'circle-color': '#a72144',
                                'circle-radius': 6.5,
                                'circle-stroke-color': '#a72144',
                                'circle-stroke-width': 1.2
                            }}
                        />
                        <Layer
                            id="blackout-center-label"
                            type="symbol"
                            filter={['==', ['get', 'kind'], 'blackout-center']}
                            layout={{
                                'text-field': ['get', 'lossBadge'],
                                'text-size': 10,
                                'text-font': ['Noto Sans Bold'],
                                'text-offset': [0, 1.4],
                                'text-anchor': 'top',
                                'text-allow-overlap': true
                            }}
                            paint={{
                                'text-color': labelSeverity,
                                'text-halo-color': labelHalo,
                                'text-halo-width': 1.2
                            }}
                        />
                    </Source>
                )}

                {/* Kinetic Strike Trajectories & Shockwave Radar Pulses */}
                {activeLayers.includes('kinetic') && (
                    <>
                        {/* Trajectory Vectors (Missile & UAV Corridors) */}
                        <Source id="kinetic-trajectories-data" type="geojson" data={kineticTrajectoriesGeoJson}>
                            <Layer
                                id="kinetic-trajectories-line"
                                type="line"
                                filter={['==', ['get', 'kind'], 'kinetic-trajectory']}
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': 1.8,
                                    'line-opacity': 0.9,
                                    'line-dasharray': [4, 3]
                                }}
                            />
                            <Layer
                                id="kinetic-targets-core"
                                type="circle"
                                filter={['==', ['get', 'kind'], 'kinetic-target']}
                                paint={{
                                    'circle-color': ['get', 'color'],
                                    'circle-radius': 3.5,
                                    'circle-stroke-color': '#f7f5ef',
                                    'circle-stroke-width': 1.2
                                }}
                            />
                            <Layer
                                id="kinetic-trajectories-label"
                                type="symbol"
                                filter={['==', ['get', 'kind'], 'kinetic-trajectory']}
                                minzoom={4}
                                layout={{
                                    'text-field': ['get', 'name'],
                                    'text-size': 9,
                                    'text-font': ['Noto Sans Regular'],
                                    'symbol-placement': 'line',
                                    'text-offset': [0, -0.8]
                                }}
                                paint={{
                                    'text-color': labelSeverity,
                                    'text-halo-color': labelHalo,
                                    'text-halo-width': 1.2
                                }}
                            />
                        </Source>

                        {/* Dynamic Animated Kinetic Shockwave Rings */}
                        <Source id="kinetic-pulses-data" type="geojson" data={pulseGeoJson}>
                            <Layer
                                id="kinetic-pulses-rings"
                                type="line"
                                filter={['==', ['get', 'kind'], 'pulse-ring']}
                                paint={{
                                    'line-color': ['get', 'color'],
                                    'line-width': ['get', 'width'],
                                    'line-opacity': ['get', 'opacity']
                                }}
                            />
                            <Layer
                                id="kinetic-pulses-centers"
                                type="circle"
                                filter={['==', ['get', 'kind'], 'pulse-center']}
                                paint={{
                                    'circle-color': ['get', 'color'],
                                    'circle-radius': 4.5,
                                    'circle-stroke-color': '#f7f5ef',
                                    'circle-stroke-width': 1.2,
                                    'circle-opacity': 0.95
                                }}
                            />
                            <Layer
                                id="kinetic-pulses-labels"
                                type="symbol"
                                filter={['==', ['get', 'kind'], 'pulse-center']}
                                minzoom={5}
                                layout={{
                                    'text-field': ['get', 'name'],
                                    'text-size': 10,
                                    'text-font': ['Noto Sans Bold'],
                                    'text-offset': [0, 1.2],
                                    'text-anchor': 'top'
                                }}
                                paint={{
                                    'text-color': labelInk,
                                    'text-halo-color': labelHalo,
                                    'text-halo-width': 1.4
                                }}
                            />
                        </Source>
                    </>
                )}

                {hoverInfo && (() => {
                    const hoverLayerId = hoverInfo.feature.layer?.id;
                    const tooltipClass = buildPopupClassName(hoverLayerId);

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
                                if (layerId === 'blackout-center-core' || layerId === 'blackout-zones-fill') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: '#a72144' }}>
                                                {p.name || 'Grid Blackout Zone'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Nightlight Loss</span>
                                                <span style={{ color: '#a72144', fontWeight: 700 }}>{p.lossPercent ? `-${p.lossPercent}% COLLAPSE` : (p.lossBadge || 'SEVERE')}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Grid Status</span>
                                                <span style={{ color: '#f59e0b' }}>{p.status || 'Offline'}</span>
                                            </div>
                                            {p.baselineRadiance && (
                                                <div className="traffic-tooltip-row">
                                                    <span>Radiance Shift</span>
                                                    <span>{p.baselineRadiance} → {p.currentRadiance}</span>
                                                </div>
                                            )}
                                            {p.cause && (
                                                <div className="traffic-tooltip-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                                    <span style={{ color: '#6b665e' }}>Cause:</span>
                                                    <span style={{ fontSize: 'var(--type-micro)', lineHeight: 1.25 }}>{p.cause}</span>
                                                </div>
                                            )}
                                            {p.civilianImpact && (
                                                <div className="traffic-tooltip-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                                    <span style={{ color: '#6b665e' }}>Impact:</span>
                                                    <span style={{ fontSize: 'var(--type-micro)', lineHeight: 1.25, color: '#a72144' }}>{p.civilianImpact}</span>
                                                </div>
                                            )}
                                            <div className="traffic-tooltip-row">
                                                <span>Sensor</span>
                                                <span style={{ color: '#006eb8' }}>{p.sensor || 'VIIRS Day/Night Band'}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (layerId === 'kinetic-trajectories-line' || layerId === 'kinetic-targets-core') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: '#a72144' }}>
                                                {p.name || 'Kinetic Strike Corridor'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Origin</span>
                                                <span>{p.origin || 'Active Sector'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Target</span>
                                                <span style={{ color: '#a72144' }}>{p.target || 'Monitored'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Status</span>
                                                <span style={{ color: '#a72144', fontWeight: 600 }}>Active Kinetic Vector</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (layerId === 'kinetic-pulses-centers') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: '#f37420' }}>
                                                {p.name || 'Kinetic Engagement Centroid'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Activity Type</span>
                                                <span style={{ color: '#a72144' }}>{p.type || 'Strike & Air Defense'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Status</span>
                                                <span style={{ color: '#a72144' }}>Expanding Threat Radar</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (layerId.startsWith('cables')) {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: MARK.cable }}>
                                                {p.name || 'Undersea Fiber Cable'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Length</span>
                                                <span>{p.lengthKm ? `${Number(p.lengthKm).toLocaleString()} km` : '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Capacity</span>
                                                <span>{p.capacityTbps ? `${p.capacityTbps} Tbps` : '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Risk Zone</span>
                                                <span style={{ color: '#a72144' }}>{p.chokepointRisk || 'Monitored'}</span>
                                            </div>
                                            {p.landingPoints && (
                                                <div className="traffic-tooltip-row">
                                                    <span>Landings</span>
                                                    <span style={{ fontSize: 'var(--type-micro)' }}>{p.landingPoints}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                if (layerId.startsWith('typhoon')) {
                                    const quadrant = p.radiiKm
                                        ? ['NE', 'SE', 'SW', 'NW']
                                            .filter((q) => Number.isFinite(p.radiiKm[q]))
                                            .map((q) => `${q} ${p.radiiKm[q]} km`)
                                            .join(' · ')
                                        : '—';
                                    const isArea = p.kind === 'galeArea' || p.kind === 'stormArea';
                                    const isTrack = String(p.kind || '').startsWith('track');
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: MARK.storm }}>
                                                {p.name ? `${p.name} · ${p.categoryEn || p.category || 'TC'}` : 'Tropical cyclone'}
                                            </div>
                                            {isArea && (
                                                <>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Area</span>
                                                        {/* The Japanese JMA term is not repeated here: the
                                                            reader needs to know the radius is the analyst's,
                                                            not the script it was written in. */}
                                                        <span>{p.kind === 'galeArea' ? 'Gale radius' : 'Storm radius'}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Quadrants</span>
                                                        <span>{quadrant}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Source</span>
                                                        <span>JMA analyst radii</span>
                                                    </div>
                                                </>
                                            )}
                                            {!isArea && !isTrack && (
                                                <>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Max wind</span>
                                                        <span>{p.maxWindKt ? `${p.maxWindKt} kt · ${p.maxWindMs} m/s` : '—'}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Gust</span>
                                                        <span>{p.gustKt ? `${p.gustKt} kt · ${p.gustMs} m/s` : '—'}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Pressure</span>
                                                        <span>{p.pressureHpa ? `${p.pressureHpa} hPa` : '—'}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Movement</span>
                                                        <span>{p.movement || '—'}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Position</span>
                                                        <span>{p.locationEn || p.location || '—'}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Intensity</span>
                                                        <span>{p.intensityEn || p.intensity || '—'}</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Issued</span>
                                                        <span>{p.validAt || p.observedAt || '—'}</span>
                                                    </div>
                                                </>
                                            )}
                                            {isTrack && (
                                                <>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Track</span>
                                                        <span>
                                                            {p.forecast
                                                                ? 'Forecast centres — dashed'
                                                                : 'Observed centres — solid'}
                                                        </span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Observed</span>
                                                        <span>{p.pastPoints ?? 0} centres</span>
                                                    </div>
                                                    <div className="traffic-tooltip-row">
                                                        <span>Forecast</span>
                                                        <span>{p.forecastPoints ?? 0} centres</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="traffic-tooltip-row">
                                                <span>Source</span>
                                                <span>JMA analysis — not a raw satellite retrieval</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (layerId.startsWith('wind-barbs')) {
                                    const fromDeg = Number(p.fromDeg);
                                    const kt = Number(p.speedKt);
                                    const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
                                    const bearing = Number.isFinite(fromDeg)
                                        ? COMPASS[Math.round(((fromDeg % 360) + 360) % 360 / 22.5) % 16]
                                        : '—';
                                    const toward = Number.isFinite(fromDeg)
                                        ? COMPASS[Math.round((((fromDeg + 180) % 360) + 360) % 360 / 22.5) % 16]
                                        : '—';
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header">
                                                Wind {Number.isFinite(kt) ? `${kt} kt` : '—'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>From</span>
                                                <span>{bearing}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Pushing toward</span>
                                                <span>{toward}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Speed</span>
                                                <span>{Number.isFinite(p.speedKmh) ? `${p.speedKmh} km/h` : '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Feathers</span>
                                                <span>
                                                    {p.barbsFull || 0} full · {p.barbsHalf || 0} half
                                                    <span> (1 full = 10 kt)</span>
                                                </span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Source</span>
                                                <span>Open-Meteo model — not an observation</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (layerId === 'dams-points') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: '#006eb8' }}>
                                                {p.name || 'Strategic Dam'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>River / Basin</span>
                                                <span>{p.river || '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Location</span>
                                                <span>{p.country || '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Capacity</span>
                                                <span>{p.capacityMw ? `${Number(p.capacityMw).toLocaleString()} MW` : '—'}</span>
                                            </div>
                                            {p.geopoliticalImpact && (
                                                <div className="traffic-tooltip-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                                    <span style={{ color: '#6b665e' }}>Geopolitical Impact:</span>
                                                    <span style={{ fontSize: 'var(--type-micro)', color: '#d9d5c9' }}>{p.geopoliticalImpact}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                if (layerId === 'range-rings-lines') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: '#a72144' }}>
                                                Strike Range Envelope
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Origin Sector</span>
                                                <span>{p.originName || '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Radius</span>
                                                <span style={{ color: '#a72144', fontWeight: 700 }}>{p.rangeKm || '—'}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (layerId === 'strike-origins-points') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: '#a72144' }}>
                                                {p.name || 'Strike Launch Origin'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Region</span>
                                                <span>{p.country || '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Max Envelope</span>
                                                <span style={{ color: '#a72144', fontWeight: 700 }}>{p.maxRangeKm ? `${p.maxRangeKm} km` : '—'}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (layerId === 'military-flights-icons') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header" style={{ color: '#f59e0b' }}>
                                                {p.callsign || 'MILITARY CONTACT'}
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Type</span>
                                                <span>{p.type || 'Military Aircraft'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Role</span>
                                                <span>{p.role || 'ISR / Transport'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Operator</span>
                                                <span>{p.operator || 'Military'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Altitude</span>
                                                <span>{p.altitude ? `${p.altitude} ft` : '—'}</span>
                                            </div>
                                        </div>
                                    );
                                }
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
                                            {/* Provenance on every dot: a demo event must say so where it is clicked. */}
                                            <div className="traffic-tooltip-row">
                                                <span>Source</span>
                                                <span style={/^demo|sample|fallback|curated/i.test(p.source || '') ? { color: 'var(--red)' } : undefined}>
                                                    {/^demo|sample|fallback|curated/i.test(p.source || '') ? 'DEMO — not ACLED' : (p.source || 'ACLED')}
                                                </span>
                                            </div>
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
                                if (layerId === 'airports-points' || layerId === 'airports-labels') {
                                    return (
                                        <div className="traffic-tooltip-content">
                                            <div className="traffic-tooltip-header">{p.name || p.iata || p.icao || 'Airport'}</div>
                                            <div className="traffic-tooltip-row">
                                                <span>Code</span>
                                                <span>{[p.iata, p.icao].filter(Boolean).join(' / ') || '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Location</span>
                                                <span>{[p.municipality, p.country].filter(Boolean).join(', ') || '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Elevation</span>
                                                <span>{Number.isFinite(Number(p.elevationFt)) ? `${Number(p.elevationFt).toLocaleString()} ft` : '—'}</span>
                                            </div>
                                            <div className="traffic-tooltip-row">
                                                <span>Source</span>
                                                <span>OurAirports</span>
                                            </div>
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

                {activeLayers.includes('conflicts') && renderSpatialAura(crisesData, 'conflicts', '#a72144', 16)}
                {activeLayers.includes('disasters') && renderSpatialAura(disastersData, 'disasters', '#f59e0b', 14)}
                {activeLayers.includes('weather') && renderSpatialAura(weatherData, 'weather', '#006eb8', 18)}
                {activeLayers.includes('economy') && renderSpatialAura(economyData, 'economy', '#FFC400', 12)}
                {activeLayers.includes('aqi') && renderSpatialAura(aqiData, 'aqi', '#1a7444', 15, { featureColor: true })}

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
                                    background: f.properties.color || '#006eb8',
                                    border: '1.5px solid var(--ink)',
                                    boxShadow: `0 0 12px ${f.properties.color || '#006eb8'}cc`,
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

                {/* Thailand 3-Border Conflict Zone Beacons */}
                {(viewMode === 'thailand' || viewMode === 'indopacific') && THAILAND_BORDER_GEOJSON.features.map((b) => {
                    const [lng, lat] = b.geometry.coordinates;
                    return (
                        <Marker
                            key={b.properties.id}
                            longitude={lng}
                            latitude={lat}
                            offset={markerOffsets[b.properties.id]}
                            onClick={(event) => {
                                event.originalEvent.stopPropagation();
                                onRegionDotClick?.({ ...b.properties, longitude: lng, latitude: lat });
                            }}
                        >
                            <div
                                ref={(el) => { borderTagRefs.current[b.properties.id] = el; }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    // House style is square: radius 0 on anything that is not a
                                    // true circle, and no outer glow — the coloured rule
                                    // already separates the chip from the basemap.
                                    padding: '3px 7px', borderRadius: 0,
                                    background: 'rgba(247, 245, 239, 0.94)',
                                    borderLeft: `3px solid ${b.properties.color}`,
                                    borderTop: '1px solid rgba(16, 16, 16, 0.14)',
                                    borderRight: '1px solid rgba(16, 16, 16, 0.14)',
                                    borderBottom: '1px solid rgba(16, 16, 16, 0.14)',
                                    cursor: 'pointer', transition: 'transform 0.2s ease'
                                }}
                                // Middle dot, not a hyphen: name and risk level are two separate
                                // facts, not a compound. The en dash inside the name
                                // (Thailand–Myanmar) already means "between".
                                title={`${b.properties.name} · ${b.properties.riskLevel} RISK`}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <div style={{
                                    width: 7, height: 7, borderRadius: 0,
                                    background: b.properties.color
                                }} />
                                {/* 0.5rem rendered at 8px on a phone — these are the primary
                                    labels of the default view, so they get a floor in px. */}
                                <span style={{
                                    fontSize: 'var(--type-micro)', fontWeight: 600, color: 'var(--ink)',
                                    fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {b.properties.shortName}
                                </span>
                            </div>
                        </Marker>
                    );
                })}
            </Map>

            <div className="map-vignette" aria-hidden="true" />
            <div className="map-grid-overlay" aria-hidden="true" />

            {/* Cursor readout — an instrument line, not a developer panel. It
                appears only when there is a coordinate to report; the old
                "Move cursor over map" placeholder was instructional copy
                shipped into production. */}
            {cursorCoords && (
                <div className="map-coord-readout" aria-live="polite">
                    <span className="map-coord-readout__label">Cursor</span>
                    <span className="map-coord-readout__value">
                        {formatCoord(cursorCoords.lat, 'lat')}  {formatCoord(cursorCoords.lng, 'lng')}
                    </span>
                </div>
            )}

            {/* Honest failure surfaces. A layer that could not load, or a map
                that never reached `load`, has to say so — an empty theatre
                must never read as an empty world. */}
            <div className="map-status-stack">
                {mapLoadStalled && (
                    <div
                        className="map-stall-notice"
                        role="status"
                        title="The basemap is painted, but the data layers could not be initialised."
                    >
                        <AlertTriangle size={11} />
                        <span>Data layers unavailable</span>
                    </div>
                )}
                {failedSources.size + rejectedLayers.size > 0 && (
                    <div
                        className="map-layer-warning"
                        title={[
                            ...Array.from(failedSources).map((id) => `source ${id} failed to load`),
                            ...Array.from(rejectedLayers).map((id) => `layer ${id} was rejected by the style validator`),
                        ].join('\n')}
                    >
                        <AlertTriangle size={11} />
                        <span>
                            {failedSources.size + rejectedLayers.size} layer
                            {failedSources.size + rejectedLayers.size === 1 ? '' : 's'} not drawn
                        </span>
                    </div>
                )}
            </div>

            <div
                className="map-legend map-legend--traffic"
                style={{
                    visibility: legendVisible ? 'visible' : 'hidden',
                    pointerEvents: legendVisible ? 'auto' : 'none'
                }}
                aria-live="polite"
                aria-hidden={!legendVisible}
            >
                {/* "SOURCES", not "LIVE TRAFFIC" — an item below may read "2h old".
                    Two voices per row: the reading in the data face, its
                    provenance in the micro face underneath. The number is the
                    fact; the qualification is never hidden inside it. */}
                <div className="map-legend-title">SOURCES</div>
                <div
                    className="map-legend-item"
                    style={{ visibility: flightsLayerActive ? 'visible' : 'hidden' }}
                >
                    <LegendKey marks={LEGEND_KEY.aircraft} />
                    <span className="map-legend-copy">
                        <span className="map-legend-value">
                            {visibleFlightCount > 0
                                ? (flightsCapped && flightsGlobalTotal > visibleFlightCount
                                    ? `${visibleFlightCount.toLocaleString()} of ${flightsGlobalTotal.toLocaleString()} aircraft`
                                    : `${visibleFlightCount.toLocaleString()} aircraft`)
                                : globalFlightCount > 0
                                    ? `${globalFlightCount.toLocaleString()} aircraft`
                                    : flightsResource.error
                                        ? 'Aircraft unavailable'
                                        : 'No aircraft'}
                        </span>
                        <span className="map-legend-meta">
                            <LegendClasses marks={LEGEND_KEY.aircraft} />
                            <span>
                                {flightSourceLabel}
                                {flightsCapped && flightsGlobalTotal > visibleFlightCount ? ' · global sample' : ''}
                            </span>
                        </span>
                    </span>
                </div>
                <div
                    className="map-legend-item"
                    style={{ visibility: vesselsLayerActive ? 'visible' : 'hidden' }}
                >
                    <LegendKey marks={LEGEND_KEY.vessels} />
                    <span className="map-legend-copy">
                        <span className="map-legend-value">
                            {visibleVesselCount > 0
                                ? (vesselsCapped && vesselsGlobalTotal > visibleVesselCount
                                    ? `${visibleVesselCount.toLocaleString()} of ${vesselsGlobalTotal.toLocaleString()} vessels`
                                    : `${visibleVesselCount.toLocaleString()} vessels`)
                                : vesselsResource.isLoading
                                    ? 'Loading ships'
                                    : globalVesselCount > 0
                                        ? `${globalVesselCount.toLocaleString()} vessels`
                                        : vesselsResource.error
                                            ? 'Vessels unavailable'
                                            : vesselsNeedKey ? 'AIS key required' : 'No vessels'}
                        </span>
                        <span className="map-legend-meta">
                            <LegendClasses marks={LEGEND_KEY.vessels} />
                            <span>
                                {vesselSourceLabel}
                                {axiomOverwatchActive ? ' · CC-BY 4.0' : ''}
                                {vesselsCapped && vesselsGlobalTotal > visibleVesselCount ? ' · global sample' : ''}
                            </span>
                        </span>
                    </span>
                </div>
                {activeLayers.includes('firms') && (
                    <div className="map-legend-item">
                        {/* The swatch is the colour the map actually draws. The
                            faint amber meant "no API key", but the public-file
                            detections are still painted — in Wada red. The key
                            and the drawing disagreed; the provenance belongs in
                            the words underneath. */}
                        <LegendKey marks={LEGEND_KEY.thermal} />
                        <span className="map-legend-copy">
                            <span className="map-legend-value">
                                {firmsCount > 0
                                    ? (firmsMeta?.capped && Number(firmsMeta?.detectedInBox) > firmsCount
                                        ? `${firmsCount.toLocaleString()} of ${Number(firmsMeta.detectedInBox).toLocaleString()} thermal detections`
                                        : `${firmsCount.toLocaleString()} thermal detections`)
                                    : 'No thermal detections'}
                            </span>
                            <span className="map-legend-meta">
                                <LegendClasses marks={LEGEND_KEY.thermal} />
                                {firmsLive
                                    ? `VIIRS · ${ageLabel(firmsMeta?.fetchedAt) || 'age unknown'}`
                                    : firmsMeta?.source
                                        ? FIRMS_SOURCE_LABELS[firmsMeta.source] || String(firmsMeta.source).replace(/_/g, ' ')
                                        : 'no FIRMS key — nothing shown'}
                            </span>
                        </span>
                    </div>
                )}
                {activeLayers.includes('conflicts') && (
                    <div
                        className="map-legend-item"
                        title={acledCount > 0 && !acledLive
                            ? `Sample events, ${acledDemoRange(acledRaw?.features)}. ACLED is not connected.`
                            : undefined}
                    >
                        {/* The swatch is the colour the map actually draws. It used
                            to be grey when ACLED was unconnected, while the map
                            painted the sample events in four other colours — the
                            key and the drawing disagreed. The sample/live
                            distinction belongs in the words underneath. */}
                        <LegendKey marks={LEGEND_KEY.conflicts} />
                        <span className="map-legend-copy">
                            <span className="map-legend-value">
                                {acledLive
                                    ? `${acledCount}${acledRaw?.truncated ? '+' : ''} events`
                                    : acledCount > 0
                                        ? `${acledCount} sample events`
                                        : 'No events'}
                            </span>
                            <span className="map-legend-meta">
                                <LegendClasses marks={LEGEND_KEY.conflicts} />
                                {acledLive
                                    ? `ACLED · since ${acledRaw?.since || '—'}`
                                    : acledCount > 0
                                        ? `ACLED not connected · ${acledDemoWindow(acledRaw?.features)}`
                                        : 'no data'}
                            </span>
                        </span>
                    </div>
                )}
                {activeLayers.includes('aqi') && (
                    <div className="map-legend-item">
                        <span
                            className="map-legend-line"
                            style={{ background: worstAqi?.color || MARK.aqiNone }}
                        />
                        <span className="map-legend-copy">
                            <span className="map-legend-value">
                                {worstAqi ? `${worstAqi.city} AQI ${worstAqi.aqi}` : 'No AQI reading'}
                            </span>
                            <span className="map-legend-meta">
                                {worstAqi ? `${worstAqi.category} · US EPA band` : 'upstream unavailable'}
                            </span>
                        </span>
                    </div>
                )}
                {activeLayers.includes('wind') && (
                    <div className="map-legend-item">
                        <span className="map-legend-line" style={{ background: groundInk(basemapIsDark) }} />
                        <span className="map-legend-copy">
                            <span className="map-legend-value">
                                {windMeta ? `${windMeta.count} barbs` : 'No wind reading'}
                            </span>
                            <span className="map-legend-meta">
                                {windMeta ? (
                                    <>
                                        {/* The time is its own line, not a wrap. An
                                            accidental wrap makes the plate look
                                            broken; a deliberate second line makes
                                            it look like an instrument. */}
                                        <span>
                                            {windMeta.level || '10 m above ground'}
                                            {windMeta.partial ? ' · partial' : ''}
                                        </span>
                                        {/* The level is named because the map draws
                                            the transport field when it has it and
                                            falls back to the surface field when it
                                            does not, and a silent swap would be the
                                            map changing what it is telling you.
                                            The convention is named because a barb
                                            is read by its feathers and by which
                                            way it points, and the reader has to be
                                            told which way this one points. */}
                                        <span>
                                            Open-Meteo model · barb points downwind
                                            {windDrawnIsTransport ? '' : ' · surface fallback'}
                                        </span>
                                        <span>
                                            1 feather = 10 kt
                                            {compactUtc(windMeta.observedAt) ? ` · ${compactUtc(windMeta.observedAt)}` : ' · time unknown'}
                                        </span>
                                    </>
                                ) : (
                                    <span>upstream unavailable</span>
                                )}
                            </span>
                        </span>
                    </div>
                )}
                {activeLayers.includes('typhoon') && (
                    <div className="map-legend-item">
                        <span
                            className="map-legend-zone"
                            style={{ background: wash(MARK.storm, 0.3), borderColor: MARK.storm }}
                        />
                        <span className="map-legend-copy">
                            <span className="map-legend-value">
                                {typhoonMeta?.stormName
                                    ? `${typhoonMeta.stormName} · ${typhoonMeta.maxWindKt ?? '—'} kt`
                                    : typhoonResource.error
                                        ? 'Cyclone bulletin unavailable'
                                        : 'No tropical cyclone'}
                            </span>
                            <span className="map-legend-meta">
                                {typhoonMeta?.stormName ? (
                                    <>
                                        <span>
                                            {typhoonMeta.category || 'TC'} · {typhoonMeta.pressureHpa ?? '—'} hPa
                                            {typhoonMeta.observedAt ? ` · ${compactUtc(typhoonMeta.observedAt)}` : ''}
                                        </span>
                                        <LegendClasses marks={LEGEND_KEY.storm} />
                                        <span>JMA analysis — not a raw satellite retrieval</span>
                                    </>
                                ) : (
                                    <span>{typhoonMeta?.note || 'JMA bulletin unavailable'}</span>
                                )}
                            </span>
                        </span>
                    </div>
                )}
                {activeLayers.includes('cables') && (
                    <div className="map-legend-item">
                        <span className="map-legend-line" style={{ background: MARK.cable }} />
                        <span className="map-legend-copy">
                            <span className="map-legend-value">
                                {CABLE_COUNT} submarine cables
                            </span>
                            <span className="map-legend-meta">
                                <LegendClasses marks={LEGEND_KEY.cables} />
                                <span>reference registry · not a live feed</span>
                            </span>
                        </span>
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
                {STRATEGIC_KEY.routes.map((m) => (
                    <div className="map-legend-item" key={m.mark}>
                        <span className="map-legend-line" style={{ background: MARK[m.mark] }} />
                        <span>{m.label}</span>
                    </div>
                ))}
                <div className="map-legend-title" style={{ marginTop: '6px' }}>REFERENCE ZONES</div>
                {STRATEGIC_KEY.zones.map((m) => (
                    <div className="map-legend-item" key={m.mark}>
                        <span
                            className="map-legend-zone"
                            style={{ background: wash(MARK[m.mark], 0.3), borderColor: MARK[m.mark] }}
                        />
                        <span>{m.label}</span>
                    </div>
                ))}
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
