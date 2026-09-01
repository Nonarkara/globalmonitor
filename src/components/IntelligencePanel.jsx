import React, { useCallback } from 'react';
import { AlertTriangle, Shield, Anchor, Globe, Flame, Droplets, RefreshCw } from 'lucide-react';
import { BRIEFING_DEFINITIONS, fetchBriefing } from '../services/liveNews';
import { useLiveResource } from '../hooks/useLiveResource';

const ICONS = {
    iranStrikes: Flame,
    iranDiplomacy: Globe,
    gulfSecurity: Anchor,
    proxyTheater: Shield,
    energyMarkets: Droplets,
    taiwanStrait: Anchor,
    koreanPeninsula: Shield,
    indiaPakistan: AlertTriangle,
    indianOcean: Anchor,
    southChinaSea: Anchor,
    aseanDiplomacy: Globe,
    myanmarConflict: Flame,
    thaiSecurity: Shield,
};

const formatAge = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));

    if (diffMinutes < 60) return `${diffMinutes || 1}m ago`;

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return `${Math.round(diffHours / 24)}d ago`;
};

const IntelligencePanel = ({ briefingId, activeSourceIds }) => {
    const fetcher = useCallback(() => fetchBriefing(briefingId, activeSourceIds), [briefingId, activeSourceIds]);
    const cacheKey = `briefing:${briefingId}:${Array.isArray(activeSourceIds) && activeSourceIds.length ? activeSourceIds.join(',') : 'default'}`;
    const {
        data: briefing,
        lastUpdated,
        isRefreshing,
        isLoading,
        isStale,
        error,
        refresh
    } = useLiveResource(fetcher, {
        cacheKey,
        intervalMs: 4 * 60 * 1000,
        isUsable: (payload) => Array.isArray(payload?.items) && payload.items.length > 0
    });
    const staticBriefing = BRIEFING_DEFINITIONS[briefingId];

    const Icon = ICONS[briefingId] || AlertTriangle;
    const currentBriefing = briefing || staticBriefing;
    const statusLabel = isStale ? 'STALE' : (error && !briefing ? 'OFFLINE' : 'LIVE');

    return (
        <div className="bottom-card flex-column intelligence-panel">
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={14} />
                    {currentBriefing?.title || 'Loading Briefing'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={refresh}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                        title="Refresh briefing"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
                    </button>
                    <span className={`live-pill ${statusLabel !== 'LIVE' ? 'live-pill-muted' : ''}`}>{statusLabel}</span>
                </div>
            </div>
            <div className="panel-content">
                <p className="panel-lead">
                    {currentBriefing?.description || 'Loading structured signals…'}
                </p>

                {currentBriefing && (
                    <>
                        {briefing?.stats && (
                            <div className="signal-chip-row">
                                <span className="signal-chip signal-chip-strong">
                                    {briefing.stats.highPriority || briefing.stats.total} elevated
                                </span>
                                <span className="signal-chip">
                                    {briefing.stats.total} tracked
                                </span>
                                <span className="signal-chip">
                                    {lastUpdated ? `updated ${formatAge(lastUpdated)}` : 'syncing'}
                                </span>
                                {briefing.stats.dominantTags.map((tag) => (
                                    <span key={tag} className="signal-chip">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="source-link-row">
                            {currentBriefing.primarySources.map((source) => (
                                <a
                                    key={source.label}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="source-pill"
                                >
                                    {source.label}
                                </a>
                            ))}
                        </div>

                        <div className="briefing-summary">
                            {briefing?.summary || (isLoading ? 'Connecting to live feeds…' : 'No live items are currently available. Use the official sources above while the feed retries.')}
                        </div>
                    </>
                )}

                <div className="signal-list">
                    {(briefing?.items || []).slice(0, 5).map((item, index) => (
                        <a
                            key={`${item.link}-${index}`}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="signal-item"
                        >
                            <div className="signal-item-meta">
                                <span>{item.source}</span>
                                <span>{formatAge(item.pubDate)}</span>
                            </div>
                            <div className="signal-item-title">
                                {item.title}
                            </div>
                            <div className="signal-item-tags">
                                {(item.tags || ['signal']).slice(0, 3).map((tag) => (
                                    <span key={tag} className="signal-tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </a>
                    ))}

                    {(!briefing || !briefing.items || briefing.items.length === 0) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {error ? 'No live items yet. Cached data will stay visible whenever it exists.' : 'Loading live items…'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntelligencePanel;
