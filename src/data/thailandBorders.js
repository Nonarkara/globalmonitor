/**
 * Thailand 3 Border Conflict Zones Registry
 * Single source of truth for geopolitical conflict monitoring & early warning
 * across Thailand's primary border frontiers.
 */

export const THAILAND_BORDER_ZONES = [
    {
        id: 'border-myanmar',
        name: 'Thailand–Myanmar Border',
        shortName: 'Myanmar Frontier',
        region: 'Tak / Mae Sot & Shan-Kayin Corridor',
        coordinates: { longitude: 98.512, latitude: 16.691, zoom: 8.5, pitch: 30, bearing: -15 },
        color: '#ef4444',
        riskLevel: 'HIGH',
        riskScore: 82,
        primaryThreats: 'EAO clashes, SAC artillery shelling, displacement & cross-border trade disruptions',
        checkpoints: [
            { name: 'Mae Sot–Myawaddy Friendship Bridge 1 & 2', status: 'ALERT', lat: 16.691, lng: 98.512 },
            { name: 'Ranong–Kawthaung Maritime Boundary', status: 'MONITORED', lat: 9.961, lng: 98.635 },
            { name: 'Mae Hong Son / Ban Huai Phu Kheng', status: 'MONITORED', lat: 19.231, lng: 97.901 },
            { name: 'Three Pagodas Pass (Kanchanaburi)', status: 'ALERT', lat: 15.304, lng: 98.386 }
        ],
        summary: 'Heavy clashes between Myanmar SAC junta troops and resistance EAO forces (KNU, PDF). Cross-border artillery fallout risk and refugee movements near Mae Sot.',
        acledFilter: 'Myanmar'
    },
    {
        id: 'border-cambodia',
        name: 'Thailand–Cambodia Border',
        shortName: 'Cambodia Frontier',
        region: 'Preah Vihear / Surin & Sa Kaeo Corridor',
        coordinates: { longitude: 104.681, latitude: 14.389, zoom: 8.5, pitch: 25, bearing: 10 },
        color: '#f59e0b',
        riskLevel: 'ELEVATED',
        riskScore: 58,
        primaryThreats: 'Historic border demarcation disputes, troop posture, cross-border smuggling & trade security',
        checkpoints: [
            { name: 'Preah Vihear Cliff Outpost (Kantharalak)', status: 'MONITORED', lat: 14.393, lng: 104.681 },
            { name: 'Aranyaprathet–Poipet Border Crossing', status: 'NORMAL', lat: 13.667, lng: 102.551 },
            { name: 'Chong An Ma (Ubon Ratchathani)', status: 'MONITORED', lat: 14.412, lng: 105.112 },
            { name: 'Chong Sa-ngam (Sisaket)', status: 'NORMAL', lat: 14.364, lng: 104.072 }
        ],
        summary: 'Key trade corridor (Poipet) and sensitive historical demarcation zones (Preah Vihear sector). Joint border patrol monitoring maintains stability.',
        acledFilter: 'Cambodia'
    },
    {
        id: 'border-malaysia',
        name: 'Thailand–Malaysia Border',
        shortName: 'Deep South Frontier',
        region: 'Pattani, Yala, Narathiwat & Songkhla Corridor',
        coordinates: { longitude: 101.284, latitude: 6.229, zoom: 8.5, pitch: 28, bearing: 0 },
        color: '#f97316',
        riskLevel: 'ELEVATED',
        riskScore: 65,
        primaryThreats: 'Deep South insurgent activity, checkpoint security, maritime boundary & smuggling routes',
        checkpoints: [
            { name: 'Sadao–Bukit Kayu Hitam Crossing', status: 'NORMAL', lat: 6.518, lng: 100.421 },
            { name: 'Su-ngai Kolok–Rantau Panjang Bridge', status: 'ALERT', lat: 6.031, lng: 101.968 },
            { name: 'Betong–Pengkalan Hulu Gate', status: 'MONITORED', lat: 5.772, lng: 101.071 },
            { name: 'Tak Bai Maritime Border Outpost', status: 'MONITORED', lat: 6.257, lng: 102.052 }
        ],
        summary: 'Deep South security corridor monitoring insurgent cell movements, dual-citizenship border traffic, and maritime smuggling in the Gulf of Thailand.',
        acledFilter: 'Malaysia'
    }
];

export const THAILAND_BORDER_GEOJSON = {
    type: 'FeatureCollection',
    features: THAILAND_BORDER_ZONES.map(z => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [z.coordinates.longitude, z.coordinates.latitude] },
        properties: {
            id: z.id,
            kind: 'thailand-border-zone',
            name: z.name,
            shortName: z.shortName,
            region: z.region,
            color: z.color,
            riskLevel: z.riskLevel,
            riskScore: z.riskScore,
            summary: z.summary,
            checkpointsCount: z.checkpoints.length
        }
    }))
};
