import { fetchBackendJson } from './backendClient';

/** Internet outages confirmed by Cloudflare Radar, last 28 days. */
export const fetchOutages = () => fetchBackendJson('/api/outages');
