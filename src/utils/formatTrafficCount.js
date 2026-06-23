/** Honest traffic count copy — rendered vs API total, world-spread sample. */
export const formatTrafficCount = ({ rendered = 0, total = 0, capped = false }, unit) => {
    if (rendered <= 0 && total <= 0) return null;
    if (capped && total > rendered) {
        return `${rendered.toLocaleString()} of ${total.toLocaleString()} ${unit} shown · world sample`;
    }
    const n = total > 0 ? total : rendered;
    return `${n.toLocaleString()} ${unit}`;
};

export const formatTrafficLegend = ({ rendered = 0, total = 0, capped = false }) => {
    if (rendered <= 0) return null;
    if (capped && total > rendered) {
        return `${rendered.toLocaleString()} of ${total.toLocaleString()} shown (world sample)`;
    }
    return `${rendered.toLocaleString()} global`;
};

export const EMPTY_TRAFFIC_STATS = { apiTotal: 0, rendered: 0, total: 0, capped: false };
