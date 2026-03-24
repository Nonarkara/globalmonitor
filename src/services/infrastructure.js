import { fetchBackendJson } from './backendClient.js';

export const fetchInfrastructure = async (theater = 'middleeast') => {
    return fetchBackendJson('/api/infrastructure', { theater });
};
