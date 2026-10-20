/**
 * The city wall's measured half — what is actually answering right now.
 *
 * The panel cannot measure a camera from the browser: a cross-origin image
 * cannot be read as bytes, so the client cannot tell a 3,070-byte "No
 * signal" card from a real frame. This module does the measuring, server
 * side, and the panel renders what it says.
 *
 * THE LIVENESS TRAP (iTIC / Longdo, Thailand)
 * ------------------------------------------
 * The iTIC snapshot endpoint answers HTTP 200 with `image/jpeg` for a camera
 * that is not there. Measured 2026-10-20:
 *
 *   camid=X.X.X.X:YYYY          43 B   a text stub
 *   camid=10.8.0.19:8801        45 B   "Camera (jpeg) not found"
 *   camid=61.91.182.114:1111   3070 B   a "No signal" card, 320x240
 *
 * The 3,070-byte card is the dangerous one: it is bigger than any stub, it
 * is a valid JPEG, and it decodes. Six different iTIC camids — six
 * different intersections — returned the BYTE-IDENTICAL image. A live
 * camera cannot produce the same bytes at six places at once, so a frame
 * that more than one camera returns is a placeholder, not a picture.
 *
 * So the gate is three tests, not one:
 *   1. bytes      — below ~500 B the endpoint is a stub, not a frame.
 *   2. agreement  — a frame two cameras both return is a placeholder card.
 *   3. movement   — a frame that does not change between two probes is
 *                   reported as it was measured ("unchanged between two
 *                   probes N s apart"), never as "live".
 *
 * HTTP 200 is never evidence of anything on its own.
 *
 * Nothing here invents a value. A source that cannot be reached is reported
 * as unreachable, which is NOT the same as "no camera exists", and the two
 * say different words in the panel.
 */

import {
    CITY_FEEDS,
    ytChannel,
    ytVideo
} from '../../src/data/cityFeeds.js';

/* ── endpoints (all measured) ──────────────────────────────────────────── */

const ITIC_FEED = 'https://camera.longdo.com/feed/?command=json';
const ITIC_SNAPSHOT = 'https://camera1.iticfoundation.org/jpeg2.php?camid=';
const SG_TRAFFIC_API = 'https://api.data.gov.sg/v1/transport/traffic-images';
const HCMC_CAMERA_API =
    'https://api.notis.vn/v4/cameras/bybbox?lat1=11.20&lng1=106.90&lat2=10.30&lng2=106.30';
const HANOI_CAMERA_API = 'https://cds.hanoi.gov.vn/api/1.0/public/video-wall-cameras-v2?page=1&refresh=0';
const JAKARTA_STILL = 'https://opencctv.org/still/105245.jpg';
const JAKARTA_HLS = 'https://extstream.hk-opt2.com/LiveApp/streams/687489889091511277827377.m3u8';
const SELANGOR_CAMERAS = [
    'https://infobanjirjps.selangor.gov.my/InfoBanjir.WebAdmin/CCTV_Image/16.jpg',
    'https://infobanjirjps.selangor.gov.my/InfoBanjir.WebAdmin/CCTV_Image/18.jpg',
    'https://infobanjirjps.selangor.gov.my/InfoBanjir.WebAdmin/CCTV_Image/234.jpg',
    'https://infobanjirjps.selangor.gov.my/InfoBanjir.WebAdmin/CCTV_Image/241.jpg',
    'https://infobanjirjps.selangor.gov.my/InfoBanjir.WebAdmin/CCTV_Image/242.jpg'
];
const YT_FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const YT_LIVE_TAB = 'https://www.youtube.com/channel/';

/* ── tuning ────────────────────────────────────────────────────────────── */

const TIMEOUT_MS = 12000;
const PROBE_GAP_MS = 6000;      // gap between the two probes of one frame
const CAMERA_CACHE_TTL_MS = 120000;
const CHANNEL_CACHE_TTL_MS = 600000;

// A frame below this size is a stub or an error page, never a picture.
const MIN_FRAME_BYTES = 500;

const BANGKOK_BOX = { latMin: 13.6, latMax: 13.9, lonMin: 100.4, lonMax: 100.7 };

/* ── helpers ───────────────────────────────────────────────────────────── */

const nowIso = () => new Date().toISOString();

const sha256 = async (bytes) => {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .slice(0, 16)
        .join('');
};

/** JPEG dimensions, read from the SOF marker. Returns null for non-JPEG. */
const jpegSize = (bytes) => {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    let i = 2;
    while (i < bytes.length - 9) {
        if (bytes[i] !== 0xff) { i += 1; continue; }
        const marker = bytes[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            const height = (bytes[i + 5] << 8) | bytes[i + 6];
            const width = (bytes[i + 7] << 8) | bytes[i + 8];
            return { width, height };
        }
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            i += 2;
            continue;
        }
        const len = (bytes[i + 2] << 8) | bytes[i + 3];
        if (!len) break;
        i += 2 + len;
    }
    return null;
};

