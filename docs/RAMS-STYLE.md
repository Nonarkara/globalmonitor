# Rams Operating System — Design Style Guide

A reusable, Dieter-Rams-inspired visual system for dashboards, data tools, statements, and dense interfaces. Built around one idea: **less, but better.** Show the fewest instruments needed to fly the plane — every element earns its place, nothing decorates.

Ten principles, applied: honest, ordered, unobtrusive, as little design as possible. No gradients, no shadows, no rounded corners, no emoji, no AI-slop containers. Function first; the grid does the work.

---

## 1. Color

Restrained, warm-neutral, near-monochrome. **One** signal color (Braun green). Red exists only as data (losses), never as decoration.

```
--paper    #faf9f7   page background (warm off-white)
--panel    #ffffff   cards / cells
--ink      #191712   primary text, bars, active states (warm near-black)
--ink-2    #6f6c63   secondary text
--ink-3    #a9a59a   tertiary / labels / meta
--line     #e7e5dd   hairlines, grid gaps
--line-2   #d2cfc5   stronger borders, section dividers
--green    #1f6e43   THE accent — positive, live, active, primary action
--red      #a23a26   negative only (losses, down moves) — muted brick
```

**Neutral fills for stacked bars / categories** (when you need 3–5 greys between ink and line):
`var(--ink)` → `var(--green)` → `#8f8b80` → `#bdb9ad` → `#d8d4ca`

**Rules**
- Default text is ink. Demote, don't colorize: hierarchy comes from `--ink-2`/`--ink-3` and size, not hue.
- Green = up / live / the one primary button. Red = down. That's the entire color vocabulary.
- Selection: `::selection { background: var(--green); color: #fff; }`
- Never introduce a new hue. If you think you need one, you need a grey or a weight change instead.

---

## 2. Typography

Classic Braun grotesque. Tabular figures everywhere so numbers align in columns.

```css
font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
font-variant-numeric: tabular-nums;
-webkit-font-smoothing: antialiased;
```

**Type scale** (px) — pick from this set, don't improvise:

| Use | Size | Weight | Tracking |
|---|---|---|---|
| Hero number / page metric | 30–38 | 600 | -0.01em |
| Section metric / big value | 19–24 | 600 | normal |
| Stat value (cell) | 15–20 | 600 | normal |
| Body / row value | 12–14 | 500–600 | normal |
| **Section header (label)** | 11 | 700 | **0.16em**, UPPERCASE |
| Nav / control | 10–11 | 600 | 0.11em, UPPERCASE |
| **Micro-label / meta** | 9 | 600 | **0.14em**, UPPERCASE, `--ink-3` |

**Rules**
- Labels are SMALL + LETTERSPACED + UPPERCASE. The smaller the text, the wider the tracking.
- Big numbers carry weight 600 max — never 700/800. Restraint reads as confidence.
- One number, one label. Don't stack adjectives or redundant units.

---

## 3. Grid & Layout

Strict modular grid. Content lives in a centered column; clusters of instruments sit in hairline-separated cells.

```
Container:  max-width: 1360px; margin: 0 auto; padding: 22px;
Gutter:     22–24px between sections
Section gap: margin-bottom: 22–24px
```

**The signature move — hairline cell grids.** A grid whose *background* is the line color, with 1px gaps and white cells, renders a precise instrument panel for free:

```html
<div style="display:grid; grid-template-columns:repeat(4,1fr);
            gap:1px; background:var(--line); border:1px solid var(--line);">
  <div style="background:var(--panel); padding:13px 16px;"> …cell… </div>
  <!-- repeat -->
</div>
```

Use it for: vitals strips, stat blocks, sector tiles, world boards, earnings cells.

**Cockpit pattern (dashboards).** Keep the critical instruments always visible:

```html
<div style="position:sticky; top:0; z-index:50;
            background:var(--paper); border-bottom:1px solid var(--line-2);">
  <!-- masthead · nav · vitals strip -->
</div>
```

Everything else scrolls beneath. The pilot never loses the primary flight display.

---

## 4. Components

### Section header
The workhorse. A 700/0.16em label over a 1px ink rule; optional right-aligned meta or action.

```html
<div style="display:flex; align-items:baseline; justify-content:space-between;
            border-bottom:1px solid var(--ink); padding-bottom:7px; margin-bottom:14px;">
  <div style="font-size:11px; letter-spacing:0.16em; font-weight:700;">PULSE · LIVE</div>
  <div style="font-size:10px; letter-spacing:0.1em; color:var(--ink-3); font-weight:600;">ALL MARKETS →</div>
</div>
```
Heavier divider = `border-bottom:1px solid var(--ink)`. Lighter row rule = `var(--line)`.

