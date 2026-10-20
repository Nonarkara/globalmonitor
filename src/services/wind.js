import { fetchBackendJson } from './backendClient.js';

/**
 * The wind field, at one of two levels.
 *
 *   10 m      the wind at the ground — what the surface feels.
 *   850 hPa   about 1500 m up, the transport level — the air that actually
 *             carries the haze. This is the level that answers "where is the
 *             smoke being pushed".
 *
 * Both are Open-Meteo MODEL output. The meta says `model: true` and the
 * plate says so in words; neither is a satellite retrieval and neither is an
 * observation.
 */
export const fetchWind = (theater = 'indopacific', level = '10m') =>
    fetchBackendJson('/api/wind', { theater, level });

export const fetchTransportWind = (theater = 'indopacific') =>
    fetchWind(theater, '850hPa');
