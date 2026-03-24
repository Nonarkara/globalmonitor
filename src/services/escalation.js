import { fetchBackendJson } from './backendClient.js';

export const fetchEscalation = async (theater = 'middleeast') => {
    return fetchBackendJson('/api/escalation', { theater });
};
