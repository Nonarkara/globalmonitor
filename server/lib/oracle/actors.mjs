/**
 * Oracle actor personas — the agents of the geopolitical simulation.
 *
 * Each theater has a roster of actors with a baseline parameterization grounded
 * in src/data/actorNetwork.json (alliances/rivalries) and open-source posture
 * reads. These are MODEL PARAMETERS for an agent-based simulation, not asserted
 * facts — the simulation explores futures from them, it does not claim them true.
 *
 * Parameters (all 0..1 unless noted):
 *   posture     -1 conciliatory ……… +1 aggressive (signed)
 *   capability   military/economic weight in the escalation balance
 *   resolve      willingness to bear cost before backing down
 *   role         belligerent | patron | proxy | mediator | swing
 *   axis         coalition tag for reciprocity (same axis = ally dynamics)
 */

/** @typedef {{ id:string, label:string, role:string, axis:string,
 *   posture:number, capability:number, resolve:number, color:string }} Actor */

const MIDDLE_EAST = [
    { id: 'iran',      label: 'Iran',          role: 'belligerent', axis: 'tehran',   posture:  0.62, capability: 0.74, resolve: 0.80, color: '#ef4444' },
    { id: 'israel',    label: 'Israel',        role: 'belligerent', axis: 'west',     posture:  0.70, capability: 0.82, resolve: 0.86, color: '#3b82f6' },
    { id: 'usa',       label: 'United States', role: 'patron',      axis: 'west',     posture:  0.40, capability: 1.00, resolve: 0.58, color: '#60a5fa' },
    { id: 'hezbollah', label: 'Hezbollah',     role: 'proxy',       axis: 'tehran',   posture:  0.55, capability: 0.42, resolve: 0.74, color: '#f59e0b' },
    { id: 'houthis',   label: 'Houthis',       role: 'proxy',       axis: 'tehran',   posture:  0.66, capability: 0.30, resolve: 0.82, color: '#f97316' },
    { id: 'russia',    label: 'Russia',        role: 'patron',      axis: 'tehran',   posture:  0.30, capability: 0.70, resolve: 0.50, color: '#a855f7' },
    { id: 'saudi',     label: 'Saudi Arabia',  role: 'mediator',    axis: 'gulf',     posture: -0.15, capability: 0.55, resolve: 0.45, color: '#22c55e' },
    { id: 'turkey',    label: 'Turkey',        role: 'mediator',    axis: 'neutral',  posture: -0.05, capability: 0.50, resolve: 0.42, color: '#14b8a6' },
];

const INDO_PACIFIC = [
    { id: 'china',     label: 'China',         role: 'belligerent', axis: 'beijing',  posture:  0.52, capability: 0.95, resolve: 0.72, color: '#ef4444' },
    { id: 'usa',       label: 'United States', role: 'belligerent', axis: 'west',     posture:  0.44, capability: 1.00, resolve: 0.62, color: '#60a5fa' },
    { id: 'taiwan',    label: 'Taiwan (ROC)',  role: 'swing',       axis: 'west',     posture:  0.20, capability: 0.40, resolve: 0.78, color: '#3b82f6' },
    { id: 'philippines', label: 'Philippines', role: 'swing',       axis: 'west',     posture:  0.30, capability: 0.30, resolve: 0.66, color: '#38bdf8' },
    { id: 'japan',     label: 'Japan',         role: 'patron',      axis: 'west',     posture:  0.28, capability: 0.66, resolve: 0.60, color: '#818cf8' },
    { id: 'asean',     label: 'ASEAN Bloc',    role: 'mediator',    axis: 'neutral',  posture: -0.25, capability: 0.45, resolve: 0.38, color: '#22c55e' },
];

const THAILAND = [
    { id: 'thai_gov',  label: 'Thai State / RTARF', role: 'belligerent', axis: 'bangkok', posture:  0.25, capability: 0.62, resolve: 0.58, color: '#3b82f6' },
    { id: 'patsouth',  label: 'PATSOUTH Insurgency', role: 'belligerent', axis: 'insurgent', posture: 0.50, capability: 0.22, resolve: 0.70, color: '#ef4444' },
    { id: 'myanmar',   label: 'Myanmar Junta',  role: 'belligerent', axis: 'naypyidaw', posture: 0.58, capability: 0.48, resolve: 0.64, color: '#f97316' },
    { id: 'ethnic',    label: 'EAOs / Resistance', role: 'proxy',    axis: 'resistance', posture: 0.46, capability: 0.34, resolve: 0.80, color: '#f59e0b' },
    { id: 'asean',     label: 'ASEAN / Malaysia', role: 'mediator',  axis: 'neutral',  posture: -0.30, capability: 0.40, resolve: 0.40, color: '#22c55e' },
];

const ROSTERS = {
    middleeast: MIDDLE_EAST,
    indopacific: INDO_PACIFIC,
    thailand: THAILAND,
};

/** Reciprocity sign between two actors: +1 allies (same axis), -1 rivals. */
export const alignment = (a, b) => {
    if (a.id === b.id) return 0;
    if (a.axis === b.axis) return 1;
    if (a.axis === 'neutral' || b.axis === 'neutral') return 0;
    return -1;
};

/** Deep-ish copy so a simulation run never mutates the baseline roster. */
export const getActors = (theater) => {
    const roster = ROSTERS[theater] || ROSTERS.middleeast;
    return roster.map((a) => ({ ...a }));
};

export const THEATERS = Object.keys(ROSTERS);
