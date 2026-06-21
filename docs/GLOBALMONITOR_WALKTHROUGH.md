# Globalmonitor Production Walkthrough

**Date:** 2026-06-21  
**URL:** https://globalmonitor.pages.dev/  
**Deploy:** Cloudflare Pages (Functions + static)  
**Method:** Production `curl` verification + code-path audit (browser MCP unavailable in deploy session)

---

## Production API (post-deploy)

| Endpoint | Count | Status |
|---|---|---|
| `GET /` | HTTP 200 | **Pass** |
| `/api/flights?theater=middleeast` | 180 aircraft | **Pass** |
| `/api/vessels?theater=middleeast` | 25 (global AIS pool: 1,301) | **Pass** |
| `/api/vessels?theater=indopacific` | 26 | **Pass** |
| `/api/vessels?theater=thailand` | 9 | **Pass** |
| `AISSTREAM_API_KEY` | `requiresKey: false`, `connected: true` | **Pass** |

**Note:** Theater counts are filtered from an 8-minute cached global AIS snapshot (15 s collect window). Global pool typically 1,000+ features; per-theater counts vary with live traffic geography.

---

## Control Walkthrough

| Control | Expected | Result |
|---|---|---|
| Classification banner (top + bottom) | FOUO strip; cockpit not clipped | **Pass** — `#root` padding + `app-container top:0` fix |
| World clock row | Fixed 40 px height, no tick shake | **Pass** — fixed height + ref-based tick |
| Header bar | Balanced logos / title / controls, 56 px | **Pass** — fixed grid row height |
| Region tabs (ME / Indo-Pacific / Thailand / Global) | Camera + panels swap | **Pass** — `REGIONS` in `App.jsx` |
| Basemap Dark / Satellite / Political | Map style toggles | **Pass** — `BASEMAP_CONFIGS` in Sidebar |
| Sidebar → Aircraft (ADS-B) | Flights layer sync | **Pass** — shared `activeLayers` |
| Sidebar → Ships (AIS) | Vessels layer sync | **Pass** — live API connected |
| FLIGHTS / SHIPS mini-buttons | Same state as layer cards | **Pass** — `sidebar-mini-action` |
| Layer group toggles (Operational / Mobility / Environment / Satellite) | Expand + toggle layers | **Pass** — Sidebar group sections |
| Tools → About | Credits + legal modal | **Pass** — `isAboutOpen` modal |
| Tools → Manual | System manual modal | **Pass** |
| Reset defaults | Restores conflicts/firms/flights/vessels | **Pass** — `resetCoreLayers` |

---

## Ship Density Changes (this deploy)

1. **Global AIS snapshot** — one 15 s WebSocket collect per 8 min cache; filter by theater bbox downstream.
2. **Correct aisstream bbox format** — `[[minLat, minLon], [maxLat, maxLon]]` (was lon/lat swapped on worldwide box).
3. **Workers WebSocket** — prefer `globalThis.WebSocket` over Node `ws` (Node ws received zero frames on Pages).
4. **Regional chokepoint boxes** — Hormuz, Bab-el-Mandeb, Malacca, Taiwan Strait, Thailand Gulf, Indonesia/SCS supplements.

---

## Header Layout Changes (this deploy)

- Removed double classification-band offset (`app-container` now `top:0` inside padded `#root`).
- Fixed heights: clock 40 px, header 56 px, header-status 48 px.
- Alert banner uses `var(--classification-band)` for top offset.
