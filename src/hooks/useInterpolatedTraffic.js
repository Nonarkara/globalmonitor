import { useEffect, useRef } from 'react';

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

// Flights carry `velocity` in m/s; vessels carry `speed` in knots. Normalize to m/s.
const speedMps = (props) => {
    if (Number.isFinite(props?.velocity)) return props.velocity;
    if (Number.isFinite(props?.speed)) return props.speed * 0.514444;
    return 0;
};

// Cap dead-reckoning so a stalled feed parks markers near their last fix instead
// of flinging them off the map (matches the look-ahead vector ceiling).
const MAX_DEAD_RECKON_M = 25000;

// Equirectangular forward projection — advance a point distM metres along a
// compass bearing. Good enough for dead-reckoning a few km between polls.
const EARTH_R = 6378137;
const advance = (lon, lat, headingDeg, distM) => {
    if (!Number.isFinite(distM) || distM <= 0) return [lon, lat];
    const theta = (headingDeg * Math.PI) / 180;
    const dLat = (distM * Math.cos(theta)) / EARTH_R;
    const dLon = (distM * Math.sin(theta)) / (EARTH_R * Math.cos((lat * Math.PI) / 180));
    return [lon + (dLon * 180) / Math.PI, lat + (dLat * 180) / Math.PI];
};

// Traffic payloads can come from a live poll, the server's stale cache, or a
// browser-side snapshot written by an older build — never trust geometry shape.
const isRenderablePoint = (f) => (
    f?.geometry?.type === 'Point'
    && Array.isArray(f.geometry.coordinates)
    && Number.isFinite(f.geometry.coordinates[0])
    && Number.isFinite(f.geometry.coordinates[1])
);

// Snapshot where each feature visually sits right now, keyed by stable id, so a
// new poll lerps forward from the displayed position instead of snapping back.
const seedPositions = (geojson, idKey) => {
    const map = new Map();
    for (const feature of geojson?.features || []) {
        if (!isRenderablePoint(feature)) continue;
        const id = getFeatureId(feature, idKey);
        if (!id) continue;
        const [lon, lat] = feature.geometry.coordinates;
        const p = feature.properties || {};
        map.set(id, { lon, lat, heading: p.heading ?? 0, course: p.course ?? p.heading ?? 0 });
    }
    return map;
};

// One mutable display copy per poll. The rAF loop mutates coordinates/heading in
// place and hands the same object to setData — MapLibre clones it across the
// worker boundary on every call, so in-place mutation is safe and allocation-free.
const makeDisplay = (target) => ({
    type: 'FeatureCollection',
    features: (target?.features || []).filter(isRenderablePoint).map((f) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]] },
        properties: { ...f.properties },
    })),
});

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

/**
 * Animates moving point traffic (aircraft / ships) between sparse polls by
 * writing straight into a MapLibre GeoJSON source — no React state, so a frame
 * costs one in-place mutation pass + one setData, and the (large) MapContainer
 * tree never re-renders on the animation path. This replaced a setState-driven
 * tween that re-rendered the whole map 4x/sec and froze the page.
 *
 * Two-stage motion per poll: lerp from the displayed position to the new target
 * over `durationMs`, then dead-reckon along heading at the reported speed for at
 * most one more interval so markers glide through a late poll.
 *
 * CRITICAL: features are matched by stable id (hex/mmsi), never by array index.
 * The backend reorders features every poll, so index pairing would lerp plane A
 * toward plane B's coordinates — the classic teleport/smear bug.
 */
export const useTrafficAnimator = (mapRef, sourceId, geojson, {
    idKey = 'hex',
    durationMs = 30000,
    frameMs = 1000,
    enabled = true,
} = {}) => {
    const displayRef = useRef(null);        // mutable FC currently on the map
    const frameRef = useRef(null);

    useEffect(() => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);

        const writeToSource = (fc) => {
            try {
                const source = mapRef.current?.getMap?.()?.getSource(sourceId);
                if (!source) return false;
                source.setData(fc);
                return true;
            } catch {
                // Style mid-swap (basemap/theater switch) — retry next frame.
                return false;
            }
        };

        // Sanitize ONCE and use the same array everywhere: the tick loop pairs
        // target[i] with display[i] by index, so both must come from this list.
        const targetFeatures = (geojson?.features || []).filter(isRenderablePoint);

        if (!enabled || !targetFeatures.length) {
            displayRef.current = null;
            writeToSource(EMPTY_FC);
            return undefined;
        }

        // Seed the tween origin from what the map is already showing so traffic
        // glides forward from its current pixels rather than jumping.
        const prev = displayRef.current?.features?.length
            ? seedPositions(displayRef.current, idKey)
            : seedPositions(geojson, idKey);
        const display = makeDisplay({ features: targetFeatures });
        displayRef.current = display;
        const start = performance.now();
        let lastFrameAt = 0;
        let wroteOnce = false;

        const tick = () => {
            const now = performance.now();
            const elapsed = now - start;
            const t = Math.min(1, elapsed / durationMs);
            const overdueMs = elapsed - durationMs; // > 0 once tween is done
            // Animate through the tween plus one extra interval of dead reckoning,
            // then stop scheduling so a stalled feed doesn't spin rAF forever.
            const stillAnimating = t < 1 || overdueMs <= durationMs;

            // Throttle mutation + worker traffic; keep retrying until the source
            // exists (react-map-gl adds it asynchronously after style load).
            if (wroteOnce && now - lastFrameAt < frameMs) {
                if (stillAnimating) frameRef.current = requestAnimationFrame(tick);
                return;
            }

            for (let i = 0; i < targetFeatures.length; i++) {
                const tf = targetFeatures[i];
                const df = display.features[i];
                const id = getFeatureId(tf, idKey);
                const [tLon, tLat] = tf.geometry.coordinates;
                const tHeading = tf.properties?.heading ?? 0;
                const tCourse = tf.properties?.course ?? tHeading;
                const old = id ? prev.get(id) : null;
                const coords = df.geometry.coordinates;

                if (t < 1 && old) {
                    // Stage 1: glide from displayed position to the new target.
                    coords[0] = lerp(old.lon, tLon, t);
                    coords[1] = lerp(old.lat, tLat, t);
                    df.properties.heading = lerpAngle(old.heading, tHeading, t);
                    df.properties.course = lerpAngle(old.course, tCourse, t);
                } else if (overdueMs > 0) {
                    // Stage 2: dead-reckon forward from the target so a late poll
                    // doesn't freeze traffic. Recompute from target each frame —
                    // no accumulation drift; distance capped so a long feed stall
                    // parks markers near their last fix.
                    const drMs = Math.min(overdueMs, durationMs);
                    const dist = Math.min(speedMps(tf.properties) * (drMs / 1000), MAX_DEAD_RECKON_M);
                    const [lon, lat] = advance(tLon, tLat, df.properties.course ?? tCourse, dist);
                    coords[0] = lon;
                    coords[1] = lat;
                } else {
                    coords[0] = tLon;
                    coords[1] = tLat;
                    df.properties.heading = tHeading;
                    df.properties.course = tCourse;
                }
            }

            if (writeToSource(display)) {
                wroteOnce = true;
                lastFrameAt = now;
            }
            if (stillAnimating || !wroteOnce) frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [mapRef, sourceId, geojson, idKey, durationMs, frameMs, enabled]);
};

// Stable empty collection for <Source data={...}> — the React prop never changes,
// so react-map-gl never issues its own setData; the animator owns all writes.
export const EMPTY_TRAFFIC = EMPTY_FC;
