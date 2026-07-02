# GlobalWatch: A Multi-Theater Intelligence Framework
### Monitoring the Middle East, ASEAN, and Thailand in Real Time

**Dr. Non Arkaraprasertkul** — Architect, Urban Designer, Smart City Specialist; Harvard-affiliated doctoral researcher in anthropology and cities focused on human-centered smart cities and real-world implementation.

**Associate Professor Dr. Poon Thiengburanathum** — Public ranking model designed to explore alternative ways of understanding urban performance.

_Their work sits at the intersection of urban design, data, and human behavior, bringing a distinctly people-centered perspective to how cities are measured and experienced._

---

**UNCLASSIFIED // FOR OFFICIAL USE ONLY**
OSINT-based analysis. Not official government intelligence. All data sourced from open-access repositories: ACLED, NASA FIRMS, GDELT, UNHCR, EIA, SIPRI, IISS, AMTI, WHO, and live RSS feeds. No liability for decisions made based on this information.

---

## 1. Why This Dashboard Exists

Try, today, to understand what is happening in the Middle East, across ASEAN, and inside Thailand simultaneously. You will open a dozen browser tabs — Reuters, Al Jazeera, Bangkok Post, CSIS, ACLED's data portal, an EIA crude price chart, a UN humanitarian tracker — and you will still be guessing at how they connect.

The problem is not lack of data. The problem is **fragmentation and false equivalence**. A fire detection pixel over Rafah looks identical, in raw form, to one over a peat swamp in Sumatra. An ACLED violence event in Yala Province, Thailand, has the same data schema as a strike event in Gaza. Without context, without a framework that knows which theater it is reading, the data is noise.

GlobalWatch was built to solve that. It is a three-theater intelligence dashboard — Middle East, ASEAN/Indo-Pacific, Thailand — that applies the right analytical lens to each region while sharing a common data infrastructure. It draws from twelve live sources, updates every two to sixty minutes depending on feed velocity, and is designed to be read at a glance by someone who has thirty seconds before the next meeting.

There is a second reason it exists. Dr. Non and Dr. Poon's work on smart cities, urban performance, and human-centered design revealed a recurring gap: the tools that governments use to understand their own operating environment are either too expensive (Bloomberg Terminal, Jane's), too specialized (military-grade SIGINT), or too generic (news aggregators that treat a coup and a trade negotiation as equivalent "events"). The space between classified and uninformed is large. **GlobalWatch occupies that space.**

---

## 2. The Middle East Theater — War, Oil, and the Hormuz Chokepoint

### 2.1 The Conflict Structure

The Iran-Israel war that began on 28 February 2026 restructured the Middle East in a matter of weeks. What had been a system of proxies — Hezbollah in Lebanon, Houthi forces in Yemen, militias in Iraq — became a direct kinetic conflict between state militaries for the first time since the Iran-Iraq war of the 1980s.

The conflict has three primary axes:

| Axis | Parties | Status |
|------|---------|--------|
| Direct strike exchange | Iran ↔ Israel | Active — ballistic + drone volleys |
| Northern front | Hezbollah ↔ IDF | Degraded but persistent |
| Maritime / Red Sea | Houthis ↔ US-led coalition | Ongoing — shipping disruption |

As of June 2026, Iran has launched approximately 340 ballistic missiles and 520 drones. Israel's layered defense system — Iron Dome, David's Sling, Arrow-3, and US-deployed THAAD — has achieved a combined interception rate of approximately 79%. The 21% that penetrates has caused significant infrastructure damage in northern Israel and, in several instances, temporary closure of Ben Gurion Airport.

### 2.2 The Oil Dimension

The Hormuz Strait carries approximately 20% of global oil supply and 18% of global LNG. It is seventeen miles wide at its narrowest point and has no practical alternative routing for Persian Gulf exports. When Brent crude crosses $80/barrel — which it has done repeatedly since February 2026 — the oil market is pricing in a Hormuz risk premium.

GlobalWatch's Oil Crisis Header activates at $80 and escalates through four thresholds:

