# Remote Command — Visual Redesign Phase 1+2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Tactical Command" visual redesign (Phases 1 + 2 from the spec) as a single ~1-week release covering ~85% of the perceived visual upgrade with zero game-logic risk.

**Architecture:** Presentation-layer rewrite. New `site/styles/*.css` modules introduce a design-token system and surface-specific styles; `site/styles.css` is reduced to glue and tokenized. A new title-screen surface mounts before `#game-container`. Phase 2 adds canvas overlays (DOM elements positioned over the canvas) and restyles select canvas draw routines (`tank label`, `trajectory`, `damage popup`). No changes to game logic, save format, physics, AI, or audio.

**Tech Stack:** Vite 7 build, vanilla JS, HTML5 canvas, CSS custom properties, `@fontsource` self-hosted WOFF2 fonts (Saira Condensed, JetBrains Mono), existing PixiJS overlay untouched, existing Playwright smoke suite.

**Spec reference:** `docs/superpowers/specs/2026-05-19-game-redesign-design.md`

**Brainstorm mockups (local-only, gitignored):** `.superpowers/brainstorm/3047312-1779231895/content/01-tokens.html` … `05-canvas.html`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `site/styles/tokens.css` | Design-token CSS custom properties on `:root` (colors, fonts, radii, glows, grid overlay). |
| `site/styles/typography.css` | `@font-face` declarations + role classes (`.t-display`, `.t-mono`, `.t-micro`). |
| `site/styles/hud.css` | Bottom controls bar, edge tabs, weapon menu, mobile dial/joystick/fire. |
| `site/styles/title-screen.css` | Title-screen surface, boot terminal, menu, ambient sweep. |
| `site/styles/modals.css` | Shared modal chrome + per-modal variants (Briefing, Engagement Report, Volume, etc.). |
| `site/styles/canvas-overlays.css` | Diegetic corner readouts + scan-grid overlay container. |
| `site/js/title-screen.js` | Title-screen show/hide, boot animation, menu key handlers, restore-session hook. |
| `site/js/canvas-overlays.js` | Manages corner readouts + scan-grid DOM elements; updates per-frame. |

### Modified files

| Path | Why |
|---|---|
| `site/index.html` | Title-screen markup, restructured HUD/modal markup, new stylesheet imports, font-display imports. |
| `site/styles.css` | Replace literal color/font values with `var(--...)`; reduce to glue. |
| `site/js/main.js` | Wire title-screen menu actions, weapon-menu tile renderer, callsign rotation. |
| `site/js/game.js` | Canvas tank-label tag rendering (Phase 2), trajectory restyle (Phase 2), impact-reticle draw (Phase 2). |
| `site/js/projectile.js` | Damage popup emission on hit (Phase 2). |
| `site/package.json` | Add `@fontsource/saira-condensed`, `@fontsource/jetbrains-mono` deps. |

### Untouched

`site/help.html`, `site/worker/index.js`, `site/wrangler.jsonc`, `site/dist/_headers` (CSP `font-src 'self' data:` already permits self-hosted fonts), `.github/workflows/`, `site/public/sitemap-*.xml`.

---

## Conventions used in this plan

- **TDD note:** This project has no unit tests — only one Playwright smoke (`site/tests/smoke/gameplay.smoke.spec.js`). For each task the "test" step is one of: (a) extend the smoke spec with a new selector assertion, (b) re-run the smoke and confirm it passes, or (c) visual verification with `npm run dev` + screenshot. Where a task adds a new player-visible element, add a smoke assertion.
- **Build verification** after every task: `cd site && npm run build` must succeed.
- **Commit cadence:** one commit per task. Use the suggested message template.
- **Branch:** work on `main` (or a feature branch — repo is single-developer).
- **Don't break** existing localStorage save format (`__SE_GAME__.save`), the existing `globalThis.__SE_GAME__` accessor, mobile touch behavior, or the sr-only `<h1>` accessibility hook.
- **DOM safety:** never use `innerHTML` with values that flow from game state or user input. Use `textContent` for text and `document.createElement` + `appendChild` for nested structure. The plan's JS snippets follow this rule.

---

## Tasks

### Task 1: Set up `site/styles/tokens.css`

**Files:**
- Create: `site/styles/tokens.css`
- Modify: `site/index.html` (add `<link rel="stylesheet" href="/styles/tokens.css" />` immediately before the existing `/styles.css` link)

- [ ] **Step 1: Create `site/styles/tokens.css`**

```css
/* site/styles/tokens.css — Tactical Command design tokens */

:root {
  /* Surfaces */
  --surface-ink: #0a0f08;
  --surface-panel: #0d1410;
  --surface-raised: #142018;
  --surface-deep: #050a06;

  /* Accents */
  --accent-phosphor: #50dc82;
  --accent-amber: #ffb000;
  --accent-hot: #ff5544;
  --accent-signal: #4d9fff;

  /* Text */
  --text-primary: #e8f5ec;
  --text-body: #c5d2c8;
  --text-muted: #9fc4a8;
  --text-dim: #5a7a64;

  /* Lines */
  --border-line: 1px solid #1a2a1c;
  --border-phosphor: 1px solid var(--accent-phosphor);
  --border-hot: 1px solid var(--accent-hot);

  /* Typography */
  --font-display: 'Saira Condensed', 'Oswald', system-ui, sans-serif;
  --font-body: ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Radii */
  --radius-sharp: 2px;
  --radius-soft: 6px;

  /* FX */
  --glow-phosphor: 0 0 12px rgba(80, 220, 130, 0.4);
  --glow-hot: 0 0 16px rgba(255, 85, 68, 0.5);
  --glow-signal: 0 0 12px rgba(77, 159, 255, 0.4);

  /* Grid overlay */
  --grid-color: rgba(80, 220, 130, 0.06);
  --grid-size: 24px;
}
```

- [ ] **Step 2: Reference tokens.css in `site/index.html`**

In `site/index.html`, add this line immediately before the existing `<link rel="stylesheet" href="/styles.css" />`:

```html
<link rel="stylesheet" href="/styles/tokens.css" />
```

- [ ] **Step 3: Build and verify**

Run: `cd site && npm run build`
Expected: build succeeds; `dist/styles/tokens.css` exists; `dist/index.html` references it.

- [ ] **Step 4: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes (no behavior change yet).

- [ ] **Step 5: Commit**

```bash
git add site/styles/tokens.css site/index.html
git commit -m "redesign: add tokens.css with Tactical Command design tokens"
```

---

### Task 2: Self-host fonts via `@fontsource`

**Files:**
- Modify: `site/package.json` (add deps)
- Create: `site/styles/typography.css`
- Modify: `site/index.html` (load typography.css)

- [ ] **Step 1: Install font packages**

Run:
```bash
cd site && npm install --save @fontsource/saira-condensed @fontsource/jetbrains-mono
```

Expected: both packages added under `dependencies` in `package.json`.

- [ ] **Step 2: Create `site/styles/typography.css`**

```css
/* site/styles/typography.css — Self-hosted font faces + role classes */

/* @fontsource provides WOFF2 files; we import the specific weights we need. */
@import url('@fontsource/saira-condensed/600.css');
@import url('@fontsource/saira-condensed/700.css');
@import url('@fontsource/jetbrains-mono/400.css');
@import url('@fontsource/jetbrains-mono/500.css');

/* Role classes for explicit-use surfaces */
.t-display {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 1px;
}
.t-heading {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0.5px;
}
.t-body {
  font-family: var(--font-body);
  font-weight: 400;
}
.t-mono {
  font-family: var(--font-mono);
  font-weight: 500;
  font-feature-settings: 'tnum' 1;
}
.t-micro {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent-phosphor);
}
```

- [ ] **Step 3: Reference typography.css in `site/index.html`**

Add immediately after the `tokens.css` link:

```html
<link rel="stylesheet" href="/styles/typography.css" />
```

- [ ] **Step 4: Build and verify font loading**

Run: `cd site && npm run build`
Expected: build succeeds; `dist/assets/` contains WOFF2 font files (from `@fontsource` resolved through Vite); `dist/index.html` references the typography stylesheet.

Run: `cd site && npm run dev`, open `http://localhost:5600/`, open browser dev tools → Network tab → filter "font" → confirm 4 WOFF2 files load with `200` status from the local origin (not Google Fonts).

- [ ] **Step 5: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add site/package.json site/package-lock.json site/styles/typography.css site/index.html
git commit -m "redesign: self-host Saira Condensed + JetBrains Mono via @fontsource"
```

---

### Task 3: Migrate `site/styles.css` literals to tokens

**Files:**
- Modify: `site/styles.css`

Replace every hard-coded color and font reference in `site/styles.css` with token vars. This is a mechanical pass — don't change layout or behavior yet.

- [ ] **Step 1: Scan for color literals**

Run: `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' site/styles.css | wc -l` to get a count. Replace each match with the closest token. Common substitutions:

| Was | Becomes |
|---|---|
| `#0a0e27`, `#1a1a2e`, `#16213e` | `var(--surface-ink)` (and remove the gradient — flat color now) |
| `rgba(10, 14, 39, 0.75)` | `rgba(13, 20, 16, 0.92)` or `var(--surface-panel)` depending on context |
| `#00f5ff` (cyan) | `var(--accent-phosphor)` |
| `#ff4d4d` (red FIRE) | `var(--accent-hot)` |
| `#e4e4e4` (body) | `var(--text-body)` |
| `#a0a0a0` (label) | `var(--text-muted)` |
| `'Segoe UI', Tahoma, ...` | `var(--font-body)` |

- [ ] **Step 2: Change page background**

Replace:
```css
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%);
    color: #e4e4e4;
    overflow: hidden;
}
```
With:
```css
body {
    font-family: var(--font-body);
    background: var(--surface-ink);
    color: var(--text-body);
    overflow: hidden;
}
```

- [ ] **Step 3: Build and visually verify nothing regressed**

Run: `cd site && npm run build && npm run dev`
Open `http://localhost:5600/`. Confirm the page renders. UI will look transitional (still old layout, but new colors). That's expected.

- [ ] **Step 4: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add site/styles.css
git commit -m "redesign: migrate styles.css literals to design tokens"
```

---

### Task 4: Restyle the bottom controls bar (`#bottom-controls`)

**Files:**
- Create: `site/styles/hud.css`
- Modify: `site/index.html` (load hud.css)
- Modify: `site/styles.css` (remove the now-superseded `#bottom-controls` rules; let `hud.css` own them)

- [ ] **Step 1: Create `site/styles/hud.css` with the bottom-controls bar treatment**

