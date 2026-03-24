import { fetchBackendJson } from './backendClient.js';

export const fetchHumanitarian = async (theater = 'middleeast') => {
    return fetchBackendJson('/api/humanitarian', { theater });
};
