# Separate historical-host repair — 22 October 2026

Status: original repair approved on 22 October; isolated implementation started. Paused for the dependency amendment below. This is separate from the shipped current-suite release, as the owner requested. Do not redirect this site or deploy a current dashboard over it.

## Evidence and target

- Public URL: `https://middleeast.nonarkara.org/`, HTTP 200 in this session.
- Cloudflare Pages project: `middle-east-monitor` (not `middleeast-monitor`, the repaired War Monitor).
- Canonical host: `middle-east-monitor-9ue.pages.dev`.
- Production deployment: `3e74f832`, source commit `f670780`, branch `main`, six months old. The source commit exists in the shared local git database.
- At 1024px, the map starts at y564 and is315px tall. At390px, header151px; map starts at y497 and is225px tall. No horizontal overflow or uncaught exception in this short trial, but the map loses the first screen.
- Numerous panels open by default. Partner logos have brightness/invert filters in the archived App.jsx. Legacy basemap imagery still uses CARTO.
- Visitor counter is not a raw observation: `src/services/visitorTracker.js` defines `BASE_COUNT = 88888` and adds it to the returned count. The UI does not qualify that artificial offset.
- Screenshots: `.qa/live-suite-live/historical-1440.png`, `historical-1024.png`, `historical-390.png`.

## User review required

Approve a separate repair retaining the historical dashboard's component set, identity, maps and authored content. Do not redirect to the flagship. The explicit backend, if needed, will be the existing public read-only flagship API, after payload-contract checks; no new API provider or secret provisioning.

## Sacred items

Keep live maps, chronology, tickers, network view, actors, all panels, sponsor credits and About/legal material accessible. No file reduced by over30%. Preserve the current suite's branches and production slots. Use an isolated checkout from the verified historical source; never deploy an arbitrary current branch to this host.

## Proposed files

- [MODIFY] historical `src/App.jsx`: explicit Layers/Intel/Markets doors, no default open panels; preserve existing panel contents and world clock; one compact sponsor strip with natural logo colours.
- [NEW] historical `src/styles/operational-shell.css`: map-first layout, bounded bars, edge drawers and phone reflow. Import last from the historical entry point.
- [MODIFY] historical `src/services/visitorTracker.js`: remove the artificial88,888 offset; unavailable counts must remain unavailable, not zero or a fabricated baseline. Preserve authored visitor functionality only where its actual data contract is verified.
- [MODIFY as required by contract checks] historical `src/services/backendClient.js` and `src/hooks/useOnlineStatus.js`: explicit backend resolver with source/tier/age retained. Do not mask unsupported endpoints with plausible fallback numbers.
- [MODIFY] historical `src/components/MapContainer.jsx`: replace rejected key-required tile sources with the already verified free Esri configuration; preserve geographic layers and source attribution.
- [NEW] historical `STYLE.md`, `ANTI-SLOP.md`, tests and release scripts: record the chosen identity; gate child containment, source qualification, actual tile pixels and API origins.
- [NEW] explicit deployment configuration targeting only Pages project `middle-east-monitor`; production branch must be confirmed before deploy.

## Verification

Build and unit tests; scan source; render1440/1024/390/320 and CSS breakpoint neighbours; open and close every drawer; keyboard/Escape and modal return; inspect tiles; distinguish observations, snapshots and unavailable sources. Reintroduce the squeezed-map and artificial-counter defects and require guards to fail. Independent review, attributed commit, push, correct project deploy, canonical/custom byte checks and live task trial.

This audit does not certify the historical backend, source freshness, all translations, physical devices or dependencies. A dependency/security or API-schema problem that changes the repair boundary needs a revised plan, not a silent rewrite.

## Amendment requiring approval: historical map dependencies

Installing the historical lockfile reported 19 npm advisories (2 critical, 11 high, 4 moderate, 2 low). These are package findings, not evidence of an observed attack. Both critical package reports trace to the same MapLibre sanitizer advisory: GHSA-jrc7-96c5-q579. The current lockfile installs MapLibre 3.x; the advisory affects versions through 6.4.0 and lists 6.4.1 as patched. npm proposes 6.15.0, a major upgrade. The vulnerable sanitizer also handles source attribution, so the absence of a Popup component is not sufficient assurance.

Reference: https://github.com/advisories/GHSA-jrc7-96c5-q579

### Proposed additional changes

- [MODIFY] historical `package.json` and `package-lock.json`: update MapLibre to a patched 6.x version (candidate 6.15.0), its React wrapper to the compatible v8 MapLibre entry point, and apply non-breaking advisory fixes. Pin the resolved graph. No `audit fix --force`, no blanket framework rewrite, no package-removal cleanup.
- [MODIFY] historical `src/components/MapContainer.jsx`: adapt only the wrapper import/API changes required by that upgrade. Preserve every geographical source, marker, layer, overlay, interaction and attribution. No large file reduction.
- [NEW] dependency/migration regression tests: assert the resolved map version is patched, inspect attribution handling, exercise basemap switching and all existing layer toggles with no uncaught exceptions, and verify data through supported map APIs rather than private `_data` fields.
- [MODIFY as already required by backend validation] the seven historical specialist API clients must use the shared backend resolver. The existing public flagship `/api/sentiment` currently returns HTML, not its historical JSON contract; show that panel as unavailable rather than fabricate a result or add a provider.

### Release conditions and unchanged boundary

Build, targeted lint, dependency audit and actual-browser migration checks must pass. Any remaining advisory gets an explicit disposition; no claim of a security certification. Independent review must check mobile/desktop layout, keyboard paths, map tiles and open evidence drawers. Deploy remains restricted to `middle-east-monitor`, production branch `main`, followed by canonical and custom-domain verification. The other released dashboards and their deployment slots remain untouched.

Awaiting approval for this additional dependency work. No historical deployment has been made.
