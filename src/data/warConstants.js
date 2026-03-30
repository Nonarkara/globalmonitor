/** Shared war constants — single source of truth */
export const WAR_START = new Date('2026-02-28T00:00:00Z');
export const WAR_START_ISO = '2026-02-28';

/** Days elapsed since war start */
export const getDayCount = () => Math.floor((Date.now() - WAR_START.getTime()) / 86400000);

/** Format a day count for display */
export const formatDayCount = () => `DAY ${getDayCount()}`;
