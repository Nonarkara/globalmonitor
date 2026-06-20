/**
 * Oracle report writer — turns simulation numbers into an analyst brief.
 * Always returns a deterministic, data-grounded report; upgrades to a Groq
 * LLM narrative when a key is configured. Never fabricates figures: the LLM is
 * handed the computed numbers and instructed to use only those.
 */

import { groqChat, isGroqEnabled, groqModel } from '../groqClient.mjs';

const trendVerb = (t) => (t === 'rising' ? 'climbs' : t === 'easing' ? 'eases' : 'holds roughly flat');

/** Deterministic templated brief — works with zero LLM. */
const deterministicReport = ({ theater, live, fc, applied }) => {
    const top = fc.headline;
    const d0 = fc.drivers[0];
    const counter = fc.drivers.find((d) => d.direction === 'de-escalatory') || fc.drivers[fc.drivers.length - 1];
    const start = fc.params.startEscalation;
    const end = fc.expectedFinal;
    const scenarioLine = applied
        ? ` Under the injected scenario "${applied.label}", `
        : ' ';

    return [
        `Across ${fc.params.rollouts} Monte-Carlo rollouts seeded from live signals ` +
        `(escalation index ${start}, ${live.signals.acled} conflict events, ${live.signals.firms} thermal hotspots), ` +
        `the most probable ${fc.params.periods}-week outcome is ${top.outcome} at ${top.confidence}%.`,
        `${scenarioLine}the expected escalation path ${trendVerb(top.trend)} from ${start} toward ${end} ` +
        `(90th-percentile ${fc.trajectory[fc.trajectory.length - 1].p90}). ` +
        `Probability of crossing the CRITICAL threshold (≥70) is ${fc.probCritical}%.`,
        `The dominant escalatory driver is ${d0.label} (${d0.delta >= 0 ? '+' : ''}${d0.delta} pts per posture step); ` +
        `${counter.label} is the main counterweight.`,
    ].join(' ');
};

const THEATER_NAME = {
    middleeast: 'the Iran–Israel / Middle East theater',
    indopacific: 'the Indo-Pacific / South China Sea theater',
    thailand: 'the Thailand / Mekong theater',
};

/**
 * @returns { text:string, aiPowered:boolean, model?:string }
 */
export const buildReport = async ({ theater, live, fc, applied, actors }, { allowLlm = true } = {}) => {
    const deterministic = deterministicReport({ theater, live, fc, applied });
    if (!allowLlm || !isGroqEnabled()) return { text: deterministic, aiPowered: false };

    const top3 = actors
        .slice()
        .sort((a, b) => b.capability - a.capability)
        .slice(0, 4)
        .map((a) => `${a.label} (posture ${a.posture.toFixed(2)}, capability ${a.capability.toFixed(2)})`)
        .join('; ');

    const facts = {
        theater: THEATER_NAME[theater] || theater,
        startEscalation: fc.params.startEscalation,
        expectedFinal: fc.expectedFinal,
        expectedPeak: fc.expectedPeak,
        probCritical: fc.probCritical,
        outcomes: fc.outcomes.map((o) => `${o.label} ${o.prob}%`).join(', '),
        topDriver: `${fc.drivers[0].label} (${fc.drivers[0].direction})`,
        scenario: applied ? applied.label : 'baseline (no injection)',
        keyActors: top3,
    };

    const system =
        'You are a senior geopolitical intelligence analyst writing a terse forecast brief for an ' +
        'operations dashboard. Use ONLY the figures provided — never invent numbers, dates, names, or events. ' +
        'No preamble, no hedging boilerplate. 110-150 words, present tense, analyst register.';
    const user =
        `Simulation output for ${facts.theater}:\n` +
        `- Scenario: ${facts.scenario}\n` +
        `- Outcome distribution (8 weeks): ${facts.outcomes}\n` +
        `- Escalation index now ${facts.startEscalation} → expected ${facts.expectedFinal} (peak ${facts.expectedPeak}); P(critical ≥70)=${facts.probCritical}%\n` +
        `- Most influential actor: ${facts.topDriver}\n` +
        `- Key actors: ${facts.keyActors}\n\n` +
        'Write the brief: what the model expects, why (actor dynamics), and the single biggest swing factor.';

    const llm = await groqChat([{ role: 'system', content: system }, { role: 'user', content: user }], {
        temperature: 0.4,
        maxTokens: 320,
    });

    if (!llm) return { text: deterministic, aiPowered: false };
    return { text: llm, aiPowered: true, model: groqModel() };
};
