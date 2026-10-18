/**
 * Infrastructure Status Tracker — curated registry of key energy/transport
 * infrastructure with FIRMS-based damage detection.
 */

/**
 * War-time infrastructure registry — updated March 29, 2026 (Day 29 of Iran conflict)
 * warStatus: override status based on confirmed damage/closures
 *   'damaged' = confirmed strike damage, 'closed' = not operational,
 *   'intermittent' = periodic closures, 'at_risk' = nearby strikes/threats
 */
// Date the war-time statuses below were last hand-checked.
export const INFRA_REGISTRY_AS_OF = '2026-03-29';

const INFRASTRUCTURE_POINTS = [
    { name: 'Ras Laffan LNG', type: 'lng_terminal', coords: [51.53, 25.9], capacity: '77 MTPA', warStatus: 'damaged', warNote: 'Iranian missile damage; force majeure on all LNG exports since Mar 4' },
    { name: 'Kharg Island Terminal', type: 'oil_terminal', coords: [50.33, 29.24], capacity: '5 mbpd', warStatus: 'at_risk', warNote: 'Military sites hit; oil infra spared — Trump threatened future strikes' },
    { name: 'Abqaiq Processing', type: 'refinery', coords: [49.68, 25.94], capacity: '7 mbpd' },
    { name: 'Strait of Hormuz W', type: 'chokepoint', coords: [56.25, 26.5], warStatus: 'closed', warNote: 'IRGC toll system; only 21 tankers since Feb 28 (vs 100+/day normal)' },
    { name: 'Strait of Hormuz E', type: 'chokepoint', coords: [56.45, 26.2], warStatus: 'closed', warNote: 'IRGC enforcing $2M toll per vessel; 150+ tankers anchored outside' },
    { name: 'Bab el-Mandeb', type: 'chokepoint', coords: [43.33, 12.58], warStatus: 'at_risk', warNote: 'Houthi entry into war Mar 28 — renewed shipping attack threat' },
    { name: 'Suez Canal', type: 'chokepoint', coords: [32.34, 30.46] },
    { name: 'Yanbu Terminal', type: 'oil_terminal', coords: [38.06, 24.09], warStatus: 'intermittent', warNote: 'Brief halt from Saudi drone intercepts; resumed operations' },
    { name: 'Fujairah Hub', type: 'oil_terminal', coords: [56.36, 25.12], warStatus: 'intermittent', warNote: 'Periodically closed by strikes; key alternative to Hormuz route' },
    { name: 'Bandar Abbas Port', type: 'port', coords: [56.27, 27.18], warStatus: 'at_risk', warNote: 'IRGC naval base; Hormuz enforcement operations' },
    { name: 'Jask Terminal', type: 'oil_terminal', coords: [57.77, 25.64] },
    { name: 'Aden Port', type: 'port', coords: [45.03, 12.79], warStatus: 'at_risk', warNote: 'Houthi missile range; renewed threat after Mar 28' },
    { name: 'Dammam Port', type: 'port', coords: [50.21, 26.43] },
    { name: 'Basra Oil Terminal', type: 'oil_terminal', coords: [48.72, 29.75], warStatus: 'at_risk', warNote: 'Iraq declared force majeure on foreign-operated oilfields' },
    { name: 'Haifa Port', type: 'port', coords: [35.00, 32.82] },
    { name: 'Ashkelon Pipeline', type: 'pipeline', coords: [34.56, 31.66] },
    { name: 'Isfahan Nuclear', type: 'nuclear', coords: [51.68, 32.65], warStatus: 'damaged', warNote: 'Israeli strikes on military/industrial infrastructure' },
    { name: 'Natanz Enrichment', type: 'nuclear', coords: [51.73, 33.72], warStatus: 'damaged', warNote: 'Entrance buildings destroyed; underground FEP inaccessible (IAEA confirmed)' },
    { name: 'Bushehr Reactor', type: 'nuclear', coords: [50.89, 28.83], warStatus: 'at_risk', warNote: 'Strikes near reactor; Chamran Missile Base in Jam hit Mar 24' },
    { name: 'Dimona Facility', type: 'nuclear', coords: [35.15, 31.00] },
    // New war-relevant sites
    { name: 'South Pars / Asaluyeh', type: 'gas_complex', coords: [52.6, 27.5], capacity: 'shared with Qatar', warStatus: 'damaged', warNote: '4 gas treatment plants damaged by Israeli drone strikes Mar 18' },
    { name: 'Ruwais Refinery (UAE)', type: 'refinery', coords: [52.73, 24.11], warStatus: 'closed', warNote: 'Shut down after drone strike fire' },
    { name: 'Jebel Ali Port (UAE)', type: 'port', coords: [55.03, 25.0], warStatus: 'closed', warNote: 'Operations suspended amid conflict' },
    { name: 'Mina Abdullah (Kuwait)', type: 'refinery', coords: [48.15, 29.05], warStatus: 'damaged', warNote: 'Hit Mar 19; Kuwait oil output cut by half' },
    { name: 'Lanaz Refinery (Erbil)', type: 'refinery', coords: [44.01, 36.19], warStatus: 'closed', warNote: 'Operations suspended after drone strike' },
    { name: 'Duqm Port (Oman)', type: 'port', coords: [57.7, 19.67], warStatus: 'damaged', warNote: 'Fuel storage damaged by drone strikes' }
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
        let status = infra.warStatus || 'operational';
        let nearbyFires = 0;

        // FIRMS proximity can still upgrade status
        for (const fire of firePoints) {
            const [fLon, fLat] = fire.geometry.coordinates;
            const dist = haversineDistance(infra.coords[0], infra.coords[1], fLon, fLat);
            if (dist <= PROXIMITY_KM) {
                nearbyFires++;
                if ((fire.properties?.confidence === 'high' || fire.properties?.confidence === 'h') && status === 'operational') {
                    status = 'alert';
                } else if (status === 'operational') {
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
                warNote: infra.warNote || null,
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
            alert: features.filter(f => f.properties.status === 'alert').length,
            damaged: features.filter(f => f.properties.status === 'damaged').length,
            closed: features.filter(f => f.properties.status === 'closed').length,
            intermittent: features.filter(f => f.properties.status === 'intermittent').length,
            at_risk: features.filter(f => f.properties.status === 'at_risk').length
        },
        // Statuses/notes are hand-curated (see header) — the payload says so
        // and carries the registry date, not the request time.
        source: 'curated_registry',
        asOf: INFRA_REGISTRY_AS_OF,
        updatedAt: `${INFRA_REGISTRY_AS_OF}T00:00:00.000Z`,
        computedAt: new Date().toISOString()
    };
};
