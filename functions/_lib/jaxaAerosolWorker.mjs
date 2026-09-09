let dateCache = { date: null, at: 0 };
const DATE_TTL_MS = 10 * 60 * 1000;

// ver='031' is JAXA's current AOT product version (fallback '030' per their own
// client: https://www.eorc.jaxa.jp/ptree/js/himawariMonitor_v3r4.js). Bump here
// if JAXA retires 031 and every tile 404s.
const VER = '031';

async function resolveLatestAotDate() {
    if (dateCache.date && Date.now() - dateCache.at < DATE_TTL_MS) {
        return dateCache.date;
    }

    const res = await fetch('https://www.eorc.jaxa.jp/cgi-bin/ptree/tilemap/getAllLatest_v3r2.cgi', {
        headers: { Accept: 'application/json', 'User-Agent': 'globalmonitor-pages/1.0' }
    });
    if (!res.ok) throw new Error(`JAXA getAllLatest ${res.status}`);

    const data = await res.json();
    const date = data?.latest?.L2_AOT?.date;
    if (!date) throw new Error('JAXA: no L2_AOT date');

    dateCache = { date, at: Date.now() };
    return date;
}

/** Metadata for the frontend: a tile URL template pointing at OUR OWN tile-proxy
 * route below (jaxa-aerosol-tile), not at JAXA directly — MapLibre GL fetches
 * raster tiles via fetch(), which enforces CORS, and JAXA's tile CGI sends no
 * Access-Control-Allow-Origin header. Also lets us fix a broken token: their
 * own OpenLayers viewer sends y={-y} (negated), but that's a workaround for
 * their own OL tileGrid setup, not the CGI's real convention — verified
 * against real z=3/x=6/y=4 imagery: positive y returns actual aerosol data,
 * negated y returns a blank tile. We just pass y straight through. */
export async function getJaxaAerosolTilesWorker() {
    const date = await resolveLatestAotDate();
    return {
        tiles: ['/api/jaxa-aerosol-tile/{z}/{x}/{y}'],
        maxzoom: 6,
        attribution: 'JAXA EORC / Himawari-9 P-Tree',
        date,
        fetchedAt: new Date().toISOString()
    };
}

/** Proxies one tile: fetches the real PNG from JAXA and streams it back
 * same-origin. Returns a Response directly — no client-controlled host, only
 * integer z/x/y, so no open-proxy allow-list needed. */
export async function getJaxaAerosolTilePngWorker(z, x, y) {
    const date = await resolveLatestAotDate();
    const base = 'https://www.eorc.jaxa.jp/cgi-bin/ptree/tilemap/tilemap_aersol_v4r1.py';
    const upstreamUrl = `${base}?z=${z}&x=${x}&y=${y}&date=${date}&prd=AOT&term=T10m&ver=${VER}&min=0&max=4`;

    const res = await fetch(upstreamUrl);
    if (!res.ok) throw new Error(`JAXA tile ${res.status}`);

    return new Response(res.body, {
        status: 200,
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=600',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
