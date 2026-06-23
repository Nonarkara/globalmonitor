/** Lightweight flight-count pub/sub — avoids lifting count into App state. */
import { EMPTY_TRAFFIC_STATS } from '../utils/formatTrafficCount.js';

let stats = { ...EMPTY_TRAFFIC_STATS };
const listeners = new Set();

export const setFlightStats = (next) => {
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

/** @deprecated use setFlightStats — kept for grep compatibility */
export const setFlightCount = (apiTotal) => setFlightStats({ apiTotal, total: apiTotal });

export const getFlightStats = () => stats;

export const getFlightCount = () => stats.apiTotal;

export const subscribeFlightStats = (fn) => {
    listeners.add(fn);
    fn(stats);
    return () => listeners.delete(fn);
};

export const subscribeFlightCount = subscribeFlightStats;
