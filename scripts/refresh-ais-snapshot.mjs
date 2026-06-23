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
let source = 'aisstream.io';
let rawSeen = null;
let collectMs = 30_000;

if (apiKey.length >= 8) {
    console.log(`[refresh-ais-snapshot] Trying aisstream WebSocket (${collectMs / 1000}s)…`);
    const result = await fetchAisSnapshotWithRetry(apiKey, {
        boundingBoxes: AIS_BOXES_BY_THEATER.global,
        timeoutMs: collectMs,
        maxVessels: 8000,
        maxAttempts: 1,
    });
    features = result.features || [];
    rawSeen = result.rawSeen ?? null;
    if (features.length === 0) {
        console.warn('[refresh-ais-snapshot] aisstream empty:', result.error || 'unknown', `(rawSeen=${rawSeen ?? 0})`);
    }
} else {
    console.warn('[refresh-ais-snapshot] No AISSTREAM_API_KEY — skipping WebSocket');
}

if (features.length === 0) {
    console.log('[refresh-ais-snapshot] Trying Axiom Overwatch REST fallback…');
    const axiom = await fetchAxiomGlobalSnapshot();
    features = axiom.features || [];
    if (features.length > 0) {
        source = 'axiom-overwatch.io';
        collectMs = null;
        console.log(`[refresh-ais-snapshot] Axiom returned ${features.length} vessels (truncated=${axiom.truncated})`);
    } else {
        console.error('[refresh-ais-snapshot] No vessels collected:', axiom.error || 'unknown');
        process.exit(1);
    }
}

const collectedAt = new Date().toISOString();

const snapshot = {
    type: 'FeatureCollection',
    features,
    meta: {
        collectedAt,
        vesselCount: features.length,
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
    refreshHint: 'node scripts/refresh-ais-snapshot.mjs (cron every 15 min recommended)',
}];
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`[refresh-ais-snapshot] Wrote ${features.length} vessels → public/data/ais/${SNAPSHOT_FILE}`);
