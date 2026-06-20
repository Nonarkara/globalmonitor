import { fetchBackendJson } from './backendClient.js';

/**
 * Fetch an Oracle forecast. `injection` optionally carries a named scenario,
 * a raw escalation delta, and per-actor posture deltas (the sandbox sliders).
 */
export const fetchOracle = (theater = 'middleeast', injection = {}) => {
    const params = { theater };
    if (injection.scenario) params.scenario = injection.scenario;
    if (typeof injection.escalationDelta === 'number') params.escDelta = injection.escalationDelta;
    if (injection.postureDeltas && Object.keys(injection.postureDeltas).length) {
        params.p = Object.entries(injection.postureDeltas)
            .map(([id, d]) => `${id}:${Number(d).toFixed(2)}`)
            .join(',');
    }
    return fetchBackendJson('/api/oracle', params);
};
