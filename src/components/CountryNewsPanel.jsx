import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Rss, RefreshCw, Zap, Cpu } from 'lucide-react';
import { ASEAN_COUNTRIES, THAILAND_REGIONS } from '../data/regions.js';
import { fetchBackendJson } from '../services/backendClient.js';
import { useLiveResource } from '../hooks/useLiveResource';

const safeTime = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// A row from the Supabase archive may carry only fetched_at. That is when we
// archived it, not when it was published — say so instead of dressing it as
// a publication time.
const itemTime = (item) => {
    const pub = item.pubDate ?? item.pub_date;
    if (pub) return safeTime(pub);
    const fetched = item.fetchedAt ?? item.fetched_at;
    return fetched ? `archived ${safeTime(fetched)}` : '--:--';
};

const BADGE_STYLES = {
    LIVE:        { color: 'var(--bg-dark)', background: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' },
    STALE:       { color: 'var(--amber)', background: 'transparent', border: '1px solid var(--amber)' },
    CACHED:      { color: 'var(--ink-3)', background: 'transparent', border: '1px solid var(--line)' },
    DEMO:        { color: 'var(--red)', background: 'transparent', border: '1px solid var(--red)' },
    'NO SIGNAL': { color: 'var(--ink-3)', background: 'transparent', border: '1px solid var(--line)' },
};

const resolveBadge = ({ data, status, isStale, isSample, error }) => {
    if (isSample) return 'DEMO';
    if (!data) return 'NO SIGNAL';
    // The ingest route falls back to the Supabase archive and marks the
    // payload itself 'stale' when the live pull came back empty.
    if (isStale || error || data.status === 'stale') return 'STALE';
    if (status === 'cached') return 'CACHED';
    return 'LIVE';
};

/**
 * Region-aware country / province news panel.
 *
 *   <CountryNewsPanel mode="indopacific" selectedCode={selectedCountry} onSelect={setSelectedCountry} />
 *   <CountryNewsPanel mode="thailand"    selectedCode={selectedProvince} onSelect={setSelectedProvince} />
 *
 * The chooser strip is a horizontal scrollable row of country/region chips.
 * Click a chip → selects that country → fetches its news. Auto-refreshes every 5 min.
 */
const CountryNewsPanel = ({ mode = 'indopacific', selectedCode, onSelect }) => {
    const items = mode === 'thailand' ? THAILAND_REGIONS : ASEAN_COUNTRIES;
    const codeKey = 'code';

    const fallbackCode = items[0]?.[codeKey];
    const [localCode, setLocalCode] = useState(selectedCode || fallbackCode);
    const activeCode = selectedCode || (items.some((item) => item[codeKey] === localCode) ? localCode : fallbackCode);

    const handleSelect = (code) => {
        setLocalCode(code);
        onSelect?.(code);
    };

    // Keyed per selection so useLiveResource re-reads its own localStorage
    // cache for the new code instead of showing the previous country's list.
    return (
        <CountryFeed
            key={`${mode}:${activeCode}`}
            mode={mode}
            items={items}
            activeCode={activeCode}
            onSelect={handleSelect}
        />
    );
};

const CountryFeed = ({ mode, items, activeCode, onSelect }) => {
    const labelKey = 'name';
    const codeKey = 'code';
    const title = mode === 'thailand' ? 'Thailand Regions' : 'ASEAN Countries';
    const activeChipRef = useRef(null);

    const fetcher = useCallback(
        () => fetchBackendJson('/api/regional-news', { region: mode, code: activeCode }),
        [mode, activeCode]
    );
    const { data, status, isStale, isSample, isRefreshing, isLoading, error, refresh } = useLiveResource(fetcher, {
        cacheKey: `regional-news:${mode}:${activeCode}`,
        enabled: Boolean(activeCode),
        intervalMs: 5 * 60 * 1000,
        isUsable: (payload) => Array.isArray(payload?.items) && payload.items.length > 0
    });

    useEffect(() => {
        activeChipRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, []);

    const news = data?.items || [];
    const badge = resolveBadge({ data, status, isStale, isSample, error });

    return (
        <div className="bottom-card flex-column" style={{ minWidth: 0 }}>
            <div className="panel-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Rss size={14} /> {title}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={refresh}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
                    </button>
                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', padding: '2px 6px', ...BADGE_STYLES[badge] }}>{badge}</span>
                </div>
            </div>

            {/* Country / region chooser strip */}
            <div
                style={{
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    padding: '6px 8px',
                    borderBottom: '1px solid var(--line)',
                    scrollbarWidth: 'thin'
                }}
            >
                {items.map((it) => {
                    const code = it[codeKey];
                    const label = it[labelKey];
                    const isActive = code === activeCode;
                    return (
                        <button
                            key={code}
                            ref={isActive ? activeChipRef : null}
                            onClick={() => onSelect(code)}
                            style={{
                                flexShrink: 0,
                                minHeight: 28,
                                padding: '4px 10px',
                                background: isActive ? 'rgba(56,189,248,0.18)' : 'transparent',
                                border: isActive ? '1px solid rgba(56,189,248,0.55)' : '1px solid var(--line-2)',
                                color: isActive ? 'var(--green)' : 'var(--ink-2)',
                                fontSize: '0.65rem',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                cursor: 'pointer'
                            }}
                            title={label}
                        >
                            {code} {isActive ? '·' : ''} {isActive && <span style={{ textTransform: 'none', letterSpacing: 0 }}>{label}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {news.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '0.7rem', color: 'var(--ink-3)' }}>
                        {isLoading || isRefreshing ? 'Connecting to live feeds…' : 'No live items right now.'}
                    </div>
                )}
                {news.map((item, i) => (
                    <a
                        key={`${item.link}-${i}`}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            borderBottom: '1px solid var(--line)',
                            paddingBottom: '8px',
                            display: 'block'
                        }}
                    >
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {item.tag === 'urgent' ? <Zap size={9} style={{ color: '#ef4444' }} /> : <Cpu size={9} style={{ color: '#38bdf8' }} />}
                                <span style={{ fontWeight: 'bold' }}>{item.source}</span>
                            </span>
                            <span>{itemTime(item)}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', lineHeight: 1.35 }}>{item.title}</div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default CountryNewsPanel;