/**
 * Fetch one URL and measure it. Never throws: a failure is a measurement
 * ("could not reach it"), because the difference between "no camera" and
 * "the camera could not be reached" is the whole point of this module.
 */
const probeUrl = async (url, { timeout = TIMEOUT_MS } = {}) => {
    const startedAt = Date.now();
    try {
        const res = await fetch(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(timeout),
            headers: { 'user-agent': 'AsiaWatch city-wall probe (+https://asia.nonarkara.org)' }
        });
        const bytes = new Uint8Array(await res.arrayBuffer());
        return {
            ok: res.ok,
            status: res.status,
            contentType: res.headers.get('content-type'),
            acao: res.headers.get('access-control-allow-origin'),
            corp: res.headers.get('cross-origin-resource-policy'),
            bytes: bytes.length,
            hash: await sha256(bytes),
            dims: jpegSize(bytes),
            body: bytes,
            ms: Date.now() - startedAt
        };
    } catch (error) {
        return { ok: false, status: null, error: String(error?.message || error), ms: Date.now() - startedAt };
    }
};

const fetchJson = async (url) => {
    const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'AsiaWatch city-wall probe (+https://asia.nonarkara.org)' }
    });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Kilometres between two lat/lon pairs — used only to pick a camera. */
const kmBetween = (aLat, aLon, bLat, bLon) => {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLon = ((bLon - aLon) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 +
        Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
};

/* ── camera probes ─────────────────────────────────────────────────────── */

/**
 * Bangkok, iTIC / Longdo. The feed publishes 162 cameras; only the ones
 * carrying a real camid answer with a frame. Every candidate is probed and
 * the frames are compared: a frame more than one camera returns is the
 * "No signal" placeholder and is thrown away.
 */
const probeBangkok = async (city) => {
    let feed = [];
    try {
        feed = await fetchJson(ITIC_FEED);
    } catch (error) {
        return {
            kind: 'none',
            url: null,
            label: 'Camera unverified — the iTIC feed could not be reached',
            source: 'iTIC / Longdo',
            sourceUrl: 'https://camera.longdo.com/',
            probeFailed: true,
            note: `The camera feed did not answer (${String(error?.message || error)}).`
        };
    }

    const candidates = (Array.isArray(feed) ? feed : [])
        .filter((c) => {
            const url = c?.imgurl || '';
            const lat = Number(c?.latitude);
            const lon = Number(c?.longitude);
            if (!/camid=([^&]+)$/.test(url)) return false;
            if (url.includes('X.X.X.X')) return false;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
            return lat >= BANGKOK_BOX.latMin && lat <= BANGKOK_BOX.latMax &&
                lon >= BANGKOK_BOX.lonMin && lon <= BANGKOK_BOX.lonMax;
        })
        .slice(0, 12);

    if (!candidates.length) {
        return {
            kind: 'none',
            url: null,
            label: 'No verified public camera',
            source: 'iTIC / Longdo',
            sourceUrl: 'https://camera.longdo.com/',
            probeFailed: false,
            note: 'The feed published no Bangkok camera with a usable camid.'
        };
    }

    const probed = await Promise.all(candidates.map(async (c) => {
        const camid = (c.imgurl.match(/camid=([^&]+)$/) || [])[1];
        const result = await probeUrl(c.imgurl);
        return {
            camid,
            title: c.title || null,
            lat: Number(c.latitude),
            lon: Number(c.longitude),
            hlsUrl: c.hls_url || null,
            result
        };
    }));

    const frames = probed.filter((p) => p.result.ok && p.result.bytes >= MIN_FRAME_BYTES && p.result.dims);
    const seen = new Map();
    for (const p of frames) {
        const list = seen.get(p.result.hash) || [];
        list.push(p.camid);
        seen.set(p.result.hash, list);
    }

    // A frame two different cameras return is a placeholder card, not a picture.
    const live = frames.filter((p) => (seen.get(p.result.hash) || []).length === 1);
    const placeholders = frames.filter((p) => (seen.get(p.result.hash) || []).length > 1);

    if (!live.length) {
        return {
            kind: 'none',
            url: null,
            label: 'No verified public camera',
            source: 'iTIC / Longdo',
            sourceUrl: 'https://camera.longdo.com/',
            probeFailed: false,
            note: placeholders.length
                ? `Every iTIC Bangkok camera returned the same ${placeholders[0].result.bytes}-byte placeholder frame.`
                : 'No iTIC Bangkok camera returned a decodable frame.'
        };
    }

    // The biggest genuine frame is the one worth putting on the wall.
    live.sort((a, b) => b.result.bytes - a.result.bytes);
    const chosen = live[0];

    // Second probe, PROBE_GAP_MS later: has the frame moved?
    await sleep(PROBE_GAP_MS);
    const second = await probeUrl(`${ITIC_SNAPSHOT}${encodeURIComponent(chosen.camid)}`);

    let hls = null;
    if (chosen.hlsUrl) {
        const playlist = await probeUrl(chosen.hlsUrl);
        if (playlist.ok) {
            const seq = (new TextDecoder().decode(playlist.body).match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/) || [])[1];
            hls = {
                url: chosen.hlsUrl,
                ok: true,
                bytes: playlist.bytes,
                mediaSequence: seq ? Number(seq) : null,
                note: 'HLS playlist answered with live segments. It plays in browsers with native HLS (Safari, iOS); Chrome and Firefox need a player this panel does not ship, so the wall shows the snapshot.'
            };
        } else {
            hls = { url: chosen.hlsUrl, ok: false, note: `The HLS playlist did not answer (${playlist.error || playlist.status}).` };
        }
    }

    const changed = second.ok && second.hash !== chosen.result.hash;

    return {
        kind: 'snapshot',
        url: `${ITIC_SNAPSHOT}${encodeURIComponent(chosen.camid)}`,
        label: snapshotTier(changed),
        source: 'iTIC / Longdo',
        sourceUrl: 'https://camera.longdo.com/',
        probeFailed: false,
        camid: chosen.camid,
        cameraName: chosen.title,
        lat: chosen.lat,
        lon: chosen.lon,
        bytes: chosen.result.bytes,
        width: chosen.result.dims.width,
        height: chosen.result.dims.height,
        contentType: chosen.result.contentType,
        frameChanged: changed,
        probedAt: nowIso(),
        note: `Camera at ${chosen.lat.toFixed(2)} N, ${chosen.lon.toFixed(2)} E. The frame ${changed ? 'changed' : 'did not change'} between two probes ${Math.round(PROBE_GAP_MS / 1000)} s apart.${placeholders.length ? ` ${placeholders.length} other iTIC Bangkok cameras returned the same placeholder frame and were rejected.` : ''}`,
        hls
    };
};

