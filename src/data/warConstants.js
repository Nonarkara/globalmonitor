/**
 * @deprecated Backward-compatibility shim for the Iran–Israel War constants.
 *
 * NEW CODE: import from './conflicts.js' (per-conflict registry —
 * getConflict, getConflictByTheater, getDayCount(conflictId),
 * formatDayCount(conflictId)). This file only preserves the legacy
 * singleton API so existing consumers keep working unchanged; it
 * re-exports the 'iran-israel-war' (middleeast) entry's values.
 */
import { CONFLICTS } from './conflicts';

const MIDDLEEAST_CONFLICT = CONFLICTS['iran-israel-war'];

export const WAR_START = new Date(`${MIDDLEEAST_CONFLICT.startDate}T00:00:00Z`);
export const WAR_START_ISO = MIDDLEEAST_CONFLICT.startDate;

/** Days elapsed since war start */
export const getDayCount = () => Math.floor((Date.now() - WAR_START.getTime()) / 86400000);

/** Format a day count for display */
export const formatDayCount = () => `DAY ${getDayCount()}`;
