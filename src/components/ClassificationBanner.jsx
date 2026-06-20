import React, { memo } from 'react';

/**
 * Classification Banner — persistent strip at very top and bottom of viewport.
 * Standard on all government/intelligence dashboards.
 *
 * Levels: UNCLASSIFIED, CUI, FOUO, CONFIDENTIAL, SECRET, TOP SECRET
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
        letterSpacing: '2px',
        fontFamily: 'var(--font-mono)',
        zIndex: 99999,
        textTransform: 'uppercase',
        userSelect: 'none',
        pointerEvents: 'none'
    };

    return (
        <>
            <div style={{ ...bannerStyle, top: 0 }}>
                {config.label}
            </div>
            <div style={{ ...bannerStyle, bottom: 0 }}>
                {config.label}
            </div>
        </>
    );
};

export default memo(ClassificationBanner);
