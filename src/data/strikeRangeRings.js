/**
 * Geodesic Strike Range Rings Generator
 * Generates accurate geographic distance circles (500km - 2500km)
 * centered on strategic ballistic & drone launch sectors.
 */

// Helper to create circle points on spherical earth
function createGeodesicCircle(centerLng, centerLat, radiusKm, points = 64) {
    const coords = [];
    const earthRadiusKm = 6371;
    const radLat = (centerLat * Math.PI) / 180;
    const radLng = (centerLng * Math.PI) / 180;
    const d = radiusKm / earthRadiusKm;

    for (let i = 0; i <= points; i++) {
        const bearing = (i * 2 * Math.PI) / points;
        const lat = Math.asin(
            Math.sin(radLat) * Math.cos(d) +
            Math.cos(radLat) * Math.sin(d) * Math.cos(bearing)
        );
        const lng = radLng + Math.atan2(
            Math.sin(bearing) * Math.sin(d) * Math.cos(radLat),
            Math.cos(d) - Math.sin(radLat) * Math.sin(lat)
        );
        coords.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
    }
    return coords;
}

export const STRIKE_ORIGINS = [
    {
        id: 'iran-central',
        name: 'Central Iran (Isfahan / Natanz)',
        lng: 51.67,
        lat: 32.65,
        ranges: [500, 1000, 1500, 2000, 2500],
        color: '#ef4444'
    },
    {
        id: 'yemen-sanaa',
        name: 'Yemen (Sana\'a Launch Region)',
        lng: 44.19,
        lat: 15.37,
        ranges: [500, 1000, 1800],
        color: '#f97316'
    },
    {
        id: 'lebanon-south',
        name: 'Southern Lebanon / Northern Front',
        lng: 35.50,
        lat: 33.30,
        ranges: [150, 350, 750],
        color: '#f59e0b'
    }
];

export const getStrikeRangeRingsGeoJson = () => {
    const features = [];

    STRIKE_ORIGINS.forEach((origin) => {
        // Origin point
        features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [origin.lng, origin.lat] },
            properties: {
                id: `origin-${origin.id}`,
                kind: 'strike-origin',
                name: origin.name,
                color: origin.color
            }
        });

        // Range ring lines
        origin.ranges.forEach((rangeKm) => {
            const coords = createGeodesicCircle(origin.lng, origin.lat, rangeKm);
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coords
                },
                properties: {
                    id: `ring-${origin.id}-${rangeKm}km`,
                    kind: 'range-ring',
                    originName: origin.name,
                    rangeKm: `${rangeKm.toLocaleString()} km`,
                    color: origin.color
                }
            });
        });
    });

    return {
        type: 'FeatureCollection',
        features
    };
};