/** Singapore, data.gov.sg (LTA). The operator publishes a file per capture. */
const probeSingapore = async () => {
    let payload;
    try {
        payload = await fetchJson(SG_TRAFFIC_API);
    } catch (error) {
        return {
            kind: 'none', url: null,
            label: 'Camera unverified — the data.gov.sg feed could not be reached',
            source: 'data.gov.sg (LTA)', sourceUrl: 'https://data.gov.sg/collections/1381/view',
            probeFailed: true,
            note: `The traffic-images feed did not answer (${String(error?.message || error)}).`
        };
    }

    const item = payload?.items?.[0];
    const cameras = Array.isArray(item?.cameras) ? item.cameras : [];
    if (!cameras.length) {
        return {
            kind: 'none', url: null,
            label: 'No verified public camera',
            source: 'data.gov.sg (LTA)', sourceUrl: 'https://data.gov.sg/collections/1381/view',
            probeFailed: false,
            note: 'The feed carried no camera.'
        };
    }

    // The camera nearest the city centre — the one that shows the city.
    const withDistance = cameras.map((c) => ({
        camera: c,
        km: kmBetween(c.location?.latitude ?? 0, c.location?.longitude ?? 0, 1.2897, 103.8501)
    })).sort((a, b) => a.km - b.km);
    const chosen = withDistance[0];

    const first = await probeUrl(chosen.camera.image);
    await sleep(PROBE_GAP_MS);
    const second = await probeUrl(chosen.camera.image);

    if (!first.ok || first.bytes < MIN_FRAME_BYTES || !first.dims) {
        return {
            kind: 'none', url: null,
            label: 'No verified public camera',
            source: 'data.gov.sg (LTA)', sourceUrl: 'https://data.gov.sg/collections/1381/view',
            probeFailed: false,
            note: `The published frame did not decode (${first.error || `HTTP ${first.status}, ${first.bytes} B`}).`
        };
    }

    const changed = second.ok ? second.hash !== first.hash : null;

    return {
        kind: 'snapshot',
        url: chosen.camera.image,
        label: snapshotTier(changed),
        source: 'data.gov.sg (LTA)',
        sourceUrl: 'https://data.gov.sg/collections/1381/view',
        probeFailed: false,
        camid: chosen.camera.camera_id,
        cameraName: `LTA camera ${chosen.camera.camera_id}`,
        lat: chosen.camera.location?.latitude ?? null,
        lon: chosen.camera.location?.longitude ?? null,
        bytes: first.bytes,
        width: first.dims.width,
        height: first.dims.height,
        contentType: first.contentType,
        frameChanged: changed,
        publishedAt: chosen.camera.timestamp || item?.timestamp || null,
        probedAt: nowIso(),
        note: `Camera at ${chosen.camera.location?.latitude?.toFixed(2)} N, ${chosen.camera.location?.longitude?.toFixed(2)} E — the nearest of the ${cameras.length} the operator publishes to the city centre. The frame ${changed ? 'changed' : 'did not change'} between two probes ${Math.round(PROBE_GAP_MS / 1000)} s apart. The file at this address is a capture, not a stream: the feed publishes a new one.`,
    };
};

