/**
 * Shared backend theater registry — single source of truth for theater
 * geography across all server/lib fetchers AND Cloudflare Pages Functions
 * (functions/_lib/* imports this module directly; wrangler bundles
 * functions/ with imports outside functions/, as already proven by
 * functions/_lib/router.mjs importing server/lib/*.mjs).
 *
 * Previously ≥8 backend files each defined their own theater bboxes /
 * country lists with INCONSISTENT values (e.g. Middle East was
 * '24,10,65,42' in firms.mjs but '12,30,40,62' in airlabs.mjs).
 * All theater-aware libs must import from here.
 *
 * ── Canonical Middle East bbox decision ──────────────────────────────────
 * Kept '24,10,65,42' (w,s,e,n) — used by 6 of 8 files (firms, usgsQuakes,
 * opensky, aviationStack, aisVessels, functions/_lib/vessels) and is the
 * box the frontend map frames. The airlabs.mjs variant '12,30,40,62'
 * (minLat,minLng,maxLat,maxLng) truncates western Iran (~51–62°E is fine,
 * but lomin=30 cuts eastern Turkey/Sinai and lomax=62 cuts eastern Iran/
 * Afghanistan border) and was the outlier — retired in favor of the
 * majority value. Airlabs enrichment is sparse/hex-keyed, so the wider box
 * is harmless there.
 *
 * ── Global bbox decision ─────────────────────────────────────────────────
 * FIRMS global uses 5 continental sub-bboxes instead of one whole-world
 * request: the FIRMS area API has a hard 5000-row CSV limit per request,
 * and a worldwide VIIRS request exceeds it (the API truncates and logs a
 * warning). Sub-bboxes are fetched in parallel with per-request failure
 * tolerance in firms.mjs. Flight/AIS libs (opensky, airplanesLive,
 * airlabs) natively support worldwide queries, so THEATERS.global.bbox is
 * the full world for them.
 */

/**
 * Canonical theater registry.
 * bbox: [minLon, minLat, maxLon, maxLat] (w,s,e,n).
 * bboxCsv: same, comma-joined (FIRMS area API format).
 * bounds: {lamin,lomin,lamax,lomax} (OpenSky/airplanes.live format).
 * airlabsBbox: 'minLat,minLng,maxLat,maxLng' (airlabs.co format).
 * usgsParams: {minlatitude,maxlatitude,minlongitude,maxlongitude}.
 * center: {lat,lon} (aviation-edge radius queries).
 * queryPoints: overlapping 250 nm circles covering the bbox (airplanes.live).
 * acledCountries: ACLED `country` filter values (pipe-joined by acled.mjs).
 * unhcrCountries: ISO3 country-of-origin codes (UNHCR/ReliefWeb).
 * gdeltQuery: GDELT doc API query string.
 */