```css
/* site/styles/hud.css — Tactical Command HUD chrome */

/* ===== Bottom controls bar ===== */
#bottom-controls.controls-bar {
  position: fixed;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: grid;
  grid-template-columns: auto minmax(180px, 1.1fr) minmax(180px, 1.1fr) auto auto auto;
  gap: 10px;
  background: transparent;
  border: 0;
  padding: 0;
  pointer-events: auto;
  z-index: 1050;
  align-items: stretch;
}

/* Modules */
#bottom-controls .stats-group,
#bottom-controls .angle-slider-wrap,
#bottom-controls .power-slider-wrap,
#bottom-controls .weapon-chooser {
  background: var(--surface-panel);
  border: var(--border-line);
  border-radius: var(--radius-sharp);
  padding: 6px 10px;
  position: relative;
}

/* Corner-bracket marker on "live combat state" panels */
#bottom-controls .stats-group::before,
#bottom-controls .stats-group::after,
#bottom-controls .weapon-chooser::before,
#bottom-controls .weapon-chooser::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: var(--accent-phosphor);
  border-style: solid;
}
#bottom-controls .stats-group::before { top: -1px; left: -1px; border-width: 1px 0 0 1px; }
#bottom-controls .stats-group::after  { bottom: -1px; right: -1px; border-width: 0 1px 1px 0; }
#bottom-controls .weapon-chooser::before { top: -1px; left: -1px; border-width: 1px 0 0 1px; }
#bottom-controls .weapon-chooser::after  { bottom: -1px; right: -1px; border-width: 0 1px 1px 0; }

/* Stats group (HP / FUEL / WIND) */
#bottom-controls .stats-group {
  display: flex;
  gap: 14px;
  align-items: center;
}
#bottom-controls .stats-group .stat {
  display: flex;
  flex-direction: column;
  font-family: var(--font-mono);
  font-feature-settings: 'tnum' 1;
}
#bottom-controls .stats-group .icon { display: none; } /* hide emoji icons */
#bottom-controls .stats-group .stat::before {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 2px;
  color: var(--accent-phosphor);
  opacity: 0.6;
  line-height: 1;
}
#bottom-controls .stats-group .health-stat::before { content: 'HP'; }
#bottom-controls .stats-group .fuel-stat::before { content: 'FUEL'; }
#bottom-controls .stats-group .wind-stat::before { content: 'WIND'; }
#bottom-controls .stats-group #player-health,
#bottom-controls .stats-group #fuel-value,
#bottom-controls .stats-group #wind-value {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 1px;
  margin-top: 2px;
  line-height: 1;
}
#bottom-controls .stats-group .wind-stat #wind-value { color: var(--accent-amber); }

/* Sliders (angle + power) */
#bottom-controls .angle-slider-wrap,
#bottom-controls .power-slider-wrap {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
#bottom-controls .angle-slider-wrap .label,
#bottom-controls .power-slider-wrap .label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--accent-phosphor);
  margin-right: 0;
  display: flex;
  justify-content: space-between;
}
#bottom-controls .angle-slider-wrap #angle-value,
#bottom-controls .power-slider-wrap #power-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  letter-spacing: 1px;
}

/* Restyle range input — webkit + firefox */
#bottom-controls input[type="range"] {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  height: 18px;
  width: 100%;
  cursor: pointer;
}
#bottom-controls input[type="range"]::-webkit-slider-runnable-track {
  height: 12px;
  background: var(--surface-deep);
  border: var(--border-line);
  border-radius: 0;
  background-image:
    linear-gradient(90deg, transparent calc(25% - 1px), rgba(80, 220, 130, 0.2) 25%, rgba(80, 220, 130, 0.2) calc(25% + 1px), transparent calc(25% + 1px)),
    linear-gradient(90deg, transparent calc(50% - 1px), rgba(80, 220, 130, 0.2) 50%, rgba(80, 220, 130, 0.2) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(90deg, transparent calc(75% - 1px), rgba(80, 220, 130, 0.2) 75%, rgba(80, 220, 130, 0.2) calc(75% + 1px), transparent calc(75% + 1px));
}
#bottom-controls input[type="range"]::-moz-range-track {
  height: 12px;
  background: var(--surface-deep);
  border: var(--border-line);
}
#bottom-controls input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 3px;
  height: 18px;
  background: var(--accent-phosphor);
  border: 0;
  border-radius: 0;
  box-shadow: var(--glow-phosphor);
  margin-top: -3px;
}
#bottom-controls input[type="range"]::-moz-range-thumb {
  width: 3px;
  height: 18px;
  background: var(--accent-phosphor);
  border: 0;
  border-radius: 0;
  box-shadow: var(--glow-phosphor);
}

/* Drive button */
#bottom-controls #drive-toggle.secondary {
  background: var(--surface-panel);
  border: var(--border-line);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: var(--radius-sharp);
}
#bottom-controls #drive-toggle.secondary[aria-pressed="true"],
#bottom-controls #drive-toggle.secondary.active {
  border-color: var(--accent-signal);
  color: var(--accent-signal);
  box-shadow: var(--glow-signal);
}

/* Weapon picker trigger */
#bottom-controls .weapon-chooser {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
#bottom-controls #weapon-grid-toggle.weapon-grid-toggle {
  background: transparent;
  border: 0;
  color: var(--text-primary);
  padding: 4px 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 1px;
}
#bottom-controls #weapon-grid-toggle .weapon-current-icon { font-size: 16px; color: var(--accent-phosphor); }
#bottom-controls #weapon-grid-toggle .weapon-current-name { text-transform: uppercase; }
#bottom-controls #weapon-grid-toggle .caret { color: var(--accent-phosphor); }
#bottom-controls #ammo-badge.ammo-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 1px;
  background: transparent;
  border: 0;
}

/* FIRE button — the climax */
#bottom-controls #fire-button.primary {
  background: var(--accent-hot);
  border: var(--border-hot);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 4px;
  padding: 8px 22px;
  border-radius: var(--radius-sharp);
  box-shadow: var(--glow-hot), inset 0 0 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  position: relative;
}
#bottom-controls #fire-button.primary::before {
  content: '▶';
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
}
#bottom-controls #fire-button.primary:hover { filter: brightness(1.1); }
#bottom-controls #fire-button.primary:active { transform: translateY(1px); }
```

- [ ] **Step 2: Reference `hud.css` in `site/index.html`**

After `typography.css`:

```html
<link rel="stylesheet" href="/styles/hud.css" />
```

- [ ] **Step 3: Remove superseded rules from `site/styles.css`**

Delete or comment-out the existing rules for `#bottom-controls.controls-bar`, `#bottom-controls .primary`, `#bottom-controls .secondary`, `#bottom-controls .label`, `.weapon-chooser select`, `.weapon-grid-toggle`, and any other `#bottom-controls`-prefixed selectors that conflict. Use grep to find them: `grep -n '^#bottom-controls\|^\.weapon-chooser\|^\.weapon-grid-toggle' site/styles.css`.

- [ ] **Step 4: Build and visually verify**

Run: `cd site && npm run dev`
Open `http://localhost:5600/`, start a Classic game (or use existing save). Confirm:
- Bottom controls bar has dark panels with thin hairlines
- Stats module shows "HP", "FUEL", "WIND" mono labels (no emoji icons)
- Sliders have tactical track + phosphor glowing thumb
- FIRE button is hot-red with white "▶ FIRE" text
- Drive button shows "DRIVE MODE: OFF" in muted mono; turns signal-blue when toggled on
- Weapon picker shows weapon name uppercase mono with phosphor caret

- [ ] **Step 5: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes (selectors unchanged — only visual).

- [ ] **Step 6: Commit**

```bash
git add site/styles/hud.css site/index.html site/styles.css
git commit -m "redesign: tactical bottom controls bar (stats, sliders, drive, weapon picker, FIRE)"
```

---

### Task 5: Restyle edge tabs (Game Options / Debug / Game Log / Volume / Restart)

**Files:**
- Modify: `site/styles/hud.css` (append)
- Modify: `site/index.html` (update label text on the existing edge-tab divs)

- [ ] **Step 1: Update edge-tab markup in `site/index.html`**

Find the existing edge-tab block:

```html
<div id="options-tab" class="edge-tab" ...>▸ Game Options</div>
<div id="debug-tab" class="edge-tab secondary" ...>Debug</div>
<div id="log-tab" class="edge-tab secondary" ...>Game Log</div>
<div id="volume-tab" class="edge-tab secondary" ...>🔊 Volume</div>
<div id="restart-tab" class="edge-tab secondary" ...>↻ Restart</div>
```

Replace the inner text + icon with structured markup (each tab gets two child spans — icon + label):

```html
<div id="options-tab" class="edge-tab" role="button" tabindex="0" aria-label="Open game options"><span class="icon">▸</span><span class="label">OPTIONS</span></div>
<div id="debug-tab" class="edge-tab" role="button" tabindex="0" aria-label="Open debug and cheats"><span class="icon">▣</span><span class="label">DEBUG</span></div>
<div id="log-tab" class="edge-tab" role="button" tabindex="0" aria-label="Open game log"><span class="icon">≡</span><span class="label">LOG</span></div>
<div id="volume-tab" class="edge-tab" role="button" tabindex="0" aria-label="Open volume controls"><span class="icon">♪</span><span class="label">AUDIO</span></div>
<div id="restart-tab" class="edge-tab" role="button" tabindex="0" aria-label="Open restart options"><span class="icon">↻</span><span class="label">RESTART</span></div>
```

(Note: removed the `secondary` class — both states will be styled uniformly via base class.)

- [ ] **Step 2: Append edge-tab styles to `site/styles/hud.css`**

```css
/* ===== Edge tabs ===== */
.edge-tab {
  position: fixed;
  left: 0;
  background: var(--surface-panel);
  border: var(--border-line);
  border-left: 0;
  color: var(--text-muted);
  padding: 6px 12px 6px 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 0 var(--radius-sharp) var(--radius-sharp) 0;
  z-index: 1060;
}
.edge-tab .icon { color: var(--accent-phosphor); font-size: 11px; width: 12px; text-align: center; }
.edge-tab:hover { background: var(--surface-raised); color: var(--text-primary); }
.edge-tab:hover .icon { text-shadow: 0 0 6px var(--accent-phosphor); }
.edge-tab.active {
  background: var(--surface-raised);
  color: var(--accent-phosphor);
  border-left: 2px solid var(--accent-phosphor);
  padding-left: 8px;
}

/* Existing vertical stacking — preserve y-positions from the old CSS */
#options-tab { top: 80px; }
#debug-tab   { top: 116px; }
#log-tab     { top: 152px; }
#volume-tab  { top: 188px; }
#restart-tab { top: 224px; }
```

- [ ] **Step 3: Remove superseded `.edge-tab` rules from `site/styles.css`**

Grep: `grep -n '\.edge-tab\b' site/styles.css` — delete the old rules.

- [ ] **Step 4: Wire `active` class in `site/js/main.js`**

Find where edge-tab click handlers open modals. After opening, add `tab.classList.add('active')`. On modal close, remove. If the existing code already toggles a class, alias that selector to `.active` via CSS instead of changing JS.

Quick alternative: in `site/styles/hud.css`, also add aliases for whatever existing "open" state class is used. Search: `grep -nE '\.edge-tab\..+\{|edge-tab.+classList' site/js/main.js` to find the active-state mechanism.

- [ ] **Step 5: Build + visually verify**

Run: `cd site && npm run dev`. Hover each tab → background lightens, icon glows. Click → modal opens, tab shows phosphor active state. Close → tab returns to default.

- [ ] **Step 6: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add site/index.html site/styles/hud.css site/styles.css site/js/main.js
git commit -m "redesign: tactical edge tabs with phosphor active state"
```

---

### Task 6: Restyle weapon menu grid (`#weapon-menu`)

**Files:**
- Modify: `site/styles/hud.css` (append)
- Modify: `site/js/main.js` (`renderWeaponMenu()` — update tile markup if needed)
- Modify: `site/styles.css` (remove old `.weapon-menu`, `.weapon-grid-toggle`, `.weapon-menu-item` rules)

- [ ] **Step 1: Inspect current weapon menu markup**

Run: `grep -n "renderWeaponMenu\|weapon-menu" site/js/main.js | head -10`
Read the tile markup structure to ensure CSS selectors match.

- [ ] **Step 2: Append weapon-menu styles to `site/styles/hud.css`**

```css
/* ===== Weapon menu ===== */
.weapon-menu {
  position: fixed;
  min-width: 320px;
  max-width: 90vw;
  background: var(--surface-panel);
  border: var(--border-phosphor);
  padding: 14px;
  box-shadow: 0 0 24px rgba(80, 220, 130, 0.2);
  z-index: 1100;
  border-radius: var(--radius-sharp);
}
.weapon-menu.hidden { display: none; }
.weapon-menu .menu-title {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent-phosphor);
  letter-spacing: 3px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
}
.weapon-menu .menu-title .count { color: var(--text-muted); }
.weapon-menu .menu-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
@media (max-width: 600px) {
  .weapon-menu .menu-grid { grid-template-columns: repeat(3, 1fr); }
}
.weapon-menu .menu-item {
  aspect-ratio: 1;
  background: var(--surface-deep);
  border: var(--border-line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  padding: 4px;
  position: relative;
  border-radius: var(--radius-sharp);
}
.weapon-menu .menu-item:hover {
  border-color: var(--accent-phosphor);
  background: var(--surface-raised);
}
.weapon-menu .menu-item.selected {
  border-color: var(--accent-phosphor);
  background: var(--surface-raised);
  box-shadow: inset 0 0 12px rgba(80, 220, 130, 0.15);
}
.weapon-menu .menu-item.locked {
  opacity: 0.25;
  cursor: not-allowed;
}
.weapon-menu .menu-item .item-icon { font-size: 18px; }
.weapon-menu .menu-item .item-name {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.weapon-menu .menu-item.selected .item-name { color: var(--text-primary); }
.weapon-menu .menu-item .item-ammo {
  position: absolute;
  top: 2px;
  right: 4px;
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--accent-phosphor);
}
```

- [ ] **Step 3: Adjust `renderWeaponMenu()` in `site/js/main.js` if needed**

If the current renderer uses different class names than `menu-item`, `item-icon`, `item-name`, `item-ammo`, either update the renderer to use these, or update the CSS to match the existing class names. Either is acceptable — pick whichever produces a smaller diff. Add a `<div class="menu-title">SELECT WEAPON · <span class="count">N AVAILABLE</span></div>` header to the menu if not present (construct via `document.createElement` to avoid `innerHTML`).

- [ ] **Step 4: Remove old weapon-menu rules from `site/styles.css`**

Grep and delete: `grep -n '\.weapon-menu\b' site/styles.css`.

- [ ] **Step 5: Build + visually verify**

Run: `cd site && npm run dev`. Open weapon menu (click trigger or press the bound key). Confirm: 5-wide grid of square tiles, hover highlights phosphor, current weapon shows selected state, locked weapons dim to 25%.

Test ocean map: select Ocean preset → start game → open weapon menu. Land-only weapons (airstrike markers, napalm, etc.) should appear dimmed.

- [ ] **Step 6: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add site/styles/hud.css site/styles.css site/js/main.js
git commit -m "redesign: tactical weapon menu grid with locked-state dimming"
```

---

### Task 7: Create shared modal chrome CSS

**Files:**
- Create: `site/styles/modals.css`
- Modify: `site/index.html` (reference modals.css)

- [ ] **Step 1: Create `site/styles/modals.css`**

```css
/* site/styles/modals.css — Tactical Command modal chrome */

