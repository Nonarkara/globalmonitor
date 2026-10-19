/**
 * MapLibre style-spec guard.
 *
 * MapLibre validates a layer's paint/layout when the layer is added. If the
 * spec is wrong the layer is REFUSED — it is silently absent from the map.
 * Nothing is thrown, nothing is logged, and the map keeps working. A legend
 * can therefore promise a reading the map never drew.
 *
 * This exact failure shipped: the wind layer used
 *
 *   'line-width': ['*',
 *     ['interpolate', ['linear'], ['zoom'], 3, 1.5, ...],
 *     ['interpolate', ['linear'], ['get', 'speedKmh'], 0, 0.75, ...]]
 *
 * and MapLibre refused it with
 *
 *   "zoom" expression may only be used as input to a top-level "step" or
 *   "interpolate" expression.
 *
 * The wind arrows were absent from the map for as long as that stood, and the
 * SOURCES plate still said "117 points".
 *
 * The rule, enforced here:
 *   `zoom` may appear ONLY as the direct input of an `interpolate` or `step`
 *   expression, and that expression must be the top-level value of the
 *   paint/layout property — never nested inside another operator.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/** Marker for a value the source computes at runtime — not statically known. */
const UNKNOWN = Symbol('runtime-value');

const collectFiles = (dir, out = []) => {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
            collectFiles(full, out);
        } else if (/\.(jsx?|mjs)$/.test(entry)) {
            out.push(full);
        }
    }
    return out;
};

/**
 * Pull the value that follows `marker`, honouring nesting. The value may be
 * an object literal (`paint={{…}}`), an array (`filter={[…]}`) or a plain
 * identifier (`layout={someVar}`), so track a bracket stack rather than
 * assuming braces. String literals are skipped so a brace inside one does
 * not unbalance the scan.
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
 * Evaluate a paint/layout object literal. Identifiers the source computes at
 * runtime resolve to 0 so the walk can still see the shape: an identifier used
 * arithmetically (`baseRadius * 2.4`) must stay arithmetic, and the zoom
 * structure around it is what this test is about.
 */
const evaluateObject = (literal) => {
    const scope = new Proxy(Object.create(null), {
        has: () => true,
        get: () => 0
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
        // `zoom` is only legal as the input of interpolate/step.
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

test('no MapLibre layer hides a zoom expression where the style spec forbids it', () => {
    const problems = [];
    for (const file of collectFiles(SRC)) {
        const text = readFileSync(file, 'utf8');
        for (const marker of ['paint={', 'layout={', 'filter={']) {
            for (const literal of extractBlock(text, marker)) {
                let parsed;
                try {
                    parsed = evaluateObject(literal);
                } catch (err) {
                    problems.push(`${path.relative(ROOT, file)} ${marker}: could not evaluate (${err.message})`);
                    continue;
                }
                if (!parsed || typeof parsed !== 'object') continue;
                for (const [key, value] of Object.entries(parsed)) {
                    if (value === UNKNOWN) continue;
                    for (const violation of violationsIn(value)) {
                        problems.push(`${path.relative(ROOT, file)} ${marker} ${key}: ${violation}`);
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
