/**
 * Turn wind points into METEOROLOGICAL WIND BARBS — the classic synoptic
 * glyph, where one mark carries both the direction and the strength of the
 * wind, which is what a reader of a haze map actually needs: the shaft says
 * which way, the feathers say how hard.
 *
 * THE GLYPH, in the order a reader reads it:
 *
 *   - A small circle at the grid point. That is the PLACE — the station the
 *     reading belongs to. Without it the staff floats and the reader has to
 *     guess which end is the origin.
 *   - The STAFF runs from that circle in the direction the air is MOVING —
 *     downwind. It points the way the haze is pushed, which is the question
 *     this layer is on the map to answer.
 *   - The FEATHERS sit at the outer end of the staff, the way they do on a
 *     synoptic chart. One full feather is 10 knots; the half feather is half
 *     as long and is worth 5. The full feathers are all the same length, as
 *     they are on a chart — the number of them carries the speed, not their
 *     length.
 *
 * The convention is stated in words in the plate, because a barb is a
 * convention and a reader who knows barbs reads them in one second while a
 * reader who does not needs to be told which way the staff points.
 *
 * A CALM point (0 km/h) draws the circle and the staff and NO feathers.
 * That is not a missing glyph: "the wind stops here" is the single most
 * useful thing a haze map can say, because smoke pools where the air stops
 * moving.
 *
 * The whole mark stays well under ~2° of arc. The grid is 4° apart, and a
 * barb that reaches further than that collides with its neighbour and the
 * field turns into a smear.
 *
 * The circle, the staff and the feathers come back as THREE features, one
 * tagged 'station', one 'shaft' and one 'barbs', because a real barb draws
 * the staff heavier than the feathers and one MapLibre line layer cannot
 * carry two weights, and the circle is a point where the others are lines.
 *
 * A pure function: no DOM, no imports, no globals.
 */

const KMH_TO_KT = 0.539957;

// The staff is a fixed length on purpose. The feathers already carry the
// speed, so a staff that grew with it would say the same thing twice and
// make a strong wind look like a long arrow as well as a dense one.
const SHAFT_DEG = 1.15;
const BARB_LEN_DEG = 0.40;     // one full feather
const BARB_SPACING_DEG = 0.13; // along the staff, toward the circle

export const windBarbs = (collection) => {
    const features = [];
    for (const f of collection?.features || []) {
        const coords = f?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const [lon, lat] = coords;
        const speedKmh = Number(f?.properties?.speedKmh);
        const fromDeg = Number(f?.properties?.fromDeg);
        if (!Number.isFinite(speedKmh) || !Number.isFinite(fromDeg)) continue;

        const speedKt = Math.round(speedKmh * KMH_TO_KT);
        const full = Math.floor(speedKt / 10);
        const half = speedKt - full * 10 >= 5 ? 1 : 0;

        const toRad = ((fromDeg + 180) % 360) * Math.PI / 180; // downwind bearing
        const cosLat = Math.cos(lat * Math.PI / 180) || 1;
        const step = (from, bearing, d) => [
            from[0] + (d * Math.sin(bearing)) / cosLat,
            from[1] + d * Math.cos(bearing),
        ];

        const origin = [lon, lat];
        const tip = step(origin, toRad, SHAFT_DEG);

        const properties = {
            speedKmh,
            speedKt,
            fromDeg,
            barbs: full + half,
            barbsFull: full,
            barbsHalf: half
        };

        features.push({
            type: 'Feature',
            properties: { ...properties, kind: 'station' },
            geometry: { type: 'Point', coordinates: origin }
        });
        features.push({
            type: 'Feature',
            properties: { ...properties, kind: 'shaft' },
            geometry: { type: 'LineString', coordinates: [origin, tip] }
        });

        // The feathers sit at the outer end of the staff and march back
        // toward the circle. A long stack has to stay on the staff, so the
        // spacing gives way before the feathers do.
        const feathers = [];
        const spacing = full > 0
            ? Math.min(BARB_SPACING_DEG, (SHAFT_DEG * 0.66) / full)
            : 0;

        // The half feather is on the very end of the staff; the full ones sit
        // between it and the circle.
        if (half) {
            feathers.push([tip, step(tip, toRad + Math.PI / 2, BARB_LEN_DEG / 2)]);
        }
        for (let j = 0; j < full; j++) {
            const anchor = step(tip, toRad + Math.PI, (half ? spacing : 0) + j * spacing);
            feathers.push([anchor, step(anchor, toRad + Math.PI / 2, BARB_LEN_DEG)]);
        }

        // A calm point has no feathers. It still has a circle and a staff,
        // and that is the reading: the wind stops here.
        if (feathers.length) {
            features.push({
                type: 'Feature',
                properties: { ...properties, kind: 'barbs' },
                geometry: { type: 'MultiLineString', coordinates: feathers }
            });
        }
    }
    return { type: 'FeatureCollection', features };
};