/* Backdrop + position */
.modal {
  background: transparent;
  border: 0;
  padding: 0;
  max-width: min(960px, 92vw);
  max-height: 92vh;
  color: var(--text-body);
}
.modal::backdrop {
  background: rgba(5, 10, 6, 0.78);
  backdrop-filter: blur(2px);
}
.modal.hidden { display: none; }

/* Wrapper inside each modal */
.modal .modal-content {
  background: var(--surface-ink);
  border: var(--border-line);
  border-radius: var(--radius-sharp);
  position: relative;
  overflow: hidden;
}
.modal .modal-content::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
  opacity: 0.5;
}

/* Title bar */
.modal-titlebar {
  background: var(--surface-panel);
  border-bottom: var(--border-line);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}
.modal-titlebar::before,
.modal-titlebar::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--accent-phosphor);
  border-style: solid;
}
.modal-titlebar::before { top: -1px; left: -1px; border-width: 1px 0 0 1px; }
.modal-titlebar::after  { top: -1px; right: -1px; border-width: 1px 1px 0 0; }
.modal-titlebar .h {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
  letter-spacing: 3px;
  flex: 1;
}
.modal-titlebar .h .accent { color: var(--accent-phosphor); }
.modal-titlebar .sub {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 2px;
}
.modal-titlebar .x,
.modal-titlebar .modal-close,
.modal-titlebar .modal-close-inline {
  background: var(--surface-deep);
  border: var(--border-line);
  color: var(--text-muted);
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1px;
  cursor: pointer;
  border-radius: var(--radius-sharp);
}
.modal-titlebar .x:hover,
.modal-titlebar .modal-close:hover { border-color: var(--accent-hot); color: var(--accent-hot); }

/* Modal body (default — surfaces override) */
.modal-body { padding: 18px; position: relative; z-index: 1; }

/* Footer actions */
.modal-actions {
  background: var(--surface-panel);
  border-top: var(--border-line);
  padding: 12px 18px;
  display: flex;
  gap: 8px;
  align-items: center;
  position: relative;
  z-index: 1;
}
.btn-ghost {
  background: transparent;
  border: var(--border-line);
  color: var(--text-muted);
  padding: 8px 14px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 3px;
  cursor: pointer;
  border-radius: var(--radius-sharp);
}
.btn-ghost:hover { border-color: var(--accent-phosphor); color: var(--accent-phosphor); }
.btn-ghost.danger:hover { border-color: var(--accent-hot); color: var(--accent-hot); }
.btn-primary {
  background: var(--accent-phosphor);
  border: 1px solid var(--accent-phosphor);
  color: var(--surface-ink);
  padding: 8px 22px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 3px;
  cursor: pointer;
  box-shadow: var(--glow-phosphor);
  border-radius: var(--radius-sharp);
}

/* Pill row (used in many modals) */
.pill-row { display: flex; gap: 4px; flex-wrap: wrap; }
.pill {
  background: var(--surface-panel);
  border: var(--border-line);
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 1px;
  cursor: pointer;
  border-radius: var(--radius-sharp);
}
.pill:hover { border-color: var(--accent-phosphor); color: var(--accent-phosphor); }
.pill.selected {
  border-color: var(--accent-phosphor);
  background: var(--surface-raised);
  color: var(--accent-phosphor);
  box-shadow: inset 0 -2px 0 var(--accent-phosphor);
}
```

- [ ] **Step 2: Reference modals.css in `site/index.html`**

After `hud.css`:
```html
<link rel="stylesheet" href="/styles/modals.css" />
```

- [ ] **Step 3: Build + smoke test**

Run: `cd site && npm run build && npm run test:smoke`
Expected: build OK, smoke passes (no behavior change — chrome is unused yet).

- [ ] **Step 4: Commit**

```bash
git add site/styles/modals.css site/index.html
git commit -m "redesign: add shared modal chrome (titlebar, actions, pills, buttons)"
```

---

### Task 8: Apply modal chrome to small modals (Volume, Restart, Game Log, Debug, Options, Skip, Auto-restart)

**Files:**
- Modify: `site/index.html` (wrap each modal body in `<div class="modal-titlebar">` + `<div class="modal-body">` + `<div class="modal-actions">` where applicable)
- Modify: `site/styles.css` (remove old per-modal rules that conflict)

The approach: for each modal, restructure its inner markup so it has a titlebar block, a body block, and (where buttons exist) an actions block. Replace inline buttons with `.btn-ghost` / `.btn-primary` classes.

- [ ] **Step 1: Volume modal (`#volume-modal`)**

Find the existing modal in `site/index.html`. Replace the inner structure with:

```html
<dialog id="volume-modal" class="modal hidden" aria-labelledby="volume-title">
  <div class="modal-content">
    <div class="modal-titlebar">
      <div class="h">AUDIO <span class="accent">CONTROL</span></div>
      <button id="volume-modal-close" class="modal-close" title="Close" aria-label="Close">ESC</button>
    </div>
    <div class="modal-body">
      <div id="volume-modal-body">
        <!-- existing volume controls go here, untouched -->
        <div class="volume-controls">
          <!-- ... existing volume sections ... -->
        </div>
      </div>
    </div>
  </div>
</dialog>
```

Move the existing volume sliders/buttons inside `.modal-body > #volume-modal-body`. Append CSS in `modals.css` to restyle the inner volume controls:

```css
#volume-modal .volume-section { padding: 10px 0; border-bottom: var(--border-line); }
#volume-modal .volume-section:last-child { border-bottom: 0; }
#volume-modal .volume-section label {
  display: flex;
  gap: 8px;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--accent-phosphor);
  margin-bottom: 6px;
  text-transform: uppercase;
}
#volume-modal .volume-section .volume-icon { display: none; }
#volume-modal .volume-slider-group {
  display: grid;
  grid-template-columns: 1fr 40px;
  gap: 10px;
  align-items: center;
}
#volume-modal .volume-slider-group span {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  text-align: right;
}
#volume-modal .volume-actions { display: flex; gap: 6px; margin-top: 10px; }
```

- [ ] **Step 2: Restart modal (`#restart-modal`)**

Same pattern. Title becomes `RESTART <span class="accent">ENGAGEMENT</span>`. Existing buttons get class `.btn-ghost` and the primary "Restart Now" gets `.btn-primary`. Move buttons into a `.modal-actions` block at the bottom.

- [ ] **Step 3: Auto-restart countdown modal (`#auto-restart-modal`)**

Title: `GAME <span class="accent">RESTARTING</span>`. Body keeps the countdown number — restyle to `.t-display` (Saira Condensed), large (64px), color phosphor.

- [ ] **Step 4: Options modal (`#options-modal`)**

Title: `GAME <span class="accent">OPTIONS</span>`. The existing `.options-grid` of buttons becomes a row of `.btn-ghost` buttons. Checkboxes restyled per modals.css pattern:

```css
/* Tactical checkbox */
.modal label.checkbox-row {
  display: flex;
  gap: 8px;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 1px;
  padding: 4px 0;
  cursor: pointer;
}
.modal input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border: var(--border-line);
  background: transparent;
  cursor: pointer;
  position: relative;
  border-radius: 0;
}
.modal input[type="checkbox"]:checked {
  border-color: var(--accent-phosphor);
  background: var(--surface-raised);
}
.modal input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--accent-phosphor);
  font-size: 10px;
  line-height: 1;
}
```

Wrap each existing `<label>` (the auto-restart toggle, restore-session toggle) with `class="checkbox-row"`.

- [ ] **Step 5: Game Log + Debug modals**

Wrap with titlebar + body. Existing log/debug content moves into `.modal-body`. No new styles needed beyond the chrome. For the log content, append:

```css
#log-modal .modal-body { max-height: 60vh; overflow-y: auto; }
#log-modal #game-log {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-body);
  background: var(--surface-deep);
  border: var(--border-line);
  padding: 10px;
  border-radius: var(--radius-sharp);
}
```

- [ ] **Step 6: Skip modal (`#skip-modal`)**

Title: `ALL HUMANS <span class="accent">ELIMINATED</span>`. Two buttons get `.btn-ghost` (Keep Watching) and `.btn-primary` (Skip to Result), moved into `.modal-actions`.

- [ ] **Step 7: Build + smoke + visual verify**

Open each modal in sequence:
- Click Volume tab → Audio Control modal appears with new chrome.
- Click Restart tab → Restart Engagement modal.
- Click Options tab → Game Options modal with tactical checkboxes.
- Trigger debug overlay → Debug modal with chrome.
- Trigger game log → Game Log modal with mono log readout.
- (Skip modal triggers only when all humans eliminated — verify markup looks right via dev tools.)

Run: `cd site && npm run test:smoke` → expect pass.

- [ ] **Step 8: Commit**

```bash
git add site/index.html site/styles/modals.css site/styles.css
git commit -m "redesign: apply tactical chrome to Volume, Restart, Options, Log, Debug, Skip modals"
```

---

### Task 9: Redesign Briefing modal (layout shell)

The Briefing (new-game) modal is the biggest single redesign. Build it in three sub-tasks: layout shell (Task 9), mode tiles + terrain grid (Task 10), roster + pills + checkboxes (Task 11).

**Files:**
- Modify: `site/index.html` (`#new-game-modal` markup)
- Modify: `site/styles/modals.css` (append `.briefing-*` rules)

- [ ] **Step 1: Replace `#new-game-modal` outer structure in `site/index.html`**

Replace the existing dialog with:

```html
<dialog id="new-game-modal" class="modal hidden" aria-labelledby="new-game-title">
  <div class="modal-content setup briefing">
    <div class="modal-titlebar">
      <div class="h">OPERATIONAL <span class="accent">BRIEFING</span></div>
      <div class="sub">CONFIGURE ENGAGEMENT · PRESS [↵] TO COMMIT</div>
      <button id="briefing-close" class="modal-close" aria-label="Close">ESC</button>
    </div>
    <div class="modal-body briefing-body">
      <div class="briefing-grid">
        <div class="briefing-col left">
          <section class="briefing-panel" data-panel="mode">
            <div class="panel-label">▸ MODE <span class="num">01 / 06</span></div>
            <div class="mode-tiles">
              <!-- placeholder; populated in Task 10 -->
            </div>
          </section>
          <section class="briefing-panel" data-panel="terrain">
            <div class="panel-label">▸ TERRAIN <span class="num">02 / 06</span></div>
            <div class="env-tiles">
              <!-- populated in Task 10 -->
            </div>
            <!-- existing advanced custom terrain section, kept hidden by default -->
            <div id="advanced-environment" style="display:none">
              <!-- existing custom terrain/theme selects remain here -->
            </div>
            <label class="checkbox-row" style="margin-top:10px">
              <input type="checkbox" id="setup-static-time" />
              <span>STATIC TIME (no day/night)</span>
            </label>
            <label class="time-row" id="time-select-wrap" style="margin-top:6px">
              <span class="t-micro">TIME</span>
              <select id="setup-time" class="t-mono">
                <option value="auto">AUTO / RANDOM</option>
                <option value="day">DAY</option>
                <option value="dusk">DUSK</option>
                <option value="night">NIGHT</option>
              </select>
            </label>
          </section>
          <section class="briefing-panel" data-panel="roster">
            <div class="panel-label">▸ ROSTER <span class="num">03 / 06</span></div>
            <!-- populated in Task 11 -->
          </section>
        </div>
        <div class="briefing-col right">
          <section class="briefing-panel" data-panel="wind">
            <div class="panel-label">▸ WIND <span class="num">04 / 06</span></div>
            <!-- pill row populated in Task 11 -->
          </section>
          <section class="briefing-panel" data-panel="health">
            <div class="panel-label">▸ TANK HEALTH <span class="num">05 / 06</span></div>
            <!-- pill row populated in Task 11 -->
          </section>
          <section class="briefing-panel" data-panel="ammo">
            <div class="panel-label">▸ AMMO <span class="num">06 / 06</span></div>
            <!-- pill row + custom-grid populated in Task 11 -->
          </section>
          <section class="briefing-panel" data-panel="options">
            <div class="panel-label">▸ OPTIONS</div>
            <!-- checkbox rows populated in Task 11 -->
          </section>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button id="setup-reset" class="btn-ghost danger">RESET ALL</button>
      <button id="setup-start" class="btn-primary" style="margin-left:auto">▶ START ENGAGEMENT</button>
      <button id="setup-cancel" class="btn-ghost">CANCEL</button>
    </div>
  </div>
</dialog>
```

**Important:** keep the existing form-field IDs (`setup-static-time`, `setup-time`, `setup-environment`, `setup-terrain`, `setup-theme`, `setup-total-players`, `setup-roster`, `setup-slots`, `setup-teams`, `setup-allow-drive-anytime`, `setup-disable-names`, `setup-ammo-mode`, all `ammo-*` IDs) so existing `js/main.js` setup-modal wiring continues to work. Tasks 10 and 11 will populate the inner content while preserving these IDs.

- [ ] **Step 2: Append briefing styles to `site/styles/modals.css`**

