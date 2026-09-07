import React, { useState } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import warEconomy from '../data/warEconomy.json';
import { WAR_START, getDayCount } from '../data/warConstants';

// Hand-maintained model inputs — stamp the header with the file's git date, never "now".
const AS_OF = new Date(`${warEconomy.asOf}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

const WarCostTracker = () => {
    // One constant × elapsed time is a model output, not a live figure: compute once on mount,
    // no ticking interval, and round to the input's own precision (~$480M/day → whole $B).
    const [now] = useState(() => Date.now());

    const dayCount = getDayCount();
    const maxCat = Math.max(...warEconomy.categories.map(c => c.estimateTotal));

    const elapsedDays = (now - WAR_START.getTime()) / 86400000;
    const modelCost = elapsedDays * warEconomy.dailyCostEstimate * 1e6;

    const formatCost = (n) => {
        if (n >= 1e12) return `~$${(n / 1e12).toFixed(1)}T`;
        if (n >= 1e9) return `~$${Math.round(n / 1e9)}B`;
        return `~$${Math.round(n / 1e6)}M`;
    };

    return (
        <div className="bottom-card" style={{ padding: '10px 12px' }}>
            <div className="panel-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '5px', marginBottom: '6px',
                borderBottom: '1px solid var(--line)',
                borderLeft: '2px solid #f59e0b', paddingLeft: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={12} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        War Cost Estimate
                    </span>
                </div>
                <span style={{ fontSize: '0.42rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    MODEL · DAY {dayCount} · AS OF {AS_OF}
                </span>
            </div>

            {/* Live cost counter */}
            <div style={{
                textAlign: 'center',
                padding: '8px 0',
                marginBottom: '8px',
                background: 'rgba(245,158,11,0.06)',
                borderRadius: '6px',
                border: '1px solid rgba(245,158,11,0.1)'
            }}>
                <div style={{
                    fontSize: '1.3rem',
                    fontWeight: 200,
                    fontFamily: 'var(--font-mono)',
                    color: '#f59e0b',
                    lineHeight: 1,
                    letterSpacing: '-0.5px'
                }}>
                    {formatCost(modelCost)}
                </div>
                <div style={{ fontSize: '0.38rem', color: 'var(--ink-3)', marginTop: '3px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Modelled Cumulative Cost
                </div>
                <div style={{ fontSize: '0.42rem', color: 'rgba(245,158,11,0.6)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    ~${warEconomy.dailyCostEstimate}M / day × {dayCount} days
                </div>
            </div>

            {/* Category breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {warEconomy.categories.map(cat => (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            fontSize: '0.4rem', color: 'var(--ink-3)',
                            width: '60px', textAlign: 'right', flexShrink: 0
                        }}>
                            {cat.label}
                        </span>
                        <div style={{
                            flex: 1, height: '6px',
                            background: 'var(--line)',
                            borderRadius: '3px', overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${Math.max((cat.estimateTotal / maxCat) * 100, 3)}%`,
                                height: '100%', borderRadius: '3px',
                                background: cat.color,
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <span style={{
                            fontSize: '0.4rem', color: 'var(--ink-2)',
                            fontFamily: 'var(--font-mono)', width: '32px'
                        }}>
                            ${(cat.estimateTotal / 1000).toFixed(1)}B
                        </span>
                    </div>
                ))}
            </div>

            {/* GDP impact */}
            <div style={{
                display: 'flex', gap: '6px', marginTop: '8px',
                padding: '4px 0',
                borderTop: '1px solid var(--line)'
            }}>
                {Object.entries(warEconomy.gdpImpact).map(([country, pct]) => (
                    <div key={country} style={{
                        flex: 1, textAlign: 'center',
                        padding: '2px 0'
                    }}>
                        <div style={{
                            fontSize: '0.6rem', fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: pct < -5 ? '#ef4444' : pct < -2 ? '#f59e0b' : '#f97316'
                        }}>
                            {pct}%
                        </div>
                        <div style={{
                            fontSize: '0.35rem', color: 'var(--ink-3)',
                            textTransform: 'capitalize', letterSpacing: '0.3px'
                        }}>
                            {country} GDP
                        </div>
                    </div>
                ))}
            </div>

            {/* Source note */}
            <div style={{
                fontSize: '0.32rem', color: 'var(--ink-3)',
                marginTop: '4px', lineHeight: 1.3, fontStyle: 'italic'
            }}>
                {warEconomy.sources}
            </div>
        </div>
    );
};

export default WarCostTracker;
