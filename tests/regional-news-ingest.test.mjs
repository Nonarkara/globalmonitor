import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRssItems } from '../server/lib/regionalNewsIngest.mjs';

test('parseRssItems reads Bing News:Source tags', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
<item>
<title>Strait tension after drill</title>
<link>http://www.bing.com/news/apiclick.aspx?url=https%3a%2f%2fexample.com%2fa</link>
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
