/**
 * Sentinel-1 SAR scenes via Microsoft Planetary Computer.
 *
 * Why radar, when the map already carries optical layers:
 *
 *   - It works through cloud and at night. Over monsoon Asia the optical layers
 *     are blind roughly half the time, and that half is not random — it clusters
 *     exactly when weather is driving events.
 *   - Metal on water is unmistakable. A ship is a bright point against radar-dark
 *     sea whether or not it is broadcasting AIS, so comparing this against the
 *     vessel layer shows what the vessel layer cannot: ships running dark.
 *
 * Free and keyless. Planetary Computer signs the underlying blobs server-side,
 * so the tile URLs below need no credential of ours.
 *
 * This is deliberately per-scene rather than a mosaic. Sentinel-1 does not
 * produce a seamless global image — it produces strips, on a 6–12 day repeat.
 * Pretending otherwise would mean showing a composite whose parts are days apart
 * and calling it "now".
 */
const PC_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const PC_TILES = 'https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x';
const COLLECTION = 'sentinel-1-grd';

/** Search boxes per theater: [minLon, minLat, maxLon, maxLat]. */
export const SAR_BOXES = {
    indopacific: [95, -11, 130, 22],
    eastasia: [104, 20, 146, 46],
    southasia: [66, 5, 93, 36],
    thailand: [97, 5, 106, 21],
    middleeast: [34, 12, 60, 33],
    global: [95, -11, 130, 22],
};

/**
 * Build the raster tile template for one scene.
 *
 * `vv` is co-polarised backscatter — the band where a hard, bright target such
 * as a hull separates most cleanly from water. rescale 0–500 is the usual GRD
 * stretch; without it the image is almost entirely black.
 */
const tileUrlFor = (itemId) =>
    `${PC_TILES}?collection=${COLLECTION}&item=${encodeURIComponent(itemId)}`
    + '&assets=vv&rescale=0,500&colormap_name=gray';

/**
 * Most recent Sentinel-1 pass over a theater.
 * Returns null rather than throwing — a missing radar pass is normal, not an error.
 */
export const fetchLatestSar = async (theater = 'indopacific', { days = 10, limit = 6 } = {}) => {
    const bbox = SAR_BOXES[theater] || SAR_BOXES.indopacific;
    const until = new Date();
    const from = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);

    const res = await fetch(PC_STAC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            collections: [COLLECTION],
            bbox,
            datetime: `${from.toISOString()}/${until.toISOString()}`,
            limit,
            sortby: [{ field: 'properties.datetime', direction: 'desc' }],
        }),
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Planetary Computer ${res.status}`);

    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    if (!features.length) return null;

    const scenes = features.map((f) => ({
        id: f.id,
        acquiredAt: f.properties?.datetime || null,
        polarizations: f.properties?.['sar:polarizations'] || [],
        mode: f.properties?.['sar:instrument_mode'] || null,
        orbit: f.properties?.['sat:orbit_state'] || null,
        bbox: f.bbox || null,
        geometry: f.geometry || null,
        tiles: [tileUrlFor(f.id)],
    }));

    return {
        theater,
        // The newest strip is what the map draws; the rest are offered so a reader
        // can see how thin the coverage actually is over this box.
        latest: scenes[0],
        available: scenes.length,
        searchedDays: days,
        bbox,
        fetchedAt: new Date().toISOString(),
    };
};
