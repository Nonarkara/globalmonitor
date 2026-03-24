import { fetchBackendJson } from './backendClient.js';

export const fetchOpenSky = async (theater = 'middleeast') => {
    return fetchBackendJson('/api/flights', { theater });
};
