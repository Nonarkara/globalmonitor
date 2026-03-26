import { fetchBackendJson } from './backendClient.js';

export const fetchUsgsQuakes = (theater = 'middleeast') =>
    fetchBackendJson('/api/quakes', { theater });
