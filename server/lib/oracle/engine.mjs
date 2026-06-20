/**
 * Oracle simulation engine — an agent-based Monte-Carlo model of near-term
 * escalation. Each actor chooses an action intensity each period driven by its
 * posture, reciprocity with rivals/allies, cost-fatigue, and a random shock;
 * the weighted balance of aggression vs mediation drives a global escalation
 * index. Thousands of stochastic rollouts yield a probability distribution over
 * outcomes and a confidence band on the escalation trajectory.
 *
 * Deterministic given (actors, escalation0, seed) — reproducible per data
 * snapshot, not re-rolled on every request.
 */

import { alignment } from './actors.mjs';

const T = 8;            // periods to project (≈ weeks)
const N = 700;          // Monte-Carlo rollouts for the main run
const N_SENS = 140;     // rollouts per actor for sensitivity (key drivers)

// Dynamics constants — tuned so a hot baseline produces a SPREAD distribution
// (attrition-modal with escalation/de-escalation tails), not a runaway ramp.
// The reciprocal-aggression loop is damped by strong cost-fatigue + mean
// reversion so the system has a finite equilibrium rather than pinning at 100.
const RECIP_K = 0.34;   // rival aggression pulls an actor toward aggression
const ALLY_K = 0.08;    // allied coordination effect
const FATIGUE_K = 0.60; // cost of sustained high escalation (scaled by 1-resolve)
const ACTION_SIGMA = 0.30;
const ESC_GAIN = 13;    // aggression → escalation points per period
const MED_GAIN = 16;    // mediation → cooling points per period
const DECAY = 0.09;     // mean-reversion toward NEUTRAL (weak attractor → drift)
const NEUTRAL = 24;     // resting escalation level
const ESC_SIGMA = 7.0;  // per-period escalation shock — fat tails across outcomes
const POSTURE_MOMENTUM = 0.06;

