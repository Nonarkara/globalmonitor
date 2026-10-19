/**
 * GDELT Sentiment — fetches the tone/sentiment timeline for a theater.
 *
 * GDELT's DOC API rejects an unparenthesised OR list with a 200 and a plain
 * text body ("Queries containing OR'd terms must be surrounded by ()."), so
 * the query is wrapped before it is sent. The body is also parsed defensively:
 * GDELT answers rate limits (429) and overloads with prose, not JSON.
 *
 * GDELT is rate limited to one request every five seconds per IP, and
 * Cloudflare's egress IPs are shared, so 429s are routine here rather than
 * exceptional. One retry after the requested interval is worth the wait.
 */

const THEATER_QUERIES = {
    thailand:    'Thailand OR Bangkok OR Myanmar border',
    indopacific: 'Thailand OR Singapore OR Vietnam OR Philippines',
    eastasia:    'China OR Japan OR Taiwan OR "South Korea" OR "North Korea"',
    southasia:   'India OR Pakistan OR Bangladesh OR "Sri Lanka"',
    // Gulf read through an Asian lens: the energy artery, not the war.
    middleeast:  'Hormuz OR Gulf oil OR OPEC OR "crude exports" OR Iran'
};

const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestTimeline = async (query, timeoutMs) => {
    const url = `${GDELT_URL}?query=${encodeURIComponent(query)}&mode=timelinetone&timespan=7d&format=json`;
    const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: 'application/json' }
    });

    if (res.status === 429) {
        const err = new Error('GDELT 429 (rate limited)');
        err.retryable = true;
        throw err;
    }
    if (!res.ok) throw new Error(`GDELT ${res.status}`);

    const body = await res.text();
    let data;
    try {
        data = JSON.parse(body);
    } catch {
        // GDELT answers 200 with a prose message for some query shapes.
        throw new Error(`GDELT returned a non-JSON body: ${body.slice(0, 120)}`);
    }

    const series = (data.timeline || []).find((t) => t.series)?.data || [];
    const timeline = series
        .map((point) => ({ date: point.date, tone: point.value }))
        .filter((point) => Number.isFinite(point.tone));

    return {
        timeline,
        query,
        fetchedAt: new Date().toISOString()
    };
};

export const fetchGdeltSentiment = async (theater = 'indopacific') => {
    const raw = THEATER_QUERIES[theater] || THEATER_QUERIES.indopacific;
    // GDELT requires OR'd terms to be parenthesised.
    const query = `(${raw})`;

    try {
        return await requestTimeline(query, 9000);
    } catch (err) {
        if (err.retryable) {
            // GDELT asks for one request every five seconds.
            await sleep(5200);
            try {
                return await requestTimeline(query, 9000);
            } catch (retryErr) {
                console.error('GDELT error (after retry):', retryErr.message);
                throw retryErr;
            }
        }
        // Used to swallow every failure into a fake-successful empty timeline —
        // useCached's isUsable check (Array.isArray) passed on an empty array,
        // so a dead GDELT request got cached and served with status:'live'.
        // Throw instead so the route can serve its real stale-fallback.
        console.error('GDELT error:', err.message);
        throw err;
    }
};
