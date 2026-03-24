import { fetchBackendJson } from './backendClient.js';

export const fetchFirmsData = async (theater = 'middleeast') => {
    return fetchBackendJson('/api/firms', { theater });
};
