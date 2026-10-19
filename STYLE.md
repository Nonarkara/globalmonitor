# AsiaWatch: deliberate operating choices
Owner: Dr Non. Release brief: 19 October 2026.

## Five-line brief
- Who: operators and public readers on laptops, wall displays and phones.
- One job: inspect Asian maritime chokepoints and frontier signals against satellite context.
- Hierarchy: geographic evidence first; observation age second; optional instruments third.
- Constraints: 320–1440px, keyboard access, uncertain external feeds, no invented live values.
- Direction: a chart table with instruments at its edges, not a wall of floating boxes.

## Type
Helvetica Neue is the existing Rams/Braun instrument-panel choice, retained rather than replaced with a fashionable font. Tabular figures; native Helvetica/Arial fallbacks only. Existing non-looped Thai faces remain where supplied. This release does not claim fluent TH/ZH review.

## Colour
Ground #0a0e14; ink and muted ink inherit existing semantic tokens.
Accent #f59e0b has its existing action/state job. Red means severity.
Scientific map categories and supplied partner/GlobeWatch artwork keep their source colours, not a new decorative UI palette.

## Layout
The live map is the operating table. Compact clock (24–28px), 56px masthead and 44px ticker; no panels open on first visit. Layers, intelligence and markets are explicit edge docks. One sponsor strip; PMUA remains largest. Prose at most 65ch. Square containers and no ornamental depth.

## Voice
Keep authored titles, event identifiers, credits and source names. Say stale, sample, reference or unavailable plainly. No claims of complete global coverage.

## Protected voice
- marker "GlobeWatch": the supplied project identity
- marker "AsiaWatch": the pan-Asian project identity

## Allow
- rule eyebrow-caps: existing instrument labels and sector wayfinding, not marketing eyebrows
- colour #faf9f7: existing Rams paper ground
- colour #a23a26: existing severity ink, not a decorative terracotta accent
- rule default-purple in **/MapContainer.jsx: retained scientific/map category identifiers with legends
- rule default-purple in **/mapTrafficIcons.js: vessel category colour, not interface accent
- rule default-purple in **/regions.js: geographic category data
- rule purple-gradient in **/tactical-optics.css: user-selected CRT spectral scanlines; never default decoration

## Credits and enforcement
Non-Slop by Non Arkaraprasertkul, MIT, https://github.com/Nonarkara/Non-Slop .
Vendored rules/scanner in .non-slop; original licence and credits retained.
Build gates scan source and changed interface files; rendered geometry and an independent reviewer check the deployed release. A static scan is not a visual verdict.
