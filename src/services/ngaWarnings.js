import { fetchBackendJson } from './backendClient.js';

export const fetchNgaWarnings = () => fetchBackendJson('/api/nga-warnings');
