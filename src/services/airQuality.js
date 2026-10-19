import { fetchBackendJson } from './backendClient.js';

export const fetchAirQuality = () => fetchBackendJson('/api/air-quality');
