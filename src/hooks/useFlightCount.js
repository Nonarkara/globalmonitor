import { useSyncExternalStore } from 'react';
import { getFlightStats, subscribeFlightStats } from '../services/flightCountBus';
import { EMPTY_TRAFFIC_STATS } from '../utils/formatTrafficCount.js';

export const useFlightStats = () =>
    useSyncExternalStore(subscribeFlightStats, getFlightStats, () => EMPTY_TRAFFIC_STATS);

/** API total only — prefer useFlightStats for honest rendered counts. */
export const useFlightCount = () => useFlightStats().apiTotal;
