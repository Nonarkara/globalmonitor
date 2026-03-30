/**
 * ACLED (Armed Conflict Location & Event Data) — geocoded conflict events.
 * Free API: https://acleddata.com/acled-api-documentation/
 * Returns battles, explosions/remote violence, violence against civilians
 * with exact lat/lon, fatalities, actors, and dates.
 */
import axios from 'axios';

const ACLED_BASE = 'https://api.acleddata.com/acled/read';

// Middle East + relevant countries
const ME_COUNTRIES = [
    'Iran', 'Iraq', 'Syria', 'Lebanon', 'Israel', 'Palestine',
    'Yemen', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Qatar',
    'United Arab Emirates', 'Oman', 'Jordan'
];

const EVENT_TYPES = [
    'Battles',
    'Explosions/Remote violence',
    'Violence against civilians',
    'Strategic developments'
];

export const fetchAcledEvents = async (options = {}) => {
    const {
        key = process.env.ACLED_API_KEY,
        email = process.env.ACLED_EMAIL,
        daysBack = 30,
        since: sinceOverride
    } = options;

    // If no API key, return curated war events from verified reporting
    if (!key || !email) {
        return buildFallbackEvents();
    }

    const since = sinceOverride || new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);

    try {
        const resp = await axios.get(ACLED_BASE, {
            params: {
                key, email,
                event_date: since,
                event_date_where: '>=',
                country: ME_COUNTRIES.join('|'),
                event_type: EVENT_TYPES.join('|'),
                limit: 500,
                fields: 'event_date|event_type|sub_event_type|actor1|actor2|country|admin1|latitude|longitude|fatalities|notes|source'
            },
            timeout: 15000
        });

        const events = resp.data?.data || [];
        return {
            type: 'FeatureCollection',
            features: events.map(e => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(e.longitude), parseFloat(e.latitude)]
                },
                properties: {
                    date: e.event_date,
                    eventType: e.event_type,
                    subType: e.sub_event_type,
                    actor1: e.actor1,
                    actor2: e.actor2,
                    country: e.country,
                    region: e.admin1,
                    fatalities: parseInt(e.fatalities, 10) || 0,
                    notes: e.notes?.slice(0, 200),
                    source: e.source
                }
            })),
            total: events.length,
            since,
            source: 'acled'
        };
    } catch (err) {
        console.warn('[ACLED] API fetch failed, using fallback:', err.message);
        return buildFallbackEvents();
    }
};

/**
 * Curated fallback events from verified war reporting (Day 1-29 of Iran conflict).
 * These represent major verified strikes/incidents from open-source intelligence.
 */
function buildFallbackEvents() {
    const events = [
        // Iran theater
        { date: '2026-02-28', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'US/Israel Coalition', country: 'Iran', region: 'Isfahan', lat: 32.65, lon: 51.68, fatalities: 0, notes: 'Initial strikes on Isfahan military infrastructure' },
        { date: '2026-03-01', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'US/Israel Coalition', country: 'Iran', region: 'Tehran', lat: 35.69, lon: 51.39, fatalities: 0, notes: 'Strikes on Tehran oil storage facilities' },
        { date: '2026-03-03', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'US/Israel Coalition', country: 'Iran', region: 'Natanz', lat: 33.72, lon: 51.73, fatalities: 0, notes: 'Natanz entrance buildings destroyed (IAEA confirmed)' },
        { date: '2026-03-03', type: 'Explosions/Remote violence', sub: 'Shelling/artillery', actor1: 'Iran (IRGC)', country: 'Israel', region: 'Tel Aviv', lat: 32.07, lon: 34.78, fatalities: 3, notes: 'Iranian missiles hit Ramat Gan / east Tel Aviv' },
        { date: '2026-03-04', type: 'Strategic developments', sub: 'Other', actor1: 'Iran (IRGC)', country: 'Iran', region: 'Strait of Hormuz', lat: 26.5, lon: 56.25, fatalities: 0, notes: 'IRGC declares Hormuz closed to US/Israel-allied vessels' },
        { date: '2026-03-04', type: 'Explosions/Remote violence', sub: 'Remote explosive', actor1: 'Iran (IRGC)', country: 'Qatar', region: 'Ras Laffan', lat: 25.9, lon: 51.53, fatalities: 0, notes: 'Iranian missiles hit Ras Laffan LNG; QatarEnergy declares force majeure' },
        // Lebanon theater
        { date: '2026-03-02', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'Israel', country: 'Lebanon', region: 'Southern Lebanon', lat: 33.27, lon: 35.2, fatalities: 45, notes: 'Israel strikes 500+ targets; Lebanon ceasefire collapses' },
        { date: '2026-03-16', type: 'Battles', sub: 'Armed clash', actor1: 'Israel', country: 'Lebanon', region: 'South of Litani', lat: 33.35, lon: 35.48, fatalities: 0, notes: 'Israeli ground operations begin south of Litani River' },
        // Iraq proxy attacks
        { date: '2026-03-07', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'Kataib Hezbollah', country: 'Iraq', region: 'Erbil', lat: 36.19, lon: 44.01, fatalities: 2, notes: 'Drone attack on US Harir base and Lanaz refinery' },
        // Gulf states
        { date: '2026-03-13', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'US Air Force', country: 'Iran', region: 'Kharg Island', lat: 29.24, lon: 50.33, fatalities: 0, notes: 'US bombs 90+ military sites; deliberately spares oil infrastructure' },
        { date: '2026-03-15', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'US Military', country: 'Yemen', region: 'Sanaa', lat: 15.37, lon: 44.19, fatalities: 0, notes: 'Operation Rough Rider — intense airstrikes on Houthi positions' },
        { date: '2026-03-18', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'Israel', country: 'Iran', region: 'Asaluyeh', lat: 27.5, lon: 52.6, fatalities: 0, notes: 'Israeli drones damage 4 South Pars gas treatment plants' },
        { date: '2026-03-19', type: 'Explosions/Remote violence', sub: 'Remote explosive', actor1: 'Iran (IRGC)', country: 'Kuwait', region: 'Mina Abdullah', lat: 29.05, lon: 48.15, fatalities: 0, notes: 'Kuwait refinery hit; oil output cut by half' },
        { date: '2026-03-21', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'US/Israel Coalition', country: 'Iran', region: 'Natanz', lat: 33.72, lon: 51.73, fatalities: 0, notes: 'Additional US strikes on Natanz nuclear complex' },
        { date: '2026-03-24', type: 'Explosions/Remote violence', sub: 'Air/drone strike', actor1: 'US/Israel Coalition', country: 'Iran', region: 'Bushehr', lat: 28.83, lon: 50.89, fatalities: 0, notes: 'Strikes near Bushehr reactor; Chamran Missile Base hit' },
        { date: '2026-03-28', type: 'Explosions/Remote violence', sub: 'Remote explosive', actor1: 'Houthis', country: 'Israel', region: 'Southern Israel', lat: 31.25, lon: 34.79, fatalities: 0, notes: 'First Houthi ballistic missile attack on Israel since war began' },
    ];

    return {
        type: 'FeatureCollection',
        features: events.map(e => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
            properties: {
                date: e.date,
                eventType: e.type,
                subType: e.sub,
                actor1: e.actor1,
                country: e.country,
                region: e.region,
                fatalities: e.fatalities,
                notes: e.notes,
                source: 'OSINT verified reporting'
            }
        })),
        total: events.length,
        since: '2026-02-28',
        source: 'curated_fallback'
    };
}
