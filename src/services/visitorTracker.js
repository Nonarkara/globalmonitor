/**
 * DNGWS Visitor Tracker
 *
 * Logs each page visit to a Google Sheet via Apps Script.
 * Also fetches total visitor count for the counter display.
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwzTwBNOseKkvkkjD-LH6B3GWrsFcwS6MTDbn7W5eb3zHxA-swtlHYuwJ3w5PAVXDhU7Q/exec';

// No invented base count: unavailable telemetry is unknown, not a big number.
const BASE_COUNT = 0;

const GEO_APIS = [
  { url: 'https://ipapi.co/json/',          map: d => ({ ip: d.ip, country: d.country_name, region: d.region, city: d.city }) },
  { url: 'https://ip-api.com/json/?fields=query,country,regionName,city', map: d => ({ ip: d.query, country: d.country, region: d.regionName, city: d.city }) },
  { url: 'https://ipwho.is/',               map: d => ({ ip: d.ip, country: d.country, region: d.region, city: d.city }) },
];

async function getGeoData() {
  for (const api of GEO_APIS) {
    try {
      const res = await fetch(api.url);
      if (!res.ok) continue;
      const data = await res.json();
      return api.map(data);
    } catch { /* try next */ }
  }
  return { ip: 'Unknown', country: 'Unknown', region: 'Unknown', city: 'Unknown' };
}

export async function trackVisitor() {
  try {
    const geo = await getGeoData();

    const payload = {
      dashboard: 'GPD',
      hostname: location.hostname,        // conflict.nonarkara.org now (was nonarkara.github.io)
      page: location.origin + location.pathname,
      ...geo,
      userAgent: navigator.userAgent,
      referrer: document.referrer ? new URL(document.referrer).origin : 'Direct',
      language: navigator.language,
      screen: screen.width + 'x' + screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch {
    // silent
  }
}

export async function getVisitorCount() {
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) return null;
    const data = await res.json();
    return Number.isSafeInteger(data.count) && data.count >= 0 ? data.count : null;
  } catch {
    return null;
  }
}

export { BASE_COUNT };
