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

// Snapshot where each feature visually sits right now, keyed by stable id, so a
// new poll lerps forward from the displayed position instead of snapping back.
const seedPositions = (geojson, idKey) => {
    const map = new Map();
    for (const feature of geojson?.features || []) {
        const id = getFeatureId(feature, idKey);
        if (!id) continue;
        const [lon, lat] = feature.geometry.coordinates;
        const p = feature.properties || {};
        map.set(id, { lon, lat, heading: p.heading ?? 0, course: p.course ?? p.heading ?? 0 });
    }
    return map;
};

/**
 * Smoothly animates moving point traffic (aircraft / ships) between sparse
 * polls. Two-stage motion: lerp from the previous displayed position to the new
 * target over `durationMs`, then dead-reckon along heading at the reported speed
 * so markers keep gliding if the next poll is late.
 *
 * CRITICAL: features are matched by stable id (hex/mmsi), never by array index.
 * The backend reorders features every poll, so index pairing would lerp plane A
 * toward plane B's coordinates — the classic teleport/smear bug.
 */
export const useInterpolatedTraffic = (geojson, {
    idKey = 'hex',
    durationMs = 30000,
    frameMs = 250,
    enabled = true,
} = {}) => {
    const prevRef = useRef(new Map());      // id -> position at tween start
    const startRef = useRef(0);             // tween start timestamp
    const frameRef = useRef(null);
    const targetRef = useRef(geojson);
    const lastFrameAtRef = useRef(0);
    const [display, setDisplay] = useState(geojson);
    const displayRef = useRef(geojson);

    useEffect(() => {
        displayRef.current = display;
    }, [display]);

    useEffect(() => {
        targetRef.current = geojson;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);

        // No animation: snap straight to the data.
        if (!enabled || !geojson?.features?.length) {
            prevRef.current = new Map();
            displayRef.current = geojson;
            const raf = requestAnimationFrame(() => setDisplay(geojson));
            return () => cancelAnimationFrame(raf);
        }

        // Seed the tween origin from what the map is already showing so traffic
        // glides forward from its current pixels rather than jumping.
        prevRef.current = displayRef.current?.features?.length
            ? seedPositions(displayRef.current, idKey)
            : seedPositions(geojson, idKey);
        startRef.current = performance.now();
        lastFrameAtRef.current = 0;

        const tick = () => {
            const now = performance.now();
            const target = targetRef.current;
            if (!target?.features?.length) {
                setDisplay(target);
                return;
            }

            const elapsed = now - startRef.current;
            const t = Math.min(1, elapsed / durationMs);
            const overdueMs = elapsed - durationMs; // > 0 once tween is done
            // Animate through the tween plus one extra interval of dead reckoning,
            // then stop scheduling so a stalled feed doesn't spin rAF forever.
            const stillAnimating = t < 1 || overdueMs <= durationMs;

            // Throttle React/setData churn.
            if (now - lastFrameAtRef.current < frameMs) {
                if (stillAnimating) frameRef.current = requestAnimationFrame(tick);
                return;
            }
            lastFrameAtRef.current = now;

            const prev = prevRef.current;
            // Return a fresh top-level FeatureCollection each frame so React's setState
            // bailout doesn't skip the update; react-map-gl then deep-compares the data
            // prop and calls setData when coordinates actually change.
            const features = new Array(target.features.length);
            for (let i = 0; i < target.features.length; i++) {
                const tf = target.features[i];
                const id = getFeatureId(tf, idKey);
                const [tLon, tLat] = tf.geometry.coordinates;
                const tHeading = tf.properties?.heading ?? 0;
                const tCourse = tf.properties?.course ?? tHeading;
                const old = id ? prev.get(id) : null;

                let lon = tLon;
                let lat = tLat;
                let heading = tHeading;
                let course = tCourse;

                if (t < 1 && old) {
                    // Stage 1: glide from displayed position to the new target.
                    lon = lerp(old.lon, tLon, t);
                    lat = lerp(old.lat, tLat, t);
                    heading = lerpAngle(old.heading, tHeading, t);
                    course = lerpAngle(old.course, tCourse, t);
                } else if (overdueMs > 0) {
                    // Stage 2: dead-reckon forward from the target so a late poll
                    // doesn't freeze traffic. Cap look-ahead time AND distance so a
                    // long feed stall parks markers near their last fix instead of
                    // flinging them off-map. Recompute from target each frame —
                    // no accumulation drift.
                    const drMs = Math.min(overdueMs, durationMs);
                    const dist = Math.min(speedMps(tf.properties) * (drMs / 1000), MAX_DEAD_RECKON_M);
                    [lon, lat] = advance(tLon, tLat, course, dist);
                }

                features[i] = {
                    ...tf,
                    geometry: { type: 'Point', coordinates: [lon, lat] },
                    properties: { ...tf.properties, heading, course },
                };
            }

            displayRef.current = { type: 'FeatureCollection', features, meta: target.meta };
            setDisplay(displayRef.current);
            if (stillAnimating) frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [geojson, idKey, durationMs, frameMs, enabled]);

    return display;
};
