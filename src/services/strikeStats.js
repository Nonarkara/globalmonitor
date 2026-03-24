import { fetchBackendJson } from './backendClient.js';

export const fetchStrikeStats = async (theater = 'middleeast') => {
    return fetchBackendJson('/api/strike-stats', { theater });
};