### Stat cell
```html
<div style="background:var(--panel); padding:13px 16px;">
  <div style="font-size:9px; letter-spacing:0.12em; color:var(--ink-3); font-weight:600;">VALUE</div>
  <div style="font-size:20px; font-weight:600; margin-top:4px;">฿4,032,144</div>
  <div style="font-size:10px; color:var(--ink-3); margin-top:1px;">as 2026-05-16</div>
</div>
```

### Data row (label · value · delta)
```html
<div style="display:flex; align-items:baseline; justify-content:space-between;
            padding:6px 0; border-bottom:1px solid var(--line);">
  <span style="font-size:12px; font-weight:500;">SET Index</span>
  <span style="display:flex; align-items:baseline; gap:10px;">
    <span style="font-size:12px; font-weight:600;">1,579</span>
    <span style="font-size:11px; font-weight:600; color:var(--red); width:54px; text-align:right;">−0.39%</span>
  </span>
</div>
```
Fixed-width delta column keeps signs aligned. Up → `--green`, down → `--red`, neutral → `--ink-3`.

### Bar (progress / weight / factor)
Flat track + solid fill. No radius, no gradient.
```html
<div style="height:6px; background:var(--line); position:relative;">
  <div style="position:absolute; inset:0 auto 0 0; width:69%; background:var(--ink);"></div>
</div>
```

### Stacked allocation bar
```html
<div style="display:flex; height:8px; border:1px solid var(--line);">
  <div style="width:38%; background:var(--ink);"></div>
  <div style="width:27%; background:var(--green);"></div>
  <div style="width:15%; background:#8f8b80;"></div>
</div>
```

### Status banner
Black tag block + body + right-aligned readout, hairline border.
```html
<div style="display:flex; align-items:stretch; border:1px solid var(--line-2); background:var(--panel);">
  <div style="background:var(--ink); color:var(--paper); padding:14px 20px; display:flex; align-items:center;">
    <span style="font-size:11px; letter-spacing:0.18em; font-weight:700;">MANIC</span>
  </div>
  <div style="padding:11px 20px; flex:1;">…headline + sub…</div>
</div>
```

### Buttons
- **Primary:** `background:var(--green); color:#fff;` — or `background:var(--ink)` for neutral-primary. Padding `10–14px 18–22px`, font 11–12px / 0.12em / 700, no radius. `style-hover: opacity:0.9`.
- **Tertiary / link:** transparent, `color:var(--ink-2)`, hover → `var(--green)`.

### Nav tab (active state)
Underline, not a pill.
```
active:   color:var(--ink);   border-bottom:2px solid var(--ink);
inactive: color:var(--ink-2); border-bottom:2px solid transparent;
```

### Live dot
```html
<span style="width:6px; height:6px; border-radius:50%; background:var(--green);
             display:inline-block; animation:blink 2.4s ease-in-out infinite;"></span>
```
```css
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
```

### Braun analog clock (optional signature flourish)
A black ring, two ink hands, one green second hand, a center dot — the Rams wall-clock motif. Use sparingly for world-time / status.

---

## 5. Inputs

```html
<input type="range" style="width:100%; accent-color:var(--green); height:3px;" />
```
Text fields: `border:1px solid var(--line-2); padding:11px 13px;` — flat, square, no focus glow beyond a border darken.

---

## 6. Density rules

- **Keep the data, bring the order.** Density isn't the enemy; disorder is. Group dense data into hairline cell grids and label every cluster.
- Right-align numbers, left-align labels.
- Fixed-width delta/figure columns so columns line up down the page.
- A faint meta line under data (`9–10px --ink-3`) carries provenance/date/caveats — honesty over polish.

---

## 7. Don't

- ❌ Gradients, drop shadows, glows, blur.
- ❌ Rounded corners (0px; 2px max only if unavoidable).
- ❌ A second accent color. One signal color, plus red-for-loss.
- ❌ Emoji, decorative icons, illustration.
- ❌ Centering dense content. Left-align; let the grid hold it.
- ❌ Bold-everything. Hierarchy = size + grey, not weight.
- ❌ Inventing values outside the type scale / token set.

---

## 8. Quick-start tokens

Drop on a wrapper element and use `var(--…)` inline throughout:

```html
<div style="--paper:#faf9f7; --panel:#fff; --ink:#191712; --ink-2:#6f6c63;
            --ink-3:#a9a59a; --line:#e7e5dd; --line-2:#d2cfc5;
            --green:#1f6e43; --red:#a23a26;
            background:var(--paper); color:var(--ink);
            font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
            font-variant-numeric:tabular-nums; font-size:13px; line-height:1.42;
            -webkit-font-smoothing:antialiased;">
  …
</div>
```

> Reference implementation: `DayTraders.dc.html` — a 12-screen financial cockpit built entirely on this system.
