/**
 * Conflict Power Grid Blackouts & Nightlight Loss Assessment
 *
 * Satellite-observed radiance loss data (NASA VIIRS Black Marble Day/Night Band)
 * cross-referenced with energy infrastructure damage assessments (UNOCHA, World Bank).
 * Quantifies and portrays regions where modern electrical power and illumination
 * have collapsed due to kinetic strikes, fuel embargoes, or grid severance.
 */

export const CONFLICT_BLACKOUT_ZONES = [
    {
        id: 'blackout-gaza',
        name: 'Gaza Strip — Total Electrical Collapse',
        theater: 'middleeast',
        country: 'Palestine / Gaza',
        lossPercent: 92,
        baselineRadiance: '16.4 nW/cm²/sr',
        currentRadiance: '1.3 nW/cm²/sr',
        status: 'Total Grid Collapse',
        cause: 'Sole power plant fuel shutdown; 10 cross-border transmission lines severed; 80%+ distribution transformer destruction',
        civilianImpact: 'Hospitals on failing emergency diesel generators; water desalination plants halted; telecommunications blackouts',
        sensor: 'NASA VIIRS Black Marble / DNB Composite',
        coordinates: [
            [34.21, 31.22],
            [34.27, 31.18],
            [34.40, 31.35],
            [34.55, 31.54],
            [34.51, 31.59],
            [34.45, 31.53],
            [34.33, 31.42],
            [34.21, 31.22]
        ],
        center: [34.38, 31.41]
    },
    {
        id: 'blackout-south-lebanon',
        name: 'Southern Lebanon — Border Transmission Sever',
        theater: 'middleeast',
        country: 'Lebanon',
        lossPercent: 68,
        baselineRadiance: '12.1 nW/cm²/sr',
        currentRadiance: '3.9 nW/cm²/sr',
        status: 'Critical Grid Failure',
        cause: 'High-voltage transmission pylons damaged in border shelling; regional substations in Marjayoun and Tyre offline',
        civilianImpact: 'Municipal water pumps disabled; civilian flight from border towns; reliance on private localized generators',
        sensor: 'NASA VIIRS Black Marble / DNB Composite',
        coordinates: [
            [35.15, 33.10],
            [35.35, 33.05],
            [35.60, 33.25],
            [35.65, 33.40],
            [35.40, 33.42],
            [35.25, 33.35],
            [35.15, 33.10]
        ],
        center: [35.38, 33.24]
    },
    {
        id: 'blackout-beirut-dahieh',
        name: 'Beirut Southern Suburbs (Dahieh) — Strike Corridor Outages',
        theater: 'middleeast',
        country: 'Lebanon',
        lossPercent: 55,
        baselineRadiance: '28.6 nW/cm²/sr',
        currentRadiance: '12.9 nW/cm²/sr',
        status: 'Severe Sector Outage',
        cause: 'Airstrikes on high-density residential and command sectors; secondary electrical feeder cuts',
        civilianImpact: 'Rolling 20-hour blackouts; commercial shutdown; localized grid fires',
        sensor: 'NASA VIIRS Black Marble / DNB Composite',
        coordinates: [
            [35.48, 33.82],
            [35.54, 33.82],
            [35.54, 33.87],
            [35.48, 33.87],
            [35.48, 33.82]
        ],
        center: [35.51, 33.845]
    },
    {
        id: 'blackout-hodeidah-yemen',
        name: 'Western Yemen (Hodeidah Port) — Fuel Terminal Destruction',
        theater: 'middleeast',
        country: 'Yemen',
        lossPercent: 74,
        baselineRadiance: '9.8 nW/cm²/sr',
        currentRadiance: '2.5 nW/cm²/sr',
        status: 'Severe Fuel & Power Collapse',
        cause: 'Airstrikes on Ras Isa and Hodeidah fuel storage depots & Ras Khatib power generation station',
        civilianImpact: 'Port container gantry cranes stalled; humanitarian aid cold-chain refrigeration compromised',
        sensor: 'NASA VIIRS Black Marble / DNB Composite',
        coordinates: [
            [42.85, 14.70],
            [43.08, 14.70],
            [43.12, 14.95],
            [42.90, 14.95],
            [42.85, 14.70]
        ],
        center: [42.98, 14.82]
    },
    {
        id: 'blackout-sanaa-yemen',
        name: 'Sana\'a Highlands — Chronic Grid Deficit',
        theater: 'middleeast',
        country: 'Yemen',
        lossPercent: 62,
        baselineRadiance: '15.3 nW/cm²/sr',
        currentRadiance: '5.8 nW/cm²/sr',
        status: 'Chronic Power Deficit',
        cause: 'Central Marib-Sana\'a 400kV line severed since initial conflict; severe diesel rationing',
        civilianImpact: 'Widespread night darkness; public lighting zeroed; decentralized solar battery reliance',
        sensor: 'NASA VIIRS Black Marble / DNB Composite',
        coordinates: [
            [44.10, 15.25],
            [44.32, 15.25],
            [44.32, 15.48],
            [44.10, 15.48],
            [44.10, 15.25]
        ],
        center: [44.21, 15.36]
    },
    {
        id: 'blackout-deir-ez-zor',
        name: 'Eastern Syria (Deir ez-Zor) — Hydrocarbon Energy Disruption',
        theater: 'middleeast',
        country: 'Syria',
        lossPercent: 64,
        baselineRadiance: '7.6 nW/cm²/sr',
        currentRadiance: '2.7 nW/cm²/sr',
        status: 'Localized Grid Cut',
        cause: 'Clashes around Conoco gas plants and Euphrates transmission crossings; gas turbine shutoffs',
        civilianImpact: 'Water filtration pumps down; agricultural irrigation blackouts',
        sensor: 'NASA VIIRS Black Marble / DNB Composite',
        coordinates: [
            [40.05, 35.20],
            [40.40, 35.20],
            [40.45, 35.50],
            [40.10, 35.50],
            [40.05, 35.20]
        ],
        center: [40.25, 35.35]
    },
    {
        id: 'blackout-kharkiv-front',
        name: 'Kharkiv Energy Belt — Thermal Generation Losses',
        theater: 'global',
        country: 'Ukraine',
        lossPercent: 78,
        baselineRadiance: '22.4 nW/cm²/sr',
        currentRadiance: '4.9 nW/cm²/sr',
        status: 'Emergency Grid Shutdown',
        cause: 'Missile strikes on CHP-5 thermal plant and 330kV Zaliutino autotransformers',
        civilianImpact: 'Subway rail suspended; rolling blackout schedules; industrial manufacturing halts',
        sensor: 'NASA VIIRS Black Marble / DNB Composite',
        coordinates: [
            [36.10, 49.85],
            [36.50, 49.85],
            [36.50, 50.15],
            [36.10, 50.15],
            [36.10, 49.85]
        ],
        center: [36.30, 50.00]
    },
    {
        id: 'blackout-red-sea-dark',
        name: 'Southern Red Sea & Bab-el-Mandeb — AIS Dark Zone',
        theater: 'middleeast',
        country: 'International Waters',
        lossPercent: 88,
        baselineRadiance: 'Shipborne / AIS',
        currentRadiance: 'Ghost Corridor',
        status: 'Maritime Radar & Transponder Blackout',
        cause: 'Commercial cargo & crude tankers shutting down AIS transponders to avoid Houthi UAV/missile targeting',
        civilianImpact: 'Collision risks elevated; maritime tracking blindspots; insurance premiums up 400%',
        sensor: 'Satellite AIS / Spire / VesselFinder telemetry',
        coordinates: [
            [42.70, 12.50],
            [43.45, 12.60],
            [43.20, 13.90],
            [42.40, 13.70],
            [42.70, 12.50]
        ],
        center: [42.95, 13.15]
    }
];

