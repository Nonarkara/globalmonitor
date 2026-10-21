# Live suite repair plan — 21 October 2026

Status: approved by the owner; implementation and release checks in progress on 22 October 2026.

## User review required

- Approve the surgical repair and shipping scope below.
- Owner approved this plan, including the GlobeWatch backup restoration.
- Restore `https://nonarkara.github.io/globalmonitor/` to the documented GlobeWatch backup identity. It currently serves an older AsiaWatch build. Do not silently choose a different backup owner.
- Existing authored maps, scientific classifications, clocks, tickers, feeds, sponsor credits and legal material stay. This is not a uniform reskin.

## Brief

- Who: public readers and operators using phones, laptops and larger displays.
- Job: inspect geographic evidence and understand its source and age.
- Hierarchy: map first, source qualifications second, optional instruments third.
- Constraints: multiple deployments, old service workers, 320px reflow, long labels and unavailable external feeds.
- Direction: each system's existing chart-table/operations identity, with compact working instruments instead of accidental empty space or stacked chrome.

Invariant: every retained instrument remains reachable and readable without pretending an undated reference is a current observation.

## Observed live evidence

All eight documented public URLs answered HTTP 200 using a Node `fetch` probe with a 20-second timeout. This proves reachability, not health:

| System | Public URLs | Initial finding |
|---|---|---|
| GlobeWatch | globalmonitor.nonarkara.org | Independent reviewer: 768px title/install lockup crosses the clock/header; theater selector becomes unreadable. Main controls and mobile session export worked. |
| AsiaWatch | asia.nonarkara.org | 44px phone header; 53.8px at 1440; map approximately 85–86% of 900px viewport. Existing chrome sweep passed 411 widths, 320–1920. Border module fails readability and provenance. |
| MEM | mem.nonarkara.org; nonarkara.github.io/mem-by-non/ | Visible API KEY REQUIRED tiles on map. Phone screenshot also shows very small labels and a large default news overlay; preserve its deliberate identity while repairing access. |
| War Monitor | nonarkara.github.io/middleeast-monitor/; middleeast-monitor.pages.dev | GitHub version's Map tab has key-required tiles and a 220px map at 390×900. Pages endpoint is a different HTML payload and requires its own full interaction check. |
| Static backup | nonarkara.github.io/globalmonitor/ | AsiaWatch title rather than documented GlobeWatch identity; 270px header at 390px and 349px at 320px; overlapping map labels/instruments and unavailable feeds. |

Primary screenshots: `.qa/live-suite-2026-10-21/` in the AsiaWatch worktree. GlobeWatch/World Console independent review evidence is separate.

### Associated border monitor

Confirmed embedded in AsiaWatch's Thailand theater, not yet identified as a separate standalone public site. Live path: Choose theater → Thailand → Intel. At phone width its dark hard-coded card uses nearly black text, and its heading wraps across several lines.

`src/data/thailandBorders.js` supplies fixed risk scores 82/58/65 and checkpoint statuses NORMAL/ALERT/MONITORED, without observation dates or source records. `ThailandBorderConflictTracker.jsx` presents these as risk/early-warning monitoring. Retain geographic locations and authored context, but qualify unverified assessments explicitly; do not invent a live feed.

The AsiaWatch Intel drawer also showed Gulf/Yemen stories under regional headings including Myanmar and South China Sea. Reproduce and trace the regional filtering/fallback before deciding on a fix.

## Sacred items and anti-regression

- No map, canvas, ticker, chart, live instrument or earned content deleted.
- No file reduced by more than 30% without separate approval.
- Protect deliberate choices recorded in each current STYLE.md; raise genuine access conflicts rather than silently erasing them.
- Keep one sponsor strip, PMUA first/largest, all credits and About content.
- Preserve unrelated concurrent changes in flight snapshots, city-feed code and truthfulness tests.
- No keys in source, reports, logs or screenshots.

## Proposed changes

### GlobeWatch

- [MODIFY] `/Users/nonarkara/Projects/conflict-tracker/v3-classic/src/styles/operational-shell.css` — fit title, install affordance, clock and controls at intermediate widths; preserve phone touch targets and theater readability.
- [MODIFY if needed] `/Users/nonarkara/Projects/conflict-tracker/v3-classic/src/App.jsx` — disclose the existing install affordance through a reachable compact action if CSS alone cannot preserve its function.
- [MODIFY] its `scripts/operational-check.mjs` — measure lockup containment and selector readability, not just outer header height.

### AsiaWatch and associated border panel

- [MODIFY] `src/components/ThailandBorderConflictTracker.jsx` — semantic keyboard controls, readable palette tokens, compact non-overlapping layout, explicit reference/unverified qualifications, no decorative glow.
- [MODIFY] `src/data/thailandBorders.js` — attach honest provenance/age availability to existing assessments and geographic reference data.
- [INSPECT, then scope only if confirmed] `src/components/IntelligencePanel.jsx` and its actual service adapter — trace regional story mismatch. A wider data-routing change requires an updated plan.
- [MODIFY] `scripts/operational-check.mjs` — exercise Thailand/Intel, zoom-to-border, focus/escape and overflow at real breakpoints.

### Legacy versions

- [MODIFY] `/Users/nonarkara/Projects/conflict-tracker/v2-standalone/app.js` — replace the rejected key-required basemap/label endpoints with a tested free provider already used successfully in this suite; keep attribution.
- [MODIFY] its `style.css` and, only for semantic controls, `index.html` — repair undersized controls and obstruction while keeping the chosen MEM identity and all feeds accessible.
- [MODIFY] `/Users/nonarkara/Projects/conflict-tracker/v1-basic/v1-basic/index.html` — repair basemap configuration, phone Map-tab geometry and overlapping instruments. Keep its dense authored content available through existing navigation/disclosure.

