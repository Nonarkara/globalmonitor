import { fetchBackendJson } from './backendClient.js';

const CLIENT_CACHE_PREFIX = 'tech-monitor:last-good-military-flights';
const KNOWN_THEATERS = new Set(['global', 'worldwide', 'middleeast', 'indopacific', 'eastasia', 'southasia', 'thailand']);

const hasFeatures = (payload) => (
    payload?.type === 'FeatureCollection'
    && Array.isArray(payload.features)
    && payload.features.length > 0
);

const normalizeTheater = (theater = 'global') => (
    KNOWN_THEATERS.has(theater) ? theater : 'global'
);

/**
 * Curated fallback military aircraft stationed across major theaters
 * Used when live adsb.lol feed is throttled or offline.
 */
export const FALLBACK_MILITARY_FLIGHTS = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [52.12, 26.85] }, // Persian Gulf
            properties: {
                id: 'mil-e3-sentry',
                callsign: 'SENTR01',
                type: 'E-3 Sentry (AWACS)',
                role: 'Airborne Early Warning & Control',
                altitude: 31000,
                speedKts: 420,
                heading: 135,
                operator: 'USAF / Coalition',
                squawk: '7700',
                theater: 'middleeast',
                color: '#f59e0b'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [56.40, 24.10] }, // Gulf of Oman / Hormuz
            properties: {
                id: 'mil-kc135-hormuz',
                callsign: 'SHELL44',
                type: 'KC-135 Stratotanker',
                role: 'Aerial Refueling',
                altitude: 26000,
                speedKts: 450,
                heading: 320,
                operator: 'USAF',
                squawk: '1200',
                theater: 'middleeast',
                color: '#f59e0b'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [43.10, 13.20] }, // Red Sea / Bab el-Mandeb
            properties: {
                id: 'mil-mq9-reaper',
                callsign: 'REAP21',
                type: 'MQ-9 Reaper UAV',
                role: 'Maritime Surveillance & ISR',
                altitude: 22000,
                speedKts: 190,
                heading: 180,
                operator: 'Naval Coalition',
                squawk: '0024',
                theater: 'middleeast',
                color: '#f59e0b'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [98.20, 16.90] }, // Thailand-Myanmar Border (Tak)
            properties: {
                id: 'mil-rtaf-gripen',
                callsign: 'SHARK11',
                type: 'JAS-39 Gripen / Patrol',
                role: 'Border Airspace Sovereignty',
                altitude: 18000,
                speedKts: 510,
                heading: 340,
                operator: 'Royal Thai Air Force',
                squawk: '5201',
                theater: 'thailand',
                color: '#f59e0b'
            }
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [119.50, 15.20] }, // South China Sea / Scarborough
            properties: {
                id: 'mil-p8-poseidon',
                callsign: 'TRIDENT8',
                type: 'P-8A Poseidon',
                role: 'Maritime Patrol & ASW',
                altitude: 24000,
                speedKts: 410,
                heading: 260,
                operator: 'US Navy / Indo-Pacific',
                squawk: '4321',
                theater: 'indopacific',
                color: '#f59e0b'
            }
        }
    ]
};

export const filterMilitaryFlightsPayload = (payload, theater = 'global') => {
    const resolvedTheater = normalizeTheater(theater);
    const features = Array.isArray(payload?.features) ? payload.features : [];
    const filtered = features.filter((feature) => {
        const props = feature?.properties || {};
        if (!(props.military || props.spi || props.category === 15 || props.role)) return false;
        if (resolvedTheater === 'global' || resolvedTheater === 'worldwide') return true;
        return props.theater === resolvedTheater;
    });

    return {
        type: 'FeatureCollection',
        features: filtered,
        meta: {
            ...(payload?.meta || {}),
            theater: resolvedTheater,
            count: filtered.length
        }
    };
};

export const fetchMilitaryFlights = async (theater = 'global') => {
    const resolvedTheater = normalizeTheater(theater);
    try {
        const payload = filterMilitaryFlightsPayload(
            await fetchBackendJson('/api/military-flights', { theater: resolvedTheater }),
            resolvedTheater
        );
        if (hasFeatures(payload)) {
            return payload;
        }
        return filterMilitaryFlightsPayload(FALLBACK_MILITARY_FLIGHTS, resolvedTheater);
    } catch {
        return filterMilitaryFlightsPayload(FALLBACK_MILITARY_FLIGHTS, resolvedTheater);
    }
};
