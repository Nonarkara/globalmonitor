import axios from 'axios';
import {
    BRIEFING_DEFINITIONS,
    DEFAULT_SOURCE_IDS,
    INTELLIGENCE_SOURCES,
    KEYWORD_GROUPS,
    buildGoogleNewsSearchUrl
} from '../../src/services/liveNews.js';

const FEED_JSON_FALLBACK = 'https://api.rss2json.com/v1/api.json?rss_url=';

// RSS titles arrive HTML-escaped (Yemen&#039;s, Al Jazeera &#8211; …). Decode
// once here so no panel has to remember to.
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
export const decodeEntities = (value = '') => String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m);

/**
 * Feeds append their own name to the headline — "Oil rises as strikes stoke
 * supply fears - Reuters". Every surface that shows an item already prints the
 * source on its own line, so that tail is the publisher said twice, joined by a
 * hyphen doing a job the layout already does.
 *
 * Only strips the tail when it actually matches the item's source, so a headline
 * that genuinely ends in a dash keeps its words.
 */
export const stripSourceSuffix = (title = '', source = '') => {
    const raw = String(source).trim();
    if (!raw) return title;
    // A feed's <title> is usually a masthead ("Al Jazeera \u2013 Breaking News, \u2026")
    // while the headline is tagged with the plain name ("\u2026 - Al Jazeera"), so try
    // the short form as well as the full one.
    const candidates = [...new Set([raw, raw.split(/\s+[\u2013\u2014|]\s+|:\s+/)[0].trim()])]
        .filter((c) => c.length >= 3)
        .sort((a, b) => b.length - a.length);
    let out = String(title);
    for (const name of candidates) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const next = out.replace(new RegExp(`\\s*[-\u2013\u2014|]\\s*${escaped}\\s*$`, 'i'), '').trim();
        if (next && next !== out) { out = next; break; }
    }
    return out || title;
};

/**
 * RSS <title> is the feed's masthead, not its name: "Al Jazeera – Breaking News,
 * World News and Video from Al Jazeera", "AL-MONITOR: The Pulse of The Middle
 * East". Printed as a byline it crowds out the headline it is meant to attribute.
 *
 * Keep the part before the first tagline delimiter. A name with no delimiter is
 * already a name and passes through untouched.
 */
export const cleanSourceName = (source = '') => {
    const raw = String(source).trim();
    if (!raw) return raw;
    const cut = raw.split(/\s+[\u2013\u2014|]\s+|:\s+/)[0].trim();
    // Only accept the trim if what remains still reads as a name.
    return cut.length >= 3 && cut.length <= 40 ? cut : raw;
};

const normalizeTitle = (value = '') => value.toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const resolveDate = (value) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const makeSourceWindow = (activeSourceIds, filterFn, limit = 4) => {
    const idSet = new Set(Array.isArray(activeSourceIds) && activeSourceIds.length > 0 ? activeSourceIds : DEFAULT_SOURCE_IDS);

    return INTELLIGENCE_SOURCES
        .filter((source) => idSet.has(source.id) && filterFn(source))
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, limit);
};

const buildQuerySources = (briefing) => (
    briefing.queries.map((query, index) => ({
        id: `${briefing.id}-query-${index}`,
        name: `Search: ${briefing.title}`,
        url: buildGoogleNewsSearchUrl(query, briefing.locale),
        group: 'query',
        trustScore: 9
    }))
);

const readKeywordSignals = (title, focusTags = []) => {
    const lowerTitle = (title || '').toLowerCase();
    const matched = [];
    let score = 0;

    KEYWORD_GROUPS.forEach((group) => {
        const matchedTerms = group.terms.filter((term) => lowerTitle.includes(term));
        if (matchedTerms.length === 0) return;

        const focusBoost = focusTags.includes(group.tag) ? 8 : 0;
        matched.push(group.tag);
        score += group.weight + focusBoost + matchedTerms.length;
    });

    return {
        tags: matched.slice(0, 3),
        score
    };
};

const scoreFeedItem = (item, source, focusTags) => {
    const ageHours = Math.max(0, (Date.now() - item.pubDate.getTime()) / 36e5);
    const freshness = Math.max(0, 24 - ageHours) * 1.2;
    const keywordSignals = readKeywordSignals(item.title, focusTags);

    return {
        ...item,
        tags: item.tags?.length ? item.tags : keywordSignals.tags,
        score: source.trustScore + freshness + keywordSignals.score
    };
};

const parseJsonFallback = (payload, source) => {
    if (!payload?.items) return [];

    const feedTitle = payload.feed?.title || source.name;

    return payload.items.map((item) => ({
        title: decodeEntities(item.title),
        link: item.link,
        pubDate: resolveDate(item.pubDate),
        source: decodeEntities(item.author || feedTitle)
    })).filter((item) => {
        if (!item.title || !item.link) return false;
        const normalizedItemTitle = normalizeTitle(item.title);
        const normalizedFeedTitle = normalizeTitle(feedTitle);
        // Exclude items if rss2json improperly duplicated the feed title onto the item title
        if (normalizedItemTitle === normalizedFeedTitle || item.title === feedTitle) return false;
        return true;
    });
};

