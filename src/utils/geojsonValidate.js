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

/**
 * Cap point features with geographic spread — avoids feed-order bias (e.g. US-only first N).
 * Returns { collection, capped, totalInView }.
 */
export const spreadSamplePointCollection = (collection, maxFeatures, gridCols = 24, gridRows = 12) => {
    const features = collection?.features;
    if (!features?.length || features.length <= maxFeatures) {
        return { collection, capped: false, totalInView: features?.length ?? 0 };
    }

    const buckets = new Map();
    for (const feature of features) {
        const coords = getPointCoordinates(feature);
        if (!coords) continue;
        const [lon, lat] = coords;
        const col = Math.min(gridCols - 1, Math.floor(((lon + 180) / 360) * gridCols));
        const row = Math.min(gridRows - 1, Math.floor(((lat + 90) / 180) * gridRows));
        const key = `${col}:${row}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(feature);
    }

    const bucketList = [...buckets.values()];
    const perBucket = Math.max(1, Math.ceil(maxFeatures / Math.max(bucketList.length, 1)));
    const sampled = [];

    for (const bucket of bucketList) {
        for (let i = 0; i < Math.min(perBucket, bucket.length); i += 1) {
            sampled.push(bucket[i]);
            if (sampled.length >= maxFeatures) break;
        }
        if (sampled.length >= maxFeatures) break;
    }

    if (sampled.length < maxFeatures) {
        const picked = new Set(sampled);
        for (const feature of features) {
            if (sampled.length >= maxFeatures) break;
            if (!picked.has(feature)) {
                sampled.push(feature);
                picked.add(feature);
            }
        }
    }

    return {
        collection: { ...collection, features: sampled.slice(0, maxFeatures) },
        capped: true,
        totalInView: features.length,
    };
};
