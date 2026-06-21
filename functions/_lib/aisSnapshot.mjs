import { mapShipTypeCategory } from '../../server/lib/shipTypes.mjs';

const AIS_STREAM_URL = 'wss://stream.aisstream.io/v0/stream';
const SNAPSHOT_MS = 15000;
const MAX_VESSELS = 8000;

/** aisstream.io BoundingBoxes: [[minLat, minLon], [maxLat, maxLon]] */
const box = (minLon, minLat, maxLon, maxLat) => [[minLat, minLon], [maxLat, maxLon]];

const VESSEL_BOXES = [
    box(-180, -90, 180, 90),
    box(55.0, 25.5, 57.5, 27.5),
    box(42.5, 11.5, 44.0, 13.5),
    box(100.0, 0.5, 104.5, 6.5),
    box(118.5, 21.5, 122.5, 26.5),
    box(97.0, 5.0, 106.0, 21.0),
    box(105.0, -8.0, 125.0, 8.0),
    box(108.0, 8.0, 120.0, 22.0),
];

export const AIS_BOXES_BY_THEATER = {
    global: VESSEL_BOXES,
    middleeast: [
        box(24, 10, 65, 42),
        box(55.0, 25.5, 57.5, 27.5),
        box(42.5, 11.5, 44.0, 13.5),
        box(32.0, 29.0, 34.5, 31.5),
        box(48.0, 28.0, 51.0, 30.5),
        box(34.0, 32.0, 36.5, 35.0),
        box(38.0, 20.0, 43.0, 27.0),
    ],
    thailand: [
        box(97.0, 5.0, 106.0, 21.0),
        box(100.0, 0.5, 104.5, 6.5),
        box(98.0, 7.0, 101.5, 10.5),
        box(99.0, 12.0, 103.0, 15.0),
    ],
    indopacific: [
        box(90, -10, 135, 25),
        box(100.0, 0.5, 104.5, 6.5),
        box(118.5, 21.5, 122.5, 26.5),
        box(105.0, -8.0, 125.0, 8.0),
        box(108.0, 8.0, 120.0, 22.0),
        box(103.0, -6.0, 108.0, -2.0),
        box(110.0, -8.0, 115.0, -5.0),
        box(125.0, -10.0, 132.0, -5.0),
    ],
};

const resolveMmsi = (msg) => {
    const meta = msg.MetaData || msg.Metadata || {};
    const fromMeta = meta.MMSI ?? meta.Mmsi;
    if (fromMeta != null && fromMeta !== '') return String(fromMeta);
    const pr = msg.Message?.PositionReport;
    if (pr?.UserID != null) return String(pr.UserID);
    const sd = msg.Message?.ShipStaticData;
    if (sd?.UserID != null) return String(sd.UserID);
    return '';
};

const toFeature = (mmsi, v) => {
    const lon = v.lon;
    const lat = v.lat;
    if (lon == null || lat == null || !Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
            mmsi,
            name: v.name,
            heading: v.heading ?? 0,
            course: v.course ?? v.heading ?? 0,
            speed: v.speed ?? 0,
            shipType: v.shipType ?? 0,
            category: mapShipTypeCategory(v.shipType),
            source: 'aisstream.io',
        },
    };
};

const parseMessagePayload = (raw) => {
    if (typeof raw === 'string') return raw;
    if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw);
    if (ArrayBuffer.isView(raw)) return new TextDecoder().decode(raw);
    return String(raw);
};

async function loadWebSocketImpl() {
    // Cloudflare Workers: native WebSocket only — node `ws` never receives AIS frames.
    if (typeof globalThis.WebSocket !== 'undefined') {
        return globalThis.WebSocket;
    }
    try {
        const { createRequire } = await import('node:module');
        const require = createRequire(new URL('../../package.json', import.meta.url));
        return require('ws');
    } catch {
        return null;
    }
}

export async function fetchAisSnapshot(apiKey, {
    timeoutMs = SNAPSHOT_MS,
    maxVessels = MAX_VESSELS,
    boundingBoxes = VESSEL_BOXES,
} = {}) {
    if (!apiKey) return { features: [], error: 'missing_api_key' };

    const WebSocketImpl = await loadWebSocketImpl();
    if (!WebSocketImpl) return { features: [], error: 'websocket_unavailable' };
    const useNodeEvents = Boolean(WebSocketImpl?.prototype?.on);

    return new Promise((resolve) => {
        const positions = new Map();
        let settled = false;
        let ws;
        let streamError = null;
        let rawSeen = 0;

        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { ws?.close(); } catch { /* ignore */ }
            const features = [...positions.entries()]
                .map(([mmsi, v]) => toFeature(mmsi, v))
                .filter(Boolean);
            if (!streamError && features.length === 0 && rawSeen === 0) {
                streamError = 'empty_ais_snapshot';
            }
            resolve({ features, error: streamError });
        };

        const timer = setTimeout(finish, timeoutMs);

        const handleMessage = (raw) => {
            rawSeen += 1;
            try {
                const msg = JSON.parse(parseMessagePayload(raw));
                const messageType = msg.MessageType || msg.messageType;

                if (messageType === 'Error' || msg.error) {
                    streamError = String(msg.error || msg.Message?.error || msg.Message?.Error || 'aisstream_error');
                    return;
                }

                const mmsi = resolveMmsi(msg);
                if (!mmsi) return;

                if (messageType === 'PositionReport') {
                    const pr = msg.Message?.PositionReport || {};
                    const meta = msg.MetaData || msg.Metadata || {};
                    const course = pr.Cog ?? 0;
                    const heading = pr.TrueHeading !== 511 && pr.TrueHeading != null
                        ? pr.TrueHeading
                        : course;
                    const existing = positions.get(mmsi) || {};
                    positions.set(mmsi, {
                        ...existing,
                        lon: pr.Longitude ?? meta.longitude ?? meta.Longitude ?? null,
                        lat: pr.Latitude ?? meta.latitude ?? meta.Latitude ?? null,
                        heading,
                        course,
                        speed: pr.Sog || 0,
                        name: existing.name || meta.ShipName?.trim() || mmsi,
                        shipType: existing.shipType || 0,
                    });
                } else if (messageType === 'ShipStaticData') {
                    const sd = msg.Message?.ShipStaticData || {};
                    const existing = positions.get(mmsi) || {};
                    positions.set(mmsi, {
                        ...existing,
                        name: sd.Name?.trim() || existing.name || mmsi,
                        shipType: sd.Type || existing.shipType || 0,
                    });
                }
            } catch { /* malformed */ }

            if (positions.size >= maxVessels) finish();
        };

        const bindSocket = (socket) => {
            ws = socket;
            const onOpen = () => {
                ws.send(JSON.stringify({
                    APIkey: apiKey,
                    BoundingBoxes: boundingBoxes,
                    FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
                }));
            };
            const onClose = () => {
                if (positions.size > 0) finish();
            };
            const onError = (err) => {
                if (!streamError) streamError = err?.message || 'websocket_error';
            };

            if (useNodeEvents) {
                ws.on('open', onOpen);
                ws.on('message', handleMessage);
                ws.on('error', onError);
                ws.on('close', onClose);
            } else {
                ws.addEventListener('open', onOpen);
                ws.addEventListener('message', (event) => handleMessage(event.data));
                ws.addEventListener('error', onError);
                ws.addEventListener('close', onClose);
            }
        };

        try {
            bindSocket(new WebSocketImpl(AIS_STREAM_URL));
        } catch (err) {
            streamError = err?.message || 'websocket_init_failed';
            finish();
        }
    });
}
