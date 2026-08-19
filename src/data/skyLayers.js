/**
 * Always-visible sky / atmosphere controls for World Console.
 * Photo is the daily NASA pass. The Esri basemap is an archive mosaic.
 */
export const SKY_LAYERS = [
    {
        id: 'eo-true-color',
        title: 'Photo',
        aria: 'Latest NASA satellite photo of the ground',
        hint: 'NASA VIIRS, about 1 day old',
    },
    {
        id: 'eo-cloud',
        title: 'Cloud',
        aria: 'Cloud-cover overlay',
        hint: 'MODIS cloud fraction',
    },
    {
        id: 'eo-aerosol',
        title: 'Aerosol',
        aria: 'Smoke, dust, and haze',
        hint: 'MODIS aerosol, about 2 days old',
    },
    {
        id: 'weather',
        title: 'Rain',
        aria: 'Live rain radar',
        hint: 'RainViewer radar',
    },
    {
        id: 'typhoons',
        title: 'Storm',
        aria: 'Active typhoons and cyclones',
        hint: 'NASA EONET named storms',
    },
];

export const SKY_LAYER_IDS = SKY_LAYERS.map((layer) => layer.id);
