/**
 * The SOURCES plate is fitted at RUN TIME, so it has to be checked at run
 * time, at every width — not at four hand-picked ones.
 *
 * The release gate looked at 1440 / 1024 / 390 / 320 and passed, and the
 * plate was holding back a reading at thirty-nine widths in between: the
 * eight readings need 421px of rows at 1305 and the plate gave them 420,
 * because the room was measured against a box that had been rounded to
 * whole pixels. One reading — a whole row, forty-eight pixels of it —
 * was held back for half a pixel of arithmetic.
 *
 * And the ceiling the plate had was 620px: a fixed-pixel budget for a
 * font that scales with the fluid root, so the plate grew less room as
 * the screen grew.
 *
 * So this sweep resizes ONE page and measures the plate at every width in
 * between. What it asserts, at every width:
 *
 *   1. no reading is cut in half — a reading sliced through the middle of
 *      its own glyph reads as a broken plate, not as a list that continues;
 *   2. the disclosure tells the truth: it names exactly how many readings
 *      are below the fold, and it is there only when there are some;
 *   3. the plate holds back NOTHING IT HAD ROOM FOR. A plate whose own
 *      box is shorter than the readings it holds was not given the room,
 *      and may keep one back — on a phone it always does. A plate that
 *      had the room and held a reading back anyway is lying;
 *   4. no separator hangs at the end or the start of a line.
 */
import { chromium } from 'playwright';

const PHONE = 720;

/** Every width the plate has to hold: the breakpoints and the devices. */
export const plateWidths = () => {
    const widths = [];
    for (let w = 320; w <= 1920; w += 4) widths.push(w);
    for (const w of [
        320, 360, 375, 390, 393, 414, 430, 431, 480, 600, 720, 721, 768,
        800, 840, 900, 901, 1024, 1180, 1181, 1280, 1366, 1440, 1600, 1777, 1920,
    ]) if (!widths.includes(w)) widths.push(w);
    return widths.sort((a, b) => a - b);
};

const measure = async (page) => page.evaluate(() => {
    const plate = document.querySelector('.map-legend--traffic');
    const list = document.querySelector('.map-legend--traffic .map-legend-list');
    if (!plate || !list) return { err: 'no plate' };
    const rows = [...list.querySelectorAll('.map-legend-item')];
    const viewBottom = list.scrollTop + list.clientHeight;
    const below = rows.filter((r) => r.offsetTop - list.scrollTop + r.offsetHeight > viewBottom + 1).length;
    const cut = rows.filter((r) => {
        const top = r.offsetTop - list.scrollTop;
        return top < viewBottom - 1 && top + r.offsetHeight > viewBottom + 1;
    }).length;

    // What the plate needs, and what it was given.
    const ps = getComputedStyle(plate);
    const padY = (parseFloat(ps.paddingTop) || 0) + (parseFloat(ps.paddingBottom) || 0);
    const head = plate.querySelector('.map-legend-title');
    const headH = head
        ? head.getBoundingClientRect().height + (parseFloat(getComputedStyle(head).marginBottom) || 0)
        : 0;
    const foot = plate.querySelector('.map-legend-more');
    const footShown = Boolean(foot) && getComputedStyle(foot).display !== 'none';
    const band = footShown
        ? foot.getBoundingClientRect().height + (parseFloat(getComputedStyle(foot).marginTop) || 0)
        : (parseFloat(ps.getPropertyValue('--plate-foot-h')) || 0);
    const rowsSum = rows.reduce((s, r) => s + r.getBoundingClientRect().height, 0);
    const borders = (parseFloat(ps.borderTopWidth) || 0) + (parseFloat(ps.borderBottomWidth) || 0);
    const box = plate.getBoundingClientRect().height - borders + (footShown ? 0 : band);
    const need = padY + headH + rowsSum + band;

    // The disclosure.
    const more = plate.querySelector('.map-legend-more');
    const moreText = more ? (more.textContent || '').trim() : null;
    const moreCount = moreText ? Number((moreText.match(/\d+/) || [])[0]) : null;

    // Every separator, measured across the plate's whole text.
    const chars = [];
    const walker = document.createTreeWalker(plate, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        const text = node.nodeValue || '';
        for (let i = 0; i < text.length; i++) {
            const range = document.createRange();
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const b = range.getBoundingClientRect();
            chars.push({ ch: text[i], top: b.top, bottom: b.bottom, w: b.width, h: b.height });
        }
    }
    const seps = [];
    for (let i = 0; i < chars.length; i++) {
        if (chars[i].ch !== '·' && chars[i].ch !== ',') continue;
        const me = chars[i];
        if (!me.w && !me.h) continue;
        let next = null;
        let prev = null;
        for (let j = i + 1; j < chars.length && !next; j++) {
            if (chars[j].ch.trim() === '' || (!chars[j].w && !chars[j].h)) continue;
            next = chars[j];
        }
        for (let j = i - 1; j >= 0 && !prev; j--) {
            if (chars[j].ch.trim() === '' || (!chars[j].w && !chars[j].h)) continue;
            prev = chars[j];
        }
        seps.push({
            ch: chars[i].ch,
            text: (plate.textContent || '').trim().replace(/\s+/g, ' '),
            top: me.top,
            bottom: me.bottom,
            nextTop: next ? next.top : null,
            nextBottom: next ? next.bottom : null,
            prevTop: prev ? prev.top : null,
            prevBottom: prev ? prev.bottom : null,
        });
    }
    return {
        rows: rows.length,
        below,
        cut,
        box: +box.toFixed(2),
        need: +need.toFixed(2),
        hadRoom: need <= box + 1,
        moreHidden: more ? more.hasAttribute('hidden') : null,
        moreCount,
        seps,
    };
});

