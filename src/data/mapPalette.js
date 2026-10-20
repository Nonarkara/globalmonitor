/**
 * The marks the map draws and the key the reader reads — one place.
 *
 * A swatch in the SOURCES plate and the paint that draws the mark are the
 * same fact, and they used to be two literals. They drifted: the plate showed
 * a grey ACLED swatch while the map painted the events in four other colours,
 * and a faint amber FIRMS swatch while the public-file detections were
 * painted red. A key that disagrees with the drawing is worse than no key.
 *
 * So the colour is written once, here, and both sides read it:
 *
 *   - the map's paint blocks name `MARK.<mark>`;
 *   - the SOURCES plate names the same marks, with a chip each;
 *   - `tests/truthfulness.test.mjs` reads this module and fails the build if
 *     a value leaves the closed Palette set, if the plate grows a colour
 *     literal of its own, or if the plate and the map stop naming the same
 *     marks for the same source.
 *
 * One mark, one colour. Whether a feed is live or sample is said in words,
 * never in the colour.
 */

/** Every mark the map paints, by name. */
export const MARK = {
    // Traffic — aircraft
    aircraft: '#f99d1b',        // Wada Yellow-Orange — civilian aircraft
    military: '#a72144',        // Wada Red — military aircraft

    // Traffic — vessels, one colour per class
    vesselCargo: '#1a7444',     // signal green — cargo
    vesselTanker: '#a72144',    // Wada Red — the crude that moves the market
    vesselPassenger: '#006eb8', // Blue
    vesselFishing: '#f59e0b',   // amber — wayfinding only
    vesselTug: '#f37420',       // Orange
    vesselPleasure: '#b984af',  // Lilac
    vesselOther: '#6b665e',     // ink-3 — anything unclassified

    // Conflict and evidence
    conflict: '#a72144',        // Wada Red — a conflict event, live or sample
    thermal: '#a72144',         // NASA FIRMS: the same red, one hue deepening
    thermalLow: '#f37420',      // Orange — a low-confidence detection
    aqiNone: '#6b665e',         // ink-3 — no reading to show

    // Strategic reference marks
    routeEnergy: '#a72144',     // the Gulf → India → Bangkok energy route
    routeLane: '#f59e0b',       // the Red Sea → Singapore shipping lane
    routeEast: '#006eb8',       // the Shanghai → Singapore corridor
    zoneGulf: '#a72144',        // the Gulf area wash
    zoneRedSea: '#f59e0b',      // the Red Sea area wash
    zoneSouthEast: '#1a7444'    // the Southeast Asia theatre wash
};

/**
 * The vessel classes the map paints, and the colour each one is painted in.
 * The order is the order of the paint expression, so the key in the SOURCES
 * plate and the drawing on the map are read from the same list.
 */
export const VESSEL_CLASSES = [
    { key: 'cargo', label: 'cargo', mark: 'vesselCargo' },
    { key: 'tanker', label: 'tanker', mark: 'vesselTanker' },
    { key: 'passenger', label: 'passenger', mark: 'vesselPassenger' },
    { key: 'fishing', label: 'fishing', mark: 'vesselFishing' },
    { key: 'tug', label: 'tug', mark: 'vesselTug' },
    { key: 'pleasure', label: 'pleasure', mark: 'vesselPleasure' },
    { key: 'other', label: 'other', mark: 'vesselOther' }
];

/**
 * The key for each source the SOURCES plate names. Every mark the map paints
 * for that source is listed here, with a chip; a mark that is drawn but not
 * named is a colour the reader cannot decode, and the guard fails the build
 * when the two lists drift apart.
 */
export const LEGEND_KEY = {
    aircraft: [
        { mark: 'aircraft', label: 'civilian' },
        { mark: 'military', label: 'military' }
    ],
    vessels: VESSEL_CLASSES.map(({ key, label, mark }) => ({ mark, label, key })),
    thermal: [
        { mark: 'thermal', label: 'high confidence' },
        { mark: 'thermalLow', label: 'low confidence' }
    ],
    conflicts: [
        { mark: 'conflict', label: 'event' }
    ]
};

/**
 * A palette role at an opacity. The zone washes are a named role thinned
 * out, not a new colour: the plate may not carry a literal of its own, and
 * `rgba(16,185,129,0.3)` — a Tailwind emerald — was exactly that.
 */
export const wash = (hex, alpha) => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * The wind field is supporting evidence and it is drawn in the ground's ink:
 * ink-2 on paper, paper on a dark ground. The legend swatch must be the
 * same ink as the arrows — a swatch that keeps the paper-ground value on a
 * dark map says one thing and draws another.
 */
export const groundInk = (isDark) => (isDark ? '#f7f5ef' : '#57534b');
