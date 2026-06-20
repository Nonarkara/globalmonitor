import React from 'react';

/**
 * Escalation trajectory sparkline — mean line over a p10–p90 confidence band.
 * Shared by the Oracle panel and the sandbox modal. Pure SVG, no deps.
 */
const OracleTrajectory = ({ trajectory = [], height = 56, color = '#f59e0b', showAxis = true }) => {
    if (!trajectory.length) return null;
    const W = 100; // viewBox units (responsive via width:100%)
    const H = height;
    const n = trajectory.length - 1;
    const x = (i) => (n ? (i / n) * (W - 2) + 1 : 1);
    const y = (v) => H - 4 - (Math.max(0, Math.min(100, v)) / 100) * (H - 8);

    const meanPts = trajectory.map((p, i) => `${x(i)},${y(p.mean)}`).join(' ');
    const bandTop = trajectory.map((p, i) => `${x(i)},${y(p.p90)}`);
    const bandBot = trajectory.map((p, i) => `${x(i)},${y(p.p10)}`).reverse();
    const bandPath = `M ${bandTop.join(' L ')} L ${bandBot.join(' L ')} Z`;

    // Threshold guides at escalation 50 (elevated) and 70 (critical)
    const guide = (v, c) => (
        <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke={c} strokeWidth="0.3" strokeDasharray="1.5 1.5" opacity="0.35" />
    );

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
            {showAxis && guide(70, 'var(--red)')}
            {showAxis && guide(50, 'var(--ink-3)')}
            <path d={bandPath} fill={color} opacity="0.14" />
            <polyline points={meanPts} fill="none" stroke={color} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
            {trajectory.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p.mean)} r={i === n ? 1.4 : 0} fill={color} />
            ))}
        </svg>
    );
};

export default OracleTrajectory;