/**
 * Sweep the plate at every width and report what fails.
 * Returns { checked, failures } — failures carry the width and the reason.
 */
export async function sweepPlateFit(browser, url, widths = plateWidths()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const failures = [];
    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (!response || response.status() !== 200) throw new Error(`${url} answered ${response?.status()}`);
        await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 60000 });
        await page.waitForTimeout(2500);

        for (const width of widths) {
            await page.setViewportSize({ width, height: 900 });
            // Two frames: the ResizeObserver fires after layout, and the fit
            // it runs must be allowed to settle before the plate is measured.
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
            const m = await measure(page);
            if (m.err) { failures.push({ width, why: m.err }); continue; }
            if (m.cut) failures.push({ width, why: `the plate cuts ${m.cut} reading(s) in half` });
            if (m.moreHidden !== (m.below === 0)) {
                failures.push({ width, why: `the disclosure ${m.moreHidden ? 'says nothing' : `says "${m.moreCount} more below"`} but ${m.below} reading(s) are below the fold` });
            } else if (m.below > 0 && m.moreCount !== m.below) {
                failures.push({ width, why: `the disclosure says "${m.moreCount} more below" but ${m.below} are` });
            }
            // The plate may not hold back a reading IT HAD ROOM FOR. On a
            // phone, and on a very wide and short window, it does not have
            // the room, and then it says how much it is keeping.
            if (m.hadRoom && m.below > 0) {
                failures.push({ width, why: `the plate holds back ${m.below} reading(s) in a box of ${m.box}px that needs ${m.need}px — it had the room and did not use it` });
            }
            for (const s of m.seps) {
                const hangsEnd = s.nextTop != null && s.nextTop > s.bottom - 0.5 && s.ch === '·';
                const startsLine = s.prevBottom != null && s.prevBottom < s.top + 0.5;
                if (hangsEnd) failures.push({ width, why: `a separator ends a line in "${s.text.slice(0, 48)}"` });
                if (startsLine) failures.push({ width, why: `a separator starts a line in "${s.text.slice(0, 48)}"` });
            }
        }
    } finally {
        await context.close();
    }
    return { checked: widths.length, failures };
}
