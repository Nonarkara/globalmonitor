#!/usr/bin/env node
/**
 * Longitudinal collector — pulls from the deployed dashboard, writes to localbase.
 *
 * Why it runs here and not at the edge: the store is a local Postgres on this
 * machine, and Cloudflare Workers cannot reach 127.0.0.1. So this Mac pulls from
 * the public API on a timer. Nothing is exposed, nothing connects inward, and the
 * database never needs a tunnel or a public key.
 *
 * It reuses the upsert functions in server/lib/supabase.mjs unchanged — localbase
 * speaks the same REST API as Supabase cloud, so only the URL and key differ.
 *
 * Usage:  node scripts/collect-longitudinal.mjs
 * Env (read from .env.local):
 *   GM_SUPABASE_URL          http://127.0.0.1:54321
 *   GM_SUPABASE_SERVICE_KEY  service_role JWT from `supabase status`
 *   GM_DASHBOARD_ORIGIN      defaults to https://asiawatch.pages.dev
 *
 * Scheduled by launchd — see launchd/com.nonarkara.asiawatch-collector.plist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load .env.local before importing supabase.mjs — its client initialises on first use.
for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}

const {
    isSupabaseEnabled, getSupabaseStatusMessage,
    upsertMarketQuotes, upsertFirmsHotspots, upsertAcledEvents, upsertSentimentReadings,
} = await import('../server/lib/supabase.mjs');

const ORIGIN = process.env.GM_DASHBOARD_ORIGIN || 'https://asiawatch.pages.dev';
const THEATERS = ['indopacific', 'eastasia', 'southasia', 'thailand', 'middleeast'];

const log = (...args) => console.log(`[collect ${new Date().toISOString()}]`, ...args);

const getJson = async (pathname) => {
    const res = await fetch(`${ORIGIN}${pathname}`, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}`);
    const type = res.headers.get('content-type') || '';
    // A static host answers unknown routes with the SPA shell; a 200 of text/html
    // is a miss, not data. Without this check the collector would happily archive
    // index.html forever and report success.
    if (!type.includes('json')) throw new Error(`${pathname} -> ${type || 'unknown type'}, not JSON`);
    return res.json();
};

if (!isSupabaseEnabled()) {
    console.error('[collect] No database configured:', getSupabaseStatusMessage());
    console.error('[collect] Set GM_SUPABASE_URL and GM_SUPABASE_SERVICE_KEY in .env.local.');
    process.exit(1);
}

const startedAt = new Date().toISOString();
let ok = 0;
let failed = 0;

const step = async (label, fn) => {
    try {
        await fn();
        ok += 1;
        log(`ok   ${label}`);
    } catch (err) {
        failed += 1;
        log(`FAIL ${label}: ${err.message}`);
    }
};

// Markets: one row per symbol per run. gm_market_quotes has no unique constraint on
// symbol, so the upsert lands as an insert and the series accumulates — that is the
// point. Adding a unique index on symbol would silently collapse it to a snapshot.
await step('markets', async () => {
    const quotes = await getJson('/api/markets');
    if (!Array.isArray(quotes) || !quotes.length) throw new Error('empty payload');
    await upsertMarketQuotes(quotes);
    log(`     ${quotes.length} quotes`);
});

// Fire detections, per theater. Sample data is skipped: archiving placeholder rows
// as observations would poison the history in a way that is invisible later.
for (const theater of THEATERS) {
    await step(`firms:${theater}`, async () => {
        const geo = await getJson(`/api/firms?theater=${theater}`);
        const features = geo?.features || [];
        if (!features.length) throw new Error('no features');
        const real = features.filter((f) => f?.properties?.source !== 'sample');
        if (!real.length) throw new Error(`all ${features.length} features are sample data — skipped`);
        await upsertFirmsHotspots({ ...geo, features: real }, theater);
        log(`     ${real.length} hotspots (${features.length - real.length} sample dropped)`);
    });
}

// Recorded conflict events, per theater. Deduped in the DB on the event's own
// identity, so re-reading the same window is cheap and safe.
for (const theater of THEATERS) {
    await step(`acled:${theater}`, async () => {
        const geo = await getJson(`/api/acled?theater=${theater}`);
        const features = geo?.features || [];
        if (!features.length) throw new Error('no features');
        await upsertAcledEvents(geo);
        log(`     ${features.length} events`);
    });
}

// GDELT is frequently slow enough that the edge function times out. Failing this
// step is normal and must not colour the run — it retries on the next tick.
await step('sentiment', async () => {
    const data = await getJson('/api/sentiment');
    await upsertSentimentReadings(data);
});

// Not collected, deliberately:
// - regional news needs a per-country ?code, so archiving it means one request per
//   country per tick. Worth doing, but as its own job, not inside this loop.
// - quakes and strike-stats return real data but have no table yet.

// The upsert helpers are fire-and-forget by design: they record their own outcome in
// gm_ingestion_runs and never throw, so a step can "succeed" while writing nothing.
// Read the run log back and report what the database actually did, not what the
// fetches did. Without this the collector cheerfully prints ok over a silent failure.
await step('verify', async () => {
    const { getSupabase } = await import('../server/lib/supabase.mjs');
    const sb = getSupabase();
    const { data, error } = await sb
        .from('gm_ingestion_runs')
        .select('loader,status,rows_inserted,error_message')
        .gte('started_at', startedAt)
        .order('started_at', { ascending: false });
    if (error) throw new Error(error.message);
    const bad = (data || []).filter((r) => r.status !== 'ok');
    const wrote = (data || []).reduce((n, r) => n + (r.rows_inserted || 0), 0);
    log(`     database wrote ${wrote} rows across ${data?.length || 0} loader runs`);
    for (const r of bad) log(`     DB FAIL ${r.loader}: ${r.error_message || 'unknown'}`);
    if (bad.length) throw new Error(`${bad.length} loader(s) failed at the database`);
});

log(`done — ${ok} ok, ${failed} failed`);
// Exit 0 even with partial failures: one dead upstream must not make launchd think
// the collector itself is broken. Per-step failures are visible in the log and in
// gm_ingestion_runs.
process.exit(0);
