# TODO — Asia revamp + global.nonarkara.org fixes

Decisions (Dr Non, this session):
- **Transform**, don't fork: this codebase becomes the Asia dashboard → `asia.nonarkara.org`.
  Middle East stays served at `global.nonarkara.org` (separate deployment).
- **Gulf-as-energy-lifeline**: keep Hormuz/oil, reframed as Asia's energy artery
  (Gulf → Asian refineries) rather than a war theater. Do NOT delete those panels.

## A. Cross-cutting fixes (benefit every deployment)
- [x] A1 depa logo broken. Root cause: asset filename `Logo depa-01.png` contains a
      SPACE; on the global.nonarkara.org build the request falls through the SPA
      catch-all and returns index.html (2723 B of HTML rendered as an image → broken
      icon). Rename to `depa-logo.png`, update refs. Permanent fix, all deployments.
- [ ] A2 Composition / comprehension. Map is drowned by oversized opaque flight icons
      that bury the actual conflict + fire data. Reduce visual weight so the signal
      layer reads first.
- [ ] A3 Dead panels: several bottom cards sit on "Connecting to live feeds…" forever
      and LiveTV shows "This video is unavailable" ×4. Empty states must not occupy
      prime real estate (project CLAUDE.md hard-reject: "Awaiting data… forever").
- [x] A4 Header truncation: threat label renders as "ELEVA…".

## B. Asia transform
- [x] B1 `src/data/regions.js` — add `eastasia` + `southasia` (view states, country
      dots, news queries, TV). Reframe `middleeast` label → Gulf energy lifeline.
      Retire the `global` UI tab (keep the 'global' *data* key — flights/vessels use it).
