import React, { useCallback } from 'react';
import { fetchLiveNews } from '../services/liveNews';
import { RefreshCw } from 'lucide-react';
import { useLiveResource } from '../hooks/useLiveResource';

const LiveIntelligenceFeed = ({ activeSourceIds }) => {
    const cacheKey = `ticker:${Array.isArray(activeSourceIds) && activeSourceIds.length ? activeSourceIds.join(',') : 'default'}`;
    const fetcher = useCallback(() => fetchLiveNews(activeSourceIds), [activeSourceIds]);
    const {
        data: rawNews,
        isRefreshing,
        isLoading,
        isStale,
        error,
        refresh
    } = useLiveResource(fetcher, {
        cacheKey,
        intervalMs: 3 * 60 * 1000,
        isUsable: (items) => Array.isArray(items) && items.length > 0
    });

    const news = Array.isArray(rawNews) ? rawNews : [];

    if (!isLoading && news.length === 0 && !isStale && !error) {
        return (
            <div className="news-ticker-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px' }}>
                    Status: Live headline feeds are temporarily unavailable. Last-good data will reappear when the sources respond.
                </span>
            </div>
        );
    }

    return (
        <div className="news-ticker-wrapper">
            <div className="news-badge" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--bg-dark)', fontWeight: 'bold', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: isStale ? 'var(--accent-amber)' : 'var(--accent-blue)' }}>
                    {isStale ? 'STALE' : 'LIVE INTEL'}
                </span>
                <button
                    onClick={refresh}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                    title="Force Refresh Data"
                >
                    <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
                </button>
            </div>
            <div className="news-marquee-container">
                <div className={`news-marquee ${news.length === 0 ? 'news-marquee-static' : ''}`}>
                    {/* Duplicate for infinite scroll illusion */}
                    {(news.length > 0 ? [...news, ...news] : [{
                        title: error ? 'Live headline feeds are temporarily unavailable. Last-good data will reappear when the sources respond.' : 'Connecting to live headline feeds...',
                        link: '',
                        source: error ? 'Feed Status' : 'Sync',
                        tags: [isStale ? 'stale' : 'loading']
                    }]).map((item, index) => (
                        <a
                            key={index}
                            href={item.link || undefined}
                            target={item.link ? '_blank' : undefined}
                            rel={item.link ? 'noopener noreferrer' : undefined}
                            className="news-item"
                        >
                            <span className="source">{item.source}:</span> {item.title}
                            {item.tags?.[0] && <span style={{ marginLeft: '8px', color: 'var(--accent-blue)', fontSize: '0.75rem' }}>#{item.tags[0]}</span>}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LiveIntelligenceFeed;
