/**
 * Oracle scenario sandbox — "inject a variable and rehearse the future".
 *
 * Each scenario is a transform on the baseline roster + starting escalation.
 * The UI can also send free-form posture/escalation deltas (the sliders), which
 * compose on top of a chosen scenario. Pure functions — never mutate inputs.
 */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Shift one actor's posture / capability / resolve, returning a new roster. */
const tweak = (actors, id, changes) =>
    actors.map((a) => (a.id === id ? { ...a, ...applyChanges(a, changes) } : { ...a }));

const applyChanges = (a, { posture = 0, capability = 1, resolve = 0 }) => ({
    posture: clamp(a.posture + posture, -1, 1),
    capability: clamp(a.capability * capability, 0, 1),
    resolve: clamp(a.resolve + resolve, 0, 1),
});

/** Apply a list of per-actor tweaks sequentially. */
const tweakAll = (actors, edits) => edits.reduce((acc, [id, ch]) => tweak(acc, id, ch), actors.map((a) => ({ ...a })));

const SCENARIOS = {
    middleeast: [
        {
            id: 'us_withdraws', label: 'US carrier group withdraws', icon: 'anchor',
            note: 'Reduced US capability and resolve; Iran emboldened.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['usa', { capability: 0.5, posture: -0.3 }], ['iran', { posture: 0.22 }]]),
                esc: esc + 4,
            }),
        },
        {
            id: 'nuclear_breakout', label: 'Iran nuclear breakout test', icon: 'radiation',
            note: 'Israeli + US postures harden sharply; escalation shock.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['israel', { posture: 0.28, resolve: 0.1 }], ['usa', { posture: 0.25 }], ['iran', { posture: 0.1 }]]),
                esc: esc + 16,
            }),
        },
        {
            id: 'ceasefire', label: 'Ceasefire signed', icon: 'dove',
            note: 'Belligerents stand down; mediators reinforced.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['iran', { posture: -0.5 }], ['israel', { posture: -0.5 }], ['hezbollah', { posture: -0.4 }], ['saudi', { capability: 1.3 }]]),
                esc: Math.max(8, esc - 22),
            }),
        },
        {
            id: 'proxy_surge', label: 'Proxy axis surge', icon: 'flame',
            note: 'Hezbollah + Houthis escalate; multi-front pressure.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['hezbollah', { posture: 0.3, capability: 1.2 }], ['houthis', { posture: 0.3, capability: 1.2 }]]),
                esc: esc + 8,
            }),
        },
        {
            id: 'oil_shock', label: 'Oil > $150 / Hormuz threat', icon: 'droplet',
            note: 'Gulf states push mediation hard while resolve hardens.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['saudi', { capability: 1.4, posture: -0.1, resolve: 0.2 }], ['usa', { posture: 0.1 }]]),
                esc: esc + 5,
            }),
        },
    ],
    indopacific: [
        {
            id: 'taiwan_declaration', label: 'Taiwan sovereignty move', icon: 'flag',
            note: 'Beijing posture spikes; tripwire dynamics.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['taiwan', { posture: 0.3 }], ['china', { posture: 0.32, resolve: 0.12 }]]),
                esc: esc + 18,
            }),
        },
        {
            id: 'carrier_surge', label: 'US dual-carrier surge', icon: 'anchor',
            note: 'US deterrent posture up; China matches.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['usa', { posture: 0.18 }], ['japan', { posture: 0.12 }], ['china', { posture: 0.12 }]]),
                esc: esc + 6,
            }),
        },
        {
            id: 'scs_blockade', label: 'SCS quarantine / blockade', icon: 'ship',
            note: 'China coercive posture; Philippines + US respond.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['china', { posture: 0.26, capability: 1.05 }], ['philippines', { posture: 0.2 }], ['usa', { posture: 0.15 }]]),
                esc: esc + 12,
            }),
        },
        {
            id: 'asean_mediation', label: 'ASEAN mediation breakthrough', icon: 'dove',
            note: 'Bloc cohesion cools the strait.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['asean', { capability: 1.4, posture: -0.18 }], ['china', { posture: -0.1 }]]),
                esc: Math.max(8, esc - 10),
            }),
        },
    ],
    thailand: [
        {
            id: 'peace_talks', label: 'Deep South peace dialogue resumes', icon: 'dove',
            note: 'PATSOUTH + state stand down; KL process revived.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['patsouth', { posture: -0.4 }], ['thai_gov', { posture: -0.22 }], ['asean', { capability: 1.3 }]]),
                esc: Math.max(8, esc - 14),
            }),
        },
        {
            id: 'myanmar_offensive', label: 'Myanmar junta border offensive', icon: 'flame',
            note: 'Junta + resistance escalate; spillover into Thailand.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['myanmar', { posture: 0.3, capability: 1.1 }], ['ethnic', { posture: 0.22 }], ['thai_gov', { posture: 0.12 }]]),
                esc: esc + 12,
            }),
        },
        {
            id: 'border_incident', label: 'Cross-border artillery incident', icon: 'crosshair',
            note: 'Thai forces respond to a spillover strike.',
            apply: (actors, esc) => ({
                actors: tweakAll(actors, [['thai_gov', { posture: 0.22, resolve: 0.1 }], ['myanmar', { posture: 0.12 }]]),
                esc: esc + 8,
            }),
        },
    ],
};

export const listScenarios = (theater) =>
    (SCENARIOS[theater] || SCENARIOS.middleeast).map(({ id, label, note, icon }) => ({ id, label, note, icon }));

/**
 * Compose a scenario + free-form slider deltas onto a baseline.
 * @param injection { scenario?:string, postureDeltas?:{[id]:number}, escalationDelta?:number }
 * @returns { actors, esc, applied: {scenario, label} | null }
 */
export const applyInjection = (theaterScenarios, baseActors, baseEsc, injection = {}) => {
    let actors = baseActors.map((a) => ({ ...a }));
    let esc = baseEsc;
    let applied = null;

    if (injection.scenario) {
        const def = (theaterScenarios || []).find((s) => s.id === injection.scenario);
        if (def) {
            const out = def.apply(actors, esc);
            actors = out.actors;
            esc = out.esc;
            applied = { scenario: def.id, label: def.label, note: def.note };
        }
    }

    // Free-form posture nudges from the sliders compose on top.
    if (injection.postureDeltas) {
        for (const [id, delta] of Object.entries(injection.postureDeltas)) {
            const d = Number(delta) || 0;
            actors = actors.map((a) => (a.id === id ? { ...a, posture: clamp(a.posture + d, -1, 1) } : a));
        }
    }
    if (typeof injection.escalationDelta === 'number') {
        esc = clamp(esc + injection.escalationDelta, 0, 100);
    }

    return { actors, esc, applied };
};

export const getTheaterScenarioDefs = (theater) => SCENARIOS[theater] || SCENARIOS.middleeast;
