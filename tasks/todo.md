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

OPEN:
- [ ] A2/A3 composition on global.nonarkara.org. Current code is already far
  cleaner than the screenshot showed (map-first layout, lightweight flight
  circles instead of the giant black plane icons, panels behind toggles) — that
  screenshot is a STALE build. global.nonarkara.org is NOT any of the 58 Pages
  projects nor a Worker in this account, so its origin is still unidentified; it
  needs either a redeploy from its real source or repointing at Pages.