| Threshold | Level | Estimated Supply Disruption |
|-----------|-------|----------------------------|
| $80 | ELEVATED | ~5% |
| $100 | HIGH | ~12% |
| $150 | CRITICAL | ~20% |
| $200 | EXTREME | >25% |

These are not precise calculations. They are order-of-magnitude estimates for situational awareness — enough to know whether the market is pricing a skirmish or a blockade. For precision, see the EIA data portal.

### 2.3 The Nuclear Variable

Iran's nuclear program represents the conflict's most destabilizing unknown. Iran has enriched uranium to 84% purity at Fordow and Natanz — one step below weapons-grade. The IAEA has reported that Iran's breakout timeline (the time to produce enough fissile material for one weapon) has compressed from approximately twelve months in 2022 to an estimated weeks in 2026. This does not mean Iran has a weapon. It means the buffer between a nuclear decision and a nuclear capability has shrunk to the point where early warning matters more than ever.

GlobalWatch's Nuclear Tracker monitors declared enrichment sites, IAEA inspection status, and open-source satellite imagery indicators — with explicit sourcing for every data point. When a data point is missing or classification-restricted, the panel says so rather than substituting speculation.

### 2.4 The Sanctions Architecture

The sanctions environment around Iran is the most complex since Russia-2022. GlobalWatch's Sanctions Tracker monitors four dimensions:

1. **SWIFT exclusion** — Iran remains cut off from SWIFT since 2012; the question is whether secondary sanctions are enforced against workaround networks (Chinese yuan clearing, Iraqi transfer agents)
2. **Oil export pathway** — China absorbs approximately 80% of Iranian oil exports at a discount; this is the primary sanctions evasion mechanism
3. **Petrochemical shadow fleet** — Iranian tankers operate under multiple flags; vessel tracking feeds (via AIS) catch those that transpond; the dark fleet does not
4. **Individual designations** — OFAC/EU list updates tracked in real time

---

## 3. The ASEAN / Indo-Pacific Theater — The South China Sea and the Taiwan Variable

### 3.1 The Structural Competition

The Indo-Pacific theater is not a war. It is a structured competition between two visions of regional order — the US-led alliance system (with Japan, South Korea, Australia, Philippines, Taiwan as anchor partners) and China's assertive interpretation of its "core interests" in the South China Sea and across the Taiwan Strait.

Understanding this theater requires holding two ideas simultaneously:
- ASEAN economies are deeply integrated with China through trade, supply chains, and infrastructure investment
- Several ASEAN members have direct, unresolved territorial disputes with China in the South China Sea

This dual dependency is the fundamental tension. It is why ASEAN has not collectively condemned Chinese gray-zone operations. It is why the Philippines — which has the most active bilateral dispute with China in the Second Thomas Shoal — simultaneously receives US military assistance and depends on China for a significant share of its exports.

### 3.2 South China Sea — The Gray Zone Mechanics

Since 2014, China has constructed and militarized seven artificial islands in the Spratly chain. The three largest — Fiery Cross Reef, Subi Reef, and Mischief Reef — now have operational runways capable of handling bombers, fighter jets, and surveillance aircraft. They are, in effect, unsinkable aircraft carriers at the center of the most contested maritime waterway in the world.

The conflict mechanism is **gray zone pressure**: actions below the threshold of armed conflict designed to erode the operational position of rival claimants without triggering a US military response. The primary tools are:

- **China Coast Guard (CCG) vessels**: As of June 2026, 232 CCG vessels are active in the SCS. They conduct water cannon operations against Philippine resupply missions to BRP Sierra Madre at Second Thomas Shoal, and block access to fishing grounds near Scarborough Shoal.
- **Maritime militia**: Fishing fleets that loiter in disputed waters and, if needed, swarm rival vessels
- **Laser illumination and interference**: Directed energy attacks on Philippine and Vietnamese coast guard vessels

The 2016 Permanent Court of Arbitration ruling invalidated China's "nine-dash line" claim under UNCLOS. China does not recognize the ruling. This is the legal baseline against which every incident should be understood.

