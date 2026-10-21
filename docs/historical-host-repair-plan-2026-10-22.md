# Separate historical-host repair — 22 October 2026

Status: live audit complete; implementation not started. This is separate from the shipped current-suite release, as the owner requested. Do not redirect this site or deploy a current dashboard over it.

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
