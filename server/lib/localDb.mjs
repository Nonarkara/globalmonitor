/**
 * Local SQLite persistence layer.
 *
 * Replaces Supabase as the primary storage backend when running on-laptop.
 * Data survives server restarts; cache is warmed from DB on startup so
 * visitors always get instant data, not cold-start stalls.
 *
 * DB file: <project_root>/data/globalmonitor.db
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'globalmonitor.db');

let db = null;

const getDb = () => {
    if (db) return db;
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const Database = require('better-sqlite3');
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');  // Write-Ahead Logging: faster concurrent reads
        db.pragma('synchronous = NORMAL'); // Faster writes, safe enough for this use case
        initSchema();
        console.log(`[localDb] SQLite ready: ${DB_PATH}`);
    } catch (err) {
        console.error(`[localDb] failed to open DB: ${err.message}`);
        db = null;
    }
    return db;
};

const initSchema = () => {
    db.exec(`
        -- Cache snapshots — warm the in-memory cache on server restart
        CREATE TABLE IF NOT EXISTS gm_cache_snapshots (
            cache_key  TEXT PRIMARY KEY,
            payload    TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            saved_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        CREATE INDEX IF NOT EXISTS gm_cache_saved_idx ON gm_cache_snapshots(saved_at DESC);

        -- ACLED conflict events archive
        CREATE TABLE IF NOT EXISTS gm_acled_events (
            event_id   TEXT NOT NULL,
            theater    TEXT NOT NULL DEFAULT 'middleeast',
            payload    TEXT NOT NULL,  -- full feature JSON
            event_date TEXT,
            saved_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            PRIMARY KEY (event_id, theater)
        );
        CREATE INDEX IF NOT EXISTS gm_acled_date_idx ON gm_acled_events(theater, event_date DESC);

        -- NASA FIRMS fire hotspots archive
        CREATE TABLE IF NOT EXISTS gm_firms_hotspots (
            acq_datetime TEXT NOT NULL,
            theater      TEXT NOT NULL DEFAULT 'middleeast',
            lat          REAL,
            lng          REAL,
            brightness   REAL,
            frp          REAL,
            payload      TEXT NOT NULL,  -- full feature JSON
            saved_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            PRIMARY KEY (acq_datetime, lat, lng, theater)
        );
        CREATE INDEX IF NOT EXISTS gm_firms_theater_idx ON gm_firms_hotspots(theater, acq_datetime DESC);

        -- Market quotes archive (one row per symbol, updated in place)
        CREATE TABLE IF NOT EXISTS gm_market_quotes (
            symbol     TEXT PRIMARY KEY,
            name       TEXT,
            price      REAL,
            change_pct REAL,
            payload    TEXT NOT NULL,  -- full quote JSON
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        -- GDELT sentiment readings (one per query + date)
        CREATE TABLE IF NOT EXISTS gm_sentiment_readings (
            query        TEXT NOT NULL,
            reading_date TEXT NOT NULL,
            tone         REAL,
            volume       INTEGER,
            payload      TEXT NOT NULL,  -- full timeline JSON
            saved_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            PRIMARY KEY (query, reading_date)
        );

        -- Per-country news items cache
        CREATE TABLE IF NOT EXISTS gm_news_items (
            pk         INTEGER PRIMARY KEY AUTOINCREMENT,
            region     TEXT NOT NULL,
            code       TEXT NOT NULL,
            title      TEXT NOT NULL,
            link       TEXT NOT NULL,
            source     TEXT,
            tag        TEXT,
            pub_date   TEXT,
            fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            UNIQUE (region, code, link)
        );
        CREATE INDEX IF NOT EXISTS gm_news_region_code_idx ON gm_news_items(region, code, pub_date DESC);

        -- Ingestion run log / heartbeat
        CREATE TABLE IF NOT EXISTS gm_ingestion_runs (
            pk           INTEGER PRIMARY KEY AUTOINCREMENT,
            loader       TEXT NOT NULL,
            region       TEXT,
            status       TEXT NOT NULL,
            rows_written INTEGER DEFAULT 0,
            error_msg    TEXT,
            duration_ms  INTEGER,
            started_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        CREATE INDEX IF NOT EXISTS gm_runs_loader_idx ON gm_ingestion_runs(loader, started_at DESC);
    `);
};

// ── Cache warming ────────────────────────────────────────────────────────────

export const saveSnapshot = (cacheKey, payload, updatedAt) => {
    const db = getDb();
    if (!db) return;
    try {
        db.prepare(`
            INSERT INTO gm_cache_snapshots (cache_key, payload, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(cache_key) DO UPDATE SET
                payload    = excluded.payload,
                updated_at = excluded.updated_at,
                saved_at   = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        `).run(cacheKey, JSON.stringify(payload), updatedAt);
    } catch (err) {
        console.warn(`[localDb] saveSnapshot failed for "${cacheKey}": ${err.message}`);
    }
};

export const loadAllSnapshots = () => {
    const db = getDb();
    if (!db) return [];
    try {
        return db.prepare(`SELECT cache_key, payload, updated_at FROM gm_cache_snapshots`).all();
    } catch (err) {
        console.warn(`[localDb] loadAllSnapshots failed: ${err.message}`);
        return [];
    }
};

// ── Data archive helpers ─────────────────────────────────────────────────────

export const upsertAcledEvents = (geojson, theater = 'middleeast') => {
    const db = getDb();
    if (!db || !Array.isArray(geojson?.features)) return;
    const t0 = Date.now();
    const stmt = db.prepare(`
        INSERT INTO gm_acled_events (event_id, theater, payload, event_date)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(event_id, theater) DO UPDATE SET
            payload    = excluded.payload,
            event_date = excluded.event_date,
            saved_at   = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    `);
    const upsertMany = db.transaction((features) => {
        let written = 0;
        for (const f of features) {
            const id = f.properties?.event_id_cnty || f.properties?.data_id || String(f.properties?.acled_id);
            if (!id) continue;
            stmt.run(id, theater, JSON.stringify(f), f.properties?.event_date || null);
            written++;
        }
        return written;
    });
    try {
        const written = upsertMany(geojson.features);
        recordRun('acled', theater, 'ok', written, Date.now() - t0, null);
    } catch (err) {
        recordRun('acled', theater, 'fail', 0, Date.now() - t0, err.message);
    }
};

export const upsertFirmsHotspots = (geojson, theater = 'middleeast') => {
    const db = getDb();
    if (!db || !Array.isArray(geojson?.features)) return;
    const t0 = Date.now();
    const stmt = db.prepare(`
        INSERT INTO gm_firms_hotspots (acq_datetime, theater, lat, lng, brightness, frp, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(acq_datetime, lat, lng, theater) DO UPDATE SET
            brightness = excluded.brightness,
            frp        = excluded.frp,
            payload    = excluded.payload,
            saved_at   = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    `);
    const upsertMany = db.transaction((features) => {
        let written = 0;
        for (const f of features) {
            const p = f.properties || {};
            const dt = p.acq_datetime || p.acq_date || null;
            const [lng, lat] = f.geometry?.coordinates || [null, null];
            stmt.run(dt, theater, lat, lng, p.brightness || null, p.frp || null, JSON.stringify(f));
            written++;
        }
        return written;
    });
    try {
        const written = upsertMany(geojson.features);
        recordRun('firms', theater, 'ok', written, Date.now() - t0, null);
    } catch (err) {
        recordRun('firms', theater, 'fail', 0, Date.now() - t0, err.message);
    }
};

export const upsertMarketQuotes = (quotes) => {
    const db = getDb();
    if (!db || !Array.isArray(quotes)) return;
    const t0 = Date.now();
    const stmt = db.prepare(`
        INSERT INTO gm_market_quotes (symbol, name, price, change_pct, payload)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
            name       = excluded.name,
            price      = excluded.price,
            change_pct = excluded.change_pct,
            payload    = excluded.payload,
            updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    `);
    const upsertMany = db.transaction((items) => {
        for (const q of items) {
            stmt.run(q.symbol || q.ticker, q.name || null, q.price || null, q.changePercent || q.change_pct || null, JSON.stringify(q));
        }
        return items.length;
    });
    try {
        const written = upsertMany(quotes);
        recordRun('markets', null, 'ok', written, Date.now() - t0, null);
    } catch (err) {
        recordRun('markets', null, 'fail', 0, Date.now() - t0, err.message);
    }
};

export const upsertSentimentReadings = (payload) => {
    const db = getDb();
    if (!db || !Array.isArray(payload?.timeline)) return;
    const t0 = Date.now();
    const query = payload.query || 'unknown';
    const stmt = db.prepare(`
        INSERT INTO gm_sentiment_readings (query, reading_date, tone, volume, payload)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(query, reading_date) DO UPDATE SET
            tone    = excluded.tone,
            volume  = excluded.volume,
            payload = excluded.payload,
            saved_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    `);
    const upsertMany = db.transaction((items) => {
        let written = 0;
        for (const pt of items) {
            stmt.run(query, pt.date || pt.day || null, pt.tone ?? null, pt.volume ?? null, JSON.stringify(pt));
            written++;
        }
        return written;
    });
    try {
        const written = upsertMany(payload.timeline);
        recordRun('sentiment', query, 'ok', written, Date.now() - t0, null);
    } catch (err) {
        recordRun('sentiment', query, 'fail', 0, Date.now() - t0, err.message);
    }
};

export const upsertNewsItems = (items, region, code) => {
    const db = getDb();
    if (!db || !Array.isArray(items)) return;
    const t0 = Date.now();
    const stmt = db.prepare(`
        INSERT INTO gm_news_items (region, code, title, link, source, tag, pub_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(region, code, link) DO UPDATE SET
            title      = excluded.title,
            source     = excluded.source,
            tag        = excluded.tag,
            pub_date   = excluded.pub_date,
            fetched_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    `);
    const upsertMany = db.transaction((rows) => {
        let written = 0;
        for (const item of rows) {
            stmt.run(region, code, item.title, item.link, item.source || null, item.tag || null, item.pubDate ? new Date(item.pubDate).toISOString() : null);
            written++;
        }
        return written;
    });
    try {
        const written = upsertMany(items);
        recordRun('news', `${region}:${code}`, 'ok', written, Date.now() - t0, null);
    } catch (err) {
        recordRun('news', `${region}:${code}`, 'fail', 0, Date.now() - t0, err.message);
    }
};

const recordRun = (loader, region, status, rows, durationMs, errorMsg) => {
    const db = getDb();
    if (!db) return;
    try {
        db.prepare(`
            INSERT INTO gm_ingestion_runs (loader, region, status, rows_written, error_msg, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(loader, region || null, status, rows, errorMsg || null, durationMs);
    } catch (_) { /* never let logging kill the process */ }
};

// ── Health / diagnostic ──────────────────────────────────────────────────────

export const getDbHealth = () => {
    const db = getDb();
    if (!db) return { ok: false, path: DB_PATH, message: 'DB not initialized' };
    try {
        const tables = ['gm_cache_snapshots', 'gm_acled_events', 'gm_firms_hotspots',
                        'gm_market_quotes', 'gm_sentiment_readings', 'gm_news_items', 'gm_ingestion_runs'];
        const counts = Object.fromEntries(tables.map(t => [
            t, db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get().n
        ]));
        const recentRuns = db.prepare(
            `SELECT loader, region, status, rows_written, duration_ms, started_at
             FROM gm_ingestion_runs ORDER BY started_at DESC LIMIT 20`
        ).all();
        return { ok: true, path: DB_PATH, counts, recentRuns };
    } catch (err) {
        return { ok: false, path: DB_PATH, message: err.message };
    }
};

// Initialise DB immediately on module load so startup warnings appear early.
getDb();
