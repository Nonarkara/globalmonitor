# How Global Monitor works

Companion to the public [README](../README.md). This page is the longer architecture note so the README can stay civic, not a dump of endpoints. Only fetchers and routes that exist in `server/` and `functions/` are listed.

## Shape

```
External open feeds
  ACLED, NASA FIRMS, NASA GIBS, GDELT, EIA, USGS,
  OpenSky / AirLabs / ADS-B, AIS (aisstream or Axiom Overwatch),
  RSS / ReliefWeb / UNHCR, Open-Meteo, Copernicus (optional)
        │
        ▼
server/lib/*.mjs          local Node API (port 4000)
functions/_lib/*.mjs      Cloudflare Pages Functions (same-origin /api)
        │
        ▼
useCached(key, ttl, loader, validator)
  in-memory Map, TTL, stale fallback, X-Tech-* headers
        │
        ▼
/api/* JSON
        │
        ▼
src/services/*.js  →  useLiveResource (localStorage, retry, stale badge)
        │
        ▼
MapLibre map + React panels
  DataStatus shells stay visible when a feed is down
```

Production: Cloudflare Pages serves `dist/` and `functions/`. Local: `npm run dev:stack` (Vite **5180**, API **4000**, `/api` proxied). The frontend keeps browser-side fallbacks so the layout does not punch holes when the API is away.

## What is measured, what is modelled

| Kind | Examples in this repo | Treat as |
| --- | --- | --- |
| Observation | NASA FIRMS, NASA GIBS tiles, USGS quakes, AIS, ADS-B, Open-Meteo | Measured, with sensor and reporting bias |
| Coded event | ACLED, ReliefWeb / UNHCR, GDELT tone | Human- or machine-coded from public reporting |
| Compiled | Sanctions, nuclear sites, actor networks, war-economy JSON under `src/data/` | Analyst-curated snapshots |
| Modelled | TimesFM event-count forecast (`public/data/timefm/`), AlphaEarth change (`public/data/alphaearth/`), escalation composite | Model output — not official intelligence |

The in-app Data Provenance modal reads [`src/data/dataSources.json`](../src/data/dataSources.json). Reliability ratings there are editorial, not a government grade.

## Optional credentials

All keys are optional. Template: [`.env.example`](../.env.example). Obtain them from the named public providers; do not scrape or guess.

| Variable | Enables when set |
| --- | --- |
| `COPERNICUS_CLIENT_ID` / `COPERNICUS_CLIENT_SECRET` | Sentinel-2 L2A area preview (`/api/copernicus/preview`) — otherwise the UI uses public EO fallbacks |
| `AISSTREAM_API_KEY` | Live AIS WebSocket on the **local** Node API only |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | Authenticated OpenSky |
| `AIRLABS_API_KEY`, `AVIATIONSTACK_API_KEY`, `AVIATION_EDGE_KEY` | Quota-limited flight supplements, cached server-side |
| `ACLED_API_KEY`, `EIA_API_KEY`, `FIRMS_MAP_KEY` | Direct provider pulls (public or snapshot fallbacks exist) |
| `GM_SUPABASE_*`, `GOOGLE_SHEETS_*` | Optional recording — not required to render the map |

Never expose secrets as `VITE_*`. Pages Functions read host-dashboard bindings.

Copernicus preview query params that exist in code: `theater` (`middleeast` or `depa`), `bbox` (`west,south,east,north` in EPSG:4326), `preset` (`true-color` or `ndvi`), optional `from` / `to` / `lookbackDays` / `maxCloudCoverage` / `width` / `height`. It is an area preview, not a slippy-map tile service. Cache TTL is 20 minutes on the local API.

## Production caveats (as implemented)

- **AIS WebSocket** needs a long-running Node process. Cloudflare Pages uses the Axiom Overwatch REST snapshot when that collector is unavailable; VesselFinder is an optional fleet overlay, not a global map.
- **Flights** prefer cache-first behaviour to protect free quotas. `npm run refresh:flights` writes a geographically spread OpenSky snapshot used when live providers throttle.
- **Airports** are public-domain OurAirports data, regenerated with `npm run refresh:airports`.
- Isolate memory on Pages is empty on a cold start. Heavy layers therefore also ship snapshot files under `public/data/`.

Deploy: GitHub Actions (`.github/workflows/cloudflare-pages.yml`) builds with empty `VITE_API_BASE_URL` and deploys to Pages project **`globalmonitor`**. The npm script `deploy:pages` currently names project **`asiawatch`** — keep those two facts straight when you fork.

## Related notes in this tree

- [`docs/human-walkthrough-2026-06-20.md`](human-walkthrough-2026-06-20.md) — Rams-style usability pass
- [`docs/GLOBALMONITOR_WALKTHROUGH.md`](GLOBALMONITOR_WALKTHROUGH.md) — production control walkthrough
- [`src/data/legalCopy.js`](../src/data/legalCopy.js) — About, OSINT disclaimer, PDPA (including Thai summary)
- [`src/data/originEssay.js`](../src/data/originEssay.js) — origin essay and research basis
