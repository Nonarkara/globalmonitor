# GlobeWatch codebase audit — 2026-10-02

## Scope and boundary

Target: `v3-classic`, the flagship deployed to Cloudflare Pages project `globalmonitor`, at `globalmonitor.nonarkara.org`. The sibling `v3-global/main` now serves AsiaWatch; its unrelated uncommitted edits were preserved. Work is isolated on `codex/globewatch-identity-audit`.

Repository-wide inventory covered 153 application/backend/edge files and approximately 23,401 lines before this change. Checks included module syntax, React lint, dependency advisories, dangerous DOM sinks, credential patterns, build output, workflow/runtime compatibility, API routing and caching, data provenance, traffic rendering, static assets, PWA installation/offline behavior, and deployed responsive interactions. High-risk paths received manual review; this is not a claim of line-by-line formal verification or an independent penetration test. Historical political datasets, every external video, real phone installation, and Google Sheet delivery were not independently certified.

## Fixed in this change

1. **Critical dependency advisory:** upgraded MapLibre 3.6 to 6.11.2 and its React adapter to 8.1.3; refreshed compatible dependency patches. `npm audit` reports zero known vulnerabilities. V6 needs explicit Vite `?worker&url` packaging; the first upgrade preview failed to load its worker and was not released to production. A self-contained ES-module worker now loads.
2. **Map error storms:** deduplicate source failures in a ref before dispatching React state, and attach the listener after map readiness. The popup class builder already filters empty tokens; deployed aircraft/ship/airport hover coverage now guards this historical DOMTokenList crash path.
3. **Invalid traffic geometry:** reject missing, non-finite, and out-of-range coordinates before animation/path generation. Old traffic snapshots no longer dead-reckon into fictitious movement.
4. **Old traffic presented as current:** the flight fallback retains its original collection date; an Axiom-attributed AIS file is still a snapshot, not proof of a live connection. Expired vessel files now follow a live REST attempt instead of masking it indefinitely.
5. **Offline data labelled live:** offline API responses preserve original observation age, switch to stale, and preserve sample classification. Cache misses return a defined 503. A missing precache logo path was corrected; cache purging is scoped to this app and API variants are bounded.
6. **Quota fan-out:** edge cache misses for the same key coalesce; cache/health maps are bounded to 400 entries. AirLabs enrichment uses one global six-hour cache with cooldown on failed requests and monthly-limit errors. Visitor-triggered Pages isolates cannot enforce a shared monthly allowance, so they do not spend AirLabs credentials. This is protection, not a completed central enrichment collector.
7. **Cross-theater client state:** changing resource keys resets the displayed payload; late results from an old request generation cannot overwrite the newly selected resource.
8. **Misleading analytic labels:** Oracle sample features do not become observed inputs; baseline assumptions and simulations are explicitly labelled. Headline mention counters show no-data dashes on an empty cache, rather than zero verified strikes. The simulation and counters remain available.
9. **Brand and PWA:** colour mark, full lockup, monochrome print mark, real app icon sizes, Apple icon, Android/iPhone install instructions, portrait-compatible manifest, and current canonical metadata. Original sponsor strip and credits preserved. Transparent-logo pixels and unfiltered CSS checked separately.
10. **Interaction/layout:** Tools dropdown now clears sibling panels' stacking contexts. The timeline's fixed 380px minimum was wider than a 375px phone; it is now viewport-bounded, without deleting the control. Timeline icon buttons and slider gained accessible names.
11. **Build hygiene:** restored the known React-hooks lint fixes from the existing mirror commit, ignored generated Wrangler files, made CI use Node 24 for current Supabase/Vite requirements, and kept deterministic `npm ci` installation.
12. **Airport coverage:** added a user-controlled map layer of 4,349 large or scheduled-service airports from OurAirports, refreshed on this date. Closed airports and empty coordinates are excluded. This is a reference layer, not live airport operational status.

## Remaining findings requiring follow-up

