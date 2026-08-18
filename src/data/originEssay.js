/**
 * Origin essay + the four-system identity card.
 *
 * The paragraphs are Dr Non's own words (cleaned only of invented asides).
 * Technical notes below them are verified against the live code — they exist
 * so a Papers tab never claims a satellite or a feed that is not actually on
 * the map.
 */

export const ORIGIN_ESSAY = [
    'My colleagues at the Ministry of Foreign Affairs have to decide, during a war like the one running right now, whether it\'s safe to send someone. That\'s the whole reason any of this exists. I wanted to give them something better to look at than a headline.',
    'Earlier this year I didn\'t know what Python was. I didn\'t know what "AI" stood for, and I didn\'t know what an "AI agent" was — the term hadn\'t entered my head yet. I opened Google Antigravity because it was the thing in front of me, and I built a bot. Not a dashboard. A bot that could read text off a screen, which meant finding OCR software and running it quietly in the background of a MacBook M1 that was already six years old — and this was only around six months ago. That was the whole system. That\'s where this started.',
    'From there I started pulling in open data and putting it on a map. GovInsider in Singapore is the reason I met the right people early — they put me in rooms with people who had actual ideas about what a system like this should do, not just how to make one look good. One of those people represented Japan\'s space agency, JAXA. That\'s where the satellite layer came from — I asked, and he had access to exactly the kind of imagery a war needs watched from above.',
    'All of that happened this year. It felt like watching one universe end and a new one start in its place, all at once — that\'s the closest I can get to describing the speed of it. I went from not knowing the language to building hundreds of systems, fast enough that it still surprises the people who watch me do it.',
    'I don\'t build the kind of database a system like this "should" have. I build with Google Sheets when Google Sheets will do, on purpose — so the system stays fixable by a person, not just by an engineer. I fix things fast, and I fix them the plain way, not the clever way, because the point was never to prove I could write clever code. It was to build something a human being who isn\'t me can still open up and understand.',
    'That\'s why there are four of these, not one. Each has to earn its own identity the way a real club does — strong on its own terms, not a copy of the others. One is built wide, across all of Asia. One is built deep — the flagship, everything I know how to do in one place. One is built to step all the way back and hold the whole planet at once. One is built to be fast, the signal before anyone else finishes the headline. If they all did the same thing, I\'d have built one system four times.',
];

export const FOUR_SYSTEMS = [
    {
        id: 'asia',
        name: 'AsiaWatch',
        url: 'https://asia.nonarkara.org',
        role: 'Wide. Five theaters — Southeast Asia, East Asia, South Asia, Thailand, and the Gulf as the energy lifeline that feeds Asia, not as a war zone.',
    },
    {
        id: 'flagship',
        name: 'GlobeWatch',
        url: 'https://globalmonitor.nonarkara.org',
        role: 'Deep. The flagship: live air and sea traffic, flood-risk tooling, an LLM-backed 8-week escalation forecast, sanctions, live TV.',
    },
    {
        id: 'world',
        name: 'World Console',
        url: 'https://global.nonarkara.org',
        role: 'The whole planet at once. Intel and markets docked open, not hidden behind a click.',
    },
    {
        id: 'mem',
        name: 'MEM',
        url: 'https://mem.nonarkara.org',
        role: 'Fast. Six data feeds, no filler. The signal before anyone else finishes the headline.',
    },
];

export const AEROSOL_NOTE =
    'The aerosol overlay on the three React maps is NASA MODIS Combined AOD — free, no key, two-day lag. It measures haze density: smoke, dust, industrial particulate. On a conflict map that means a strike or a fire can show as a plume before a wire report exists. MEM does not carry this layer.';

export const JAXA_NOTE =
    'JAXA is why the satellite question got asked. What is actually on the map today is NASA. Three JAXA sources are the real next step, and they are not built yet: Himawari-8/9 (10-minute full-disk, centered on Asia-Pacific), GCOM-C/SGLI (a second aerosol reading to cross-check MODIS), and ALOS-2 radar, which sees through cloud and smoke where every optical layer goes blind.';
