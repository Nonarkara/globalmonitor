/**
 * Oracle orchestrator — the public entry point.
 *
 * buildForecast(cache, theater, injection) ties together: live-state ingestion →
 * actor roster → optional scenario/slider injection → Monte-Carlo forecast →
 * (optional) baseline delta → analyst report. Returns one JSON payload the
 * frontend renders directly.
 */

import { getActors, THEATERS } from './actors.mjs';
import { readLiveState } from './state.mjs';
import { forecast } from './engine.mjs';
import { getTheaterScenarioDefs, listScenarios, applyInjection } from './scenarios.mjs';
import { buildReport } from './narrate.mjs';

/** Small stable hash of an injection so scenario runs differ yet reproduce. */
const injectionSeed = (injection) => {
    if (!injection) return 0;
    const str = JSON.stringify(injection);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};

const slimActor = (a) => ({
    id: a.id, label: a.label, role: a.role, axis: a.axis,
    posture: Math.round(a.posture * 100) / 100,
    capability: Math.round(a.capability * 100) / 100,
    resolve: Math.round(a.resolve * 100) / 100,
    color: a.color,
});

export const buildForecast = async (cache, theater, injection = null, opts = {}) => {
    const { narrate = true } = opts;
    const safeTheater = THEATERS.includes(theater) ? theater : 'middleeast';
    const live = readLiveState(cache, safeTheater);
    const baseActors = getActors(safeTheater);
    const defs = getTheaterScenarioDefs(safeTheater);

    const hasInjection = Boolean(injection && (injection.scenario || injection.postureDeltas || typeof injection.escalationDelta === 'number'));
    const { actors, esc, applied } = applyInjection(defs, baseActors, live.escalation, injection || {});

    const seed = (live.seed ^ injectionSeed(injection)) >>> 0;
    const fc = forecast(actors, esc, seed);

    // Compute the untouched baseline too, so the UI can show scenario deltas.
    let baseline = null;
    if (hasInjection) {
        const baseFc = forecast(baseActors, live.escalation, live.seed);
        baseline = {
            outcomes: baseFc.outcomes,
            expectedFinal: baseFc.expectedFinal,
            probCritical: baseFc.probCritical,
            headline: baseFc.headline,
        };
    }

    // Every run gets a deterministic report; slider-driven runs skip only the
    // (slow, quota-using) LLM upgrade — baseline and named scenarios get it.
    const report = await buildReport({ theater: safeTheater, live, fc, applied, actors }, { allowLlm: narrate });

    return {
        theater: safeTheater,
        generatedAt: new Date().toISOString(),
        live: { escalation: live.escalation, level: live.level, signals: live.signals },
        actors: actors.map(slimActor),
        forecast: fc,
        baseline,
        applied,
        scenarios: listScenarios(safeTheater),
        report,
        meta: { engine: 'abm-montecarlo-v1', aiPowered: report.aiPowered },
    };
};

export { THEATERS };
