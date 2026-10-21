# Current-suite release — 22 October 2026

UI/routing verdict: shipped and independently verified for the scoped repairs. Real-time data availability: not cleared.

## Commit → push → deploy → live test

| System | Source commit | Production deployment | Verified public URL |
|---|---|---|---|
| GlobeWatch | `69642b12` | `dbd836d2.globalmonitor.pages.dev` | https://globalmonitor.nonarkara.org/ |
| AsiaWatch | `4cc3dba6` | `b1cc6418.asiawatch.pages.dev` | https://asia.nonarkara.org/ |
| Middle East | `f333bd30` | `5cd77627.globalmonitor-me.pages.dev` | https://global.nonarkara.org/ |
| MEM | `60fc849` | `e2058d09.mem-by-non.pages.dev` | https://mem.nonarkara.org/ |
| War Monitor | `d787403` | `17f5a17f.middleeast-monitor.pages.dev` | https://middleeast-monitor.pages.dev/ and https://conflict.nonarkara.org/ |
| GlobeWatch backup | built from `69642b12` | separate gh-pages publish | https://nonarkara.github.io/globalmonitor/ |

The MEM and War GitHub Pages aliases were separately rebuilt and checked. Their HTML matched the committed release artifacts. Current v3 canonical and custom hosts returned HTTP200 and exact expected JavaScript bodies. Static identity/routing verification is separate from screenshots and interactions.

## Repairs

- Classic tablet title/install overlap, clipped theater selection and install-dialog focus return.
- Native, usable tile services and visible attribution in both legacy monitors, replacing API-key watermark tiles.
- Map-first default views; all legacy news, status, data and reference material remains reachable. Open evidence drawers are not covered by map controls.
- Associated Thailand border module: readable palette, semantic44px Zoom controls, unverified/undated labels, editorial source and no invented observation date. The map hover title carries the same qualification.
- Four Asian regional panels reject headlines that do not name their region. Counts/tags and empty states describe the filtered headlines; matching is explicitly not an assessment of border conditions.
- Frozen Middle East traffic keeps capture metadata; observation time outranks collection time. An inactive fallback's old date cannot age a different active provider response.
- Backup manifest/worker supports its subpath, does not migrate sister-site tabs, and all specialist API requests honor the explicit flagship backend.

## Executed checks

- Unit tests: Asia99, classic71, Middle East45;215 total passed. Legacy JavaScript/known-rejected-provider contracts also passed, including the negative provider mutant. These source checks do not certify pixels.
- Builds and Non-Slop source gates passed in all three v3 trees. Main source score0; classic and Middle East retain one P2 Thai-language scanner finding apiece, not P0/P1 failures. No fluent-language certification.
- Classic and Middle East full lint passed. Asia's full lint exposed pre-existing CityWall effect and unused map-label errors; changed repair files passed targeted lint. This is not a blanket clean-lint claim.
- Rendered breakpoint/adjacent-width gate: classic38 widths, Asia44, Middle East42, backup38, MEM17, War7. Map rectangle shares were at least81.8% for v3,85% for Asia and83.6% for War; MEM's full-bleed canvas remains behind compact chrome. Rectangle share is not an unobstructed-area measurement.
- The real rendered overlap/squeezed-map mutants were rejected. Guards check child containment and selector width, not only parent height. Backup gate also rejects GitHub-origin API requests.
- Existing returning-session regression passed: an already-open233px legacy header migrated automatically to56px, exactly one release navigation, no manual cache clearing. Base-path unit test excludes sister-site tabs.
- Independent reviewer used real Chrome:768/720/721 classic containment; Tools→Android/iPhone→Tab→Escape→Tools; Thailand→Intel→reference/Zoom at320; ME age labels; MEM Data/Layers/return; War Status/More at390 and1440 and Escape→Map; backup's four repaired API origins. No uncaught application errors in those trials.
- Independent final edge review confirmed backup requests all four endpoints from the flagship, MEM Data is unobstructed, and ME no longer applies the false120-day fallback date. The active-Axiom branch passed negative unit tests but was not active during that last live review.

## Failed or unverified

- Full classic traffic gate did not pass its requirement that aircraft, ships and airports all contain records. Direct live debug found8143 aircraft,4349 airports, no vessel source while its request timed out; map stayed up with no page errors. Do not call real-time traffic fully operational.
- Flight/AIS provider freshness varies; snapshots and unavailable feeds remain labelled. War News was still fetching during the short independent trial. No full feed-availability clearance.
- No physical phone/wall-display, complete contrast, fluent EN/TH/ZH, every optional layer, full security or upstream-data correctness certification.
- User flight-snapshot changes, MEM news/front hydration work, and War's local Netlify/editor files were not staged or shipped. Legacy remote documentation and its parallel tile fix were merged without force pushes.

Evidence screenshots live in ignored/untracked `.qa/live-suite-*` directories and classic `.qa/globewatch/candidate22` / `release22`. Runtime logs are `/tmp/*-live-check.json` and `/tmp/*-tests.txt` for this session; they are not permanent CI artifacts. The manual `Verify public dashboard layouts` workflow persists future captures as artifacts.

## Separate historical host

The owner chose a separate audit/repair for https://middleeast.nonarkara.org/ rather than redirecting it. Its source is historical `f670780`, Pages project `middle-east-monitor`. The read-only audit reproduced a151px phone header and225px map, plus an artificial visitor-count offset. It has not been modified or overwritten. See `historical-host-repair-plan-2026-10-22.md` for the separate scoped proposal.

## Reusable evidence

Verified lessons were captured first in the shared vault and recalled successfully: backup per-panel API bypasses; inactive fallback timestamp selection. This report follows those shared records. Non-Slop shaped the work by protecting each authored identity, moving optional instruments to explicit edge disclosures, and requiring independent rendered checks instead of a source-scan verdict.
