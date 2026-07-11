import React, { useEffect, useRef, memo } from 'react';
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

const SecondaryClock = memo(({ city, timeRef, tzRef }) => (
    <div className="secondary-clock-h">
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

const WorldClock = ({ viewMode = 'middleeast' }) => {
    const cities = viewMode === 'thailand'
        ? THAILAND_CITIES
        : viewMode === 'indopacific'
            ? INDO_PACIFIC_CITIES
            : ME_CITIES;

    const primaryTimeRef = useRef(null);
    const primaryDateRef = useRef(null);
    const secondaryTimeRefs = useRef([]);

    const primaryCity = cities.find((city) => city.primary) || cities[0];
    const secondaryCities = uniqueTimezoneCities(cities);
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
        <div className="top-bar-clock">
            <div className="secondary-clocks-side left-side">
                {secondaryCities.slice(0, 4).map((city, index) => (
                    <SecondaryClock
                        key={cityKey(city)}
                        city={city}
                        timeRef={(el) => { secondaryTimeRefs.current[index] = el; }}
                        tzRef={(el) => { secondaryTzRefs.current[index] = el; }}
                    />
                ))}
            </div>

            <div className="primary-clock-center">
                <PrimaryClock city={primaryCity} timeRef={primaryTimeRef} dateRef={primaryDateRef} />
            </div>

            <div className="secondary-clocks-side right-side">
                {secondaryCities.slice(4).map((city, index) => (
                    <SecondaryClock
                        key={cityKey(city)}
                        city={city}
                        timeRef={(el) => { secondaryTimeRefs.current[index + 4] = el; }}
                        tzRef={(el) => { secondaryTzRefs.current[index + 4] = el; }}
                    />
                ))}
            </div>
        </div>
    );
};

export default memo(WorldClock);
