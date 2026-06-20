import React from 'react';
import { Globe2, ExternalLink } from 'lucide-react';
import {
    MIDDLE_EAST_OIL_DEPENDENCY,
    MOST_OIL_RELIANT_COUNTRIES,
    dependencyColor
} from '../data/middleEastOilDependency';

const MiddleEastOilDependency = () => {
    const maxPct = Math.max(...MOST_OIL_RELIANT_COUNTRIES.map((c) => c.pct), 1);

    return (
        <div
            className="bottom-card"
            style={{
                padding: '0',
                minHeight: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px', flexShrink: 0,
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid var(--ink-2)', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe2 size={12} style={{ color: 'var(--ink-2)' }} />
                    <span style={{
                        fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px',
                        textTransform: 'uppercase', color: 'var(--ink)'
                    }}>
                        ME Oil Dependence
                    </span>
                </div>
                <span style={{
                    fontSize: '0.42rem', color: 'var(--ink-3)',
                    fontFamily: 'var(--font-mono)'
                }}>
                    IEA {MIDDLE_EAST_OIL_DEPENDENCY.year} · MOST RELIANT
                </span>
            </div>

            <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                padding: '0 10px 0 8px'
            }}>
                {MOST_OIL_RELIANT_COUNTRIES.map((country) => {
                    const color = dependencyColor(country.pct);
                    const widthPct = Math.max((country.pct / maxPct) * 100, country.pct > 0 ? 4 : 0);
                    return (
                        <div key={country.code} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                fontSize: '0.42rem', color: 'var(--ink-2)',
                                width: '72px', textAlign: 'right', flexShrink: 0,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {country.name}
                            </span>
                            <div style={{
                                flex: 1, height: '7px',
                                background: '#f2f0ea',
                                borderRadius: '0',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${widthPct}%`,
                                    height: '100%',
                                    background: color,
                                    opacity: 0.85
                                }} />
                            </div>
                            <span style={{
                                fontSize: '0.42rem', color: 'var(--ink-2)',
                                fontFamily: 'var(--font-mono)', width: '28px', flexShrink: 0
                            }}>
                                {country.pct}%
                            </span>
                        </div>
                    );
                })}
            </div>

            <div style={{
                marginTop: '6px', paddingTop: '5px', flexShrink: 0,
                borderTop: '1px solid var(--line)',
                fontSize: '0.34rem', color: 'var(--ink-3)', lineHeight: 1.35,
                padding: '5px 10px 7px'
            }}>
                {MIDDLE_EAST_OIL_DEPENDENCY.metric}. Data:{' '}
                <a
                    href={MIDDLE_EAST_OIL_DEPENDENCY.ieaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--ink-2)', textDecoration: 'none' }}
                >
                    {MIDDLE_EAST_OIL_DEPENDENCY.source}
                </a>
                {' · '}
                <a
                    href={MIDDLE_EAST_OIL_DEPENDENCY.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--ink-2)', textDecoration: 'none' }}
                >
                    {MIDDLE_EAST_OIL_DEPENDENCY.visualizedBy}
                    <ExternalLink size={8} style={{ display: 'inline', marginLeft: '2px', verticalAlign: 'middle' }} />
                </a>
            </div>
        </div>
    );
};

export default MiddleEastOilDependency;
