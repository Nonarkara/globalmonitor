import { THEATER_IDS } from './theaters.mjs';
import { getActors } from './oracle/actors.mjs';
import { listScenarios } from './oracle/scenarios.mjs';
import { FLOOD_CITIES } from './floodOps.mjs';
import { BRIEFING_DEFINITIONS, INTELLIGENCE_SOURCES } from '../../src/services/liveNews.js';

export class ApiInputError extends Error {
    constructor(message) { super(message); this.status = 400; }
}
const reject = (message) => { throw new ApiInputError(message); };
const numberParam = (params, key, min, max) => {
    if (!params.has(key)) return undefined;
    const raw = params.get(key);
    const value = Number(raw);
    if (!raw.trim() || !Number.isFinite(value) || value < min || value > max) reject(`Invalid ${key}`);
    params.set(key, String(value));
    return value;
};

/** Validate before cache-key construction or any upstream call, on both hosts. */
export const validateApiRequest = (url) => {
    if (!url.pathname.startsWith('/api/')) return;
    if (url.href.length > 4096) reject('Request URL too long');
    const params = url.searchParams;
    for (const key of new Set(params.keys())) {
        if (params.getAll(key).length !== 1) reject(`Duplicate parameter: ${key}`);
        if (params.get(key).length > 1500) reject(`Parameter too long: ${key}`);
    }
    if (params.has('theater')) {
        if (params.get('theater') === 'worldwide') params.set('theater', 'global');
        if (!THEATER_IDS.includes(params.get('theater'))) reject('Unknown theater');
    }
    if (params.has('sourceIds')) {
        const allowed = new Set(INTELLIGENCE_SOURCES.map(source => source.id));
        const ids = params.get('sourceIds').split(',').map(id => id.trim());
        if (!ids.length || ids.length > allowed.size || ids.some(id => !allowed.has(id))) reject('Unknown news source');
        params.set('sourceIds', [...new Set(ids)].sort().join(','));
    }
    if (url.pathname.startsWith('/api/briefings/')) {
        let id;
        try { id = decodeURIComponent(url.pathname.slice('/api/briefings/'.length)); }
        catch { reject('Invalid briefing path'); }
        if (!Object.hasOwn(BRIEFING_DEFINITIONS, id)) reject('Unknown briefing');
    }
    if (url.pathname === '/api/oracle') {
        const theater = params.get('theater') || 'middleeast';
        // Global currently shows an explicitly labelled Middle East reference model.
        const modelTheater = theater === 'global' ? 'middleeast' : theater;
        if (params.has('scenario') && !listScenarios(modelTheater).some(s => s.id === params.get('scenario'))) reject('Unknown scenario for theater');
        numberParam(params, 'escDelta', -20, 20);
        if (params.has('p')) {
            const actors = new Set(getActors(modelTheater).map(actor => actor.id));
            const seen = new Set();
            const pairs = params.get('p').split(',').map(pair => {
                const parts = pair.split(':');
                const [id, raw] = parts;
                const delta = Number(raw);
                if (parts.length !== 2 || !raw.trim() || !actors.has(id) || seen.has(id) || !Number.isFinite(delta) || Math.abs(delta) > 1) reject('Invalid actor posture');
                seen.add(id);
                return [id, Math.round(delta * 100) / 100];
            });
            if (pairs.length > actors.size) reject('Too many actors');
            params.set('p', pairs.sort(([a], [b]) => a.localeCompare(b)).map(([id, delta]) => `${id}:${delta}`).join(','));
        }
    }
    if (url.pathname === '/api/flood' || url.pathname === '/api/flood/directive') {
        if (params.has('city') && !Object.hasOwn(FLOOD_CITIES, params.get('city'))) reject('Unknown flood city');
        numberParam(params, 'delta', -10, 10);
        numberParam(params, 'km2', 0, 100000);
        if (!params.has('delta') && (params.has('km2') || params.has('pois'))) reject('Simulation requires delta');
        if (params.has('pois')) {
            const pois = params.get('pois').split('|');
            if (pois.length > 8 || pois.some(p => !p.trim() || p.length > 160 || /[<>\u0000-\u001f]/.test(p))) reject('Invalid simulation sites');
        }
    }
    if (url.pathname === '/api/news-rss') {
        if (!params.get('q')?.trim() || params.get('q').length > 300) reject('Invalid news query');
        if (params.has('hl') && !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(params.get('hl'))) reject('Invalid news language');
    }
    if (url.pathname === '/api/regional-news') {
        // middleeast is the war-theater region (Houthi / Saudi / Iran / Israel)
        // and is valid for the same reason indopacific / thailand are.
        if (params.has('region') && !['indopacific', 'thailand', 'middleeast', 'gulf', 'mideast'].includes(params.get('region'))) reject('Unknown news region');
        if (!/^[A-Z0-9_-]{1,8}$/i.test(params.get('code') || '')) reject('Invalid region code');
        params.set('code', params.get('code').toUpperCase());
    }
};

export const parseSourceIds = (params) => params.has('sourceIds') ? params.get('sourceIds').split(',') : null;

export const parseFloodSimulation = (params) => params.has('delta') ? {
    deltaM: Number(params.get('delta')),
    // A missing client-computed area is unknown, not an observed zero.
    floodedKm2: params.has('km2') ? Number(params.get('km2')) : null,
    floodedPois: params.get('pois')?.split('|') || [],
} : null;
