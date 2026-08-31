/**
 * Strategic Water Infrastructure & Major Dams Registry
 * Vector dataset of critical hydroelectric & water security dams
 * Focus: Mekong River Basin, Middle East (Euphrates/Tigris), Nile Basin, and East Asia.
 */

export const STRATEGIC_DAMS_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        // ── MEKONG RIVER BASIN (SE Asia Water Security & Geopolitics) ──
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [101.815, 19.414] },
            properties: {
                id: 'dam-xayaburi',
                name: 'Xayaburi Dam',
                river: 'Mekong (Lower Basin)',
                country: 'Laos (Supplies Thailand)',
                capacityMw: 1285,
                reservoirMcm: 1300,
                geopoliticalImpact: 'Lower Mekong mainstream flow controller, impacting Thai fishing and Isaan agriculture.',
                color: '#38bdf8',
                status: 'OPERATIONAL'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [100.803, 21.842] },
            properties: {
                id: 'dam-jinghong',
                name: 'Jinghong Dam',
                river: 'Lancang (Upper Mekong)',
                country: 'China (Yunnan)',
                capacityMw: 1750,
                reservoirMcm: 1140,
                geopoliticalImpact: 'Controls water releases from China into Myanmar, Laos, and Northern Thailand (Chiang Saen).',
                color: '#38bdf8',
                status: 'OPERATIONAL'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [100.418, 22.645] },
            properties: {
                id: 'dam-nuozhadu',
                name: 'Nuozhadu Dam',
                river: 'Lancang (Upper Mekong)',
                country: 'China (Yunnan)',
                capacityMw: 5850,
                reservoirMcm: 21749,
                geopoliticalImpact: 'Largest dam on the Mekong/Lancang river cascade; major seasonal water retention capacity.',
                color: '#38bdf8',
                status: 'OPERATIONAL'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [105.952, 13.948] },
            properties: {
                id: 'dam-don-sahong',
                name: 'Don Sahong Dam',
                river: 'Mekong River',
                country: 'Laos (Champasak)',
                capacityMw: 260,
                reservoirMcm: 25,
                geopoliticalImpact: 'Located at Khone Phapheng Falls near Cambodia border; impacts fish migration.',
                color: '#38bdf8',
                status: 'OPERATIONAL'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [99.041, 17.243] },
            properties: {
                id: 'dam-bhumibol',
                name: 'Bhumibol Dam',
                river: 'Ping River (Chao Phraya Basin)',
                country: 'Thailand (Tak)',
                capacityMw: 779,
                reservoirMcm: 13462,
                geopoliticalImpact: 'Thailand\'s largest concrete arch dam, regulating Central Plains irrigation and Bangkok flood control.',
                color: '#22c55e',
                status: 'OPERATIONAL'
            }
        },

        // ── MIDDLE EAST (Tigris & Euphrates Hydropolitics) ──
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [38.517, 37.467] },
            properties: {
                id: 'dam-ataturk',
                name: 'Atatürk Dam',
                river: 'Euphrates River',
                country: 'Turkey (GAP Project)',
                capacityMw: 2400,
                reservoirMcm: 48700,
                geopoliticalImpact: 'Controls 90% of Euphrates water flowing into downstream Syria and Iraq; central to regional water leverage.',
                color: '#06b6d4',
                status: 'OPERATIONAL'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [38.583, 35.883] },
            properties: {
                id: 'dam-tabqa',
                name: 'Tabqa Dam (Lake Assad)',
                river: 'Euphrates River',
                country: 'Syria (Raqqa)',
                capacityMw: 824,
                reservoirMcm: 11700,
                geopoliticalImpact: 'Strategic target during Syrian civil conflict; regulates power and drinking water for Aleppo.',
                color: '#f59e0b',
                status: 'MONITORED'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [42.822, 36.631] },
            properties: {
                id: 'dam-mosul',
                name: 'Mosul Dam',
                river: 'Tigris River',
                country: 'Iraq (Nineveh)',
                capacityMw: 1052,
                reservoirMcm: 11100,
                geopoliticalImpact: 'Built on soluble gypsum karst; critical structural monitoring to prevent catastrophic downstream flooding of Baghdad.',
                color: '#ef4444',
                status: 'HIGH ALERT'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [41.854, 37.533] },
            properties: {
                id: 'dam-ilisu',
                name: 'Ilisu Dam',
                river: 'Tigris River',
                country: 'Turkey (Batman)',
                capacityMw: 1200,
                reservoirMcm: 10400,
                geopoliticalImpact: 'Reduces Tigris flow to Iraqi marshlands (Mesopotamia) by ~50%; major Baghdad-Ankara diplomatic dispute.',
                color: '#06b6d4',
                status: 'OPERATIONAL'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [48.462, 32.404] },
            properties: {
                id: 'dam-dez',
                name: 'Dez Dam',
                river: 'Dez / Karun River',
                country: 'Iran (Khuzestan)',
                capacityMw: 520,
                reservoirMcm: 3340,
                geopoliticalImpact: 'Key power and irrigation source for oil-rich Khuzestan province; sensitive to regional drought unrest.',
                color: '#06b6d4',
                status: 'OPERATIONAL'
            }
        },

        // ── NILE RIVER BASIN ──
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [35.092, 11.214] },
            properties: {
                id: 'dam-gerd',
                name: 'Grand Ethiopian Renaissance Dam (GERD)',
                river: 'Blue Nile River',
                country: 'Ethiopia (Benishangul-Gumuz)',
                capacityMw: 5150,
                reservoirMcm: 74000,
                geopoliticalImpact: 'Major geopolitical flashpoint between Ethiopia, Egypt, and Sudan regarding Nile water quotas.',
                color: '#ef4444',
                status: 'OPERATIONAL / DISPUTED'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [32.879, 23.970] },
            properties: {
                id: 'dam-aswan',
                name: 'Aswan High Dam',
                river: 'Nile River',
                country: 'Egypt (Aswan)',
                capacityMw: 2100,
                reservoirMcm: 162000,
                geopoliticalImpact: 'Secures Egypt\'s entire agricultural and municipal water supply from Lake Nasser.',
                color: '#22c55e',
                status: 'OPERATIONAL'
            }
        }
    ]
};
