import { fetchBackendJson } from './backendClient.js';

export const fetchVessels = async (theater = 'global') => fetchBackendJson('/api/vessels', { theater });
