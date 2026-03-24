import React, { useCallback } from 'react';
import { fetchEscalation } from '../services/escalation';
import { useLiveResource } from '../hooks/useLiveResource';

const COLORS = {
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444'
};

const EscalationGauge = () => {
    const fetcher = useCallback(() => fetchEscalation(), []);
    const { data } = useLiveResource(fetcher, {
        cacheKey: 'escalation',
        intervalMs: 5 * 60 * 1000,
        isUsable: (d) => typeof d?.score === 'number'
    });

    if (!data) return null;

    const { score, level, label, history } = data;
    const color = COLORS[level] || COLORS.amber;

    // SVG arc gauge
    const radius = 18;
    const circumference = Math.PI * radius; // half circle
    const progress = (score / 100) * circumference;

    // Sparkline from history
    const sparkline = history?.length > 1 ? (() => {
        const max = Math.max(...history.map(h => h.score), 1);
        const w = 48;
        const h = 14;
        const points = history.map((pt, i) => {
            const x = (i / (history.length - 1)) * w;
            const y = h - (pt.score / max) * h;
            return `${x},${y}`;
        }).join(' ');
        return (
            <svg width={w} height={h} style={{ display: 'block', marginTop: '2px' }}>
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.5"
                />
            </svg>
        );
    })() : null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0 4px'
        }}>
            {/* Arc gauge */}
            <div style={{ position: 'relative', width: '44px', height: '26px' }}>
                <svg width="44" height="26" viewBox="0 0 44 26">
                    {/* Background arc */}
                    <path
                        d="M 4 24 A 18 18 0 0 1 40 24"
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    {/* Progress arc */}
                    <path
                        d="M 4 24 A 18 18 0 0 1 40 24"
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={circumference - progress}
                        style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
                    />
                </svg>
                {/* Score number */}
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.95rem',
                    fontWeight: 200,
                    fontFamily: 'var(--font-mono)',
                    color: color,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'color 0.5s ease'
                }}>
                    {score}
                </div>
            </div>

            {/* Label + sparkline */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{
                    fontSize: '0.48rem',
                    fontWeight: 600,
                    letterSpacing: '1.5px',
                    color: color,
                    textTransform: 'uppercase',
                    opacity: 0.8,
                    transition: 'color 0.5s ease'
                }}>
                    {label}
                </span>
                {sparkline}
            </div>
        </div>
    );
};

export default EscalationGauge;
