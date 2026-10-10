import { fetchBackendJson } from './backendClient';

/** 10 m wind grid for a theater. Points carry the meteorological FROM direction. */
export const fetchWind = (theater = 'indopacific') => fetchBackendJson('/api/wind', { theater });
