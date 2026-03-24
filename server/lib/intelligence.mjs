import axios from 'axios';
import {
    BRIEFING_DEFINITIONS,
    DEFAULT_SOURCE_IDS,
    INTELLIGENCE_SOURCES,
    KEYWORD_GROUPS,
    buildGoogleNewsSearchUrl
} from '../../src/services/liveNews.js';

const FEED_JSON_FALLBACK = 'https://api.rss2json.com/v1/api.json?rss_url=';

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
        title: item.title,
        link: item.link,
        pubDate: resolveDate(item.pubDate),
        source: item.author || feedTitle
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

        items.push({ title, link, pubDate: resolveDate(pubDate), source: itemSource });
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
            items.push({ title, link, pubDate: resolveDate(pubDate), source: feedTitle });
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
    } catch {
        // Fall through to JSON fallback
    }

    // Fallback: rss2json
    try {
        const response = await axios.get(`${FEED_JSON_FALLBACK}${encodeURIComponent(source.url)}`, { timeout: 12000 });
        return parseJsonFallback(response.data, source);
    } catch {
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
    const batches = await Promise.all(
        sources.map(async (source) => {
            const items = await fetchFeedItems(source);
            return items.map((item) => ({ ...item, sourceId: source.id }));
        })
    );

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
