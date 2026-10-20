import { fetchBackendJson } from './backendClient.js';

/**
 * The tropical-cyclone bulletin from the Japan Meteorological Agency.
 *
 * This is the "depression wind" the map draws: the storm's centre, the
 * analyst's gale and storm wind radii, the track it has run and the track it
 * is forecast to run, and its analysed intensity.
 *
 * It is an ANALYSIS, not a raw satellite wind retrieval — JMA builds it from
 * satellite imagery, aircraft, buoys and a numerical model — and the meta says
 * exactly that, in the note the plate reads.
 */
export const fetchTyphoon = () => fetchBackendJson('/api/typhoon');
