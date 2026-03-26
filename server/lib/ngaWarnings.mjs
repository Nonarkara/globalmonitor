/**
 * NGA (National Geospatial-Intelligence Agency) Navigational Warnings
 * Free, no auth required.
 * Fetches active maritime warnings relevant to Middle East shipping lanes.
 */

const NGA_URL = 'https://msi.nga.mil/api/publications/broadcast-warn?output=json&status=A';

// NAVAREA 9 = Indian Ocean / Persian Gulf / Red Sea / Arabian Sea
// Subregions relevant to Middle East:
const ME_NAVAREAS = ['9', '3'];
const ME_KEYWORDS = [
    'hormuz', 'persian gulf', 'gulf of oman', 'arabian sea', 'red sea',
    'bab el', 'bab al', 'mandeb', 'aden', 'yemen', 'oman', 'iran',
    'saudi', 'qatar', 'bahrain', 'kuwait', 'uae', 'emirates',
    'suez', 'egypt', 'israel', 'lebanon', 'syria', 'iraq',
    'naval', 'missile', 'mine', 'attack', 'military', 'danger',
    'unexploded', 'firing', 'exercise', 'restricted', 'prohibited'
];

const isMiddleEastRelevant = (warning) => {
    const text = `${warning.text || ''} ${warning.subregion || ''} ${warning.navArea || ''}`.toLowerCase();
    if (ME_NAVAREAS.includes(String(warning.navArea))) return true;
    return ME_KEYWORDS.some(kw => text.includes(kw));
};

const classifyThreat = (text) => {
    const lower = (text || '').toLowerCase();
    if (/missile|attack|mine|firing|danger|military operation/.test(lower)) return 'HIGH';
    if (/exercise|restricted|prohibited|naval/.test(lower)) return 'ELEVATED';
    if (/cable|pipe|survey|drill/.test(lower)) return 'LOW';
    return 'MODERATE';
};

export const fetchNgaWarnings = async () => {
    const res = await fetch(NGA_URL, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`NGA API returned ${res.status}`);

    const data = await res.json();
    const all = data['broadcast-warn'] || (Array.isArray(data) ? data : []);

    const meWarnings = all
        .filter(isMiddleEastRelevant)
        .map(w => ({
            id: w.msgNumber || w.id || `${w.navArea}-${w.subregion}-${w.msgYear}`,
            navArea: w.navArea,
            subregion: w.subregion,
            year: w.msgYear,
            number: w.msgNumber,
            text: (w.text || '').trim().slice(0, 500),
            issueDate: w.issueDate || null,
            cancelDate: w.cancelDate || null,
            authority: w.authority || null,
            threat: classifyThreat(w.text)
        }))
        .sort((a, b) => {
            const order = { HIGH: 0, ELEVATED: 1, MODERATE: 2, LOW: 3 };
            return (order[a.threat] || 2) - (order[b.threat] || 2);
        });

    const highCount = meWarnings.filter(w => w.threat === 'HIGH').length;
    const elevatedCount = meWarnings.filter(w => w.threat === 'ELEVATED').length;

    return {
        warnings: meWarnings,
        total: meWarnings.length,
        highThreat: highCount,
        elevatedThreat: elevatedCount,
        updatedAt: new Date().toISOString()
    };
};
