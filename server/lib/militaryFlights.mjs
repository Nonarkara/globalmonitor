/**
 * Military Flights Ingestion — adsb.lol / airplanes.live military endpoints.
 * Ingests live ADS-B military and government transponders with theater bounding and categorization.
 */

const MIL_ENDPOINTS = [
    'https://api.adsb.lol/v2/mil',
    'https://api.airplanes.live/v2/mil'
];

export const MIL_CACHE_TTL_MS = 30 * 1000; // 30s cache

const THEATER_BOUNDS = {
    global: { lamin: -90, lomin: -180, lamax: 90, lomax: 180 },
    worldwide: { lamin: -90, lomin: -180, lamax: 90, lomax: 180 },
    middleeast: { lamin: 10, lomin: 24, lamax: 42, lomax: 65 },
    indopacific: { lamin: -10, lomin: 90, lamax: 25, lomax: 135 },
    eastasia: { lamin: 18, lomin: 100, lamax: 47, lomax: 148 },
    southasia: { lamin: 5, lomin: 60, lamax: 37, lomax: 92 },
    thailand: { lamin: 5, lomin: 97, lamax: 21, lomax: 106 }
};

const inBounds = (lat, lon, bounds) =>
    lat >= bounds.lamin && lat <= bounds.lamax && lon >= bounds.lomin && lon <= bounds.lomax;

const classifyRole = (type = '', desc = '', callsign = '') => {
    const t = (type || '').toUpperCase();
    const d = (desc || '').toUpperCase();
    const c = (callsign || '').toUpperCase();

    if (t.includes('E3') || t.includes('E2') || t.includes('A50') || t.includes('KJ') || d.includes('AWACS') || d.includes('AEW')) {
        return { role: 'Airborne Early Warning & Control (AWACS)', color: '#f59e0b' };
    }
    if (t.includes('K35') || t.includes('KC') || t.includes('MRTT') || t.includes('IL78') || c.startsWith('SHELL') || c.startsWith('MOB') || c.startsWith('PETRO')) {
        return { role: 'Aerial Refueling Tanker', color: '#f97316' };
    }
    if (t.includes('P8') || t.includes('P3') || t.includes('MQ9') || t.includes('RQ4') || t.includes('U2') || t.includes('RC135') || d.includes('RECON') || d.includes('PATROL')) {
        return { role: 'Maritime Surveillance & ISR / Recon', color: '#06b6d4' };
    }
    if (t.includes('C17') || t.includes('C130') || t.includes('C30J') || t.includes('A400') || t.includes('IL76') || t.includes('C5') || t.includes('V22')) {
        return { role: 'Strategic Transport & Logistics', color: '#3b82f6' };
    }
    if (t.includes('F15') || t.includes('F16') || t.includes('F18') || t.includes('F22') || t.includes('F35') || t.includes('JAS39') || t.includes('TYPH') || t.includes('SU') || t.includes('MIG')) {
        return { role: 'Combat & Air Defense Patrol', color: '#ef4444' };
    }
    return { role: 'Military / Government Mission', color: '#f59e0b' };
};

const identifyOperator = (ac) => {
    const callsign = (ac.flight || '').trim().toUpperCase();
    const r = (ac.r || '').toUpperCase();

    if (callsign.startsWith('RTAF') || r.startsWith('HS-')) return 'Royal Thai Air Force';
    if (callsign.startsWith('RSAF')) return 'Royal Saudi Air Force';
    if (callsign.startsWith('IAF') || callsign.startsWith('IF')) return 'Israeli Air Force';
    if (callsign.startsWith('RRR') || callsign.startsWith('ASCOT')) return 'Royal Air Force (UK)';
    if (callsign.startsWith('RCH') || callsign.startsWith('REACH')) return 'US Air Mobility Command';
    if (callsign.startsWith('FORTE') || callsign.startsWith('JAKE')) return 'USAF Reconnaissance';
    if (callsign.startsWith('NATO')) return 'NATO Airborne Operations';
    if (ac.ownOp) return ac.ownOp;
    return 'Military / Coalition';
};

export const fetchLiveMilitaryFlights = async (theater = 'global') => {
    const bounds = THEATER_BOUNDS[theater] || THEATER_BOUNDS.global;
    let rawAircraft = null;
    let sourceHost = 'adsb.lol';

    for (const endpoint of MIL_ENDPOINTS) {
        try {
            const res = await fetch(endpoint, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'GlobeWatch-Intelligence/8.5' },
                signal: AbortSignal.timeout(7000)
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.ac) && data.ac.length > 0) {
                    rawAircraft = data.ac;
                    sourceHost = new URL(endpoint).host;
                    break;
                }
            }
        } catch {
            // try next endpoint
        }
    }

    if (!rawAircraft || rawAircraft.length === 0) {
        return null;
    }

    const features = [];
    for (const ac of rawAircraft) {
        if (!ac.lon || !ac.lat) continue;
        if (!inBounds(ac.lat, ac.lon, bounds)) continue;

        let alt = ac.alt_geom ?? ac.alt_baro;
        if (alt === 'ground') alt = 0;
        const altitudeFt = Number(alt) || 0;
        const { role, color } = classifyRole(ac.t, ac.desc, ac.flight);
        const operator = identifyOperator(ac);

        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [ac.lon, ac.lat]
            },
            properties: {
                id: ac.hex || `mil-${Math.random().toString(36).slice(2, 8)}`,
                hex: ac.hex || '',
                callsign: (ac.flight || '').trim() || ac.r || ac.hex || 'MIL',
                registration: ac.r || '',
                theater,
                military: true,
                type: ac.t || ac.desc || 'Military Airframe',
                role,
                color,
                operator,
                altitude: altitudeFt,
                speedKts: Math.round(ac.gs || 0),
                heading: Math.round(ac.track ?? ac.true_heading ?? 0),
                squawk: ac.squawk || 'MIL',
                onGround: altitudeFt < 100,
                seen: ac.seen || 0
            }
        });
    }

    return {
        type: 'FeatureCollection',
        features,
        meta: {
            source: sourceHost,
            theater,
            totalMilitaryWorldwide: rawAircraft.length,
            count: features.length,
            fetchedAt: new Date().toISOString()
        }
    };
};
