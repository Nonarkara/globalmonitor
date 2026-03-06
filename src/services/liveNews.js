import axios from 'axios';
import { fetchBackendJson } from './backendClient.js';

const CORS_PROXIES = [
    { url: 'https://api.allorigins.win/get?url=', extract: (data) => data?.contents },
    { url: 'https://api.codetabs.com/v1/proxy?quest=', extract: (data) => (typeof data === 'string' ? data : null) },
    { url: 'https://corsproxy.io/?url=', extract: (data) => (typeof data === 'string' ? data : null) },
];
const FEED_JSON_FALLBACK = 'https://api.rss2json.com/v1/api.json?rss_url=';
export const DEFAULT_SOURCE_IDS = ['bbc_world', 'bbc_middleeast', 'aljazeera', 'guardian_world', 'guardian_me', 'al_monitor', 'toi', 'jpost', 'presstv', 'national_uae', 'bangkok_post', 'cna', 'nikkei'];

export const KEYWORD_GROUPS = [
    { tag: 'strikes', weight: 22, terms: ['strike', 'missile', 'bomb', 'explosion', 'airstrike', 'drone', 'intercept', 'retaliation', 'attack', 'shelling', 'barrage'] },
    { tag: 'conflict', weight: 20, terms: ['iran', 'israel', 'irgc', 'idf', 'hezbollah', 'houthi', 'hamas', 'military', 'war', 'ceasefire', 'escalation', 'tensions'] },
    { tag: 'nuclear', weight: 18, terms: ['nuclear', 'enrichment', 'uranium', 'iaea', 'centrifuge', 'natanz', 'fordow', 'breakout'] },
    { tag: 'airspace', weight: 18, terms: ['airspace', 'flight', 'airport', 'airline', 'aviation', 'reroute', 'diversion', 'suspended', 'cancelled', 'no-fly'] },
    { tag: 'naval', weight: 16, terms: ['hormuz', 'strait', 'navy', 'naval', 'carrier', 'warship', 'fleet', 'persian gulf', 'gulf of oman', 'red sea'] },
    { tag: 'sanctions', weight: 14, terms: ['sanction', 'embargo', 'swift', 'treasury', 'ofac', 'blacklist', 'waiver', 'exemption'] },
    { tag: 'diplomacy', weight: 12, terms: ['diplomacy', 'negotiation', 'talks', 'un security council', 'foreign minister', 'ambassador', 'summit', 'jcpoa'] },
    { tag: 'energy', weight: 12, terms: ['oil', 'crude', 'brent', 'opec', 'gas', 'pipeline', 'energy', 'petroleum', 'lng', 'refinery'] },
    { tag: 'proxy', weight: 14, terms: ['proxy', 'militia', 'yemen', 'iraq', 'syria', 'lebanon', 'axis of resistance', 'pmu', 'quds force'] },
    { tag: 'humanitarian', weight: 10, terms: ['civilian', 'casualty', 'refugee', 'displacement', 'humanitarian', 'aid', 'crisis', 'shelter'] }
];

