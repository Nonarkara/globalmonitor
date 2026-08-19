#!/usr/bin/env node
/**
 * Collect AIS vessels and write static snapshot for Cloudflare Pages.
 * Primary: aisstream.io WebSocket (Node). Fallback: Axiom Overwatch REST (no key).
 *
 * Usage: node scripts/refresh-ais-snapshot.mjs
 * Requires: AISSTREAM_API_KEY in .env.local (optional if Axiom fallback succeeds)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIS_BOXES_BY_THEATER, fetchAisSnapshotWithRetry } from '../functions/_lib/aisSnapshot.mjs';
import { fetchAxiomGlobalSnapshot } from '../server/lib/axiomOverwatch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'data', 'ais');
const SNAPSHOT_FILE = 'ais-snapshot.json';

const loadEnvFile = (filename) => {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
};

loadEnvFile('.env.local');
loadEnvFile('.env');

const apiKey = process.env.AISSTREAM_API_KEY || '';
let features = [];
let source = 'axiom-overwatch.io';
let rawSeen = null;
let collectMs = null;

// The dashboard is Asia-facing, so a snapshot is only useful if it actually
// contains Asian vessels. That is the invariant this script has to protect.
const ASIA = [60, -12, 150, 55]; // [minLon, minLat, maxLon, maxLat]
const countInAsia = (list) => list.filter((f) => {
    const [lon, lat] = f?.geometry?.coordinates || [];
    return lon >= ASIA[0] && lon <= ASIA[2] && lat >= ASIA[1] && lat <= ASIA[3];
}).length;
const MIN_ASIA_VESSELS = 500;

// Axiom Overwatch first. It is a plain REST pull with no key, and it returns a
// genuinely global set — measured 2026-08-19: 60,283 vessels, 19,062 of them in
// the Asia box, lon -180..180.
//
// aisstream is the fallback, not the primary, because its free feed follows
// terrestrial receiver density rather than the map: a 180s global subscription on
// 2026-08-18 collected 7,067 vessels spanning lon -90..42 — the Atlantic basin,
// nothing east of Egypt, zero in Asia. That snapshot would have emptied the map.
console.log('[refresh-ais-snapshot] Fetching Axiom Overwatch REST…');
const axiom = await fetchAxiomGlobalSnapshot();
features = axiom.features || [];
if (features.length > 0) {
    console.log(`[refresh-ais-snapshot] Axiom returned ${features.length} vessels, ${countInAsia(features)} in Asia (truncated=${axiom.truncated})`);
} else {
    console.warn('[refresh-ais-snapshot] Axiom empty:', axiom.error || 'unknown');
}

if (countInAsia(features) < MIN_ASIA_VESSELS && apiKey.length >= 8) {
    collectMs = Number(process.env.AIS_COLLECT_MS) || 180_000;
    console.log(`[refresh-ais-snapshot] Falling back to aisstream WebSocket (${collectMs / 1000}s)…`);
    const result = await fetchAisSnapshotWithRetry(apiKey, {
        boundingBoxes: AIS_BOXES_BY_THEATER.indopacific,
        timeoutMs: collectMs,
        maxVessels: 8000,
        maxAttempts: 1,
        earlyExit: false,
    });
    const streamed = result.features || [];
    console.warn(`[refresh-ais-snapshot] aisstream: ${streamed.length} vessels, ${countInAsia(streamed)} in Asia (rawSeen=${result.rawSeen ?? 0}${result.error ? `, ${result.error}` : ''})`);
    if (countInAsia(streamed) > countInAsia(features)) {
        features = streamed;
        source = 'aisstream.io';
        rawSeen = result.rawSeen ?? null;
    } else {
        collectMs = null;
    }
}

// Publishing a snapshot the map cannot draw is worse than keeping yesterday's:
// the UI would sit on "Awaiting AIS feed…" with no indication anything is wrong.
// Leave the existing file in place and exit non-zero so a cron surfaces it.
if (countInAsia(features) < MIN_ASIA_VESSELS) {
    console.error(`[refresh-ais-snapshot] REFUSING TO WRITE — only ${countInAsia(features)} vessels in the Asia box (floor ${MIN_ASIA_VESSELS}), from ${features.length} total.`);
    console.error('[refresh-ais-snapshot] Existing snapshot left untouched.');
    process.exit(1);
}

// A Pages Function reads this whole file per cold request and samples it down to
// ~1,200 for display, so the raw count is cost with no visible benefit. Keep every
// vessel the Asia-facing theaters actually draw from, thin the rest to a global
// backdrop, and drop the two properties nothing reads (imo duplicates mmsi;
// shipType is only ever consumed as the derived `category`).
// Every in-theater vessel is kept — that density is the point of the map. The
// backdrop is a fixed quota on top, just enough that a zoomed-out world view
// doesn't read as a broken feed outside Asia.
const BACKDROP_VESSELS = 3_000;
const inAsia = (f) => {
    const [lon, lat] = f?.geometry?.coordinates || [];
    return lon >= ASIA[0] && lon <= ASIA[2] && lat >= ASIA[1] && lat <= ASIA[3];
};
const inMiddleEast = (f) => {
    const [lon, lat] = f?.geometry?.coordinates || [];
    return lon >= 24 && lon <= 65 && lat >= 10 && lat <= 42;
};
const slim = (f) => {
    const [lon, lat] = f.geometry.coordinates;
    const props = {};
    for (const [k, v] of Object.entries(f.properties || {})) {
        if (k === 'imo' || k === 'shipType' || v === null || v === '') continue;
        props[k] = v;
    }
    // 4 decimals is ~11m — finer than any vessel icon on this map.
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [Number(lon.toFixed(4)), Number(lat.toFixed(4))] }, properties: props };
};

const keep = features.filter((f) => inAsia(f) || inMiddleEast(f));
const rest = features.filter((f) => !inAsia(f) && !inMiddleEast(f));
// Even stride rather than a slice, so the backdrop stays spread across the globe
// instead of clustering wherever the upstream happened to order its rows.
const stride = rest.length > BACKDROP_VESSELS ? Math.ceil(rest.length / BACKDROP_VESSELS) : 1;
const backdrop = rest.filter((_, i) => i % stride === 0).slice(0, BACKDROP_VESSELS);

features = [...keep, ...backdrop].map(slim);
const asiaCount = countInAsia(features);
console.log(`[refresh-ais-snapshot] Capped to ${features.length} vessels (${keep.length} in-theater + ${backdrop.length} backdrop), ${asiaCount} in Asia`);

const collectedAt = new Date().toISOString();

const snapshot = {
    type: 'FeatureCollection',
    features,
    meta: {
        collectedAt,
        vesselCount: features.length,
        asiaVesselCount: asiaCount,
        source,
        rawSeen,
        collectMs,
    },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, SNAPSHOT_FILE), JSON.stringify(snapshot));

const manifest = [{
    id: 'ais-snapshot',
    file: SNAPSHOT_FILE,
    label: 'AIS vessel positions',
    aoi: 'global',
    collectedAt,
    vesselCount: features.length,
    asiaVesselCount: asiaCount,
    refreshHint: 'node scripts/refresh-ais-snapshot.mjs (cron every 15 min recommended)',
}];
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`[refresh-ais-snapshot] Wrote ${features.length} vessels → public/data/ais/${SNAPSHOT_FILE}`);
