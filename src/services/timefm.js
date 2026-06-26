const BASE = `${import.meta.env.BASE_URL}data/timefm`;

/** Map forecast AOI tags to dashboard viewMode values. */
const AOI_VIEW_MODES = {
    global: ['middleeast', 'indopacific', 'thailand', 'global'],
    middleeast: ['middleeast'],
    indopacific: ['indopacific'],
    asean: ['indopacific'],
    thailand: ['thailand'],
};

export const fetchTimesFmManifest = async () => {
    const res = await fetch(`${BASE}/manifest.json`);
    if (!res.ok) throw new Error(`TimesFM manifest HTTP ${res.status}`);
    return res.json();
};

export const fetchTimesFmForRegion = async (viewMode = 'middleeast') => {
    const manifest = await fetchTimesFmManifest();
    if (!Array.isArray(manifest) || manifest.length === 0) {
        return { forecasts: [], primary: null };
    }

    const forecasts = await Promise.all(
        manifest.map(async (entry) => {
            const fileRes = await fetch(`${BASE}/${entry.file}`);
            const payload = fileRes.ok ? await fileRes.json() : null;
            return {
                id: entry.id,
                label: entry.label,
                aoi: entry.aoi,
                horizon: entry.horizon,
                model: entry.model || payload?.model,
                payload,
            };
        })
    );

    const scoped = forecasts.filter((item) => {
        const allowed = AOI_VIEW_MODES[item.aoi] || [item.aoi];
        return allowed.includes(viewMode);
    });

    return {
        forecasts: scoped,
        primary: scoped[0] || null,
    };
};
