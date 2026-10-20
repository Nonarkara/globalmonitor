/**
 * The city wall's static half — what each city IS, before any probe runs.
 *
 * The wall is one CCTV screen and one broadcast screen per Southeast Asian
 * city. Two rules decide how this file is written:
 *
 *   1. A label says what the source IS, never what we wish it were. A
 *      refreshing JPEG is a snapshot, not live video. A channel that has not
 *      uploaded since 2015 is dormant, not "live". A city with no verified
 *      public camera says so in words — there is no placeholder tile that
 *      looks like a working camera.
 *   2. The truth lives in ONE place and both sides read it. The client
 *      renders these labels before the server probe answers, and
 *      `server/lib/cityFeeds.mjs` imports this same module to know which
 *      endpoint belongs to which city. A label cannot drift between the
 *      server's payload and the panel, because there is only one copy of it.
 *
 * Every camera endpoint here was measured by live HTTP probe (status,
 * content-type, byte size, image dimensions). Every channel id here was
 * measured against YouTube's keyless feed API and the channel's own live
 * tab. The measurement notes are in the comment above each entry, because a
 * label with no provenance is how the old panel ended up showing a Russian
 * street camera labelled "Bangkok Live".
 *
 * THREE DEGREES OF "LIVE" — the wall never blurs them:
 *
 *   hls       an actual video stream
 *   snapshot  a refreshing JPEG. NOT video. Never called "live video".
 *   none      no verified public camera for that city. Said in words.
 */

/** The three degrees, spelled out. The panel uses these words, not "LIVE". */
export const CAMERA_TIER = {
    hls: 'HLS stream — live video',
    snapshot: 'Snapshot — refreshing JPEG, not video',
    none: 'No verified public camera'
};

/** What a broadcast channel actually is right now. */
export const CHANNEL_STATE = {
    live: 'LIVE',
    vod: 'VOD — no live stream running at the probe time',
    dormant: 'Dormant',
    stale: 'Stale',
    // The state the REGISTRY carries, and the only state a static file may
    // carry: the condition of a channel is measured, never asserted. Until
    // the probe answers, the wall says it does not know.
    unconfirmed: 'Unconfirmed — the probe has not answered yet'
};

/** YouTube embeds. Muted first for autoplay compliance; the operator unmutes. */
export const ytChannel = (channelId) =>
    `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&mute=1&rel=0&modestbranding=1`;
