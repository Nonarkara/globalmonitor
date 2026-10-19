/**
 * Turn wind points into arrow lines pointing DOWNWIND — the way haze drifts.
 * Shaft length and the reader's sense of strength both scale with speed; a calm
 * point becomes a short stub rather than disappearing, because "calm here" is
 * itself information during a haze episode (smoke pools where the wind stops).
 */
export const windArrows = (collection) => {
    const features = [];
    for (const f of collection?.features || []) {
        const [lon, lat] = f.geometry.coordinates;
        const { speedKmh, fromDeg } = f.properties;
        const toRad = ((fromDeg + 180) % 360) * Math.PI / 180; // downwind bearing
        const len = Math.min(3.2, 0.7 + speedKmh * 0.085);      // degrees; grid is 4
        const cosLat = Math.cos(lat * Math.PI / 180) || 1;
        const step = (from, bearing, d) => [
            from[0] + (d * Math.sin(bearing)) / cosLat,
            from[1] + d * Math.cos(bearing),
        ];
        // Centre the shaft on the grid point so the field reads evenly spaced.
        const tail = step([lon, lat], toRad + Math.PI, len / 2);
        const tip = step([lon, lat], toRad, len / 2);
        const barb = len * 0.32;
        const left = step(tip, toRad + Math.PI - 0.5, barb);
        const right = step(tip, toRad + Math.PI + 0.5, barb);
        features.push({
            type: 'Feature',
            properties: { speedKmh },
            geometry: { type: 'MultiLineString', coordinates: [[tail, tip], [left, tip, right]] },
        });
    }
    return { type: 'FeatureCollection', features };
};
