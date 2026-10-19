/**
 * Conflict Kinetic Warfare & Trajectory Vectors
 *
 * Real-time animation coordinates for active strike corridors,
 * ballistic/UAV attack trajectories, and kinetic shockwave radar pulses.
 */

// Helper to create circle points on spherical earth
function createGeodesicCircle(centerLng, centerLat, radiusKm, points = 32) {
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

export const KINETIC_HOTSPOTS = [
    {
        id: 'hotspot-beirut-dahieh',
        name: 'Beirut Southern Suburbs (Dahieh)',
        lng: 35.51,
        lat: 33.84,
        type: 'Airstrike & Air Defense Engagement',
        color: '#a72144',
        periodMs: 2400,
        maxRadiusKm: 35
    },
    {
        id: 'hotspot-south-lebanon',
        name: 'Southern Lebanon / Litani Front',
        lng: 35.38,
        lat: 33.24,
        type: 'Artillery & Ground Clash Perimeter',
        color: '#f37420',
        periodMs: 2800,
        maxRadiusKm: 42
    },
    {
        id: 'hotspot-golan-border',
        name: 'Golan Heights / Mount Hermon Sector',
        lng: 35.75,
        lat: 33.25,
        type: 'Rocket Artillery & Interception Dome',
        color: '#f59e0b',
        periodMs: 3100,
        maxRadiusKm: 38
    },
    {
        id: 'hotspot-gaza-strip',
        name: 'Gaza Strip (Khan Younis / Rafah)',
        lng: 34.30,
        lat: 31.30,
        type: 'Intensive Kinetic Bombardment',
        color: '#a72144',
        periodMs: 2200,
        maxRadiusKm: 30
    },
    {
        id: 'hotspot-red-sea-corridor',
        name: 'Southern Red Sea Shipping Chokepoint (14°N)',
        lng: 42.50,
        lat: 14.15,
        type: 'Anti-Ship Drone & Ballistic Missile Danger Zone',
        color: '#a72144',
        periodMs: 3200,
        maxRadiusKm: 65
    },
    {
        id: 'hotspot-hodeidah-port',
        name: 'Hodeidah Port (Yemen)',
        lng: 42.95,
        lat: 14.80,
        type: 'Terminal & Air Defense Strike Zone',
        color: '#f37420',
        periodMs: 2600,
        maxRadiusKm: 45
    },
    {
        id: 'hotspot-strait-of-hormuz',
        name: 'Strait of Hormuz Naval Choke',
        lng: 56.35,
        lat: 26.55,
        type: 'Naval Interdiction & Drone Reconnaissance Route',
        color: '#006eb8',
        periodMs: 3500,
        maxRadiusKm: 55
    },
    {
        id: 'hotspot-isfahan-sector',
        name: 'Isfahan / Natanz Strategic Sector',
        lng: 51.68,
        lat: 32.65,
        type: 'Air Defense Radar & Alert Perimeter',
        color: '#b984af',
        periodMs: 3800,
        maxRadiusKm: 70
    }
];

export const KINETIC_TRAJECTORIES = [
    {
        id: 'traj-houthi-redsea',
        name: 'Houthi Anti-Ship Missile & UAV Strike Corridor',
        origin: 'Yemen Western Coast',
        target: 'Red Sea International Shipping Lane',
        color: '#a72144',
        coordinates: [
            [44.19, 15.37],
            [43.30, 14.60],
            [42.70, 14.10],
            [42.40, 13.50],
            [42.60, 12.80]
        ]
    },
    {
        id: 'traj-houthi-eilat',
        name: 'Houthi Long-Range Ballistic & UAV Attack Vector',
        origin: 'Sana\'a Launch Enclave',
        target: 'Eilat / Southern Israel',
        color: '#f37420',
        coordinates: [
            [44.19, 15.37],
            [41.50, 19.80],
            [38.70, 24.60],
            [36.20, 27.80],
            [34.95, 29.55]
        ]
    },
    {
        id: 'traj-hezbollah-galilee',
        name: 'Hezbollah Rocket & Shahed Drone Incursion Arc',
        origin: 'Litani River Valley / Southern Lebanon',
        target: 'Upper Galilee / Haifa Industrial Bay',
        color: '#a72144',
        coordinates: [
            [35.50, 33.32],
            [35.35, 33.15],
            [35.15, 32.95],
            [35.02, 32.81]
        ]
    },
    {
        id: 'traj-idf-northern-counter',
        name: 'IDF Counter-Battery & Air Superiority Sortie Vector',
        origin: 'Ramat David / Central Airbases',
        target: 'Southern Lebanon & Syrian Border Outposts',
        color: '#006eb8',
        coordinates: [
            [35.18, 32.66],
            [35.40, 33.05],
            [35.55, 33.35],
            [35.75, 33.60]
        ]
    },
    {
        id: 'traj-iran-ballistic-corridor',
        name: 'Iranian Long-Range Ballistic Transit Corridor',
        origin: 'Western Iran Launch Silos',
        target: 'Levant Airspace / Interception Gate',
        color: '#a72144',
        coordinates: [
            [51.67, 32.65],
            [47.50, 33.60],
            [43.20, 33.90],
            [38.40, 33.10],
            [35.30, 32.20]
        ]
    },
    {
        id: 'traj-hormuz-patrol',
        name: 'IRGC Fast-Attack Naval Interdiction Perimeter',
        origin: 'Bandar Abbas',
        target: 'Strait of Hormuz Traffic Separation Scheme',
        color: '#006eb8',
        coordinates: [
            [56.28, 27.18],
            [56.35, 26.85],
            [56.55, 26.50],
            [56.30, 26.25]
        ]
    }
];

export const getKineticTrajectoriesGeoJson = () => {
    const features = [];

    KINETIC_TRAJECTORIES.forEach((traj) => {
        // Line string for the path
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: traj.coordinates
            },
            properties: {
                id: traj.id,
                kind: 'kinetic-trajectory',
                name: traj.name,
                origin: traj.origin,
                target: traj.target,
                color: traj.color
            }
        });

        // Target point
        const targetCoord = traj.coordinates[traj.coordinates.length - 1];
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: targetCoord
            },
            properties: {
                id: `${traj.id}-target`,
                kind: 'kinetic-target',
                name: traj.name,
                target: traj.target,
                color: traj.color
            }
        });
    });

    return {
        type: 'FeatureCollection',
        features
    };
};