| Priority | Finding | Evidence and next action |
|---|---|---|
| Medium | Ship coverage is partial and fallback remains old | Production verification returned 326 live global AIS positions with `connected:true`, `staticSnapshot:false`, and `aisstream.io+vesselfinder-fleet`; the default Middle East browser response contained three ships. Preview lacks those production bindings and used the 2026-06-23 snapshot. Axiom REST timed out. Pages takes bounded AIS snapshots, not a continuous shared fleet view. For wider coverage, use one always-on collector with a durable shared snapshot; retain stale labels whenever fallback is used. |
| High | AirLabs is not used to its full allowance | Production has an encrypted AIRLABS_API_KEY, but there is no authoritative shared monthly request counter. Do not poll separately from every edge isolate. Use one scheduled collector, durable quota accounting, and a shared enriched flight snapshot. Account quota/remaining balance was not queried. |
| High, conditional on credentials | Public AI/expensive endpoints lack caller authorization and distributed cost controls | `/api/oracle`, `/api/flood/directive`, and query-variant caches can trigger work from arbitrary public requests. Production currently has no Groq secret in the listed bindings, so those narratives use deterministic fallbacks; configuring a paid key would increase exposure. Add input bounds, shared rate limiting, and an explicit access/cost policy before doing so. Single-flight is not a distributed budget. |
| High | Missing intelligence credentials | Live production probes showed FIRMS `sample/no_firms_key` with zero features, and ACLED `sample/demo_offline_no_acled_key` with 16 curated events. Do not call these live. Configure licensed credentials if these are expected to be operational feeds. |
| Medium | Provenance health can describe the wrong theater | `SourceHealthModal` chooses the first key containing a source ID, not an explicit current theater. Health also lives per isolate; the health request may land on a different instance. Bind status to the current payload/theater instead of treating this as global monitoring. |
| Medium | Visitor privacy/retention needs review | Visitor tracking sends IP-derived location, user agent, full URL and referrer to a Sheets webhook without an explicit consent/retention workflow. Preserve required tracking pending a policy decision; review minimization, notice, access and retention. Sheet delivery was not verified. |
| Medium | Latent invented visitor count | Unused `getVisitorCount()` adds a hard-coded 88,888 baseline. Do not wire this into a public total. Replace it with an actual recorded count or an unavailable state. |
| Medium | Static political and operational assumptions need editorial review | Key-figure status, scenario actor parameters, war-cost assumptions and other curated datasets are not automatically current. Require sources/as-of dates and named ownership. Model estimates are not observations. |
| Medium | Global/theater analytic boundaries are incomplete | Oracle's supported actor rosters are regional; unsupported theaters default to Middle East. News signals aggregate cached ticker entries across source sets. Avoid claiming a global forecast or theater-specific signal isolation without further work. |
| Medium | Backend duplication | Node and Pages share fetchers but duplicate route/cache/response shaping. The shipped Pages fixes do not certify the retired Node deployment. Keep a contract test suite across both before reactivating it. |
| Medium | Mobile/accessibility follow-up | New install modal traps focus and restores it; older specialist modals are not comprehensively focus-trapped. Existing dashboard type can be very small on phones, and layer controls are far down the page. No broad redesign was applied during identity integration. |
| Low | Payload/performance | The MapLibre vendor chunk is about 1.06 MB minified, with a separate 508 KB worker; static AIS/flight datasets are substantial. Measure cold mobile performance and consider viewport/durable snapshot delivery. No features were removed to silence the warning. |

## Verification

Local: 25 automated tests pass; lint and production build pass; zero npm advisories; module syntax and diff whitespace checks pass. Deployed browser testing exercises install and About at 1280/768/375 widths, four sponsor images, unfiltered brand images, traffic/airport sources, hover popups, repeated source errors, and service-worker offline timestamp retention. Final production results and exact deployment identity are recorded in the release section below after verification.

## Provider checks

Checked 2026-10-02; documentation, not an uptime guarantee:

- [MapLibre installation](https://maplibre.org/maplibre-gl-js/docs/#installation) documents self-contained Vite worker bundling. [Security advisory](https://github.com/advisories/GHSA-jrc7-96c5-q579) explains the popup sanitizer issue.
- [OurAirports open data](https://ourairports.com/data/) provides the reference airport CSV; its data is public domain.
- [OpenSky REST API](https://openskynetwork.github.io/opensky-api/rest.html) now documents OAuth2, anonymous IP buckets of 400 daily credits, and four credits per global request. The earlier suggestion to poll global positions every 10–15 seconds does not fit that anonymous quota. Local snapshot refresh returned 8,143 positions; edge reachability can differ.
- [AirLabs docs](https://airlabs.co/docs/) documents API-key authentication and monthly-limit errors. The user's stated 1,000/month allowance was not independently confirmed against this account.
- [Data Docked pricing](https://datadocked.com/pricing) advertises 20 trial credits, not ongoing unlimited free AIS. [Area queries](https://docs.datadocked.com/) cost ten credits. It was not activated for automatic polling or charged during this audit.

No API secret values are stored in this report, asset notes, or client code. Keys previously pasted into chat should be rotated through their provider dashboards when convenient; do not publish them.

## Release

Application commit: `81a31ce`, pushed to `origin/codex/globewatch-identity-audit`. Cloudflare production deployment: `5c5c19ea.globalmonitor.pages.dev`, explicitly to project `globalmonitor`, branch `main` (the production slot; no Git main-branch overwrite).

Verified `https://globalmonitor.nonarkara.org/` with `npm run test:browser -- https://globalmonitor.nonarkara.org`: 1280/768/375 widths all fit; one map canvas, four loaded sponsors, install and About flows pass; transparent PNG pixel checks and print symbol pass; aircraft/ship/airport hover paths and 100 repeated source errors pass; no captured application errors; service worker active and offline data marked stale with its original date. Default theater source counts were 480 aircraft, three current ships, and 4,349 airports. These are sampled responses, not fixed global totals.

Nine local assets (entry/preload JS, stylesheet, map worker, brand mark, service worker and manifest) matched SHA-256 body hashes in three consecutive disposable-key probes on `globalmonitor.pages.dev`, then three on `globalmonitor.nonarkara.org`; every response was HTTP 200. No custom-domain production cache key was used before canonical convergence.

Live API checks: global flights HTTP 200, 8,143 positions, `stale/adsb-snapshot`, observation date `2026-10-02T10:42:45.444Z`; global ships HTTP 200, 326 positions, live and connected; FIRMS and ACLED HTTP 200 but explicitly sample/unconfigured; Oracle baseline HTTP 200 and sample, with no observed inputs; strike statistics no-signal. A successful HTTP response is not proof of fresh observations. Real Android/iPhone OS installation, Sheets recording, and continuous provider uptime remain unverified.
