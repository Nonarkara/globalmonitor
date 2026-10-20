/**
 * The three grounds the map may stand on, and the fallbacks.
 *
 * These are plain data with no JSX so the truthfulness guard can import them
 * and check them at runtime: that each option is a DIFFERENT ground, that
 * none of them shares a tile URL with another, that "Dark" really paints a
 * dark ground, and that "Satellite" really is imagery. The "Dark" option
 * used to point at the bright Esri street map — the label promised a
 * low-glare operations map and delivered a white one, and a control that
 * lies about what it does is worse than no control.
 */

export const ESRI_SATELLITE_STYLE = {
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

/** Inline OSM raster — always paints opaque pixels; survives Opera / lazy-mount resize. */
export const OSM_RASTER_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: 'raster',
            // Entries in `tiles` are MIRRORS of one imagery set — MapLibre round-robins
            // tiles across them. Mixing OSM/Esri in here painted a patchwork of three
            // different maps. Voyager a/b/c only.
            tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
    },
    layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#f7f5ef' } },
        { id: 'osm-raster', type: 'raster', source: 'osm', paint: { 'raster-opacity': 1 } },
    ],
    // Without a glyphs endpoint no symbol layer can draw text at all — the
    // layer is accepted and the label simply never appears.
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
};

/** Key-free last resort — inline OSM raster, never a remote style.json URL. */
export const MAP_STYLE_ULTIMATE = OSM_RASTER_STYLE;

/** ESRI World Street — inline raster, same pattern as satellite; reliable on Cloudflare Pages. */
export const ESRI_STREET_STYLE = {
    version: 8,
    sources: {
        'esri-street': {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Esri, HERE, Garmin, OpenStreetMap',
        },
    },
    layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#f7f5ef' } },
        { id: 'esri-street-layer', type: 'raster', source: 'esri-street', paint: { 'raster-opacity': 1 } },
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
};

/** ESRI World Dark Gray Canvas — keyless, low-glare raster.
 *  The "Dark" option in the basemap picker used to point at the bright Esri
 *  street map: the label promised a low-glare operations map and delivered a
 *  white one. A control that lies about what it does is worse than no
 *  control, so the dark option now really is dark.
 *  CARTO's dark raster was tried first and rejected: without an API key it
 *  returns tiles watermarked "API KEY REQUIRED" across the whole map. */
export const ESRI_DARK_STYLE = {
    version: 8,
    sources: {
        'esri-dark-base': {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 16,
            attribution: 'Esri, HERE, Garmin, OpenStreetMap',
        },
        'esri-dark-ref': {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 16
        }
    },
    layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#101010' } },
        { id: 'esri-dark-base-layer', type: 'raster', source: 'esri-dark-base', paint: { 'raster-opacity': 1 } },
        { id: 'esri-dark-ref-layer', type: 'raster', source: 'esri-dark-ref', paint: { 'raster-opacity': 0.85 } }
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
};

// Each entry can be a URL string or an inline style object — MapLibre accepts both.
// Fallback chain (per style): if the primary URL fails (CORS / 5xx / DNS), the
// onStyleError handler in <Map> will swap to the fallback so the map never goes blank.
// The default is the light Esri street raster: it is the paper ground the whole
// interface is built on, and it is reliable on Cloudflare Pages.
export const MAP_STYLES = {
    topographic: ESRI_STREET_STYLE,
    satellite: ESRI_SATELLITE_STYLE,
    dark: ESRI_DARK_STYLE,
};

export const MAP_STYLE_FALLBACKS = {
    // The dark map falls back to imagery, not to the bright street map: a
    // dark ground is the promise, and a white one would break it.
    dark: ESRI_SATELLITE_STYLE,
    topographic: ESRI_STREET_STYLE,
    satellite: OSM_RASTER_STYLE,
};
