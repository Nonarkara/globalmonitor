import axios from 'axios';

// Open-Meteo API (Free, no-auth)
// To prevent querying 200 cities and rate limiting, we will build a small grid of 
// major regional cities to represent the "Macro Weather" view.
export const fetchLiveWeather = async () => {
    try {
        const cities = [
            { name: 'Bangkok', lat: 13.7563, lon: 100.5018 },
            { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
            { name: 'Jakarta', lat: -6.2088, lon: 106.8456 },
            { name: 'Manila', lat: 14.5995, lon: 120.9842 },
            { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
            { name: 'Seoul', lat: 37.5665, lon: 126.9780 },
            { name: 'Beijing', lat: 39.9042, lon: 116.4074 },
            { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
            { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
            { name: 'London', lat: 51.5074, lon: -0.1278 },
            { name: 'New York', lat: 40.7128, lon: -74.0060 }
        ];

        // Build batch coordinate query
        const latitudes = cities.map(c => c.lat).join(',');
        const longitudes = cities.map(c => c.lon).join(',');

        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,precipitation&timezone=auto`
        );

        // open-meteo returns an array if multiple locations requested starting in v1 batch mode,
        // but sometimes requires different params. We'll elegantly handle the array response.
        let dataArray = Array.isArray(response.data) ? response.data : [response.data];

        const features = cities.map((city, index) => {
            const weather = dataArray[index]?.current || {};
            const temp = weather.temperature_2m || 0;

            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [city.lon, city.lat]
                },
                properties: {
                    city: city.name,
                    temp: temp,
                    type: 'weather',
                    // Color scale: cold = blue, mild = green, hot = red
                    color: temp > 30 ? '#a72144' : (temp > 20 ? '#1a7444' : '#006eb8')
                }
            };
        });

        return {
            type: 'FeatureCollection',
            features
        };
    } catch (error) {
        console.error("Error fetching Open-Meteo data:", error);
        return { type: 'FeatureCollection', features: [] };
    }
};
