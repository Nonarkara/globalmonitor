/** Valid WGS84 point — rejects NaN, null coords and out-of-range values MapLibre rejects. */
export const isValidLngLat = (lon, lat) => (
    Number.isFinite(lon)
    && Number.isFinite(lat)
    && lon >= -180
    && lon <= 180
    && lat >= -90
    && lat <= 90
);

export const getPointCoordinates = (feature) => {
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lon, lat] = coords;
    return isValidLngLat(lon, lat) ? [lon, lat] : null;
};

/** Drop point features with invalid coordinates before MapLibre setData. */
export const sanitizePointCollection = (geojson) => {
    if (!geojson?.features?.length) return geojson;

    const features = geojson.features.filter((feature) => {
        if (feature?.geometry?.type !== 'Point') return true;
        return getPointCoordinates(feature) !== null;
    });

    if (features.length === geojson.features.length) return geojson;

    return {
        ...geojson,
        features,
        meta: geojson.meta,
    };
};

/** Drop line features whose coordinates are not all finite lng/lat pairs. */
export const sanitizeLineCollection = (geojson) => {
    if (!geojson?.features?.length) return geojson;

    const features = geojson.features.filter((feature) => {
        if (feature?.geometry?.type !== 'LineString') return true;
        const coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return false;
        return coords.every(([lon, lat]) => isValidLngLat(lon, lat));
    });

    if (features.length === geojson.features.length) return geojson;

    return features.length
        ? { ...geojson, features, meta: geojson.meta }
        : null;
};

export const finiteHeading = (value, fallback = 0) => (
    Number.isFinite(value) ? value : fallback
);
