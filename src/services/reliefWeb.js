import axios from 'axios';

const GLOBAL_HOTSPOTS = [
    {
        id: 'hotspot-iran',
        title: 'Iran Regional Escalation',
        country: 'Iran / Gulf Airspace',
        type: 'Conflict and aviation disruption',
        severity: 'Severe',
        status: 'Airspace and airline operations at risk',
        operationalFocus: 'Watch Tehran, Gulf hubs, and regional reroutes.',
        coordinates: [53.688, 32.4279]
    },
    {
        id: 'hotspot-ukraine',
        title: 'Russo-Ukrainian War',
        country: 'Ukraine',
        type: 'Ongoing conflict',
        severity: 'Severe',
        status: 'Persistent infrastructure and civilian risk',
        operationalFocus: 'Track energy systems, logistics, and displacement.',
        coordinates: [31.1656, 48.3794]
    },
    {
        id: 'hotspot-gaza',
        title: 'Gaza Humanitarian Crisis',
        country: 'Gaza Strip',
        type: 'Humanitarian emergency',
        severity: 'Severe',
        status: 'Humanitarian access constrained',
        operationalFocus: 'Monitor aid corridors, hospitals, and border access.',
        coordinates: [34.3088, 31.3547]
    },
    {
        id: 'hotspot-myanmar',
        title: 'Myanmar Civil Conflict',
        country: 'Myanmar',
        type: 'Civil conflict',
        severity: 'High',
        status: 'Political instability and conflict events ongoing',
        operationalFocus: 'Watch border crossings, urban unrest, and displacement.',
        coordinates: [95.956, 21.9162]
    },
    {
        id: 'hotspot-sudan',
        title: 'Sudan Conflict',
        country: 'Sudan',
        type: 'Civil war',
        severity: 'Severe',
        status: 'Critical humanitarian and security conditions',
        operationalFocus: 'Monitor corridors, food systems, and health access.',
        coordinates: [30.2176, 12.8628]
    },
    {
        id: 'hotspot-red-sea',
        title: 'Red Sea Shipping Risk',
        country: 'Red Sea',
        type: 'Maritime disruption',
        severity: 'High',
        status: 'Shipping and logistics exposed',
        operationalFocus: 'Watch reroutes, insurance costs, and port throughput.',
        coordinates: [42.6105, 15.3694]
    }
];

const toFeature = (hotspot) => ({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: hotspot.coordinates
    },
    properties: {
        id: hotspot.id,
        title: hotspot.title,
        country: hotspot.country,
        type: 'conflict',
        types: hotspot.type,
        severity: hotspot.severity,
        status: hotspot.status,
        operationalFocus: hotspot.operationalFocus
    }
});

export const fetchConflictsAndCrises = async () => {
    const features = GLOBAL_HOTSPOTS.map(toFeature);

    try {
        const response = await axios.post(
            'https://api.reliefweb.int/v2/disasters',
            {
                profile: 'full',
                limit: 12,
                filter: {
                    operator: 'AND',
                    conditions: [{ field: 'status', value: 'current' }]
                }
            },
            { timeout: 15000 }
        );

        const apiFeatures = (response.data?.data || [])
            .filter((item) => item.fields?.primary_country?.location)
            .map((item) => {
                const country = item.fields.primary_country;
                const typeLabel = item.fields.type?.map((type) => type.name).join(', ') || 'Crisis';

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [country.location.lon, country.location.lat]
                    },
                    properties: {
                        id: item.id,
                        title: item.fields.name,
                        country: country.name,
                        type: 'conflict',
                        types: typeLabel,
                        severity: 'Live',
                        status: 'Reported by ReliefWeb',
                        operationalFocus: 'Use as a humanitarian context signal rather than a complete conflict feed.'
                    }
                };
            });

        return {
            type: 'FeatureCollection',
            features: [...features, ...apiFeatures]
        };
    } catch (error) {
        console.warn('ReliefWeb live feed unavailable, using curated hotspots.', error.message);
        return {
            type: 'FeatureCollection',
            features
        };
    }
};
