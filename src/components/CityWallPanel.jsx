import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CITY_FEEDS, cityImageProxyUrl, posterUrl } from '../data/cityFeeds.js';
import { fetchBackendJson } from '../services/backendClient.js';

/**
 * The city wall — one CCTV screen and one broadcast screen per Southeast
 * Asian city.
 *
 * Three honest degrees of "live", and the panel never blurs them:
 *
 *   hls       an actual video stream
 *   snapshot  a refreshing JPEG. NOT video. It is never called a live feed.
 *   none      no verified public camera. The panel says exactly that, in
 *             words, instead of drawing a tile that looks like a camera.
 *
 * Everything the panel shows comes from the server probe (frame size, image
 * dimensions, whether the frame moved, whether a channel is streaming now)
 * or from the static registry in `src/data/cityFeeds.js`. Nothing here
 * invents a number, a timestamp or a provenance label.
 *
 * The YouTube screens are lazy on purpose: eleven always-on iframes would
 * take the page down. A tile shows a still from the stream and its state;
 * the operator activates a tile to mount the player, and the state label
 * stays visible while it plays — a VOD channel is labelled VOD even with the
 * player running.
 */

const POLL_MS = 60000;

/** A frame URL that the browser will not serve from its own cache. */
const withStamp = (url, stamp) => {
    if (!url) return null;
    return `${url}${url.includes('?') ? '&' : '?'}cw=${stamp}`;
};

const bytesText = (bytes) =>
    (Number.isFinite(bytes) ? bytes.toLocaleString('en-US') : null);

const clockText = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok'
    });
};

