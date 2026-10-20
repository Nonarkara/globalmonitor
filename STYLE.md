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

Three sizes, and no fourth: Display 1.75rem / Body 0.8125rem / Micro 0.6875rem.
Every legacy `--type-*` alias resolves to one of those three, and there is no
literal `font-size` left in the interface — the scale is the ladder and the
components use it instead of bypassing it. The root is fluid (13px → 16px on
a phone → 24px on a wall display), so the three sizes scale together and the
chrome rows are sized in rem to match: a fluid type scale under fixed-px rows
is a half-implemented idea that ends up eating the clock's own labels.

One named exception: `--type-instrument` (1.125rem) is the clock face alone.
A display-size numeral does not fit a compact clock row, and a clock is an
instrument rather than a voice.

Map glyphs are a fifth face, **Noto Sans**, and that is a hard constraint of
the glyph endpoint rather than a preference: the server serves only the
families it serves, and the previous choice 404s there — which is why no
MapLibre label ever drew. A map label is not an interface font, and it is not
allowed to leak into the interface.

Helvetica Neue is retired as the default body face — it was
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
- The interface still carries legacy Tailwind-derived washes and dark panel grounds. They are **recorded, not hidden** — `tests/fixtures/palette-debt.json` names them one by one, the build fails if a new one appears, and the list may only shrink. An empty list is the goal; a silent list is not.
- US-EPA AQI band colours are a domain standard, not interface chrome: the six published EPA hexes are used verbatim, so an AQI reading means what it means to a reader anywhere.
- Hairlines only. No gradient, no glow, no glass, no drop shadow, zero radius on every container. A 50% circle is a shape, not a radius.

### The map's ink
Map ink has **one voice**. A label that sits on the basemap is ink `#101010`
with a paper halo `rgba(247,245,239,0.9)` — never a black outline, and never a
colour of its own. The colour belongs to the mark, not to its name.

**The label voice follows the ground.** On paper: ink `#101010` with a paper
halo. On a dark ground: paper `#f7f5ef` with an ink halo. Same voice, opposite
polarity — a printed label over imagery knocks the ground out rather than
wearing a black outline. Two labels keep an accent because they annotate a
coloured mark, and the accent flips brightness with the ground: the
range-ring value is Wada Red on paper and Palette Orange on dark; the
military callsign is the paper-ground amber `#8a5a00` and Yellow-Orange
`#f99d1b` on dark.

**One mark, one colour.** A conflict event is drawn in Wada Red whether the
feed is live or a sample; whether the data is live is said in words, never in
the colour. A density field is one hue that deepens with density — a crimson
field on paper — and never a rainbow that prints its densest cells brighter
than the ground. The old red→yellow ramp made the fires brighter than the
paper and contradicted the red swatch the legend promised.

**The cables have their own colour, and they did not.** Ten undersea telecom
cables crossed the map in the same mid-blue as the Shanghai → Singapore
corridor, the Singapore anchor, the Jakarta megaregion and the passenger
vessels — painted with a raw `#006eb8` literal rather than a named role, and
appearing in **no plate at all**. A reader who asked "what are the blue lines?"
had no answer, because the answer was spread across four unrelated things
wearing one colour. The cables now wear **Dark Tyrian Blue `#12354e`**, the
navy a chart draws a cable in, with a casing of the ground's own ink so the
core stays readable on the dark and satellite grounds. They are named on the
map from zoom 3 — their names used to wait for zoom 5 while the Southeast
Asia view sits at 4.4, so the one thing that would have told the reader what
they were was switched off — and they have a row in the plate.

**The wind is drawn as barbs, and the barb says its own convention.** The
shaft runs from the station circle in the direction the air is moving — the
way the haze is pushed — and the feathers at its outer end carry the speed:
one full feather is 10 knots, the half feather 5. The circle is the place the
reading belongs to; without it the staff floats and the reader has to guess
which end is the origin. A calm point is a circle and a staff and no feathers,
because "the wind stops here" is the single most useful thing a haze map can
say. The plate says the convention in words, because a barb is a convention.

**The cyclone is an analysis and the map says so.** The storm's centre, the
analyst's gale and storm wind radii and the observed track are JMA's. The
radius is a quadrant figure an analyst assigned, not a measured wind swath;
the track is a forecast after the last observed centre, and the map draws the
two halves differently. The plate says "JMA analysis — not a raw satellite
retrieval" because it is not one: it is built from satellite imagery,
aircraft, buoys and a numerical model. There is no free, current,
satellite-derived surface-wind field for Southeast Asia, and the map does not
pretend otherwise.

**No blurred glows.** Every mark that carried a blurred under-layer lost it:
corridors, anchors, beacons, strike origins, crisis zones, kinetic targets and
the trajectory glow. A crisis zone is a flat translucent fill with a clean
edge — a zone, not a halo of importance and not a reticle.

**The legend is the key, and the key must agree with the drawing.** A swatch
is the colour the map actually paints; the provenance — API or public file,
live or sample — is said underneath it in words. A key that disagrees with the
map is worse than no key.

