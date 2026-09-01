import { fetchBackendJson } from './backendClient';

/**
 * Latest Sentinel-1 radar pass for a theater.
 *
 * Returns a payload whose `latest` is null when no satellite crossed that box
 * inside the search window. That is an ordinary outcome — Sentinel-1 repeats
 * every 6–12 days — and the map is expected to say so rather than draw nothing
 * and leave the reader guessing.
 */
export const fetchSar = (theater = 'indopacific') =>
    fetchBackendJson('/api/sar', { theater });