### Backup and common gates

- [MODIFY] the chosen flagship build/deployment configuration only after backup identity is approved; use `/globalmonitor/` base paths and an explicit working API/fallback contract. Never send a GitHub Pages client to nonexistent same-origin API routes without a labelled fallback.
- [NEW] `scripts/live-suite-check.mjs` — URL/version manifest, rendered map/overlay geometry, control hit testing and distinct custom-domain/alias checks. Reuse existing Non-Slop/Playwright tools rather than creating another scanner.
- [NEW] `design/spatial-baseline.json` — measured layout decisions with written reasons, not blanket threshold exemptions.
- [NEW] `tests/live-suite-regressions.test.mjs` — defects recreated as failing cases, including overlap and falsely current reference data. Integrate with each relevant repository's existing test/build path.
- [MODIFY] relevant `STYLE.md` and deployment workflows only where a deliberate decision or executable gate is added.
- [MODIFY after verification] `/Users/nonarkara/Projects/DESIGN-ANTI-SLOP.md` — required audit version entry naming the defect and its verified regression guard; preserve other concurrent edits.

### Independent review additions

The reviewer completed fresh 1440/1280/1024/768/390/320 checks of GlobeWatch and World Console. Both had no horizontal overflow or uncaught page errors, 56px headers, map about 82% of viewport and no default panels. Both phone source → session-log download → return trials passed, including focus containment/restoration and all three docks. These are limited behavioural passes, not overall clearance.

- [MODIFY if reproduced] GlobeWatch's actual intelligence story component/styles — phone source/time labels crowd the headline. Resolve the exact component path before implementation, and update this plan if outside existing shell/Intel styling.
- [MODIFY] `/Users/nonarkara/Projects/conflict-tracker/v3-middleeast/src/components/MapContainer.jsx` — show useful observation age for dated aircraft/AIS snapshots instead of only “session” or “AIS snapshot”; preserve all map data and imagery.
- [NEW if still absent] `ANTI-SLOP.md` in the classic and Middle East worktrees — restore the instruction entry point their current agent files require, referring to existing vendored rules and STYLE rather than inventing another standard.

The reviewer found GlobeWatch's aircraft endpoint serving 8,143 aircraft observed on 2 October, correctly marked stale after upstream 403. Do not make it look live to obtain a visual pass; a provider repair is separate from a layout fix.

Reviewer artifacts: `/Users/nonarkara/Projects/conflict-tracker/v3-classic/.qa/globewatch/audit21-*.png`. No standalone border URL was found in their targeted docs/data/Papers references. Do not rewrite a working sibling for visual uniformity.

## Verification and shipping

1. Read current instructions/STYLE and dirty diffs again in every target before editing. Preserve concurrent work.
2. Run source Non-Slop scans, relevant unit tests, lint and production builds. A source scan is not visual clearance.
3. Inspect screenshots at 1440/1024/390/320, plus CSS breakpoint −1/exact/+1, short viewports and open drawers. List hits against all seven design rules and the six spatial modes.
4. Test actual pixels and hit targets; no passing by measuring an invisible/occluded element. Mutate one known defect back in and require its gate to fail.
5. Exercise aircraft/ships/airports and popup flows; Thailand border zoom; Tools/source/session export/return; keyboard focus and Escape. Test fresh and returning service-worker sessions.
6. Check empty, failed, stale and reference states. Preserve source/tier/age. Language and real-device checks not performed must be named rather than implied.
7. Independent agent/person reviews the new deployed screens and task flows. This preliminary review is not release approval.
8. Commit with attribution, push and deploy to the correct project/production branch; verify current assets on canonical and custom hosts. Verify backup separately. Report exact commits and URLs, including failed/skipped/unverified checks.

## Remaining limits

This is a scoped initial live audit, not a full code/security/data correctness certification. No new release has been shipped. Returning-session checks, all language flows, hardware-wall displays, complete third-party feed accuracy and a fluent-reader check remain unverified in this pass.

Prior art: the repository's vendored Non-Slop rules/scanner, current browser release checks and responsive chrome sweep. Upstream: https://github.com/Nonarkara/Non-Slop (MIT). Protect chosen style; fix measurable failures.

## Implementation detail and newly reproduced cases

- GlobeWatch's install dialog uses the existing connected-element/Tools focus fallback in `src/components/WebAppInstall.jsx`; its manifest and service-worker stamping now support the backup base path. Tests in `tests/app-updates.test.mjs`, `tests/globewatch-audit.test.mjs` and `scripts/globewatch-browser-check.mjs` cover that same path.
- World Console's frozen capture metadata uses `src/utils/observationAge.js`, with executable precedence tests in `tests/observation-age.test.mjs`. Its existing operational-shell stylesheet also needs the reproduced tablet selector-width fix.
- AsiaWatch's regional-headline issue is handled inside the existing display boundary: `src/utils/briefingRelevance.js` and `IntelligencePanel.jsx` require a place name for the four affected regional panels. No upstream feed, API schema or cache route changes. Counts and empty states describe region-matched headlines rather than the unrelated mixed feed.
- The associated border marker's `MapContainer.jsx` title also needs the reference qualification; qualifying only the drawer would leave a misleading hover surface.
- War Monitor keeps all authored content, using its existing four navigation doors at desktop and phone widths. The dense sidebars are drawers; More opens the secondary widgets. Its existing desktop/mobile stacking and collapsed state must be tested after the move.
- Additional host inventory found `conflict.nonarkara.org` is War Monitor's custom-domain alias, so it belongs in release verification. `middleeast.nonarkara.org` is a separate historical React deployment. The owner explicitly requested that it be audited and repaired separately after this release; it must not be overwritten here.
