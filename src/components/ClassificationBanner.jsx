import React, { memo } from 'react';

/**
 * Classification Banner — RAMS status tag block at top and bottom of viewport.
 * Black ink tag + paper text per RAMS status banner pattern.
 */

// Quiet for unclassified tiers (a thin paper meta-strip, Rams-honest); the
// genuinely sensitive tiers escalate to ink, then red — emphasis where it earns.
const LEVELS = {
    UNCLASSIFIED: { bg: 'var(--paper)', color: 'var(--ink-2)', label: 'UNCLASSIFIED' },
    CUI: { bg: 'var(--paper)', color: 'var(--ink-2)', label: 'CUI // CONTROLLED UNCLASSIFIED INFORMATION' },
    FOUO: { bg: 'var(--paper)', color: 'var(--ink-2)', label: 'UNCLASSIFIED // FOR OFFICIAL USE ONLY' },
    CONFIDENTIAL: { bg: 'var(--ink)', color: 'var(--paper)', label: 'CONFIDENTIAL' },
    SECRET: { bg: 'var(--ink)', color: 'var(--paper)', label: 'SECRET' },
    TOPSECRET: { bg: 'var(--red)', color: 'var(--paper)', label: 'TOP SECRET' }
};

const ClassificationBanner = ({ level = 'UNCLASSIFIED' }) => {
    const config = LEVELS[level] || LEVELS.UNCLASSIFIED;

    const bannerStyle = {
        position: 'fixed',
        left: 0,
        right: 0,
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.bg,
        color: config.color,
        borderTop: '1px solid var(--line-2)',
        borderBottom: '1px solid var(--line-2)',
        fontSize: '0.55rem',
        fontWeight: 700,
        letterSpacing: '0.18em',
        fontFamily: 'var(--font-sans)',
        zIndex: 99999,
        textTransform: 'uppercase',
        userSelect: 'none',
        pointerEvents: 'none',
    };

    const bottomStyle = {
        ...bannerStyle,
        borderBottom: 'none',
        borderTop: '1px solid var(--line-2)',
    };

    return (
        <>
            <div style={{ ...bannerStyle, top: 0 }}>
                {config.label}
            </div>
            <div style={{ ...bottomStyle, bottom: 0 }}>
                {config.label}
            </div>
        </>
    );
};

export default memo(ClassificationBanner);