**The key names every colour the map paints for that source.** One bar cannot
speak for six vessel classes, and a bar that speaks for one of them is a key
that lies about the other five. The plate therefore carries a *strip* — one
segment per colour, in the twenty pixels the single bar used to occupy — and
the class names underneath it in words. The colours live in
`src/data/mapPalette.js`; the map's paint blocks and the plate both read that
one module, so a key cannot drift from a drawing because they are the same
fact. A plate may not carry a colour literal of its own — no hex, no
`rgba()`, no `var()`.

**On a phone the key is words, not a strip.** Twenty pixels divided seven
ways is a mark of two point eight pixels: a smear, not a key. The class
names are the key; a row with one or two colours keeps its strip, which is
legible at that size, and the mark's own popup names the class on tap.

**What the key rule covers.** The SOURCES plate answers for the live
readings (aircraft, vessels, thermal detections, conflict events, the wind
field, the cyclone and the cable registry) and the STRATEGIC CONTEXT plate
answers for the reference routes and areas. The city and tier marks — the
anchors, the megaregions, the city network, the beacons — carry their own
categorical colouring and are described in the LAYERS panel; the strategic
plate does not claim them, and the rule does not hold it to them. A rule that
claims to check everything and checks four of six sources is a rule that will
be believed and will not hold. The cables and the cyclone were exactly that
gap for a wave: two layers on the map that no rule looked at.

**A key entry that no plate renders is not a key.** The key and the drawing
agreeing is only half the contract; the reader has to be shown the row. The
guard requires the plate to reach for every key list it owns.

**A control may not lie about what it does.** The basemap picker's "Dark"
option pointed at the bright Esri street map: the label promised a low-glare
operations map and delivered a white one. It is now the Esri Dark Gray
Canvas — a real low-glare ground — and the other two options say what they
render ("Topographic", "Satellite"). CARTO's dark raster was tried and
rejected: without an API key it returns tiles watermarked "API KEY REQUIRED"
across the whole map, which is worse than no option at all.

## Layout
The live map is the operating table. **One line of chrome**, a 44px ticker, no panels open on first visit. Layers, intelligence and markets are explicit edge docks. One sponsor strip; PMUA remains largest. Prose at most 65ch. Square containers and no ornamental depth.

**A band earns its height.** The chrome is **ONE row**: partners, product
name, the reference clock, the theater it keeps time for, the index of the
world's time, the theater tabs, and the controls. There is no second band
above it and none below it. The legal marking (18px) sits above the row and
is not chrome.

It used to be three bands — 18px legal marking, 24px instrument band, 44px
masthead — and the owner asked for exactly this: *"All the information should
be on one line only in the top bar."* A 390px phone carried **86px** of
chrome for one word and four small logos. It now carries **62px**: the 18px
legal marking and one 44px row. A 1440px desktop carried 106px and now
carries **72px**, against a budget of 74. The live check fails the release
if either grows, and it fails it if the clock ever leaves the row — the
chrome being one line is the rule, not a picture of it.

**What gives way, in what order.** The row is fixed content in a variable
width, so something has to go when the width runs out. The order is fixed,
and the amount is **measured at run time** — the row is asked what it has:

1. The world-clock index goes first, **from the tail, whole clocks and never
   half of one.** It is ordered by what a clock still says to an operator
   watching this theater, so the far-flung ones (Washington, Honolulu,
   Canberra) go before the theater's own cities do. A clock is never clipped
   and never scrolled.
2. Then the theater's name beside the reference clock — dropped whole.
3. Then the product subtitle.
4. Then the partner marks. **PMUA stays**; it is the anchor.

The reference clock is the instrument and it is **never** the thing that is
sacrificed. It keeps its seconds and it is never truncated.

This is measured rather than a ladder of viewport widths, because a ladder is
wrong the moment the title grows a word, the theater gains a tab, or a phone
is 390px wide instead of 393. The first one-row bar was built on such a
ladder and it overflowed at **every** width from 320 to 1920, with the last
two buttons pushed off the side of the screen where nobody can reach them.
The live check now fails the release if the row overflows its own width.

A region's short label may only shorten its full label — never rename it —
and the guard enforces that.

The masthead subtitle names the product, not the build. The version is a build
fact and it is read in the LAYERS panel and in the legal notice; a truncated
subtitle is worse than a version number the reader has to go and look for.

The product name and the build version come from one module
(`src/data/dashboardMeta.js`). A legal notice that claims a different product
or an older version than the build is telling the reader two things at once.

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

The plate earns its height by being big enough. It was capped at 384px, which
held five rows and silently scrolled the rest — and the rows that went missing
were the cable registry and the cyclone, the two that say what the new marks
ARE. It is capped at 620px now, which holds all eight rows at 1440, and the
live check measures that nothing is hidden.

