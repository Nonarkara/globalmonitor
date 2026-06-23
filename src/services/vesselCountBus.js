/** Lightweight vessel-count pub/sub — avoids lifting count into App state. */
import { EMPTY_TRAFFIC_STATS } from '../utils/formatTrafficCount.js';

let stats = { ...EMPTY_TRAFFIC_STATS };
const listeners = new Set();

export const setVesselStats = (next) => {
    const merged = { ...EMPTY_TRAFFIC_STATS, ...next };
    if (
        merged.apiTotal === stats.apiTotal
        && merged.rendered === stats.rendered
        && merged.total === stats.total
        && merged.capped === stats.capped
    ) return;
    stats = merged;
    listeners.forEach((fn) => fn(stats));
};

/** @deprecated use setVesselStats */
export const setVesselCount = (apiTotal) => setVesselStats({ apiTotal, total: apiTotal });

export const getVesselStats = () => stats;

export const getVesselCount = () => stats.apiTotal;

export const subscribeVesselStats = (fn) => {
    listeners.add(fn);
    fn(stats);
    return () => listeners.delete(fn);
};

export const subscribeVesselCount = subscribeVesselStats;
