import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRssItems, queriesFor } from '../server/lib/regionalNewsIngest.mjs';

test('parseRssItems reads Bing News:Source tags', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
<item>
<title>Strait tension after drill</title>
<link>http://www.bing.com/news/apiclick.aspx?url=https%3a%2f%2fa</link>
<pubDate>Thu, 13 Aug 2026 04:13:00 GMT</pubDate>
<News:Source>Reuters</News:Source>
</item>
</channel></rss>`;
    const items = parseRssItems(xml, 6, 'Bing News');
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Strait tension after drill');
    assert.equal(items[0].source, 'Reuters');
});

test('parseRssItems falls back to the named source', () => {
    const xml = `<rss><channel><item><title>Keep going</title><link>https://example.com/b</link></item></channel></rss>`;
    const items = parseRssItems(xml, 6, 'BBC');
    assert.equal(items[0].source, 'BBC');
});

// Gulf / Middle East codes the user is most likely to click during a Houthi
// vs. Saudi flare-up. Without these, /api/regional-news 500s for SA — the
// region the user is staring at during a Riyadh airport strike.
test('queriesFor returns curated Gulf queries for SA / YE / IR / IL', () => {
    const sa = queriesFor('middleeast', 'SA');
    assert.ok(sa, 'SA queries should resolve');
    assert.match(sa.urgent, /Riyadh|Houthi|Aramco/i, 'SA urgent should mention Riyadh/Houthi/Aramco');
    assert.match(sa.tech, /NEOM|fintech|Aramco/i, 'SA tech should mention NEOM/fintech/Aramco');

    const ye = queriesFor('middleeast', 'YE');
    assert.ok(ye);
    assert.match(ye.urgent, /Houthi|Sanaa|Bab al-Mandab/i);

    const ir = queriesFor('middleeast', 'IR');
    assert.ok(ir);
    assert.match(ir.urgent, /nuclear|IRGC|sanctions/i);

    const il = queriesFor('middleeast', 'IL');
    assert.ok(il);
    assert.match(il.urgent, /Gaza|Hezbollah|missile/i);
});

test('queriesFor falls back to a country-name lookup for codes without a curated entry', () => {
    // A code that has a country name in the lookup table but no curated entry
    // should still resolve, so the regional-news endpoint never 500s for
    // "unknown" codes that are actually well-known countries.
    const fr = queriesFor('indopacific', 'FR');
    assert.ok(fr, 'FR should resolve via COUNTRY_NAMES fallback');
    assert.match(fr.tech, /France/);
    assert.match(fr.urgent, /France/);

    const br = queriesFor('middleeast', 'BR');
    assert.ok(br, 'BR should resolve even in middleeast region via generic fallback');
    assert.match(br.tech, /Brazil/);
});

test('queriesFor returns null for codes with no country name', () => {
    // A 2-letter code that is not in COUNTRY_NAMES should return null so
    // the caller can return a clean 'unknown-code' status to the UI.
    const xz = queriesFor('middleeast', 'XZ');
    assert.equal(xz, null);
});

test('ASEAN + Thailand codes are still served from the curated tables', () => {
    const th = queriesFor('indopacific', 'TH');
    assert.ok(th);
    assert.match(th.tech, /DEPA|fintech/);

    const bkk = queriesFor('thailand', 'BKK');
    assert.ok(bkk);
    assert.match(bkk.urgent, /flood|protest|PM2\.5/);
});
