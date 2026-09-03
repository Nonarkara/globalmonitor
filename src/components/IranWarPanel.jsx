import React, { useCallback } from 'react';
import { Crosshair, AlertCircle, Shield, Flame, Anchor, Map } from 'lucide-react';
import { fetchStrikeStats } from '../services/strikeStats';
import { fetchFrontStatus } from '../services/frontStatus';
import { useLiveResource } from '../hooks/useLiveResource';
import DataStatus from './DataStatus';
import { getDayCount } from '../data/warConstants';

const SubFront = ({ front }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 0'
    }}>
        <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: front.color,
            boxShadow: front.status === 'CRITICAL' ? `0 0 6px ${front.color}` : 'none'
        }} />
        <span style={{
            fontSize: '0.48rem',
            color: 'var(--ink-2)',
            flex: 1
        }}>
            {front.name}
        </span>
        <span style={{
            fontSize: '0.4rem',
            fontWeight: 700,
            color: front.color,
            letterSpacing: '0.5px'
        }}>
            {front.status}
        </span>
    </div>
);

const IranWarPanel = () => {
    const strikeFetcher = useCallback(() => fetchStrikeStats(), []);
    const frontFetcher = useCallback(() => fetchFrontStatus(), []);

    const {
        data: strikeData,
        isLoading: strikeLoading,
        isStale: strikeStale,
        isSample: strikeSample,
        error: strikeError,
        retryCount: strikeRetry,
        refresh: strikeRefresh
    } = useLiveResource(strikeFetcher, {
        cacheKey: 'strike-stats',
        intervalMs: 5 * 60 * 1000,
        isUsable: (d) => d?.weekTotal != null
    });

    const { data: frontData } = useLiveResource(frontFetcher, {
        cacheKey: 'front-status',
        intervalMs: 5 * 60 * 1000,
        isUsable: (d) => Array.isArray(d?.fronts)
    });

    const hasAnyData = strikeData || frontData;

    const dayCount = getDayCount();
    const weekTotal = strikeData?.weekTotal || {};
    const fronts = frontData?.fronts || [];
    const outlets = Array.isArray(strikeData?.sources) ? strikeData.sources : [];
    const headlineCount = strikeData?.headlineCount ?? 0;

    return (
        <div className="bottom-card flex-column">
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crosshair size={14} />
                    <span>IRAN WAR THEATER</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 200,
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        color: '#ef4444',
                        letterSpacing: '0.5px',
                        minWidth: '6ch',
                        textAlign: 'right'
                    }}>
                        DAY {dayCount}
                    </span>
                    {!strikeError && !strikeStale && !strikeSample && <span className="live-pill">LIVE</span>}
                </div>
            </div>

            <DataStatus
                isLoading={strikeLoading && !hasAnyData}
                isStale={strikeStale}
                isDemo={strikeSample}
                error={strikeError}
                retryCount={strikeRetry}
                data={hasAnyData}
                refresh={strikeRefresh}
            >
            <div className="panel-content" style={{ padding: '10px 12px' }}>
                {/* Strike summary row */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '10px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--line)'
                }} title={strikeData?.method || undefined}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 200,
                            fontFamily: 'var(--font-mono)',
                            color: weekTotal.missiles > 0 ? '#ef4444' : 'var(--text-muted)',
                            lineHeight: 1
                        }}>
                            {weekTotal.missiles || 0}
                        </div>
                        <div style={{ fontSize: '0.4rem', fontWeight: 600, letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            MISSILE MENTIONS
                        </div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 200,
                            fontFamily: 'var(--font-mono)',
                            color: weekTotal.drones > 0 ? '#f59e0b' : 'var(--text-muted)',
                            lineHeight: 1
                        }}>
                            {weekTotal.drones || 0}
                        </div>
                        <div style={{ fontSize: '0.4rem', fontWeight: 600, letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            DRONE MENTIONS
                        </div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 200,
                            fontFamily: 'var(--font-mono)',
                            color: weekTotal.interceptions > 0 ? '#3b82f6' : 'var(--text-muted)',
                            lineHeight: 1
                        }}>
                            {weekTotal.interceptions || 0}
                        </div>
                        <div style={{ fontSize: '0.4rem', fontWeight: 600, letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            INTERCEPT MENTIONS
                        </div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 200,
                            fontFamily: 'var(--font-mono)',
                            color: weekTotal.casualties > 0 ? '#ef4444' : 'var(--text-muted)',
                            lineHeight: 1
                        }}>
                            {weekTotal.casualties || 0}
                        </div>
                        <div style={{ fontSize: '0.4rem', fontWeight: 600, letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            CASUALTY MENTIONS
                        </div>
                    </div>
                </div>

                {/* Provenance: these are regex sums over headlines, not verified counts */}
                <div
                    title={strikeData?.method || undefined}
                    style={{
                        fontSize: '0.4rem',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.5px',
                        color: 'var(--ink-3)',
                        textAlign: 'right',
                        marginTop: '-6px',
                        marginBottom: '8px'
                    }}
                >
                    derived from {headlineCount} headlines · {outlets.length} outlets · 7d
                </div>

                {/* Sub-front status indicators */}
                <div style={{
                    fontSize: '0.42rem',
                    fontWeight: 600,
                    letterSpacing: '1.2px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>
                    ACTIVE FRONTS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {fronts.slice(0, 5).map((front) => (
                        <SubFront key={front.id} front={front} />
                    ))}
                </div>
            </div>
            </DataStatus>
        </div>
    );
};

export default IranWarPanel;
