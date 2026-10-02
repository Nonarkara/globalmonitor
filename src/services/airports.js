const EMPTY_AIRPORTS = Object.freeze({ type: 'FeatureCollection', features: [] });

export const fetchAirportLocations = async () => {
    const base = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${base}data/airports/airports.geojson`, {
        cache: 'force-cache',
    });

    if (!response.ok) throw new Error(`Airport locations ${response.status}`);

    const payload = await response.json();
    if (payload?.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
        return EMPTY_AIRPORTS;
    }
    return payload;
};
