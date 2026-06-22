#!/usr/bin/env node
/**
 * Minimal aisstream.io probe — verbatim from official JS example.
 * https://github.com/aisstream/example/blob/main/javascript/index.js
 *
 * Usage: node scripts/ais-probe.mjs
 * Loads AISSTREAM_API_KEY from .env.local — never logs the key.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROBE_MS = 20_000;

const loadEnvFile = (filename) => {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
};

loadEnvFile('.env.local');
loadEnvFile('.env');

const API_KEY = process.env.AISSTREAM_API_KEY || '';
if (!API_KEY || API_KEY.length < 8) {
    console.error('[ais-probe] Missing AISSTREAM_API_KEY in .env.local');
    process.exit(1);
}

const socket = new WebSocket('wss://stream.aisstream.io/v0/stream', { perMessageDeflate: false });
let rawSeen = 0;
let positions = 0;
let firstMessageType = null;
let streamError = null;
let closeCode = null;
let settled = false;

const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    try { socket.close(); } catch { /* ignore */ }
    console.log(JSON.stringify({
        rawSeen,
        positions,
        firstMessageType,
        streamError,
        closeCode,
    }));
    process.exit(positions > 0 ? 0 : 1);
};

const timer = setTimeout(finish, PROBE_MS);

socket.addEventListener('open', () => {
    const subscriptionMessage = {
        APIkey: API_KEY,
        BoundingBoxes: [[[-180, -90], [180, 90]]],
    };
    socket.send(JSON.stringify(subscriptionMessage));
});

socket.addEventListener('error', (event) => {
    streamError = event?.message || String(event);
});

if (WebSocket.prototype?.on) {
    socket.on('unexpected-response', (_req, res) => {
        streamError = `http_${res.statusCode}`;
        finish();
    });
}

socket.addEventListener('close', (event) => {
    closeCode = event?.code ?? null;
    finish();
});

socket.addEventListener('message', (event) => {
    rawSeen += 1;
    try {
        const aisMessage = JSON.parse(event.data);
        if (!firstMessageType) {
            firstMessageType = aisMessage.MessageType || aisMessage.messageType || null;
        }
        if (aisMessage.MessageType === 'Error' || aisMessage.error) {
            streamError = String(aisMessage.error || aisMessage.Message?.error || 'aisstream_error');
            finish();
            return;
        }
        if (aisMessage.MessageType === 'PositionReport') {
            positions += 1;
        }
    } catch {
        /* malformed */
    }
});
