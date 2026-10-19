import axios from 'axios';

const iso3Centers = {
    THA: [100.9925, 15.87],
    VNM: [108.2772, 14.0583],
    IDN: [113.9213, -0.7893],
    MYS: [101.9758, 4.2105],
    SGP: [103.8198, 1.3521],
    PHL: [121.774, 12.8797],
    CHN: [104.1954, 35.8617],
    JPN: [138.2529, 36.2048],
    KOR: [127.7669, 35.9078],
    IND: [78.9629, 20.5937],
    USA: [-95.7129, 37.0902],
    GBR: [-3.4359, 55.3781],
    FRA: [2.2137, 46.2276],
    DEU: [10.4515, 51.1657],
    AUS: [133.7751, -25.2744],
    RUS: [105.3188, 61.524],
    BRA: [-51.9253, -14.235],
    ZAF: [22.9375, -30.5595],
    IRN: [53.688, 32.4279],
    ARE: [53.8478, 23.4241],
    ISR: [34.8516, 31.0461],
    SAU: [45.0792, 23.8859]
};

export const fetchMacroEconomy = async () => {
    try {
        const response = await axios.get(
            'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG?format=json&mrv=1&per_page=400',
            { timeout: 20000 }
        );

        const rows = response.data?.[1];
        if (!rows) return { type: 'FeatureCollection', features: [] };

        const features = rows
            .filter((item) => item.value !== null && iso3Centers[item.countryiso3code])
            .map((item) => {
                const growth = parseFloat(item.value);

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: iso3Centers[item.countryiso3code]
                    },
                    properties: {
                        id: item.country.id,
                        title: `Macro Outlook: ${item.country.value}`,
                        country: item.country.value,
                        growth,
                        year: item.date,
                        type: 'economy',
                        color: growth > 3 ? '#1a7444' : (growth > 0 ? '#FFC400' : '#a72144')
                    }
                };
            });

        return {
            type: 'FeatureCollection',
            features
        };
    } catch (error) {
        console.error('Error fetching World Bank data:', error);
        return { type: 'FeatureCollection', features: [] };
    }
};
