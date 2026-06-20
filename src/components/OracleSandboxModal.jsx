import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Sparkles, RotateCcw, Cpu, Zap, Loader2 } from 'lucide-react';
import { fetchOracle } from '../services/oracle';
import OracleTrajectory from './OracleTrajectory';

const THEATER_TITLE = {
    middleeast: 'Iran–Israel Theater',
    indopacific: 'Indo-Pacific Theater',
    thailand: 'Thailand / Mekong Theater',
};

/** Outcome bars with a faint baseline ghost for comparison. */
const OutcomeRow = ({ outcome, baselineProb, max }) => {
    const pct = max > 0 ? (outcome.prob / max) * 100 : 0;
    const ghost = max > 0 && baselineProb != null ? (baselineProb / max) * 100 : null;
    const delta = baselineProb != null ? Math.round((outcome.prob - baselineProb) * 10) / 10 : null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', width: '150px', flexShrink: 0 }}>{outcome.label}</span>
            <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                {ghost != null && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ghost}%`, background: 'rgba(255,255,255,0.12)', borderRight: '1px dashed rgba(255,255,255,0.35)' }} />
                )}
                <div style={{ width: `${pct}%`, height: '100%', background: outcome.color, borderRadius: '2px', transition: 'width 0.45s ease', position: 'relative' }} />
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: outcome.color, fontFamily: 'var(--font-mono)', width: '52px', textAlign: 'right' }}>{outcome.prob}%</span>
            {delta != null && Math.abs(delta) >= 0.1 ? (
                <span style={{ fontSize: '0.56rem', fontWeight: 700, fontFamily: 'var(--font-mono)', width: '46px', textAlign: 'right', color: delta > 0 ? '#ef4444' : '#22c55e' }}>
                    {delta > 0 ? '+' : ''}{delta}
                </span>
            ) : <span style={{ width: '46px' }} />}
        </div>
    );
};

const PostureSlider = ({ actor, value, onChange }) => {
    const eff = Math.max(-1, Math.min(1, actor.posture + value));
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.75)', width: '120px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: actor.color, flexShrink: 0 }} />
                {actor.label}
            </span>
            <input
                type="range" min="-0.6" max="0.6" step="0.05" value={value}
                onChange={(e) => onChange(actor.id, parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: actor.color, height: '3px' }}
            />
            <span style={{ fontSize: '0.56rem', fontFamily: 'var(--font-mono)', width: '46px', textAlign: 'right', color: eff > 0.15 ? '#ef4444' : eff < -0.15 ? '#22c55e' : '#94a3b8' }}>
                {eff >= 0 ? '+' : ''}{eff.toFixed(2)}
            </span>
        </div>
    );
};

const OracleSandboxModal = ({ isOpen, onClose, theater = 'middleeast' }) => {
    const [baseline, setBaseline] = useState(null);
    const [result, setResult] = useState(null);
    const [scenario, setScenario] = useState(null);
    const [deltas, setDeltas] = useState({});
    const [escDelta, setEscDelta] = useState(0);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    const hasInjection = Boolean(scenario || escDelta || Object.values(deltas).some((v) => v !== 0));

    const run = useCallback(async (inj) => {
        setLoading(true);
        try {
            const nonzero = Object.fromEntries(Object.entries(inj.deltas || {}).filter(([, v]) => v !== 0));
            const data = await fetchOracle(theater, {
                scenario: inj.scenario || undefined,
                escalationDelta: inj.escDelta || undefined,
                postureDeltas: Object.keys(nonzero).length ? nonzero : undefined,
            });
            setResult(data);
        } catch { /* keep prior result */ }
        setLoading(false);
    }, [theater]);

    // On open (or theater change): load baseline + initial result.
    useEffect(() => {
        if (!isOpen) return;
        setScenario(null); setDeltas({}); setEscDelta(0);
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const base = await fetchOracle(theater);
                if (!alive) return;
                setBaseline(base); setResult(base);
            } catch { /* noop */ }
            setLoading(false);
        })();
        return () => { alive = false; };
    }, [isOpen, theater]);

    // Debounced re-run whenever controls change.
    useEffect(() => {
        if (!isOpen || !baseline) return;
        if (!hasInjection) { setResult(baseline); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => run({ scenario, deltas, escDelta }), 320);
        return () => debounceRef.current && clearTimeout(debounceRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenario, deltas, escDelta, isOpen, baseline]);

    if (!isOpen) return null;

    const fc = result?.forecast;
    const head = fc?.headline;
    const baseOutcomes = baseline?.forecast?.outcomes || [];
    const baseByKey = Object.fromEntries(baseOutcomes.map((o) => [o.key, o.prob]));
    const maxProb = fc ? Math.max(...fc.outcomes.map((o) => o.prob), ...baseOutcomes.map((o) => o.prob)) : 100;
    const actors = result?.actors || [];
    const scenarios = result?.scenarios || baseline?.scenarios || [];

    const reset = () => { setScenario(null); setDeltas({}); setEscDelta(0); };
    const setDelta = (id, v) => setDeltas((d) => ({ ...d, [id]: v }));

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(4,6,10,0.72)', backdropFilter: 'blur(6px)', padding: '24px'
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                width: 'min(1180px, 96vw)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                background: 'linear-gradient(180deg, #0e1016, #0a0c11)', border: '1px solid rgba(168,85,247,0.25)',
                borderRadius: '6px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <Sparkles size={17} style={{ color: '#a855f7' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#fff' }}>GPD Oracle — War-Game Sandbox</span>
                            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.5px' }}>
                                {THEATER_TITLE[theater] || theater} · agent-based Monte-Carlo · {result?.meta?.aiPowered ? 'LLM narrative' : 'deterministic'}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {loading && <Loader2 size={15} className="spin-anim" style={{ color: '#a855f7' }} />}
                        <button onClick={reset} disabled={!hasInjection} style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', cursor: hasInjection ? 'pointer' : 'default',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px',
                            color: hasInjection ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontSize: '0.5rem', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                            <RotateCcw size={10} /> Reset
                        </button>
                        <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body: two columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0', flex: 1, overflow: 'hidden' }}>
                    {/* Left: controls */}
                    <div style={{ padding: '14px 16px', borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '7px' }}>Inject a scenario</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                            {scenarios.map((s) => {
                                const active = scenario === s.id;
                                return (
                                    <button key={s.id} onClick={() => setScenario(active ? null : s.id)} title={s.note} style={{
                                        textAlign: 'left', padding: '6px 9px', cursor: 'pointer', borderRadius: '3px',
                                        background: active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${active ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)'}`,
                                        color: active ? '#e9d5ff' : 'rgba(255,255,255,0.75)', fontFamily: 'inherit'
                                    }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Zap size={10} style={{ color: active ? '#a855f7' : 'rgba(255,255,255,0.3)' }} /> {s.label}
                                        </div>
                                        <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', lineHeight: 1.4 }}>{s.note}</div>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '7px' }}>
                            Tune actor posture <span style={{ color: 'rgba(255,255,255,0.25)' }}>(conciliatory ↔ aggressive)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '14px' }}>
                            {actors.map((a) => <PostureSlider key={a.id} actor={a} value={deltas[a.id] || 0} onChange={setDelta} />)}
                        </div>

                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                            Escalation shock <span style={{ fontFamily: 'var(--font-mono)', color: escDelta ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}>{escDelta >= 0 ? '+' : ''}{escDelta}</span>
                        </div>
                        <input type="range" min="-20" max="20" step="1" value={escDelta} onChange={(e) => setEscDelta(parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: '#f59e0b', height: '3px' }} />
                    </div>

                    {/* Right: results */}
                    <div style={{ padding: '14px 18px', overflowY: 'auto' }}>
                        {fc && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Most probable outcome {result?.applied ? '· under injection' : '· baseline'}
                                        </div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: head.color, marginTop: '2px' }}>{head.outcome}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.7rem', fontWeight: 200, fontFamily: 'var(--font-mono)', color: head.color, lineHeight: 1 }}>{head.confidence}%</div>
                                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                                            ESC {result.live.escalation} → {fc.expectedFinal} · P<sub>crit</sub> {fc.probCritical}%
                                        </div>
                                    </div>
                                </div>

                                {/* Trajectory */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '8px 10px', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                        Escalation trajectory · 8 weeks · mean + 10–90% band
                                    </div>
                                    <OracleTrajectory trajectory={fc.trajectory} height={88} color={head.color} />
                                </div>

                                {/* Outcome distribution vs baseline */}
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Outcome distribution</span>
                                        {result?.applied && <span style={{ color: 'rgba(255,255,255,0.3)' }}>dashed = baseline · Δ = shift</span>}
                                    </div>
                                    {fc.outcomes.map((o) => (
                                        <OutcomeRow key={o.key} outcome={o} baselineProb={result?.applied || hasInjection ? baseByKey[o.key] : null} max={maxProb} />
                                    ))}
                                </div>

                                {/* Drivers */}
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Key drivers · escalation Δ per posture step</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {fc.drivers.map((d) => (
                                            <span key={d.id} style={{ fontSize: '0.52rem', padding: '2px 7px', borderRadius: '3px', background: `${d.color}16`, border: `1px solid ${d.color}30`, color: 'rgba(255,255,255,0.78)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {d.label}
                                                <span style={{ color: d.delta >= 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{d.delta >= 0 ? '+' : ''}{d.delta}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Report */}
                                <div style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: '4px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '0.46rem', color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Cpu size={10} /> Analyst brief {result?.meta?.aiPowered ? `· ${result.report.model || 'LLM'}` : '· model-generated'}
                                    </div>
                                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{result.report.text}</div>
                                </div>

                                <div style={{ fontSize: '0.44rem', color: 'rgba(255,255,255,0.28)', marginTop: '10px', lineHeight: 1.5 }}>
                                    Simulation forecast from an agent-based Monte-Carlo model ({fc.params.rollouts} rollouts × {fc.params.periods} periods) seeded from live signals.
                                    Exploratory, not a prediction of fact. Postures are model parameters, not asserted intentions.
                                </div>
                            </>
                        )}
                        {!fc && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                                Running simulation…
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OracleSandboxModal;