### 3.3 The Taiwan Strait — Quantifying Pressure

PLAAF incursions across Taiwan's Air Defense Identification Zone have been a reliable signal of political temperature since 2020. GlobalWatch tracks two metrics:

- **Weekly PLAAF crossing events**: aircraft crossing the median line or entering the ADIZ
- **Monthly median line incursions**: the sustained pressure signal, smoothed across the noise of single incidents

In June 2026, the weekly crossing rate stands at 14 events, with 23 median line incursions in the past 30 days. Two US carrier strike groups are operating in the Philippine Sea and South China Sea, the standard US posture for elevated-temperature periods.

The strategic question Taiwan poses is not purely military. It is economic. Taiwan Semiconductor Manufacturing Company (TSMC) produces approximately 90% of the world's most advanced semiconductors (below 5nm). A kinetic conflict over Taiwan would disrupt the global technology supply chain in a way that has no precedent and no substitute. This is why the Taiwan question occupies a different analytical category from the South China Sea territorial disputes: the stakes are systemic.

### 3.4 ASEAN Defense Posture

ASEAN's collective defense spending has increased steadily since 2020. Singapore maintains the most sophisticated military in Southeast Asia as a share of GDP (3.0%), with advanced F-35B purchases, submarine capability, and a highly professionalized force. Indonesia, Vietnam, and the Philippines are the fastest-growing defense budgets in the region, driven by SCS concerns.

No ASEAN state has a defense treaty with the United States equivalent to Japan's or South Korea's. The Philippines has the EDCA (Enhanced Defense Cooperation Agreement), which allows US forces to rotate through nine Philippine bases — including three in Cagayan Province, directly facing Taiwan — but does not obligate automatic US military response to a Philippines-China clash. This ambiguity is deliberate and structurally important.

---

## 4. The Thailand Theater — Digital Ambition, Political Fragility, and Two Active Conflicts

### 4.1 The Paradox of Thailand

Thailand sits at an unusual intersection. By the metrics of digital governance — number of smart cities (43 under the depa program), legislative ambition (PDPA, Cybersecurity Act, AI Governance Framework), and foreign direct investment in technology infrastructure ($3.8B in data center investment as of 2026) — it punches above its weight. By the metrics of political stability — three constitutions since 2014, two coups within living memory, a monarchy above public scrutiny — it carries structural fragility.

This paradox is the analytical key to Thailand. Smart city infrastructure being built on a foundation of institutions that can be reconfigured overnight by a military intervention is not the same as smart city infrastructure in a stable democracy. **The data is real. The institutional durability is the question.**

### 4.2 The Digital Economy Ambition

The Digital Economy and Society Act of 2017 created depa (Digital Economy Promotion Agency) as the executing body for Thailand's national digital transformation. Under the Smart City program, 43 cities have been designated across 7 domains: Environment, Economy, Mobility, Energy, Health, Governance, and People.

As of June 2026:
- 28 cities are operational (at least one domain live with real-time data integration)
- 10 are in pilot phase
- 5 are in planning

The Eastern Economic Corridor (EEC) — Thailand's primary investment zone, covering Chonburi, Rayong, and Chachoengsao provinces — has attracted $31.2B against a $44.8B target, a 69.6% achievement rate. The anchor investments are EV manufacturing (BYD, SAIC-MG, Foxconn), cloud infrastructure (AWS, Google Cloud), and aerospace (Airbus maintenance hub at U-Tapao).

The gap between target and actual investment is structurally important: it reflects investor uncertainty about Thailand's political trajectory more than deficiencies in the investment framework itself. When investors model Thailand's risk, they are pricing the probability of policy discontinuity — a future government reversing incentives, a coup that reshuffles ministry leadership, a constitutional court ruling that changes the electoral calculus.

### 4.3 The Southern Border Conflict — Thailand's Invisible War

The PATSOUTH insurgency in Pattani, Yala, Narathiwat, and parts of Songkhla has claimed approximately 7,400 lives and 22,000 incidents since 2004. It is one of the longest-running subnational conflicts in Southeast Asia. It receives almost no international coverage.

