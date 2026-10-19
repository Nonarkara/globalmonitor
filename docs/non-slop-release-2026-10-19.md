# Non-Slop operational release · 19 October 2026

System: AsiaWatch. Source: Nonarkara/Non-Slop, MIT, pinned at 99a6215f2f108f92ec3f7a3740030d209450c931. Original licence and credits are in .non-slop.

## What changed

The map keeps the first screen. Clock 24–28px, masthead 56px, ticker 44px. Layers, Intel and Markets open one bounded edge dock, not overlapping floating boards. Mobile theater selection remains in Tools. Sponsor strip and authored identity remain, with PMUA largest. Session export emits a real download; modal islands restore pointer events, trap keyboard focus and return to Tools. EO labels and source legends occupy separate corners. Legal links have readable foregrounds.

## Seven-rule review

1. Depth: decorative CSS drop shadows and glass removed; scientific map imagery unchanged.
2. Line length: prose bounded at 65ch.
3. Corners: rectangular interface; true circles and original supplied artwork retained.
4. Type: semantic eight-token scale in STYLE and operational shell; legacy inline chart labels remain a rendered-review item, not hidden by a scanner allowlist.
5. Icons: EO emoji labels removed; authored labels and Lucide retained.
6. Box soup: default panels collapse into explicit edge docks, without deleting their content. Rendered flagship default measured 14 boxes.
7. Pills: compact rectangular controls, no decorative badge system.

Static checks: all three builds report 0 P0/P1 hits. One P2 Thai-language scanner hit remains: language is assigned dynamically to the regional news root, so the literal-only detector does not recognise it. This is not a fluent Thai or Chinese review.

## Verification and remaining limits

Executable gate: npm run verify:live -- https://DEPLOYED-HOST. It exercises 1440/1024/390/320px, loaded canvas, four sponsor images, masthead bounds, no horizontal overflow, all three docks, actual session download, Escape, focus restore and source-health dialog trapping. Screenshots are saved in ignored non-slop-shots. A separate reviewer checks deployed screenshots, real-task access and corner intersections; static scans alone do not count.

Preview checks before final source-health parity changes passed all four widths for map, controls and downloads. Final live evidence is recorded in the release handoff. Browser checks use Chrome desktop emulation, not physical phones. No claim of complete global feed coverage, current biographies, legal certification, or fluent TH/ZH proof is made. API credentials, provider quotas, stale snapshots and external upstream outages remain separately labelled data limitations. Middle East's large optional UNDP reference chunk remains a performance debt; it was not deleted to make this release look smaller.

AsiaWatch's pre-existing flight snapshot and local audit scripts were left uncommitted. Distinct branch/project deployment targets must never be mixed. Existing remote data/runtime fixes are integrated before production release.

## Tri-system release evidence

| System | UI commit | Production URL | Deployment job |
|---|---|---|---|
| GlobeWatch | bc0caf2a | https://globalmonitor.nonarkara.org | 39271829077 |
| AsiaWatch | f97397ea | https://asia.nonarkara.org | 39271897672 |
| Middle East War Room | 9a155417 | https://global.nonarkara.org | 39271901036 |

All three deployment jobs succeeded. All three canonical Pages URLs passed the four-width operational browser gate: canvas, sponsor images, edge docks, airports, available traffic hover, actual log download, source-dialog keyboard containment and focus restore. Separate production custom-domain checks prove Tools closes with Escape and returns focus. The custom domains and canonical aliases each matched the local release bytes three consecutive times: entry JS/CSS, MapContainer, available self-contained map worker, service worker and manifest. Builds used VITE_API_BASE_URL='' to match CI's public environment.

Final custom-domain runs also passed that full operational gate at 1440, 1024, 390 and 320px on all three systems, each with zero uncaught page errors and a successful dashboard-activity-2026-10-19.log download. No default panels or horizontal document overflow were detected. The measured masthead was56px; the map occupied about82% of the900px-high test viewport.

Independent review: PASS WITH NOTES on the final UI candidates, including unaided source-find/export/return tasks at phone width and 1440/1024/390px screenshot inspection. Additional 320px browser checks passed. Late alerts now dock below the header; their original intermittent interception was reproduced before the fix. A natural alert did not appear during the final independent 16-second wait, so that specific state has CSS contract coverage, not a final natural-event screenshot.

Rendered Non-Slop scores: flagship desktop 0 points (phone automated render timed out; independent phone inspection passed), AsiaWatch 2, Middle East 2. Remaining detections include ticker line length, one extra computed type size on AsiaWatch, and small legacy controls. Geographical map labels increase the box count; they were retained as information, not stripped to improve a score. This is an operational release, not a zero-findings accessibility certification.

Latest suites: 63 GlobeWatch, 39 AsiaWatch, 41 Middle East tests passed, with lint/build gates and no reported npm vulnerabilities. /api/health returned200 and ok:true on all three Pages hosts. Health is not proof every provider is fresh: the flagship aircraft fallback was observed17days old and ACLED remained a labelled sample without configured credentials. Fresh global traffic, current officeholder reference data, fluent TH/ZH, physical phones and full offline-state review remain separate audit work.

Concurrent air-quality work appeared later in the flagship worktree and was not staged or deployed by this release. This record deliberately names the verified UI commit rather than claiming ownership of that later change.