```css
/* ===== Briefing (new-game) modal ===== */
.modal .modal-content.briefing { max-width: min(960px, 92vw); }
.briefing-body { padding: 18px; }
.briefing-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
}
@media (max-width: 760px) {
  .briefing-grid { grid-template-columns: 1fr; }
}
.briefing-col { display: flex; flex-direction: column; gap: 14px; }
.briefing-panel {
  background: var(--surface-ink);
  border: var(--border-line);
  padding: 14px;
  position: relative;
  border-radius: var(--radius-sharp);
}
.briefing-panel::before,
.briefing-panel::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--accent-phosphor);
  border-style: solid;
  pointer-events: none;
}
.briefing-panel::before { top: -1px; left: -1px; border-width: 1px 0 0 1px; }
.briefing-panel::after  { bottom: -1px; right: -1px; border-width: 0 1px 1px 0; }
.briefing-panel .panel-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent-phosphor);
  letter-spacing: 3px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.briefing-panel .panel-label .num { color: var(--text-dim); }
```

- [ ] **Step 3: Remove conflicting `.modal-content.setup` rules from `site/styles.css`**

Grep: `grep -n '\.modal-content\.setup\|\.setup-section\|\.setup-grid\|\.setup-actions' site/styles.css` — delete or override as needed.

- [ ] **Step 4: Build + smoke verify**

Run: `cd site && npm run build && npm run test:smoke`. The Briefing modal opens but panels are empty placeholders — that's expected for this task.

- [ ] **Step 5: Commit**

```bash
git add site/index.html site/styles/modals.css site/styles.css
git commit -m "redesign: Briefing modal shell — bracketed panels, two-column grid"
```

---

### Task 10: Briefing — mode tiles + terrain grid

**Files:**
- Modify: `site/index.html` (`.mode-tiles` and `.env-tiles` content inside the Briefing markup)
- Modify: `site/styles/modals.css` (append tile styles)
- Modify: `site/js/main.js` (wire tile click → existing mode/environment handlers)

- [ ] **Step 1: Mode tiles markup**

Inside `<div class="mode-tiles">` (in `#new-game-modal`):

```html
<button class="mode-tile" data-mode="classic">
  <div class="em">⚔</div>
  <div class="nm">CLASSIC</div>
  <div class="meta">FREE FOR ALL</div>
</button>
<button class="mode-tile" data-mode="teams">
  <div class="em">⛨</div>
  <div class="nm">TEAMS</div>
  <div class="meta">2 × 4</div>
</button>
<button class="mode-tile" data-mode="solo">
  <div class="em">⊙</div>
  <div class="nm">SOLO</div>
  <div class="meta">TARGET PRACTICE</div>
</button>
<button class="mode-tile" data-mode="realtime">
  <div class="em">⚡</div>
  <div class="nm">REALTIME</div>
  <div class="meta">NO TURNS</div>
</button>
```

Hide the existing `<input type="radio" name="mode" ...>` elements (set `display: none`) but keep them in the DOM — the JS in step 4 will keep them in sync with the visible tiles.

- [ ] **Step 2: Terrain tiles markup**

Inside `<div class="env-tiles">`:

```html
<button class="env-tile" data-env="forest"><div class="em">🌲</div><div class="nm">FOREST</div></button>
<button class="env-tile" data-env="desert"><div class="em">🏜</div><div class="nm">DESERT</div></button>
<button class="env-tile" data-env="canyon"><div class="em">🏜</div><div class="nm">CANYON</div></button>
<button class="env-tile" data-env="arctic"><div class="em">❄</div><div class="nm">ARCTIC</div></button>
<button class="env-tile" data-env="ocean"><div class="em">🌊</div><div class="nm">OCEAN</div></button>
<button class="env-tile" data-env="cave"><div class="em">🕳</div><div class="nm">CAVE</div></button>
<button class="env-tile" data-env="moon"><div class="em">🌙</div><div class="nm">MOON</div></button>
<button class="env-tile" data-env="mars"><div class="em">🔴</div><div class="nm">MARS</div></button>
<button class="env-tile" data-env="futuristic"><div class="em">🚀</div><div class="nm">FUTURIST</div></button>
<button class="env-tile" data-env="random"><div class="em">🎲</div><div class="nm">RANDOM</div></button>
<button class="env-tile" data-env="custom"><div class="em">⚙</div><div class="nm">CUSTOM</div></button>
```

Hide the existing `<select id="setup-environment">` (keep in DOM for JS).

- [ ] **Step 3: Append tile styles**

```css
/* Mode tiles */
.mode-tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.mode-tile {
  background: var(--surface-panel);
  border: var(--border-line);
  padding: 10px 8px;
  cursor: pointer;
  text-align: center;
  border-radius: var(--radius-sharp);
  color: var(--text-body);
  font: inherit;
}
.mode-tile:hover { border-color: var(--accent-phosphor); background: var(--surface-raised); }
.mode-tile.selected {
  border-color: var(--accent-phosphor);
  background: var(--surface-raised);
  box-shadow: inset 0 -2px 0 var(--accent-phosphor);
}
.mode-tile .em { font-size: 20px; color: var(--accent-phosphor); margin-bottom: 4px; }
.mode-tile .nm { font-family: var(--font-mono); font-size: 9px; color: var(--text-primary); letter-spacing: 1px; }
.mode-tile .meta { font-family: var(--font-mono); font-size: 8px; color: var(--text-dim); margin-top: 2px; letter-spacing: 0.5px; }
@media (max-width: 760px) {
  .mode-tiles { grid-template-columns: repeat(2, 1fr); }
}

/* Env tiles */
.env-tiles {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
.env-tile {
  background: var(--surface-panel);
  border: var(--border-line);
  aspect-ratio: 1.2;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px;
  color: var(--text-body);
  font: inherit;
  border-radius: var(--radius-sharp);
}
.env-tile:hover { border-color: var(--accent-phosphor); }
.env-tile.selected {
  border-color: var(--accent-phosphor);
  box-shadow: inset 0 0 10px rgba(80, 220, 130, 0.2);
}
.env-tile .em { font-size: 16px; }
.env-tile .nm { font-family: var(--font-mono); font-size: 8px; color: var(--text-muted); letter-spacing: 0.5px; }
.env-tile.selected .nm { color: var(--accent-phosphor); }
@media (max-width: 760px) {
  .env-tiles { grid-template-columns: repeat(3, 1fr); }
}
```

- [ ] **Step 4: Wire tile clicks in `site/js/main.js`**

Find the setup-modal init code. After existing radio/select wiring, add tile sync:

```js
// Mode tiles ↔ existing radio inputs
document.querySelectorAll('#new-game-modal .mode-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const mode = tile.dataset.mode;
    const radio = document.querySelector(`#new-game-modal input[name="mode"][value="${mode}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelectorAll('#new-game-modal .mode-tile').forEach(t => t.classList.toggle('selected', t === tile));
  });
});
// Reflect current radio state on open
function syncModeTilesFromRadios() {
  const checked = document.querySelector('#new-game-modal input[name="mode"]:checked');
  document.querySelectorAll('#new-game-modal .mode-tile').forEach(t => {
    t.classList.toggle('selected', t.dataset.mode === (checked?.value || ''));
  });
}

// Env tiles ↔ existing #setup-environment select
const envSelect = document.getElementById('setup-environment');
document.querySelectorAll('#new-game-modal .env-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    if (envSelect) {
      envSelect.value = tile.dataset.env;
      envSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelectorAll('#new-game-modal .env-tile').forEach(t => t.classList.toggle('selected', t === tile));
  });
});
function syncEnvTilesFromSelect() {
  const v = envSelect?.value;
  document.querySelectorAll('#new-game-modal .env-tile').forEach(t => {
    t.classList.toggle('selected', t.dataset.env === v);
  });
}

// Call sync on modal open
const briefingDialog = document.getElementById('new-game-modal');
const _origShowModal = briefingDialog.showModal?.bind(briefingDialog);
if (_origShowModal) {
  briefingDialog.showModal = function() {
    _origShowModal();
    syncModeTilesFromRadios();
    syncEnvTilesFromSelect();
  };
}
```

Place this near the other Briefing-init code (search `setup-start` or `setup-environment` to find the right spot).

- [ ] **Step 5: Hide the original radio + select**

In `site/styles/modals.css`, append:

```css
#new-game-modal input[name="mode"],
#new-game-modal #setup-environment,
#new-game-modal #setup-terrain,
#new-game-modal #setup-theme { display: none !important; }
```

(Custom-environment selects re-show only when "CUSTOM" tile is clicked — existing JS already shows `#advanced-environment` when env value is "custom"; we just need to make sure the tile click still triggers the change event, which it does via `dispatchEvent` above.)

- [ ] **Step 6: Build + visually verify**

Run: `cd site && npm run dev`. Open Briefing modal. Click tiles — mode and terrain selections persist; clicking "Custom" terrain shows the advanced terrain/theme selects below.

- [ ] **Step 7: Smoke + commit**

Run: `cd site && npm run test:smoke`. Expect pass.

```bash
git add site/index.html site/styles/modals.css site/js/main.js
git commit -m "redesign: Briefing mode tiles + terrain tile grid (4×1 + 5×2)"
```

---

### Task 11: Briefing — roster + pills + checkboxes + tank callsigns

**Files:**
- Modify: `site/index.html` (populate `data-panel="roster"`, `wind`, `health`, `ammo`, `options` panels)
- Modify: `site/styles/modals.css` (roster, slot card, stepper styles)
- Modify: `site/js/main.js` (callsign rotation + per-slot localStorage, roster renderer)

- [ ] **Step 1: Roster panel markup**

Replace inner content of `<section class="briefing-panel" data-panel="roster">` with:

```html
<div class="panel-label">▸ ROSTER <span class="num">03 / 06</span></div>
<div class="roster-controls">
  <span class="t-mono" style="font-size:10px; color:var(--text-muted); letter-spacing:2px">SLOTS</span>
  <div class="stepper">
    <button type="button" id="setup-slots-minus">−</button>
    <span class="val" id="setup-slots-value">4</span>
    <button type="button" id="setup-slots-plus">+</button>
  </div>
  <span class="t-mono" style="font-size:9px; color:var(--text-dim); letter-spacing:1px; margin-left:auto">MAX 8</span>
</div>
<div id="setup-roster" class="roster"></div>
<div id="setup-slots" class="slots" style="display:none"></div>
<label class="checkbox-row solo-rounds-wrap" id="solo-rounds-wrap" style="display:none">
  <span class="t-micro">SOLO TARGETS</span>
  <input id="setup-solo-targets" type="number" min="1" max="50" value="10" />
</label>
<label class="checkbox-row solo-shots-wrap" id="solo-shots-wrap" style="display:none">
  <span class="t-micro">SOLO SHOTS</span>
  <select id="setup-solo-shots">
    <option value="10" selected>10</option>
    <option value="20">20</option>
    <option value="unlimited">∞</option>
  </select>
</label>
```

- [ ] **Step 2: Roster + stepper styles**

```css
.roster-controls { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.stepper {
  display: inline-flex;
  align-items: center;
  background: var(--surface-panel);
  border: var(--border-line);
  border-radius: var(--radius-sharp);
}
.stepper button {
  background: transparent;
  border: 0;
  color: var(--accent-phosphor);
  padding: 4px 10px;
  font-family: var(--font-mono);
  font-size: 14px;
  cursor: pointer;
}
.stepper button:hover { background: var(--surface-raised); }
.stepper .val {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  padding: 4px 10px;
  min-width: 24px;
  text-align: center;
  font-feature-settings: 'tnum' 1;
}

#setup-roster.roster { display: flex; flex-direction: column; gap: 5px; }
.slot-card {
  background: var(--surface-panel);
  border: var(--border-line);
  padding: 8px 10px;
  display: grid;
  grid-template-columns: 18px 1fr auto auto;
  gap: 10px;
  align-items: center;
  border-radius: var(--radius-sharp);
}
.slot-color {
  width: 12px;
  height: 12px;
  border: var(--border-line);
  cursor: pointer;
}
.slot-name-input {
  background: transparent;
  border: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  letter-spacing: 1px;
  padding: 2px 4px;
  width: 100%;
}
.slot-name-input:focus { outline: 1px solid var(--accent-phosphor); }
.slot-type { display: flex; gap: 4px; }
.slot-type span {
  font-family: var(--font-mono);
  font-size: 9px;
  padding: 2px 6px;
  border: var(--border-line);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sharp);
}
.slot-type span.on {
  border-color: var(--accent-phosphor);
  color: var(--accent-phosphor);
  background: var(--surface-raised);
}
.slot-skill {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 1px;
  cursor: pointer;
}
.slot-skill.dim { opacity: 0.3; }
```

- [ ] **Step 3: Wind / Health / Ammo / Options panel markup**

Wind panel:

```html
<div class="panel-label">▸ WIND <span class="num">04 / 06</span></div>
<div class="pill-row" data-pill-group="wind">
  <button class="pill" data-pill="none">NONE</button>
  <button class="pill" data-pill="low">LOW</button>
  <button class="pill" data-pill="high">HIGH</button>
  <button class="pill" data-pill="random-per-turn">RANDOM</button>
</div>
```

Health:

```html
<div class="panel-label">▸ TANK HEALTH <span class="num">05 / 06</span></div>
<div class="pill-row" data-pill-group="health">
  <button class="pill" data-pill="100">100</button>
  <button class="pill" data-pill="150">150</button>
  <button class="pill" data-pill="200">200</button>
  <button class="pill" data-pill="300">300</button>
</div>
```

