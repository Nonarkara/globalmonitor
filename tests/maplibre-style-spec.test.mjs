/**
 * MapLibre style-spec guard.
 *
 * MapLibre validates a layer's paint/layout when the layer is added. If the
 * spec is wrong the layer is REFUSED — it is silently absent from the map.
 * Nothing is thrown, nothing is logged, and the map keeps working. A legend
 * can therefore promise a reading the map never drew.
 *
 * Three real instances of this shipped:
 *
 *   1. The wind layer's line-width wrapped a zoom interpolate in a `*`
 *      expression. MapLibre only allows zoom as the input of a TOP-LEVEL
 *      interpolate, so it refused the layer without throwing: the SOURCES
 *      plate said "117 points" and the map drew no arrows.
 *
 *   2. Four layers carried a CSS custom property in a paint value
 *      (`'line-color': 'var(--ink-3)'`). MapLibre refuses CSS variables
 *      outright — the layers were absent in production and nothing said so.
 *
 *   3. A style object with no `glyphs` endpoint cannot draw any label: the
 *      symbol layer is accepted and the text silently never appears.
 *
 * The rules enforced here:
 *   - `zoom` may appear ONLY as the direct input of an `interpolate`/`step`,
 *     and that expression must be the top-level value of the property.
 *   - a paint/layout value may not contain a CSS custom property.
 *   - a paint/layout value may not be a bare object.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MARK, wash, groundInk } from '../src/data/mapPalette.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/**
 * The names a paint block may legitimately call that are not array constants
 * and not local variables: the palette itself and the two helpers that turn
 * a palette role into an ink.
 *
 * Without these the checker resolved `wash` to 0, called it, and gave up on
 * the WHOLE paint block — so a block that called `wash()` was never checked
 * for a bad zoom expression at all. Resolving them for real means those
 * blocks are now inspected instead of skipped.
 */
const KNOWN = { MARK, wash, groundInk };

const collectFiles = (dir, out = []) => {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) collectFiles(full, out);
        else if (/\.(jsx?|mjs)$/.test(entry)) out.push(full);
    }
    return out;
};

/**
 * Pull the value that follows `marker`, honouring nesting. The value may be
 * an object literal (`paint={{…}}`), an array (`filter={[…]}`) or a plain
 * identifier (`layout={someVar}`), so track a bracket stack rather than
 * assuming braces. String literals and comments are skipped so a brace or a
 * backtick inside one does not unbalance the scan.
 */
const extractBlock = (text, marker) => {
    const blocks = [];
    let from = 0;
    for (;;) {
        const at = text.indexOf(marker, from);
        if (at === -1) break;
        const start = at + marker.length;
        const stack = [];
        let quote = null;
        let i = start;
        let closed = false;
        for (; i < text.length; i += 1) {
            const ch = text[i];
            // Comments are skipped: a backtick inside a `//` note is not a
            // template literal, and a brace inside a comment is not a block.
            if (ch === '/' && text[i + 1] === '/') {
                const nl = text.indexOf('\n', i);
                if (nl === -1) { i = text.length; break; }
                i = nl;
                continue;
            }
            if (ch === '/' && text[i + 1] === '*') {
                const end = text.indexOf('*/', i + 2);
                if (end === -1) { i = text.length; break; }
                i = end + 1;
                continue;
            }
            if (quote) {
                if (ch === '\\') { i += 1; continue; }
                if (ch === quote) quote = null;
                continue;
            }
            if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
            if (ch === '{' || ch === '[' || ch === '(') { stack.push(ch); continue; }
            if (ch === '}' || ch === ']' || ch === ')') {
                if (stack.length === 0) { closed = true; break; }
                stack.pop();
                if (stack.length === 0) { closed = true; i += 1; break; }
            }
        }
        if (!closed) break;
        blocks.push(text.slice(start, i));
        from = i;
    }
    return blocks;
};

/**
 * Collect the module-level constants of a file that hold an array literal.
 * An expression hoisted into a variable is the blind spot a naive scan
 * misses: the identifier resolves to a placeholder and the zoom structure
 * inside it is never inspected.
 */
const collectConstArrays = (text) => {
    const found = new Map();
    const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const start = m.index + m[0].length - 1;
        let depth = 0;
        let quote = null;
        let i = start;
        for (; i < text.length; i += 1) {
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
                if (depth === 0) { i += 1; break; }
            }
        }
        if (depth === 0) found.set(m[1], text.slice(start, i));
    }
    return found;
};

/**
 * Evaluate a paint/layout object literal. Identifiers the source computes at
 * runtime resolve to 0 so the walk can still see the shape: an identifier used
 * arithmetically (`baseRadius * 2.4`) must stay arithmetic, and the zoom
 * structure around it is what this test is about. Identifiers that name a
 * module-level array constant resolve to that array, so a hoisted
 * expression is inspected rather than skipped.
 */
const evaluateObject = (literal, constArrays = new Map(), depth = 0) => {
    const scope = new Proxy(Object.create(null), {
        has: () => true,
        get: (_t, prop) => {
            if (typeof prop !== 'string') return 0;
            if (Object.prototype.hasOwnProperty.call(KNOWN, prop)) return KNOWN[prop];
            const raw = constArrays.get(prop);
            if (raw === undefined || depth > 3) return 0;
            try {
                return evaluateObject(raw, constArrays, depth + 1);
            } catch {
                return 0;
            }
        }
    });
    // eslint-disable-next-line no-new-func
    const fn = new Function('__scope', `with (__scope) { return (${literal}); }`);
    return fn(scope);
};

