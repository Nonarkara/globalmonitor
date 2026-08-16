# TODO — Asia revamp + global.nonarkara.org fixes

Decisions (Dr Non, this session):
- **Transform**, don't fork: this codebase becomes the Asia dashboard → `asia.nonarkara.org`.
  Middle East stays served at `global.nonarkara.org` (separate deployment).
- **Gulf-as-energy-lifeline**: keep Hormuz/oil, reframed as Asia's energy artery
  (Gulf → Asian refineries) rather than a war theater. Do NOT delete those panels.

## A. Cross-cutting fixes (benefit every deployment)
- [ ] A1 depa logo broken. Root cause: asset filename `Logo depa-01.png` contains a
      SPACE; on the global.nonarkara.org build the request falls through the SPA
      catch-all and returns index.html (2723 B of HTML rendered as an image → broken
      icon). Rename to `depa-logo.png`, update refs. Permanent fix, all deployments.
- [ ] A2 Composition / comprehension. Map is drowned by oversized opaque flight icons
      that bury the actual conflict + fire data. Reduce visual weight so the signal
      layer reads first.
- [ ] A3 Dead panels: several bottom cards sit on "Connecting to live feeds…" forever
      and LiveTV shows "This video is unavailable" ×4. Empty states must not occupy
      prime real estate (project CLAUDE.md hard-reject: "Awaiting data… forever").
- [ ] A4 Header truncation: threat label renders as "ELEVA…".

## B. Asia transform
- [ ] B1 `src/data/regions.js` — add `eastasia` + `southasia` (view states, country
      dots, news queries, TV). Reframe `middleeast` label → Gulf energy lifeline.
      Retire the `global` UI tab (keep the 'global' *data* key — flights/vessels use it).
- [ ] B2 Data layer — add the two theaters to each `THEATER_BBOX` map
      (10 × server/lib/*.mjs + functions/_lib/vessels.mjs, aisSnapshot.mjs).
- [ ] B3 Branding — index.html title/meta, header, manual modal, sidebar.

## C. Ship
- [ ] C1 `npm run build` + `npm run deploy:pages`
- [ ] C2 Attach `asia.nonarkara.org` custom domain
- [ ] C3 Verify live: theaters switch, logo renders, map legible

## Notes
- 3 live deployments of this app exist and drift: Pages (`globalmonitor.pages.dev`
  + `globalmonitor.nonarkara.org`, bundle DN6UjFm8), Fly (`globalmonitor.fly.dev`,
  C9kO43wa, deploy blocked on Fly billing), and whatever serves
  `global.nonarkara.org` (CvR_YMVQ, Cloudflare-proxied). A1 fixes the logo in source;
  global.nonarkara.org still needs its own redeploy to pick it up.

## Review