Ammo:

```html
<div class="panel-label">▸ AMMO <span class="num">06 / 06</span></div>
<div class="pill-row" data-pill-group="ammo-mode" style="margin-bottom:8px">
  <button class="pill" data-pill="unlimited">UNLIMITED</button>
  <button class="pill" data-pill="standard">STANDARD</button>
  <button class="pill" data-pill="custom">CUSTOM</button>
</div>
<div class="pill-row" data-pill-group="ammo-preset">
  <button class="pill" data-pill="no-heavy">NO HEAVY</button>
  <button class="pill" data-pill="missile-only">MISSILE ONLY</button>
  <button class="pill" data-pill="laser-only">LASER ONLY</button>
  <button class="pill" data-pill="basic-weapons">BASIC ONLY</button>
</div>
<!-- existing #setup-ammo-custom grid stays here, restyled below -->
<div id="setup-ammo-custom" style="display:none; margin-top:8px">
  <div class="t-micro" style="margin-bottom:6px">PER-WEAPON COUNTS</div>
  <div class="ammo-grid">
    <!-- existing ammo inputs preserved unchanged -->
  </div>
</div>
```

Options:

```html
<div class="panel-label">▸ OPTIONS</div>
<label class="checkbox-row"><input type="checkbox" id="setup-allow-drive-anytime" /><span>DRIVE ANYTIME <span class="ck-meta">non-turn movement</span></span></label>
<label class="checkbox-row"><input type="checkbox" id="setup-disable-names" /><span>HIDE OTHER NAMES <span class="ck-meta">streamer mode</span></span></label>
```

(Note: `setup-static-time` already lives in the Terrain panel from Task 9 — leave it there. Do NOT duplicate.)

Append checkbox-meta style:

```css
.checkbox-row .ck-meta { color: var(--text-dim); margin-left: 6px; font-size: 9px; }
```

- [ ] **Step 4: Pill click wiring in `site/js/main.js`**

Add a helper:

```js
// Generic pill group sync — keeps a hidden input or existing select in sync
function wirePillGroup(group, getCurrent, setCurrent) {
  const pills = document.querySelectorAll(`.pill-row[data-pill-group="${group}"] .pill`);
  function reflect() {
    const cur = String(getCurrent() ?? '');
    pills.forEach(p => p.classList.toggle('selected', p.dataset.pill === cur));
  }
  pills.forEach(p => p.addEventListener('click', () => {
    setCurrent(p.dataset.pill);
    reflect();
  }));
  return reflect;
}

// Wind pills ↔ existing radio inputs[name="wind"]
const syncWindPills = wirePillGroup('wind',
  () => document.querySelector('#new-game-modal input[name="wind"]:checked')?.value,
  v => {
    const r = document.querySelector(`#new-game-modal input[name="wind"][value="${v}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }
);