The conflict has three active factions: BRN (Barisan Revolusi Nasional), PULO (Pattani United Liberation Organization), and smaller splinter groups. Peace negotiations facilitated by Malaysia under OIC auspices have stalled repeatedly. The most recent process, initiated in 2013, effectively collapsed in 2025.

GlobalWatch tracks three operational metrics for the southern border:
- **Monthly incident count**: explosive devices, ambushes, targeted killings
- **Monthly casualties**: deaths and injuries, disaggregated by civilian/security force
- **Dialogue status**: whether any formal peace process is active

As of June 2026: 14 incidents, 4 deaths, 11 injuries in the current month. Dialogue is dormant.

The significance of this conflict for the dashboard is not purely humanitarian. The southern border insurgency diverts Royal Thai Army capacity, complicates border governance with Malaysia, and creates a persistent underclass of security-zone residents who experience Thailand's digital economy aspirations as entirely abstract.

### 4.4 The Myanmar Border — A Refugee and Security Emergency

Myanmar's civil war, intensifying since the February 2021 coup, has created a cascading refugee and border security crisis for Thailand. As of June 2026:

- Approximately 120,000 Myanmar refugees are in Thailand, primarily in nine UNHCR-registered camps in Mae Hong Son, Tak, and Kanchanaburi
- 8,600 additional border crossings were recorded in 2025, a fraction of the actual undocumented movement
- Thai-Myanmar trade has fallen 18% year-on-year, with $6.4B in bilateral trade now disrupted by conflict-related border closures and supply chain fragmentation
- Artillery and airstrikes by the Myanmar military have, on multiple occasions, crossed the Thai border — forcing temporary evacuations of Thai border communities

Thailand's official position is non-interference and humanitarian neutrality, but the scale of the crisis tests that position. The Royal Thai Army's Third Army region (headquartered in Phitsanulok) manages the border response. Their operational posture is containment, not engagement.

---

## 5. The Methodology — How GlobalWatch Sources Its Data

### 5.1 Live Data Sources

| Source | What It Provides | Update Frequency | Reliability |
|--------|-----------------|-----------------|-------------|
| ACLED (Armed Conflict Location & Event Data) | Geo-coded conflict events, fatalities, actor attribution | 24–72 hours | High — researcher-coded |
| NASA FIRMS | Thermal anomalies (fires, strikes, industrial heat) | ~4 hours | High for detection, low for attribution |
| GDELT | Global media sentiment, event coding from news | Near-real-time | Medium — ML-coded, noisy |
| UNHCR | Refugee population figures by country/operation | Monthly | High — official figures |
| EIA (US Energy Info Administration) | Crude oil prices, production, inventory | Daily | High — official US government |
| Yahoo Finance / Market APIs | Equity indices, commodities, FX | Real-time (15-min delay) | High |
| NGA Maritime Safety | Navigational warnings, shipping advisories | Continuous | High — official US Navy |
| USGS / EMSC | Seismic events | Minutes after event | High |
| OpenSky Network / AIS | Live aircraft and vessel positions | Near-real-time | Medium (coverage gaps) |
| RSS Feeds (Reuters, AFP, Al Jazeera, Bangkok Post, etc.) | Regional news, editorial context | Minutes | Medium — editorial, not verified |
| Copernicus (ESA) | Satellite imagery, environmental monitoring | 1–5 days | High |
| RainViewer | Precipitation radar | 10 minutes | High |

### 5.2 The Cache Architecture

All data passes through a server-side cache with per-source TTLs (time-to-live). The cache serves two functions:

1. **Performance**: Prevents hammering upstream APIs. Most sources have rate limits; the cache absorbs repeated frontend requests.
2. **Resilience**: When an upstream source goes offline, the cache serves the last known good data with a "stale" indicator. The dashboard never displays a blank panel — it always shows either live data, stale data with a timestamp, or an explicit error state.