/**
 * Generate animated expanding radar rings around active kinetic hotspots
 * based on current timestamp.
 */
export const generateKineticPulsesGeoJson = (timestamp = Date.now()) => {
    const features = [];

    KINETIC_HOTSPOTS.forEach((spot) => {
        // Phase calculation: 0 to 1
        const phase1 = ((timestamp % spot.periodMs) / spot.periodMs);
        const phase2 = (((timestamp + (spot.periodMs / 2)) % spot.periodMs) / spot.periodMs);

        // Ring 1
        const r1 = Math.max(1, phase1 * spot.maxRadiusKm);
        const op1 = Math.max(0, (1 - phase1) * 0.75);
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: createGeodesicCircle(spot.lng, spot.lat, r1, 32)
            },
            properties: {
                id: `${spot.id}-ring1`,
                kind: 'pulse-ring',
                color: spot.color,
                opacity: op1,
                width: 1.6
            }
        });

        // Ring 2 (delayed phase)
        const r2 = Math.max(1, phase2 * spot.maxRadiusKm);
        const op2 = Math.max(0, (1 - phase2) * 0.55);
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: createGeodesicCircle(spot.lng, spot.lat, r2, 32)
            },
            properties: {
                id: `${spot.id}-ring2`,
                kind: 'pulse-ring',
                color: spot.color,
                opacity: op2,
                width: 1.2
            }
        });

        // Central kinetic flare point
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [spot.lng, spot.lat]
            },
            properties: {
                id: `${spot.id}-center`,
                kind: 'pulse-center',
                name: spot.name,
                type: spot.type,
                color: spot.color
            }
        });
    });

    return {
        type: 'FeatureCollection',
        features
    };
};
