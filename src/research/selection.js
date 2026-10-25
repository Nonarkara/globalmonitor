import * as regions from '../data/regions.js';

// Labels are context, never evidence of an exact incident coordinate.
export function selectedResearchContext(event, code, mode) {
  const p = event?.properties;
  const label = p?.title || p?.city || p?.country;
  if (label) return { label, observedAt: p.observedAt, publishedAt: p.publishedAt || p.pubDate, eventAt: p.date };
  const groups = { thailand: regions.THAILAND_REGIONS, indopacific: regions.ASEAN_COUNTRIES, eastasia: regions.EAST_ASIA_COUNTRIES, southasia: regions.SOUTH_ASIA_COUNTRIES, middleeast: regions.MIDDLE_EAST_COUNTRIES };
  const place = groups[mode]?.find(item => item.code === code);
  return place ? { label: place.name } : null;
}
