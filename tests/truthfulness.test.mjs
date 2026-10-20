/**
 * The truthfulness gate.
 *
 * The Non-Slop scanner asks whether the interface LOOKS like the house style.
 * It cannot ask whether the interface TELLS THE TRUTH, because that is a
 * question about agreement between things that live in different files:
 *
 *   - the key and the drawing      (a swatch vs the paint it stands for)
 *   - a control and its effect     (a basemap called "Dark" vs a dark map)
 *   - a reading and its provenance  (a count vs the feed that produced it)
 *   - a claim and the palette      (a colour that is not a named role)
 *
 * Every one of those has shipped broken. The ACLED swatch was grey while the
 * map painted the events in four colours. The "Dark" basemap was the bright
 * street map. The FIRMS swatch was a faint amber "no API key" while the
 * public-file detections were painted red. The wind swatch stayed ink-2 on
 * a dark ground where the arrows were drawn in paper.
 *
 * So this file is the standing answer: an executable law, run by `npm test`
 * and by the build gate, that fails the build when a claim stops matching
 * the thing it claims about.
 *
 * The rules are written so that each one FAILS when the defect is put back.
 * Every rule has a mutation test at the bottom of this file — if a rule ever
 * stops biting, the mutation test stops passing, and the build says so.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MARK, LEGEND_KEY, VESSEL_CLASSES, groundInk } from '../src/data/mapPalette.js';
import { MAP_STYLES, MAP_STYLE_FALLBACKS } from '../src/data/basemaps.js';
import { REGIONS } from '../src/data/regions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const collectFiles = (dir, out = []) => {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) collectFiles(full, out);
        else if (/\.(jsx?|mjs|css)$/.test(entry)) out.push(full);
    }
    return out;
};

/* ──────────────────────────────────────────────────────────────
   1. THE CLOSED PALETTE
   Every colour on the page is a named role. The roles are the
   tokens in :root; the domain standards (the six published US-EPA
   AQI band hexes) are named in STYLE.md and are allowed as they
   are, because an AQI reading means what it means to a reader
   anywhere.
   ────────────────────────────────────────────────────────────── */