/** Ho Chi Minh City, api.notis.vn (the traffic operator). */
const probeHoChiMinh = async () => {
    let cameras;
    try {
        cameras = await fetchJson(HCMC_CAMERA_API);
    } catch (error) {
        return {
            kind: 'none', url: null,
            label: 'Camera unverified — the operator feed could not be reached',
            source: 'api.notis.vn (traffic operator)', sourceUrl: 'https://api.notis.vn/',
            probeFailed: true,
            note: `The camera feed did not answer (${String(error?.message || error)}).`
        };
    }

    const list = Array.isArray(cameras) ? cameras : [];
    if (!list.length) {
        return {
            kind: 'none', url: null,
            label: 'No verified public camera',
            source: 'api.notis.vn (traffic operator)', sourceUrl: 'https://api.notis.vn/',
            probeFailed: false,
            note: 'The feed carried no camera.'
        };
    }

    const withDistance = list.map((c) => {
        const lon = c?.loc?.coordinates?.[0];
        const lat = c?.loc?.coordinates?.[1];
        return { camera: c, lat, lon, km: kmBetween(lat ?? 0, lon ?? 0, 10.7769, 106.7009) };
    }).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
        .sort((a, b) => a.km - b.km);
    const chosen = withDistance[0];

    const url = `https://api.notis.vn/v4/cameras/${chosen.camera._id}/snapshot`;
    const first = await probeUrl(url);
    await sleep(PROBE_GAP_MS);
    const second = await probeUrl(url);

    if (!first.ok || first.bytes < MIN_FRAME_BYTES || !first.dims) {
        return {
            kind: 'none', url: null,
            label: 'No verified public camera',
            source: 'api.notis.vn (traffic operator)', sourceUrl: 'https://api.notis.vn/',
            probeFailed: false,
            note: `The snapshot did not decode (${first.error || `HTTP ${first.status}, ${first.bytes} B`}).`
        };
    }

    return {
        kind: 'snapshot',
        url,
        label: snapshotTier(second.ok ? second.hash !== first.hash : null),
        source: 'api.notis.vn (traffic operator)',
        sourceUrl: 'https://api.notis.vn/',
        probeFailed: false,
        camid: chosen.camera.id || chosen.camera._id,
        cameraName: chosen.camera.name || null,
        district: chosen.camera.dist || null,
        lat: chosen.lat,
        lon: chosen.lon,
        bytes: first.bytes,
        width: first.dims.width,
        height: first.dims.height,
        contentType: first.contentType,
        frameChanged: second.ok ? second.hash !== first.hash : null,
        probedAt: nowIso(),
        note: `Camera at ${chosen.lat.toFixed(2)} N, ${chosen.lon.toFixed(2)} E — the nearest of the ${list.length} the operator publishes in this box. The frame ${second.ok && second.hash !== first.hash ? 'changed' : 'did not change'} between two probes ${Math.round(PROBE_GAP_MS / 1000)} s apart.`
    };
};

