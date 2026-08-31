/**
 * Global Submarine Telecommunication Cables Registry
 * Vector dataset of critical undersea fiber optic backbones
 * High detail for Red Sea/Bab el-Mandeb, Strait of Malacca, Gulf of Thailand, and Taiwan Strait.
 */

export const SUBMARINE_CABLES_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        // ── RED SEA & BAB EL-MANDEB BACKBONES (Critical conflict choke point) ──
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [32.55, 29.97], [33.80, 27.80], [35.20, 24.50], [38.50, 20.00],
                    [41.50, 16.00], [43.40, 12.60], [45.00, 11.80], [51.00, 12.00],
                    [58.00, 16.50], [68.00, 18.00], [72.80, 18.90] // Egypt -> Red Sea -> Yemen/Djibouti -> Mumbai
                ]
            },
            properties: {
                id: 'cable-sea-me-we-5',
                name: 'SEA-ME-WE 5',
                lengthKm: 20000,
                capacityTbps: 24,
                landingPoints: 'Suez (EG), Djibouti (DJ), Yanbu (SA), Zafarana (EG), Mumbai (IN), Singapore (SG)',
                chokepointRisk: 'CRITICAL (Bab el-Mandeb / Houthi zone)',
                color: '#06b6d4',
                status: 'ACTIVE'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [32.30, 31.25], [32.55, 29.97], [34.50, 26.50], [37.80, 21.00],
                    [42.00, 15.20], [43.30, 12.50], [48.00, 11.50], [55.00, 14.00],
                    [65.00, 17.00], [80.20, 13.00], [98.00, 5.00], [103.80, 1.30] // Europe to Singapore via Red Sea
                ]
            },
            properties: {
                id: 'cable-aae-1',
                name: 'Asia-Africa-Europe 1 (AAE-1)',
                lengthKm: 25000,
                capacityTbps: 40,
                landingPoints: 'Marseille (FR), Alexandria (EG), Djibouti (DJ), Karachi (PK), Mumbai (IN), Satun (TH), Singapore (SG)',
                chokepointRisk: 'CRITICAL (Red Sea)',
                color: '#06b6d4',
                status: 'ACTIVE'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [32.55, 29.97], [35.00, 25.00], [39.00, 19.50], [43.20, 12.80],
                    [46.00, 11.70], [56.00, 22.00], [59.00, 24.50], [67.00, 24.80] // Red Sea to Oman / Karachi
                ]
            },
            properties: {
                id: 'cable-peace',
                name: 'PEACE Cable',
                lengthKm: 15000,
                capacityTbps: 96,
                landingPoints: 'Zafarana (EG), Port Sudan (SD), Djibouti (DJ), Gwadar (PK), Karachi (PK), Marseille (FR)',
                chokepointRisk: 'HIGH (Red Sea / Gulf of Aden)',
                color: '#22d3ee',
                status: 'ACTIVE'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [32.55, 29.97], [34.20, 27.20], [38.20, 21.50], [42.80, 13.50],
                    [43.50, 12.30], [50.00, 12.20], [56.30, 26.20], [50.50, 26.20] // Hormuz / Gulf Branch
                ]
            },
            properties: {
                id: 'cable-fal',
                name: 'FALCON (GCX)',
                lengthKm: 10300,
                capacityTbps: 2.56,
                landingPoints: 'Suez (EG), Jeddah (SA), Hodeidah (YE), Muscat (OM), Dubai (AE), Manama (BH), Doha (QA), Kuwait City (KW)',
                chokepointRisk: 'CRITICAL (Strait of Hormuz & Red Sea)',
                color: '#38bdf8',
                status: 'ACTIVE'
            }
        },

        // ── STRAIT OF MALACCA & THAILAND / SOUTHEAST ASIA SPINES ──
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [80.20, 13.00], [92.00, 8.00], [98.50, 6.50], [100.08, 6.84], // Satun, Thailand landing
                    [100.50, 5.40], [101.40, 2.80], [103.80, 1.30] // Singapore
                ]
            },
            properties: {
                id: 'cable-tgn-ia',
                name: 'TGN-Intra Asia',
                lengthKm: 6700,
                capacityTbps: 3.84,
                landingPoints: 'Satun (TH), Singapore (SG), Vung Tau (VN), Hong Kong (HK), Tokyo (JP)',
                chokepointRisk: 'ELEVATED (Malacca Chokepoint)',
                color: '#38bdf8',
                status: 'ACTIVE'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [100.50, 7.15], [101.20, 8.00], [102.50, 9.50], [104.50, 10.20],
                    [106.80, 10.10], [109.00, 12.00], [114.20, 22.20] // Songkhla (TH) -> Gulf of Thailand -> Vietnam -> Hong Kong
                ]
            },
            properties: {
                id: 'cable-apg',
                name: 'Asia Pacific Gateway (APG)',
                lengthKm: 10400,
                capacityTbps: 54.8,
                landingPoints: 'Songkhla (TH), Da Nang (VN), Kuantan (MY), Tanah Merah (SG), Hong Kong (HK), Toucheng (TW), Shima (JP)',
                chokepointRisk: 'ELEVATED (South China Sea / Gulf of Thailand)',
                color: '#06b6d4',
                status: 'ACTIVE'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [100.80, 12.90], [101.50, 11.50], [103.00, 9.00], [104.00, 5.00],
                    [103.80, 1.30], [106.80, -6.10] // Rayong / Chonburi -> Singapore -> Jakarta
                ]
            },
            properties: {
                id: 'cable-sjc2',
                name: 'Southeast Asia-Japan Cable 2 (SJC2)',
                lengthKm: 10500,
                capacityTbps: 126,
                landingPoints: 'Rayong (TH), Tuas (SG), Batam (ID), Vung Tau (VN), Hong Kong (HK), Tamsui (TW), Chikura (JP)',
                chokepointRisk: 'MONITORED (Gulf of Thailand & Malacca)',
                color: '#22d3ee',
                status: 'ACTIVE'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [103.80, 1.30], [108.00, 3.00], [115.00, 5.00], [119.50, 12.00],
                    [121.00, 14.50], [121.50, 22.00], [121.80, 25.00] // Singapore -> Philippines -> Taiwan Strait
                ]
            },
            properties: {
                id: 'cable-sea-us',
                name: 'SEA-US Cable System',
                lengthKm: 14500,
                capacityTbps: 20,
                landingPoints: 'Singapore (SG), Davao (PH), Piti (GU), Honolulu (US), Los Angeles (US)',
                chokepointRisk: 'MONITORED (Luzon Strait bypass)',
                color: '#38bdf8',
                status: 'ACTIVE'
            }
        },

        // ── TAIWAN STRAIT & EAST ASIA BACKBONES (Geopolitical Tension Zone) ──
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [114.20, 22.25], [117.50, 22.80], [120.00, 23.50], [121.50, 25.10],
                    [126.00, 27.50], [129.00, 31.00], [139.70, 35.60] // Hong Kong -> Taiwan Strait -> Japan
                ]
            },
            properties: {
                id: 'cable-tpe',
                name: 'Trans-Pacific Express (TPE)',
                lengthKm: 17700,
                capacityTbps: 5.12,
                landingPoints: 'Shanghai (CN), Qingdao (CN), Toucheng (TW), Geoje (KR), Maruyama (JP), Nedonna Beach (US)',
                chokepointRisk: 'CRITICAL (Taiwan Strait Demarcation)',
                color: '#06b6d4',
                status: 'ACTIVE'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [121.50, 25.10], [124.00, 25.50], [127.00, 26.20], [130.50, 30.00],
                    [139.50, 35.00], [170.00, 42.00], [-130.00, 46.00], [-124.00, 45.60] // Taiwan to Oregon USA
                ]
            },
            properties: {
                id: 'cable-ncp',
                name: 'New Cross Pacific (NCP)',
                lengthKm: 13600,
                capacityTbps: 80,
                landingPoints: 'Toucheng (TW), Chongming (CN), Nanhui (CN), Pusan (KR), Maruyama (JP), Hillsboro (US)',
                chokepointRisk: 'HIGH (East China Sea)',
                color: '#22d3ee',
                status: 'ACTIVE'
            }
        }
    ]
};
