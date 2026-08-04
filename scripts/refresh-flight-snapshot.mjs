#!/usr/bin/env node
/** Refresh the static OpenSky safety snapshot used when Cloudflare is upstream-throttled. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchOpenSkyPayload } from '../server/lib/opensky.mjs';
import { spreadSamplePointCollection } from '../src/utils/geojsonValidate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'public', 'data', 'flights', 'opensky-snapshot.geojson');
const MAX_SNAPSHOT_AIRCRAFT = 2000;

try {
    const payload = await fetchOpenSkyPayload('global');
    if (!payload.features?.length) throw new Error(payload.meta?.error || 'OpenSky returned no aircraft');

    const sampled = spreadSamplePointCollection(payload, MAX_SNAPSHOT_AIRCRAFT).collection;
    const snapshot = {
        ...sampled,
        meta: {
            ...payload.meta,
            source: 'opensky-snapshot',
            collectedAt: new Date().toISOString(),
            count: sampled.features.length,
            upstreamCount: payload.features.length,
            refreshHint: 'npm run refresh:flights (scheduled every 15 minutes)',
        },
    };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(snapshot)}\n`, 'utf8');
    console.log(`Wrote ${snapshot.features.length}/${payload.features.length} aircraft to ${outputPath}`);
} catch (error) {
    try {
        await fs.access(outputPath);
        console.warn(`Flight refresh failed; preserving existing snapshot: ${error.message}`);
    } catch {
        console.error(`Flight refresh failed and no snapshot exists: ${error.message}`);
        process.exitCode = 1;
    }
}
