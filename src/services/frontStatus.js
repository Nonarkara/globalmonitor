import { fetchBackendJson } from './backendClient.js';

export const fetchFrontStatus = () => fetchBackendJson('/api/fronts');