// Health pills ↔ existing radio inputs[name="health"]
const syncHealthPills = wirePillGroup('health',
  () => document.querySelector('#new-game-modal input[name="health"]:checked')?.value,
  v => {
    const r = document.querySelector(`#new-game-modal input[name="health"][value="${v}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }
);

// Ammo mode pills ↔ existing #setup-ammo-mode select
const ammoSelect = document.getElementById('setup-ammo-mode');
const syncAmmoModePills = wirePillGroup('ammo-mode',
  () => ammoSelect?.value,
  v => {
    if (ammoSelect) { ammoSelect.value = v; ammoSelect.dispatchEvent(new Event('change', { bubbles: true })); }
  }
);

// Ammo preset pills also drive #setup-ammo-mode but with restriction values
const syncAmmoPresetPills = wirePillGroup('ammo-preset',
  () => ammoSelect?.value,
  v => {
    if (ammoSelect) { ammoSelect.value = v; ammoSelect.dispatchEvent(new Event('change', { bubbles: true })); }
  }
);

// Call all syncs when modal opens — extend the showModal wrapper from Task 10
const _origShowModal2 = briefingDialog.showModal?.bind(briefingDialog);
briefingDialog.showModal = function() {
  _origShowModal2 && _origShowModal2();
  syncModeTilesFromRadios();
  syncEnvTilesFromSelect();
  syncWindPills();
  syncHealthPills();
  syncAmmoModePills();
  syncAmmoPresetPills();
};
```

Hide the original radio inputs:

```css
#new-game-modal input[name="wind"],
#new-game-modal input[name="health"],
#new-game-modal #setup-ammo-mode { display: none !important; }
```

- [ ] **Step 5: Tank callsign rotation + persistence**

Add to `site/js/main.js`:

```js
const CALLSIGNS = ['JAGUAR', 'VIPER', 'RAVEN', 'HAWK', 'COBRA', 'FALCON', 'GHOST', 'WOLF', 'OWL', 'BEAR'];

function defaultCallsign(slotIdx) {
  // Migration: read existing player-name LS key first, fall back to rotation
  try {
    const legacy = localStorage.getItem(`rc9.player.name.${slotIdx}`);
    if (legacy) return legacy;
  } catch {}
  try {
    const stored = localStorage.getItem(`rc9.callsign.slot.${slotIdx}`);
    if (stored) return stored;
  } catch {}
  return CALLSIGNS[slotIdx % CALLSIGNS.length];
}

function saveCallsign(slotIdx, name) {
  try { localStorage.setItem(`rc9.callsign.slot.${slotIdx}`, name); } catch {}
}
```

Find the existing roster-rendering function (search `renderRoster\|setup-roster.innerHTML` in `site/js/main.js`). The existing code likely builds rows with `innerHTML` — refactor to use `document.createElement` instead. Example per-slot construction:

```js
function renderSlotCard(slotIdx, slotData) {
  const card = document.createElement('div');
  card.className = 'slot-card';
  card.dataset.slot = String(slotIdx);

  const color = document.createElement('div');
  color.className = 'slot-color';
  color.style.background = slotData.color;
  card.appendChild(color);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'slot-name-input';
  nameInput.value = slotData.name || defaultCallsign(slotIdx);
  nameInput.addEventListener('change', () => saveCallsign(slotIdx, nameInput.value));
  card.appendChild(nameInput);

  const type = document.createElement('div');
  type.className = 'slot-type';
  ['HUMAN', 'AI'].forEach(kind => {
    const opt = document.createElement('span');
    opt.textContent = kind;
    opt.classList.toggle('on', slotData.kind === kind.toLowerCase());
    opt.addEventListener('click', () => { /* existing kind-toggle handler */ });
    type.appendChild(opt);
  });
  card.appendChild(type);

  const skill = document.createElement('div');
  skill.className = 'slot-skill';
  if (slotData.kind === 'ai') {
    skill.textContent = `SKILL · ${(slotData.skill || 'med').toUpperCase()}`;
  } else {
    skill.classList.add('dim');
    skill.textContent = '— —';
  }
  card.appendChild(skill);

  return card;
}
```

Wire `renderSlotCard` into wherever the existing roster-rebuild fires (when `setup-total-players` changes). Replace the existing innerHTML-based row markup with calls to this function. Do NOT introduce new `innerHTML` calls.

- [ ] **Step 6: Stepper wiring**

In `site/js/main.js`, find where `#setup-total-players` is read. Add:

```js
const totalInput = document.getElementById('setup-total-players');
const valEl = document.getElementById('setup-slots-value');
function setSlotCount(n) {
  n = Math.max(1, Math.min(8, n));
  if (totalInput) {
    totalInput.value = String(n);
    totalInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (valEl) valEl.textContent = String(n).padStart(2, '0');
}
document.getElementById('setup-slots-minus')?.addEventListener('click', () => setSlotCount(parseInt(totalInput?.value || '4', 10) - 1));
document.getElementById('setup-slots-plus')?.addEventListener('click', () => setSlotCount(parseInt(totalInput?.value || '4', 10) + 1));
// Reflect on open
setSlotCount(parseInt(totalInput?.value || '4', 10));
```

Hide the original `#setup-total-players` number input:

```css
#new-game-modal #setup-total-players { display: none !important; }
```

- [ ] **Step 7: Build + visually verify the full Briefing**

Run: `cd site && npm run dev`. Open Briefing. Confirm:
- All 6 numbered panels render with brackets and labels.
- Mode tiles + Terrain tiles + Wind pills + Health pills + Ammo pills all reflect state and update underlying inputs.
- Stepper changes slot count; roster regenerates with new slots.
- Slot name defaults to a callsign (JAGUAR for slot 0, VIPER for slot 1, etc.). Editing a name and re-opening preserves it.
- Selecting "CUSTOM" ammo shows the per-weapon grid.
- Checkbox rows show tactical checkboxes with phosphor checkmark.

Start a game — confirm it launches with the chosen settings.

- [ ] **Step 8: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes.

- [ ] **Step 9: Commit**

```bash
git add site/index.html site/styles/modals.css site/js/main.js
git commit -m "redesign: Briefing roster (callsigns, stepper, slot cards) + Wind/Health/Ammo pill groups"
```

---

### Task 12: Redesign Engagement Report (game-over) modal

**Files:**
- Modify: `site/index.html` (`#game-over-modal`)
- Modify: `site/styles/modals.css` (append `.engagement-report` styles)
- Modify: `site/js/game-victory.js` (`showVictoryToast` or `showGameOver` — update markup it injects to use new structure)

- [ ] **Step 1: Replace `#game-over-modal` markup in `site/index.html`**

```html
<dialog id="game-over-modal" class="modal hidden" aria-labelledby="winner-text">
  <div class="modal-content engagement-report">
    <div class="modal-titlebar">
      <div class="h">ENGAGEMENT <span class="accent">REPORT</span></div>
      <div class="sub" id="er-subtitle">ROUND COMPLETE</div>
      <button id="game-over-close" class="modal-close" aria-label="Close">ESC</button>
    </div>
    <div class="modal-body">
      <div class="er">
        <div class="er-banner" id="er-banner">VICTORY · OPERATOR</div>
        <div class="er-winner"><span class="accent" id="winner-text">—</span><span id="er-standing"> STANDING</span></div>
        <div class="er-tag" id="er-tag">—</div>
        <div class="er-stats">
          <div class="er-stat"><div class="lab">ROUNDS</div><div class="val" id="er-rounds">—</div></div>
          <div class="er-stat"><div class="lab">HITS</div><div class="val"><span id="er-hits">—</span> <span class="small">/ <span id="er-shots">—</span></span></div></div>
          <div class="er-stat"><div class="lab">DAMAGE</div><div class="val" id="er-damage">—</div></div>
          <div class="er-stat"><div class="lab">ACCURACY</div><div class="val"><span id="er-accuracy">—</span><span class="small">%</span></div></div>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button id="er-return" class="btn-ghost">RETURN TO COMMAND</button>
      <button id="new-game-button" class="btn-primary" style="margin-left:auto">▶ NEW ENGAGEMENT</button>
    </div>
  </div>
</dialog>
```

(Note the `er-hits` / `er-shots` / `er-accuracy` are placed inside pre-built `<span>` children — the JS populates them with `textContent` only, no `innerHTML`.)

- [ ] **Step 2: Append Engagement Report styles**

```css
.engagement-report .er { padding: 28px; text-align: center; position: relative; }
.engagement-report .er-banner {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent-phosphor);
  letter-spacing: 6px;
  margin-bottom: 12px;
}
.engagement-report .er-banner.defeat { color: var(--accent-hot); }
.engagement-report .er-banner.tie { color: var(--accent-amber); }
.engagement-report .er-winner {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 56px;
  color: var(--text-primary);
  letter-spacing: 3px;
  line-height: 1;
}
.engagement-report .er-winner .accent {
  color: var(--accent-phosphor);
  text-shadow: 0 0 16px rgba(80, 220, 130, 0.5);
}
.engagement-report .er-tag {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 3px;
  margin: 12px 0 24px;
}
.engagement-report .er-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #1a2a1c;
  border: var(--border-line);
  max-width: 540px;
  margin: 0 auto 24px;
}
.engagement-report .er-stat { background: var(--surface-ink); padding: 16px 12px; }
.engagement-report .er-stat .lab {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 2px;
}
.engagement-report .er-stat .val {
  font-family: var(--font-mono);
  font-size: 22px;
  color: var(--text-primary);
  margin-top: 6px;
  font-feature-settings: 'tnum' 1;
}
.engagement-report .er-stat .val .small { font-size: 11px; color: var(--text-muted); }
@media (max-width: 600px) {
  .engagement-report .er-stats { grid-template-columns: repeat(2, 1fr); }
  .engagement-report .er-winner { font-size: 40px; }
}
```

- [ ] **Step 3: Populate fields from `game-victory.js`**

Find `showGameOver()` / `showVictoryToast()`. The function currently sets `#winner-text` text and `#game-over-stats` HTML. Update it to use `textContent` only:

```js
function fillEngagementReport(state) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };

  const banner = document.getElementById('er-banner');
  if (banner) {
    banner.textContent = state.outcome === 'victory' ? 'VICTORY · OPERATOR'
                       : state.outcome === 'tie' ? 'STALEMATE'
                       : 'DEFEAT · ENEMY';
    banner.className = 'er-banner ' + (state.outcome === 'victory' ? '' : state.outcome);
  }
  setText('er-subtitle', `ROUND COMPLETE · ${state.turns} TURNS · ${state.durationStr}`);
  setText('winner-text', (state.winnerName || '—').toUpperCase());
  setText('er-standing', state.outcome === 'victory' ? ' STANDING' : '');
  setText('er-tag', (state.contextualMessage || '').toUpperCase());
  setText('er-rounds', state.turns);
  setText('er-hits', state.hits);
  setText('er-shots', state.shots);
  setText('er-damage', state.damage);
  setText('er-accuracy', Math.round((state.hits / Math.max(1, state.shots)) * 100));
}
```

Wire it into the existing `showGameOver` flow.

- [ ] **Step 4: Wire `RETURN TO COMMAND` button**

```js
document.getElementById('er-return')?.addEventListener('click', () => {
  document.getElementById('game-over-modal').close?.();
  // Show the title screen (added in Task 13)
  document.getElementById('title-screen')?.removeAttribute('hidden');
});
```

If Task 13 hasn't landed yet, this button just closes the modal — that's fine for now; we'll re-test once title-screen exists.

- [ ] **Step 5: Build + verify (use Debug → instant-win)**

Run: `cd site && npm run dev`. Start a Classic 2-player game. Use the Debug modal's "Instant Win" / set-health-0 cheat to trigger game-over. Confirm the Engagement Report appears with phosphor winner name, stats grid, two buttons.

- [ ] **Step 6: Smoke + commit**

```bash
git add site/index.html site/styles/modals.css site/js/game-victory.js
git commit -m "redesign: Engagement Report game-over modal — banner, callsign, stats grid"
```

---

### Task 13: Title screen — markup + CSS

**Files:**
- Modify: `site/index.html` (add title-screen markup before `#game-container`)
- Create: `site/styles/title-screen.css`
- Modify: `site/index.html` (load title-screen.css)

- [ ] **Step 1: Add title-screen markup to `site/index.html`**

Immediately after `<body>` (before `<header class="sr-only">`) add:

```html
<div id="title-screen" hidden aria-label="Remote Command — Main Menu">
  <div class="ts-grid"></div>
  <div class="ts-terrain"></div>
  <div class="ts-sweep"></div>
  <span class="ts-bracket tl"></span>
  <span class="ts-bracket tr"></span>
  <span class="ts-bracket bl"></span>
  <span class="ts-bracket br"></span>

  <div class="ts-boot" id="ts-boot">
    <span class="dim">&gt;</span> <span class="ok">CONNECT</span> rc-9.command.net ............... <span class="ok">OK</span><br>
    <span class="dim">&gt;</span> <span class="ok">UPLINK</span> handshake ........................ <span class="ok">OK</span><br>
    <span class="dim">&gt;</span> <span class="ok">TELEMETRY</span> bus armed .................... <span class="ok">OK</span><br>
    <span class="dim">&gt;</span> <span class="ok">SECTOR</span> table loaded ..................... <span class="ok">OK</span><br>
    <span class="dim">&gt;</span> awaiting operator<span class="ts-cursor"></span>
  </div>

  <div class="ts-uplink">
    <div class="live">UPLINK · LIVE</div>
    <div id="ts-utc">UTC 00:00:00</div>
    <div id="ts-op">OP // OPERATOR</div>
  </div>

  <div class="ts-title">
    <div class="ts-callsign">CALLSIGN · RC-9</div>
    <div class="ts-name">REMOTE</div>
    <div class="ts-name"><span class="glow">COMMAND</span></div>
    <div class="ts-subtitle">ARTILLERY <span class="div">·</span> DESTRUCTIBLE TERRAIN <span class="div">·</span> 1-8 OPS</div>
  </div>

  <nav class="ts-menu" aria-label="Main menu">
    <button class="ts-item primary" data-action="new" data-key="N">
      <span class="ts-item-key">N</span>
      <span class="ts-item-label">NEW ENGAGEMENT</span>
      <span class="ts-item-meta">▸</span>
    </button>
    <button class="ts-item" data-action="resume" data-key="R" id="ts-resume" hidden>
      <span class="ts-item-key">R</span>
      <span class="ts-item-label">RESUME LAST OP</span>
      <span class="ts-item-meta" id="ts-resume-meta">—</span>
    </button>
    <button class="ts-item" data-action="briefing" data-key="B">
      <span class="ts-item-key">B</span>
      <span class="ts-item-label">BRIEFING</span>
      <span class="ts-item-meta">HOW-TO</span>
    </button>
    <button class="ts-item dim" data-action="archive" data-key="A" disabled>
      <span class="ts-item-key">A</span>
      <span class="ts-item-label">ARCHIVE</span>
      <span class="ts-item-meta">SOON</span>
    </button>
  </nav>

  <div class="ts-foot">
    <div class="group"><span class="key">↑↓</span> NAVIGATE</div>
    <div class="group"><span class="key">↵</span> SELECT</div>
    <div class="group"><span class="key">ESC</span> EXIT</div>
    <div class="build" id="ts-build">RC-9 v—</div>
  </div>
</div>
```

- [ ] **Step 2: Create `site/styles/title-screen.css`**

```css
/* site/styles/title-screen.css — Tactical Command title screen */

#title-screen {
  position: fixed;
  inset: 0;
  background: var(--surface-ink);
  z-index: 2000;
  font-family: var(--font-mono);
  color: var(--text-body);
  overflow: hidden;
}
#title-screen[hidden] { display: none; }

.ts-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
  opacity: 0.7;
}
.ts-terrain {
  position: absolute; bottom: 60px; left: 0; right: 0; height: 22vh;
  background: linear-gradient(180deg, transparent, rgba(80, 220, 130, 0.05));
  clip-path: polygon(0 70%, 8% 40%, 18% 55%, 30% 30%, 42% 50%, 55% 25%, 68% 45%, 80% 35%, 92% 50%, 100% 38%, 100% 100%, 0 100%);
  border-top: 1px solid rgba(80, 220, 130, 0.3);
}
.ts-sweep {
  position: absolute; top: 0; bottom: 0; left: 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, rgba(80, 220, 130, 0.5), transparent);
  opacity: 0.4;
  animation: ts-sweep 8s linear infinite;
  pointer-events: none;
}
@keyframes ts-sweep { 0% { left: -5%; } 100% { left: 105%; } }

.ts-bracket {
  position: absolute; width: 16px; height: 16px;
  border-color: var(--accent-phosphor); border-style: solid;
}
.ts-bracket.tl { top: 14px; left: 14px; border-width: 1px 0 0 1px; }
.ts-bracket.tr { top: 14px; right: 14px; border-width: 1px 1px 0 0; }
.ts-bracket.bl { bottom: 50px; left: 14px; border-width: 0 0 1px 1px; }
.ts-bracket.br { bottom: 50px; right: 14px; border-width: 0 1px 1px 0; }

.ts-boot {
  position: absolute; top: 18px; left: 24px;
  font-size: 10px;
  color: var(--accent-phosphor);
  opacity: 0.7;
  line-height: 1.7;
  letter-spacing: 1px;
}
.ts-boot .dim { color: var(--text-dim); }
.ts-boot .ok { color: var(--accent-phosphor); }
.ts-cursor {
  display: inline-block;
  width: 8px; height: 11px;
  background: var(--accent-phosphor);
  vertical-align: middle;
  margin-left: 2px;
  animation: ts-blink 1s steps(2) infinite;
}
@keyframes ts-blink { 0%, 50% { opacity: 1 } 51%, 100% { opacity: 0 } }

.ts-uplink {
  position: absolute; top: 18px; right: 24px;
  text-align: right;
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.7;
  letter-spacing: 1px;
}
.ts-uplink .live { color: var(--accent-phosphor); }
.ts-uplink .live::before { content: '●'; margin-right: 4px; animation: ts-pulse 1.6s ease-in-out infinite; }
@keyframes ts-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }

.ts-title {
  position: absolute;
  left: clamp(24px, 6vw, 80px);
  top: 50%;
  transform: translateY(-58%);
}
.ts-callsign {
  font-size: 11px;
  color: var(--accent-phosphor);
  letter-spacing: 6px;
  margin-bottom: 8px;
}
.ts-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(48px, 8vw, 96px);
  line-height: 0.92;
  color: var(--text-primary);
  letter-spacing: 2px;
}
.ts-name .glow {
  color: var(--accent-phosphor);
  text-shadow: 0 0 16px rgba(80, 220, 130, 0.5);
}
.ts-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 3px;
  margin-top: 16px;
}
.ts-subtitle .div { color: var(--text-dim); margin: 0 8px; }

.ts-menu {
  position: absolute;
  right: clamp(24px, 6vw, 80px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 260px;
}
.ts-item {
  background: var(--surface-panel);
  border: var(--border-line);
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  font: inherit;
  text-align: left;
  border-radius: var(--radius-sharp);
}
.ts-item:hover {
  border-color: var(--accent-phosphor);
  background: var(--surface-raised);
  box-shadow: 0 0 16px rgba(80, 220, 130, 0.15);
}
.ts-item.primary {
  border-color: var(--accent-phosphor);
  background: var(--surface-raised);
  box-shadow: inset 3px 0 0 var(--accent-phosphor);
  padding-left: 16px;
}
.ts-item-key {
  font-size: 10px;
  color: var(--accent-phosphor);
  background: var(--surface-deep);
  border: 1px solid var(--accent-phosphor);
  padding: 2px 6px;
  min-width: 18px;
  text-align: center;
  border-radius: var(--radius-sharp);
}
.ts-item-label {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
  letter-spacing: 2px;
  flex: 1;
}
.ts-item-meta {
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 1px;
}
.ts-item.dim,
.ts-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ts-item.dim .ts-item-key { color: var(--text-dim); border-color: var(--text-dim); }
.ts-item:disabled:hover {
  border-color: var(--border-line);
  background: var(--surface-panel);
  box-shadow: none;
}

.ts-foot {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 36px;
  background: var(--surface-panel);
  border-top: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 24px;
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 2px;
}
.ts-foot .group { display: flex; gap: 14px; align-items: center; }
.ts-foot .key {
  background: var(--surface-deep);
  border: var(--border-line);
  color: var(--accent-phosphor);
  padding: 2px 5px;
  letter-spacing: 0;
}
.ts-foot .build { margin-left: auto; color: var(--text-dim); }

@media (max-width: 760px) {
  .ts-title { left: 24px; top: 30%; transform: none; }
  .ts-menu { left: 24px; right: 24px; top: auto; bottom: 80px; transform: none; min-width: 0; }
  .ts-uplink { font-size: 9px; }
}
```

- [ ] **Step 3: Reference `title-screen.css` in `site/index.html`**

After `modals.css`:

```html
<link rel="stylesheet" href="/styles/title-screen.css" />
```

- [ ] **Step 4: Build + manual visual check**

Temporarily remove the `hidden` attribute on `#title-screen` in `site/index.html` to make the title screen visible. Run: `cd site && npm run dev`. Open `http://localhost:5600/`. Verify visual matches the brainstorm mockup: bracketed corners, sweep animation, boot text, blinking cursor, pulsing UPLINK dot, big REMOTE COMMAND title (COMMAND in phosphor glow), menu items, build stamp at bottom.

Re-add the `hidden` attribute when done.

- [ ] **Step 5: Smoke + commit**

Run: `cd site && npm run test:smoke`. The title screen is hidden so smoke is unaffected.

```bash
git add site/index.html site/styles/title-screen.css
git commit -m "redesign: title screen markup + CSS (boot terminal, menu, sweep)"
```

---

### Task 14: Title screen — JS (boot, menu, restore-session, show/hide)

**Files:**
- Create: `site/js/title-screen.js`
- Modify: `site/js/init.js` or `site/js/main.js` (import + call title-screen mount on app boot)

- [ ] **Step 1: Create `site/js/title-screen.js`**

```js
// site/js/title-screen.js — Title screen show/hide, menu wiring

const TITLE_EL_ID = 'title-screen';

function $(id) { return document.getElementById(id); }

export function show() {
  const el = $(TITLE_EL_ID);
  if (!el) return;
  el.removeAttribute('hidden');
  refreshResume();
  refreshOperator();
  refreshBuild();
  startUtcTick();
  focusMenu();
}

export function hide() {
  const el = $(TITLE_EL_ID);
  if (!el) return;
  el.setAttribute('hidden', '');
  stopUtcTick();
}

function refreshResume() {
  const resumeBtn = $('ts-resume');
  const meta = $('ts-resume-meta');
  if (!resumeBtn) return;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('rc9.save') || 'null'); } catch {}
  if (saved && saved.round != null) {
    resumeBtn.removeAttribute('hidden');
    if (meta) meta.textContent = `ROUND ${String(saved.round).padStart(2, '0')}`;
  } else {
    resumeBtn.setAttribute('hidden', '');
  }
}

function refreshOperator() {
  const opEl = $('ts-op');
  if (!opEl) return;
  let name = 'OPERATOR';
  try {
    const stored = localStorage.getItem('rc9.callsign.slot.0') || localStorage.getItem('rc9.player.name.0');
    if (stored && stored.trim()) name = stored.trim().toUpperCase();
  } catch {}
  opEl.textContent = `OP // ${name}`;
}

function refreshBuild() {
  const el = $('ts-build');
  if (!el) return;
  // Vite injects these at build time via define{} in vite.config.js
  const v = (typeof __BUILD_VERSION__ !== 'undefined') ? __BUILD_VERSION__ : '0.0.0';
  const h = (typeof __BUILD_HASH__ !== 'undefined') ? __BUILD_HASH__ : 'dev';
  const d = (typeof __BUILD_DATE__ !== 'undefined') ? __BUILD_DATE__.slice(0, 10) : '';
  el.textContent = `RC-9 v${v} · build ${h}${d ? ' · ' + d : ''}`;
}

let utcTimer = null;
function startUtcTick() {
  const el = $('ts-utc');
  if (!el) return;
  function tick() {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    el.textContent = `UTC ${hh}:${mm}:${ss}`;
  }
  tick();
  utcTimer = setInterval(tick, 1000);
}
function stopUtcTick() { if (utcTimer) { clearInterval(utcTimer); utcTimer = null; } }

function focusMenu() {
  const first = document.querySelector('#title-screen .ts-item:not([hidden]):not(:disabled)');
  if (first) first.focus({ preventScroll: true });
}

function actionFor(menuItem) {
  return menuItem?.dataset?.action;
}

function handleAction(action) {
  switch (action) {
    case 'new': {
      hide();
      const dlg = document.getElementById('new-game-modal');
      dlg?.showModal?.();
      break;
    }
    case 'resume': {
      hide();
      // Existing save-resume hook
      const btn = document.getElementById('resume-saved-button');
      btn?.click?.();
      break;
    }
    case 'briefing': {
      window.location.href = '/help';
      break;
    }
    case 'archive': /* disabled */ break;
  }
}

function bindMenu() {
  document.querySelectorAll('#title-screen .ts-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      handleAction(actionFor(btn));
    });
  });
  document.addEventListener('keydown', (e) => {
    const el = $(TITLE_EL_ID);
    if (!el || el.hasAttribute('hidden')) return;
    const items = Array.from(document.querySelectorAll('#title-screen .ts-item:not([hidden]):not(:disabled)'));
    if (!items.length) return;
    const idx = items.findIndex(i => i === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(idx + 1) % items.length] || items[0];
      next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length] || items[items.length - 1];
      prev.focus();
    } else if (e.key === 'Enter') {
      if (document.activeElement?.classList?.contains('ts-item')) {
        e.preventDefault();
        handleAction(actionFor(document.activeElement));
      }
    } else {
      // Letter-key shortcuts (N/R/B/A)
      const k = e.key.toUpperCase();
      const target = items.find(i => i.dataset.key === k);
      if (target) {
        e.preventDefault();
        handleAction(actionFor(target));
      }
    }
  });
}

