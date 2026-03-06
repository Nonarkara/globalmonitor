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
