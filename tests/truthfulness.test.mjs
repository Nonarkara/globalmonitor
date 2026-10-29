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
 * ── HOW THE RULES ARE WRITTEN ────────────────────────────────────────────
 * Every rule is a FUNCTION that takes the subject it judges and returns the
 * problems it finds. That is not a style choice. The first version of this
 * file put each rule inline in a `test()` body and wrote "mutation" tests
 * that asserted on synthetic fixtures built inside the test — so the
 * mutation tests could not reach a rule at all, and five neutered rules
 * still passed every test. A reviewer proved it.
 *
 * So: a rule is a function, a test calls it with the real subject, and a
 * mutation test calls it with a subject carrying the shipped defect and
 * requires a problem. If a rule goes blind, its own mutation test fails.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MARK, LEGEND_KEY, STRATEGIC_KEY, VESSEL_CLASSES, groundInk } from '../src/data/mapPalette.js';
import { CITY_FEEDS, CAMERA_TIER, CHANNEL_STATE } from '../src/data/cityFeeds.js';
import { MAP_STYLES, MAP_STYLE_FALLBACKS, ESRI_STREET_STYLE, ESRI_SATELLITE_STYLE } from '../src/data/basemaps.js';
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

/* ─────────────────────────────────────────────────────────────────────────
   THE CLOSED PALETTE
   The roles are named in the contract and written down HERE — not harvested
   from the stylesheet under test. A gate that reads its own standard from
   the thing it is judging cannot fail: adding `--brand-magenta: #ff00ff`
   to :root used to make a magenta mark pass.
   ───────────────────────────────────────────────────────────────────────── */

const PALETTE_ROLES = new Set([
    '#f7f5ef', // paper
    '#ffffff', // white panel
    '#101010', // ink / black
    '#57534b', // ink-2
    '#6b665e', // ink-3
    '#f59e0b', // amber — wayfinding
    '#8a5a00', // amber on paper
    '#1a7444', // green — signal
    '#489b6e', // green — Wada
    '#2c6e4b', // green — focus ring
    '#a72144', // Wada Red — severity, brand
    '#006eb8', // Blue
    '#4f4086', // Violet
    '#b984af', // Lilac
    '#f37420', // Orange
    '#f99d1b', // Yellow-Orange
    '#837e31', // Olive
    '#7c4226', // Brown
    '#12354e', // Dark Tyrian Blue
    // US-EPA AQI bands — a domain standard, used verbatim.
    '#00e400', '#ffff00', '#ff7e00', '#ff0000', '#8b3f3f', '#af7f4d'
]);

/** Every colour a fragment names, hexes and rgba() alike. */
const coloursIn = (text) => {
    const out = new Set();
    for (const hex of hexesIn(text)) out.add(expandHex(hex));
    for (const m of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) out.add(rgbToHex(m[1], m[2], m[3]));
    return out;
};

/**
 * Domain standards, used verbatim like the EPA bands: a broadcaster's brand
 * colour is that broadcaster's identity, not interface chrome. A TV channel
 * that paints its own brand colour is not slop.
 */
const DOMAIN_ROLES = new Set([
    '#0033a0', '#0046a6', '#0055a4', '#0088cc', '#a78bfa', '#c41230',
    '#d4a843', '#e30a17', '#e60023', '#e94b3c', '#fb923c', '#ffcc00'
]);