Since June 2026, GlobalWatch has also operated a local SQLite database that persists all fetched payloads across server restarts. This means that even if the server is restarted mid-night, the cache is repopulated from the last-known-good snapshots within seconds of startup — no cold-start stalls for morning viewers.

### 5.3 The AI Layer

Briefing summaries in the Intelligence Panel are generated by Gemini 2.0 Flash, applied to the top 8 news items for each briefing topic (Iran War, ASEAN Diplomacy, South China Sea, Myanmar Conflict, Thai Security, etc.). The AI layer is used exclusively for synthesis, not for origination — it reads the actual headlines and produces a two-to-three sentence situational overview. When the AI layer is unavailable (quota exhaustion, API error), the panel falls back to a keyword-count summary that communicates the same signal without prose.

Every AI-generated summary is labeled `AI-POWERED` in the interface. Every data point has an explicit source citation. The distinction between live data, curated data, and AI synthesis is always visible.

---

## 5b. FloodOps — From Situational Awareness to Operational Decision

The Thailand theater carries a capability the other two do not: a live flood-operations
module built directly on the Hydro-Informatics Institute (HII) national telemetry network,
the same open dataset recognized by Thailand's national open-data award. This is the point
where GlobalWatch stops being a monitoring screen and becomes a decision instrument for a
specific human being — a municipal mayor deciding, tonight, where to send pumps and people.

### The data spine

Two HII / ThaiWater feeds anchor the module, both public and unauthenticated
(`api-v3.thaiwater.net`), both on a 10-minute national cadence:

- **`waterlevel_load`** — ~775 telemetry gauges reporting water level in metres MSL,
  percentage of channel capacity, discharge in m³/s, and a 1–5 situation level.
- **`rain_24h`** — ~4,300 rain gauges reporting 1-hour and 24-hour accumulation, each
  tagged with a real province geocode.

On top of the raw telemetry we encode the **physical Chao Phraya river network** — the Ping,
Wang, Yom, and Nan headwaters converging at Nakhon Sawan (station C.2), through the Chao
Phraya Dam (C.13) and down past Sing Buri (C.3) to Ayutthaya (C.35) and on to Bangkok — with
reach travel times drawn from Royal Irrigation Department flood-routing practice for the 2011
and 2021–22 events. A flood wave in these reaches moves at roughly 1–2 m/s; the travel times
are honest ±30% operational approximations, and the interface says so.

### What the mayor sees

The **Water Inbound** panel answers three questions in one glance: *how much water is coming,
from where, and when it arrives.* The city's own gauge shows percent-of-bank and an
instantaneous rate-of-rise in cm/hour (the 10-minute delta). Below it, the upstream cascade
lists each contributing station — its discharge, its situation level, and its estimated
time-of-arrival at the city — sorted soonest-first. Basin rain loading is aggregated by real
province sets, so "146 mm across the Nan basin, 99 stations over the 35 mm heavy-rain
threshold" is a statement about specific administrative geography, not a national average.

On the map, the same telemetry renders as gauge dots on the severity ramp and as **animated
flow corridors** — dashed lines with directional arrowheads that crawl downstream, making the
direction and volume of water legible without reading a number. Corridor width scales with
live discharge; color escalates to brick-red where an upstream gauge crosses situation level 4.

### God's Mode — planning against the terrain

The final layer is a simulation sandbox we call God's Mode. It decodes real SRTM elevation
(Terrarium tiles, ~19 m/pixel, proxied through our server for CORS) into an elevation grid
around the city, then runs a **connected-bathtub inundation model**: water spreads from the
river channel across every contiguous cell whose ground sits below a simulated water surface.
The surface is driven by a stage slider — from a monsoon pulse (+0.5 m) to a 2011-scale event
(+3.5 m) — applied relative to the river's own SRTM surface so the model is datum-safe against
any offset between the gauge and the elevation model. Isolated high ground stays dry; the flat
delta floods as a connected sheet, exactly as it does in reality.

