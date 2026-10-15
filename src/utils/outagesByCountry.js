/**
 * One map point per country, however many outages it had. Iraq logged six exam
 * shutdowns in four weeks; drawn individually they stack on one coordinate and
 * read as a single dot that lies about frequency.
 *
 * A country is `deliberate` if any of its outages was military or government
 * directed — the distinction a reader actually needs: was this cut, or did it break.
 */
const DELIBERATE = new Set(['conflict', 'state']);

export const outagesByCountry = (collection) => {
    const groups = new Map();
    for (const f of collection?.features || []) {
        const p = f.properties;
        const g = groups.get(p.countryCode) || { coords: f.geometry.coordinates, items: [] };
        g.items.push(p);
        groups.set(p.countryCode, g);
    }

    const features = [];
    for (const [code, { coords, items }] of groups) {
        items.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
        const latest = items[0];
        features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: {
                countryCode: code,
                country: latest.country,
                count: items.length,
                ongoing: items.some((i) => i.ongoing),
                deliberate: items.some((i) => DELIBERATE.has(i.causeClass)),
                cause: latest.cause,
                scope: latest.scope,
                startDate: latest.startDate,
                endDate: latest.endDate,
                description: latest.description,
                networks: latest.networks,
                placedBy: latest.placedBy,
                linkedUrl: latest.linkedUrl,
            },
        });
    }
    return { type: 'FeatureCollection', features };
};
