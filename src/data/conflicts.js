/**
 * Conflict registry — single source of truth for the conflicts the
 * dashboard tracks, replacing the single-war warConstants singleton.
 *
 * Each entry: id, theater, label, shortLabel, startDate (ISO date string
 * or null), belligerents summary, and a color token (matches the theater
 * dot/accent colors used in regions.js).
 *
 * HARD RULE: never invent a start date. startDate is set ONLY where the
 * codebase already tracks a dated conflict (middleeast → Iran–Israel War,
 * 2026-02-28, per src/data/conflictMilestones.json "Operation Begins").
 * Theaters with only undated situational data (southChinaSeaData.json,
 * thailandDigital.json) get startDate: null; day-count helpers return
 * null for them so UI must render a shell, not a fabricated counter.
 *
 * Consumers of the legacy warConstants.js API are unaffected — that file
 * is now a thin shim re-exporting the middleeast entry.
 */

export const CONFLICTS = {
    'iran-israel-war': {
        id: 'iran-israel-war',
        theater: 'middleeast',
        label: 'Iran–Israel War',
        shortLabel: 'Iran War',
        startDate: '2026-02-28',
        belligerents: 'Iran (IRGC) & proxies vs. Israel + US coalition',
        color: '#D4A843'
    },
    'scs-gray-zone': {
        id: 'scs-gray-zone',
        theater: 'indopacific',
        label: 'South China Sea Gray-Zone Tensions',
        shortLabel: 'SCS Tensions',
        // No tracked start date in the codebase (southChinaSeaData.json is
        // an undated situational picture) — null by the no-invented-dates rule.
        startDate: null,
        belligerents: 'PRC gray-zone forces vs. Philippines/Vietnam/Taiwan; US alliance presence',
        color: '#38bdf8'
    },
    'thai-south-insurgency': {
        id: 'thai-south-insurgency',
        theater: 'thailand',
        label: 'Southern Thailand Insurgency',
        shortLabel: 'Deep South',
        // ACLED/briefings track incidents but no dated conflict start exists
        // in the codebase — null by the no-invented-dates rule.
        startDate: null,
        belligerents: 'Thai security forces vs. southern insurgent groups',
        color: '#22c55e'
    },
    'global-conflict-watch': {
        id: 'global-conflict-watch',
        theater: 'global',
        label: 'Global Conflict Watch',
        shortLabel: 'Global',
        // Aggregate entry spanning many conflicts — no single start date.
        startDate: null,
        belligerents: 'Aggregate of active conflicts worldwide',
        color: '#ef4444'
    }
};

const DAY_MS = 86400000;

/** Look up a conflict by id. Returns null for unknown ids. */
export const getConflict = (id) => CONFLICTS[id] || null;

/** First conflict registered for a theater, or null. */
export const getConflictByTheater = (theater) =>
    Object.values(CONFLICTS).find((c) => c.theater === theater) || null;

/**
 * Days elapsed since the conflict start.
 * Returns null when the conflict is unknown or has no tracked start date
 * (render a shell — never fabricate a counter).
 */
export const getDayCount = (conflictId) => {
    const conflict = getConflict(conflictId);
    if (!conflict?.startDate) return null;
    return Math.floor((Date.now() - new Date(`${conflict.startDate}T00:00:00Z`).getTime()) / DAY_MS);
};

/**
 * 'DAY N' label for a conflict, or null when no start date is tracked.
 */
export const formatDayCount = (conflictId) => {
    const day = getDayCount(conflictId);
    return day == null ? null : `DAY ${day}`;
};
