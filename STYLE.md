# AsiaWatch: deliberate operating choices
Owner: Dr Non. Release brief: 19 October 2026. Palette adoption: 19 October 2026.

## Five-line brief
- Who: operators and public readers on laptops, wall displays and phones.
- One job: inspect Asian maritime chokepoints and frontier signals against satellite context.
- Hierarchy: geographic evidence first; observation age second; optional instruments third.
- Constraints: 320–1440px, keyboard access, uncertain external feeds, no invented live values.
- Direction: a chart table with instruments at its edges, not a wall of floating boxes.

## Type
Palette stack. Four faces, one job each, and no fifth:
- **Archivo Narrow** — the label voice: uppercase, tracked. Masthead, section titles, legend headers, buttons.
- **Archivo** — prose.
- **JetBrains Mono** — every number, and only numbers. A monospace *label* is a regression.
- **IBM Plex Sans Thai** — Thai only, non-looped. Thai blocks carry `lang="th"`.

Three sizes, and no fourth: Display 28px / Body 13px / Micro 11px. Every legacy
`--type-*` alias resolves to one of those three, so the ladder is enforced without
rewriting call sites. Helvetica Neue is retired as the default body face — it was
retained while the ground was dark; it stays in the fallback chain, but the
grotesque discipline now comes from the Palette stack. The banned list still
stands: no Inter, Roboto, Poppins, Montserrat, Lato, Open Sans, DM Sans, Space
Grotesk, Geist, Manrope, system-ui-as-design-font.

## Colour
The Dr Non production palette, reconstructed from the Sanzo Wada collection.
Closed set. Every colour on the page is a named role.
- Ground `--paper` #f7f5ef · panel #ffffff · ink #101010, ink-2 #57534b, ink-3 #6b665e.
- **Amber #f59e0b — wayfinding only** (active tab, focus ring, marker halo). Never text on paper; the paper-ground variant is #8a5a00.
- **Green #1a7444 / #489b6e — signal only**: live, gain, positive.
- **Red #a72144 (Wada Red) — signal loss, severity, brand.**
- Categorical data series: Blue #006eb8 · Violet #4f4086 · Lilac #b984af · Orange #f37420 · Yellow-Orange #f99d1b · Olive #837e31 · Brown #7c4226.
- Tailwind's default palette and the VibeCode purples are **not** in the system. Do not reintroduce them; use a named series token instead.
- US-EPA AQI band colours are a domain standard, not interface chrome: the six published EPA hexes are used verbatim, so an AQI reading means what it means to a reader anywhere.
- Hairlines only. No gradient, no glow, no glass, no drop shadow, zero radius.

## Layout
The live map is the operating table. Compact clock (24–28px), 56px masthead and 44px ticker; no panels open on first visit. Layers, intelligence and markets are explicit edge docks. One sponsor strip; PMUA remains largest. Prose at most 65ch. Square containers and no ornamental depth.

The opening camera frames the theater the tab claims. Southeast Asia opens at
zoom 4.4, not the hemisphere — a view that includes all of India and half the
Pacific is a view about nothing.

The GIBS rasters are **off by default**. Aerosol and city lights are opaque
composites that bury the basemap and every plotted mark beneath them; they live
in the LAYERS panel, labelled with product and provider. The city-lights layer
is NASA Black Marble (VNP46A2) — the earlier "BRDF DayNightBand Radiance"
product was land-surface reflectance, not city lights, and is not used.

## Map engine
MapLibre v6 resolves its Web Worker at runtime from the module URL. Once the
library is bundled that path names an asset no build emits, the worker 404s,
and every GeoJSON source stays unloaded while the basemap still paints — the
failure reads as "the data layers are missing", not as an error. The worker is
therefore bundled explicitly (`?worker&url` + `setWorkerUrl`) and that import
must stay ahead of the first Map construction. A style-spec guard
(`tests/maplibre-style-spec.test.mjs`) rejects a `zoom` expression that the
spec forbids outside a top-level `interpolate`/`step`, because MapLibre
refuses such a layer **in silence** — the layer is simply absent, and a legend
can end up promising a reading the map never drew.

Two honest failure surfaces sit top-right of the map, where they cannot be
missed and cannot be confused for data: a map that never reached `load` says
so, and a layer the style validator refused is counted as not drawn.

## Layers
Evidence is weighted by what it is for. The wind field is **supporting**
evidence for the fires, not the subject: the shafts stay short against the 4°
grid, and calm reads as faint rather than loud. The subsea cable routes are
drawn as lines with one weight — no blurred under-layer, because a glow makes
a route read as a boundary.

## Voice
Keep authored titles, event identifiers, credits and source names. Say stale, sample, reference or unavailable plainly. No claims of complete global coverage.

A number carries its qualification **underneath** it, never inside it: the
legend reads the value in the data face and the provenance in the micro face
underneath. "6,000 of 29,224 thermal detections" is two facts; hiding the cap
inside a longer sentence is how a cap becomes invisible.

The SOURCES plate is an instrument, not a hover panel: every reading and every
qualification is visible at once, and the plate is wide and tall enough to
hold them. A qualifier is never scrolled out of sight. Machine identifiers
are said in words — "NASA FIRMS public file · 24h", not "nasa-firms-public-24h".

## Protected voice
- marker "GlobeWatch": the supplied project identity
- marker "AsiaWatch": the pan-Asian project identity

## Allow
- rule eyebrow-caps: existing instrument labels and sector wayfinding, not marketing eyebrows
- colour #f7f5ef: Palette paper ground
- colour #a72144: Wada Red — severity ink and brand anchor
- rule default-purple in **/MapContainer.jsx: retained scientific/map category identifiers with legends
- rule default-purple in **/mapTrafficIcons.js: vessel category colour, not interface accent
- rule default-purple in **/regions.js: geographic category data
- rule purple-gradient in **/tactical-optics.css: user-selected CRT spectral scanlines; never default decoration

## Credits and enforcement
Non-Slop by Non Arkaraprasertkul, MIT, https://github.com/Nonarkara/Non-Slop .
Vendored rules/scanner in .non-slop; original licence and credits retained.
Build gates scan source and changed interface files; rendered geometry and an independent reviewer check the deployed release. A static scan is not a visual verdict.
