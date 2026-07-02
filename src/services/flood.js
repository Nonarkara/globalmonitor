import { fetchBackendJson } from './backendClient.js';

/** Live flood intelligence for a monitored city (HII/ThaiWater telemetry). */
export const fetchFloodOps = (city = 'ayutthaya') =>
    fetchBackendJson('/api/flood', { city });

/**
 * Mayor's operational directive. `sim` optionally carries the God's-Mode
 * terrain run: { deltaM, floodedKm2, floodedPois: string[] }.
 */
export const fetchFloodDirective = (city = 'ayutthaya', sim = null) => {
    const params = { city };
    if (sim && typeof sim.deltaM === 'number') {
        params.delta = sim.deltaM.toFixed(1);
        params.km2 = (sim.floodedKm2 ?? 0).toFixed(1);
        if (sim.floodedPois?.length) params.pois = sim.floodedPois.slice(0, 8).join('|');
    }
    return fetchBackendJson('/api/flood/directive', params);
};