/** Jakarta — a third-party aggregator's still of a live camera. */
const probeJakarta = async () => {
    const first = await probeUrl(JAKARTA_STILL);
    await sleep(PROBE_GAP_MS);
    const second = await probeUrl(JAKARTA_STILL);

    const playlist = await probeUrl(JAKARTA_HLS);
    const hls = playlist.ok
        ? {
            url: JAKARTA_HLS,
            ok: true,
            bytes: playlist.bytes,
            mediaSequence: Number((new TextDecoder().decode(playlist.body).match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/) || [])[1]),
            note: 'HLS playlist answered with live segments. It plays in browsers with native HLS (Safari, iOS); Chrome and Firefox need a player this panel does not ship, so the wall shows the frame the aggregator publishes.'
        }
        : { url: JAKARTA_HLS, ok: false, note: `The HLS playlist did not answer (${playlist.error || playlist.status}).` };

    if (!first.ok || first.bytes < MIN_FRAME_BYTES || !first.dims) {
        return {
            kind: 'none', url: null,
            label: 'No verified public camera',
            source: 'opencctv.org (third-party aggregator)', sourceUrl: 'https://opencctv.org/',
            probeFailed: false,
            hls,
            note: `The published frame did not decode (${first.error || `HTTP ${first.status}, ${first.bytes} B`}).`
        };
    }

    return {
        kind: 'snapshot',
        url: JAKARTA_STILL,
        // "of a live camera" is a claim about a third party's camera. The
        // HLS probe confirms it when the playlist answers with live
        // segments, and the HLS note reports that in words; the tier line
        // says only what the frame itself did.
        label: snapshotTier(second.ok ? second.hash !== first.hash : null),
        source: 'opencctv.org (third-party aggregator)',
        sourceUrl: 'https://opencctv.org/',
        probeFailed: false,
        bytes: first.bytes,
        width: first.dims.width,
        height: first.dims.height,
        contentType: first.contentType,
        corp: first.corp,
        frameChanged: second.ok ? second.hash !== first.hash : null,
        probedAt: nowIso(),
        note: `Third-party aggregator, not a primary operator feed. The frame ${second.ok && second.hash !== first.hash ? 'changed' : 'did not change'} between two probes ${Math.round(PROBE_GAP_MS / 1000)} s apart, and the aggregator republishes it on a slow cycle.${first.corp ? ' The source sends Cross-Origin-Resource-Policy: same-origin, so a browser will not display it directly — the panel serves the frame through the server instead.' : ''}`,
        hls
    };
};

/**
 * Kuala Lumpur — the Selangor state government's flood cameras. They are in
 * the Klang Valley, in the STATE, not in Kuala Lumpur city. The panel says
 * so; a KL label on a Shah Alam camera is a lie the operator would act on.
 */
const probeKualaLumpur = async () => {
    const results = await Promise.all(SELANGOR_CAMERAS.map((url) => probeUrl(url)));
    const usable = results
        .map((r, i) => ({ r, url: SELANGOR_CAMERAS[i] }))
        .filter(({ r }) => r.ok && r.bytes >= MIN_FRAME_BYTES && r.dims);
    if (!usable.length) {
        return {
            kind: 'none', url: null,
            label: 'No verified public camera',
            source: 'Selangor state government (Info Banjir JPS)',
            sourceUrl: 'https://infobanjirjps.selangor.gov.my/',
            probeFailed: false,
            note: 'None of the published Selangor cameras answered with a decodable frame.'
        };
    }
    usable.sort((a, b) => b.r.bytes - a.r.bytes);
    const chosen = usable[0];

    await sleep(PROBE_GAP_MS);
    const second = await probeUrl(chosen.url);
    const changed = second.ok ? second.hash !== chosen.r.hash : null;

    return {
        kind: 'snapshot',
        url: chosen.url,
        label: snapshotTier(changed),
        source: 'Selangor state government (Info Banjir JPS)',
        sourceUrl: 'https://infobanjirjps.selangor.gov.my/',
        probeFailed: false,
        bytes: chosen.r.bytes,
        width: chosen.r.dims.width,
        height: chosen.r.dims.height,
        contentType: chosen.r.contentType,
        frameChanged: changed,
        probedAt: nowIso(),
        note: `Selangor state cameras (Klang Valley) — not Kuala Lumpur city. The frame ${changed ? 'changed' : 'did not change'} between two probes ${Math.round(PROBE_GAP_MS / 1000)} s apart.`,
        cameraCount: usable.length
    };
};

/** Hanoi — the city publishes positions, not pictures. */
const probeHanoi = async () => {
    let total = null;
    try {
        const payload = await fetchJson(HANOI_CAMERA_API);
        total = Number.isFinite(payload?.total) ? payload.total : null;
    } catch (error) {
        return {
            kind: 'none', url: null,
            label: 'Camera unverified — the city video-wall feed could not be reached',
            source: 'Hanoi city video wall (metadata only)',
            sourceUrl: 'https://cds.hanoi.gov.vn/',
            probeFailed: true,
            note: `The metadata feed did not answer (${String(error?.message || error)}).`
        };
    }
    return {
        kind: 'none',
        url: null,
        label: 'No verified public camera',
        source: 'Hanoi city video wall (metadata only)',
        sourceUrl: 'https://cds.hanoi.gov.vn/',
        probeFailed: false,
        cameraCount: total,
        note: `The city publishes ${total ?? 'its'} camera positions and stream descriptors, but no snapshot; HTTPS playback answers 404 without a session token. A pin, not a picture.`
    };
};

