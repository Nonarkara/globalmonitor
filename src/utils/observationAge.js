// Observation clocks precede response clocks. A response assembled now must
// never make an older cached snapshot look newly measured.
export const trafficObservationAt = (meta) => {
    const snapshot = meta?.staticSnapshot || meta?.aisSource === 'static-snapshot' || /snapshot/.test(meta?.source || '');
    return meta?.observationAt || meta?.observedAt || (snapshot ? meta?.staticSnapshotAt : null)
        || meta?.collectedAt || meta?.fetchedAt || null;
};

export const observationAge = (value, now = Date.now()) => {
    if (!value) return 'age unavailable';
    const time = new Date(value).getTime();
    if (!Number.isFinite(time) || time > now + 60000) return 'age unavailable';
    const minutes = Math.max(0, Math.floor((now - time) / 60000));
    if (minutes < 1) return '<1m old';
    if (minutes < 60) return `${minutes}m old`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h old`;
    return `${Math.floor(minutes / 1440)}d old`;
};
