#!/usr/bin/env node
/**
 * Refresh the static ADS-B safety snapshot served when no live flight provider
 * answers from the Cloudflare edge. Runs from a normal machine (home IP), where
 * airplanes.live / adsb.lol do answer. Wired into `npm run deploy:pages`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAirplanesLivePayload } from '../server/lib/airplanesLive.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'public', 'data', 'flights', 'adsb-snapshot.geojson');

try {
    const payload = await fetchAirplanesLivePayload('global');
    if (!payload.features?.length) throw new Error(payload.meta?.error || 'ADS-B returned no aircraft');

    const snapshot = {
        ...payload,
        meta: {
            ...payload.meta,
            source: 'adsb-snapshot',
            collectedAt: new Date().toISOString(),
            count: payload.features.length,
            refreshHint: 'npm run refresh:flights (runs before every deploy)'
        }
    };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(snapshot)}\n`, 'utf8');
    console.log(`Wrote ${snapshot.features.length} aircraft to ${outputPath}`);
} catch (error) {
    try {
        await fs.access(outputPath);
        console.warn(`Flight refresh failed; preserving existing snapshot: ${error.message}`);
    } catch {
        console.error(`Flight refresh failed and no snapshot exists: ${error.message}`);
        process.exitCode = 1;
    }
}