export function mount() {
  bindMenu();
  // Decide whether to show: honor existing "restore last session" toggle
  let restore = false;
  try { restore = localStorage.getItem('rc9.restoreLastSession') === '1'; } catch {}
  let hasSave = false;
  try { hasSave = !!localStorage.getItem('rc9.save'); } catch {}
  if (restore && hasSave) {
    // Skip title — let existing app boot continue into saved state
    return;
  }
  show();
}
```

- [ ] **Step 2: Mount on app boot**

In `site/js/init.js` (or whatever the entry module is — check `site/index.html` `<script type="module" src="...">`):

Add at the top:
```js
import * as TitleScreen from './title-screen.js';
```

After the existing game-init / DOM-ready code, add:
```js
TitleScreen.mount();
```

If the existing init blocks gameplay until a New Game starts, no change needed beyond mounting. If it auto-starts a game, defer the auto-start until after the title screen is dismissed (only when restore-session is not enabled).

- [ ] **Step 3: Wire Engagement Report's "RETURN TO COMMAND" to title screen**

Edit the Task 12 button handler:

```js
import { show as showTitleScreen } from './title-screen.js'; // top of file

document.getElementById('er-return')?.addEventListener('click', () => {
  document.getElementById('game-over-modal').close?.();
  showTitleScreen();
});
```

- [ ] **Step 4: Confirm `rc9.save` key matches the existing save format**

Run: `grep -rn "rc9\.save\|localStorage.setItem.*save\|JSON.stringify.*tanks" site/js/ | head`
If the existing save key differs (e.g., it's `"save"` or `"se_game_state"`), update `refreshResume()` and the `hasSave` check in `mount()` to use the real key. **Do not invent a new key — find the existing one.**

If a per-round counter isn't stored in the save object, fall back to displaying `ROUND —` or hide the meta text.

- [ ] **Step 5: Build + manually verify the full title-screen flow**

Run: `cd site && npm run dev`. Hard-reload `http://localhost:5600/`. Expect:
- Title screen visible.
- UTC ticks every second.
- Build stamp at bottom shows version + hash + date.
- Resume button hidden (no save yet).
- N key opens Briefing modal; closing Briefing returns user to the title screen.
- B key navigates to `/help`.
- Arrow keys cycle focus; Enter activates.
- ESC does nothing (title can't be "closed" — there's nothing behind it).

Start a new game from the Briefing → confirm game runs. End the game (use Debug). Click "RETURN TO COMMAND" on Engagement Report → title screen reappears, with Resume button now visible.

Toggle "Restore last session on launch" in Options → reload → confirm the title screen is skipped and the saved state resumes.

- [ ] **Step 6: Smoke test**

Update `site/tests/smoke/gameplay.smoke.spec.js` to dismiss the title screen before running existing game assertions. Simplest approach: set `localStorage.setItem('rc9.restoreLastSession', '1')` and seed a save before the test runs, so the title screen is skipped:

```js
await page.addInitScript(() => {
  localStorage.setItem('rc9.restoreLastSession', '1');
  localStorage.setItem('rc9.save', JSON.stringify({ round: 1, tanks: [] }));
});
```

Alternatively, click NEW ENGAGEMENT before existing assertions:
```js
await page.locator('#title-screen .ts-item[data-action="new"]').click();
```

Run: `cd site && npm run test:smoke`. Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add site/js/title-screen.js site/js/init.js site/js/main.js site/js/game-victory.js site/tests/smoke/gameplay.smoke.spec.js
git commit -m "redesign: title screen wiring (boot, menu, key nav, restore-session, return-to-command)"
```

---

### Task 15: Canvas overlays container + diegetic corner readouts

**Files:**
- Create: `site/styles/canvas-overlays.css`
- Create: `site/js/canvas-overlays.js`
- Modify: `site/index.html` (load canvas-overlays.css, add overlay container markup, load canvas-overlays.js via main entry)
- Modify: `site/js/game.js` (call `CanvasOverlays.update(...)` per render frame)

- [ ] **Step 1: Add overlay container markup to `#game-container` in `site/index.html`**

Inside `<div id="game-container">`, after `<canvas id="game-canvas"></canvas>`, before `<div id="fx-overlay">`, add:

```html
<div id="canvas-overlays" aria-hidden="true" style="pointer-events:none">
  <div id="co-grid" class="co-grid"></div>
  <div id="co-corner-tl" class="co-corner tl">RC-9 // SECTOR 00</div>
  <div id="co-corner-tr" class="co-corner tr">ROUND 00</div>
</div>
```

- [ ] **Step 2: Create `site/styles/canvas-overlays.css`**

```css
/* site/styles/canvas-overlays.css — Diegetic in-canvas readouts */

#canvas-overlays {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5; /* above canvas, below #fx-overlay (1000) */
  font-family: var(--font-mono);
}

.co-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
  opacity: 0.35;
  display: none; /* enabled by .co-grid.show */
}
.co-grid.show { display: block; }

/* Theme tints for grid (set on parent via [data-theme]) */
#canvas-overlays[data-theme="mars"] .co-grid {
  background-image:
    linear-gradient(rgba(255, 85, 68, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 85, 68, 0.06) 1px, transparent 1px);
}
#canvas-overlays[data-theme="ocean"] .co-grid {
  background-image:
    linear-gradient(rgba(77, 159, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77, 159, 255, 0.08) 1px, transparent 1px);
}
#canvas-overlays[data-theme="cave"] .co-grid { opacity: 0.2; }

.co-corner {
  position: absolute;
  font-size: 10px;
  color: var(--accent-phosphor);
  letter-spacing: 2px;
  opacity: 0.7;
  text-transform: uppercase;
}
.co-corner.tl { top: 14px; left: 18px; }
.co-corner.tr { top: 14px; right: 18px; }

#canvas-overlays[data-theme="mars"] .co-corner { color: var(--accent-hot); }
#canvas-overlays[data-theme="ocean"] .co-corner { color: var(--accent-signal); }

/* Streamer-mode toggle hides corner readouts */
#canvas-overlays.streamer-mode .co-corner { display: none; }
```

- [ ] **Step 3: Reference canvas-overlays.css in `site/index.html`**

After `title-screen.css`:

```html
<link rel="stylesheet" href="/styles/canvas-overlays.css" />
```

- [ ] **Step 4: Create `site/js/canvas-overlays.js`**

