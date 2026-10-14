/**
 * Server-side regional news ingestion. Fetches Google News RSS for each
 * ASEAN country / Thai province, parses items, persists to Supabase, and
 * returns the canonical list to the API caller.
 *
 * On Supabase outage or empty fetch, falls back to whatever is already
 * in the cache so the user never sees an empty panel.
 */
import { upsertNewsItems, fetchNewsItems, recordIngestionRun, isSupabaseEnabled } from './supabase.mjs';
import { decodeEntities, stripSourceSuffix } from './intelligence.mjs';



const DEFAULT_LIMIT = 8;

// Google's News RSS endpoint 503s requests with no User-Agent — the default
// on a Cloudflare Workers fetch — even though the same URL answers 200 from
// any normal network. Not a scraping workaround; this is what every real
// RSS reader sends.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

// Gulf / Middle East — the active war theater.  Curated to surface
// airport-attack, missile, energy-supply, and Iran-axis headlines for the
// Riyadh / Sanaa / Tel Aviv frontline.  SA / YE lead the list because those
// are the codes the user clicks most during a Houthi vs. Saudi flare-up.
const MIDDLE_EAST_QUERIES = {
    SA: { tech: 'Saudi Arabia technology OR NEOM OR fintech OR AI OR Saudi Aramco digital', urgent: 'Saudi Arabia Riyadh airport OR Houthi missile OR Saudi defense OR Aramco' },
    YE: { tech: 'Yemen technology OR internet OR Houthi cyber OR Sanaa digital', urgent: 'Yemen Houthi OR Saudi coalition OR Sanaa OR Bab al-Mandab' },
    IR: { tech: 'Iran technology OR telecom OR fintech OR satellite', urgent: 'Iran breaking news OR nuclear OR IRGC OR proxy OR sanctions' },
    IL: { tech: 'Israel technology OR startup OR cybersecurity OR AI', urgent: 'Israel breaking news OR Gaza OR Hezbollah OR Iran strike OR missile' },
    EG: { tech: 'Egypt technology OR startup OR fintech OR Suez Canal digital', urgent: 'Egypt breaking news OR Sinai OR Suez Canal OR attack' },
    JO: { tech: 'Jordan technology OR startup OR telecom OR digital', urgent: 'Jordan breaking news OR border OR missile OR attack' },
    IQ: { tech: 'Iraq technology OR telecom OR startup OR digital', urgent: 'Iraq breaking news OR militia OR rocket OR Iran-backed' },
    SY: { tech: 'Syria technology OR telecom OR internet', urgent: 'Syria breaking news OR Aleppo OR Idlib OR rebel' },
    LB: { tech: 'Lebanon technology OR startup OR fintech', urgent: 'Lebanon breaking news OR Hezbollah OR Beirut OR Israel strike' },
    OM: { tech: 'Oman technology OR startup OR digital OR port', urgent: 'Oman breaking news OR drone OR missile OR Gulf' },
    AE: { tech: 'United Arab Emirates technology OR startup OR AI OR fintech', urgent: 'UAE breaking news OR Houthi OR missile OR defense' },
    BH: { tech: 'Bahrain technology OR fintech OR digital', urgent: 'Bahrain breaking news OR Houthi OR protest' },
    KW: { tech: 'Kuwait technology OR startup OR digital', urgent: 'Kuwait breaking news OR missile OR attack' },
    QA: { tech: 'Qatar technology OR startup OR AI OR Al Jazeera', urgent: 'Qatar breaking news OR Hamas OR Doha OR attack' },
    PS: { tech: 'Palestine technology OR telecom OR internet', urgent: 'Palestine breaking news OR Gaza OR West Bank' }
};

// Country-name lookup for codes not in any curated table.  Lets the regional
// news endpoint accept any 2-letter ISO code and still return a useful feed
// during fast-breaking events (e.g. someone wires a new country to the map
// before the curated table is updated).  Query string is the country name plus
// a conflict-news suffix so the feed returns real headlines, not a
// tourism-board puff piece.
const COUNTRY_NAMES = {
    AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
    AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia', AU: 'Australia',
    AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas', BD: 'Bangladesh', BB: 'Barbados',
    BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BT: 'Bhutan',
    BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil',
    BN: 'Brunei', BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi', KH: 'Cambodia',
    CM: 'Cameroon', CA: 'Canada', CV: 'Cape Verde', CF: 'Central African Republic',
    TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia', KM: 'Comoros',
    CG: 'Congo', CD: 'DR Congo', CR: 'Costa Rica', CI: 'Ivory Coast', HR: 'Croatia',
    CU: 'Cuba', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark', DJ: 'Djibouti',
    DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador',
    GQ: 'Equatorial Guinea', ER: 'Eritrea', EE: 'Estonia', ET: 'Ethiopia', FJ: 'Fiji',
    FI: 'Finland', FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia',
    DE: 'Germany', GH: 'Ghana', GR: 'Greece', GD: 'Grenada', GT: 'Guatemala',
    GN: 'Guinea', GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras',
    HU: 'Hungary', IS: 'Iceland', IN: 'India', ID: 'Indonesia', IR: 'Iran',
    IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica',
    JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KI: 'Kiribati',
    KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait', KG: 'Kyrgyzstan',
    LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia',
    LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg',
    MK: 'North Macedonia', MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia',
    MV: 'Maldives', ML: 'Mali', MT: 'Malta', MH: 'Marshall Islands', MR: 'Mauritania',
    MU: 'Mauritius', MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco',
    MN: 'Mongolia', ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
    NA: 'Namibia', NR: 'Nauru', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand',
    NI: 'Nicaragua', NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman',
    PK: 'Pakistan', PW: 'Palau', PS: 'Palestine', PA: 'Panama', PG: 'Papua New Guinea',
    PY: 'Paraguay', PE: 'Peru', PH: 'Philippines', PL: 'Poland', PT: 'Portugal',
    QA: 'Qatar', RO: 'Romania', RU: 'Russia', RW: 'Rwanda', KN: 'Saint Kitts and Nevis',
    LC: 'Saint Lucia', VC: 'Saint Vincent', WS: 'Samoa', SM: 'San Marino',
    ST: 'Sao Tome and Principe', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia',
    SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore', SK: 'Slovakia',
    SI: 'Slovenia', SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa',
    SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
    SZ: 'Eswatini', SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan',
    TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo',
    TO: 'Tonga', TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey',
    TM: 'Turkmenistan', TV: 'Tuvalu', UG: 'Uganda', UA: 'Ukraine',
    AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States',
    UY: 'Uruguay', UZ: 'Uzbekistan', VU: 'Vanuatu', VA: 'Vatican', VE: 'Venezuela',
    VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe'
};

