import { getTheater, resolveTheater } from './theaters.mjs';

// Aviation Edge takes a center point + radius. Global uses several
// continental centers (queryPoints from the shared registry) because a
// single 500 km circle can't cover the world.
const GLOBAL_QUERY_POINTS = [
    { lat: 25.0, lon: 55.0 },   // Gulf / Middle East
    { lat: 48.0, lon: 10.0 },   // Central Europe
    { lat: 20.0, lon: 110.0 },  // Southeast Asia
    { lat: 40.0, lon: -100.0 }, // North America central
];

export const fetchAviationEdgePayload = async (theater = 'middleeast', apiKey) => {
    const resolved = resolveTheater(theater);
    const centers = resolved === 'global'
        ? GLOBAL_QUERY_POINTS
        : [getTheater(resolved).center || getTheater('middleeast').center];
    // API docs: https://aviation-edge.com/v2/public/flights?key=[API_KEY]&lat=51.5074&lng=0.1278&distance=100
    // distance is in km, we'll use 500km to cover a good portion of the theater
    const urls = centers.map((c) =>
        `https://aviation-edge.com/v2/public/flights?key=${apiKey}&lat=${c.lat}&lng=${c.lon}&distance=500`
    );

    try {
        const results = await Promise.all(urls.map(async (url) => {
            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
                if (!res.ok) throw new Error(`Aviation Edge API ${res.status}`);

                const data = await res.json();
                if (data.error) throw new Error(`Aviation Edge API Error: ${data.error}`);
                return Array.isArray(data) ? data : [];
            } catch (err) {
                // Per-center failure tolerance: a rejected center contributes
                // nothing instead of failing the whole theater.
                console.error('Aviation Edge center error:', err.message);
                return [];
            }
        }));
        const aircraftList = results.flat();
        const seen = new Set();
        const deduped = aircraftList.filter((ac) => {
            const key = ac.flight?.icaoNumber || ac.flight?.iataNumber ||
                `${ac.geography?.latitude}:${ac.geography?.longitude}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const features = deduped
            .filter(ac => ac.geography?.latitude != null && ac.geography?.longitude != null)
            .map(ac => {
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [ac.geography.longitude, ac.geography.latitude]
                    },
                    properties: {
                        callsign: ac.flight?.iataNumber || ac.flight?.icaoNumber || 'Unknown',
                        origin: ac.departure?.iataCode || '',
                        altitude: ac.geography?.altitude || 0, // meters
                        velocity: (ac.speed?.horizontal || 0) * 0.277778, // km/h to m/s
                        heading: ac.geography?.direction || 0,
                        onGround: ac.speed?.isGround === 1.0 || ac.status !== 'en-route',
                        type: ac.aircraft?.icaoCode || 'Unknown',
                        desc: ''
                    }
                };
            });

        return {
            type: 'FeatureCollection',
            features,
            meta: {
                theater: resolved,
                count: features.length,
                fetchedAt: new Date().toISOString(),
                source: 'aviation-edge'
            }
        };
    } catch (err) {
        console.error('Aviation Edge error:', err.message);
        return {
            type: 'FeatureCollection',
            features: [],
            meta: { theater: resolved, count: 0, fetchedAt: new Date().toISOString(), source: 'aviation-edge' }
        };
    }
};