const OUTCOMES = [
    { key: 'deescalation',     label: 'De-escalation / Ceasefire', color: '#22c55e' },
    { key: 'frozen',           label: 'Frozen Standoff',           color: '#3b82f6' },
    { key: 'attrition',        label: 'Sustained Attrition',       color: '#f59e0b' },
    { key: 'major_escalation', label: 'Major Escalation',          color: '#ef4444' },
    { key: 'wider_war',        label: 'Wider Regional War',        color: '#dc2626' },
];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** mulberry32 — small fast seeded PRNG so a data snapshot reproduces exactly. */
const makeRng = (seed) => {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/** Box-Muller normal from a uniform rng. */
const gauss = (rng, sigma) => {
    const u = Math.max(1e-9, rng());
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
};

const classify = (finalEsc, peakEsc) => {
    if (peakEsc >= 90) return 'wider_war';
    if (finalEsc >= 70) return 'major_escalation';
    if (finalEsc >= 50) return 'attrition';
    if (finalEsc >= 28) return 'frozen';
    return 'deescalation';
};

/** One stochastic rollout. Returns { traj:number[T+1], outcome, peak, finalEsc }. */
const rollout = (actors, esc0, rng) => {
    // Per-actor mutable posture for this rollout; capability/resolve are fixed.
    const state = actors.map((a) => ({ ...a }));
    let esc = esc0;
    const traj = [esc];
    let peak = esc;
    let lastActions = state.map(() => 0);

    for (let t = 0; t < T; t++) {
        const actions = new Array(state.length);
        for (let i = 0; i < state.length; i++) {
            const a = state[i];
            // Reciprocity: average rival aggression and allied coordination last period.
            let rivalPress = 0, rivalN = 0, allyPress = 0, allyN = 0;
            for (let j = 0; j < state.length; j++) {
                if (j === i) continue;
                const sign = alignment(a, state[j]);
                if (sign < 0) { rivalPress += Math.max(0, lastActions[j]); rivalN++; }
                else if (sign > 0) { allyPress += lastActions[j]; allyN++; }
            }
            rivalPress = rivalN ? rivalPress / rivalN : 0;
            allyPress = allyN ? allyPress / allyN : 0;

            const fatigue = (esc / 100) * (1 - a.resolve) * FATIGUE_K;
            let x = a.posture + RECIP_K * rivalPress + ALLY_K * allyPress - fatigue + gauss(rng, ACTION_SIGMA);
            x = clamp(x, -1, 1);
            actions[i] = x;
            // Posture momentum: actors drift slightly toward their own action.
            a.posture = clamp(a.posture + POSTURE_MOMENTUM * (x - a.posture), -1, 1);
        }

        // Global escalation update: capability-weighted aggression vs mediation.
        let aggr = 0, med = 0, capSum = 0;
        for (let i = 0; i < state.length; i++) {
            const cap = state[i].capability;
            capSum += cap;
            if (actions[i] > 0) aggr += cap * actions[i];
            else med += cap * -actions[i];
        }
        aggr = capSum ? aggr / capSum : 0;
        med = capSum ? med / capSum : 0;

        const dEsc = ESC_GAIN * aggr - MED_GAIN * med - DECAY * (esc - NEUTRAL) + gauss(rng, ESC_SIGMA);
        esc = clamp(esc + dEsc, 0, 100);
        traj.push(esc);
        if (esc > peak) peak = esc;
        lastActions = actions;
    }

    return { traj, outcome: classify(esc, peak), peak, finalEsc: esc };
};

const percentile = (sortedArr, p) => {
    if (!sortedArr.length) return 0;
    const idx = clamp(Math.round((p / 100) * (sortedArr.length - 1)), 0, sortedArr.length - 1);
    return sortedArr[idx];
};

/** Run N rollouts; aggregate outcome distribution + trajectory band + stats. */
const runEnsemble = (actors, esc0, seed, n = N) => {
    const rng = makeRng(seed);
    const counts = Object.fromEntries(OUTCOMES.map((o) => [o.key, 0]));
    const byPeriod = Array.from({ length: T + 1 }, () => []);
    let finalSum = 0, peakSum = 0, critical = 0;

    for (let r = 0; r < n; r++) {
        const { traj, outcome, peak, finalEsc } = rollout(actors, esc0, rng);
        counts[outcome]++;
        finalSum += finalEsc;
        peakSum += peak;
        if (finalEsc >= 70) critical++;
        for (let t = 0; t <= T; t++) byPeriod[t].push(traj[t]);
    }

    const trajectory = byPeriod.map((vals, t) => {
        const sorted = vals.slice().sort((x, y) => x - y);
        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        return {
            period: t,
            mean: Math.round(mean * 10) / 10,
            p10: Math.round(percentile(sorted, 10)),
            p90: Math.round(percentile(sorted, 90)),
        };
    });

    const outcomes = OUTCOMES.map((o) => ({
        ...o,
        prob: Math.round((counts[o.key] / n) * 1000) / 10,
    }));

    return {
        outcomes,
        trajectory,
        expectedFinal: Math.round((finalSum / n) * 10) / 10,
        expectedPeak: Math.round((peakSum / n) * 10) / 10,
        probCritical: Math.round((critical / n) * 1000) / 10,
    };
};

/**
 * Key drivers via one-at-a-time sensitivity: nudge each actor's posture and
 * measure the shift in expected final escalation. Magnitude = influence.
 */
const sensitivity = (actors, esc0, seed, baselineFinal) => {
    const DELTA = 0.25;
    const drivers = actors.map((a, idx) => {
        const perturbed = actors.map((x, i) => (i === idx ? { ...x, posture: clamp(x.posture + DELTA, -1, 1) } : { ...x }));
        const res = runEnsemble(perturbed, esc0, seed ^ (0x9e3779b9 + idx), N_SENS);
        const delta = res.expectedFinal - baselineFinal;
        return {
            id: a.id,
            label: a.label,
            color: a.color,
            delta: Math.round(delta * 10) / 10,        // escalation points per +0.25 posture
            direction: delta >= 0 ? 'escalatory' : 'de-escalatory',
        };
    });
    drivers.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
    return drivers;
};

/**
 * Full forecast for a roster + initial escalation.
 * @returns aggregate distribution, trajectory band, drivers, headline.
 */
export const forecast = (actors, esc0, seed) => {
    const base = runEnsemble(actors, esc0, seed);
    const drivers = sensitivity(actors, esc0, seed, base.expectedFinal);

    const top = base.outcomes.slice().sort((a, b) => b.prob - a.prob)[0];
    const trend = base.trajectory[T].mean - esc0;

    return {
        ...base,
        drivers,
        headline: {
            outcome: top.label,
            outcomeKey: top.key,
            confidence: top.prob,
            color: top.color,
            trend: trend >= 1.5 ? 'rising' : trend <= -1.5 ? 'easing' : 'flat',
            trendValue: Math.round(trend * 10) / 10,
        },
        params: { periods: T, rollouts: N, startEscalation: esc0 },
    };
};

export { OUTCOMES, T as PERIODS };
