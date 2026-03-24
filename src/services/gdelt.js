import { fetchBackendJson } from './backendClient.js';

export const fetchGdeltSentiment = async (theater = 'middleeast') => {
    return fetchBackendJson('/api/sentiment', { theater });
};
