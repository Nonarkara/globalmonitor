import { fetchBackendJson } from './backendClient.js';

export const fetchJaxaAerosolTiles = async () => fetchBackendJson('/api/jaxa-aerosol');
