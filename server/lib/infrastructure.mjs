/**
 * Infrastructure Status Tracker — curated registry of key energy/transport
 * infrastructure with FIRMS-based damage detection.
 */

const INFRASTRUCTURE_POINTS = [
    { name: 'Ras Laffan LNG', type: 'lng_terminal', coords: [51.53, 25.9], capacity: '77 MTPA' },
    { name: 'Kharg Island Terminal', type: 'oil_terminal', coords: [50.33, 29.24], capacity: '5 mbpd' },
    { name: 'Abqaiq Processing', type: 'refinery', coords: [49.68, 25.94], capacity: '7 mbpd' },
    { name: 'Strait of Hormuz W', type: 'chokepoint', coords: [56.25, 26.5] },
    { name: 'Strait of Hormuz E', type: 'chokepoint', coords: [56.45, 26.2] },
    { name: 'Bab el-Mandeb', type: 'chokepoint', coords: [43.33, 12.58] },
    { name: 'Suez Canal', type: 'chokepoint', coords: [32.34, 30.46] },
    { name: 'Yanbu Terminal', type: 'oil_terminal', coords: [38.06, 24.09] },
    { name: 'Fujairah Hub', type: 'oil_terminal', coords: [56.36, 25.12] },
    { name: 'Bandar Abbas Port', type: 'port', coords: [56.27, 27.18] },
    { name: 'Jask Terminal', type: 'oil_terminal', coords: [57.77, 25.64] },
    { name: 'Aden Port', type: 'port', coords: [45.03, 12.79] },
    { name: 'Dammam Port', type: 'port', coords: [50.21, 26.43] },
    { name: 'Basra Oil Terminal', type: 'oil_terminal', coords: [48.72, 29.75] },
    { name: 'Haifa Port', type: 'port', coords: [35.00, 32.82] },
    { name: 'Ashkelon Pipeline', type: 'pipeline', coords: [34.56, 31.66] },
    { name: 'Isfahan Nuclear', type: 'nuclear', coords: [51.68, 32.65] },
    { name: 'Natanz Enrichment', type: 'nuclear', coords: [51.73, 33.72] },
    { name: 'Bushehr Reactor', type: 'nuclear', coords: [50.89, 28.83] },
    { name: 'Dimona Facility', type: 'nuclear', coords: [35.15, 31.00] }
];

const PROXIMITY_KM = 15;

const haversineDistance = (lon1, lat1, lon2, lat2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const computeInfrastructureStatus = (serverCache) => {
    // Get FIRMS fire data for proximity check
    const firmsEntry = serverCache.get('firms:middleeast');
    const firePoints = firmsEntry?.payload?.features || [];

    const features = INFRASTRUCTURE_POINTS.map(infra => {
        let status = 'operational';
        let nearbyFires = 0;

        for (const fire of firePoints) {
            const [fLon, fLat] = fire.geometry.coordinates;
            const dist = haversineDistance(infra.coords[0], infra.coords[1], fLon, fLat);
            if (dist <= PROXIMITY_KM) {
                nearbyFires++;
                if (fire.properties?.confidence === 'high' || fire.properties?.confidence === 'h') {
                    status = 'alert';
                } else if (status !== 'alert') {
                    status = 'monitoring';
                }
            }
        }

        return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: infra.coords },
            properties: {
                name: infra.name,
                type: infra.type,
                capacity: infra.capacity || null,
                status,
                nearbyFires
            }
        };
    });

    return {
        type: 'FeatureCollection',
        features,
        summary: {
            total: features.length,
            operational: features.filter(f => f.properties.status === 'operational').length,
            monitoring: features.filter(f => f.properties.status === 'monitoring').length,
            alert: features.filter(f => f.properties.status === 'alert').length
        },
        updatedAt: new Date().toISOString()
    };
};
