import { fetchBackendJson } from './backendClient.js';

export const fetchWind = (theater = 'indopacific') =>
    fetchBackendJson('/api/wind', { theater });