**On a phone the plate is a list that scrolls, and it says so.** A 196px
plate on a 390px phone cannot hold eight stacked readings and their
qualifications without covering the map it is annotating. The desktop promise
is the one that binds — every reading and every qualification visible at once
— and on a phone the plate is a scrollable list of the same rows. The scroll
is the honest form of that trade: the plate does not claim to show
everything at once at that width, and it does not pretend the rows it is
holding are the only readings there are.

**"Live" has three degrees, and a camera screen names the one it is.**
An HLS stream is video. A snapshot is a **refreshing JPEG and not video**,
and is never called "live video" or "streaming". A city with no verified
public camera says so **in words** — there is no placeholder tile that looks
like a working camera, because a placeholder is a claim. The same applies to
a broadcast: a channel running live, a VOD with no stream running, a dormant
channel and a stale one are four different labels, and the wall says which.

**A frame is measured, not assumed.** The Thai camera network answers HTTP
200 with a 43-byte blank for a camera that does not exist, and a real frame
is about 3,000 bytes at 320×240. A status code is not a liveness test. The
wall fetches the frame, checks the byte count and the dimensions, and
rejects a frame that more than one camera returns — the placeholder. A frame
that did not change between two probes six seconds apart is reported as
exactly that, because a still frame in a tile labelled "refreshing" is a
smaller lie but still a lie.

**The wall says how little of it there is.** Five of eleven cities carry a
verified camera and three of eleven have a channel streaming live at the
probe time, and the wall says so at the top. A panel that shows five working
screens next to six honest absences is telling the truth about the coverage;
a panel that hid the six absences would be telling the reader that six
cities are quiet.

## Protected voice
- marker "GlobeWatch": the supplied project identity
- marker "AsiaWatch": the pan-Asian project identity

## Allow
- rule eyebrow-caps: existing instrument labels and sector wayfinding, not marketing eyebrows
- colour #f7f5ef: Palette paper ground
- colour #a72144: Wada Red — severity ink and brand anchor
- rule default-purple in **/regions.js: geographic category data
- rule purple-gradient in **/tactical-optics.css: user-selected CRT spectral scanlines; never default decoration

## Credits and enforcement
Non-Slop by Non Arkaraprasertkul, MIT, https://github.com/Nonarkara/Non-Slop .
Vendored rules/scanner in .non-slop; original licence and credits retained.
Build gates scan source and changed interface files; rendered geometry and an independent reviewer check the deployed release. A static scan is not a visual verdict.

### The three gates
The contract is only worth what enforces it, so it is enforced in three
places, each answering a question the others cannot:

1. **The written contract — this file.** Why a rule exists. Every rule added
   here names the failure that produced it.
2. **`npm run design:check` — the Non-Slop scanner.** *Does it look like the
   house style?* Type, colour, depth, layout, copy, accessibility. It reads
   the Allow list above, so a deliberate exception is recorded here or it is
   not allowed.
3. **`npm run guard` — the truthfulness gate** (`tests/truthfulness.test.mjs`).
   *Does it tell the truth?* A scanner cannot ask that, because it is a
   question about agreement between files: the key against the drawing, a
   control against its effect, a reading against its provenance, a colour
   against the palette. The gate answers each of those, and it is wired into
   `prebuild`, so a build that lies does not ship.
4. **The live release check** (`scripts/operational-check.mjs`, run against
   the deployed URL). *Does it hold together in a browser?* The gates read
   files; this one measures the shipped page: that the chrome is **one row**
   and that the clock is inside it, that the row does not overflow its own
   width, that the chrome stays inside its budget, and that nothing in the
   plate is scrolled out of sight. A file can satisfy every gate and still
   put a control off the side of the screen; that is what the one-row bar
   did, at every width, for a whole wave.

Every rule in the gate is a FUNCTION that takes the subject it judges and
returns its problems, and the rules that guard a shipped defect have a
mutation test that calls that same function with the defect in place and
requires a problem. A rule that goes blind fails its own mutation test — and
that is checked, not assumed: neutering any one rule makes its mutation test
fail. (The first version of this file put the rules inline in their tests
and wrote "mutation" tests that asserted on fixtures built inside the test
body. They could not reach a rule at all. Five neutered rules passed every
test, and a reviewer proved it.)

The colours the interface still owes the Palette are written down in the
gate itself, beside the rule that holds them, with a ceiling above them.
The debt may only shrink; raising the ceiling is a one-line change in the
rule file, where a reviewer sees it.

**How new work joins the contract.** Three questions, in this order:
1. *What does this claim?* If it states a fact, it must come from a feed and
   name its provenance. If it states a colour, that colour must come from
   `src/data/mapPalette.js` and the plate must name it.
2. *Which gate catches it if it drifts?* A new claim wants a rule in the
   truthfulness gate; a new look wants a rule here and in the scanner's
   vocabulary. A rule nobody can fail is a comment.
3. *What did it break?* Add the failure to this file as the reason, and add
   the mutation test. A rule with no story behind it gets deleted by the next
   reviewer.
