/**
 * Humanitarian data — UNHCR refugee statistics and ReliefWeb reports.
 */

const COUNTRY_CENTROIDS = {
    SYR: [38.99, 34.80], IRQ: [43.68, 33.22], AFG: [67.71, 33.94],
    YEM: [48.52, 15.55], SDN: [30.22, 12.86], PSE: [35.23, 31.95],
    LBN: [35.50, 33.87], SOM: [46.20, 5.15], MMR: [96.68, 19.76]
};

const COUNTRY_NAMES = {
    SYR: 'Syria', IRQ: 'Iraq', AFG: 'Afghanistan', YEM: 'Yemen',
    SDN: 'Sudan', PSE: 'Palestine', LBN: 'Lebanon', SOM: 'Somalia', MMR: 'Myanmar'
};

export const fetchHumanitarianPayload = async (theater = 'middleeast') => {
    const features = [];
    let totalDisplaced = 0;
    const reports = [];

    // 1. UNHCR Population API
    try {
        const countries = 'SYR,IRQ,AFG,YEM,SDN,PSE,LBN';
        const url = `https://api.unhcr.org/population/v1/population/?limit=100&year=2024&coo=${countries}&page=1`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
            const data = await res.json();
            const countryTotals = {};

            for (const item of (data.items || [])) {
                const code = item.coo_iso || item.coo;
                if (!code || !COUNTRY_CENTROIDS[code]) continue;
                if (!countryTotals[code]) countryTotals[code] = 0;
                countryTotals[code] += (item.refugees || 0) + (item.idps || 0) + (item.asylum_seekers || 0);
            }

            for (const [code, total] of Object.entries(countryTotals)) {
                if (total <= 0) continue;
                totalDisplaced += total;
                const coords = COUNTRY_CENTROIDS[code];
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: coords },
                    properties: {
                        country: COUNTRY_NAMES[code] || code,
                        displaced: total,
                        radius: Math.max(8, Math.min(40, Math.log10(total) * 8))
                    }
                });
            }
        }
    } catch (err) {
        console.error('UNHCR API error:', err.message);
    }

    // 2. ReliefWeb Reports API
    try {
        const url = 'https://api.reliefweb.int/v1/reports?appname=dngws&filter[field]=country&filter[value][]=Syria&filter[value][]=Yemen&filter[value][]=Iraq&filter[value][]=Palestine&limit=5&sort[]=date:desc';
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
            const data = await res.json();
            for (const item of (data.data || [])) {
                reports.push({
                    title: item.fields?.title || 'Report',
                    date: item.fields?.date?.created || '',
                    url: item.fields?.url_alias || item.href || ''
                });
            }
        }
    } catch (err) {
        console.error('ReliefWeb API error:', err.message);
    }

    return {
        geojson: {
            type: 'FeatureCollection',
            features
        },
        totalDisplaced,
        topCountries: features
            .sort((a, b) => b.properties.displaced - a.properties.displaced)
            .slice(0, 5)
            .map(f => ({ name: f.properties.country, displaced: f.properties.displaced })),
        reports: reports.slice(0, 5),
        fetchedAt: new Date().toISOString()
    };
};
