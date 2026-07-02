/**
 * Background data scheduler — proactive cache warming.
 *
 * Fires all API loaders on their natural TTL schedule so the in-memory cache
 * is always warm, even during long periods with zero visitors. Without this,
 * a user arriving after 6 hours of idle would trigger cold fetches for every
 * panel simultaneously.
 *
 * Strategy: self-HTTP requests to localhost. Keeps the scheduler decoupled
 * from internal loader functions and respects the same useCached TTL logic.
 */

const MIN = 60 * 1000;

let port = null;

const hit = async (path) => {
    if (!port) return;
    try {
        const r = await fetch(`http://127.0.0.1:${port}${path}`, {
            signal: AbortSignal.timeout(30000)
        });
        if (!r.ok && r.status !== 304) {
            console.warn(`[scheduler] ${path} → HTTP ${r.status}`);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.warn(`[scheduler] ${path} failed: ${err.message}`);
        }
    }
};

const schedule = (path, intervalMs, initialDelayMs = 0) => {
    setTimeout(() => {
        hit(path);
        setInterval(() => hit(path), intervalMs);
    }, initialDelayMs);
};

export const startScheduler = (serverPort) => {
    port = serverPort;

    // ── Global endpoints ─────────────────────────────────────────────────────

    // Ticker — 2 min (drives the top intelligence feed)
    schedule('/api/ticker', 2 * MIN, 3000);

    // Markets — 60s (most time-sensitive, drives MarketRadarPanel)
    schedule('/api/markets', 1 * MIN, 4000);

    // Flights — 30s, warming the theaters the UI actually requests (not global).
    // airplanes.live allows ~1 req/s, so stagger the three theaters 8s apart.
    ['middleeast', 'indopacific', 'thailand'].forEach((t, i) => {
        schedule(`/api/flights?theater=${t}`, 30 * 1000, 5000 + i * 8000);
    });

    // Oil prices — 30 min
    schedule('/api/oil-prices', 30 * MIN, 6000);

    // NGA maritime warnings — 30 min
    schedule('/api/nga-warnings', 30 * MIN, 7000);

    // Rainviewer radar — 5 min
    schedule('/api/rainviewer', 5 * MIN, 8000);

    // FloodOps — HII telemetry is 10-min cadence; warm both monitored cities
    ['ayutthaya', 'chiangmai'].forEach((c, i) => {
        schedule(`/api/flood?city=${c}`, 10 * MIN, 9000 + i * 5000);
    });

    // ── Per-theater endpoints ────────────────────────────────────────────────

    const theaters = ['middleeast', 'indopacific', 'thailand'];

    theaters.forEach((theater, ti) => {
        const base = ti * 2000; // stagger theaters 2s apart

        // FIRMS fire hotspots — 10 min
        schedule(`/api/firms?theater=${theater}`, 10 * MIN, 10000 + base);

        // USGS quakes — 10 min
        schedule(`/api/quakes?theater=${theater}`, 10 * MIN, 11000 + base);

        // GDELT sentiment — 30 min
        schedule(`/api/sentiment?theater=${theater}`, 30 * MIN, 12000 + base);

        // ACLED conflict events — 60 min
        schedule(`/api/acled?theater=${theater}`, 60 * MIN, 14000 + base);

        // Humanitarian data — 60 min
        schedule(`/api/humanitarian?theater=${theater}`, 60 * MIN, 15000 + base);

        // Vessels — 30s, keep the AIS cache warm per theater (no-op until a key
        // is set, but ready the moment AISSTREAM_API_KEY lands)
        schedule(`/api/vessels?theater=${theater}`, 30 * 1000, 16000 + base);

        // Oracle baseline forecast — 30 min. The Monte-Carlo is cheap but each
        // warm also triggers a Groq narrative; at 5 min × 3 theaters it burned
        // the entire 100k/day free-tier token budget. Viewers still get ≤5-min
        // freshness via the route's own TTL when they actually look.
        schedule(`/api/oracle?theater=${theater}`, 30 * MIN, 17000 + base);
    });

    // ── Intelligence briefings — staggered 30s apart, 4-min cycle ────────────

    const briefings = [
        'iranStrikes', 'iranDiplomacy', 'gulfSecurity', 'proxyTheater',
        'energyMarkets', 'southChinaSea', 'myanmarConflict', 'aseanDiplomacy',
        'thaiSecurity'
    ];

    briefings.forEach((id, i) => {
        schedule(`/api/briefings/${id}`, 4 * MIN, 20000 + i * 30000);
    });

    // ── Regional country news — 18 country/region pairs, staggered 20s ──────
    // Each refreshes every 5 min; stagger prevents burst of 18 concurrent requests.

    const regionalTargets = [
        // Indo-Pacific ASEAN capitals
        { region: 'indopacific', code: 'TH' },
        { region: 'indopacific', code: 'VN' },
        { region: 'indopacific', code: 'ID' },
        { region: 'indopacific', code: 'MY' },
        { region: 'indopacific', code: 'PH' },
        { region: 'indopacific', code: 'SG' },
        { region: 'indopacific', code: 'KH' },
        { region: 'indopacific', code: 'MM' },
        { region: 'indopacific', code: 'LA' },
        { region: 'indopacific', code: 'BN' },
        { region: 'indopacific', code: 'KOR' },
        // Thailand sub-regions
        { region: 'thailand', code: 'BKK' },
        { region: 'thailand', code: 'CNX' },
        { region: 'thailand', code: 'EEC' },
        { region: 'thailand', code: 'HDY' },
        { region: 'thailand', code: 'KKC' },
        { region: 'thailand', code: 'PHK' },
        { region: 'thailand', code: 'UDN' },
    ];

    regionalTargets.forEach(({ region, code }, i) => {
        const path = `/api/regional-news?region=${region}&code=${code}`;
        // Start staggered: first fires 25s after server ready, then every 5 min.
        // 18 targets × 20s stagger = 6 min spread per cycle — well within 5 min TTL.
        schedule(path, 5 * MIN, 25000 + i * 20000);
    });

    console.log('[scheduler] started — warming cache for all 12 endpoints + 18 regional targets');
};