- [x] B2 Data layer — add the two theaters to each `THEATER_BBOX` map
      (10 × server/lib/*.mjs + functions/_lib/vessels.mjs, aisSnapshot.mjs).
- [x] B3 Branding — index.html title/meta, header, manual modal, sidebar.

## C. Ship
- [x] C1 `npm run build` + `npm run deploy:pages`
- [x] C2 Attach `asia.nonarkara.org` custom domain
- [x] C3 Verify live: theaters switch, logo renders, map legible

## Notes
- 3 live deployments of this app exist and drift: Pages (`globalmonitor.pages.dev`
  + `globalmonitor.nonarkara.org`, bundle DN6UjFm8), Fly (`globalmonitor.fly.dev`,
  C9kO43wa, deploy blocked on Fly billing), and whatever serves
  `global.nonarkara.org` (CvR_YMVQ, Cloudflare-proxied). A1 fixes the logo in source;
  global.nonarkara.org still needs its own redeploy to pick it up.

## Review — shipped 2026-08-16

DONE & live on globalmonitor.pages.dev (deployment d2ea3f4d):
- Asia transform: 5 theaters (SE Asia / East Asia / South Asia / Thailand / Gulf
  Lifeline). Verified in a real browser: camera flies per theater, anchors render
  (ASEAN blue / East Asia pink / South Asia violet), new bboxes return live data.
- depa logo fixed at the root: filename had a SPACE -> renamed `depa-logo.png`.
  Verified live: HTTP 200, 34528 B (was serving 2723 B of index.html as a "PNG").
- "ELEVA..." truncation fixed (9ch -> 13ch; `ch` ignores letter-spacing).
- Opening camera was hardcoded to the Gulf while the tab said Southeast Asia —
  now derived from the region registry so they cannot drift apart.
- Rebranded: "Asia Political Dashboard — AsiaWatch".
- Rebased onto 6 upstream flight/vessel commits that landed mid-work, so the
  deploy carries their fixes too (an earlier deploy of mine briefly did not).

- [x] C2 `asia.nonarkara.org` is LIVE — HTTP 200, serving "Asia Political
  Dashboard — AsiaWatch", depa logo 200/34528 B. The wrangler OAuth token is
  Workers/Pages-scoped and cannot write DNS (10000 Authentication error), so the
  CNAME (asia -> globalmonitor.pages.dev, Proxied) was added through the
  dashboard once Dr Non re-authenticated. Cloudflare still shows the domain
  "pending" while it finishes cert validation; the site already serves HTTPS.
  NOTE for next time: the Cloudflare DNS modal closes whenever automation makes
  a separate round-trip, and a OneTrust cookie overlay intercepts clicks. The
  reliable path is ONE async in-page routine that opens the form, sets the type,
  fills, and saves without returning control in between. A DNS-scoped API token
  would remove this whole class of problem.

## Review — global.nonarkara.org repointed 2026-08-17

The mystery is solved and closed. `global.nonarkara.org` was never a Pages
project or a Worker — it was a **Cloudflare Tunnel record** (`city-reporter`),
i.e. served off a local machine. That machine had stopped answering for this
one route, so Cloudflare kept serving a frozen cached build from months ago
(bundle `CvR_YMVQ`) and 522'd on anything not in cache — which is exactly why
the depa logo 404'd and the composition looked stale. Nothing was wrong with
the source; the site was a ghost.

Fix: gave it a real deployment instead of a dead tunnel.
- New worktree `v3-middleeast` on branch `middleeast`, cut from `f5ba1f9` —
  the last commit before the Asia pivot. It keeps the four Middle East
  theaters, the map-first layout and the lightweight flight markers, and
  carries all six upstream flight/vessel fixes.
- Ported the two fixes that are not Asia-specific: `depa-logo.png` rename
  (A1) and the `9ch -> 13ch` gauge fix (A4).
- New Pages project `globalmonitor-me`; DNS record changed from
  `Tunnel -> city-reporter` to `CNAME -> globalmonitor-me.pages.dev` (Proxied).

Verified live, in a real browser, not just curl: bundle is `BkXeLqNv` (the new
one) on every hit, all four sponsor logos load including depa (34528 B, was
2723 B of HTML), map canvas renders 3334x1464, four theaters present, and
/api/escalation returns 200 for all four.

The `city-reporter` tunnel is untouched and still serves its six other
hostnames (cdp, chula-api, kmitl-api, nst-api all 200) — only `global` was
pulled off it. Separately noticed: `api.chula.nonarkara.org` fails to connect
entirely. Pre-existing, unrelated to this work, but someone should look.

Also closed the MEM single point of failure: `v2-standalone/app.js` pointed at
`globalmonitor.fly.dev`, a host whose deploys are blocked on Fly billing — if
it broke we could not have patched it. Now points at
`global.nonarkara.org/api`. All six endpoints MEM calls (acled, escalation,
firms, fronts, markets, ticker) verified 200 with `Access-Control-Allow-Origin: *`
before the switch. mem.nonarkara.org confirmed live afterwards: 90 tiles,
59 markers, real news/markets/fronts, zero empty states.

A2/A3 (composition) are resolved by consequence — the current code was already
map-first with lightweight markers; only the frozen build looked bad.

NOTE for next time, still true: the wrangler OAuth token is Workers/Pages-scoped.
It cannot write DNS **or purge cache** (both 10000 Authentication error). A
zone-scoped token would remove this whole class of problem. The dashboard
workaround that works: one async in-page routine that opens the form, sets the
value with the native setter, and saves without returning control in between.
A Tunnel record is a CNAME underneath, so retargeting its `target` textarea is
enough — no need to delete and recreate.

OPEN:
- [ ] Two Thailand panels in globalmonitor still carry `// AGENT-QUESTION:`
  markers (`LiveMediaPanel.jsx`, `StrikeStatsPanel.jsx`) — delete vs wire is
  Dr Non's call.

## Review — the four sites, sorted 2026-08-17 (second pass)

Dr Non's brief: globalmonitor = "my best system, flights/ships/TV — bring it back";
asia = Asia; global = "just a map, make it useful and unique"; mem = legacy, improve.

**Where the best system actually lived.** Not in this repo. It was
`Nonarkara/globalmonitor-v3` (remote `v3`), main at 5d3fd20 — the Dieter Rams
light instrument panel with per-theater live traffic, GPD Oracle, sanctions,
TV. It ran as a local Node server behind a Cloudflare Tunnel on another
machine; the tunnel died, so global.nonarkara.org served a frozen build and
everything else here was the newer map-first lineage. Nobody "removed" it —
it was on a laptop that stopped answering.

**Why the planes vanished everywhere.** airplanes.live started returning 403
to unregistered callers ("Please contact us…"). Every branch's flight layer
died at once; Pages fell back to a committed snapshot labelled stale (that is
the "many planes" he saw in the morning — a photograph). Fix: the loader now
falls through to adsb.lol (same readsb v2 API, keyless) — verified answering
from the Cloudflare edge — with an 11 s wall per theater fetch and the
snapshot as last resort. meta.source names the host that actually answered.

**Plumbing now (all Cloudflare Pages, nothing on a laptop):**
- `globalmonitor` project ← repo globalmonitor-v3 (worktree `v3-classic`,
  branch `classic` → v3/main). Domains globalmonitor.nonarkara.org +
  globalmonitor.pages.dev. Keeps the three bound secrets (Airlabs key exists
  ONLY there). Verified in a real browser: 186–229 aircraft over the Gulf,
  1,200 ships, all four logos, TV, Oracle.
- `asiawatch` project ← this repo main. asia.nonarkara.org moved here (domain
  detached/attached via API, DNS CNAME edited in the dashboard). AISSTREAM +
  VESSELFINDER secrets re-bound from .env.local; Airlabs not recoverable.
  `npm run deploy:pages` on main now targets asiawatch — deploying main to
  `globalmonitor` again would overwrite the flagship.
- `globalmonitor-me` project ← branch `middleeast` (worktree `v3-middleeast`).
  global.nonarkara.org. Reframed as the world console: opens on the Global
  theater, intel column + market strip docked on desktop, live air + sea
  traffic on by default, flat camera. Verified headless: 1,200 planes and
  ships worldwide, decoded headlines.
- `mem-by-non` unchanged today beyond earlier fixes; its API base is
  global.nonarkara.org/api.

**Cross-branch fixes shipped to all three React builds:** adsb.lol fallback +
deadline; RSS entity decoding at the parser (Yemen&#039;s → Yemen's); Sky News
Arabia stream went private → Sky News EN channel embed; ADS-B label credits
adsb.lol; traffic cap 300 → 1200 on main/ME.

**Axiom card #24** now links globalmonitor.nonarkara.org, shows a fresh
screenshot of the live instrument panel, and says four theaters (EN/TH/ZH).

**Known limits, stated honestly:**
- main/ME frontends fetch flights once for the whole world and skip the
  worldwide live path on the edge → they show the stale snapshot (1,200 of
  ~2,000, labelled). Classic fetches per theater and is truly live. If Asia
  should be truly live too, the fix is per-theater fetching in MapContainer.
- Cold-edge flight calls take 10–24 s; client timeout for /api/flights and
  /api/vessels raised to 30 s on classic. First paint may take a moment.
- OPENSKY_CLIENT_SECRET is empty locally; with it bound, authenticated
  OpenSky would be a second live source on the edge. Only Dr Non can fetch it.
- The wrangler OAuth token still can't write DNS or purge cache. Every DNS
  edit today went through the dashboard with the one-shot in-page routine.

## D. Data-honesty remediation (2026-09-03, from the two audits)
Rule: no number reaches a viewer wearing a provenance it does not have.
- [x] D1 Envelope: useCached derives X-Tech-Status 'sample' from payload source; X-Tech-Source header; hook exposes source/status/isSample; DataStatus isDemo badge
- [x] D2 ACLED: demo source label on collection + features; no theater bridging; upsert guard (no demo rows in Supabase); popup Source row
- [x] D3 FIRMS: sample generator deleted (fake satellite + Math.random brightness); empty labelled layer; outage throws → STALE
- [x] D4 Humanitarian: invented displacement literals deleted; year on payload; pagination; panel uses service layer, no ×12000 estimator, window-based rate
- [x] D5 Escalation: theater passthrough; empty-array = offline; availableMax; oil not double-counted; null → stale stamp on both servers
- [x] D6 Fronts + strike stats: no-signal instead of 7 STABLE; sample fires excluded; strike stats pure + deduped; 24h window enforced
- [x] D7 probeCog host allowlist + 400 on both servers
- [x] D8 Deploy collision: both workflows → asiawatch; CI audit last; ACLED_EMAIL documented
- [x] D9 tests/data-honesty.test.mjs — the conservation law as assertions
- [ ] D10 EscalationGauge: accept NO DATA payload, show /availableMax, age, sample band text
- [ ] D11 MultiFrontBoard: handle fronts:[] + reason; label thermal not fires
- [ ] D12 SourceHealthModal: DEMO state, checkedAt
- [ ] D13 Map legend rows for FIRMS/ACLED; flights snapshot stamp (port classic); vessel snapshot source string
- [ ] D14 Reference panels AS OF stamps (arms/nuclear/sanctions/keyFigures/refugee/intlResponse/hormuz/warCost)
- [ ] D15 Charts: oil (source badge, axis from data, pins in range), sentiment (query+window), market (null change)
- [ ] D16 News panels: LIVE from __meta.status; drop sliceStart; maritime triage label
- [ ] D17 Port to middleeast + classic; OWM key removal on both; middleeast workflow → globalmonitor-me
- [ ] D18 v1-basic: delete random tickers; v2-standalone: fronts fallback + null score
- [ ] D19 Build, deploy all three, verify live headers; restore stashed WIP