The output is operational, not academic: inundated area in km², which named critical sites go
underwater and to what depth (hospital, city hall, markets, rail station — each sampled at its
real coordinate), and a ranked **operational directive** — activate the EOC, pre-position
pumps at the lowest-elevation districts first, coordinate dam release with RID before it
exceeds downstream channel capacity, decide evacuation staging within a deadline set by the
nearest rising gauge. The directive is written by an LLM when available and falls back to a
deterministic rule-based plan when it is not, so the button always produces an actionable
order. This is honest first-order screening physics — the interface never claims to be a
hydrodynamic model — but the terrain is real, the gauge is real, the geography is real, and
the decision it supports is real.

---

## 6. How to Read GlobalWatch

### The Three-Panel Structure

Each theater view has the same column structure, adapted to its region:

**Left column — Map and situational awareness**
The main map shows ACLED conflict events, NASA FIRMS thermal hotspots, active aircraft (OpenSky), vessels (AIS), and optional satellite/environmental overlays. The map is the geographic ground truth. When a briefing says "strikes in the northern region," the map shows where.

**Center column — Intelligence and news**
Intelligence briefings (AI-synthesized from live feeds), regional news panels, and country-specific news for selected map markers. This is the editorial layer — what journalists and analysts are saying about the events the map is showing.

**Right column — Analytics and status boards**
Theater-specific status panels — the Iran War Theater board for Middle East, the Indo-Pacific Theater / South China Sea panel for ASEAN, the Thailand Status panel for Thailand — give quantified situational awareness: incident counts, interception rates, PLAAF crossing frequencies, smart city KPIs. This is the data layer that transforms "something is happening" into "here is the magnitude."

**Bottom bar — Economic and domain-specific context**
Market Radar (theater-adjusted indices and commodities), Oil Price Chart and Hormuz Tracker for Middle East, Maritime Warnings for ASEAN, Sentiment Chart (GDELT-derived media polarity), and Seismic Activity for earthquake-prone regions.

### Reading Across Theaters

The three-theater structure is not a hierarchy. The Middle East, ASEAN, and Thailand views are parallel lenses on different parts of the same world. Events that appear on one view may have consequences on another:

- A Hormuz disruption that spikes oil prices → appears as an Oil Crisis Header on Middle East, and as commodity price movement on ASEAN's Market Radar
- A Myanmar offensive that pushes refugees toward Thailand → appears as a conflict event on ASEAN's ACLED feed, and as a border incident count on Thailand's Myanmar tracker
- A PLAAF exercise near Taiwan → appears in ASEAN's Taiwan Strait crossing count, and indirectly in global equity market volatility visible on all three Market Radars

The dashboard does not draw these connections automatically. That synthesis is the analyst's job. GlobalWatch provides the data in the same room at the same time. The interpretation is human.

---

## 7. Legal Notice and Disclaimer

**Intellectual Property**: All original analysis, design, and system architecture in this document and the GlobalWatch dashboard are the intellectual property of Dr. Non Arkaraprasertkul and Associate Professor Dr. Poon Thiengburanathum. All rights reserved.

**Data Sources**: All data displayed in GlobalWatch is sourced from publicly available open-source repositories (OSINT). This is not official government intelligence. It is not classified. It does not reflect the views of any government agency, including the Thailand Ministry of Digital Economy and Society (MDES) or the Digital Economy Promotion Agency (depa), notwithstanding their sponsorship of related research.

**No Investment or Policy Advice**: Nothing in this dashboard or document constitutes investment advice, policy advice, or a recommendation to take any specific action. Data is provided for situational awareness only. No liability is accepted for decisions made based on information displayed.

**No Unauthorized Use**: Reproduction, redistribution, reverse engineering, or bad-faith use of this system, its design, its data structures, or its analysis framework without explicit written permission from the copyright holders is prohibited and may be subject to legal action under applicable intellectual property laws.

**Funded by**: PMU-A (Primary Research Management Unit A, Thailand) with supporting organizations including depa and MDES.

**Executed by**: Axiom and The Reason to Live Company (ReTL).

---

_GlobalWatch v8 · June 2026 · globalmonitor.nonarkara.org_
