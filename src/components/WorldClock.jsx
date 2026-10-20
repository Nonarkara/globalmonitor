import React, { useEffect, useMemo, useRef, memo } from 'react';
import { formatDayCount } from '../data/warConstants.js';

const formatWarDate = (date) => date
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase()
    .replace(/,/g, '');

const ME_CITIES = [
    { name: 'Jerusalem', tz: 'Asia/Jerusalem', label: 'Jerusalem (IL)', primary: true },
    { name: 'Washington', tz: 'America/New_York' },
    { name: 'London', tz: 'Europe/London' },
    { name: 'Tehran', tz: 'Asia/Tehran' },
    { name: 'Moscow', tz: 'Europe/Moscow' },
    { name: 'Riyadh', tz: 'Asia/Riyadh' },
    { name: 'Beirut', tz: 'Asia/Beirut' },
    { name: 'Beijing', tz: 'Asia/Shanghai' },
    { name: 'Kyiv', tz: 'Europe/Kyiv' },
];

const INDO_PACIFIC_CITIES = [
    { name: 'Singapore', tz: 'Asia/Singapore', label: 'Singapore (SG)', primary: true },
    { name: 'Bangkok', tz: 'Asia/Bangkok' },
    { name: 'Jakarta', tz: 'Asia/Jakarta' },
    { name: 'Manila', tz: 'Asia/Manila' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' },
    { name: 'Delhi', tz: 'Asia/Kolkata' },
    { name: 'Canberra', tz: 'Australia/Sydney' },
    { name: 'Honolulu', tz: 'Pacific/Honolulu' },
    { name: 'Washington', tz: 'America/New_York' },
];

const THAILAND_CITIES = [
    { name: 'Bangkok', tz: 'Asia/Bangkok', label: 'Bangkok · ICT', primary: true },
    { name: 'Singapore', tz: 'Asia/Singapore' },
    { name: 'Jakarta', tz: 'Asia/Jakarta' },
    { name: 'Manila', tz: 'Asia/Manila' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' },
    { name: 'Delhi', tz: 'Asia/Kolkata' },
    { name: 'Sydney', tz: 'Australia/Sydney' },
    { name: 'London', tz: 'Europe/London' },
    { name: 'Washington', tz: 'America/New_York' },
];

const formatTime = (date, timezone, showSeconds = false) => {
    try {
        const options = {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            ...(showSeconds && { second: '2-digit' }),
            hour12: false
        };
        return date.toLocaleTimeString('en-GB', options);
    } catch {
        return showSeconds ? '--:--:--' : '--:--';
    }
};

const formatTzAbbr = (date, timezone) => {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            timeZoneName: 'short'
        }).formatToParts(date);
        return parts.find((part) => part.type === 'timeZoneName')?.value || '';
    } catch {
        return '';
    }
};

/** One city per timezone so secondary row never shows duplicate times. */
const uniqueTimezoneCities = (cities) => {
    const seen = new Set();
    return cities.filter((city) => {
        if (city.primary || seen.has(city.tz)) return false;
        seen.add(city.tz);
        return true;
    });
};

/**
 * The drop order for the world-clock index. The row has one line and the
 * clocks are the first thing to give way, so the index is ordered by how much
 * a clock still says to an operator watching this theater: the theater's own
 * cities first, the far-flung ones last. The tail is what disappears — whole
 * clocks, never half of one. A clock thirteen hours away says less about the
 * Gulf than the local one, so Washington goes before Bangkok does.
 */
const CLOCK_KEEP_ORDER = [
    'Bangkok', 'Jakarta', 'Manila', 'Singapore', 'Delhi', 'Tokyo', 'Taipei', 'Seoul',
    'Colombo', 'Dhaka', 'Islamabad', 'Beijing', 'Jerusalem', 'Beirut', 'Riyadh',
    'Tehran', 'Dubai', 'Kyiv', 'Moscow', 'London', 'Canberra', 'Sydney', 'Honolulu',
    'Washington',
];

const keepRank = (name) => {
    const index = CLOCK_KEEP_ORDER.indexOf(name);
    return index === -1 ? CLOCK_KEEP_ORDER.length : index;
};

const SecondaryClock = memo(({ city, rank, timeRef, tzRef }) => (
    <div className={`secondary-clock-h clock-rank-${rank}`} data-chrome-drop="clock">
        <span className="clock-city-small">{city.name}</span>
        <span className="clock-tz-small" ref={tzRef} aria-hidden="true">—</span>
        <span className="clock-time-small" ref={timeRef} aria-live="off">--:--</span>
    </div>
));
SecondaryClock.displayName = 'SecondaryClock';

/** Primary clock ticks via ref — no parent React re-render every second. */
const PrimaryClock = memo(({ city, timeRef, dateRef }) => (
    <div className="primary-clock-content">
        <div className="clock-war-date" ref={dateRef} aria-live="off">—</div>
        <div className="clock-city">{city.label || city.name}</div>
        <div className="clock-time-large" ref={timeRef} aria-live="off">--:--:--</div>
    </div>
));
PrimaryClock.displayName = 'PrimaryClock';

const cityKey = (city) => `${city.name}-${city.tz}`;

