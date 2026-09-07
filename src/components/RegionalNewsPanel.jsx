import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchBackendJson } from '../services/backendClient';
import { Rss, RefreshCw } from 'lucide-react';

const safeDateString = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Every regionName App.jsx mounts gets its own Google News RSS query. A panel
// with no entry here renders "no dedicated feed" — never a slice of another
// panel's list.
const RSS_REGIONS = {
    'Middle East':    { q: '"Middle East" Iran OR Israel OR Gulf OR Lebanon OR Yemen OR Iraq conflict' },
    Thailand:         { q: 'Thailand technology OR startup OR "digital economy" OR DEPA OR fintech' },
    DEPA:             { q: '"Digital Economy Promotion Agency" OR "สำนักงานส่งเสริมเศรษฐกิจดิจิทัล"', hl: 'th-TH' },
    Global:           { q: '"global economy" OR "central bank" OR tariffs OR "trade policy" OR geopolitics' },
    SEA:              { q: '"Southeast Asia" technology OR startup OR semiconductor OR "data center" OR fintech' },
    Myanmar:          { q: '"Myanmar" conflict OR border OR refugee OR junta' },
    SouthChinaSea:    { q: '"South China Sea" OR "Taiwan Strait" tension OR naval OR incident' },
    ASEAN:            { q: 'ASEAN geopolitics OR diplomacy OR summit OR "Southeast Asia"' },
    Taiwan:           { q: 'Taiwan China military OR strait OR exercise OR invasion' },
    KoreanPeninsula:  { q: '"North Korea" OR "Korean Peninsula" missile OR nuclear OR DMZ' },
    EastChinaSea:     { q: '"East China Sea" OR Senkaku OR Diaoyu' },
    IndiaPakistan:    { q: 'India Pakistan Kashmir OR LoC OR ceasefire' },
    IndianOcean:      { q: '"Indian Ocean" navy OR chokepoint OR "Bay of Bengal"' },
    Afghanistan:      { q: 'Afghanistan Taliban OR Pakistan border' },
};

// Badge is driven by the X-Tech-Status header fetchBackendJson attaches as
// __meta — never by "did we get any rows".
const BADGE_STYLES = {
    live:   { color: 'var(--bg-dark)', background: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' },
    stale:  { color: 'var(--amber)', background: 'transparent', border: '1px solid var(--amber)' },
    cached: { color: 'var(--ink-3)', background: 'transparent', border: '1px solid var(--line)' },
    demo:   { color: 'var(--red)', background: 'transparent', border: '1px solid var(--red)' },
    none:   { color: 'var(--ink-3)', background: 'transparent', border: '1px solid var(--line)' },
};

const resolveBadge = ({ hasFeed, isRefreshing, news, meta }) => {
    if (!hasFeed) return { label: 'NO FEED', tone: 'none' };
    const status = meta?.status;
    if (status === 'sample' || status === 'demo') return { label: 'DEMO', tone: 'demo' };
    if (news.length === 0) return { label: isRefreshing ? '…' : 'NO SIGNAL', tone: 'none' };
    if (status === 'stale') return { label: 'STALE', tone: 'stale' };
    if (status === 'cached' || status === 'error') return { label: 'CACHED', tone: 'cached' };
    return { label: 'LIVE', tone: 'live' };
};

const RegionalNewsPanel = ({ regionName, title }) => {
    const [news, setNews] = useState([]);
    const [meta, setMeta] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const mountedRef = useRef(true);
    const region = RSS_REGIONS[regionName];
    const hasFeed = Boolean(region);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchNews = useCallback(() => {
        if (!region) {
            setNews([]);
            setMeta(null);
            return;
        }
        setIsRefreshing(true);
        const params = region.hl ? { q: region.q, hl: region.hl } : { q: region.q };
        fetchBackendJson('/api/news-rss', params)
            .then((items) => {
                if (!mountedRef.current) return;
                setNews(Array.isArray(items) ? items : []);
                setMeta(items?.__meta || null);
            })
            .catch(() => {
                if (!mountedRef.current) return;
                setNews([]);
                setMeta({ status: 'error' });
            })
            .finally(() => { if (mountedRef.current) setIsRefreshing(false); });
    }, [region]);

    useEffect(() => {
        const kickoff = setTimeout(fetchNews, 0);

        // Refresh regional news every 5 minutes
        const interval = setInterval(fetchNews, 5 * 60 * 1000);

        return () => {
            clearTimeout(kickoff);
            clearInterval(interval);
        };
    }, [fetchNews]);

    const badge = resolveBadge({ hasFeed, isRefreshing, news, meta });

    return (
        <div className="bottom-card flex-column">
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Rss size={14} /> {title}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={fetchNews}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                        title="Force Refresh Data"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
                    </button>
                    <span
                        title={meta?.updatedAt ? `Backend stamp ${safeDateString(meta.updatedAt)}` : undefined}
                        style={{ fontSize: '0.65rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 0, ...BADGE_STYLES[badge.tone] }}
                    >
                        {badge.label}
                    </span>
                </div>
            </div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {news.map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold' }}>{item.source}</span>
                            <span>{safeDateString(item.pubDate)}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                            {item.title}
                        </div>
                    </a>
                ))}
                {news.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)', marginBottom: '4px' }}>
                            {!hasFeed
                                ? `No dedicated feed for "${regionName}".`
                                : (isRefreshing ? 'Connecting to live feeds…' : 'No live items are currently available.')}
                        </div>
                        {hasFeed && isRefreshing && (
                            <div style={{ fontSize: '0.5rem', color: 'var(--ink-3)', }}>
                                Connecting to live feeds...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegionalNewsPanel;
