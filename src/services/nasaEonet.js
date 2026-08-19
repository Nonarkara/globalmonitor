import axios from 'axios';

// NASA EONET (Earth Observatory Natural Event Tracker)
// Returns active events like wildfires, volcanoes, storms
export const fetchNaturalDisasters = async () => {
    try {
        const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v2.1/events?status=open&days=30');

        // Transform NASA EONET data into GeoJSON format for MapLibre
        const features = response.data.events
            .filter(event => event.geometry && event.geometry.length > 0)
            .map(event => {
                // Handle both points and polygons, extracting a single point for the marker
                const geom = event.geometry[0];
                let coords = null;

                if (geom.type === 'Point') {
                    coords = geom.coordinates;
                } else if (geom.type === 'Polygon') {
                    // just take first point of polygon for simplicity
                    coords = geom.coordinates[0][0];
                }

                if (!coords) return null;

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: coords
                    },
                    properties: {
                        id: event.id,
                        title: event.title,
                        category: event.categories[0]?.title || 'Unknown',
                        type: 'disaster',
                        date: geom.date
                    }
                };
            })
            .filter(Boolean);

        return {
            type: 'FeatureCollection',
            features
        };
    } catch (error) {
        console.error("Error fetching NASA EONET data:", error);
        return { type: 'FeatureCollection', features: [] };
    }
};

const STORM_TITLE = /storm|cyclone|typhoon|hurricane/i;

const toPointFeature = (event, coords, date, category) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coords },
    properties: {
        id: event.id,
        title: event.title,
        category,
        type: 'storm',
        date
    }
});

/** Named storms currently open in EONET — last reported position, not the first. */
export const fetchActiveStorms = async () => {
    try {
        const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open', {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`EONET ${response.status}`);
        const data = await response.json();
        const features = (data.events || [])
            .map((event) => {
                const geom = (event.geometry || []).at(-1);
                if (!geom) return null;
                let coords = null;
                if (geom.type === 'Point') coords = geom.coordinates;
                else if (geom.type === 'Polygon') coords = geom.coordinates?.[0]?.[0];
                if (!Array.isArray(coords) || coords.length < 2) return null;
                const category = event.categories?.[0]?.title || 'Severe Storms';
                return toPointFeature(event, coords, geom.date, category);
            })
            .filter(Boolean);
        return { type: 'FeatureCollection', features };
    } catch {
        return { type: 'FeatureCollection', features: [] };
    }
};

export const isStormEvent = (feature) => {
    const category = feature?.properties?.category || '';
    const title = feature?.properties?.title || '';
    return STORM_TITLE.test(category) || STORM_TITLE.test(title);
};
