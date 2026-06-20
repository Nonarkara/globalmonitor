/**
 * Server-side regional news ingestion. Fetches Google News RSS for each
 * ASEAN country / Thai province, parses items, persists to Supabase, and
 * returns the canonical list to the API caller.
 *
 * On Supabase outage or empty fetch, falls back to whatever is already
 * in the cache so the user never sees an empty panel.
 */
import { upsertNewsItems, fetchNewsItems, recordIngestionRun, isSupabaseEnabled } from './supabase.mjs';
import { upsertNewsItems as dbUpsertNews } from './localDb.mjs';

const DEFAULT_LIMIT = 8;

// Build a Google News RSS search URL.
const buildGoogleNewsRss = (query, locale = 'en-US') => {
    const [language = 'en', country = 'US'] = locale.split('-');
    return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country}&ceid=${country}:${language}`;
};

// Per-country queries — duplicated from src/data/regions.js so the server
// has no client-bundle dependency. Update both if a query changes.
const ASEAN_QUERIES = {
    TH: { tech: 'Thailand technology OR startup OR digital economy OR DEPA OR fintech', urgent: 'Thailand breaking news OR protest OR flood OR accident' },
    VN: { tech: 'Vietnam technology OR startup OR semiconductor OR VinFast OR Vingroup', urgent: 'Vietnam breaking news OR typhoon OR protest OR conflict' },
    ID: { tech: 'Indonesia technology OR Gojek OR GoTo OR startup OR EV battery', urgent: 'Indonesia breaking news OR earthquake OR volcano OR Jakarta' },
    MY: { tech: 'Malaysia technology OR semiconductor OR Penang OR data center', urgent: 'Malaysia breaking news OR flood OR politics OR Anwar' },
    SG: { tech: 'Singapore technology OR fintech OR startup OR Grab OR Temasek', urgent: 'Singapore breaking news OR MAS OR cyber OR alert' },
    PH: { tech: 'Philippines technology OR fintech OR BPO OR startup OR Mynt', urgent: 'Philippines breaking news OR typhoon OR West Philippine Sea' },
    MM: { tech: 'Myanmar technology OR digital OR mobile OR internet', urgent: 'Myanmar breaking news OR junta OR conflict OR Rohingya' },
    KH: { tech: 'Cambodia technology OR digital economy OR startup', urgent: 'Cambodia breaking news OR Hun Manet OR election' },
    LA: { tech: 'Laos technology OR digital OR Belt and Road OR rail', urgent: 'Laos breaking news OR dam OR Mekong' },
    BN: { tech: 'Brunei technology OR digital OR oil OR LNG', urgent: 'Brunei breaking news OR Sultan' }
};

const THAI_QUERIES = {
    BKK: { tech: 'Bangkok technology OR fintech OR True OR AIS', urgent: 'Bangkok breaking news OR flood OR PM2.5 OR protest' },
    CNX: { tech: 'Chiang Mai technology OR digital nomad OR startup', urgent: 'Chiang Mai PM2.5 OR haze OR flood OR breaking' },
    KKC: { tech: 'Khon Kaen smart city OR rail OR university', urgent: 'Khon Kaen breaking OR flood OR Isaan' },
    PHK: { tech: 'Phuket sandbox OR digital nomad OR tourism tech', urgent: 'Phuket breaking news OR tsunami OR tourist' },
    HDY: { tech: 'Hat Yai Songkhla technology OR cross-border', urgent: 'Hat Yai breaking OR flood OR Deep South unrest' },
    EEC: { tech: 'EEC Eastern Economic Corridor OR EV OR semiconductor', urgent: 'EEC Chonburi Rayong incident OR factory' },
    KOR: { tech: 'Nakhon Ratchasima Korat tech OR rail OR EV', urgent: 'Korat breaking news OR drought' },
    UDN: { tech: 'Udon Thani tech OR rail OR Laos border trade', urgent: 'Udon Thani breaking OR flood' }
};

const queriesFor = (region, code) => {
    if (region === 'thailand') return THAI_QUERIES[code];
    return ASEAN_QUERIES[code];
};

// Lightweight RSS parser using regex — avoids pulling in xml2js for one route.
const parseRssItems = (xml, max = 6) => {
    if (!xml || typeof xml !== 'string') return [];
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) && items.length < max) {
        const block = match[1];
        const title = (/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/.exec(block) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')?.trim();
        const link = (/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/.exec(block) || [])[1]?.trim();
        const pubDate = (/<pubDate(?:\s[^>]*)?>([\s\S]*?)<\/pubDate>/.exec(block) || [])[1]?.trim();
        const source = (/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/.exec(block) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')?.trim();
        if (title && link) {
            items.push({
                title,
                link,
                source: source || 'Google News',
                pubDate: pubDate ? new Date(pubDate) : new Date()
            });
        }
    }
    return items;
};

const fetchOne = async (query) => {
    const url = buildGoogleNewsRss(query);
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const text = await res.text();
        return parseRssItems(text);
    } catch {
        return [];
    }
};

/**
 * Pull tech + urgent for one country/province, persist, return merged list.
 */
export const ingestRegionalNews = async (region, code) => {
    const queries = queriesFor(region, code);
    if (!queries) return { items: [], status: 'unknown-code' };
    const startedAt = Date.now();
    const [tech, urgent] = await Promise.all([fetchOne(queries.tech), fetchOne(queries.urgent)]);
    const merged = [
        ...tech.map((it) => ({ ...it, tag: 'tech' })),
        ...urgent.map((it) => ({ ...it, tag: 'urgent' }))
    ];
    const seen = new Set();
    const deduped = merged.filter((it) => {
        if (seen.has(it.link)) return false;
        seen.add(it.link);
        return true;
    });
    deduped.sort((a, b) => (b.pubDate?.getTime?.() || 0) - (a.pubDate?.getTime?.() || 0));
    const items = deduped.slice(0, DEFAULT_LIMIT);

    let upsertResult = { inserted: 0, error: null };
    if (items.length) {
        // Always persist to local SQLite (primary)
        dbUpsertNews(items, region, code);
        // Persist to Supabase if configured (secondary)
        if (isSupabaseEnabled()) {
            upsertResult = await upsertNewsItems(region, code, items);
        }
    }

    await recordIngestionRun({
        loader: 'regional_news',
        region,
        status: items.length ? (upsertResult.error ? 'partial' : 'ok') : 'fail',
        rowsInserted: upsertResult.inserted || 0,
        errorMessage: upsertResult.error,
        durationMs: Date.now() - startedAt
    });

    // If live fetch returned nothing, fall back to whatever's in Supabase.
    if (items.length === 0 && isSupabaseEnabled()) {
        const cached = await fetchNewsItems(region, code, DEFAULT_LIMIT);
        return { items: cached, status: 'stale' };
    }

    return { items, status: items.length ? 'live' : 'empty' };
};
