import { useEffect, useRef, useState } from 'react';

const lerp = (a, b, t) => a + (b - a) * t;

const lerpAngle = (from, to, t) => {
    const f = Number(from) || 0;
    const target = Number(to) || 0;
    let delta = ((target - f + 540) % 360) - 180;
    return (f + delta * t + 360) % 360;
};

const getFeatureId = (feature, idKey) => {
    const props = feature.properties || {};
    return props[idKey] || props.hex || props.mmsi || props.callsign || null;
};

const isValidCoord = (lon, lat) => (
    Number.isFinite(lon) && Number.isFinite(lat)
    && lon >= -180 && lon <= 180
    && lat >= -90 && lat <= 90
);

const readCoords = (feature) => {
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    return isValidCoord(lon, lat) ? [lon, lat] : null;
};

const cloneFeature = (feature) => {
    const coords = readCoords(feature);
    if (!coords) return null;

    return {
        type: 'Feature',
        geometry: {
            type: feature.geometry?.type || 'Point',
            coordinates: [...coords],
        },
        properties: { ...(feature.properties || {}) },
    };
};

const cloneCollection = (geojson) => {
    if (!geojson?.features?.length) return null;

    const features = geojson.features
        .map(cloneFeature)
        .filter(Boolean);

    if (!features.length) return null;

    return {
        type: 'FeatureCollection',
        features,
        meta: geojson.meta,
    };
};

const seedPositions = (geojson, idKey) => {
    const map = new Map();
    for (const feature of geojson?.features || []) {
        const id = getFeatureId(feature, idKey);
        const coords = readCoords(feature);
        if (!id || !coords) continue;
        map.set(id, { lon: coords[0], lat: coords[1], heading: feature.properties?.heading ?? 0 });
    }
    return map;
};

/**
 * Smoothly lerps marker positions between polls without mutating upstream
 * React state or MapLibre source payloads.
 */
export const useInterpolatedTraffic = (geojson, {
    idKey = 'hex',
    durationMs = 60000,
    frameMs = 1000,
    enabled = true,
} = {}) => {
    const prevRef = useRef(new Map());
    const frameRef = useRef(null);
    const targetRef = useRef(geojson);
    const lastFrameAtRef = useRef(0);
    const [display, setDisplay] = useState(() => cloneCollection(geojson));
    const displayRef = useRef(display);

    useEffect(() => {
        displayRef.current = display;
    }, [display]);

    useEffect(() => {
        targetRef.current = geojson;

        if (frameRef.current) cancelAnimationFrame(frameRef.current);

        if (!enabled) {
            const cloned = cloneCollection(geojson);
            displayRef.current = cloned;
            const raf = requestAnimationFrame(() => setDisplay(cloned));
            return () => cancelAnimationFrame(raf);
        }

        if (!geojson?.features?.length) {
            // Hold last frame — empty polls must not blank traffic on the map.
            return () => {
                if (frameRef.current) cancelAnimationFrame(frameRef.current);
            };
        }

        if (displayRef.current?.features?.length) {
            // Resume from what the map is already showing so early refreshes do
            // not snap traffic back to an older poll before lerping forward.
            prevRef.current = seedPositions(displayRef.current, idKey);
        } else {
            prevRef.current = new Map();
        }

        const startTime = performance.now();
        lastFrameAtRef.current = 0;

        const tick = () => {
            const now = performance.now();
            const target = targetRef.current;
            if (!target?.features?.length) {
                return;
            }

            if (prevRef.current.size === 0) {
                prevRef.current = seedPositions(target, idKey);
                const cloned = cloneCollection(target);
                displayRef.current = cloned;
                setDisplay(cloned);
                return;
            }

            const t = Math.min(1, (now - startTime) / durationMs);
            const prev = prevRef.current;
            const isFinalFrame = t >= 1;

            if (!isFinalFrame && now - lastFrameAtRef.current < frameMs) {
                frameRef.current = requestAnimationFrame(tick);
                return;
            }

            lastFrameAtRef.current = now;

            // Rebuild display from target each frame — never mutate upstream geojson.
            const nextDisplay = cloneCollection(target);
            if (!nextDisplay) {
                return;
            }

            for (const feature of nextDisplay.features) {
                const id = getFeatureId(feature, idKey);
                const targetCoords = readCoords(feature);
                if (!targetCoords) continue;

                const [newLon, newLat] = targetCoords;
                const old = id ? prev.get(id) : null;

                if (!old) {
                    feature.geometry.coordinates = [newLon, newLat];
                    continue;
                }

                const nextLon = lerp(old.lon, newLon, t);
                const nextLat = lerp(old.lat, newLat, t);
                feature.geometry.coordinates = isValidCoord(nextLon, nextLat)
                    ? [nextLon, nextLat]
                    : [old.lon, old.lat];
                if (feature.properties) {
                    feature.properties.heading = lerpAngle(
                        old.heading,
                        feature.properties?.heading,
                        t
                    );
                }
            }

            displayRef.current = nextDisplay;
            setDisplay(nextDisplay);

            if (t < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                prevRef.current = seedPositions(target, idKey);
            }
        };

        frameRef.current = requestAnimationFrame(tick);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [geojson, idKey, durationMs, frameMs, enabled]);

    return display;
};
