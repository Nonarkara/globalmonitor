import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchLiveNews } from '../services/liveNews';
import { Rss, RefreshCw } from 'lucide-react';

const safeDateString = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const RegionalNewsPanel = ({ regionName, title, activeSourceIds }) => {
    const [news, setNews] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const parseDepaXml = (xml) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "text/xml");
        if (xmlDoc.querySelector("parsererror")) return [];
        const items = xmlDoc.querySelectorAll("item");
        const depaQueryStr = '"Digital Economy Promotion Agency" OR "สำนักงานส่งเสริมเศรษฐกิจดิจิทัล"';
        const newsItems = [];
        Array.from(items).forEach(item => {
            const itemTitle = item.querySelector("title")?.textContent;
            const link = item.querySelector("link")?.textContent;
            const pubDateStr = item.querySelector("pubDate")?.textContent;
            const source = item.querySelector("source")?.textContent || 'Google News';
            if (itemTitle && link) {
                if (itemTitle.includes(depaQueryStr) || itemTitle === 'Google News') return;
                newsItems.push({ title: itemTitle, link, pubDate: pubDateStr ? new Date(pubDateStr) : new Date(), source });
            }
        });
        return newsItems.slice(0, 5);
    };

    const fetchNews = useCallback(() => {
        setIsRefreshing(true);
        if (regionName === 'DEPA') {
            const depaSearchUrl = 'https://news.google.com/rss/search?q="Digital+Economy+Promotion+Agency"+OR+"สำนักงานส่งเสริมเศรษฐกิจดิจิทัล"&hl=th&gl=TH&ceid=TH:th';
            const freshUrl = depaSearchUrl + '&cb=' + Date.now();
            const encoded = encodeURIComponent(freshUrl);

            const tryProxy = async (url, extract) => {
                const res = await fetch(url);
                const data = await res.json();
                const xml = extract(data);
                if (!xml) throw new Error('No XML');
                const items = parseDepaXml(xml);
                if (items.length === 0) throw new Error('No items');
                return items;
            };

            const tryRawProxy = async (url) => {
                const res = await fetch(url);
                const text = await res.text();
                if (!text.includes('<')) throw new Error('Not XML');
                const items = parseDepaXml(text);
                if (items.length === 0) throw new Error('No items');
                return items;
            };

            (async () => {
                let items = null;
                try { items = await tryProxy(`https://api.allorigins.win/get?url=${encoded}`, d => d?.contents); } catch {}
                if (!items) try { items = await tryRawProxy(`https://api.codetabs.com/v1/proxy?quest=${encoded}`); } catch {}
                if (!items) try { items = await tryRawProxy(`https://corsproxy.io/?url=${encoded}`); } catch {}
                if (mountedRef.current) setNews(items || []);
            })()
                .catch(() => { if (mountedRef.current) setNews([]); })
                .finally(() => { if (mountedRef.current) setIsRefreshing(false); });
            return;
        }

        fetchLiveNews(activeSourceIds).then(data => {
            if (!mountedRef.current) return;
            if (!Array.isArray(data)) { setNews([]); return; }
            let sliceStart = 0;
            if (regionName === 'Global') sliceStart = 5;
            if (regionName === 'Thailand') sliceStart = 10;

            setNews(data.slice(sliceStart, sliceStart + 5));
        }).catch(() => { if (mountedRef.current) setNews([]); })
          .finally(() => { if (mountedRef.current) setIsRefreshing(false); });
    }, [regionName, activeSourceIds]);

    useEffect(() => {
        const kickoff = setTimeout(fetchNews, 0);

        // Refresh regional news every 5 minutes
        const interval = setInterval(fetchNews, 5 * 60 * 1000);

        return () => {
            clearTimeout(kickoff);
            clearInterval(interval);
        };
    }, [fetchNews]);

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
                    <span style={{ fontSize: '0.65rem', color: 'var(--bg-dark)', fontWeight: 'bold', background: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px' }}>LIVE</span>
                </div>
            </div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {news.map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold' }}>{item.source}</span>
                            <span>{safeDateString(item.pubDate)}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                            {item.title}
                        </div>
                    </a>
                ))}
                {news.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading streams...</span>}
            </div>
        </div>
    );
};

export default RegionalNewsPanel;