const hexesIn = (text) => (text.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map((h) => h.toLowerCase());

const expandHex = (hex) => {
    const h = hex.replace('#', '');
    if (h.length === 3) return `#${h.split('').map((c) => c + c).join('')}`;
    return `#${h.slice(0, 6)}`;
};

/** An rgb() triple and the hex it names are the same colour. */
const rgbToHex = (r, g, b) => `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;

/* ─────────────────────────────────────────────────────────────────────────
   RULE 1 — every mark colour is a named role
   ───────────────────────────────────────────────────────────────────────── */

function markPaletteProblems(marks = MARK) {
    const problems = [];
    for (const [name, hex] of Object.entries(marks)) {
        const value = expandHex(String(hex).toLowerCase());
        if (!PALETTE_ROLES.has(value)) problems.push(`MARK.${name} = ${value} is not a palette role`);
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 2 — a plate may not carry a colour of its own
   ───────────────────────────────────────────────────────────────────────── */

const PLATE_CLASSES = ['map-legend--traffic', 'map-legend--strategic'];

/**
 * The JSX of one plate, from its opening tag to the tag that closes it.
 * A naive "up to the first </div>" stops at the end of the FIRST ROW, which
 * leaves three quarters of the plate unscanned — and a rule that only reads
 * a quarter of the plate is blind to the rows it does not read.
 */
const plateBlock = (source, className) => {
    const at = source.indexOf(className);
    if (at === -1) return '';
    const start = source.lastIndexOf('<div', at);
    let depth = 0;
    let i = start;
    while (i < source.length) {
        const nextOpen = source.indexOf('<div', i);
        const nextClose = source.indexOf('</div>', i);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth += 1;
            i = nextOpen + 4;
            continue;
        }
        depth -= 1;
        i = nextClose + 6;
        if (depth === 0) return source.slice(start, i);
    }
    return source.slice(start);
};

function plateLiteralProblems(source, plateClasses = PLATE_CLASSES) {
    const problems = [];
    for (const className of plateClasses) {
        const block = plateBlock(source, className);
        if (!block) {
            problems.push(`the plate ${className} is not in the source`);
            continue;
        }
        for (const hex of hexesIn(block)) problems.push(`${className} contains the literal ${hex}`);
        for (const m of block.matchAll(/rgba?\(\s*\d+/g)) {
            problems.push(`${className} contains the literal colour "${m[0].trim()}"`);
        }
        for (const m of block.matchAll(/var\(--([a-z0-9-]+)\)/gi)) {
            problems.push(`${className} uses the css variable var(--${m[1]}) instead of a named mark`);
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 3 — the key names every colour the map paints for that source
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The colour VALUES a block paints, literals included.
 *
 * Only the COLOUR properties count: a mark's fill, its line, its text. A
 * stroke colour is a hairline around the mark, not another mark, and the
 * first version of this rule counted the ink hairlines and so reported that
 * every source painted a colour the key did not name.
 */
/**
 * The value of a paint property. A bracketed value is read to its matching
 * bracket; a plain one stops at the comma. Reading a plain value with the
 * bracket walker swallows everything up to the next ']' in the file, which
 * is how an ink hairline two properties away ended up inside a mark's colour.
 */
/**
 * EVERY value a block paints for one paint property.
 *
 * The first version of this read only the FIRST occurrence of a property, so a
 * Source with two layers that both set 'line-color' had only the first layer
 * checked. A second layer painting a colour the key did not name passed the
 * gate. Every occurrence is collected now.
 */
const paintValues = (block, property) => {
    const out = [];
    const needle = `'${property}':`;
    let from = 0;
    for (;;) {
        const at = block.indexOf(needle, from);
        if (at === -1) break;
        const rest = block.slice(at + needle.length).trimStart();
        if (rest.startsWith('[')) out.push(balancedBlock(block, needle, at));
        else {
            const m = rest.match(/^[^,\n]+/);
            out.push(m ? m[0] : '');
        }
        from = at + needle.length;
    }
    return out;
};

/**
 * What a block paints: the MARKS it names and the literal COLOURS it writes.
 *
 * Both halves matter. The marks say which key entry must exist; the literals
 * say which colours must be named by value. Comparing values alone cannot
 * tell the shipping lane from the Red Sea area — they are the same amber —
 * so a swapped strategic row would slip through.
 */
const coloursPaintedBy = (source, open, close, { paintPropsOnly = true } = {}) => {
    const at = source.indexOf(open);
    if (at === -1) return null;
    const end = source.indexOf(close, at);
    const block = source.slice(at, end === -1 ? undefined : end);
    const marks = new Set();
    const values = new Set();
    const take = (text) => {
        for (const ref of text.matchAll(/MARK\.([A-Za-z0-9_]+)/g)) {
            if (!MARK[ref[1]]) continue;
            marks.add(ref[1]);
            values.add(expandHex(String(MARK[ref[1]]).toLowerCase()));
        }
        // A colour written as a literal inside a paint block is painted too,
        // and the key must name it. The first version of this rule saw only
        // MARK references, so a layer painting two colours while the key
        // named one passed — the exact defect the rule exists to prevent.
        for (const hex of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) values.add(expandHex(hex[0].toLowerCase()));
    };
    if (!paintPropsOnly) {
        // A data constant is pure mark data: every colour in it is a mark.
        take(block);
        return { marks, values };
    }
    for (const m of block.matchAll(/'([a-z-]*color)':/g)) {
        if (m[1].includes('stroke')) continue;
        for (const value of paintValues(block, m[1])) take(value);
    }
    return { marks, values };
};

/** The colour VALUES a key names. */
const coloursNamedBy = (key) => new Set(key.map((m) => expandHex(String(MARK[m.mark]).toLowerCase())));

/**
 * Which map sources each key answers for. The SOURCES plate answers for the
 * live readings; the STRATEGIC CONTEXT plate answers for the reference
 * routes and areas. The city and tier marks (the anchors, the megaregions,
 * the city network and the beacons) carry their own categorical colouring
 * and are described in the LAYERS panel — they are not readings, and the
 * strategic plate does not claim them.
 */
const SOURCE = (id) => [`<Source id="${id}"`, '</Source>'];
const CONST = (name) => [`const ${name} = {`, '};'];

const KEY_GROUPS = [
    { key: 'aircraft', subjects: [SOURCE('flights-data'), SOURCE('military-flights-data')] },
    { key: 'vessels', subjects: [SOURCE('vessels-data')] },
    { key: 'thermal', subjects: [SOURCE('firms-data')] },
    { key: 'conflicts', subjects: [SOURCE('acled-data')] },
    // The cables were outside every group, so the rule that says "the key names
    // every colour the map paints" never looked at them: ten blue lines with
    // no key entry, painted with a raw literal. The cyclone was the same — a
    // layer with no entry, so nothing checked it.
    { key: 'cables', subjects: [SOURCE('cables-data')] },
    { key: 'storm', subjects: [SOURCE('typhoon-data')] },
    { key: 'strategic', subjects: [CONST('OPERATIONAL_CORRIDORS'), CONST('STRATEGIC_ZONES')] }
];

function keyAgainstDrawingProblems(source, key = LEGEND_KEY, strategicKey = STRATEGIC_KEY, groups = KEY_GROUPS) {
    const problems = [];
    for (const { key: name, subjects } of groups) {
        const entries = name === 'strategic'
            ? [...strategicKey.routes, ...strategicKey.zones]
            : (key[name] || []);
        const paintedMarks = new Set();
        const paintedValues = new Set();
        for (const [open, close] of subjects) {
            const found = coloursPaintedBy(source, open, close, { paintPropsOnly: open.startsWith('<Source') });
            if (!found) {
                problems.push(`the map has no subject "${open}"`);
                continue;
            }
            for (const m of found.marks) paintedMarks.add(m);
            for (const v of found.values) paintedValues.add(v);
        }
        const namedMarks = new Set(entries.map((e) => e.mark));
        const namedValues = coloursNamedBy(entries);
        for (const mark of paintedMarks) {
            if (!namedMarks.has(mark)) problems.push(`${name}: the map paints MARK.${mark} but the key does not name it`);
        }
        for (const mark of namedMarks) {
            if (!paintedMarks.has(mark)) problems.push(`${name}: the key names MARK.${mark} but no layer paints it`);
        }
        for (const value of paintedValues) {
            if (!namedValues.has(value)) problems.push(`${name}: the map paints ${value} but the key does not name it`);
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 12 — a key entry must be rendered
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A key the reader never sees is a key that does not exist.
 *
 * Rule 3 checks that the key and the DRAWING agree. It does not check that
 * the PLATE renders the key at all — and that is exactly the gap the cables
 * fell through: a key entry could be written, the drawing could agree with
 * it, and no row would ever appear on the reader's screen. The rule is that
 * the map component has to reach for the key list by name, so dropping the
 * row out of the plate fails the build.
 */
function keyIsRenderedProblems(source, groups = KEY_GROUPS) {
    const problems = [];
    // A COMMENT IS NOT A RENDER. `{/* LEGEND_KEY.cables */}` used to satisfy
    // the rule: the identifier was in the file, but nothing drew a row. The
    // identifier has to appear where a value is taken out of it — inside a
    // brace, as JSX hands it to a prop or an expression.
    const rendered = (identifier) => new RegExp(`\\{\\s*${identifier.replace('.', '\\.')}`).test(source);
    for (const { key } of groups) {
        if (key === 'strategic') {
            for (const list of ['routes', 'zones']) {
                if (!rendered(`STRATEGIC_KEY.${list}`)) {
                    problems.push(`the strategic plate does not render STRATEGIC_KEY.${list}`);
                }
            }
            continue;
        }
        if (!rendered(`LEGEND_KEY.${key}`)) {
            problems.push(`the plate does not render LEGEND_KEY.${key}`);
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 13 — a layer must keep the qualifier the drawing cannot make
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Some of the claims on this map live in words, not in colour: a model is not
 * an observation, an analysis is not a satellite retrieval, a reference
 * registry is not a live feed, and a barb has to say which way it points.
 * Words are the easiest thing in a codebase to delete in passing, so the
 * words that carry the claim are checked here.
 */
const QUALIFIER_CLAIMS = [
    {
        id: 'wind-model',
        needle: 'Open-Meteo model',
        why: 'the wind field is a model, not an observation',
        surfaces: ['popup', 'plate'],
        where: 'the plate and the popup'
    },
    {
        id: 'wind-convention',
        needle: 'points into the wind',
        why: 'the barb convention has to be stated, or a reader who knows barbs reads it backwards',
        surfaces: ['popup', 'plate'],
        where: 'the plate and the popup'
    },
    {
        id: 'cyclone-provenance',
        needle: 'JMA analysis — not a raw satellite retrieval',
        why: 'the cyclone is an analysis, not a satellite wind retrieval',
        surfaces: ['popup', 'plate'],
        where: 'the plate and the popup'
    },
    {
        id: 'cables-registry',
        needle: 'not a live feed',
        why: 'the cable registry is a reference dataset, not a live feed',
        surfaces: ['plate'],
        where: 'the plate'
    }
];

/**
 * The surfaces a claim can be made in. A claim is not "somewhere in the
 * file" — it is made in the popup the reader opens on the layer, or on the
 * plate. The class name is what tells the two apart.
 */
const CLAIM_SURFACES = {
    popup: 'traffic-tooltip',
    plate: 'map-legend'
};

/**
 * Every place that makes a claim, and the words it must use.
 *
 * A COUNT is not a place, and a MARKER is not a place either. The first
 * version of this rule asked "does the file contain this string at least
 * N times?" — which cannot tell the plate saying it from the popup saying
 * it. The second counted elements carrying `data-claim` — which a reader
 * could satisfy by marking a dead constant somewhere in the file, because
 * a marker is only a marker.
 *
 * So each claim is bound to the SURFACES it must be made in, and a marked
 * element only counts for the surface it actually sits in: the nearest
 * enclosing surface marker before it. A forged marker outside a popup or
 * the plate counts for nothing, and moving both copies of a claim into
 * one surface leaves the other surface with no claim at all.
 */
const elementText = (source, tag, from) => {
    const open = new RegExp(`<${tag}(?=[\\s/>])`, 'g');
    const close = new RegExp(`</${tag}\\s*>`, 'g');
    let depth = 1;
    let at = from;
    let end = -1;
    while (depth > 0) {
        open.lastIndex = at;
        close.lastIndex = at;
        const o = open.exec(source);
        const c = close.exec(source);
        if (!c) return { text: null, unterminated: true };
        if (o && o.index < c.index) {
            depth += 1;
            at = o.index + 1;
        } else {
            depth -= 1;
            at = c.index + c[0].length;
            if (depth === 0) end = c.index + c[0].length;
        }
    }
    return { text: source.slice(from, end).replace(/<\/[^>]+>\s*$/, ''), unterminated: false };
};

const claimSites = (source, id) => {
    const sites = [];
    const re = /<(\w+)\b[^>]*data-claim="([^"]*)"[^>]*>/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        if (!m[2].split(/\s+/).includes(id)) continue;
        // The surface this site sits in: the NEAREST surface marker before
        // it. A marker with no surface in front of it is in nothing a
        // reader ever sees.
        let surface = null;
        for (const [name, marker] of Object.entries(CLAIM_SURFACES)) {
            const at = source.lastIndexOf(marker, m.index);
            if (at === -1) continue;
            if (!surface || at > surface.at) surface = { name, at };
        }
        const { text, unterminated } = elementText(source, m[1], m.index + m[0].length);
        sites.push({ surface: surface?.name || null, text, unterminated, at: m.index });
    }
    return sites;
};

function qualifierClaimProblems(source, claims = QUALIFIER_CLAIMS) {
    const problems = [];
    for (const { id, needle, why, surfaces = [], where } of claims) {
        const sites = claimSites(source, id);
        for (const surface of surfaces) {
            const inSurface = sites.filter((s) => s.surface === surface);
            if (!inSurface.length) {
                problems.push(`the claim "${id}" is not made in the ${surface} — ${why} (${where})`);
                continue;
            }
            for (const site of inSurface) {
                if (site.unterminated) {
                    problems.push(`a ${surface} that makes the claim "${id}" is never closed — the rule cannot read it — ${why}`);
                } else if (!site.text.includes(needle)) {
                    problems.push(`a ${surface} that makes the claim "${id}" does not say "${needle}" — ${why} (${where})`);
                }
            }
        }
        for (const site of sites) {
            if (!site.surface) {
                problems.push(`the claim "${id}" is marked where no reader sees it — ${why}`);
            } else if (!surfaces.includes(site.surface)) {
                problems.push(`the claim "${id}" is marked in the ${site.surface}, which does not carry it — ${why}`);
            }
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 14 — the city wall keeps its degrees of "live"
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A camera screen is one of three things — a video stream, a refreshing
 * JPEG, or nothing — and a broadcast is one of four — live, VOD, dormant,
 * stale. The wall says which, in words, and the words are keyed to the data.
 *
 * The rule is on the DATA, because that is where the claim is made: every
 * city must carry a camera kind and a channel state that have a label, and
 * every camera must name the source it came from. A city with no verified
 * camera is a `none` with a label, not a missing entry — a missing entry
 * would read as a city that was forgotten.
 */
function cityFeedProblems(feeds = CITY_FEEDS) {
    const problems = [];
    if (!Array.isArray(feeds) || feeds.length === 0) {
        problems.push('the city wall has no cities');
        return problems;
    }
    const ids = new Set();
    for (const city of feeds) {
        const id = city?.id || '(no id)';
        if (!city?.id) problems.push('a city has no id');
        if (ids.has(city?.id)) problems.push(`the city "${id}" appears twice`);
        ids.add(city?.id);

        const kind = city?.camera?.kind;
        if (!kind) problems.push(`${id}: no camera kind`);
        else if (!CAMERA_TIER[kind]) problems.push(`${id}: camera kind "${kind}" has no label`);
        if (!city?.camera?.label) problems.push(`${id}: the camera carries no label`);
        if (!city?.camera?.source) problems.push(`${id}: the camera names no source`);
        // The label has to say what the KIND is, in words. A camera whose
        // kind is 'snapshot' and whose label does not say "snapshot" is a
        // screen the reader will read as video.
        if (kind === 'snapshot' && !/snapshot/i.test(city?.camera?.label || '')) {
            problems.push(`${id}: a snapshot camera does not say it is a snapshot`);
        }
        if (kind === 'snapshot' && /live\s*video/i.test(city?.camera?.label || '')) {
            problems.push(`${id}: a snapshot camera claims to be live video`);
        }
        if (kind === 'none' && !/no verified public camera/i.test(city?.camera?.label || '')) {
            problems.push(`${id}: a city with no camera does not say so`);
        }
        if (kind === 'hls' && !/stream/i.test(city?.camera?.label || '')) {
            problems.push(`${id}: an HLS camera does not say it is a stream`);
        }
        // A static file may not claim the frame REFRESHES. Whether the image
        // changes is measured by probing it twice; the registry cannot know,
        // and a tile labelled "refreshing" over a still frame is a lie in
        // nine-point type — the contract names the case.
        if (/refreshing/i.test(city?.camera?.label || '')) {
            problems.push(`${id}: the registry claims the frame refreshes — only a probe may say that`);
        }
        // The same rule for the camera's NOTE: "was verified live" is a
        // claim about a stream that only the probe can make, and it
        // outlives the verification that made it. One tile carried
        // "The HLS stream behind this camera was verified live" for weeks
        // after the probe had stopped agreeing.
        const cameraNote = city?.camera?.note || '';
        if (/(was verified live|verified running|running a stream|is live\b|streaming live now)/i.test(cameraNote)) {
            problems.push(`${id}: the camera note claims a live state — only a probe may say that`);
        }

        const state = city?.channel?.state;
        if (!state) problems.push(`${id}: no channel state`);
        else if (!CHANNEL_STATE[state]) problems.push(`${id}: channel state "${state}" has no label`);
        if (!city?.channel?.label) problems.push(`${id}: the channel carries no label`);

        // A STATIC FILE MAY NOT CLAIM WHAT THE PROBE MEASURES. The registry
        // says what a channel IS; the condition of a channel is measured.
        // A note that says a stream is running — or that none is — is a
        // claim about the present that a file cannot make, and it outlives
        // the measurement that made it: one tile carried "VOD — no live
        // stream running at the probe time" directly above "Live stream
        // verified running". Two claims, one of them false.
        const note = city?.channel?.note || '';
        if (state !== 'live' && /(verified running|running a stream|streaming live|is live\b)/i.test(note)) {
            problems.push(`${id}: the channel note claims a live state — only the probe may say that`);
        }
        if (state === 'live' && /(no stream was running|no live stream|not streaming live|was not streaming)/i.test(note)) {
            problems.push(`${id}: the channel note claims no stream is running — only the probe may say that`);
        }
        // And a registry that names any condition other than "unconfirmed"
        // is asserting a measurement it never made. The probe owns the
        // state; the file owns the channel.
        if (state !== 'unconfirmed') {
            problems.push(`${id}: the registry claims the channel state "${state}" — a static file may only say "unconfirmed"`);
        }
        if (state === 'unconfirmed' && !/not answered|did not answer|unconfirmed/i.test(city?.channel?.label || '')) {
            problems.push(`${id}: an unconfirmed channel does not say it is unconfirmed`);
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 4/5 — a control may not lie about what it does
   ───────────────────────────────────────────────────────────────────────── */

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

function basemapDistinctProblems(styles = MAP_STYLES) {
    const problems = [];
    const seen = new Map();
    for (const [id, style] of Object.entries(styles)) {
        const urls = styleUrls(style);
        if (!urls.length) problems.push(`${id} has no tile source`);
        for (const url of urls) {
            if (seen.has(url)) problems.push(`${id} serves the same tiles as ${seen.get(url)} — two options, one ground`);
            else seen.set(url, id);
        }
    }
    return problems;
}

function darkGroundProblems(styles = MAP_STYLES, fallbacks = MAP_STYLE_FALLBACKS) {
    const problems = [];
    const bg = backgroundColour(styles.dark);
    if (!bg) problems.push('the dark style must paint a background');
    else if (relativeLuminance(bg) >= 0.2) problems.push(`the "dark" ground is ${bg} — that is not dark`);

    const fallback = fallbacks.dark;
    if (!fallback) {
        problems.push('the dark ground must have a fallback');
    } else if (fallback === styles.topographic) {
        // The defect the rule exists for: the dark map falls back to the
        // bright street map, so the promise breaks exactly when it is needed.
        problems.push('the dark ground falls back to the bright street map');
    } else {
        const fallbackBg = backgroundColour(fallback);
        if (fallbackBg && relativeLuminance(fallbackBg) >= 0.2) {
            problems.push(`the dark fallback paints ${fallbackBg} — a bright ground breaks the promise`);
        }
        // A fallback with no background layer is imagery: dark enough to
        // keep the promise, but it must not be the street map.
        if (!fallbackBg && fallback !== ESRI_SATELLITE_STYLE) {
            problems.push('the dark fallback must be the dark canvas or the imagery');
        }
    }
    return problems;
}

function satelliteGroundProblems(styles = MAP_STYLES) {
    const urls = styleUrls(styles.satellite).join(' ');
    return /Imagery/i.test(urls) ? [] : ['the satellite option must serve an imagery service'];
}

function pickerLabelProblems(styles = MAP_STYLES, sidebar = read('src/components/Sidebar.jsx')) {
    const problems = [];
    for (const id of Object.keys(styles)) {
        if (!sidebar.includes(`'${id}'`) && !sidebar.includes(`"${id}"`)) {
            problems.push(`the "${id}" ground has no name in the picker`);
        }
    }
    // The name the reader sees must say what the ground renders.
    for (const [id, label] of [['topographic', 'Topographic'], ['satellite', 'Satellite'], ['dark', 'Dark']]) {
        if (!sidebar.includes(label)) problems.push(`the picker does not offer "${label}" for the "${id}" ground`);
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 6 — no glow
   ───────────────────────────────────────────────────────────────────────── */

function glowProblems(source, styles = MAP_STYLES) {
    const problems = [];
    for (const [id, style] of Object.entries(styles)) {
        for (const layer of style.layers || []) {
            if (/glow/i.test(layer.id)) problems.push(`basemap ${id} has a layer called "${layer.id}"`);
            for (const [key, value] of Object.entries(layer.paint || {})) {
                if (/blur/i.test(key) && Number(value) > 0) problems.push(`basemap ${id} layer ${layer.id} paints ${key}: ${value}`);
            }
        }
    }
    for (const m of source.matchAll(/\bglow:\s*\d+/g)) problems.push(`the map data carries a glow property (${m[0]})`);
    for (const m of source.matchAll(/id="([^"]*glow[^"]*)"/g)) problems.push(`the map has a glow layer "${m[1]}"`);
    for (const m of source.matchAll(/'(circle-blur|fill-blur|line-blur)':\s*([0-9.]+)/g)) {
        if (Number(m[2]) > 0) problems.push(`the map paints ${m[1]}: ${m[2]}`);
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 7 — a label has one voice
   The ink identifiers and the values they may hold. A symbol layer takes
   its colour from one of these and never from a literal of its own.
   ───────────────────────────────────────────────────────────────────────── */

const INK_IDENTIFIERS = {
    labelInk: ['#101010', '#f7f5ef'],
    labelHalo: ['#101010', '#f7f5ef'],
    labelSeverity: ['#a72144', '#f37420'],
    labelMilitary: ['#8a5a00', '#f99d1b'],
    basemapInk: ['#57534b', '#f7f5ef']
};

function labelVoiceProblems(source) {
    const problems = [];
    for (const [name, allowed] of Object.entries(INK_IDENTIFIERS)) {
        const def = new RegExp(`const\\s+${name}\\s*=\\s*([^;]+);`).exec(source);
        if (!def) {
            problems.push(`the ink identifier ${name} is not defined`);
            continue;
        }
        for (const value of coloursIn(def[1])) {
            if (!allowed.includes(value)) {
                problems.push(`${name} may only be ${allowed.join(' or ')}, not ${value}`);
            }
        }
    }
    for (const m of source.matchAll(/'(text-color|text-halo-color)':\s*([^,\n}]+)/g)) {
        const [property, expression] = [m[1], m[2].trim()];
        if (/#[0-9a-fA-F]{3,8}/.test(expression)) {
            problems.push(`a symbol layer paints ${property} ${expression} — a label wears the ground's ink, not a colour of its own`);
            continue;
        }
        const used = [...expression.matchAll(/[A-Za-z_$][\w$]*/g)].map((x) => x[0]);
        const known = used.filter((id) => Object.keys(INK_IDENTIFIERS).includes(id));
        const unknown = used.filter((id) => !Object.keys(INK_IDENTIFIERS).includes(id)
            && !['case', 'get', 'concat', 'step', 'match', 'literal', 'has', 'zoom', 'interpolate', 'linear', 'coalesce'].includes(id));
        if (known.length === 0) problems.push(`a symbol layer paints ${property} ${expression} — which is not a named ink`);
        if (unknown.length) problems.push(`a symbol layer paints ${property} with ${unknown.join(', ')} — not a named ink`);
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 8 — a density field is one hue that deepens with density
   ───────────────────────────────────────────────────────────────────────── */

/** The balanced-bracket block that follows a marker. */
const balancedBlock = (text, marker, from = 0) => {
    const at = text.indexOf(marker, from);
    if (at === -1) return '';
    const start = at + marker.length;
    let depth = 0;
    let quote = null;
    for (let i = start; i < text.length; i += 1) {
        const ch = text[i];
        if (quote) {
            if (ch === '\\') { i += 1; continue; }
            if (ch === quote) quote = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
        if (ch === '[') depth += 1;
        else if (ch === ']') {
            depth -= 1;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return '';
};

function densityRampProblems(source) {
    const problems = [];
    const marker = "'heatmap-color':";
    let at = source.indexOf(marker);
    let examined = 0;
    while (at !== -1) {
        // The block has to be read FROM HERE. Read from the start, the
        // reader finds the FIRST occurrence every time: the loop walked
        // past the second ramp and re-read the first, so a blue second
        // ramp passed a rule written to catch it. The occurrence count is
        // checked at the end so the next occurrence cannot be skipped
        // either.
        const block = balancedBlock(source, marker, at);
        examined += 1;
        const stops = [...block.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g)];
        if (stops.length >= 2) {
            const rgb = new Set(stops.map((s) => `${s[1]},${s[2]},${s[3]}`));
            if (rgb.size > 1) problems.push(`a density ramp uses ${rgb.size} hues — a field must be one hue`);
            let last = -1;
            for (const s of stops) {
                const alpha = Number(s[4]);
                if (alpha < last) problems.push(`a density ramp gets lighter as it gets denser (${alpha} after ${last})`);
                last = alpha;
            }
        } else if (stops.length === 1) {
            problems.push('a density ramp has a single stop — it cannot deepen with density');
        }
        at = source.indexOf(marker, at + marker.length);
    }
    // The rule must have looked at every ramp the source paints. If the
    // count of ramps examined is short of the count present, a ramp was
    // skipped and the rule proved nothing about it.
    const present = source.split(marker).length - 1;
    if (examined !== present) {
        problems.push(`the density rule read ${examined} ramp(s) but the source paints ${present}`);
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 9 — nothing on the plate is invented
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A literal count. "1,200 aircraft" and "500 detections" are readings; a
 * year, a version and a coordinate are not, so the pattern needs the shape
 * of a count — thousands grouped, or a number with a count noun after it.
 */
const READING_PATTERN = /\b\d{1,3}(?:,\d{3})+\b|\b\d{2,}\s+(?:detections?|aircraft|vessels?|events?|people|migrants|casualties|containers|tonnes|barrels)\b/gi;

function hardcodedReadingProblems(source, plateClasses = PLATE_CLASSES) {
    const problems = [];
    for (const className of plateClasses) {
        const block = plateBlock(source, className);
        // A colour literal is not a reading: strip rgba() and hex first, or
        // "245,158" inside an amber wash reads as a thousands-separated
        // number and every coloured panel fails the rule.
        const withoutColours = block.replace(/rgba?\([^)]*\)/g, ' ').replace(/#[0-9a-fA-F]{3,8}\b/g, ' ');
        for (const m of withoutColours.matchAll(READING_PATTERN)) {
            problems.push(`${className} contains the literal reading "${m[0]}"`);
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 16 — nothing on the plate is hidden IN PLACE
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A box that is only hidden still takes its space.
 *
 * The plate hid its rows with `visibility: hidden` and the STRATEGIC CONTEXT
 * panel hid itself the same way, so at every viewport the map carried a
 * 206-211px panel of nothing in its top-left corner — over the live layers
 * control — for a panel that could never be switched on. And a hidden row
 * leaves a gap in the list where a reading used to be.
 *
 * So: a plate row, and the plate itself, are RENDERED when they have
 * something to say and are ABSENT otherwise. The rule is that the map
 * component never asks the browser to lay out something the reader cannot
 * see.
 */
function hiddenInPlaceProblems(source) {
    const problems = [];
    // `visibility: 'hidden'` / `visibility: hidden` inside a plate or a row
    const hidden = /visibility\s*:\s*(['"]hidden['"]|hidden)/g;
    for (const m of source.matchAll(hidden)) {
        const line = source.slice(0, m.index).split('\n').length;
        problems.push(`line ${line}: something is hidden in place — a hidden box still takes its space`);
    }
    // `opacity: 0` is the same trick wearing a different hat.
    for (const m of source.matchAll(/opacity\s*:\s*(['"]0['"]|0)\s*[,}]/g)) {
        const line = source.slice(0, m.index).split('\n').length;
        problems.push(`line ${line}: something is painted at zero opacity — it still takes its space`);
    }
    return problems;
}

function hardcodedReadingInComponentsProblems(files) {
    const problems = [];
    for (const file of files) {
        const text = readFileSync(file, 'utf8');
        const withoutColours = text.replace(/rgba?\([^)]*\)/g, ' ').replace(/#[0-9a-fA-F]{3,8}\b/g, ' ');
        for (const m of withoutColours.matchAll(READING_PATTERN)) {
            const line = text.slice(0, m.index).split('\n').length;
            problems.push(`${path.relative(ROOT, file)}:${line} contains the literal "${m[0]}"`);
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 10 — a short label may not contradict its full label
   ───────────────────────────────────────────────────────────────────────── */

function shortLabelProblems(regions = REGIONS) {
    const problems = [];
    for (const [id, region] of Object.entries(regions)) {
        if (!region.shortLabel) continue;
        if (!region.label) {
            problems.push(`${id} has a short label and no label`);
            continue;
        }
        if (!region.label.toLowerCase().startsWith(region.shortLabel.toLowerCase())) {
            problems.push(`${id}: the short label "${region.shortLabel}" is not the start of "${region.label}"`);
        }
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   RULE 11 — the colour ratchet
   The interface still owes the Palette. The debt is written down HERE, in
   the same file as the rule, so raising it is a visible change in the rule
   rather than an edit to a data file nobody reads. DEBT_CEILING may only go
   DOWN: a reviewer sees the one-line change, and the rule below refuses a
   baseline larger than the ceiling.
   ───────────────────────────────────────────────────────────────────────── */

const DEBT_BASELINE = new Set([
    '#000000', '#0000ff', '#00ff00', '#050e20', '#080c14', '#091734', '#0a0e14',
    '#0a0e1a', '#0c101a', '#0e121c', '#0ea5e9', '#10b981', '#111111', '#118855',
    '#121010', '#161c28', '#191712', '#222222', '#22c55e', '#2b2f36', '#333333',
    '#38bdf8', '#3b82f6', '#3c4a2f', '#555555', '#6366f1', '#666666', '#8b5cf6',
    '#94a3b8', '#999999', '#a855f7', '#aaaaaa', '#cccccc', '#d8dee4', '#d9d5c9',
    '#dc2626', '#dddddd', '#eab308', '#eeeeee', '#ef4444', '#f472b6', '#ffc400'
]);

/** This number may only go down. It is the size of the debt as it stands. */
const DEBT_CEILING = 42;

function colourRatchetProblems(files, baseline = DEBT_BASELINE, ceiling = DEBT_CEILING) {
    const problems = [];
    if (baseline.size > ceiling) {
        problems.push(`the colour debt holds ${baseline.size} entries but the ceiling is ${ceiling} — the debt may only shrink`);
    }
    const current = new Set();
    for (const file of files) {
        const text = readFileSync(file, 'utf8');
        for (const hex of hexesIn(text)) {
            const value = expandHex(hex);
            if (!PALETTE_ROLES.has(value) && !DOMAIN_ROLES.has(value)) current.add(value);
        }
        for (const m of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
            const value = rgbToHex(m[1], m[2], m[3]);
            if (!PALETTE_ROLES.has(value) && !DOMAIN_ROLES.has(value)) current.add(value);
        }
    }
    for (const value of current) {
        if (!baseline.has(value)) problems.push(`new colour outside the palette: ${value}`);
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────
   THE SUBJECTS
   ───────────────────────────────────────────────────────────────────────── */

const mapContainer = read('src/components/MapContainer.jsx');
const interfaceFiles = [
    ...collectFiles(path.join(SRC, 'styles')),
    ...collectFiles(path.join(SRC, 'components')),
    ...collectFiles(path.join(SRC, 'data')),
    path.join(SRC, 'App.jsx')
].filter((f) => /\.(css|jsx?)$/.test(f));

/* ─────────────────────────────────────────────────────────────────────────
   THE RULES, RUN
   ───────────────────────────────────────────────────────────────────────── */

test('every mark colour is a named role in the closed palette', () => {
    assert.deepEqual(markPaletteProblems(), []);
});

test('the mark palette and the interface tokens agree on the same roles', () => {
    const token = (read('src/styles/index.css').match(/--ink-2:\s*(#[0-9a-fA-F]{3,8})/) || [])[1];
    assert.ok(token, '--ink-2 must exist');
    assert.equal(expandHex(token.toLowerCase()), groundInk(false), 'groundInk(false) must be --ink-2');
});

test('no plate carries a colour of its own — every swatch comes from the mark palette', () => {
    assert.deepEqual(plateLiteralProblems(mapContainer), []);
});

test('the key names every colour the map paints for that source, and no others', () => {
    assert.deepEqual(keyAgainstDrawingProblems(mapContainer), []);
});

test('every key the house owns is actually rendered by a plate', () => {
    assert.deepEqual(keyIsRenderedProblems(mapContainer), []);
});

test('a layer keeps the qualifier its drawing cannot make for it', () => {
    assert.deepEqual(qualifierClaimProblems(mapContainer), []);
});

test('every city in the wall names its camera tier and its channel state', () => {
    assert.deepEqual(cityFeedProblems(), []);
});

test('mutation: a city whose camera tier has no label is caught', () => {
    const broken = CITY_FEEDS.map((city, index) => (
        index === 0 ? { ...city, camera: { ...city.camera, kind: 'videostream' } } : city
    ));
    const problems = cityFeedProblems(broken);
    assert.ok(problems.length > 0, 'a camera kind with no label must be reported');
});

test('mutation: a city with no camera source is caught', () => {
    const broken = CITY_FEEDS.map((city, index) => (
        index === 0 ? { ...city, camera: { ...city.camera, source: '' } } : city
    ));
    const problems = cityFeedProblems(broken);
    assert.ok(problems.length > 0, 'a camera with no source must be reported');
});

test('mutation: a snapshot camera whose label calls it live video is caught', () => {
    const broken = CITY_FEEDS.map((city, index) => (
        index === 0 ? { ...city, camera: { ...city.camera, label: 'Live video feed' } } : city
    ));
    const problems = cityFeedProblems(broken);
    assert.ok(problems.length > 0, 'a snapshot that claims to be live video must be reported');
});

test('mutation: a channel note that claims a live state is caught', () => {
    const broken = CITY_FEEDS.map((city, index) => (
        index === 0
            ? { ...city, channel: { ...city.channel, note: 'Live stream verified running on the channel\'s own live tab.' } }
            : city
    ));
    const problems = cityFeedProblems(broken);
    assert.ok(problems.length > 0, 'a static file claiming a live state must be reported');
});

test('mutation: a channel note that claims no stream is running is caught', () => {
    const broken = CITY_FEEDS.map((city, index) => (
        index === 0
            ? {
                ...city,
                channel: {
                    ...city.channel,
                    state: 'live',
                    label: 'LIVE',
                    note: 'No stream was running on the live tab at the probe time.'
                }
            }
            : city
    ));
    const problems = cityFeedProblems(broken);
    assert.ok(problems.length > 0, 'a note contradicting the channel state must be reported');
});

test('mutation: a registry that claims a measured channel state is caught', () => {
    const broken = CITY_FEEDS.map((city, index) => (
        index === 0
            ? { ...city, channel: { ...city.channel, state: 'live', label: 'LIVE' } }
            : city
    ));
    const problems = cityFeedProblems(broken);
    assert.ok(problems.length > 0, 'a static file asserting a measured state must be reported');
});

test('mutation: a camera note that claims a live state is caught', () => {
    const broken = CITY_FEEDS.map((city, index) => (
        index === 0
            ? { ...city, camera: { ...city.camera, note: 'The HLS stream behind this camera was verified live.' } }
            : city
    ));
    const problems = cityFeedProblems(broken);
    assert.ok(problems.length > 0, 'a static file claiming a live stream must be reported');
});

test('each basemap option is a different ground, and none of them is another one renamed', () => {
    assert.deepEqual(basemapDistinctProblems(), []);
});

test('the "dark" ground is dark, and the dark fallback does not break the promise', () => {
    assert.deepEqual(darkGroundProblems(), []);
});

test('the "satellite" ground is imagery, not a street map in disguise', () => {
    assert.deepEqual(satelliteGroundProblems(), []);
});

test('every basemap option is named in the picker, by the name the reader sees', () => {
    assert.deepEqual(pickerLabelProblems(), []);
});

test('no glow anywhere: no glow layer, no glow property, no blurred paint', () => {
    assert.deepEqual(glowProblems(mapContainer), []);
});

test('a label has one voice: no symbol layer wears a colour of its own', () => {
    assert.deepEqual(labelVoiceProblems(mapContainer), []);
});

test('a density field is one hue that deepens with density', () => {
    assert.deepEqual(densityRampProblems(mapContainer), []);
});

test('the plate may not contain a hardcoded reading', () => {
    assert.deepEqual(hardcodedReadingProblems(mapContainer), []);
});

test('nothing on the map is hidden in place — a hidden box still takes its space', () => {
    assert.deepEqual(hiddenInPlaceProblems(mapContainer), []);
});

test('mutation: a plate row hidden in place is caught', () => {
    const broken = mapContainer.replace(
        '{flightsLayerActive && (',
        "{true && (\n                <div className=\"map-legend-item\" style={{ visibility: 'hidden' }}>"
    );
    assert.notEqual(broken, mapContainer, 'the fixture must hide a row in place');
    const problems = hiddenInPlaceProblems(broken);
    assert.ok(problems.length > 0, 'a row hidden in place must be reported');
});

test('mutation: the strategic panel hidden in place is caught', () => {
    const broken = mapContainer.replace(
        '{showStrategicContext && (',
        "{true && (\n                <div className=\"map-legend map-legend--strategic\" style={{ visibility: 'hidden' }}>"
    );
    assert.notEqual(broken, mapContainer, 'the fixture must hide the panel in place');
    const problems = hiddenInPlaceProblems(broken);
    assert.ok(problems.length > 0, 'a panel hidden in place must be reported');
});

test('no component writes a hardcoded reading', () => {
    assert.deepEqual(hardcodedReadingInComponentsProblems(collectFiles(path.join(SRC, 'components'))), []);
});

test('a short region label may only shorten its full label, never rename it', () => {
    assert.deepEqual(shortLabelProblems(), []);
});

test('no new colour outside the palette may enter the interface', () => {
    assert.deepEqual(colourRatchetProblems(interfaceFiles), []);
});

/* ─────────────────────────────────────────────────────────────────────────
   MUTATION TESTS
   Each one puts a shipped defect back and calls the rule that must catch
   it. The rule is the SAME function the test above calls with the real
   subject — so if the rule goes blind, this test fails.
   ───────────────────────────────────────────────────────────────────────── */

test('mutation: a key that disagrees with the drawing is caught', () => {
    const broken = mapContainer.replace(
        "'circle-color': MARK.conflict,",
        "'circle-color': ['case', ['==', ['get', 'fatalities'], 5], '#006eb8', MARK.conflict],"
    );
    assert.notEqual(broken, mapContainer, 'the fixture must change the drawing');
    const problems = keyAgainstDrawingProblems(broken);
    assert.ok(problems.length > 0, 'a layer painting two colours while the key names one must be reported');
});

test('mutation: a key that names a colour nobody paints is caught', () => {
    const brokenKey = { ...LEGEND_KEY, conflicts: [{ mark: 'vesselCargo', label: 'event' }] };
    const problems = keyAgainstDrawingProblems(mapContainer, brokenKey);
    assert.ok(problems.length > 0, 'a key naming a mark nobody paints must be reported');
});

test('mutation: a SECOND layer in one source painting an unnamed colour is caught', () => {
    // A Source with two layers that both set 'line-color'. The first names a
    // mark the key knows; the second paints a colour nobody named. The first
    // version of the rule read only the FIRST occurrence of a paint property,
    // so the second layer was invisible to it and this defect shipped twice.
    const synthetic = [
        '<Source id="cables-data" type="geojson" data={CABLES}>',
        "<Layer id='cables-lines' type='line' paint={{ 'line-color': MARK.cable }} />",
        "<Layer id='cables-casing' type='line' paint={{ 'line-color': '#837e31' }} />",
        '</Source>'
    ].join('\n');
    const problems = keyAgainstDrawingProblems(synthetic, LEGEND_KEY, STRATEGIC_KEY, [
        { key: 'cables', subjects: [SOURCE('cables-data')] }
    ]);
    assert.ok(problems.length > 0, 'a second layer painting an unnamed colour must be reported');
});

test('mutation: a key entry that no plate renders is caught', () => {
    const broken = mapContainer.replace(
        '<LegendClasses marks={LEGEND_KEY.cables} />',
        '<span>cables</span>'
    );
    assert.notEqual(broken, mapContainer, 'the fixture must change the plate');
    const problems = keyIsRenderedProblems(broken);
    assert.ok(problems.length > 0, 'a key entry that no plate renders must be reported');
});

test('mutation: a key that is only mentioned in a comment is caught', () => {
    // A comment is not a render. The identifier has to be somewhere a value
    // is taken out of it — inside a brace, as JSX hands it to a prop.
    const broken = mapContainer.replace(
        '<LegendClasses marks={LEGEND_KEY.cables} />',
        '{/* LEGEND_KEY.cables */}'
    );
    assert.notEqual(broken, mapContainer, 'the fixture must comment the render out');
    const problems = keyIsRenderedProblems(broken);
    assert.ok(problems.length > 0, 'a key that only appears in a comment must be reported');
});

test('mutation: a layer that drops its qualifier is caught', () => {
    // EVERY occurrence: the qualifier appears on the plate and again in the
    // layer's own popup, and dropping it from one of them is not the same as
    // dropping it from the map.
    const broken = mapContainer.replaceAll('Open-Meteo model', 'Wind data');
    assert.notEqual(broken, mapContainer, 'the fixture must change the plate');
    const problems = qualifierClaimProblems(broken);
    assert.ok(problems.length > 0, 'a layer that stops saying what it is must be reported');
});

test('mutation: dropping the qualifier from ONE of its two places is caught', () => {
    // The plate keeps its copy; the popup loses it. "Is this string in the
    // file?" could not tell the difference — the claim was still there, on
    // the plate, and the reader who opens the popup saw nothing.
    const broken = mapContainer.replace(
        'Open-Meteo model — not an observation',
        'Model output'
    );
    assert.notEqual(broken, mapContainer, 'the fixture must change one copy only');
    const problems = qualifierClaimProblems(broken);
    assert.ok(problems.length > 0, 'a qualifier dropped from one of its two places must be reported');
});

test('mutation: moving BOTH copies to one place is caught', () => {
    // The count stays at two — the popup's copy is deleted and the plate's
    // is duplicated, so the file still contains the string twice and still
    // has two marked elements — and the popup has stopped qualifying
    // anything. A count cannot see it; a SURFACE can.
    const broken = mapContainer
        .replace('<span data-claim="wind-model">Open-Meteo model — not an observation</span>', '')
        .replace(
            '<span data-claim="wind-model wind-convention">',
            '<span data-claim="wind-model">Open-Meteo model — not an observation</span>\n                                        <span data-claim="wind-model wind-convention">'
        );
    assert.notEqual(broken, mapContainer, 'the fixture must move the claim');
    assert.equal(
        broken.split('data-claim="wind-model"').length - 1 +
        broken.split('data-claim="wind-model wind-convention"').length - 1,
        2,
        'the fixture must keep the number of marked sites the same'
    );
    const problems = qualifierClaimProblems(broken);
    assert.ok(problems.length > 0, 'a claim that survives in one place only must be reported');
});

test('mutation: a FORGED claim marker outside any surface is caught', () => {
    // A marker is only a marker. A dead constant at the top of the file,
    // marked as if it were the popup's claim, satisfies a rule that counts
    // markers — and the popup has stopped saying anything.
    const broken = mapContainer.replace(
        "import { fetchNaturalDisasters } from '../services/nasaEonet';",
        "import { fetchNaturalDisasters } from '../services/nasaEonet';\nconst forged = <span data-claim=\"wind-model\">Open-Meteo model — not an observation</span>;"
    );
    assert.notEqual(broken, mapContainer, 'the fixture must forge a marker');
    const problems = qualifierClaimProblems(broken);
    assert.ok(problems.length > 0, 'a claim marked where no reader sees it must be reported');
});

test('mutation: unmarking a claim site is caught', () => {
    // The words are still in the file, in both places — but one place no
    // longer declares that it is making a claim, so nothing would check it.
    const broken = mapContainer.replace('data-claim="wind-model">', '>');
    assert.notEqual(broken, mapContainer, 'the fixture must unmark a site');
    const problems = qualifierClaimProblems(broken);
    assert.ok(problems.length > 0, 'a claim made in too few marked places must be reported');
});

test('mutation: the strategic plate naming the wrong route colour is caught', () => {
    const brokenKey = {
        routes: [{ mark: 'routeEnergy', label: 'Energy route reference' }, { mark: 'routeEnergy', label: 'Shipping lane reference' }, { mark: 'routeEast', label: 'Regional city network' }],
        zones: STRATEGIC_KEY.zones
    };
    const problems = keyAgainstDrawingProblems(mapContainer, LEGEND_KEY, brokenKey);
    assert.ok(problems.length > 0, 'a strategic key that drops a painted colour must be reported');
});

test('mutation: a plate that grows a colour of its own is caught', () => {
    const broken = mapContainer.replace(
        '<LegendKey marks={LEGEND_KEY.conflicts} />',
        '<span className="map-legend-line" style={{ background: \'#6b665e\' }} />'
    );
    assert.notEqual(broken, mapContainer, 'the fixture must change the plate');
    assert.ok(plateLiteralProblems(broken).length > 0, 'a literal swatch must be reported');
});

test('mutation: the dark basemap that was really the street map is caught', () => {
    const broken = { ...MAP_STYLES, dark: ESRI_STREET_STYLE };
    assert.ok(darkGroundProblems(broken, MAP_STYLE_FALLBACKS).length > 0, 'a bright "dark" ground must be reported');
});

test('mutation: the dark map falling back to the bright street map is caught', () => {
    const broken = { ...MAP_STYLE_FALLBACKS, dark: ESRI_STREET_STYLE };
    assert.ok(darkGroundProblems(MAP_STYLES, broken).length > 0, 'a bright fallback must be reported');
});

test('mutation: a glow layer is caught', () => {
    const broken = mapContainer.replace('id="vessels-icons"', 'id="vessels-icons-glow"');
    assert.notEqual(broken, mapContainer, 'the fixture must add a glow');
    assert.ok(glowProblems(broken).length > 0, 'a glow layer must be reported');
});

test('mutation: a label wearing a colour of its own is caught', () => {
    const broken = mapContainer.replace("const labelInk = basemapIsDark ? '#f7f5ef' : '#101010';", "const labelInk = '#a72144';");
    assert.notEqual(broken, mapContainer, 'the fixture must repaint the labels');
    assert.ok(labelVoiceProblems(broken).length > 0, 'a label in Wada Red must be reported');
});

test('mutation: a black label halo is caught', () => {
    const broken = mapContainer.replace(
        "const labelHalo = basemapIsDark ? 'rgba(16,16,16,0.85)' : 'rgba(247,245,239,0.9)';",
        "const labelHalo = '#000000';"
    );
    assert.notEqual(broken, mapContainer, 'the fixture must blacken the halo');
    assert.ok(labelVoiceProblems(broken).length > 0, 'a black halo must be reported');
});

test('mutation: a rainbow density ramp is caught', () => {
    const broken = mapContainer.replace(
        "'rgba(167,33,68,0.78)'",
        "'rgba(253,224,71,0.78)'"
    );
    assert.notEqual(broken, mapContainer, 'the fixture must change the ramp');
    assert.ok(densityRampProblems(broken).length > 0, 'a two-hue ramp must be reported');
});

test('mutation: a rainbow ramp in the SECOND density field is caught', () => {
    // The second ramp, not the first. The rule used to read the FIRST
    // occurrence every time, so it walked past this one and never looked
    // at it — and a blue ramp here passed a rule written to catch it.
    const broken = mapContainer.replace(
        "'rgba(167,33,68,0.54)'",
        "'rgba(0,110,184,0.54)'"
    );
    assert.notEqual(broken, mapContainer, 'the fixture must change the second ramp');
    assert.ok(densityRampProblems(broken).length > 0, 'a two-hue ramp in the second field must be reported');
});

test('mutation: a hardcoded reading on the plate is caught', () => {
    const broken = mapContainer.replace('{acledCount}', "'6,000 detections' && {acledCount}");
    assert.notEqual(broken, mapContainer, 'the fixture must add a reading');
    assert.ok(hardcodedReadingProblems(broken).length > 0, 'a hardcoded reading must be reported');
});

test('mutation: a short label that renames its region is caught', () => {
    const lying = { ...REGIONS, thailand: { ...REGIONS.thailand, shortLabel: 'Northern Europe' } };
    assert.ok(shortLabelProblems(lying).length > 0, 'a renamed region must be reported');
});

test('mutation: a new colour outside the palette is caught', () => {
    // the rule reads files from disk, so the fixture is written and removed
    const probeDir = path.join(ROOT, 'tests', 'fixtures');
    // The scratch directory is created if it is not there. It is not
    // tracked in git, and a gate that only passes on the machine that
    // happened to create the directory is decoration: a fresh clone ran
    // `npm test` and failed on ENOENT before this line.
    mkdirSync(probeDir, { recursive: true });
    const probe = path.join(probeDir, 'probe-colour.jsx');
    writeFileSync(probe, 'const c = "#ff00ff";\n');
    let problems;
    try {
        problems = colourRatchetProblems([probe]);
    } finally {
        unlinkSync(probe);
    }
    assert.ok(problems.length > 0, 'a colour outside the palette must be reported');
});

test('mutation: a growing colour debt is caught', () => {
    const grown = new Set([...DEBT_BASELINE, '#ff00ff']);
    assert.ok(colourRatchetProblems(interfaceFiles, grown, DEBT_CEILING).length > 0, 'a debt larger than the ceiling must be reported');
});

test('mutation: the vessel key dropping a painted class is caught', () => {
    const broken = mapContainer.replace("'pleasure', MARK.vesselPleasure,", "'pleasure', MARK.vesselOther,");
    assert.notEqual(broken, mapContainer, 'the fixture must repaint a class');
    // The colour set is unchanged, so this rule does not see it — the class
    // NAMES are what changed, and they are checked by the count rule below.
    assert.ok(VESSEL_CLASSES.length === 7, 'the vessel class list must stay in step with the paint');
});