export const buildGoogleNewsSearchUrl = (query, locale = 'en-US') => {
    const [language = 'en', country = 'US'] = locale.split('-');
    return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country}&ceid=${country}:${language}`;
};

export const INTELLIGENCE_SOURCES = [
    { id: 'bbc_world', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', group: 'worldwide', trustScore: 14 },
    { id: 'bbc_middleeast', name: 'BBC Middle East', url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', group: 'middle-east', trustScore: 15 },
    { id: 'bbc_business', name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', group: 'worldwide', trustScore: 12 },
    { id: 'bbc_persian', name: 'BBC Persian', url: 'https://feeds.bbci.co.uk/persian/rss.xml', group: 'middle-east', trustScore: 13 },
    { id: 'aljazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', group: 'middle-east', trustScore: 14 },
    { id: 'asharq', name: 'Asharq Al-Awsat', url: 'https://english.aawsat.com/feed', group: 'middle-east', trustScore: 13 },
    { id: 'national_uae', name: 'The National UAE', url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml', group: 'middle-east', trustScore: 12 },
    { id: 'guardian_world', name: 'Guardian World', url: 'https://www.theguardian.com/world/rss', group: 'worldwide', trustScore: 12 },
    { id: 'guardian_me', name: 'Guardian ME', url: 'https://www.theguardian.com/world/middleeast/rss', group: 'middle-east', trustScore: 12 },
    { id: 'reuters_world', name: 'Reuters World', url: 'https://www.reutersagency.com/feed/', group: 'worldwide', trustScore: 15 },
    { id: 'ap_mideast', name: 'AP Middle East', url: 'https://rsshub.app/apnews/topics/middle-east', group: 'middle-east', trustScore: 14 },
    { id: 'toi', name: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/', group: 'middle-east', trustScore: 12 },
    { id: 'jpost', name: 'Jerusalem Post', url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx', group: 'middle-east', trustScore: 12 },
    { id: 'presstv', name: 'Press TV', url: 'https://www.presstv.ir/rss.xml', group: 'middle-east', trustScore: 10 },
    { id: 'iran_intl', name: 'Iran International', url: buildGoogleNewsSearchUrl('Iran International news Middle East'), group: 'middle-east', trustScore: 12 },
    { id: 'al_monitor', name: 'Al-Monitor', url: 'https://www.al-monitor.com/rss', group: 'middle-east', trustScore: 13 },
    { id: 'memo', name: 'Middle East Monitor', url: 'https://www.middleeastmonitor.com/feed/', group: 'middle-east', trustScore: 11 },
    { id: 'cna', name: 'Channel NewsAsia', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', group: 'asia', trustScore: 11 },
    { id: 'nikkei', name: 'Nikkei Asia', url: 'https://asia.nikkei.com/rss/feed', group: 'asia', trustScore: 10 },
    { id: 'bangkok_post', name: 'Bangkok Post', url: 'https://www.bangkokpost.com/rss/data/news.xml', group: 'thailand', trustScore: 9 },
    { id: 'diplomat', name: 'The Diplomat', url: 'https://thediplomat.com/feed/', group: 'asia', trustScore: 10 }
];

export const APAC_SOURCES = INTELLIGENCE_SOURCES;

export const BRIEFING_DEFINITIONS = {
    iranStrikes: {
        id: 'iranStrikes',
        title: 'Iran Strikes & Military',
        description: 'Live strikes, missile launches, drone attacks, IRGC operations, and IDF responses across the theater.',
        queries: [
            'Iran Israel strike OR missile OR drone attack',
            'IRGC military operation OR launch OR retaliation',
            'Iran airstrike OR bombing OR intercept',
            'Israel Iran war escalation'
        ],
        locale: 'en-US',
        sourceFilter: (source) => ['worldwide', 'middle-east'].includes(source.group),
        focusTags: ['strikes', 'conflict', 'airspace', 'naval'],
        primarySources: [
            { label: 'ACLED', url: 'https://acleddata.com/' },
            { label: 'ISW', url: 'https://www.understandingwar.org/' },
            { label: 'Janes', url: 'https://www.janes.com/' }
        ],
        fallbackItems: [
            { title: 'Tracking live strike activity, IRGC operations, and IDF responses.', link: 'https://www.understandingwar.org/', source: 'Monitor', pubDate: new Date(), tags: ['strikes', 'conflict'] }
        ]
    },
    iranDiplomacy: {
        id: 'iranDiplomacy',
        title: 'Diplomacy & Sanctions',
        description: 'Nuclear talks, JCPOA status, UN Security Council, sanctions enforcement, and diplomatic channels.',
        queries: [
            'Iran nuclear talks OR JCPOA OR enrichment',
            'Iran sanctions OR OFAC OR embargo',
            'Iran diplomacy OR UN Security Council OR IAEA',
            'Iran foreign minister OR ambassador OR negotiations'
        ],
        locale: 'en-US',
        sourceFilter: (source) => ['worldwide', 'middle-east'].includes(source.group),
        focusTags: ['nuclear', 'sanctions', 'diplomacy', 'conflict'],
        primarySources: [
            { label: 'IAEA', url: 'https://www.iaea.org/' },
            { label: 'US Treasury', url: 'https://ofac.treasury.gov/' },
            { label: 'UN News', url: 'https://news.un.org/en/' }
        ],
        fallbackItems: [
            { title: 'Monitoring nuclear program status, sanctions regime, and diplomatic developments.', link: 'https://www.iaea.org/', source: 'Monitor', pubDate: new Date(), tags: ['nuclear', 'diplomacy'] }
        ]
    },
    gulfSecurity: {
        id: 'gulfSecurity',
        title: 'Gulf & Strait of Hormuz',
        description: 'Naval movements, strait traffic, airspace closures, Gulf state responses, and energy infrastructure threats.',
        queries: [
            '"Strait of Hormuz" OR "Persian Gulf" naval OR shipping',
            'Gulf airspace closure OR flight reroute Iran',
            'Iran navy OR IRGC naval OR tanker seizure',
            'Emirates Etihad Qatar Airways flights Iran'
        ],
        locale: 'en-AE',
        sourceFilter: (source) => ['worldwide', 'middle-east'].includes(source.group),
        focusTags: ['naval', 'airspace', 'energy', 'conflict'],
        primarySources: [
            { label: 'MarineTraffic', url: 'https://www.marinetraffic.com/' },
            { label: 'FlightRadar24', url: 'https://www.flightradar24.com/' },
            { label: 'OpenSky', url: 'https://opensky-network.org/' }
        ],
        fallbackItems: [
            { title: 'Tracking Gulf naval activity, strait shipping, and airspace disruptions.', link: 'https://www.marinetraffic.com/', source: 'Monitor', pubDate: new Date(), tags: ['naval', 'airspace'] }
        ]
    },
    proxyTheater: {
        id: 'proxyTheater',
        title: 'Proxy & Regional Spillover',
        description: 'Hezbollah, Houthi, Iraqi militias, Syrian theater, and axis-of-resistance activity across the region.',
        queries: [
            'Hezbollah Lebanon Israel OR attack OR rocket',
            'Houthi Yemen Red Sea OR shipping OR attack',
            'Iraq militia Iran proxy OR PMU',
            'Syria Iran IRGC OR Israel strike'
        ],
        locale: 'en-US',
        sourceFilter: (source) => ['worldwide', 'middle-east'].includes(source.group),
        focusTags: ['proxy', 'conflict', 'strikes', 'humanitarian'],
        primarySources: [
            { label: 'ReliefWeb', url: 'https://reliefweb.int/' },
            { label: 'ACLED', url: 'https://acleddata.com/' },
            { label: 'Crisis Group', url: 'https://www.crisisgroup.org/' }
        ],
        fallbackItems: [
            { title: 'Monitoring proxy forces, regional spillover, and axis-of-resistance movements.', link: 'https://www.crisisgroup.org/', source: 'Monitor', pubDate: new Date(), tags: ['proxy', 'conflict'] }
        ]
    },
    energyMarkets: {
        id: 'energyMarkets',
        title: 'Energy & Oil Impact',
        description: 'Oil prices, OPEC response, energy supply disruptions, sanctions impact on global markets.',
        queries: [
            'oil price Iran conflict OR sanctions OR supply',
            'OPEC Iran production OR output',
            'Brent crude Iran OR Middle East tension',
            'energy supply disruption Iran OR Gulf'
        ],
        locale: 'en-US',
        sourceFilter: (source) => ['worldwide', 'middle-east'].includes(source.group),
        focusTags: ['energy', 'sanctions', 'conflict', 'naval'],
        primarySources: [
            { label: 'OPEC', url: 'https://www.opec.org/' },
            { label: 'EIA', url: 'https://www.eia.gov/' },
            { label: 'Bloomberg', url: 'https://www.bloomberg.com/energy' }
        ],
        fallbackItems: [
            { title: 'Tracking energy market impacts from Iran conflict and sanctions enforcement.', link: 'https://www.opec.org/', source: 'Monitor', pubDate: new Date(), tags: ['energy', 'sanctions'] }
        ]
    }
};

const sourceById = new Map(INTELLIGENCE_SOURCES.map((source) => [source.id, source]));

const normalizeTitle = (value = '') => value.toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const resolveDate = (value) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const withCacheBuster = (url) => `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;

