/**
 * JAXA Himawari-9 aerosol optical thickness (AOT). Their tile CGI sends no
 * Access-Control-Allow-Origin header, so the browser can't fetch it directly —
 * same reason /api/terrain proxies AWS terrain tiles below. We proxy both the
 * latest-date lookup and the tile bytes through our own backend. y is passed
 * straight through, not negated — JAXA's own OpenLayers viewer sends y={-y},
 * but that's a workaround for their own OL tileGrid setup, not the CGI's real
 * convention: verified against real z=3/x=6/y=4 imagery, positive y returns
 * actual aerosol data, negated y returns a blank tile.
 * Mirrors functions/_lib/jaxaAerosolWorker.mjs (Cloudflare Pages Functions,
 * prod) — see that file's dual-backend note.
 */
let dateCache = { date: null, at: 0 };
const DATE_TTL_MS = 10 * 60 * 1000;

const VER = '031';

async function resolveLatestAotDate() {
    if (dateCache.date && Date.now() - dateCache.at < DATE_TTL_MS) {
        return dateCache.date;
    }

    const res = await fetch('https://www.eorc.jaxa.jp/cgi-bin/ptree/tilemap/getAllLatest_v3r2.cgi', {
        signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`JAXA getAllLatest ${res.status}`);

    const data = await res.json();
    const date = data?.latest?.L2_AOT?.date;
    if (!date) throw new Error('JAXA: no L2_AOT date');

    dateCache = { date, at: Date.now() };
    return date;
}

export async function getJaxaAerosolTiles() {
    const date = await resolveLatestAotDate();
    return {
        tiles: ['/api/jaxa-aerosol-tile/{z}/{x}/{y}'],
        maxzoom: 6,
        attribution: 'JAXA EORC / Himawari-9 P-Tree',
        date,
        fetchedAt: new Date().toISOString()
    };
}

/** Fetches one tile's PNG bytes. Throws on upstream failure — the caller
 * (server/index.mjs) turns that into a 502. */
export async function getJaxaAerosolTilePng(z, x, y) {
    const date = await resolveLatestAotDate();
    const base = 'https://www.eorc.jaxa.jp/cgi-bin/ptree/tilemap/tilemap_aersol_v4r1.py';
    const upstreamUrl = `${base}?z=${z}&x=${x}&y=${y}&date=${date}&prd=AOT&term=T10m&ver=${VER}&min=0&max=4`;

    const res = await fetch(upstreamUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`JAXA tile ${res.status}`);

    return Buffer.from(await res.arrayBuffer());
}
