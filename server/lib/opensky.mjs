/**
 * OpenSky Network — fetches live aircraft positions for theater bbox.
 */

const THEATER_BOUNDS = {
    middleeast: { lamin: 10, lomin: 24, lamax: 42, lomax: 65 },
    indopacific: { lamin: -10, lomin: 90, lamax: 25, lomax: 135 }
};

export const fetchOpenSkyPayload = async (theater = 'middleeast') => {
    const bounds = THEATER_BOUNDS[theater] || THEATER_BOUNDS.middleeast;
    const url = `https://opensky-network.org/api/states/all?lamin=${bounds.lamin}&lomin=${bounds.lomin}&lamax=${bounds.lamax}&lomax=${bounds.lomax}`;

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`OpenSky ${res.status}`);

        const data = await res.json();
        const states = data.states || [];

        const features = states
            .filter(s => s[5] != null && s[6] != null) // lon, lat must exist
            .slice(0, 200) // limit to 200 aircraft
            .map(s => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [s[5], s[6]] // lon, lat
                },
                properties: {
                    callsign: (s[1] || '').trim(),
                    origin: s[2] || '',
                    altitude: s[7], // meters
                    velocity: s[9], // m/s
                    heading: s[10],
                    onGround: s[8]
                }
            }));

        return {
            type: 'FeatureCollection',
            features,
            meta: {
                theater,
                count: features.length,
                fetchedAt: new Date().toISOString()
            }
        };
    } catch (err) {
        console.error('OpenSky error:', err.message);
        return {
            type: 'FeatureCollection',
            features: [],
            meta: { theater, count: 0, fetchedAt: new Date().toISOString() }
        };
    }
};
