/**
 * Crisis Radio Intelligence Service
 * Curated live audio streams from local broadcasters in geopolitical flashpoints & conflict zones.
 */

export const CRISIS_RADIO_STATIONS = [
    {
        id: 'radio-tehran-farda',
        region: 'middleeast',
        city: 'Tehran / Regional',
        country: 'Iran',
        name: 'Radio Farda',
        freq: '1575 kHz AM',
        language: 'Persian',
        streamUrl: 'https://rfe-channel13.akacast.akamaistream.net/7/773/229674/v1/ibb.akacast.akamaistream.net/rfe_channel13',
        backupUrl: 'https://stream.zeno.fm/4vcy43339v8uv',
        status: 'LIVE'
    },
    {
        id: 'radio-telaviv-kan',
        region: 'middleeast',
        city: 'Tel Aviv / Jerusalem',
        country: 'Israel',
        name: 'Kan Reshet Bet',
        freq: '95.5 MHz FM',
        language: 'Hebrew',
        streamUrl: 'https://kanliveicy.media.kan.org.il/icy/kanbet_mp3',
        backupUrl: 'https://stream.zeno.fm/03mwh1tq7hhvv',
        status: 'LIVE'
    },
    {
        id: 'radio-beirut-liban',
        region: 'middleeast',
        city: 'Beirut',
        country: 'Lebanon',
        name: 'Radio Liban 98.1',
        freq: '98.1 MHz FM',
        language: 'Arabic / French',
        streamUrl: 'https://stream.zeno.fm/4vcy43339v8uv',
        backupUrl: 'https://kanliveicy.media.kan.org.il/icy/kanbet_mp3',
        status: 'LIVE'
    },
    {
        id: 'radio-maesot-tak',
        region: 'thailand',
        city: 'Mae Sot / Tak Border',
        country: 'Thailand / Myanmar Border',
        name: 'Radio Thailand Mae Sot',
        freq: '100.0 MHz FM',
        language: 'Thai / Burmese / Karen',
        streamUrl: 'https://radiothailand.prd.go.th/stream/tak',
        backupUrl: 'https://stream.radiojar.com/11y06x54e5zuv',
        status: 'LIVE'
    },
    {
        id: 'radio-bangkok-mcot',
        region: 'thailand',
        city: 'Bangkok',
        country: 'Thailand',
        name: 'MCOT News 100.5',
        freq: '100.5 MHz FM',
        language: 'Thai',
        streamUrl: 'https://stream.radiojar.com/11y06x54e5zuv',
        backupUrl: 'https://radiothailand.prd.go.th/stream/tak',
        status: 'LIVE'
    },
    {
        id: 'radio-taipei-icrt',
        region: 'indopacific',
        city: 'Taipei',
        country: 'Taiwan',
        name: 'ICRT News Radio',
        freq: '100.7 MHz FM',
        language: 'English / Mandarin',
        streamUrl: 'https://icrt.leanstream.co/ICRTFM',
        backupUrl: 'https://stream.radiojar.com/11y06x54e5zuv',
        status: 'LIVE'
    },
    {
        id: 'radio-kyiv-nv',
        region: 'global',
        city: 'Kyiv',
        country: 'Ukraine',
        name: 'Radio NV News',
        freq: '96.0 MHz FM',
        language: 'Ukrainian',
        streamUrl: 'https://stream.zeno.fm/03mwh1tq7hhvv',
        backupUrl: 'https://stream.zeno.fm/4vcy43339v8uv',
        status: 'LIVE'
    }
];

export const getStationForTheater = (theater = 'middleeast') => {
    switch (theater) {
        case 'thailand':
            return CRISIS_RADIO_STATIONS.find(s => s.id === 'radio-maesot-tak') || CRISIS_RADIO_STATIONS[3];
        case 'indopacific':
        case 'eastasia':
            return CRISIS_RADIO_STATIONS.find(s => s.id === 'radio-taipei-icrt') || CRISIS_RADIO_STATIONS[5];
        case 'middleeast':
        default:
            return CRISIS_RADIO_STATIONS[0];
    }
};
