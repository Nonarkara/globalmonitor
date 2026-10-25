import { ASEAN_COUNTRIES, THAILAND_REGIONS } from '../data/regions.js';

// Labels are context, never evidence of an exact incident coordinate.
export function selectedResearchContext(event, code, mode) {
  const p = event?.properties;
  const label = p?.title || p?.city || p?.country;
  if (label) return { label, observedAt: p.observedAt, publishedAt: p.publishedAt || p.pubDate, eventAt: p.date };
  const groups = { thailand: THAILAND_REGIONS, indopacific: ASEAN_COUNTRIES };
  const place = groups[mode]?.find(item => item.code === code);
  return place ? { label: place.name } : null;
}
