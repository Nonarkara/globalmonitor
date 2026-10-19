import React, { useCallback, useMemo } from 'react';
import { fetchLiveNews } from '../services/liveNews';
import { RefreshCw } from 'lucide-react';
import { useLiveResource } from '../hooks/useLiveResource';
import LegalFooterLinks from './LegalFooterLinks';

const THEATER_WIRE = {
    middleeast: 'Gulf',
    indopacific: 'SE Asia',
    eastasia: 'E Asia',
    southasia: 'S Asia',
    thailand: 'Thailand',
    global: 'World',
};

const TAG_TONE = {
    strikes: 'hot',
    nuclear: 'hot',
    airspace: 'warm',
    naval: 'warm',
    proxy: 'warm',
};

const ELEVATED_SCORE = 36;

const formatAge = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const mins = Math.round((Date.now() - date.getTime()) / 60000);
    if (!Number.isFinite(mins) || mins < 0) return null;
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
};

const resolveStatus = ({ news, isLoading, isStale, isSample, status, error }) => {
    if (isSample) return 'DEMO';
    if (!news.length && (error || (!isLoading && !isStale))) return 'NO SIGNAL';
    if (isStale || error) return 'STALE';
    if (status === 'cached') return 'CACHED';
    if (isLoading && !news.length) return 'SYNC';
    return 'LIVE';
};

const LiveIntelligenceFeed = ({ activeSourceIds, viewMode = 'middleeast', onOpenSection }) => {
    const cacheKey = `ticker:${Array.isArray(activeSourceIds) && activeSourceIds.length ? activeSourceIds.join(',') : 'default'}`;
    const fetcher = useCallback(() => fetchLiveNews(activeSourceIds), [activeSourceIds]);
    const {
        data: rawNews,
        lastUpdated,
        isRefreshing,
        isLoading,
        isStale,
        isSample,
        status,
        error,
        refresh
    } = useLiveResource(fetcher, {
        cacheKey,
        intervalMs: 3 * 60 * 1000,
        isUsable: (items) => Array.isArray(items) && items.length > 0
    });

    const news = useMemo(
        () => (Array.isArray(rawNews) ? rawNews : []),
        [rawNews]
    );

    const statusLabel = resolveStatus({ news, isLoading, isStale, isSample, status, error });
    const theater = THEATER_WIRE[viewMode] || THEATER_WIRE.global;
    const feedAge = formatAge(lastUpdated);
    const durationSec = Math.max(80, news.length * 6);
    const lead = news[0];

    const statusMessage = !news.length
        ? (error
            ? 'Headline wire is offline. Last-good copy will return when a source answers.'
            : (isLoading ? 'Connecting to the headline wire…' : 'No headlines on this pull. The wire retries on its own.'))
        : null;

    return (
        <aside
            className="news-ticker-wrapper"
            data-status={statusLabel.toLowerCase().replace(' ', '-')}
            aria-label={`Headline wire · ${theater}`}
        >
            <div className="news-ticker-rail">
                <span className="news-ticker-kicker">WIRE</span>
                <span className="news-ticker-status">{statusLabel}</span>
                <span
                    className="news-ticker-meta"
                    title={news.length
                        ? `${news.length} headline${news.length === 1 ? '' : 's'} · ${theater}${feedAge ? ` · ${feedAge === 'now' ? 'just pulled' : `pulled ${feedAge} ago`}` : ''}`
                        : `No headlines · ${theater}`}
                >
                    {news.length ? `${news.length}` : '—'}
                    <span className="news-item-sep" aria-hidden="true">·</span>
                    {theater}
                    {feedAge && (
                        <>
                            <span className="news-item-sep" aria-hidden="true">·</span>
                            {feedAge}
                        </>
                    )}
                </span>
                <button
                    type="button"
                    className="news-ticker-refresh"
                    onClick={refresh}
                    aria-label="Refresh headline wire"
                    title="Refresh headline wire"
                >
                    <RefreshCw size={12} className={isRefreshing ? 'spin-anim' : ''} aria-hidden="true" />
                </button>
            </div>

            {lead && (
                <p className="sr-only" aria-live="polite">
                    Latest · {lead.source} · {lead.title}
                </p>
            )}

            <div className="news-marquee-container">
                {statusMessage ? (
                    <div className="news-marquee news-marquee-static">
                        <span className="news-ticker-empty">{statusMessage}</span>
                    </div>
                ) : (
                    <div
                        className="news-marquee"
                        style={{ '--ticker-duration': `${durationSec}s` }}
                    >
                        <TickerPass items={news} />
                        <TickerPass items={news} copy />
                    </div>
                )}
            </div>

            {/* The legal links live INSIDE the wire strip. As a fixed overlay
                they needed a hardcoded reservation in the ticker, and that
                reservation was always short of their real width — the wire
                and the links collided. As a flex child the space is reserved
                by the layout itself. */}
            {onOpenSection && <LegalFooterLinks onOpenSection={onOpenSection} />}
        </aside>
    );
};

const TickerPass = ({ items, copy = false }) => (
    <div className={copy ? 'news-marquee-pass news-marquee-copy' : 'news-marquee-pass'} aria-hidden={copy || undefined}>
        {items.map((item, index) => {
            const tag = item.tags?.[0] || null;
            const tone = TAG_TONE[tag] || null;
            const elevated = (typeof item.score === 'number' && item.score >= ELEVATED_SCORE) || tone === 'hot';
            const age = formatAge(item.pubDate);

            return (
                <a
                    key={`${copy ? 'copy' : 'live'}:${item.link || item.title}:${index}`}
                    href={item.link || undefined}
                    target={item.link ? '_blank' : undefined}
                    rel={item.link ? 'noopener noreferrer' : undefined}
                    className="news-item"
                    data-elevated={elevated || undefined}
                    tabIndex={copy ? -1 : undefined}
                >
                    <span className="news-item-source">{item.source || 'Wire'}</span>
                    {age && (
                        <>
                            <span className="news-item-sep" aria-hidden="true">·</span>
                            <span className="news-item-age">{age}</span>
                        </>
                    )}
                    {tag && (
                        <>
                            <span className="news-item-sep" aria-hidden="true">·</span>
                            <span className={`news-item-tag${tone ? ` news-item-tag--${tone}` : ''}`}>{tag}</span>
                        </>
                    )}
                    <span className="news-item-sep" aria-hidden="true">·</span>
                    <span className="news-item-title">{item.title}</span>
                </a>
            );
        })}
    </div>
);

export default LiveIntelligenceFeed;