/* ── channel probes ────────────────────────────────────────────────────── */

/** The channel's own feed: title, newest upload, and the newest video id. */
const probeChannelFeed = async (channelId) => {
    try {
        const res = await fetch(`${YT_FEED}${channelId}`, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { 'user-agent': 'Mozilla/5.0 (compatible; AsiaWatch city-wall)' }
        });
        if (!res.ok) return { ok: false, status: res.status };
        const xml = await res.text();
        const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
        const published = entries
            .map((e) => (e.match(/<published>([^<]*)<\/published>/) || [])[1])
            .filter(Boolean)
            .sort();
        const ids = entries.map((e) => (e.match(/<yt:videoId>([^<]*)<\/yt:videoId>/) || [])[1]).filter(Boolean);
        return {
            ok: true,
            status: res.status,
            title: (xml.match(/<title>([^<]*)<\/title>/) || [])[1] || null,
            latestPublished: published.length ? published[published.length - 1] : null,
            latestVideoId: ids[0] || null,
            entries: entries.length
        };
    } catch (error) {
        return { ok: false, error: String(error?.message || error) };
    }
};

/**
 * The channel's live tab. YouTube serves the page title and the player
 * response deep in the document, so the body is read until the marker is
 * found and then the connection is dropped.
 */
const probeChannelLive = async (channelId) => {
    try {
        const res = await fetch(`${YT_LIVE_TAB}${channelId}/live`, {
            headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
            signal: AbortSignal.timeout(TIMEOUT_MS + 8000)
        });
        if (!res.ok || !res.body) return { ok: false, status: res.status };

        const decoder = new TextDecoder('utf-8');
        let text = '';
        const reader = res.body.getReader();
        while (text.length < 1200000) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            if (text.includes('"isLiveContent"') && text.includes('"videoId"')) break;
        }
        try { await reader.cancel(); } catch { /* the stream is already closed */ }

        return {
            ok: true,
            isLive: /"isLiveContent":true/.test(text),
            videoId: (text.match(/"videoId":"([\w-]{11})"/) || [])[1] || null,
            title: (text.match(/<title>([^<]*)<\/title>/) || [])[1] || null
        };
    } catch (error) {
        return { ok: false, error: String(error?.message || error) };
    }
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const monthName = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const ageInDays = (iso) => {
    if (!iso) return null;
    const d = new Date(iso).getTime();
    if (Number.isNaN(d)) return null;
    return Math.floor((Date.now() - d) / 86400000);
};

/**
 * What a channel actually is. A live stream running now is LIVE; a channel
 * that uploads is VOD; a channel that stopped years ago is dormant; one
 * that stopped months ago is stale. Never "live" for a channel that is not.
 */
const channelState = (live, feed) => {
    if (live?.ok && live.isLive) return 'live';
    const age = ageInDays(feed?.latestPublished);
    if (age === null) return 'unconfirmed';
    if (age > 365) return 'dormant';
    if (age > 30) return 'stale';
    return 'vod';
};

const stateLabel = (state, feed) => {
    switch (state) {
        case 'live': return 'LIVE';
        case 'vod': return 'VOD — no live stream running at the probe time';
        case 'dormant': return `Dormant — newest upload ${monthName(feed?.latestPublished) || 'unknown'}`;
        case 'stale': return `Stale — newest upload ${monthName(feed?.latestPublished) || 'unknown'}`;
        default: return 'Unconfirmed — the channel did not answer the probe';
    }
};

/**
 * What the probe SAW, in words. The registry says what a channel IS; the
 * probe says what it is DOING, and only the probe may say that: the two
 * files are read by the same tile, and a static note claiming a live state
 * outlives the measurement that made it. Bangkok's tile once read "VOD — no
 * live stream running at the probe time" directly above "Live stream
 * verified running" — two claims, one of them false.
 */
const probeNote = (state, feed) => {
    const newest = monthName(feed?.latestPublished);
    switch (state) {
        case 'live':
            return 'A stream was running on the live tab at the probe time.';
        case 'vod':
            return `The feed answers; the newest upload is ${newest || 'of an unknown date'}.`;
        case 'dormant':
        case 'stale':
            return 'The feed still answers with its own uploads.';
        default:
            return 'The channel did not answer the probe.';
    }
};

/**
 * The tier label has to AGREE WITH THE MEASUREMENT. A frame that did not
 * change between two probes is not a refreshing image, and a tile labelled
 * "refreshing" over a still frame is a lie in nine-point type: the
 * contract names this exact case — "a still frame in a tile labelled
 * 'refreshing' is a smaller lie but still a lie". So the label is written
 * from the measurement, not from the kind:
 *
 *   changed      the frame differs between the two probes → it refreshes
 *   unchanged    the frame is identical → it does NOT refresh
 *   null         the second probe did not answer → nothing can be said
 *
 * The source, the byte count and the dimensions live in their own line;
 * the tier line says one thing and says it about the freshness.
 */
