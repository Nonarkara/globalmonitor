# Lessons · Globalmonitor / Conflict Tracker v3

Corrections log. Updated after every mistake. **Read at the start of every session.**
Per §13: the same mistake never happens twice.

---

## 2026-05-26 · Bootstrap: §13 adopted

- **What went wrong:** n/a — first entry
- **Correct behaviour:** Log every correction here. Read before each session.
- **How to recognise:** Any time you repeat a fix you've already made.

---

## 2026-05-26 · Single source of truth for theater config is src/data/regions.js

- **What went wrong:** n/a — reminder
- **Correct behaviour:** All three theater regions (Middle East, Indo-Pacific, Thailand) are defined in `src/data/regions.js`: viewStates, dot data, news queries, TV channels. Edit there and it propagates. Never hardcode region data elsewhere.
- **How to recognise:** New theater region added elsewhere but not in regions.js = data inconsistency.

---

## 2026-05-26 · Supabase tables prefixed gm_ (shared with geopolitics project)

- **What went wrong:** n/a — reminder
- **Correct behaviour:** Globalmonitor reuses the geopolitics-dashboard Supabase project (qbatksnulitgrhigzbta). All tables are prefixed `gm_` to avoid collisions. The GM_SUPABASE_SERVICE_KEY is in the geopolitics .env file.
- **How to recognise:** Supabase queries touch geopolitics tables = missing `gm_` prefix.

---

## 2026-05-26 · ESRI basemap requires no key — MapTiler placeholder was broken in prod

- **What went wrong:** Satellite basemap used MapTiler with a literal docs placeholder key (`get_your_own_OpIi9ZULNHzrESv6T2vL`). Rendered blank in production.
- **Correct behaviour:** Use the inline ESRI World Imagery raster style which requires no API key. Already fixed in MapContainer.jsx.
- **How to recognise:** Blank basemap in production despite working locally = key placeholder issue.

---

<!-- FORMAT for future entries:
## YYYY-MM-DD · [short title of the mistake]
- **What went wrong:** ...
- **Correct behaviour:** ...
- **How to recognise this pattern:** ...
-->
## 2026-06-20 · "Stale deploy" mis-call from grepping the wrong chunk
- **What went wrong:** Concluded the live Cloudflare deploy was stale (missing the animated ships/flights work) after grepping only `index-*.js` for layer-ID markers (`flight-paths-lines`, etc.) and finding them absent.
- **Correct behaviour:** Vite code-splits — `MapContainer.jsx` ships as its own lazy chunk. The markers were in `MapContainer-*.js`, not `index`. Fetching the live MapContainer chunk showed it byte-identical (same SHA) to a fresh build: the deploy was current, not stale.
- **How to recognise:** Before declaring a bundle stale, grep ALL `dist/assets/*.js` for the feature marker to find its real chunk, then compare that chunk's hash/SHA to the live one. Same hash = same code. The index chunk rarely contains route/lazy-loaded component code.

## 2026-06-20 · Why the ships/flights "wow" was never visible
- **Root cause (two layers):** (1) Live frontend is fine, but it calls the Fly backend, which runs STALE code — `/api/flights` works, `/api/vessels` does not exist there (vessel endpoint added in later commits; `fly deploy` is billing-blocked). So ships show "Awaiting AIS feed" live while flights flow. (2) `eo-aerosol` was in the default `activeLayers` (App.jsx) at 0.55 opacity over bright MODIS-AOD tiles — an opaque orange blanket that buried the (working) flight icons.
- **Correct behaviour:** Diagnose the live data path end-to-end (curl each /api endpoint WITH the prod Origin, check CORS + content-type) before touching rendering. A `200` is hollow if content-type is text/html (SPA fallback).
- **How to recognise:** "Feature invisible on live but works locally" → first suspect the deployed backend lacks the endpoint (stale host) or the frontend points at a dead same-origin API, not the rendering code.

---

## 2026-09-03 · Honest data in the payload is not honest data on the screen

- **What went wrong:** Three fabrications were live on the public sites (sample FIRMS hotspots with a random brightness attributed to real satellites, hand-typed ACLED events labelled "OSINT verified reporting", a green LOW escalation gauge from an empty cache). In every case the backend HAD set an honest `source` field — and no header, hook or component ever read it. `useCached` stamped everything `X-Tech-Status: live`.
- **Correct behaviour:** Provenance travels end to end or it does not exist: payload `source` → `X-Tech-Status: sample` + `X-Tech-Source` header (cache.mjs is the one choke point) → `useLiveResource` `isSample` → `DataStatus isDemo` badge. `tests/data-honesty.test.mjs` asserts the header, not just the payload.
- **How to recognise:** A `source: 'fallback'`/`'sample'`/`'curated'` string anywhere in server/lib with no consumer in src/ — grep for it. A `useLiveResource` fetcher that calls `fetch()` directly instead of `fetchBackendJson` (no `__meta`, no provenance).

## 2026-09-03 · A fix on one branch is a regression report on the other two

- **What went wrong:** The ACLED demo label, the escalation NO DATA guard and the honest flight-snapshot stamp each existed on exactly one of the three deploying branches (main / classic / middleeast). The other two live sites kept the defect for months. The same file had drifted into three versions.
- **Correct behaviour:** Any fix to `server/lib`, `functions/_lib`, the hook or `DataStatus` is cherry-picked to all three branches in the same session, and each site is redeployed and its live headers checked. The deployment map at the end of `context.md` is the checklist.
- **How to recognise:** `git diff main classic -- server/lib/<file>` non-empty for a file that was "fixed". Three live sites answering the same `/api/*` request with different `X-Tech-Status`.

## 2026-09-03 · A GitHub workflow with an explicit --project-name ignores wrangler.toml

- **What went wrong:** main was retargeted to Pages project `asiawatch` in wrangler.toml and package.json, but both workflows still said `--project-name=globalmonitor`. The 15-minute cron would have overwritten the flagship 96 times a day; the only reason it didn't was that the deploy was failing for another reason.
- **Correct behaviour:** When changing a deploy target, grep every workflow for `--project-name` and `--branch`; the flag wins over the config file. Each branch's workflow triggers on ITSELF (`branches: [middleeast]`), never on `main`.
- **How to recognise:** `grep -rn "project-name" .github/` disagreeing with `wrangler.toml`.

## 2026-09-03 · Cherry-picking onto drifted branches: never resolve a registry file with --theirs

- **What went wrong:** classic's acled/firms/humanitarian fetchers use `theaters.mjs`; main's use per-file tables. Taking main's version wholesale would have deleted the flagship's global theater.
- **Correct behaviour:** Resolve conflicts per block with a script (ours / theirs / merge fn per hunk). For files where the branch has its own structure, take `--ours` and apply the semantic change as a targeted edit. Swap main's hex accents for the branch's tokens in the same pass.
- **How to recognise:** A conflict list that includes a file importing `./theaters.mjs`.

## 2026-09-03 · Two tool-level traps

- **zsh does not word-split an unquoted `$VAR`** in the Bash tool: `npx eslint $FILES` sees one filename; a `&&` chain then dies where you did not expect and later `;`-separated commits swallow whatever was staged. Use explicit lists or `${=VAR}`.
- **`git rev-list --left-right --count @{u}...HEAD` prints `behind ahead`**, left column first. Misreading it turned "21 behind, fully merged" into "21 unpushed commits" in the first audit.
