const BASE = `${import.meta.env.BASE_URL}data/alphaearth`;

/** Infer theater from manifest id when `regions` is omitted. */
const REGION_INFERENCE = {
    'change-gaza-strip-2023-2024': 'middleeast',
};

const humanizeId = (id) =>
    id
        .replace(/^change-/, '')
        .replace(/-\d{4}-\d{4}$/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

export const fetchAlphaEarthManifest = async () => {
    const res = await fetch(`${BASE}/manifest.json`);
    if (!res.ok) throw new Error(`AlphaEarth manifest HTTP ${res.status}`);
    return res.json();
};

export const fetchAlphaEarthForRegion = async (viewMode = 'middleeast') => {
    const manifest = await fetchAlphaEarthManifest();
    if (!Array.isArray(manifest) || manifest.length === 0) {
        return { layers: [], primary: null };
    }

    const layers = await Promise.all(
        manifest.map(async (entry) => {
            const sidecarRes = await fetch(`${BASE}/${entry.sidecar}`);
            const sidecar = sidecarRes.ok ? await sidecarRes.json() : null;
            const region = entry.regions?.[0]
                || REGION_INFERENCE[entry.id]
                || entry.aoi
                || 'global';

            return {
                id: entry.id,
                imageUrl: `${BASE}/${entry.image}`,
                years: entry.years || sidecar?.years,
                region,
                label: entry.label || humanizeId(entry.id),
                sidecar,
                dataset: sidecar?.dataset || 'GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL',
                bounds: sidecar?.bounds || null,
                stats: sidecar?.stats || null,
            };
        })
    );

    const scoped = layers.filter(
        (layer) => layer.region === viewMode || layer.region === 'global'
    );

    return {
        layers: scoped,
        primary: scoped[0] || null,
    };
};