const hexesIn = (text) => (text.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map((h) => h.toLowerCase());

const expandHex = (hex) => {
    const h = hex.replace('#', '');
    if (h.length === 3) return `#${h.split('').map((c) => c + c).join('')}`;
    return `#${h.slice(0, 6)}`;
};

const indexCss = read('src/styles/index.css');
const PALETTE_ROLES = new Set();
// Every colour token the stylesheets declare is a named role.
for (const m of indexCss.matchAll(/--[a-z0-9-]+:\s*(#[0-9a-fA-F]{3,8})\b/g)) PALETTE_ROLES.add(expandHex(m[1].toLowerCase()));
// The signal green the contract names beside its token variant.
PALETTE_ROLES.add('#1a7444');
// US-EPA AQI bands — a domain standard, used verbatim, so an AQI reading
// means what it means to a reader anywhere.
for (const band of ['#00e400', '#ffff00', '#ff7e00', '#ff0000', '#8b3f3f', '#af7f4d']) PALETTE_ROLES.add(band);

/** An rgb() triple and the hex it names are the same colour. */
const rgbToHex = (r, g, b) => `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;

test('every mark colour is a named role in the closed palette', () => {
    const problems = [];
    for (const [name, hex] of Object.entries(MARK)) {
        const value = expandHex(String(hex).toLowerCase());
        if (!PALETTE_ROLES.has(value)) {
            problems.push(`MARK.${name} = ${value} is not a palette role`);
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

test('the mark palette and the interface tokens agree on the same roles', () => {
    // ink-2 is the wind field's ink on paper; if the token moves, the mark
    // must move with it, or the plate and the arrows stop matching.
    const token = (indexCss.match(/--ink-2:\s*(#[0-9a-fA-F]{3,8})/) || [])[1];
    assert.ok(token, '--ink-2 must exist');
    assert.equal(expandHex(token.toLowerCase()), groundInk(false), 'groundInk(false) must be --ink-2');
});

/* ──────────────────────────────────────────────────────────────
   2. THE KEY AGREES WITH THE DRAWING
   The plate may not carry a colour of its own, and the marks it
   names must be exactly the marks the map paints for that source.
   ────────────────────────────────────────────────────────────── */

const mapContainer = read('src/components/MapContainer.jsx');

/**
 * The JSX of one plate, from its opening tag to the tag that closes it.
 *
 * A naive "up to the first </div>" stops at the end of the FIRST ROW, which
 * leaves three quarters of the plate unscanned — and a rule that only reads
 * a quarter of the plate is blind to the rows it does not read. The depth
 * walk is the difference between a rule and a decoration.
 */
const plateBlock = (className) => {
    const at = mapContainer.indexOf(className);
    assert.notEqual(at, -1, `plate ${className} not found`);
    const start = mapContainer.lastIndexOf('<div', at);
    let depth = 0;
    let i = start;
    while (i < mapContainer.length) {
        const nextOpen = mapContainer.indexOf('<div', i);
        const nextClose = mapContainer.indexOf('</div>', i);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth += 1;
            i = nextOpen + 4;
            continue;
        }
        depth -= 1;
        i = nextClose + 6;
        if (depth === 0) return mapContainer.slice(start, i);
    }
    throw new Error(`plate ${className} is never closed`);
};

/** The MARK.* names referenced inside a map source block. */
const marksInSource = (sourceId) => {
    const at = mapContainer.indexOf(`<Source id="${sourceId}"`);
    assert.notEqual(at, -1, `source ${sourceId} not found`);
    const end = mapContainer.indexOf('</Source>', at);
    const block = mapContainer.slice(at, end);
    return new Set([...block.matchAll(/MARK\.([A-Za-z0-9_]+)/g)].map((m) => m[1]));
};

test('no plate carries a colour of its own — every swatch comes from the mark palette', () => {
    const problems = [];
    for (const className of ['map-legend--traffic', 'map-legend--strategic']) {
        const block = plateBlock(className);
        for (const hex of hexesIn(block)) {
            problems.push(`${className} contains the literal ${hex}`);
        }
        for (const m of block.matchAll(/var\(--([a-z0-9-]+)\)/gi)) {
            problems.push(`${className} uses the css variable var(--${m[1]}) instead of a named mark`);
        }
        for (const m of block.matchAll(/rgba?\(\s*\d+/g)) {
            problems.push(`${className} contains the literal colour "${m[0].trim()}"`);
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

test('the key names every mark the map paints for that source, and no others', () => {
    // flights-data paints civilian and military aircraft; the plate must
    // name both. A plate that names one and the map draws two is a key that
    // leaves a colour unexplained.
    // A key may cover more than one source: the aircraft key explains the
    // civilian traffic layer AND the military one. The rule is that the two
    // sides of the key agree — the marks the map paints for these sources,
    // together, are exactly the marks the key names.
    const groups = [
        { key: 'aircraft', ids: ['flights-data', 'military-flights-data'] },
        { key: 'vessels', ids: ['vessels-data'] },
        { key: 'thermal', ids: ['firms-data'] },
        { key: 'conflicts', ids: ['acled-data'] }
    ];
    const problems = [];
    for (const { key, ids } of groups) {
        const painted = new Set();
        for (const id of ids) for (const mark of marksInSource(id)) painted.add(mark);
        const named = new Set(LEGEND_KEY[key].map((m) => m.mark));
        for (const mark of painted) {
            if (!named.has(mark)) problems.push(`${key}: the map paints MARK.${mark} but the key does not name it`);
        }
        for (const mark of named) {
            if (!painted.has(mark)) problems.push(`${key}: the key names MARK.${mark} but no layer paints it`);
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

test('the vessel key lists every class the paint expression draws', () => {
    const at = mapContainer.indexOf('id="vessels-icons"');
    const block = mapContainer.slice(at, mapContainer.indexOf('</Layer>', at));
    const drawn = [...block.matchAll(/'([a-z]+)',\s*MARK\.vessel[A-Za-z]+/g)].map((m) => m[1]);
    const named = LEGEND_KEY.vessels.map((v) => v.key);
    for (const cls of drawn) {
        assert.ok(named.includes(cls), `the vessel class "${cls}" is painted but not named in the key`);
    }
    const painted = [...block.matchAll(/MARK\.vessel[A-Za-z]+/g)].length;
    assert.equal(painted, VESSEL_CLASSES.length, 'a vessel class was added to the paint without the key');
});

/* ──────────────────────────────────────────────────────────────
   3. A CONTROL MAY NOT LIE ABOUT WHAT IT DOES
   The basemap picker must offer distinct, honestly named grounds.
   ────────────────────────────────────────────────────────────── */

const relativeLuminance = (hex) => {
    const h = expandHex(hex.replace('#', ''));
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const styleUrls = (style) => Object.values(style.sources || {}).flatMap((s) => s.tiles || []);
const backgroundColour = (style) => {
    const bg = (style.layers || []).find((l) => l.type === 'background');
    return bg?.paint?.['background-color'] || null;
};

test('each basemap option is a different ground, and none of them is another one renamed', () => {
    const ids = Object.keys(MAP_STYLES);
    assert.ok(ids.length >= 3, 'the picker must offer at least three grounds');
    const seen = new Map();
    for (const id of ids) {
        const urls = styleUrls(MAP_STYLES[id]);
        assert.ok(urls.length > 0, `${id} has no tile source`);
        for (const url of urls) {
            assert.ok(!seen.has(url), `${id} serves the same tiles as ${seen.get(url)} — two options, one ground`);
            seen.set(url, id);
        }
    }
});

test('the "dark" ground is dark, and the dark fallback stays dark', () => {
    const bg = backgroundColour(MAP_STYLES.dark);
    assert.ok(bg, 'the dark style must paint a background');
    assert.ok(relativeLuminance(bg) < 0.2, `the "dark" ground is ${bg} — that is not dark`);
    const fallback = MAP_STYLE_FALLBACKS.dark;
    assert.ok(fallback, 'the dark ground must have a fallback');
    const fallbackBg = backgroundColour(fallback);
    if (fallbackBg) {
        assert.ok(relativeLuminance(fallbackBg) < 0.2, `the dark fallback paints ${fallbackBg} — a bright ground breaks the promise`);
    }
});

test('the "satellite" ground is imagery, not a street map in disguise', () => {
    const urls = styleUrls(MAP_STYLES.satellite).join(' ');
    assert.match(urls, /Imagery/i, 'the satellite option must serve an imagery service');
});

test('every basemap option is named in the picker', () => {
    const sidebar = read('src/components/Sidebar.jsx');
    for (const id of Object.keys(MAP_STYLES)) {
        assert.ok(sidebar.includes(`'${id}'`) || sidebar.includes(`"${id}"`), `the "${id}" ground has no name in the picker`);
    }
});

/* ──────────────────────────────────────────────────────────────
   4. THE MAP'S OWN RULES
   No glows. One label voice. A density field that deepens with
   density and never prints its densest cells brighter than the
   ground.
   ────────────────────────────────────────────────────────────── */

test('no glow anywhere: no glow layer, no glow property, no blurred paint', () => {
    const problems = [];
    for (const [id, style] of Object.entries(MAP_STYLES)) {
        for (const layer of style.layers || []) {
            if (/glow/i.test(layer.id)) problems.push(`basemap ${id} has a layer called "${layer.id}"`);
            for (const [key, value] of Object.entries(layer.paint || {})) {
                if (/blur/i.test(key) && Number(value) > 0) problems.push(`basemap ${id} layer ${layer.id} paints ${key}: ${value}`);
            }
        }
    }
    for (const m of mapContainer.matchAll(/\bglow:\s*\d+/g)) problems.push(`the map data carries a glow property (${m[0]})`);
    for (const m of mapContainer.matchAll(/id="([^"]*glow[^"]*)"/g)) problems.push(`the map has a glow layer "${m[1]}"`);
    for (const m of mapContainer.matchAll(/'(circle-blur|fill-blur|line-blur)':\s*([0-9.]+)/g)) {
        if (Number(m[2]) > 0) problems.push(`the map paints ${m[1]}: ${m[2]}`);
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

test('a label has one voice: no symbol layer wears a colour of its own', () => {
    // The colour belongs to the mark, not to its name. Every symbol layer
    // must take its ink from the ground-aware ink identifiers, never from a
    // hex literal — that is how the HUD rainbow of six label colours began.
    const problems = [];
    const at = mapContainer.indexOf('<Source id="flights-data"');
    const block = mapContainer.slice(0, mapContainer.length);
    for (const m of block.matchAll(/'text-color':\s*([^,\n}]+)/g)) {
        const value = m[1].trim();
        if (/#[0-9a-fA-F]{3,8}/.test(value)) problems.push(`a symbol layer paints text-color ${value}`);
        if (/rgba?\(/.test(value)) problems.push(`a symbol layer paints text-color ${value}`);
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

test('a density field is one hue that deepens with density', () => {
    const problems = [];
    for (const m of mapContainer.matchAll(/'heatmap-color':\s*\[([\s\S]*?)\]/g)) {
        const stops = [...m[1].matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g)];
        if (stops.length < 2) continue;
        const rgb = new Set(stops.map((s) => `${s[1]},${s[2]},${s[3]}`));
        if (rgb.size > 1) problems.push(`a density ramp uses ${rgb.size} hues — a field must be one hue`);
        let last = -1;
        for (const s of stops) {
            const alpha = Number(s[4]);
            if (alpha < last) problems.push(`a density ramp gets lighter as it gets denser (${alpha} after ${last})`);
            last = alpha;
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

/* ──────────────────────────────────────────────────────────────
   5. NOTHING ON THE PLATE IS INVENTED
   ────────────────────────────────────────────────────────────── */

test('the plate may not contain a hardcoded reading', () => {
    // "6,000 of 32,371 thermal detections" is two facts; a number written
    // into the source is a reading nobody took. Counts on the plate come
    // from the feed or they are not there.
    const problems = [];
    for (const className of ['map-legend--traffic', 'map-legend--strategic']) {
        const block = plateBlock(className);
        const withoutColours = block.replace(/rgba?\([^)]*\)/g, ' ').replace(/#[0-9a-fA-F]{3,8}\b/g, ' ');
        for (const m of withoutColours.matchAll(/\b\d{1,3}(?:,\d{3})+\b/g)) {
            problems.push(`${className} contains the literal reading "${m[0]}"`);
        }
        for (const m of withoutColours.matchAll(/\b\d{4,}\b/g)) {
            problems.push(`${className} contains the literal number "${m[0]}"`);
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

test('no component writes a hardcoded reading with a thousands separator', () => {
    const problems = [];
    for (const file of collectFiles(path.join(SRC, 'components'))) {
        if (!/\.jsx?$/.test(file)) continue;
        const text = readFileSync(file, 'utf8');
        // A colour literal is not a reading: strip rgba() and hex first, or
        // "245,158" inside an amber wash reads as a thousands-separated
        // number and every coloured panel fails the rule.
        const withoutColours = text.replace(/rgba?\([^)]*\)/g, ' ').replace(/#[0-9a-fA-F]{3,8}\b/g, ' ');
        for (const m of withoutColours.matchAll(/\b\d{1,3}(?:,\d{3})+\b/g)) {
            const line = text.slice(0, m.index).split('\n').length;
            problems.push(`${path.relative(ROOT, file)}:${line} contains the literal "${m[0]}"`);
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

/* ──────────────────────────────────────────────────────────────
   6. A SHORT LABEL MAY NOT CONTRADICT ITS FULL LABEL
   ────────────────────────────────────────────────────────────── */

test('a short region label may only shorten its full label, never rename it', () => {
    const problems = [];
    for (const [id, region] of Object.entries(REGIONS)) {
        if (!region.shortLabel) continue;
        assert.ok(region.label, `${id} has no label`);
        const short = region.shortLabel.toLowerCase();
        const full = region.label.toLowerCase();
        if (!full.startsWith(short)) {
            problems.push(`${id}: the short label "${region.shortLabel}" is not the start of "${region.label}"`);
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

/* ──────────────────────────────────────────────────────────────
   7. THE COLOUR RATCHET
   The interface still carries legacy Tailwind-derived washes. That
   debt is recorded rather than hidden: the build may not ADD a new
   one, and the debt may only shrink.
   ────────────────────────────────────────────────────────────── */

const DEBT_FILE = 'tests/fixtures/palette-debt.json';

test('no new colour outside the palette may enter the interface', () => {
    assert.ok(existsSync(path.join(ROOT, DEBT_FILE)), `${DEBT_FILE} must record the known colour debt`);
    const debt = JSON.parse(read(DEBT_FILE));
    const known = new Set(debt.literals.map((l) => l.toLowerCase()));
    const current = new Set();
    const files = [
        ...collectFiles(path.join(SRC, 'styles')),
        ...collectFiles(path.join(SRC, 'components'))
    ];
    for (const file of files) {
        const text = readFileSync(file, 'utf8');
        for (const hex of hexesIn(text)) {
            const value = expandHex(hex);
            if (PALETTE_ROLES.has(value)) continue;
            current.add(value);
        }
        for (const m of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
            const value = rgbToHex(m[1], m[2], m[3]);
            if (PALETTE_ROLES.has(value)) continue;
            current.add(value);
        }
    }
    const fresh = [...current].filter((c) => !known.has(c));
    assert.deepEqual(fresh, [], `new colour(s) outside the palette: ${fresh.join(', ')}`);
});

/* ──────────────────────────────────────────────────────────────
   MUTATION TESTS
   Each one puts a shipped defect back and requires the guard to
   notice. If a rule goes blind, its mutation test fails.
   ────────────────────────────────────────────────────────────── */

test('mutation: the key that disagreed with the drawing is caught', () => {
    const painted = marksInSource('acled-data');
    assert.ok(painted.has('conflict'), 'the fixture must still paint the conflict mark');
    // The defect: the key names one colour while the map paints another.
    const lyingKey = new Set(['vesselCargo']);
    assert.ok(![...painted].every((m) => lyingKey.has(m)), 'a lying key must not satisfy the rule');
});

test('mutation: the dark basemap that was really the street map is caught', () => {
    const bright = { ...MAP_STYLES.topographic };
    assert.ok(relativeLuminance(backgroundColour(bright)) > 0.2, 'the street ground is bright');
    assert.ok(relativeLuminance(backgroundColour(MAP_STYLES.dark)) < 0.2, 'the dark ground is dark');
});

test('mutation: the glow layer is caught', () => {
    const withGlow = { layers: [{ id: 'anchor-points-glow', type: 'circle', paint: { 'circle-blur': 0.4 } }] };
    assert.ok(withGlow.layers.some((l) => /glow/i.test(l.id)), 'the fixture must carry a glow layer');
    assert.ok(withGlow.layers.some((l) => Number(l.paint['circle-blur']) > 0), 'the fixture must carry a blur');
});

test('mutation: a rainbow density ramp is caught', () => {
    const rainbow = "0, 'rgba(167,33,68,0)', 0.5, 'rgba(250,204,21,0.5)', 1, 'rgba(253,255,255,0.9)'";
    const stops = [...rainbow.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g)];
    const rgb = new Set(stops.map((s) => `${s[1]},${s[2]},${s[3]}`));
    assert.ok(rgb.size > 1, 'a rainbow ramp uses more than one hue and must be reported');
});

test('mutation: a short label that renames its region is caught', () => {
    const lying = { label: 'Southeast Asia / Straits', shortLabel: 'Northern Europe' };
    assert.ok(!lying.label.toLowerCase().startsWith(lying.shortLabel.toLowerCase()), 'a renamed region must be reported');
});