export const queriesFor = (region, code) => {
    if (region === 'thailand') return THAI_QUERIES[code];
    if (region === 'middleeast' || region === 'gulf' || region === 'mideast') {
        return MIDDLE_EAST_QUERIES[code] || genericQueriesFor(code);
    }
    return ASEAN_QUERIES[code] || genericQueriesFor(code);
};

const genericQueriesFor = (code) => {
    const name = COUNTRY_NAMES[code];
    if (!name) return null;
    return {
        tech: `${name} technology OR startup OR digital economy OR AI OR semiconductor`,
        urgent: `${name} breaking news OR attack OR conflict OR sanctions OR protest`
    };
};

// Lightweight RSS parser using regex — avoids pulling in xml2js for one route.
export const parseRssItems = (xml, max = 6, defaultSource = 'News') => {
    if (!xml || typeof xml !== 'string') return [];
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) && items.length < max) {
        const block = match[1];
        const title = (/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/.exec(block) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')?.trim();
        const link = (/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/.exec(block) || [])[1]?.trim();
        const pubDate = (/<pubDate(?:\s[^>]*)?>([\s\S]*?)<\/pubDate>/.exec(block) || [])[1]?.trim();
        const source = (/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/.exec(block) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')?.trim()
            || (/<News:Source>([\s\S]*?)<\/News:Source>/.exec(block) || [])[1]?.trim();
        if (title && link) {
            items.push({
                title,
                link,
                source: source || defaultSource,
                pubDate: pubDate ? new Date(pubDate) : new Date()
            });
        }
    }
    return items;
};

const unwrapRedirectUrl = (link) => {
    if (!link) return link;
    try {
        const parsed = new URL(link);
        return parsed.searchParams.get('url') || link;
    } catch {
        return link;
    }
};

const firstNonEmpty = (promises) => Promise.any(promises.map(async (pending) => {
    const items = await pending;
    if (!Array.isArray(items) || items.length === 0) throw new Error('empty');
    return items;
}));

const parseGdeltSeen = (value) => {
    const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (!match) return new Date();
    return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]));
};

const fetchGdeltArtList = async (query) => {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=10&timespan=3d&sort=datedesc&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`GDELT DOC ${res.status}`);
    const data = await res.json();
    return (data.articles || [])
        .slice(0, 6)
        .map((article) => ({
            title: stripSourceSuffix(decodeEntities(article.title || ''), article.source || ''),
            link: article.url,
            source: article.domain || 'GDELT',
            pubDate: parseGdeltSeen(article.seendate)
        }))
        .filter((item) => item.title && item.link);
};

const fetchRssUrl = async (url, defaultSource) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': BROWSER_UA } });
    if (!res.ok) throw new Error(`RSS ${res.status}`);
    const items = parseRssItems(await res.text(), 6, defaultSource)
        .filter((item) => item.title && item.title !== 'Google News')
        .map((item) => ({
            ...item,
            title: stripSourceSuffix(decodeEntities(item.title), item.source || ''),
            source: decodeEntities(item.source),
            link: unwrapRedirectUrl(item.link)
        }));
    if (!items.length) throw new Error('RSS empty');
    return items;
};

const fetchBbcWorldFiltered = async (query) => {
    const res = await fetch('https://feeds.bbci.co.uk/news/world/rss.xml', {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': BROWSER_UA }
    });
    if (!res.ok) throw new Error(`BBC RSS ${res.status}`);
    const items = parseRssItems(await res.text(), 25, 'BBC')
        .map((item) => ({ ...item, title: stripSourceSuffix(decodeEntities(item.title), item.source || ''), source: decodeEntities(item.source) }));
    const tokens = String(query).split(/[^A-Za-z0-9]+/).filter((token) => token.length > 3);
    const hit = items.filter((item) => {
        const title = item.title.toLowerCase();
        return tokens.some((token) => title.includes(token.toLowerCase()));
    });
    return hit.slice(0, 6);
};

/**
 * Race public RSS. Google News search 503s from Cloudflare egress; waiting
 * on it then GDELT (often a timeout) left panels empty for 18s+. First
 * usable list wins — Bing search RSS and BBC World (title-filtered).
 */
export const fetchArbitraryRssQuery = async (query, locale = 'en-US') => {
    const bing = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=RSS&mkt=en-US&setlang=en`;
    return firstNonEmpty([
        fetchRssUrl(buildGoogleNewsRss(query, locale), 'Google News'),
        fetchRssUrl(bing, 'Bing News'),
        fetchGdeltArtList(query),
        fetchBbcWorldFiltered(query)
    ]);
};

const fetchOne = async (query) => {
    try {
        return await fetchArbitraryRssQuery(query);
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
    if (isSupabaseEnabled() && items.length) {
        upsertResult = await upsertNewsItems(region, code, items);
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
