#!/usr/bin/env node
/**
 * Collect AIS vessels via aisstream.io (Node WebSocket) and write static snapshot
 * for Cloudflare Pages — Workers cannot receive AIS frames on native WebSocket.
 *
 * Usage: node scripts/refresh-ais-snapshot.mjs
 * Requires: AISSTREAM_API_KEY in .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAisSnapshotWithRetry } from '../functions/_lib/aisSnapshot.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'data', 'ais');
const SNAPSHOT_FILE = 'ais-snapshot.json';
const COLLECT_MS = 30_000;

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
if (!apiKey || apiKey.length < 8) {
    console.error('[refresh-ais-snapshot] Missing AISSTREAM_API_KEY in .env.local');
    process.exit(1);
}

console.log(`[refresh-ais-snapshot] Collecting for ${COLLECT_MS / 1000}s…`);

const result = await fetchAisSnapshotWithRetry(apiKey, {
    boundingBoxes: [[[-180, -90], [180, 90]]],
    timeoutMs: COLLECT_MS,
    maxVessels: 8000,
    maxAttempts: 1,
});

const collectedAt = new Date().toISOString();
const features = result.features || [];

if (features.length === 0) {
    console.error('[refresh-ais-snapshot] No vessels collected:', result.error || 'unknown', `(rawSeen=${result.rawSeen ?? 0}, closeCode=${result.closeCode ?? 'n/a'})`);
    process.exit(1);
}

const snapshot = {
    type: 'FeatureCollection',
    features,
    meta: {
        collectedAt,
        vesselCount: features.length,
        source: 'aisstream.io',
        rawSeen: result.rawSeen ?? null,
        collectMs: COLLECT_MS,
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