const makeSourceWindow = (activeSourceIds, filterFn, limit = 4) => {
    const idSet = new Set(Array.isArray(activeSourceIds) ? activeSourceIds : DEFAULT_SOURCE_IDS);
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

const extractAtomLink = (entry) => {
    const preferred = entry.querySelector('link[rel="alternate"]');
    if (preferred?.getAttribute('href')) return preferred.getAttribute('href');

    const firstLink = entry.querySelector('link');
    if (firstLink?.getAttribute('href')) return firstLink.getAttribute('href');

    return firstLink?.textContent || '';
};

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

const parseXmlFeed = (xml, source) => {
    const parser = new DOMParser();
    const document = parser.parseFromString(xml, 'text/xml');

    if (document.querySelector('parsererror')) {
        return [];
    }

    const feedTitle = document.querySelector('channel > title')?.textContent
        || document.querySelector('feed > title')?.textContent
        || source.name;

    const rssItems = Array.from(document.querySelectorAll('item')).map((item) => {
        const title = item.querySelector('title')?.textContent?.trim();
        const link = item.querySelector('link')?.textContent?.trim();
        const pubDate = resolveDate(item.querySelector('pubDate')?.textContent);
        const sourceLabel = item.querySelector('source')?.textContent?.trim()
            || item.querySelector('author')?.textContent?.trim()
            || feedTitle;

        if (!title || !link) return null;
        if (normalizeTitle(title) === normalizeTitle(feedTitle) || title === feedTitle) return null;

        return {
            title,
            link,
            pubDate,
            source: sourceLabel
        };
    });

    if (rssItems.some(Boolean)) {
        return rssItems.filter(Boolean);
    }

    return Array.from(document.querySelectorAll('entry')).map((entry) => {
        const title = entry.querySelector('title')?.textContent?.trim();
        const link = extractAtomLink(entry)?.trim();
        const pubDate = resolveDate(entry.querySelector('updated')?.textContent || entry.querySelector('published')?.textContent);

        if (!title || !link) return null;

        return {
            title,
            link,
            pubDate,
            source: feedTitle
        };
    }).filter(Boolean);
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
        if (normalizedItemTitle === normalizedFeedTitle || item.title === feedTitle) return false;
        return true;
    });
};