const CityWallPanel = () => {
    const [payload, setPayload] = useState(null);
    const [probeFailed, setProbeFailed] = useState(false);
    const [stamp, setStamp] = useState(() => Date.now());
    const [active, setActive] = useState({});
    const [frameFailed, setFrameFailed] = useState({});
    const [frameSrc, setFrameSrc] = useState({});
    const [posterFailed, setPosterFailed] = useState({});
    const mounted = useRef(true);

    // The flag is set on mount as well as cleared on unmount: React's
    // development double-mount would otherwise leave it false for the rest
    // of the session, and the probe would never reach the panel.
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // The probe is the truth. If it does not answer, the wall falls back to
    // the static registry and says so — a registry that is out of date is
    // honest about being out of date, which a silent fallback is not.
    const load = useCallback(async () => {
        try {
            // The probe is the slow route: a cold cache fetches every frame
            // twice, six seconds apart. The timeout has to outlast it, or
            // the client gives up while the server is still measuring and
            // the wall sits on "Measuring…" for a whole poll.
            const data = await fetchBackendJson('/api/city-feeds', {}, { timeout: 45000 });
            if (!mounted.current) return;
            setPayload(data);
            setProbeFailed(false);
        } catch {
            if (!mounted.current) return;
            setProbeFailed(true);
        }
    }, []);

    useEffect(() => {
        const initial = setTimeout(load, 0);
        const timer = setInterval(() => {
            setStamp(Date.now());
            load();
        }, POLL_MS);
        return () => { clearTimeout(initial); clearInterval(timer); };
    }, [load]);

    // Merge the probe over the static registry: the registry carries the
    // honest labels and the channel mapping, the probe carries the
    // measurements. A city the probe has not answered keeps its registry
    // label rather than going blank.
    const cities = useMemo(() => {
        const byId = new Map((payload?.cities || []).map((c) => [c.id, c]));
        return CITY_FEEDS.map((city) => {
            const probed = byId.get(city.id);
            if (!probed) return { ...city, camera: { ...city.camera, probeFailed: true }, channel: { ...city.channel } };
            return {
                ...city,
                camera: { ...city.camera, ...probed.camera },
                channel: { ...city.channel, ...probed.channel }
            };
        });
    }, [payload]);

    const cameraCount = cities.filter((c) => c.camera.kind !== 'none').length;
    const liveCount = cities.filter((c) => c.channel.state === 'live').length;

    const toggle = useCallback((cityId, key) => {
        setActive((prev) => (prev[cityId] === key ? { ...prev, [cityId]: null } : { ...prev, [cityId]: key }));
    }, []);

    return (
        <div className="grid-panel city-wall">
            <div className="city-wall__bar">
                <span className="city-wall__title">City Wall</span>
                <span className="city-wall__bar-meta">
                    {/* The bar is where the reader looks first, so BOTH
                        counts live here — and neither of them is a number
                        until it has been measured. The registry says which
                        cities are wired; the probe says what is actually
                        running now. Presenting the registry's count as a
                        measurement is the same mistake as the label that
                        said "refreshing" over a still frame. */}
                    {probeFailed
                        ? 'Probe did not answer — registry labels'
                        : payload
                            ? `${cameraCount} of ${cities.length} cities carry a camera · ${liveCount} of ${cities.length} have a channel streaming live`
                            : 'Measuring…'}
                </span>
            </div>

            <div className="city-wall__scroll">
                {cities.map((city) => {
                    const camera = city.camera;
                    const channel = city.channel;
                    const alternates = channel.alternates || [];
                    const isActive = active[city.id] === 'primary';
                    const poster = posterUrl(channel.posterVideoId);
                    const cameraUrl = withStamp(camera.url, stamp);
                    // Some operators send Cross-Origin-Resource-Policy:
                    // same-origin and the browser refuses the frame outright.
                    // The server can fetch it; the browser cannot — so the
                    // tile asks the server for the bytes when the direct load
                    // fails.
                    const proxyUrl = cityImageProxyUrl(camera.url, stamp);
                    const shownSrc = frameSrc[city.id] || cameraUrl;
                    const failed = !!frameFailed[city.id];

                    return (
                        <section className="city-wall__city" key={city.id}>
                            <header className="city-wall__city-head">
                                <h3 className="city-wall__city-name">{city.name}</h3>
                                <span className="city-wall__city-cc">{city.countryCode}</span>
                            </header>

                            {camera.kind === 'none' ? (
                                <div className="city-wall__no-camera">
                                    <span className="city-wall__no-camera-title">{camera.label}</span>
                                    <span className="city-wall__no-camera-note">{camera.note}</span>
                                </div>
                            ) : (
                                <>
                                    <figure className="city-wall__frame">
                                        {failed ? (
                                            <span className="city-wall__frame-failed">
                                                The frame did not load — the source did not answer this browser.
                                            </span>
                                        ) : (
                                            <img
                                                src={shownSrc}
                                                alt={`${city.name} public camera`}
                                                loading="lazy"
                                                onError={() => {
                                                    if (proxyUrl && shownSrc !== proxyUrl) {
                                                        setFrameSrc((prev) => ({ ...prev, [city.id]: proxyUrl }));
                                                        return;
                                                    }
                                                    setFrameFailed((prev) => ({ ...prev, [city.id]: true }));
                                                }}
                                            />
                                        )}
                                    </figure>
                                    <p className="city-wall__tier">{camera.label}</p>
                                    <p className="city-wall__facts">
                                        {/* These are the SERVER'S numbers — its own
                                            fetch, at its own moment. The picture
                                            beside them is the browser's fetch and
                                            it can differ, so the line says whose
                                            measurement it is. */}
                                        <span className="city-wall__source">{camera.source}</span>
                                        {camera.probedAt ? ` · probe ${clockText(camera.probedAt)} ICT` : ''}
                                        {bytesText(camera.bytes) ? ` · ${bytesText(camera.bytes)} B` : ''}
                                        {camera.width ? ` · ${camera.width}×${camera.height}` : ''}
                                    </p>
                                    <p className="city-wall__note">{camera.note}</p>                                </>
                            )}

                            <div className="city-wall__channel">
                                <button
                                    type="button"
                                    className={`city-wall__channel-screen${isActive ? ' is-live' : ''}`}
                                    onClick={() => toggle(city.id, 'primary')}
                                    aria-pressed={isActive}
                                    title={isActive ? 'Close the player' : `Play ${channel.name}`}
                                >
                                    {isActive ? (
                                        <iframe
                                            src={channel.embedUrl}
                                            title={channel.name}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : poster && !posterFailed[city.id] ? (
                                        // The poster is a thumbnail of the channel,
                                        // and a thumbnail can 404. A broken-image
                                        // glyph in the one panel where "no
                                        // placeholder that looks like a working
                                        // camera" is the rule is a placeholder
                                        // too — so it says what happened.
                                        <img
                                            src={poster}
                                            alt=""
                                            loading="lazy"
                                            onError={() => setPosterFailed((prev) => ({ ...prev, [city.id]: true }))}
                                        />
                                    ) : (
                                        <span className="city-wall__channel-blank">
                                            {posterFailed[city.id] ? 'No poster — the thumbnail did not load' : channel.name}
                                        </span>
                                    )}
                                </button>

                                <div className="city-wall__channel-text">
                                    <span className="city-wall__channel-name">{channel.name}</span>
                                    <span className={`city-wall__channel-state city-wall__channel-state--${channel.state}`}>
                                        {channel.label}
                                    </span>
                                    <span className="city-wall__channel-note">{channel.note}</span>
                                    {alternates.length > 0 && (
                                        <ul className="city-wall__alternates">
                                            {alternates.map((alt) => (
                                                <li key={alt.channelId}>
                                                    <span className="city-wall__alternate-name">{alt.name}</span>
                                                    <span className="city-wall__alternate-state">{alt.label}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </section>
                    );
                })}

                <p className="city-wall__foot">
                    {payload?.meta?.note
                        ? payload.meta.note
                        : 'Camera screens are measured frames, not streams. A city with no verified public camera says so in words.'}
                    {payload?.meta?.cameraCoverage ? ` ${payload.meta.cameraCoverage}.` : ''}
                    {payload?.meta?.channelCoverage ? ` ${payload.meta.channelCoverage}.` : ''}
                </p>
            </div>
        </div>
    );
};

export default CityWallPanel;
