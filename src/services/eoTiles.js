/**
 * Earth Observation Tile Layers
 *
 * Provides raster tile layer configurations for MapLibre from:
 *   - NASA GIBS (Global Imagery Browse Services) — VIIRS, MODIS
 *   - JAXA GSMaP (precipitation)
 *   - Sentinel-5P (NO₂ air pollution)
 *   - EO Dashboard indicators
 *
 * All endpoints are free, no API key needed.
 */

/** Build a GIBS WMTS tile URL.
 *
 *  The time slot is the literal token `default`, which GIBS resolves to the most
 *  recent date it actually holds for that layer. Previously every layer was
 *  pinned to "2 days ago", but each product has its own lag — AMSR2 soil moisture
 *  runs ~6 days behind, MODIS 3km AOD is same-day — so the fixed offset returned
 *  404s and blank tiles for anything that did not happen to match. `default` also
 *  self-heals when a mission changes its processing latency. */
const gibsTileUrl = (layer, tileMatrix = 'GoogleMapsCompatible_Level9', format = 'png') =>
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/default/${tileMatrix}/{z}/{y}/{x}.${format}`;

/** Expand one GIBS tile template into 3 subdomain-rotated URLs so MapLibre can round-robin.
 *  If one subdomain stalls, the others keep the layer alive. NASA GIBS supports
 *  gibs.earthdata, gibs-a.earthdata, gibs-b.earthdata as load-balanced mirrors. */
const gibsRedundant = (url) => [
    url,
    url.replace('gibs.earthdata.nasa.gov', 'gibs-a.earthdata.nasa.gov'),
    url.replace('gibs.earthdata.nasa.gov', 'gibs-b.earthdata.nasa.gov')
];

/** RainViewer rotates the path segment in its radar tile URL every few minutes and
 *  drops old ones, so a committed path goes 404 within the hour. Fetch the current
 *  one from their public manifest and patch the layer in place.
 *  Ceiling: a toggle in the first second of page load can still use the stale path;
 *  it corrects on the next toggle. Move to a fetch-on-toggle if that ever matters. */
const refreshRadarPath = async () => {
    try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        const frames = data?.radar?.past;
        const latest = Array.isArray(frames) && frames.length ? frames[frames.length - 1].path : null;
        if (!latest) return;
        const layer = EO_TILE_LAYERS.find((l) => l.id === 'eo-weather-radar');
        if (layer) layer.tiles = [`${data.host || 'https://tilecache.rainviewer.com'}${latest}/256/{z}/{x}/{y}/2/1_1.png`];
    } catch {
        // Keep whatever path is baked in; a dead radar layer must not break the map.
    }
};

/**
 * All available Earth Observation raster layers.
 * Each entry produces a MapLibre raster source + layer config.
 */
export const EO_TILE_LAYERS = [
    {
        id: 'eo-nightlights',
        name: 'Nightlights (VIIRS)',
        description: 'City lights observed by the Suomi-NPP satellite',
        group: 'satellite',
        icon: '🌃',
        // GIBS serves this one as JPEG at Level8; the old Level9 PNG request was a 400.
        tiles: gibsRedundant(
            gibsTileUrl('VIIRS_SNPP_DayNightBand_AtSensor_M15', 'GoogleMapsCompatible_Level8', 'jpg')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / VIIRS',
        // Default-on, so it sits under the operational layers rather than shouting.
        opacity: 0.5,
        maxzoom: 8
    },
    {
        id: 'eo-vegetation',
        name: 'Vegetation (NDVI)',
        description: 'Global vegetation index from MODIS satellite',
        group: 'satellite',
        icon: '🌿',
        tiles: gibsRedundant(
            gibsTileUrl('MODIS_Terra_NDVI_8Day', 'GoogleMapsCompatible_Level9', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / MODIS Terra',
        opacity: 0.6,
        maxzoom: 8
    },
    {
        id: 'eo-true-color',
        name: 'True Color (VIIRS)',
        description: 'Daily true-color satellite imagery',
        group: 'satellite',
        icon: '🛰️',
        tiles: gibsRedundant(
            gibsTileUrl('VIIRS_SNPP_CorrectedReflectance_TrueColor', 'GoogleMapsCompatible_Level9', 'jpg')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / VIIRS',
        opacity: 0.7,
        maxzoom: 9
    },
    {
        id: 'eo-sea-surface-temp',
        name: 'Sea Surface Temp',
        description: 'Gap-free daily ocean surface temperature analysis (GHRSST MUR)',
        group: 'satellite',
        icon: '🌊',
        // MODIS_Aqua_L3_SST_MidIR_Monthly no longer exists in the EPSG:3857 endpoint
        // and returned 400 on every request. MUR L4 is the gap-free daily successor.
        tiles: gibsRedundant(
            gibsTileUrl('GHRSST_L4_MUR_Sea_Surface_Temperature', 'GoogleMapsCompatible_Level7', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / GHRSST MUR',
        opacity: 0.6,
        maxzoom: 7
    },
    {
        // Replaces the old eo-fires raster. GIBS now publishes every
        // Thermal_Anomalies product as vector tiles only, so the PNG request was a
        // permanent 400 — and the `firms` core layer already plots active fire
        // detections as points. Smoke is the complement to that heat signal: FIRMS
        // says something is burning, this says where the plume went.
        id: 'eo-smoke',
        name: 'Smoke Plumes (OMPS)',
        description: 'UV aerosol index tuned for thick smoke from intense fires and explosions',
        group: 'satellite',
        icon: '🌫️',
        tiles: gibsRedundant(
            gibsTileUrl('OMPS_Aerosol_Index_PyroCumuloNimbus', 'GoogleMapsCompatible_Level6', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / OMPS',
        opacity: 0.7,
        maxzoom: 6
    },
    {
        id: 'eo-precipitation',
        name: 'Precipitation (IMERG)',
        description: 'Global rainfall estimates from GPM satellite',
        group: 'satellite',
        icon: '🌧️',
        tiles: gibsRedundant(
            gibsTileUrl('IMERG_Precipitation_Rate', 'GoogleMapsCompatible_Level6', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / GPM IMERG',
        opacity: 0.6,
        maxzoom: 6
    },
    {
        id: 'eo-snow-cover',
        name: 'Snow Cover (MODIS)',
        description: 'Global snow coverage from MODIS',
        group: 'satellite',
        icon: '❄️',
        // Level9 was a 400 — GIBS caps this product at Level8.
        tiles: gibsRedundant(
            gibsTileUrl('MODIS_Terra_NDSI_Snow_Cover', 'GoogleMapsCompatible_Level8', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / MODIS',
        opacity: 0.55,
        maxzoom: 8
    },
    {
        id: 'eo-aerosol',
        name: 'Aerosol (MODIS)',
        description: 'Aerosol optical depth — haze, dust, smoke and industrial particulate',
        group: 'satellite',
        icon: '💨',
        tiles: gibsRedundant(
            gibsTileUrl('MODIS_Combined_Value_Added_AOD', 'GoogleMapsCompatible_Level6', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / MODIS',
        // 0.55 buried the aircraft and vessel icons when this layer is on at first
        // paint. 0.38 still reads as haze without competing with live traffic.
        opacity: 0.38,
        maxzoom: 6
    },
    {
        id: 'eo-no2',
        name: 'Nitrogen Dioxide (OMI)',
        description: 'Tropospheric NO₂ column — combustion tracer from strikes, fires and industry',
        group: 'satellite',
        icon: '🟤',
        tiles: gibsRedundant(
            gibsTileUrl('OMI_Nitrogen_Dioxide_Tropo_Column', 'GoogleMapsCompatible_Level6', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / Aura OMI',
        opacity: 0.6,
        maxzoom: 6
    },
    {
        id: 'eo-carbon-monoxide',
        name: 'Carbon Monoxide (AIRS)',
        description: 'CO at 500 hPa — the atmospheric signature of burning, traceable downwind for days',
        group: 'satellite',
        icon: '🟠',
        tiles: gibsRedundant(
            gibsTileUrl('AIRS_L2_Carbon_Monoxide_500hPa_Volume_Mixing_Ratio_Day', 'GoogleMapsCompatible_Level6', 'png')
        ),
        tileSize: 256,
        attribution: 'NASA GIBS / Aqua AIRS',
        opacity: 0.6,
        maxzoom: 6
    },
    {
        id: 'eo-jaxa-soil-moisture',
        name: 'JAXA GCOM-W Soil Moisture',
        description: 'Land surface soil moisture from JAXA GCOM-W1 AMSR2 (LPRM downscaled C1 band, daytime daily)',
        group: 'satellite',
        icon: '🇯🇵',
        // Ran ~6 days behind the hardcoded 2-day date, so this returned 404 and drew
        // nothing. `default` tracks whatever AMSR2 has actually published.
        tiles: gibsRedundant(
            gibsTileUrl('LPRM_AMSR2_Downscaled_Surface_Soil_Moisture_C1_Band_Day_Daily', 'GoogleMapsCompatible_Level6', 'png')
        ),
        tileSize: 256,
        attribution: 'JAXA GCOM-W / NASA GIBS',
        opacity: 0.65,
        maxzoom: 6
    },
    {
        id: 'eo-sentinel2-cloudless',
        name: 'Sentinel-2 Cloudless',
        description: 'Cloud-free mosaic from ESA Sentinel-2 (EOX)',
        group: 'satellite',
        icon: '🛰️',
        tiles: [
            'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg'
        ],
        tileSize: 256,
        attribution: 'EOX / ESA Sentinel-2',
        opacity: 0.7,
        maxzoom: 14
    },
    {
        id: 'eo-surface-water',
        name: 'Surface Water (JRC)',
        description: 'Global surface water occurrence from Landsat archive',
        group: 'satellite',
        icon: '💧',
        tiles: [
            'https://storage.googleapis.com/global-surface-water/tiles2021/occurrence/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: 'EC JRC / Google',
        opacity: 0.6,
        maxzoom: 13
    },
    {
        id: 'eo-bathymetry',
        name: 'Ocean Bathymetry',
        description: 'Seabed depth from EMODnet',
        group: 'satellite',
        icon: '🌊',
        tiles: [
            'https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: 'EMODnet Bathymetry',
        opacity: 0.55,
        maxzoom: 12
    },
    {
        id: 'eo-weather-radar',
        name: 'Weather Radar',
        description: 'Live precipitation radar from RainViewer',
        group: 'satellite',
        icon: '🌧️',
        // Placeholder path; refreshRadarPath() below replaces it with a live one on load.
        tiles: [
            'https://tilecache.rainviewer.com/v2/radar/nowcast/256/{z}/{x}/{y}/2/1_1.png'
        ],
        tileSize: 256,
        attribution: 'RainViewer',
        opacity: 0.6,
        maxzoom: 10
    }
    // 'eo-wind' removed: it pointed at OpenWeatherMap with an API key committed in
    // this file, and that key returns 401 — the layer had not drawn anything in a
    // long time. Restoring wind needs a key in the environment, not in source.
];

// Fire-and-forget: patches the radar layer as soon as the manifest answers.
refreshRadarPath();

// Dynamic COG layers registered at runtime from STAC search results
const dynamicLayers = new Map();

/** Register a COG layer from a STAC scene asset */
export const registerCogLayer = ({ id, name, tileUrl, bbox, attribution, opacity = 0.7, maxzoom = 14 }) => {
    const layer = {
        id: `eo-cog-${id}`,
        name,
        description: `COG layer from STAC scene ${id}`,
        group: 'satellite',
        type: 'cog',
        icon: '🛰️',
        tiles: [tileUrl],
        tileSize: 256,
        bounds: bbox,
        attribution: attribution || 'STAC COG',
        opacity,
        maxzoom
    };
    dynamicLayers.set(layer.id, layer);
    return layer;
};

/** Remove a dynamic COG layer */
export const unregisterCogLayer = (id) => dynamicLayers.delete(`eo-cog-${id}`);

/** Get all layers including dynamic COG layers */
export const getAllEoLayers = () => [...EO_TILE_LAYERS, ...dynamicLayers.values()];

/** Get layer config by ID */
export const getEoLayerById = (id) =>
    EO_TILE_LAYERS.find((l) => l.id === id) || dynamicLayers.get(id);

/** Get all layer IDs */
export const getEoLayerIds = () => [...EO_TILE_LAYERS.map((l) => l.id), ...dynamicLayers.keys()];
