/**
 * Air-quality client service — proxies through /api/air-quality. The server
 * fans out to Open-Meteo for 11 Asian capitals (Jakarta included) in parallel,
 * caches for 30 min, and returns a FeatureCollection shaped exactly like the
 * client (and the tools the map's tooltip already understand) want.
 */
import { fetchBackendJson } from './backendClient.js';

export const fetchAirQuality = () => fetchBackendJson('/api/air-quality');