export const THEATERS = {
    middleeast: {
        id: 'middleeast',
        label: 'Middle East',
        bbox: [24, 10, 65, 42],
        bboxCsv: '24,10,65,42',
        bounds: { lamin: 10, lomin: 24, lamax: 42, lomax: 65 },
        airlabsBbox: '10,24,42,65',
        usgsParams: { minlatitude: 10, maxlatitude: 42, minlongitude: 24, maxlongitude: 65 },
        center: { lat: 30, lon: 53 },
        queryPoints: [
            { lat: 26.0, lon: 50.0 },  // Gulf
            { lat: 33.5, lon: 36.0 },  // Levant
            { lat: 30.0, lon: 32.0 },  // Egypt / Sinai
            { lat: 24.0, lon: 54.0 },  // UAE / Oman
            { lat: 29.0, lon: 48.0 },  // Kuwait / S Iraq
            { lat: 22.0, lon: 38.0 },  // Red Sea
        ],
        acledCountries: [
            'Iran', 'Iraq', 'Syria', 'Lebanon', 'Israel', 'Palestine',
            'Yemen', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Qatar',
            'United Arab Emirates', 'Oman', 'Jordan'
        ],
        unhcrCountries: ['SYR', 'IRQ', 'AFG', 'YEM', 'SDN', 'PSE', 'LBN'],
        gdeltQuery: 'Iran OR Israel OR Gulf OR Hormuz'
    },

    indopacific: {
        id: 'indopacific',
        label: 'Indo-Pacific',
        bbox: [90, -10, 135, 25],
        bboxCsv: '90,-10,135,25',
        bounds: { lamin: -10, lomin: 90, lamax: 25, lomax: 135 },
        // Old airlabs value was '-10,95,30,135' — lomin 95 cut Myanmar's
        // western border and Bangladesh; aligned to canonical bbox.
        airlabsBbox: '-10,90,25,135',
        usgsParams: { minlatitude: -10, maxlatitude: 25, minlongitude: 90, maxlongitude: 135 },
        center: { lat: 5, lon: 110 },
        queryPoints: [
            { lat: 14.0, lon: 100.0 },  // Bangkok / Gulf of Thailand
            { lat: 5.0, lon: 110.0 },   // South China Sea central
            { lat: 1.35, lon: 103.82 }, // Singapore
            { lat: -6.2, lon: 106.85 }, // Jakarta
            { lat: 14.6, lon: 121.0 },  // Manila
            { lat: -2.0, lon: 118.0 },  // Sulawesi / eastern Indonesia
            { lat: 10.8, lon: 106.7 },  // Ho Chi Minh / Mekong delta
            { lat: 22.3, lon: 114.2 },  // Hong Kong / Pearl River
        ],
        acledCountries: [
            'Thailand', 'Myanmar', 'Vietnam', 'Philippines', 'Malaysia',
            'Indonesia', 'Singapore', 'Cambodia', 'Laos', 'Brunei',
            'India', 'Bangladesh', 'Sri Lanka', 'Pakistan'
        ],
        unhcrCountries: ['THA', 'MMR', 'KHM', 'LAO', 'VNM', 'PHL', 'IDN', 'MYS', 'IND', 'BGD', 'LKA', 'PAK'],
        gdeltQuery: 'Thailand OR Singapore OR Vietnam OR Philippines'
    },

    thailand: {
        id: 'thailand',
        label: 'Thailand',
        bbox: [97, 5, 106, 21],
        bboxCsv: '97,5,106,21',
        bounds: { lamin: 5, lomin: 97, lamax: 21, lomax: 106 },
        airlabsBbox: '5,97,21,106',
        usgsParams: { minlatitude: 5, maxlatitude: 21, minlongitude: 97, maxlongitude: 106 },
        center: { lat: 14.5, lon: 100.9925 },
        queryPoints: [
            { lat: 14.5, lon: 100.9925 }, // Bangkok
            { lat: 18.79, lon: 98.98 },   // Chiang Mai
            { lat: 7.88, lon: 98.39 },    // Phuket
            { lat: 16.44, lon: 102.83 },  // Khon Kaen
        ],
        acledCountries: ['Thailand', 'Myanmar', 'Laos', 'Cambodia', 'Malaysia'],
        unhcrCountries: ['THA', 'MMR', 'KHM', 'LAO', 'MYS'],
        gdeltQuery: 'Thailand OR Bangkok OR Myanmar border'
    },

    global: {
        id: 'global',
        label: 'Global',
        bbox: [-180, -90, 180, 90],
        bboxCsv: '-180,-90,180,90',
        bounds: { lamin: -90, lomin: -180, lamax: 90, lomax: 180 },
        airlabsBbox: '-60,-180,75,180',
        // Omitted for USGS: no bbox params = worldwide query (see usgsQuakes.mjs).
        usgsParams: null,
        center: null, // multi-center; use queryPoints
        queryPoints: [
            { lat: 40.0, lon: -100.0 },  // North America central
            { lat: 45.0, lon: -70.0 },   // US East / Atlantic
            { lat: 60.0, lon: -150.0 },  // Alaska / North Pacific
            { lat: 51.0, lon: 0.0 },     // UK / Western Europe
            { lat: 48.0, lon: 10.0 },    // Central Europe
            { lat: 55.0, lon: 37.0 },    // Eastern Europe / Russia west
            { lat: 25.0, lon: 55.0 },    // Gulf / Middle East
            { lat: 30.0, lon: 80.0 },    // South Asia
            { lat: 35.0, lon: 135.0 },   // Japan
            { lat: 20.0, lon: 110.0 },   // Southeast Asia
            { lat: 10.0, lon: -75.0 },   // Caribbean / northern South America
            { lat: -25.0, lon: 135.0 },  // Australia
            { lat: -15.0, lon: -50.0 },  // Brazil
            { lat: -35.0, lon: 25.0 }    // South Africa
        ],
        /**
         * Curated conflict-country list for the ACLED global view: the
         * existing ME 14 plus the major active conflict theaters worldwide
         * (Ukraine/Russia, Sudan/Sahel, DRC, Myanmar, Horn of Africa,
         * Haiti, Latin America, Afghanistan/Pakistan, Philippines,
         * Thailand). ACLED's pipe-joined `country` filter has no documented
         * country-count limit, and the response is capped by `limit=500`
         * rows regardless, so a single curated filter is the workable
         * approach — a whole-world (no-filter) query would return 500
         * arbitrary rows dominated by the highest-volume countries.
         */
        acledCountries: [
            // Middle East (existing 14)
            'Iran', 'Iraq', 'Syria', 'Lebanon', 'Israel', 'Palestine',
            'Yemen', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Qatar',
            'United Arab Emirates', 'Oman', 'Jordan',
            // Europe
            'Ukraine', 'Russia',
            // Africa — Sudan/Sahel/Horn/DRC
            'Sudan', 'South Sudan', 'Ethiopia', 'Somalia', 'Nigeria',
            'Mali', 'Burkina Faso', 'Niger', 'Chad', 'Cameroon', 'Libya',
            'Democratic Republic of Congo',
            // Asia
            'Myanmar', 'Afghanistan', 'Pakistan', 'Philippines', 'Thailand',
            // Americas
            'Haiti', 'Colombia', 'Mexico'
        ],
        // Major displacement-origin countries (UNHCR/ReliefWeb global view).
        // Must stay in sync with COUNTRY_CENTROIDS/COUNTRY_NAMES in
        // humanitarian.mjs — codes missing there are filtered silently.
        unhcrCountries: [
            'SYR', 'IRQ', 'AFG', 'YEM', 'SDN', 'PSE', 'LBN', 'SOM', 'MMR',
            'PAK', 'UKR', 'RUS', 'SSD', 'ETH', 'NGA', 'MLI', 'BFA', 'NER',
            'TCD', 'HTI', 'COL', 'COD', 'CMR', 'LBY', 'PHL', 'THA'
        ],
        gdeltQuery: 'war OR conflict OR airstrike OR offensive OR ceasefire'
    }
};

/**
 * FIRMS global coverage: 5 continental sub-bboxes ([minLon,minLat,maxLon,maxLat])
 * fetched in parallel and merged by firms.mjs. Avoids the FIRMS area API's
 * 5000-row CSV cap that a single worldwide request would hit.
 */
export const FIRMS_GLOBAL_SUB_BBOXES = [
    [-170, 15, -30, 75],    // North & Central America (+ Caribbean)
    [-85, -60, -30, 15],    // South America
    [-20, -40, 55, 72],     // Europe + Africa (+ Middle East)
    [55, -10, 100, 75],     // Central & South Asia (+ Russia south)
    [100, -50, 180, 75]     // East/Southeast Asia + Oceania (+ Russia east)
];

export const THEATER_IDS = Object.keys(THEATERS);
export const DEFAULT_THEATER = 'middleeast';

/** Known theater id, or the default. Accepts 'worldwide' as a global alias. */
export const resolveTheater = (theater) => {
    if (theater === 'worldwide') return 'global';
    return THEATERS[theater] ? theater : DEFAULT_THEATER;
};

/** Theater config object, falling back to the default theater. */
export const getTheater = (theater) => THEATERS[resolveTheater(theater)];