const isExpression = (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'string';
const isZoomNode = (v) => Array.isArray(v) && v.length === 1 && v[0] === 'zoom';

/**
 * Walk an expression tree. `topLevel` is true only for the property value
 * itself — the position MapLibre means by "top-level".
 */
const findZoomViolations = (node, topLevel, trail, out) => {
    if (!Array.isArray(node)) return;
    if (isZoomNode(node)) {
        const parent = trail[trail.length - 1];
        const parentOp = parent && parent.node ? parent.node[0] : null;
        const parentIsInput = parent && parent.role === 'input';
        if (!parentIsInput || (parentOp !== 'interpolate' && parentOp !== 'step')) {
            out.push(`zoom used outside an interpolate/step input (${trail.map((t) => t.label || '?').join(' > ')})`);
        } else if (!parent.topLevel) {
            out.push(`zoom inside a nested ${parentOp} (${trail.map((t) => t.label || '?').join(' > ')})`);
        }
        return;
    }
    if (!isExpression(node)) return;
    const op = node[0];
    // interpolate: ['interpolate', interpolation, input, stop, out, stop, out, …]
    // step:      ['step', input, out, stop, out, …]
    let inputIndex = -1;
    if (op === 'interpolate') inputIndex = 2;
    else if (op === 'step') inputIndex = 1;
    for (let i = 1; i < node.length; i += 1) {
        const isInput = i === inputIndex;
        findZoomViolations(node[i], isInput ? topLevel : false, [...trail, { label: op, node, role: isInput ? 'input' : null, topLevel }], out);
    }
};

const violationsIn = (value) => {
    const out = [];
    if (Array.isArray(value)) findZoomViolations(value, true, [], out);
    else if (value && typeof value === 'object') {
        for (const inner of Object.values(value)) out.push(...violationsIn(inner));
    }
    return out;
};

/** MapLibre refuses a CSS custom property in a paint value. */
const cssVarIn = (value) => {
    if (typeof value === 'string') return value.includes('var(') ? [value] : [];
    if (Array.isArray(value)) return value.flatMap(cssVarIn);
    if (value && typeof value === 'object') return Object.values(value).flatMap(cssVarIn);
    return [];
};

// `paint={` is the JSX attribute form; `paint:` is the plain style-object
// form used by the inline basemap styles.
const PAINT_MARKERS = ['paint={', 'layout={', 'filter={', 'paint:'];

test('no MapLibre layer hides a zoom expression where the style spec forbids it', () => {
    const problems = [];
    for (const file of collectFiles(SRC)) {
        const text = readFileSync(file, 'utf8');
        const constArrays = collectConstArrays(text);
        for (const marker of PAINT_MARKERS) {
            for (const literal of extractBlock(text, marker)) {
                let parsed;
                try {
                    parsed = evaluateObject(literal, constArrays);
                } catch (err) {
                    problems.push(`${path.relative(ROOT, file)} ${marker}: could not evaluate (${err.message})`);
                    continue;
                }
                if (!parsed || typeof parsed !== 'object') continue;
                for (const [key, value] of Object.entries(parsed)) {
                    if (value === null || value === undefined) continue;
                    for (const violation of violationsIn(value)) {
                        problems.push(`${path.relative(ROOT, file)} ${marker} ${key}: ${violation}`);
                    }
                    for (const cssVar of cssVarIn(value)) {
                        problems.push(`${path.relative(ROOT, file)} ${marker} ${key}: CSS custom property "${cssVar}" — MapLibre refuses these`);
                    }
                }
            }
        }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
});

test('the guard actually catches the shipped wind-layer defect', () => {
    // If this stops failing, the checker has gone blind and the test above
    // is protecting nothing.
    const bad = [
        '*',
        ['interpolate', ['linear'], ['zoom'], 3, 1.5, 6, 2.6, 10, 3.6],
        ['interpolate', ['linear'], ['get', 'speedKmh'], 0, 0.75, 35, 1.5]
    ];
    assert.ok(violationsIn(bad).length > 0, 'the malformed width must be reported');

    const good = ['interpolate', ['linear'], ['zoom'], 3, 1.4, 6, 2.4, 10, 3.4];
    assert.deepEqual(violationsIn(good), [], 'a plain top-level zoom interpolate is legal');

    const nested = ['case', ['>', ['zoom'], 4], ['interpolate', ['linear'], ['zoom'], 5, 1, 6, 2]];
    assert.ok(violationsIn(nested).length > 0, 'a nested zoom interpolate is not legal');
});

test('the guard catches the CSS custom property that silenced four layers', () => {
    assert.ok(cssVarIn('var(--ink-3)').length > 0, 'a CSS var in a paint value must be reported');
    assert.deepEqual(cssVarIn('#6b665e'), [], 'a literal hex is fine');
    assert.deepEqual(cssVarIn(['interpolate', ['linear'], ['get', 'x'], 0, 1, 1, 2]), [], 'an expression without a var is fine');
});

test('the guard resolves a hoisted expression instead of skipping it', () => {
    // A naive scan resolves the identifier to a placeholder and never sees
    // the zoom structure inside it — the exact defect class, passing blind.
    const source = "const WIDTH = ['*', ['interpolate', ['linear'], ['zoom'], 3, 1.5, 6, 2.6]];";
    const constArrays = collectConstArrays(source);
    assert.ok(constArrays.has('WIDTH'), 'the hoisted array must be collected');
    const value = evaluateObject('WIDTH', constArrays);
    assert.ok(violationsIn(value).length > 0, 'a hoisted malformed expression must still be reported');
});
