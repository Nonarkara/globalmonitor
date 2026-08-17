import { mapShipTypeCategory } from '../../server/lib/shipTypes.mjs';

const AIS_STREAM_URL = 'wss://stream.aisstream.io/v0/stream';
const SNAPSHOT_MS = 22000;
const RETRY_SNAPSHOT_MS = 8000;
const MIN_COLLECT_MS = 6000;
const EARLY_EXIT_MIN_VESSELS = 80;
const MAX_VESSELS = 8000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

/** aisstream.io JS example: [[minLon, minLat], [maxLon, maxLat]] per corner */
const box = (minLon, minLat, maxLon, maxLat) => [[minLon, minLat], [maxLon, maxLat]];

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
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) return raw.toString('utf8');
    if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw);
    if (ArrayBuffer.isView(raw)) return new TextDecoder().decode(raw);
    if (typeof Blob !== 'undefined' && raw instanceof Blob) return null;
    return String(raw);
};

async function loadWebSocketImpl() {
    // Node.js: native WebSocket does not receive aisstream frames — use `ws`.
    try {
        const { createRequire } = await import('node:module');
        const require = createRequire(new URL('../../package.json', import.meta.url));
        const Ws = require('ws');
        if (Ws?.prototype?.on && typeof process !== 'undefined' && process.versions?.node) {
            return Ws;
        }
    } catch { /* Worker or no ws */ }
    // Cloudflare Workers: native WebSocket only.
    if (typeof globalThis.WebSocket !== 'undefined') {
        return globalThis.WebSocket;
    }
    return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAisSnapshot(apiKey, {
    timeoutMs = SNAPSHOT_MS,
    maxVessels = MAX_VESSELS,
    boundingBoxes = VESSEL_BOXES,
} = {}) {
    if (!apiKey || apiKey.length < 8) return { features: [], error: 'missing_api_key' };

    const WebSocketImpl = await loadWebSocketImpl();
    if (!WebSocketImpl) return { features: [], error: 'websocket_unavailable' };
    const useNodeEvents = Boolean(WebSocketImpl?.prototype?.on);

    return new Promise((resolve) => {
        const positions = new Map();
        let settled = false;
        let ws;
        let streamError = null;
        let rawSeen = 0;
        let closeCode = null;
        const startedAt = Date.now();

        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            clearInterval(earlyExitTimer);
            try { ws?.close(); } catch { /* ignore */ }
            const features = [...positions.entries()]
                .map(([mmsi, v]) => toFeature(mmsi, v))
                .filter(Boolean);
            if (!streamError && features.length === 0 && rawSeen === 0) {
                streamError = 'empty_ais_snapshot';
            } else if (!streamError && features.length === 0 && rawSeen > 0) {
                streamError = 'no_position_reports';
            }
            resolve({
                features,
                error: streamError,
                rawSeen,
                closeCode,
                vesselCount: features.length,
            });
        };

        const maybeEarlyFinish = () => {
            const elapsed = Date.now() - startedAt;
            if (elapsed >= MIN_COLLECT_MS && positions.size >= EARLY_EXIT_MIN_VESSELS) {
                finish();
            }
        };

        const timer = setTimeout(finish, timeoutMs);
        const earlyExitTimer = setInterval(maybeEarlyFinish, 2000);

        const handleMessage = (raw) => {
            rawSeen += 1;
            try {
                const payload = parseMessagePayload(raw);
                if (payload == null) return;
                const msg = JSON.parse(payload);
                const messageType = msg.MessageType || msg.messageType;

                if (messageType === 'Error' || msg.error) {
                    streamError = String(msg.error || msg.Message?.error || msg.Message?.Error || 'aisstream_error');
                    finish();
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
            else maybeEarlyFinish();
        };

        const bindSocket = (socket) => {
            ws = socket;
            const onOpen = () => {
                // Match official JS example: APIkey + BoundingBoxes only (no FilterMessageTypes).
                ws.send(JSON.stringify({
                    APIkey: apiKey,
                    BoundingBoxes: boundingBoxes,
                }));
            };
            const onClose = (code) => {
                if (code != null) closeCode = code;
                finish();
            };
            const onError = (err) => {
                if (!streamError) streamError = err?.message || 'websocket_error';
            };
            const onUnexpectedResponse = (_req, res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8').slice(0, 200);
                    streamError = `http_${res.statusCode}${body ? `:${body}` : ''}`;
                    finish();
                });
            };

            if (useNodeEvents) {
                ws.on('open', onOpen);
                ws.on('message', handleMessage);
                ws.on('error', onError);
                ws.on('close', (code) => onClose(code));
                if (typeof ws.on === 'function') {
                    ws.on('unexpected-response', onUnexpectedResponse);
                }
            } else {
                ws.addEventListener('open', onOpen);
                ws.addEventListener('message', (event) => handleMessage(event.data));
                ws.addEventListener('error', onError);
                ws.addEventListener('close', (event) => onClose(event?.code));
            }
        };

        try {
            const wsOptions = useNodeEvents ? { perMessageDeflate: false } : undefined;
            bindSocket(new WebSocketImpl(AIS_STREAM_URL, wsOptions));
        } catch (err) {
            streamError = err?.message || 'websocket_init_failed';
            finish();
        }
    });
}

/** Retry empty snapshots — second pass uses shorter window to stay under CF 30s wall-clock. */
export async function fetchAisSnapshotWithRetry(apiKey, options = {}) {
    const attempts = options.maxAttempts ?? RETRY_ATTEMPTS;
    const primaryTimeout = options.timeoutMs ?? SNAPSHOT_MS;
    let lastResult = { features: [], error: 'empty_ais_snapshot' };

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (attempt > 0) await sleep(RETRY_DELAY_MS);
        const attemptTimeout = attempt === 0 ? primaryTimeout : RETRY_SNAPSHOT_MS;
        const result = await fetchAisSnapshot(apiKey, { ...options, timeoutMs: attemptTimeout });
        if (result.features?.length > 0) {
            return { ...result, attempt: attempt + 1 };
        }
        lastResult = result;
        if (result.error === 'missing_api_key' || result.error === 'websocket_unavailable') break;
        if (attempt === 0 && result.rawSeen > 0) break;
    }

    return { ...lastResult, attempt: attempts };
}