const snapshotTier = (changed) => {
    if (changed === true) return 'Snapshot — refreshing JPEG, not video';
    if (changed === false) {
        return `Snapshot — frame unchanged between two probes ${Math.round(PROBE_GAP_MS / 1000)} s apart, not video`;
    }
    return 'Snapshot — a still JPEG, not video; the second probe did not answer';
};

const probeChannel = async (entry) => {
    const [feed, live] = await Promise.all([
        probeChannelFeed(entry.channelId),
        probeChannelLive(entry.channelId)
    ]);

    const state = channelState(live, feed);
    const posterVideoId = (state === 'live' && live?.videoId) || feed?.latestVideoId || entry.posterVideoId || null;
    const embedUrl = entry.embedKind === 'video' && posterVideoId
        ? ytVideo(posterVideoId)
        : ytChannel(entry.channelId);

    return {
        name: entry.name,
        channelId: entry.channelId,
        state,
        label: stateLabel(state, feed),
        note: [entry.note, probeNote(state, feed)].filter(Boolean).join(' '),
        embedUrl,
        posterVideoId,
        liveVideoId: state === 'live' ? (live?.videoId || null) : null,
        feedTitle: feed?.title || null,
        latestPublished: feed?.latestPublished || null,
        probedAt: nowIso(),
        probeFailed: !feed.ok && !live.ok
    };
};

/* ── caches ────────────────────────────────────────────────────────────── */

let cameraCache = { at: 0, payload: null };
let channelCache = { at: 0, payload: null };
let cameraRefresh = null;
let channelRefresh = null;

// A cold probe takes seconds — the frame gate needs two fetches six
// seconds apart, and a slow source can stretch it. A reader who arrives
// while the cache is cold waits for all of it, and the browser's own
// timeout can beat the answer to the door. So a payload that is past its
// TTL but still within STALE_MS is served IMMEDIATELY and refreshed in the
// background. The panel prints the probe time on every tile, so a stale
// answer says how old it is; a blank wall says nothing.
const STALE_MS = 30 * 60 * 1000;

const refreshCameras = async () => {
    if (!cameraRefresh) {
        cameraRefresh = probeCameras(CITY_FEEDS)
            .then((probed) => { cameraCache = { at: Date.now(), payload: probed }; })
            .finally(() => { cameraRefresh = null; });
    }
    return cameraRefresh;
};

const refreshChannels = async () => {
    if (!channelRefresh) {
        channelRefresh = Promise.all(
            CITY_FEEDS.map(async (city) => {
                const primary = await probeChannel(city.channel);
                const alternates = city.channel.alternates
                    ? await Promise.all(city.channel.alternates.map((alt) => probeChannel(alt)))
                    : [];
                return { [city.id]: { primary, alternates } };
            })
        )
            .then((probed) => { channelCache = { at: Date.now(), payload: Object.assign({}, ...probed) }; })
            .finally(() => { channelRefresh = null; });
    }
    return channelRefresh;
};

/* ── the probe ─────────────────────────────────────────────────────────── */

const probeCameras = async (cities) => {
    const probes = {
        bangkok: probeBangkok,
        singapore: probeSingapore,
        'ho-chi-minh-city': probeHoChiMinh,
        'kuala-lumpur': probeKualaLumpur,
        jakarta: probeJakarta,
        hanoi: probeHanoi
    };

    const entries = await Promise.all(cities.map(async (city) => {
        const probe = probes[city.id];
        if (!probe) {
            // No source was verified for this city. This is a fact about the
            // research, not about the network: the source could not be
            // reached because there is no source to reach.
            return {
                ...city,
                camera: {
                    ...city.camera,
                    kind: 'none',
                    url: null,
                    probeFailed: false,
                    probedAt: nowIso()
                }
            };
        }
        const camera = await probe(city);
        return { ...city, camera };
    }));

    return entries;
};

/**
 * The city wall payload. Both halves are measured here: the cameras are
 * probed for a real frame, the channels are probed for a live stream and
 * for the date of their newest upload.
 *
 * The two halves are probed at the same time — they are independent, and
 * running them in sequence would make the operator wait for the sum of two
 * round trips instead of the larger of the two.
 */
