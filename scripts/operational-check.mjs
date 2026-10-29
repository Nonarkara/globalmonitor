import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { sweepChromeFit } from './chrome-fit.mjs';

const url = process.argv[2];
if (!url || !/^https:\/\//.test(url)) throw new Error('Pass the deployed HTTPS URL');
const browser = await chromium.launch({ headless: true });
const results = [];
await fs.mkdir('non-slop-shots', { recursive: true });
try {
  for (const width of [1440, 1024, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => { if (!e.stack?.includes('youtube.com')) errors.push(e.message); });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response.status(), 200);
    await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(3000);
    const geometry = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
      const visible = selector => [...document.querySelectorAll(selector)].some(el => el.getClientRects().length > 0);
      return { header: rect('.header-bar'), clock: rect('.top-bar-clock'), map: rect('.maplibregl-canvas'),
        // The chrome above the map: the legal marking, the instrument band
        // and the masthead. A band earns its height — on a phone the whole
        // stack may not exceed the budget the contract sets.
        chrome: Math.round(document.querySelector('.maplibregl-canvas')?.getBoundingClientRect().top || 0),
        // The chrome rows are sized in rem so they scale with the fluid root.
        // A budget in fixed pixels measures the wrong thing on a 1440px
        // screen (root 16.56px → a 3.5rem masthead is 58px, not 56).
        rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        // The chrome row must FIT its own width. A row that overflows does
        // not scroll — it clips, and the buttons past the edge are gone. The
        // first one-row bar was built on a ladder of viewport widths and it
        // overflowed at every width from 320 to 1920, with the last two
        // buttons pushed off the side where nobody can reach them.
        rowOverflow: (() => {
          const row = document.querySelector('.header-bar');
          if (!row) return 0;
          return Math.round(row.scrollWidth - row.clientWidth);
        })(),
        // Every control in the row must be REACHABLE. A control pushed past
        // the edge of the screen is not on the product any more, and it does
        // not show up as an overflow of the document — the row clips.
        offScreen: [...document.querySelectorAll('.header-controls button, .header-controls select')]
          .filter(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return false;
            return r.right > innerWidth + 1 || r.left < -1;
          })
          .map(el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30)),
        // How much of the SOURCES plate is scrolled out of sight. On a desktop
        // the contract is that every reading and every qualification is
        // visible at once, so this must be zero. On a phone the plate is a
        // scrollable list by design and says so.
        plateHidden: (() => {
          const plate = document.querySelector('.map-legend--traffic');
          if (!plate) return 0;
          return Math.round(plate.scrollHeight - plate.clientHeight);
        })(),
        /* ═══════════════════════════════════════════════════════════════
           THE SPATIAL-HALLUCINATION MEASUREMENTS.
           A plate that is hidden in place still occupies its box; a reading
           cut through the middle of its own glyph reads as a broken plate; a
           key that has drifted off the line of the reading it keys is not a
           key; and two surfaces in one corner have to be neighbours, not
           one of them cut in half. Each of these was measured and fixed, and
           each is measured again here so it cannot come back quietly. */
        // Every box that occupies space while showing nothing.
        phantomSpace: (() => {
          const ghosts = [];
          for (const el of document.querySelectorAll('.map-legend, .map-legend *, .maplibregl-ctrl *')) {
            const p = getComputedStyle(el);
            if (p.visibility !== 'hidden' && p.opacity !== '0') continue;
            const r = el.getBoundingClientRect();
            if (r.height <= 0 || r.width <= 0) continue;
            ghosts.push(`${el.className || el.tagName}:${Math.round(r.height)}px`);
          }
          return ghosts;
        })(),
        // The plate's list: what it shows, what is below the fold, and whether
        // any reading is cut in half.
        plateList: (() => {
          const list = document.querySelector('.map-legend--traffic .map-legend-list');
          if (!list) return null;
          const rows = [...list.querySelectorAll('.map-legend-item')];
          const viewBottom = list.scrollTop + list.clientHeight;
          const below = rows.filter((r) => r.offsetTop - list.scrollTop + r.offsetHeight > viewBottom + 1).length;
          const cut = rows.filter((r) => {
            const top = r.offsetTop - list.scrollTop;
            return top < viewBottom - 1 && top + r.offsetHeight > viewBottom + 1;
          }).map((r) => (r.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30));
          const more = document.querySelector('.map-legend--traffic .map-legend-more');
          const moreText = more ? (more.textContent || '').trim() : null;
          const moreCount = moreText ? Number((moreText.match(/\d+/) || [])[0]) : null;
          return {
            rows: rows.length,
            below,
            cut,
            moreHidden: more ? more.hasAttribute('hidden') : null,
            moreCount,
            hidden: list.scrollHeight - list.clientHeight,
          };
        })(),
        // The colour key must sit on the FIRST LINE of the reading it keys.
        // It used to be centred against the whole row, so a three-pixel strip
        // floated 23 to 30 pixels below the value it belonged to.
        keysOffLine: (() => {
          const plate = document.querySelector('.map-legend--traffic');
          if (!plate) return 0;
          let off = 0;
          for (const key of plate.querySelectorAll('.map-legend-key, .map-legend-line, .map-legend-zone')) {
            const row = key.closest('.map-legend-item');
            const value = row && row.querySelector('.map-legend-value');
            if (!value) continue;
            const kr = key.getBoundingClientRect();
            const vr = value.getBoundingClientRect();
            if (kr.width === 0 || kr.height === 0) continue;
            const line = parseFloat(getComputedStyle(value).lineHeight) || vr.height;
            if (kr.top < vr.top - 1 || kr.top > vr.top + line) off += 1;
          }
          return off;
        })(),
        // Two surfaces in the bottom-right corner: the plate and the credit
        // line. They have to be neighbours. The credit band's toggle also has
        // to be clear of the wire, which sits on the map's bottom edge.
        cornerOverlap: (() => {
          const plate = document.querySelector('.map-legend--traffic');
          const attrib = document.querySelector('.maplibregl-ctrl-attrib');
          const ticker = document.querySelector('.news-ticker-wrapper');
          const button = document.querySelector('.maplibregl-ctrl-attrib-button');
          const box = (el) => (el ? el.getBoundingClientRect() : null);
          const p = box(plate), a = box(attrib), t = box(ticker), b = box(button);
          const overlap = (x, y) => (x && y
            && Math.min(x.right, y.right) > Math.max(x.left, y.left)
            && Math.min(x.bottom, y.bottom) > Math.max(x.top, y.top));
          return {
            plateOverCredit: overlap(p, a),
            creditUnderWire: a && t ? a.bottom > t.top + 1 : false,
            toggleUnderWire: b && t ? b.bottom > t.top + 1 : false,
          };
        })(),
        // One font per role. MapLibre ships its own typeface in the credit
        // control, and it leaked Helvetica into the product.
        strayFonts: (() => {
          const house = new Set(['Archivo', 'Archivo Narrow', 'JetBrains Mono', 'IBM Plex Sans Thai', 'Noto Sans Thai']);
          const stray = [];
          for (const el of document.querySelectorAll('body *')) {
            if (!el.childNodes.length) continue;
            if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
            const p = getComputedStyle(el);
            if (p.visibility === 'hidden' || p.opacity === '0') continue;
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) continue;
            const f = p.fontFamily.split(',')[0].replace(/["']/g, '');
            if (!house.has(f)) stray.push(`${f}:${(el.textContent || '').trim().slice(0, 24)}`);
          }
          return [...new Set(stray)];
        })(),
        defaultPanels: visible('.left-sidebar,.right-sidebar,.bottom-bar'), failed: /Something went wrong|Map failed to render/.test(document.body.innerText),
        sponsors: [...document.querySelectorAll('.header-brand-logo')].map(i => i.complete && i.naturalWidth > 0) };
    });
    if (width <= 720) {
      // The phone's row is fixed pixels, and the contract fixes it: one 44px
      // line of chrome carrying partners, name, reference clock and controls,
      // plus the 18px legal marking above it. A band earns its height.
      assert.ok(geometry.header.height <= 44.1, `the phone chrome row is ${geometry.header.height}px — it carries one line`);
      if (width <= 430) {
        assert.ok(geometry.chrome <= 62.1, `the top chrome is ${geometry.chrome}px — the phone budget is 62px`);
      }
    } else {
      const rem = (n) => n * geometry.rootPx;
      // The row is sized in rem so it scales with the fluid root. A budget in
      // fixed pixels measures the wrong thing on a 1440px screen (root
      // 16.56px → a 3.25rem row is 53.8px, not 52).
      assert.ok(geometry.header.height <= rem(3.5) + 0.1, `the chrome row exceeds 3.5rem (${rem(3.5).toFixed(1)}px)`);
      // The chrome is the legal marking PLUS the row, and the row is sized in
      // rem because the type inside it is. A fixed pixel budget for the
      // chrome only holds at one width: the old 74px was true at 1440 and
      // false at 1920, where the root type is 22.08px and the row is 71.8px.
      // The budget is the row's own rule, in the row's own unit.
      assert.ok(geometry.chrome <= 18 + rem(3.5) + 0.1,
        `the top chrome is ${geometry.chrome}px — its budget is ${(18 + rem(3.5)).toFixed(1)}px`);
    }
    // ONE band. The clock is an instrument INSIDE the row, not a band above
    // it: if the clock ever moves out of the row, the chrome is two bands
    // again and everything the owner asked for is undone. The row brackets
    // the clock, so this fails the day the clock is hoisted back out.
    assert.ok(geometry.clock, 'the reference clock must be in the DOM');
    assert.ok(geometry.clock.top >= geometry.header.top - 1
      && geometry.clock.bottom <= geometry.header.bottom + 1,
      `the clock is not inside the chrome row (clock ${geometry.clock.top}–${geometry.clock.bottom}, row ${geometry.header.top}–${geometry.header.bottom}) — the chrome must be ONE line`);
    assert.ok(geometry.clock.height <= geometry.header.height + 0.1,
      'the clock is taller than the row it sits in');
    assert.ok(geometry.rowOverflow <= 1,
      `the chrome row overflows by ${geometry.rowOverflow}px — a control is off the side of the screen`);
    assert.deepEqual(geometry.offScreen, [],
      `a control is off the side of the screen: ${geometry.offScreen.join(', ')}`);
    if (width > 720) {
      // Every reading and every qualification visible at once. The plate used
      // to be capped at 384px and silently scrolled the cable registry and
      // the cyclone — the two rows that say what the new marks ARE.
      assert.ok(geometry.plateHidden <= 1,
        `the SOURCES plate hides ${geometry.plateHidden}px of its content — a qualifier is scrolled out of sight`);
    }
    /* ═══════════════════════════════════════════════════════════════════
       THE SPATIAL-HALLUCINATION GATE.
       Every one of these was a shipped defect, measured, fixed, and fixed
       for good. They are measured again here so that none of them can come
       back quietly — a green build is not a visual pass.
       ═══════════════════════════════════════════════════════════════════ */
    assert.deepEqual(geometry.phantomSpace, [],
      `a box is occupying space while showing nothing: ${geometry.phantomSpace.join(', ')}`);

    if (geometry.plateList) {
      const list = geometry.plateList;
      // A reading cut through the middle of its own glyph reads as a broken
      // plate, not as a list that continues.
      assert.deepEqual(list.cut, [],
        `the SOURCES plate cuts a reading in half: ${list.cut.join(', ')}`);
      // The disclosure has to tell the truth: it appears exactly when there
      // is something below the fold, and it names how much.
      assert.equal(list.moreHidden, list.below === 0,
        `the SOURCES plate says ${list.moreHidden ? 'nothing' : '"' + list.moreCount + ' more below"'} but ${list.below} reading(s) are below the fold`);
      if (list.below > 0) {
        assert.equal(list.moreCount, list.below,
          `the SOURCES plate says "${list.moreCount} more below" but ${list.below} readings are below the fold`);
      }
      // On a desktop the promise is every reading and every qualification at
      // once. The plate may not hold anything back.
      if (width > 720) {
        assert.equal(list.below, 0,
          `the SOURCES plate holds back ${list.below} reading(s) at ${width}px — every reading must be visible at once`);
      }
    }

    assert.equal(geometry.keysOffLine, 0,
      `${geometry.keysOffLine} colour key(s) are not on the line of the reading they key`);

    assert.equal(geometry.cornerOverlap.plateOverCredit, false,
      'the SOURCES plate overlaps the credit line — two surfaces in one corner must be neighbours');
    assert.equal(geometry.cornerOverlap.creditUnderWire, false,
      'the credit line runs under the wire');
    assert.equal(geometry.cornerOverlap.toggleUnderWire, false,
      'the credit line\'s toggle is under the wire — part of the control is unreachable');

    assert.deepEqual(geometry.strayFonts, [],
      `a font outside the house set is on the page: ${geometry.strayFonts.join(', ')}`);
    assert.ok(geometry.map.height * geometry.map.width >= width * 900 * .6, 'map loses first screen');
    assert.equal(geometry.defaultPanels, false);
    assert.equal(geometry.overflow, false);
    assert.equal(geometry.failed, false);
    assert.equal(geometry.sponsors.length, 4);
    assert.ok(geometry.sponsors.every(Boolean), 'all sponsors load');
    await page.screenshot({ path: 'non-slop-shots/operational-' + width + '.png' });
    for (const [name, selector] of [['layers','.left-sidebar'],['intel','.right-sidebar'],['markets','.bottom-bar']]) {
      const control = page.locator('.map-first-header-' + name).first();
      await control.click();
      await page.locator(selector).waitFor({ state: 'visible' });
      const r = await page.locator(selector).boundingBox();
      assert.ok(r.y >= geometry.header.bottom - 1, 'dock overlaps masthead');
      assert.ok(r.x >= 0 && r.x + r.width <= width + 1, 'dock exceeds viewport');
      await control.click();
      await page.locator(selector).waitFor({ state: 'hidden' });
    }
    if (width === 1440) {
      await page.locator('.map-first-header-layers').first().click();
      for (const name of ['Aircraft','Airports','Ships']) {
        const toggle = page.getByRole('switch', { name: new RegExp(name) }).first();
        if (await toggle.count()) {
          if (await toggle.getAttribute('aria-checked') !== 'true') await toggle.click();
        } else {
          const button = page.getByRole('button', { name: new RegExp('^(Show|Hide) ' + name + ' layer$') }).first();
          if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
        }
      }
      await page.locator('.map-first-header-layers').first().click();
      await page.waitForFunction(async () => {
        const source = window.__GM_MAP__?.getSource('airports-data');
        return source && (await source.getData())?.features?.length > 0;
      }, null, { timeout: 60000 });
      for (const source of ['flights-data','vessels-data','airports-data']) {
        const point = await page.evaluate(async id => {
          const map = window.__GM_MAP__, source = map?.getSource(id);
          const data = source ? await source.getData() : null;
          for (const f of data?.features || []) {
            const xy = f.geometry?.coordinates;
            if (f.geometry?.type !== 'Point' || !xy?.every(Number.isFinite)) continue;
            const p = map.project(xy), r = map.getCanvas().getBoundingClientRect();
            if (p.x > 20 && p.x < r.width - 20 && p.y > 20 && p.y < r.height - 20) return { x:r.x+p.x,y:r.y+p.y };
          }
          return null;
        }, source);
        if (point) {
          await page.waitForTimeout(500);
          await page.mouse.move(point.x, point.y);
          await page.waitForTimeout(300);
          assert.equal(await page.getByText('Something went wrong.', { exact: true }).count(), 0);
        }
      }
    }
    await page.getByRole('button', { name: 'Tools and advanced options' }).click();
    await page.getByRole('menuitem', { name: 'Session log', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Session Activity Log' });
    await dialog.waitFor({ state: 'visible' });
    const downloaded = page.waitForEvent('download', { timeout: 15000 });
    await page.getByRole('button', { name: 'Export session log' }).click();
    const download = await downloaded;
    assert.match(download.suggestedFilename(), /dashboard-activity.*\.log$/);
    assert.equal(await download.failure(), null);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Tools and advanced options' }).evaluate(el => document.activeElement === el), true, 'focus returns to Tools');
    await page.getByRole('button', { name: 'Tools and advanced options' }).click();
    await page.getByRole('menuitem', { name: 'Data health', exact: true }).click();
    const health = page.getByRole('dialog').filter({ hasText: 'Data Provenance' });
    await health.waitFor({ state: 'visible' });
    for (let tab = 0; tab < 10; tab++) {
      await page.keyboard.press('Tab');
      assert.equal(await health.evaluate(el => el.contains(document.activeElement)), true, 'focus remains in source dialog');
    }
    await page.keyboard.press('Escape');
    await health.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Tools and advanced options' }).evaluate(el => document.activeElement === el), true);
    assert.deepEqual(errors, []);
    results.push({ width, status: response.status(), geometry, download: download.suggestedFilename(), errors });
    await context.close();
  }

  // ── The fit sweep ──────────────────────────────────────────────
  // The four widths above are the widths this gate has always looked at,
  // and they are the widths that worked: the row overflowed at every width
  // from 721 to 840 and from 341 to 390, with the last control pushed off
  // the side of the screen, and this gate passed it. A gate that only looks
  // where it already looked is a decoration. The row is fitted at RUN TIME,
  // so it is checked at RUN TIME, at every width in between.
  const sweep = await sweepChromeFit(browser, url);
  assert.deepEqual(sweep.failures, [],
    `the chrome row does not hold at every width:\n${sweep.failures.map(f => `  ${f.width}px  ${f.why}`).join('\n')}`);

  console.log(JSON.stringify({ url, sweep: { checked: sweep.checked, failures: 0 }, results }, null, 2));
} finally { await browser.close(); }
