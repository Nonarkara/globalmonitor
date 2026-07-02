/**
 * FloodOps directive — turns live cascade telemetry + a simulated scenario into
 * a mayor-grade operational order. Groq writes the prose; a deterministic
 * template covers the no-LLM path so the button always produces a plan.
 */

import { groqChat, isGroqEnabled, groqModel } from './groqClient.mjs';

const fmt = (v, unit = '') => (v == null ? 'n/a' : `${v}${unit}`);

const buildFacts = (ops, sim) => {
    const g = ops.city.gauge;
    const lines = [
        `City: ${ops.city.label} on the ${ops.city.river} River (${ops.city.populationNote}).`,
        `City gauge ${g?.code}: ${fmt(g?.msl, ' m MSL')} = ${fmt(g?.pct, '%')} of channel capacity, trend ${fmt(g?.trendCmH, ' cm/h')}, situation level ${fmt(g?.level)}/5.`,
        `Composite risk ${ops.riskScore}/100 (${ops.rating}).`,
        'Inbound water (upstream → ETA):',
        ...ops.inbound.slice(0, 6).map((s) =>
            `  ${s.code} ${s.place}: ${fmt(s.pct, '%')} bank, Q=${fmt(s.discharge, ' m³/s')}, level ${fmt(s.level)}/5, arrives in ~${fmt(s.etaHours, 'h')}`),
        'Basin rain last 24h:',
        ...ops.rainBasins.map((b) => `  ${b.label}: max ${b.max24h}mm, ${b.heavyStations} stations ≥35mm`),
        `Nationally: ${ops.national.level5} stations overbank, ${ops.national.level4} at level 4.`,
    ];
    if (sim) {
        lines.push(
            `SIMULATION (bathtub model on real terrain): stage ${sim.deltaM >= 0 ? '+' : ''}${sim.deltaM} m above current → ` +
            `~${sim.floodedKm2} km² inundated in the city frame` +
            (sim.floodedPois?.length ? `; critical sites underwater: ${sim.floodedPois.join(', ')}` : '; no mapped critical sites flooded'),
        );
    }
    return lines.join('\n');
};

/** Deterministic fallback plan — the system must work without an LLM. */
const templateDirective = (ops, sim) => {
    const g = ops.city.gauge;
    const worst = ops.inbound.find((s) => (s.level || 0) >= 4);
    const soonest = ops.inbound[0];
    const steps = [];
    if ((g?.pct ?? 0) >= 80 || (sim?.floodedKm2 ?? 0) > 2) {
        steps.push('1. Activate the municipal emergency operations center; move to 24h staffing.');
        steps.push(`2. Pre-position pumps and sandbags at the lowest-elevation districts first${sim?.floodedPois?.length ? ` — simulation shows ${sim.floodedPois[0]} flooding earliest` : ''}.`);
    } else {
        steps.push('1. Maintain enhanced monitoring; brief district chiefs on the upstream picture.');
    }
    if (worst) steps.push(`3. Upstream ${worst.code} (${worst.place}) is at level ${worst.level}/5 — expect that water in ~${worst.etaHours}h; decide evacuation staging within ${Math.max(6, Math.round((worst.etaHours || 24) / 3))}h.`);
    if (soonest?.trendCmH > 0) steps.push(`4. Nearest upstream gauge ${soonest.code} is rising at ${soonest.trendCmH} cm/h — re-check every cycle (10 min data).`);
    steps.push(`${steps.length + 1}. Coordinate with RID on Chao Phraya Dam release before it exceeds channel capacity downstream.`);
    return steps.join('\n');
};

export const buildFloodDirective = async (ops, sim = null) => {
    const facts = buildFacts(ops, sim);
    let text = null;
    if (isGroqEnabled()) {
        text = await groqChat([
            {
                role: 'system',
                content: 'You are the duty officer of a Thai municipal flood operations center writing for the mayor. Using ONLY the facts given, produce a terse operational directive: SITUATION (2 sentences), TIMELINE (when water arrives, citing station codes), then ACTIONS as a numbered list of 4-6 concrete orders with deadlines and responsible units (public works, district chiefs, rescue, comms). No preamble, no hedging boilerplate, no invented numbers.',
            },
            { role: 'user', content: facts },
        ], { temperature: 0.3, maxTokens: 600 });
    }
    return {
        directive: text || templateDirective(ops, sim),
        engine: text ? `groq/${groqModel()}` : 'rule-based fallback',
        facts,
        generatedAt: new Date().toISOString(),
    };
};