export const fetchCityFeeds = async (options = {}) => {
    const { force = false } = options;
    const now = Date.now();

    const cameraJob = async () => {
        if (!force && cameraCache.payload && now - cameraCache.at < CAMERA_CACHE_TTL_MS) {
            return cameraCache.payload;
        }
        // Past its TTL but not ancient: serve it now and refresh it behind
        // the reader's back. The tiles carry the probe time, so the age is
        // on the screen; a blank wall says nothing.
        if (!force && cameraCache.payload && now - cameraCache.at < STALE_MS) {
            refreshCameras();
            return cameraCache.payload;
        }
        const probed = await probeCameras(CITY_FEEDS);
        cameraCache = { at: Date.now(), payload: probed };
        return probed;
    };

    const channelJob = async () => {
        if (!force && channelCache.payload && now - channelCache.at < CHANNEL_CACHE_TTL_MS) {
            return channelCache.payload;
        }
        if (!force && channelCache.payload && now - channelCache.at < STALE_MS) {
            refreshChannels();
            return channelCache.payload;
        }
        await refreshChannels();
        return channelCache.payload;
    };

    const [cities, channels] = await Promise.all([cameraJob(), channelJob()]);

    const out = cities.map((city) => {
        const channel = channels[city.id];
        const camera = { ...city.camera };
        const channelOut = channel
            ? { ...channel.primary, alternates: channel.alternates }
            : { ...city.channel, alternates: city.channel.alternates || [] };

        if (camera.kind === 'snapshot' && camera.url) {
            // The camera label is the tier. The note carries the measurement.
            camera.note = camera.note || '';
        }

        return {
            id: city.id,
            name: city.name,
            country: city.country,
            countryCode: city.countryCode,
            lat: city.lat,
            lon: city.lon,
            camera,
            channel: channelOut
        };
    });

    const withCamera = out.filter((c) => c.camera.kind !== 'none').length;
    const liveChannels = out.filter((c) => c.channel.state === 'live').length;

    return {
        generatedAt: nowIso(),
        cities: out,
        meta: {
            note: 'Camera screens are measured frames, not streams. A city with no verified public camera says so in words — no placeholder tile.',
            probedAt: nowIso(),
            cameraProbedAt: new Date(cameraCache.at).toISOString(),
            channelProbedAt: new Date(channelCache.at).toISOString(),
            cameraCoverage: `${withCamera} of ${out.length} cities have a verified public camera`,
            channelCoverage: `${liveChannels} of ${out.length} cities have a channel streaming live at the probe time`,
            probeGapMs: PROBE_GAP_MS,
            frameGate: 'a frame must be over 500 B, decode as JPEG, and not be a frame that more than one camera returns'
        }
    };
};

export default fetchCityFeeds;

/* ── the image proxy ───────────────────────────────────────────────────── */

/**
 * The hosts the panel is allowed to ask a frame from. A proxy that will
 * fetch any URL is a request-forger, so the list is closed and it is the
 * same list the probes use.
 */
const IMAGE_ALLOWLIST = new Set([
    'camera1.iticfoundation.org',
    'images.data.gov.sg',
    'api.notis.vn',
    'infobanjirjps.selangor.gov.my',
    'opencctv.org'
]);

export const isAllowedCityImage = (rawUrl) => {
    let url;
    try {
        url = new URL(String(rawUrl));
    } catch {
        return false;
    }
    if (url.protocol !== 'https:') return false;
    if (!IMAGE_ALLOWLIST.has(url.hostname)) return false;
    // no credentials in the URL, no port games
    if (url.username || url.password) return false;
    if (url.port && url.port !== '443') return false;
    return true;
};

/**
 * Fetch one camera frame for the browser.
 *
 * Some sources send `Cross-Origin-Resource-Policy: same-origin`, and a
 * browser then refuses the image outright — opencctv.org does exactly this.
 * The server can fetch it; the browser cannot. So the panel asks the server
 * for the bytes and the frame is displayed from our own origin.
 *
 * The content type is decided by what the bytes ARE, not by what the source
 * claimed: one source labels its JPEG `application/octet-stream`, and a
 * browser with `nosniff` will not paint that as an image.
 */
export const fetchCityImage = async (rawUrl) => {
    if (!isAllowedCityImage(rawUrl)) {
        return { ok: false, status: 400, error: 'host not allowed' };
    }
    const probed = await probeUrl(String(rawUrl), { timeout: TIMEOUT_MS });
    if (!probed.ok) {
        return { ok: false, status: probed.status || 502, error: probed.error || 'upstream did not answer' };
    }
    const isJpeg = probed.dims !== null;
    return {
        ok: true,
        status: 200,
        contentType: isJpeg ? 'image/jpeg' : (probed.contentType || 'application/octet-stream'),
        bytes: probed.bytes,
        body: probed.body
    };
};
