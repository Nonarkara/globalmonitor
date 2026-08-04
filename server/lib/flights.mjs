/**
 * Unified flight payload — OpenSky primary, quota-safe AirLabs supplement, legacy fallbacks.
 */
import { fetchAirplanesLivePayload } from './airplanesLive.mjs';
import { fetchAirLabsFlightsPayload, isAirLabsConfigured } from './airLabs.mjs';
import { fetchAviationEdgePayload } from './aviationEdge.mjs';
import { fetchAviationStackPayload, isAviationStackConfigured } from './aviationStack.mjs';
import { fetchOpenSkyPayload } from './opensky.mjs';

const normalizeHex = (hex) => (hex || '').toLowerCase().replace(/^0x/, '');

const mergeFlightPayloads = (primary, supplement) => {
    const byHex = new Map();

    for (const feature of primary.features) {
        const hex = normalizeHex(feature.properties?.hex);
        if (hex) byHex.set(hex, feature);
    }

    let enriched = 0;
    let added = 0;

    for (const feature of supplement.features) {
        const hex = normalizeHex(feature.properties?.hex);
        if (!hex) continue;

        const existing = byHex.get(hex);
        if (existing) {
            const props = existing.properties;
            const extra = feature.properties;
            if (!props.origin && extra.origin) props.origin = extra.origin;
            if (!props.destination && extra.destination) props.destination = extra.destination;
            if ((!props.type || props.type === 'Unknown') && extra.type) props.type = extra.type;
            if (extra.category != null) props.openskyCategory = extra.category;
            if (extra.spi) props.spi = extra.spi;
            if (!props.military && extra.military) props.military = extra.military;
            if (!props.callsign && extra.callsign) props.callsign = extra.callsign;
            enriched += 1;
        } else {
            byHex.set(hex, feature);
            added += 1;
        }
    }

    const features = [...byHex.values()];
    const primarySource = primary.meta?.source || 'airplanes.live';
    const supplementSource = supplement.meta?.source || 'supplement';

    return {
        type: 'FeatureCollection',
        features,
        meta: {
            ...primary.meta,
            count: features.length,
            fetchedAt: new Date().toISOString(),
            source: `${primarySource}+${supplementSource}`,
            supplementEnriched: (primary.meta?.supplementEnriched || 0) + enriched,
            supplementAdded: (primary.meta?.supplementAdded || 0) + added,
            supplements: [
                ...(Array.isArray(primary.meta?.supplements) ? primary.meta.supplements : []),
                {
                    source: supplementSource,
                    count: supplement.features.length,
                    added,
                    enriched,
                    cache: supplement.meta?.cache || null,
                    fetchedAt: supplement.meta?.fetchedAt || null,
                    error: supplement.meta?.error || null,
                    nextRefreshAt: supplement.meta?.nextRefreshAt || null
                }
            ]
        }
    };
};

export const fetchFlightsPayload = async (theater = 'global') => {
    const [openSky, airLabs] = await Promise.all([
        fetchOpenSkyPayload(theater),
        isAirLabsConfigured()
            ? fetchAirLabsFlightsPayload(theater)
            : Promise.resolve(null),
    ]);

    let payload = openSky.features?.length > 0
        ? openSky
        : {
            type: 'FeatureCollection',
            features: [],
            meta: {
                theater,
                count: 0,
                fetchedAt: new Date().toISOString(),
                source: 'opensky',
                error: openSky.meta?.error || 'OpenSky returned no aircraft',
            },
        };

    if (airLabs?.features?.length > 0) {
        if (payload.features?.length > 0) {
            payload = mergeFlightPayloads(payload, airLabs);
        } else {
            payload = airLabs;
        }
    } else if (airLabs?.meta) {
        payload = {
            ...payload,
            meta: {
                ...payload.meta,
                supplements: [
                    ...(Array.isArray(payload.meta?.supplements) ? payload.meta.supplements : []),
                    {
                        source: 'airlabs',
                        count: 0,
                        added: 0,
                        enriched: 0,
                        cache: airLabs.meta.cache || null,
                        error: airLabs.meta.error || null,
                        nextRefreshAt: airLabs.meta.nextRefreshAt || null,
                    },
                ],
            },
        };
    }

    if (isAviationStackConfigured()) {
        const aviationStack = await fetchAviationStackPayload(theater);
        if (aviationStack.features?.length > 0) {
            if (payload.features?.length > 0) {
                payload = mergeFlightPayloads(payload, aviationStack);
            } else {
                payload = {
                    ...aviationStack,
                    meta: {
                        ...aviationStack.meta,
                        fallback: 'airplanes.live empty'
                    }
                };
            }
        } else {
            payload = {
                ...payload,
                meta: {
                    ...payload.meta,
                    supplements: [
                        ...(Array.isArray(payload.meta?.supplements) ? payload.meta.supplements : []),
                        {
                            source: 'aviationstack',
                            count: 0,
                            added: 0,
                            enriched: 0,
                            cache: aviationStack.meta?.cache || null,
                            error: aviationStack.meta?.error || null,
                            nextRefreshAt: aviationStack.meta?.nextRefreshAt || null
                        }
                    ]
                }
            };
        }
    }

    if (payload.features?.length > 0) return payload;

    // The global multi-point airplanes.live path is rate-limited from Cloudflare
    // and exceeded the browser's 15s API timeout. Keep it only for bounded theaters.
    if (theater !== 'global' && theater !== 'worldwide') {
        const airplanesLive = await fetchAirplanesLivePayload(theater);
        if (airplanesLive.features?.length > 0) return airplanesLive;
    }

    const apiKey = process.env.AVIATION_EDGE_KEY;
    if (apiKey) {
        const fallback = await fetchAviationEdgePayload(theater, apiKey);
        if (fallback.features?.length > 0) return fallback;
    }

    return payload;
};
