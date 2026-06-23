import { useSyncExternalStore } from 'react';
import { getVesselStats, subscribeVesselStats } from '../services/vesselCountBus';
import { EMPTY_TRAFFIC_STATS } from '../utils/formatTrafficCount.js';

export const useVesselStats = () =>
    useSyncExternalStore(subscribeVesselStats, getVesselStats, () => EMPTY_TRAFFIC_STATS);

export const useVesselCount = () => useVesselStats().apiTotal;