export const getConflictBlackoutsGeoJson = (theater = 'all') => {
    const isMe = ['middleeast', 'litani', 'gaza', 'redsea', 'hormuz'].includes(theater);
    const filtered = (theater === 'all' || theater === 'global')
        ? CONFLICT_BLACKOUT_ZONES
        : CONFLICT_BLACKOUT_ZONES.filter(z => isMe ? z.theater === 'middleeast' : (z.theater === theater || z.theater === 'all'));

    const features = [];

    filtered.forEach((zone) => {
        // 1. Polygon boundary of the blackout zone
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [zone.coordinates]
            },
            properties: {
                id: zone.id,
                kind: 'blackout-polygon',
                name: zone.name,
                country: zone.country,
                lossPercent: zone.lossPercent,
                baselineRadiance: zone.baselineRadiance,
                currentRadiance: zone.currentRadiance,
                status: zone.status,
                cause: zone.cause,
                civilianImpact: zone.civilianImpact,
                sensor: zone.sensor
            }
        });

        // 2. Centroid point for badge / label
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: zone.center
            },
            properties: {
                id: `${zone.id}-center`,
                kind: 'blackout-center',
                name: zone.name,
                lossBadge: `-${zone.lossPercent}%`,
                lossPercent: zone.lossPercent,
                status: zone.status,
                cause: zone.cause,
                civilianImpact: zone.civilianImpact,
                baselineRadiance: zone.baselineRadiance,
                currentRadiance: zone.currentRadiance,
                sensor: zone.sensor
            }
        });
    });

    return {
        type: 'FeatureCollection',
        features
    };
};
