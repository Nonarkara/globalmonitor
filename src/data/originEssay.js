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
    'The aerosol overlay is NASA MODIS Combined AOD — free, no key. It measures haze density: smoke, dust, industrial particulate. On a conflict map that means a strike or a fire can show as a plume before a wire report exists. Three more layers now sit beside it, chosen for the same job: OMPS smoke plumes (a UV index tuned for thick smoke from intense fires), OMI nitrogen dioxide, and AIRS carbon monoxide. Carbon monoxide is the one worth knowing about — it is the atmospheric signature of burning, and it stays traceable downwind for days after the fire itself is out.';

export const CO2_NOTE =
    'A correction worth making, because it changes which layer to open. Satellites cannot pick a single explosion out of the carbon dioxide background — CO₂ is measured at coarse resolution against a large, slowly moving global signal, and one strike does not move it. What a strike does produce is smoke, carbon monoxide, and nitrogen dioxide, all of which are measured directly and at useful resolution. The technique of reading combustion residue from orbit is sound. The tracer is CO, NO₂ and aerosol, not CO₂.';

export const JAXA_NOTE =
    'JAXA is why the satellite question got asked. One JAXA instrument is live on this map: GCOM-W/AMSR2, a microwave radiometer, carried here as a soil-moisture layer. It had been quietly returning nothing for months — the code asked for imagery two days old while AMSR2 publishes about six days behind, so every tile came back 404. It draws now. Two JAXA sources remain the real next step. Himawari-8/9 gives a full disk every ten minutes centred on Asia-Pacific, which is the single biggest upgrade available to this dashboard; it is not plugged in because it is served in a geostationary full-disk projection rather than the Web Mercator grid the map uses, so it needs reprojection first, not just a URL. ALOS-2 radar sees through cloud and smoke where every optical layer here goes blind, and needs an access agreement.';

export const CREATORS = [
    {
        name: 'Dr. Non Arkaraprasertkul',
        role: 'Architect, urban designer, smart city specialist',
        detail: 'Trained as an architect at MIT and as an anthropologist at Harvard, with doctoral research on cities and the people inside them. Works at Thailand\'s Digital Economy Promotion Agency (depa) on smart city implementation — the practical kind, where a plan has to survive contact with a real municipality. Built this dashboard, and the three others beside it, in 2026.',
    },
    {
        name: 'Associate Professor Dr. Poon Thiengburanathum',
        role: 'Co-creator — ranking model and urban performance methodology',
        detail: 'Author of the public ranking model this work draws on, designed to explore alternative ways of understanding how a city performs — measuring what matters to residents rather than what is easiest to count.',
    },
];

export const RESEARCH_BASIS = [
    {
        heading: 'The question it answers',
        body: 'Colleagues at the Ministry of Foreign Affairs have to decide, during a war, whether it is safe to send a person somewhere. That is a decision made under time pressure with incomplete information, and the usual input is a headline. A headline is a summary of the past written by someone with a deadline. This dashboard exists to put the underlying observations in front of that decision instead — fire detections, vessel positions, aircraft tracks, air quality, market moves — and to be honest about which of them are missing.',
    },
    {
        heading: 'Why open observational data',
        body: 'Every source here is open and citable: NASA FIRMS for thermal anomalies, NASA GIBS for satellite imagery, ACLED for recorded conflict events, GDELT for global news tone, AIS for vessels, ADS-B for aircraft, USGS for earthquakes, the World Bank for macro baselines. Nothing is classified and nothing is proprietary, which means any claim on this screen can be checked by the person reading it. That is the point. A closed intelligence product asks for trust; an open one earns it or gets corrected.',
    },
    {
        heading: 'What it deliberately does not do',
        body: 'It does not predict. It does not tell anyone what to do. It does not aggregate a situation into a single number and call that an answer — the escalation index is a composite of four measured inputs, and when those inputs are silent it reports NO DATA rather than a reassuring zero. Absence of signal is not the same as absence of danger, and a dashboard that blurs those two is worse than no dashboard.',
    },
    {
        heading: 'The measurement problem it inherits',
        body: 'Every source here has a bias built into how it was collected. FIRMS sees heat, not intent — a gas flare and a burning building look similar from orbit. ACLED depends on events being reported by someone. AIS can be switched off by a ship that does not want to be seen, and routinely is. News tone measures coverage, not reality. The honest position is that this is a map of what can be observed, which is a different thing from a map of what is happening, and the gap between those two is where judgement still belongs to a person.',
    },
];

export const ARCHITECTURE = [
    {
        heading: 'Shape',
        body: 'React 19 and Vite on the front, MapLibre GL for the map, deployed as static files on Cloudflare Pages. The /api/* endpoints are Cloudflare Pages Functions — small server-side handlers that run on demand at the edge. There is no always-on server and no monthly bill.',
    },
    {
        heading: 'How data arrives',
        body: 'Two paths. Live sources are fetched on request by a Pages Function and held in an in-memory cache with a per-source expiry. Heavy sources — vessel positions, aircraft tracks — are collected in advance by scripts in scripts/ and committed as snapshot files the site serves directly. The vessel snapshot carries about 28,000 ships, of which the API samples 1,200 for display.',
    },
    {
        heading: 'The honest envelope',
        body: 'Every API response carries its own status, source and age in X-Tech-* headers, and the interface is built to show a shell rather than a hole when a source is down. A number without a visible source and age is treated as a defect here, not a detail.',
    },
    {
        heading: 'Where it is fragile',
        body: 'The cache lives in the memory of a single Cloudflare isolate, which starts empty and is discarded when idle. Nothing survives that. It is the right trade for a free-tier deployment and the wrong one for anything that needs a memory, which is the next real piece of work.',
    },
];

export const LONGITUDINAL_NOTE =
    'The dashboard itself keeps no memory — it runs on Cloudflare\'s edge, where each request may start in a fresh process that holds nothing from the last one. The history lives somewhere else: a Postgres database on a machine at home, which pulls from this site\'s public API every fifteen minutes and writes the readings down. Nothing connects inward, and the database is never exposed. The market series runs from June 2026 and holds around 47,000 quotes across 18 instruments, roughly one reading per symbol every twenty minutes; conflict events, fire detections and news are archived alongside it. Copies go to an external drive as both a database dump and plain CSV, because an archive you cannot open without the original software is a hostage rather than a backup.';