const EAST_ASIA_CITIES = [
    { name: 'Tokyo', tz: 'Asia/Tokyo', label: 'Tokyo (JP)', primary: true },
    { name: 'Seoul', tz: 'Asia/Seoul' },
    { name: 'Beijing', tz: 'Asia/Shanghai' },
    { name: 'Taipei', tz: 'Asia/Taipei' },
    { name: 'Singapore', tz: 'Asia/Singapore' },
    { name: 'Delhi', tz: 'Asia/Kolkata' },
    { name: 'Washington', tz: 'America/New_York' },
    { name: 'London', tz: 'Europe/London' },
];

const SOUTH_ASIA_CITIES = [
    { name: 'Delhi', tz: 'Asia/Kolkata', label: 'Delhi (IN)', primary: true },
    { name: 'Islamabad', tz: 'Asia/Karachi' },
    { name: 'Dhaka', tz: 'Asia/Dhaka' },
    { name: 'Colombo', tz: 'Asia/Colombo' },
    { name: 'Singapore', tz: 'Asia/Singapore' },
    { name: 'Dubai', tz: 'Asia/Dubai' },
    { name: 'Washington', tz: 'America/New_York' },
    { name: 'London', tz: 'Europe/London' },
];

const GLOBAL_CITIES = [
    { name: 'UTC', tz: 'UTC', label: 'UTC', primary: true },
    { name: 'Washington', tz: 'America/New_York' },
    { name: 'London', tz: 'Europe/London' },
    { name: 'Jerusalem', tz: 'Asia/Jerusalem' },
    { name: 'Tehran', tz: 'Asia/Tehran' },
    { name: 'Singapore', tz: 'Asia/Singapore' },
    { name: 'Delhi', tz: 'Asia/Kolkata' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' },
    { name: 'Canberra', tz: 'Australia/Sydney' },
];

const CITIES_BY_THEATER = {
    thailand: THAILAND_CITIES,
    indopacific: INDO_PACIFIC_CITIES,
    eastasia: EAST_ASIA_CITIES,
    southasia: SOUTH_ASIA_CITIES,
    global: GLOBAL_CITIES,
    middleeast: ME_CITIES,
};

const WorldClock = ({ viewMode = 'middleeast', theaterLabel = '' }) => {
    const cities = CITIES_BY_THEATER[viewMode] || INDO_PACIFIC_CITIES;

    const primaryTimeRef = useRef(null);
    const primaryDateRef = useRef(null);
    const secondaryTimeRefs = useRef([]);
    const cellRef = useRef(null);

    const primaryCity = cities.find((city) => city.primary) || cities[0];
    // The index is ordered by what it still says, so the clocks that give way
    // are the tail — the far-flung ones.
    const secondaryCities = useMemo(
        () => uniqueTimezoneCities(cities).sort((a, b) => keepRank(a.name) - keepRank(b.name)),
        [cities]
    );
    const secondaryTzRefs = useRef([]);

    useEffect(() => {
        secondaryTimeRefs.current = secondaryTimeRefs.current.slice(0, secondaryCities.length);
        secondaryTzRefs.current = secondaryTzRefs.current.slice(0, secondaryCities.length);

        let lastMinute = -1;
        let lastDateKey = '';
        let lastTzKey = '';

        const tick = () => {
            const now = new Date();
            if (primaryTimeRef.current) {
                primaryTimeRef.current.textContent = formatTime(now, primaryCity.tz, true);
            }

            const dateKey = now.toDateString();
            if (dateKey !== lastDateKey && primaryDateRef.current) {
                lastDateKey = dateKey;
                primaryDateRef.current.textContent = `${formatWarDate(now)} · ${formatDayCount()}`;
            }

            const minute = now.getMinutes();
            const tzKey = `${now.getHours()}:${Math.floor(now.getDate() / 7)}`;
            if (minute !== lastMinute || tzKey !== lastTzKey) {
                lastMinute = minute;
                lastTzKey = tzKey;
                secondaryCities.forEach((city, index) => {
                    const timeEl = secondaryTimeRefs.current[index];
                    if (timeEl) {
                        timeEl.textContent = formatTime(now, city.tz, false);
                    }
                    const tzEl = secondaryTzRefs.current[index];
                    if (tzEl) {
                        tzEl.textContent = formatTzAbbr(now, city.tz);
                    }
                });
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [primaryCity.tz, secondaryCities]);

    return (
        /* One instrument cell inside the chrome row: the reference clock, the
           theater it is keeping time for, and the index of the world's time
           around it. None of them is a band of its own. */
        <div className="top-bar-clock" ref={cellRef}>
            <div className="primary-clock-center">
                <PrimaryClock city={primaryCity} timeRef={primaryTimeRef} dateRef={primaryDateRef} />
            </div>

            {/* The theater the reference clock is keeping time for. It is
                never truncated: on a wide screen the row has room for it, and
                when the row runs out it is dropped whole. */}
            {theaterLabel ? <div className="clock-theater-ref" data-chrome-drop="theater">{theaterLabel}</div> : null}

            <div className="secondary-clocks-side">
                {secondaryCities.map((city, index) => (
                    <SecondaryClock
                        key={cityKey(city)}
                        city={city}
                        rank={index + 1}
                        timeRef={(el) => { secondaryTimeRefs.current[index] = el; }}
                        tzRef={(el) => { secondaryTzRefs.current[index] = el; }}
                    />
                ))}
            </div>
        </div>
    );
};

export default memo(WorldClock);