export const ytVideo = (videoId) =>
    `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;

/**
 * The cities of the wall, in the order an operator reads them: the ones with
 * a camera first (the evidence you can see), then the ones that are a pin
 * only. lat/lon is the city centre, a reference position — the camera's own
 * coordinates arrive with the probe where the feed publishes them.
 */
export const CITY_FEEDS = [
    {
        id: 'bangkok',
        name: 'Bangkok',
        country: 'Thailand',
        countryCode: 'TH',
        lat: 13.7563,
        lon: 100.5018,
        camera: {
            kind: 'snapshot',
            label: 'Snapshot — refreshing JPEG, not video',
            source: 'iTIC / Longdo',
            sourceUrl: 'https://camera.longdo.com/',
            // The iTIC feed publishes 162 cameras; only the ones carrying a
            // real camid answer with a frame. The server picks a live frame
            // from them and says which one it picked.
            note: 'Frame chosen by the server from the iTIC camera feed; the probe reports which camera answered.'
        },
        channel: {
            name: 'Thai PBS',
            channelId: 'UC5TOFhyb_LxL2VG_Zenhpzw',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'National public broadcaster; its live tab carries a stream when it is on air.',
            posterVideoId: 'VZ81OVNlBV4',
            embedKind: 'channel',
            alternates: [
                {
                    name: 'PPTV HD 36',
                    channelId: 'UC7FCQJFK1sfwD_uobB45Xng',
                    state: 'unconfirmed',
                    label: CHANNEL_STATE.unconfirmed,
                    posterVideoId: 'FFtyZpRmu1M',
                    embedKind: 'channel'
                }
            ]
        }
    },
    {
        id: 'singapore',
        name: 'Singapore',
        country: 'Singapore',
        countryCode: 'SG',
        lat: 1.2897,
        lon: 103.8501,
        camera: {
            kind: 'snapshot',
            label: 'Snapshot — JPEG frame published by the operator, not video',
            source: 'data.gov.sg (LTA)',
            sourceUrl: 'https://data.gov.sg/collections/1381/view',
            note: 'The operator publishes a new file per capture; the panel reloads the frame on a timer.'
        },
        channel: {
            name: 'CNA',
            channelId: 'UC83jt4dlz1Gjl58fzQrrKZg',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'National news channel; its live tab carries a stream when it is on air.',
            posterVideoId: '-PWMxjBgr0k',
            embedKind: 'channel'
        }
    },
    {
        id: 'ho-chi-minh-city',
        name: 'Ho Chi Minh City',
        country: 'Vietnam',
        countryCode: 'VN',
        lat: 10.7769,
        lon: 106.7009,
        camera: {
            kind: 'snapshot',
            label: 'Snapshot — refreshing JPEG, not video',
            source: 'api.notis.vn (traffic operator)',
            sourceUrl: 'https://api.notis.vn/',
            note: 'Operator feed; the probe reports the camera name and district it answered from.'
        },
        channel: {
            name: 'VTV24',
            channelId: 'UCabsTV34JwALXKGMqHpvUiA',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'National channel; publishes continuously; its live tab carries a stream when it is on air.',
            posterVideoId: '_Cm-1vAdxTY',
            embedKind: 'video'
        }
    },
    {
        id: 'kuala-lumpur',
        name: 'Kuala Lumpur',
        country: 'Malaysia',
        countryCode: 'MY',
        lat: 3.139,
        lon: 101.6869,
        camera: {
            kind: 'snapshot',
            label: 'Snapshot — refreshing JPEG, not video',
            source: 'Selangor state government (Info Banjir JPS)',
            sourceUrl: 'https://infobanjirjps.selangor.gov.my/',
            // Honesty point: these cameras are in the Klang Valley, Shah Alam
            // and Klang — Selangor STATE, not Kuala Lumpur city. The wall says
            // which state, because a KL label on a Shah Alam camera is a lie
            // the operator would act on.
            note: 'Selangor state cameras (Klang Valley) — not Kuala Lumpur city.'
        },
        channel: {
            name: 'BERNAMA TV',
            channelId: 'UCcZg5r9hBqK_VPUT2I7eYVw',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'National news agency channel.',
            posterVideoId: 'l2EPY8ueb28',
            embedKind: 'channel'
        }
    },
    {
        id: 'jakarta',
        name: 'Jakarta',
        country: 'Indonesia',
        countryCode: 'ID',
        lat: -6.2088,
        lon: 106.8456,
        camera: {
            kind: 'snapshot',
            label: 'Snapshot — aggregator frame of a live camera, not video',
            source: 'opencctv.org (third-party aggregator)',
            sourceUrl: 'https://opencctv.org/',
            // Honesty point: this is an aggregator's still of a live camera on
            // the Jakarta ring road, not a primary operator feed. The HLS
            // stream behind it was verified live; the still is the frame the
            // aggregator publishes, and it refreshes slowly.
            note: 'Third-party aggregator, not a primary operator feed. The HLS stream behind this camera was verified live.'
        },
        channel: {
            name: 'TVRI Nasional',
            channelId: 'UCyIMsCzDRm8_y_6wM26_PWQ',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'National broadcaster; its live tab carries a stream when it is on air.',
            posterVideoId: 'v05O2sHoNrk',
            embedKind: 'video'
        }
    },
    {
        id: 'hanoi',
        name: 'Hanoi',
        country: 'Vietnam',
        countryCode: 'VN',
        lat: 21.0285,
        lon: 105.8542,
        camera: {
            kind: 'none',
            label: 'No verified public camera',
            source: 'Hanoi city video wall (metadata only)',
            sourceUrl: 'https://cds.hanoi.gov.vn/',
            note: 'The city publishes camera positions and stream descriptors, but no snapshot; HTTPS playback answers 404 without a session token. A pin, not a picture.'
        },
        channel: {
            name: 'VTV24',
            channelId: 'UCabsTV34JwALXKGMqHpvUiA',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'National channel; publishes continuously; its live tab carries a stream when it is on air.',
            posterVideoId: '_Cm-1vAdxTY',
            embedKind: 'video'
        }
    },
    {
        id: 'manila',
        name: 'Manila',
        country: 'Philippines',
        countryCode: 'PH',
        lat: 14.5995,
        lon: 120.9842,
        camera: {
            kind: 'none',
            label: 'No verified public camera',
            source: '—',
            sourceUrl: '',
            note: 'No primary public camera feed was found for Manila. A third-party aggregator lists cameras in Pasig and Maybunga, outside the city, and they are not an operator feed.'
        },
        channel: {
            name: 'ABS-CBN News',
            channelId: 'UCE2606prvXQc_noEqKxVJXA',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'Publishes rolling coverage of live events; its live tab carries a stream when it is on air.',
            posterVideoId: 'fgCjv-GnPck',
            embedKind: 'video',
            alternates: [
                {
                    name: 'GMA News',
                    channelId: 'UCqYw-CTd1dU2yGI71sEyqNw',
                    state: 'unconfirmed',
                    label: CHANNEL_STATE.unconfirmed,
                    posterVideoId: 'mCNSZyIjflw',
                    embedKind: 'channel'
                }
            ]
        }
    },
    {
        id: 'phnom-penh',
        name: 'Phnom Penh',
        country: 'Cambodia',
        countryCode: 'KH',
        lat: 11.5564,
        lon: 104.9282,
        camera: {
            kind: 'none',
            label: 'No verified public camera',
            source: '—',
            sourceUrl: '',
            note: 'No public camera feed was found for Phnom Penh.'
        },
        channel: {
            name: 'CTN',
            channelId: 'UCRROxgVGEihlQyjKtk3Sx9Q',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'National broadcaster with its own upload archive.',
            posterVideoId: '2NX8c9pNfPQ',
            embedKind: 'video',
            alternates: [
                {
                    name: 'tvk',
                    channelId: 'UCMS6vi61Tz4DBbrU-dnGBTA',
                    state: 'unconfirmed',
                    label: CHANNEL_STATE.unconfirmed,
                    posterVideoId: 'UAzyYF5gDt0',
                    embedKind: 'video'
                }
            ]
        }
    },
    {
        id: 'yangon',
        name: 'Yangon',
        country: 'Myanmar',
        countryCode: 'MM',
        lat: 16.8661,
        lon: 96.1951,
        camera: {
            kind: 'none',
            label: 'No verified public camera',
            source: '—',
            sourceUrl: '',
            note: 'No public camera feed was found for Yangon.'
        },
        channel: {
            name: 'MRTV4',
            channelId: 'UCoJrrvs_-HV2L0TWuPwggdw',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'State broadcaster; publishes scheduled programming.',
            posterVideoId: 'zVVMFY1nGYc',
            embedKind: 'video'
        }
    },
    {
        id: 'bandar-seri-begawan',
        name: 'Bandar Seri Begawan',
        country: 'Brunei',
        countryCode: 'BN',
        lat: 4.9031,
        lon: 114.9398,
        camera: {
            kind: 'none',
            label: 'No verified public camera',
            source: '—',
            sourceUrl: '',
            note: 'No public camera feed was found for Bandar Seri Begawan.'
        },
        channel: {
            name: 'RTB',
            channelId: 'UClGuLDuraHQvUnUYIdW1j-w',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'State broadcaster; the feed carries promos and scheduled programming.',
            posterVideoId: 'YO8yPQofBSk',
            embedKind: 'video'
        }
    },
    {
        id: 'vientiane',
        name: 'Vientiane',
        country: 'Laos',
        countryCode: 'LA',
        lat: 17.9757,
        lon: 102.6331,
        camera: {
            kind: 'none',
            label: 'No verified public camera',
            source: '—',
            sourceUrl: '',
            note: 'No public camera feed was found for Vientiane.'
        },
        channel: {
            name: 'Lao National TV',
            channelId: 'UCRjLkhW6rVF-KPKTxRxB3pA',
            state: 'unconfirmed',
            label: CHANNEL_STATE.unconfirmed,
            note: 'State broadcaster with its own upload archive.',
            posterVideoId: 'ozkln-vTA6M',
            embedKind: 'video'
        }
    }
];

/** The theaters whose panel shows the wall instead of the channel grid. */
export const CITY_WALL_THEATERS = ['indopacific', 'thailand'];

export const cityById = (id) => CITY_FEEDS.find((c) => c.id === id) || null;

/**
 * The poster frame for a channel tile: YouTube's own thumbnail of the video
 * the tile is standing for. It is a STILL of the live stream, not the
 * stream — the panel says so.
 */
export const posterUrl = (videoId) =>
    videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null;

/**
 * The route the panel asks for a camera frame through when the source will
 * not serve it to a browser directly. Some operators send
 * `Cross-Origin-Resource-Policy: same-origin`, which makes the browser
 * refuse the image no matter what the page asks for — opencctv.org does.
 * The server can fetch it; the browser cannot. One route, two behaviours:
 * JSON by default, image bytes when `image=` is present.
 */
export const CITY_IMAGE_ROUTE = '/api/city-feeds';

export const cityImageProxyUrl = (url, stamp) =>
    url ? `${CITY_IMAGE_ROUTE}?image=${encodeURIComponent(url)}&cw=${stamp}` : null;

