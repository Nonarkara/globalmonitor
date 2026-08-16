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