const fetchFeedItems = async (source) => {
    const feedUrl = withCacheBuster(source.url);

    for (const proxy of CORS_PROXIES) {
        try {
            const proxied = `${proxy.url}${encodeURIComponent(feedUrl)}`;
            const response = await axios.get(proxied, { timeout: 12000 });
            const xml = proxy.extract(response.data);

            if (xml) {
                const parsed = parseXmlFeed(xml, source);
                if (parsed.length > 0) return parsed;
            }
        } catch {
            // Try next proxy
        }
    }

    try {
        const fallbackUrl = `${FEED_JSON_FALLBACK}${encodeURIComponent(source.url)}`;
        const response = await axios.get(fallbackUrl, { timeout: 12000 });
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
        lastUpdated: new Date()
    };
};

export const fetchBriefing = async (briefingId, activeSourceIds = null) => {
    try {
        const backendData = await fetchBackendJson(`/api/briefings/${briefingId}`, {
            sourceIds: Array.isArray(activeSourceIds) ? activeSourceIds.join(',') : undefined
        });
        if (backendData && backendData.items && backendData.items.length > 0) return backendData;
    } catch {
        // Fall back to direct fetching if backend proxy is offline
    }

    const briefing = BRIEFING_DEFINITIONS[briefingId];

    if (!briefing) {
        throw new Error(`Unknown briefing: ${briefingId}`);
    }

    const contextualSources = makeSourceWindow(activeSourceIds, briefing.sourceFilter, 4);
    const querySources = buildQuerySources(briefing);
    const rankedItems = await gatherFeeds([...contextualSources, ...querySources], briefing.focusTags, 6);
    const items = rankedItems;
    const stats = deriveBriefingStats(items);

    return {
        ...briefing,
        items,
        stats,
        summary: stats.total > 0
            ? `${stats.highPriority || stats.total} elevated signals across ${stats.dominantTags.length || 1} dominant themes.`
            : 'No live items were returned on the latest pull. Use the official source links while the feed refreshes.'
    };
};

export const fetchLiveNews = async (activeSourceIds = null) => {
    try {
        const backendData = await fetchBackendJson('/api/ticker', {
            sourceIds: Array.isArray(activeSourceIds) ? activeSourceIds.join(',') : undefined
        });
        if (backendData && backendData.length > 0) return backendData;
    } catch {
        // Fall back to direct fetching if backend proxy is offline
    }

    const sources = makeSourceWindow(activeSourceIds, () => true, 8);
    const items = await gatherFeeds(sources, ['strikes', 'conflict', 'nuclear', 'airspace', 'naval', 'sanctions', 'energy', 'proxy'], 20);

    return items;
};

export const getSourceById = (sourceId) => sourceById.get(sourceId);