const parseXmlFeed = (xml, source) => {
    // Lightweight server-side XML parsing using regex (no DOMParser in Node)
    const items = [];
    const feedTitleMatch = xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const feedTitle = feedTitleMatch?.[1]?.trim() || source.name;

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || '').trim();
        const link = (block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)?.[1] || '').trim();
        const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
        const itemSource = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '').trim()
            || (block.match(/<author>([\s\S]*?)<\/author>/)?.[1] || '').trim()
            || feedTitle;

        if (!title || !link) continue;
        if (normalizeTitle(title) === normalizeTitle(feedTitle) || title === feedTitle) continue;

        items.push({ title: stripSourceSuffix(decodeEntities(title), decodeEntities(itemSource)), link, pubDate: resolveDate(pubDate), source: cleanSourceName(decodeEntities(itemSource)) });
    }

    // Try Atom <entry> if no RSS <item> found
    if (items.length === 0) {
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        while ((match = entryRegex.exec(xml)) !== null) {
            const block = match[1];
            const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || '').trim();
            const link = (block.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/)?.[1] || '').trim();
            const pubDate = (block.match(/<updated>([\s\S]*?)<\/updated>/)?.[1]
                || block.match(/<published>([\s\S]*?)<\/published>/)?.[1] || '').trim();

            if (!title || !link) continue;
            items.push({ title: stripSourceSuffix(decodeEntities(title), decodeEntities(feedTitle)), link, pubDate: resolveDate(pubDate), source: cleanSourceName(decodeEntities(feedTitle)) });
        }
    }

    return items;
};

const fetchFeedItems = async (source) => {
    // Primary: fetch RSS directly (server-side, no CORS issue)
    try {
        const response = await axios.get(source.url, {
            timeout: 15000,
            maxRedirects: 5,
            headers: {
                'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                'User-Agent': 'DNGWS/1.0 (Intelligence Monitor; +https://github.com/Nonarkara/tech-monitor)',
            },
            responseType: 'text'
        });
        if (typeof response.data === 'string' && response.data.includes('<')) {
            const parsed = parseXmlFeed(response.data, source);
            if (parsed.length > 0) return parsed;
        }
    } catch (err) {
        console.error(`[FEED] ${source.id} primary failed: ${err.message}`);
    }

    // Fallback: rss2json
    try {
        const response = await axios.get(`${FEED_JSON_FALLBACK}${encodeURIComponent(source.url)}`, { timeout: 12000 });
        return parseJsonFallback(response.data, source);
    } catch (err) {
        console.error(`[FEED] ${source.id} rss2json fallback failed: ${err.message}`);
        return [];
    }
};

const mergeAndRankItems = (items, sourceIndex, focusTags = [], limit = 15) => {
    const seenTitles = new Set();

    return items
        .map((item) => {
            const source = sourceIndex.get(item.sourceId) || { trustScore: 8, name: item.source };
            return scoreFeedItem(item, source, focusTags);
        })
        .sort((a, b) => {
            if (b.score === a.score) return b.pubDate - a.pubDate;
            return b.score - a.score;
        })
        .filter((item) => {
            const normalized = normalizeTitle(item.title);
            if (!normalized || seenTitles.has(normalized)) return false;
            seenTitles.add(normalized);
            return true;
        })
        .slice(0, limit);
};

const gatherFeeds = async (sources, focusTags = [], limit = 15) => {
    const sourceIndex = new Map(sources.map((source) => [source.id, source]));
    const results = await Promise.allSettled(
        sources.map(async (source) => {
            const items = await fetchFeedItems(source);
            return items.map((item) => ({ ...item, sourceId: source.id }));
        })
    );

    const batches = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);

    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
        console.warn(`[FEED] ${rejected.length}/${results.length} sources failed entirely`);
    }

    return mergeAndRankItems(batches.flat(), sourceIndex, focusTags, limit);
};

const deriveBriefingStats = (items) => {
    const tagCounts = new Map();

    items.forEach((item) => {
        item.tags?.forEach((tag) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
    });

    const dominantTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);

    return {
        total: items.length,
        highPriority: items.filter((item) => item.score >= 36).length,
        dominantTags,
        lastUpdated: new Date().toISOString()
    };
};

export const fetchTickerPayload = async (activeSourceIds = null) => {
    const sources = makeSourceWindow(activeSourceIds, () => true, 8);
    return gatherFeeds(sources, ['strikes', 'conflict', 'nuclear', 'airspace', 'naval', 'sanctions', 'energy', 'proxy'], 24);
};

export const fetchBriefingPayload = async (briefingId, activeSourceIds = null) => {
    const briefing = BRIEFING_DEFINITIONS[briefingId];

    if (!briefing) {
        throw new Error(`Unknown briefing: ${briefingId}`);
    }

    const contextualSources = makeSourceWindow(activeSourceIds, briefing.sourceFilter, 4);
    const querySources = buildQuerySources(briefing);
    const items = await gatherFeeds([...contextualSources, ...querySources], briefing.focusTags, 8);
    const stats = deriveBriefingStats(items);

    return {
        id: briefing.id,
        title: briefing.title,
        description: briefing.description,
        primarySources: briefing.primarySources,
        items,
        stats,
        summary: stats.total > 0
            ? `${stats.highPriority || stats.total} elevated signals across ${stats.dominantTags.length || 1} dominant themes.`
            : 'No live items were returned on the latest pull. Use the official source links while the feed refreshes.'
    };
};