```js
// site/js/canvas-overlays.js — Manages diegetic in-canvas DOM overlays

const container = () => document.getElementById('canvas-overlays');
const tl = () => document.getElementById('co-corner-tl');
const tr = () => document.getElementById('co-corner-tr');
const grid = () => document.getElementById('co-grid');

export function setTheme(themeName) {
  const c = container();
  if (!c) return;
  if (themeName) c.setAttribute('data-theme', themeName);
  else c.removeAttribute('data-theme');
}

export function setGridVisible(on) {
  const g = grid();
  if (!g) return;
  g.classList.toggle('show', !!on);
}

export function setStreamerMode(on) {
  const c = container();
  if (!c) return;
  c.classList.toggle('streamer-mode', !!on);
}

export function updateCorners({ sector, round, activeCallsign, roundLimit } = {}) {
  const tlEl = tl();
  const trEl = tr();
  if (tlEl) {
    const sectorStr = String(sector ?? 0).padStart(2, '0');
    tlEl.textContent = `RC-9 // SECTOR ${sectorStr}`;
  }
  if (trEl) {
    const roundStr = String(round ?? 0).padStart(2, '0');
    if (roundLimit) {
      trEl.textContent = `ROUND ${roundStr} / ${roundLimit}`;
    } else if (activeCallsign) {
      trEl.textContent = `ROUND ${roundStr} · ${String(activeCallsign).toUpperCase()}`;
    } else {
      trEl.textContent = `ROUND ${roundStr}`;
    }
  }
}
```

- [ ] **Step 5: Wire calls from `site/js/game.js`**

Find the game render/update loop and the per-turn handler. Add imports at the top of `game.js`:

```js
import * as Overlays from './canvas-overlays.js';
```

When a new game starts, set the theme:

```js
// In the game-start / terrain-init code
Overlays.setTheme(this.terrain?.theme || null); // 'forest', 'mars', 'ocean', etc.
Overlays.setGridVisible(true);
```

When streamer mode toggle changes (search `disable-names` or `streamerMode` in `main.js`):

```js
Overlays.setStreamerMode(checked);
```

Per turn (search `nextTurn` in `game.js`):

```js
Overlays.updateCorners({
  sector: this.terrainSectorId || this.round || 0,
  round: this.round || 0,
  activeCallsign: this.getCurrentTank()?.name || null,
  roundLimit: this.roundLimit || null,
});
```

(Use whichever round / sector properties already exist on the Game instance.)

- [ ] **Step 6: Build + visually verify**

Run: `cd site && npm run dev`. Start a Forest game. Confirm: top-left shows "RC-9 // SECTOR 00", top-right shows "ROUND 00 · CALLSIGN". Switch to Mars / Ocean themes (new game) → grid tints red / blue, corner text color tints accordingly. Toggle streamer mode → corners disappear.

- [ ] **Step 7: Smoke + commit**

Run: `cd site && npm run test:smoke`. Expected: passes.

```bash
git add site/index.html site/styles/canvas-overlays.css site/js/canvas-overlays.js site/js/game.js site/js/main.js
git commit -m "redesign(phase-2): diegetic canvas overlays — corner readouts + theme-tinted scan grid"
```

---

### Task 16: Tank label tags in canvas (Phase 2)

**Files:**
- Modify: `site/js/game.js` (tank label rendering inside the render loop)

The current code draws floating `@trooper1` monospace text near each tank. Replace with a framed callsign + HP tag.

- [ ] **Step 1: Find the current label-draw code**

Run: `grep -nE "fillText.*tank\.name|tank.*name.*fillText|trooper" site/js/game.js` to locate the render block.

- [ ] **Step 2: Replace the label-draw block**

The new function (drop-in replacement):

```js
function drawTankLabel(ctx, tank, opts = {}) {
  if (!tank || tank.dead) return;
  const isOcean = !!opts.isOcean;
  const isEnemy = !!opts.isEnemy;
  const color = isOcean ? '#4d9fff' : isEnemy ? '#ff5544' : '#50dc82';
  ctx.save();
  ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'alphabetic';
  const nameTxt = String(tank.name || '').toUpperCase();
  const sepTxt = ' · ';
  const hpTxt = String(Math.max(0, Math.round(tank.health)));
  const fullText = nameTxt + sepTxt + hpTxt;
  const metrics = ctx.measureText(fullText);
  const padX = 5;
  const padY = 2;
  const w = Math.ceil(metrics.width + padX * 2);
  const h = 14;
  const x = Math.round(tank.x - w / 2);
  const y = Math.round(tank.y - 32);
  // Connector tick from tank to label
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tank.x, tank.y - 18);
  ctx.lineTo(tank.x, y + h);
  ctx.stroke();
  // Background
  ctx.fillStyle = 'rgba(13, 20, 16, 0.85)';
  ctx.fillRect(x, y, w, h);
  // Border
  ctx.strokeStyle = color;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Text — name + sep in color, HP in white
  const nameW = ctx.measureText(nameTxt).width;
  const sepW = ctx.measureText(sepTxt).width;
  ctx.fillStyle = color;
  ctx.fillText(nameTxt, x + padX, y + h - padY - 1);
  ctx.fillText(sepTxt, x + padX + nameW, y + h - padY - 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(hpTxt, x + padX + nameW + sepW, y + h - padY - 1);
  ctx.restore();
}
```

Replace the existing label-draw lines with a call to `drawTankLabel(this.ctx, tank, { isOcean: this.terrain?._isOceanTerrain, isEnemy: tank !== this.getCurrentTank() });`.

For Phase 2, treat "isEnemy" as `tank !== this.getCurrentTank()` — every tank that isn't yours is enemy-colored. (Teams logic could refine later.)

- [ ] **Step 3: Verify font is loaded before first draw**

The `@fontsource` import in CSS triggers font fetch but the canvas may try to draw before the font is ready. Force a font load:

In `site/js/init.js`, after the existing DOM-ready handler:

```js
if (document.fonts && document.fonts.load) {
  document.fonts.load('500 10px "JetBrains Mono"').catch(() => {});
}
```

- [ ] **Step 4: Build + visually verify**

Run: `cd site && npm run dev`. Start a 2-player Forest game. Confirm each tank shows a bordered label tag above it (phosphor for player tank, hot-red for opponent), with a connector tick down to the tank. Take damage — HP value updates.

Switch to Ocean — confirm labels are signal-blue.

Confirm no overlap regressions when 8 tanks crowd a small area (Solo mode helps test).

- [ ] **Step 5: Smoke + commit**

Run: `cd site && npm run test:smoke`. Expected: passes.

```bash
git add site/js/game.js site/js/init.js
git commit -m "redesign(phase-2): canvas tank labels — framed callsign + HP, friend/foe color, theme tint"
```

---

### Task 17: Trajectory restyle (Phase 2)

**Files:**
- Modify: `site/js/game-physics.js` (`drawTrajectoryGuide` per CLAUDE.md location reference)

- [ ] **Step 1: Find the current trajectory-draw code**

Run: `grep -n "drawTrajectoryGuide\|trajectory" site/js/game-physics.js site/js/game.js | head`.

- [ ] **Step 2: Replace dot rendering with dashed phosphor + opacity ramp**

The new logic for each predicted point:

```js
function drawTrajectoryDot(ctx, x, y, t, totalSteps, themeTint = '#50dc82') {
  // Opacity ramp — faint→bright→peak→fade across the arc
  const norm = totalSteps > 1 ? (t / (totalSteps - 1)) : 0; // 0..1
  // bell curve, peaks mid-arc
  const op = Math.max(0.15, 1 - Math.abs(norm - 0.55) * 1.8);
  // Sample every other step → dashed appearance
  if (t % 2 !== 0) return;
  ctx.save();
  ctx.globalAlpha = op;
  ctx.fillStyle = themeTint;
  ctx.shadowColor = themeTint;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

Inside `drawTrajectoryGuide()`, choose tint from theme:

```js
const themeTint = this.terrain?._isOceanTerrain ? '#4d9fff'
  : (this.terrain?.theme === 'mars') ? '#ff5544'
  : '#50dc82';
```

Iterate over predicted points (existing simulation loop), and for each call `drawTrajectoryDot(ctx, x, y, i, points.length, themeTint)`.

- [ ] **Step 3: Build + visually verify**

Run: `cd site && npm run dev`. Enable trajectory guide (Debug → Trajectory). Aim a shot. Confirm dashed-phosphor dots with bright peak and faint ends. Switch terrain → tint changes.

- [ ] **Step 4: Smoke + commit**

Run: `cd site && npm run test:smoke`. Expected: passes.

```bash
git add site/js/game-physics.js
git commit -m "redesign(phase-2): trajectory dots — dashed phosphor with opacity ramp + theme tint"
```

---

### Task 18: Impact reticle (Phase 2)

**Files:**
- Modify: `site/js/game-physics.js` (where `drawTrajectoryGuide` draws the impact point)

The current code draws a red dot at the predicted impact point. Replace with a tactical reticle + mono label.

- [ ] **Step 1: Replace the impact-point draw block**

After the trajectory-dot loop, find the impact-marker draw. Replace with:

```js
function drawImpactReticle(ctx, x, y, label = '') {
  ctx.save();
  ctx.strokeStyle = '#ff5544';
  ctx.fillStyle = '#ff5544';
  ctx.lineWidth = 1;
  // Outer circle
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.stroke();
  // Crosshair
  ctx.beginPath();
  ctx.moveTo(x - 12, y); ctx.lineTo(x - 4, y);
  ctx.moveTo(x + 4, y); ctx.lineTo(x + 12, y);
  ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 4);
  ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 12);
  ctx.stroke();
  // Label above
  if (label) {
    ctx.font = '500 9px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = '#ff5544';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 18);
  }
  ctx.restore();
}
```

Call: `drawImpactReticle(ctx, impactX, impactY, '');` (no damage estimate for now — adding the estimate would require physics access; mark as TODO if you want to surface it later in Phase 4).

- [ ] **Step 2: Build + visually verify**

Run: `cd site && npm run dev`. Enable trajectory guide. Aim. Confirm reticle (1px hot circle + crosshair) at predicted impact.

- [ ] **Step 3: Smoke + commit**

Run: `cd site && npm run test:smoke`. Expected: passes.

```bash
git add site/js/game-physics.js
git commit -m "redesign(phase-2): impact reticle — hot circle + crosshair at trajectory landing"
```

---

### Task 19: Damage popups (Phase 2)

**Files:**
- Modify: `site/js/projectile.js` (emit popup event on hit)
- Modify: `site/js/game.js` (render canvas-drawn popups in the render loop)

Use canvas-drawn popups (simpler — no DOM lifecycle to manage). They live in a Phase 2-only `damagePopups` array on the Game instance.

- [ ] **Step 1: Add `damagePopups` array + emit on hit**

In `site/js/game.js` constructor:

```js
this.damagePopups = []; // { x, y, amount, color, startedAt }
```

Add a method on the Game class:

```js
spawnDamagePopup(x, y, amount, opts = {}) {
  if (!Number.isFinite(amount) || amount === 0) return;
  this.damagePopups.push({
    x, y,
    amount: Math.round(amount),
    color: opts.color || (amount > 0 ? '#ff5544' : '#50dc82'),
    startedAt: performance.now(),
  });
}
```

In `site/js/projectile.js` where damage is applied to a tank (search `tank.health -=` or `applyDamage`), add a call:

```js
// after damage applied
const game = globalThis.__SE_GAME__;
if (game?.spawnDamagePopup) game.spawnDamagePopup(tank.x, tank.y - 22, damageAmount);
```

**Sign convention:** This plan assumes positive `damageAmount` = damage taken (rendered as `−N` in red). Negative = healing (rendered as `+N` in phosphor). Check the actual sign at the call site — if `tank.health -= damageAmount` uses positive for damage, the convention matches. If `damageAmount` is already signed differently, flip the sign before passing.

- [ ] **Step 2: Render popups in the game render loop**

In `site/js/game.js` `render()`, after tanks/labels but before HUD chrome:

```js
// Damage popups — drift up + fade over 600ms
const now = performance.now();
this.damagePopups = this.damagePopups.filter(p => {
  const age = now - p.startedAt;
  if (age > 600) return false;
  const t = age / 600;
  const drift = 30 * t;
  const op = 1 - t;
  this.ctx.save();
  this.ctx.globalAlpha = op;
  this.ctx.fillStyle = p.color;
  this.ctx.font = '700 18px "Saira Condensed", "Oswald", system-ui, sans-serif';
  this.ctx.textAlign = 'center';
  this.ctx.shadowColor = p.color;
  this.ctx.shadowBlur = 6;
  const sign = p.amount > 0 ? '−' : '+';
  this.ctx.fillText(`${sign}${Math.abs(p.amount)}`, p.x, p.y - drift);
  this.ctx.restore();
  return true;
});
```

- [ ] **Step 3: Verify Saira Condensed is loaded before first popup**

In `site/js/init.js`:

```js
if (document.fonts && document.fonts.load) {
  document.fonts.load('700 18px "Saira Condensed"').catch(() => {});
}
```

- [ ] **Step 4: Build + visually verify**

Run: `cd site && npm run dev`. Start Classic 2-player game. Fire at the opponent and land a hit. Confirm:
- A hot-red `−<N>` number appears at the impact location.
- It drifts upward 30px and fades over ~600ms.
- Sequential hits stack visually without flicker.

- [ ] **Step 5: Smoke + commit**

Run: `cd site && npm run test:smoke`. Expected: passes.

```bash
git add site/js/game.js site/js/projectile.js
git commit -m "redesign(phase-2): canvas damage popups — Saira Condensed, drift+fade over 600ms"
```

---

### Task 20: Final acceptance pass

**Files:**
- (None modified — verification + minor cleanup as needed.)

- [ ] **Step 1: Smoke test**

Run: `cd site && npm run test:smoke`
Expected: passes.

- [ ] **Step 2: Build the production bundle and check bundle size budget**

Run: `cd site && npm run build`
Expected: build succeeds.

Run: `cd site && node scripts/check-bundle-size.js`
Expected: passes existing thresholds.

Run: `du -sh site/dist/assets/*.woff2 site/dist/assets/*.css | sort -h`
Expected: total of new CSS + 4 WOFF2 files ≤ 120KB combined.

- [ ] **Step 3: Lighthouse check**

Run: `cd site && npm run dev`, then `cd site && npm run lighthouse` (writes report to `site/lighthouse-report.html`).

Open the report. Expected: Performance, Accessibility, Best Practices, SEO categories all stay within 5 points of the pre-redesign baseline. If any score drops materially, investigate (likely culprits: font loading, layout shift, contrast).

- [ ] **Step 4: Manual playtest matrix**

Open `http://localhost:5600/`. Run each scenario end-to-end:

| Theme | Mode | Verify |
|---|---|---|
| Forest | Classic 2-player | New Engagement → game → game over → Engagement Report → Return to Command → title screen |
| Ocean | Classic 2-player | Tank labels signal-blue; trajectory + reticle signal-blue; underwater weapons enabled |
| Mars | Solo (target practice) | Corner readouts hot-red tinted; grid tints red |
| Moon | Teams 2×2 | Team color tank labels render; AI takes turns |
| Cave | Realtime | Dim grid; no turn-based UI; game plays |
| Random | Classic 4-player | Random theme picks; everything still works |

Also verify:
- Mobile: open with browser devtools mobile emulator; HUD reflows; touch joystick and fire button visible; angle dial appears.
- Streamer mode: enable in Briefing → confirm tank labels (other tanks) and corner readouts are hidden.
- Restore-last-session toggle: enable → reload → title skipped, game resumes.

- [ ] **Step 5: Spec-driven acceptance criteria checklist**

Open `docs/superpowers/specs/2026-05-19-game-redesign-design.md` → Phase 1 + 2 acceptance criteria section. Tick each box. If any are missed, file a follow-up task or fix inline.

- [ ] **Step 6: Final commit (only if any fixes were needed during verification)**

```bash
git add -A
git commit -m "redesign: final acceptance pass + polish"
```

- [ ] **Step 7: Tag the release**

```bash
git tag -a v2.1.0-redesign -m "Tactical Command visual redesign (Phase 1+2)"
git push origin main --tags
```

Cloudflare auto-deploys from `main`. Confirm the live site at `https://rc-9.com/` shows the redesign within a few minutes.

---

## Open questions surfaced during planning

- **Existing save-key name**: Task 14 Step 4 explicitly checks for the real key — do not invent. If the discovery shows the project uses a different key than `rc9.save`, update Task 14's `mount()` accordingly.
- **Damage popup sign convention**: Task 19 Step 1 asks the implementer to verify positive `damageAmount` = damage taken. If the projectile.js call site uses the opposite convention, flip the sign before passing to `spawnDamagePopup`.
- **`#setup-static-time` placement**: Task 9 puts the static-time checkbox inside the Terrain panel, and Task 11 explicitly does NOT duplicate it in the Options panel. If during implementation it feels awkward in Terrain (it's about time, not terrain), move it to Options and remove the Terrain version — one location, not two.
