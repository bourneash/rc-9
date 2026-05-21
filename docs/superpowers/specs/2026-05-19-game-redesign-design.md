# Remote Command — Visual Redesign Design

**Date:** 2026-05-19
**Status:** Awaiting user review
**Author:** Jesse (with Claude)
**Repo:** `bourneash/rc-9` (private), deployed via Cloudflare Workers + static-assets
**Brainstorm artifacts:** mockups at `.superpowers/brainstorm/3047312-1779231895/content/` (files `01-tokens.html` through `05-canvas.html`). Directory is gitignored — mockups live locally only. Implementation plan should reference this spec's text for binding requirements; mockups are supplementary visual reference.

---

## Context

`rc-9.com` is a vanilla-JS browser artillery tank game built on Vite 7, PixiJS 8, GSAP, and Howler. The current visual treatment is a generic "dark + cyan/red neon" aesthetic with simple gradient terrain, monospace floating name tags, and stock browser-modal styling. It reads as 2016 indie web-game.

The codebase post-cleanup (see `2026-05-17-rc-9-cleanup-and-security-design.md`) has `game.js` split into focused modules (`game-physics.js`, `game-state.js`, `game-ai.js`, `game-victory.js`) and a single global game accessor (`globalThis.__SE_GAME__`). HUD chrome is DOM/CSS; gameplay is HTML5 canvas with PixiJS post-FX overlay (`#fx-overlay`).

This redesign replaces the visual layer **without changing game logic**. It is a presentation-layer rewrite.

---

## Goals

1. **Establish a coherent visual identity** — "Tactical Command" — that fits the brand (callsign RC-9, name "Remote Command") and differentiates the site from every other browser artillery game.
2. **Modernize every player-visible surface**: HUD chrome, modals, title screen, and in-canvas overlays.
3. **Add a real title screen / main menu** (currently missing — the game dumps straight onto canvas).
4. **Preserve theme variety** — Forest / Desert / Canyon / Arctic / Ocean / Cave / Moon / Mars / Futuristic should remain visually distinct, with the tactical layer applied as an overlay, not a replacement.
5. **Ship in phases**: Phase 1 + 2 together as a single ~1-week release delivering ~85% of the perceived upgrade. Phases 3 + 4 ship as later polish patches.
6. **No regressions** to game logic, save format, mobile touch UX, accessibility (sr-only h1, ARIA labels), or SEO.

## Non-Goals (explicit out-of-scope)

- Gameplay changes: no new weapons, modes, terrain types, or balance edits.
- Engine changes: no Pixi → other-renderer swap; no terrain-rendering rewrite (Phase 4 may add atmospheric overlays but stops short of replacing terrain).
- Save format changes: existing localStorage save must continue to load.
- Mobile-specific redesign beyond what reflows naturally from the desktop work (the existing joystick and angle dial keep their behavior; they just inherit the new visual language).
- Sound design changes (Howler stays).
- Replacing the help page styling (`site/help.html` keeps its current standalone styling for SEO purposes; revisit later if needed).
- A new logo / wordmark beyond the typographic "REMOTE COMMAND" treatment in Saira Condensed.
- New copy / writing across the game (existing victory messages, weapon names, etc., are kept).

---

## Aesthetic Direction — Tactical Command

The visual language is **military command terminal**: phosphor-green primary, sharp 2px corners, monospaced HUD readouts, 1px hairline borders, corner brackets framing live combat state, diegetic in-canvas readouts.

**Why this direction (decided in brainstorm):** The domain is `rc-9.com` and the game is called "Remote Command." A tactical-terminal aesthetic is not a costume — it is the brand. Functional UI (stats, weapon picker, wind indicator) becomes diegetic, not generic overlays. Sidesteps the "browser artillery = Worms-clone" visual category entirely.

The aesthetic is **applied with restraint**:
- Sharp corners are the default; soft corners (6px) appear sparingly on player-friendly buttons.
- Phosphor glow is a token used on focus, hover, and live indicators — never on static text.
- Themes (Mars, Ocean, etc.) keep their identity; the tactical layer is overlaid, not replaced.

---

## Design Tokens

CSS custom properties exposed at `:root` and consumed by every surface. Final values:

```css
:root {
  /* Surfaces */
  --surface-ink: #0a0f08;          /* page / canvas background */
  --surface-panel: #0d1410;         /* HUD bars, modals */
  --surface-raised: #142018;        /* hover, selected rows */
  --surface-deep: #050a06;          /* slider tracks, recessed elements */

  /* Accents */
  --accent-phosphor: #50dc82;       /* primary, friendly, alive */
  --accent-amber: #ffb000;          /* warnings, secondary alerts */
  --accent-hot: #ff5544;            /* FIRE, critical, enemy */
  --accent-signal: #4d9fff;         /* wind, info, water/underwater */

  /* Text */
  --text-primary: #e8f5ec;          /* headings, key readouts */
  --text-body: #c5d2c8;             /* default body copy */
  --text-muted: #9fc4a8;            /* labels, captions */
  --text-dim: #5a7a64;              /* disabled, hints */

  /* Lines */
  --border-line: 1px solid #1a2a1c; /* default hairline */
  --border-phosphor: 1px solid var(--accent-phosphor);

  /* Typography */
  --font-display: 'Saira Condensed', 'Oswald', system-ui, sans-serif;
  --font-body: ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Radii */
  --radius-sharp: 2px;              /* default — military feel */
  --radius-soft: 6px;               /* used sparingly */

  /* FX */
  --glow-phosphor: 0 0 12px rgba(80, 220, 130, 0.4);
  --glow-hot: 0 0 16px rgba(255, 85, 68, 0.5);

  /* Grid overlay (used as background-image) */
  --grid-overlay:
    linear-gradient(rgba(80, 220, 130, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80, 220, 130, 0.06) 1px, transparent 1px);
  --grid-size: 24px 24px;
}
```

**Typography roles — three only:**
- **Display** (`--font-display`): Saira Condensed 700/600, tracked +1px. Used for titles, modal headers, FIRE button, big readouts. **Self-host via WOFF2** (no Google Fonts runtime fetch — CSP would block it anyway).
- **Body** (`--font-body`): system stack. Used for explanatory copy in modals and help blocks.
- **Readout** (`--font-mono`): JetBrains Mono 500, tabular numbers. Used for all HUD readouts, labels, callsigns, build stamps. **Self-host via WOFF2.**

**Self-hosting requirement:** the existing CSP at `site/dist/_headers` is `font-src 'self' data:`. Both Saira Condensed and JetBrains Mono ship in `site/public/fonts/` and are referenced via `@font-face` with `font-display: swap`.

---

## Section 1 — HUD Layout

The bottom controls bar, edge tabs, and weapon picker are the most-seen surfaces.

### Bottom controls bar (`#bottom-controls`)

Grid columns stay the same as today (`auto 1fr 1fr auto auto auto`) but each module becomes a bracketed panel:

- **Stats module** (HP / FUEL / WIND): three labeled mono readouts (`HP 100 · FUEL 100 · WIND +02.5`) inside a single panel with four corner brackets. WIND uses `--accent-amber`; values use `--text-primary`; labels use `--accent-phosphor` at 60% opacity.
- **Angle slider**: native `<input type="range">` restyled. 12px-tall track in `--surface-deep` with 1px `--border-line`, tick marks at 25/50/75% in `rgba(80,220,130,0.2)`. Fill: linear-gradient transparent→`--accent-phosphor`, with `--glow-phosphor` box-shadow. Knob: 3px wide × full-height-plus-3px, `--accent-phosphor`, glowing. Mono label above: `ANGLE` (left) + value with degree symbol (right, `--text-primary`).
- **Power slider**: identical treatment to angle, label `POWER`.
- **Drive button**: mono uppercase, 1px `--border-line` default. Active state: `--accent-signal` border + color + glow.
- **Weapon picker trigger**: panel with corner brackets, mono weapon name + ammo count, phosphor caret.
- **FIRE button**: the climax. `--accent-hot` background, white text, Saira Condensed 700, +4px tracking, leading `▶` glyph, `--glow-hot` box-shadow, 1px hot border. **Only red element on the screen** — when red appears, it's load-bearing.

### Edge tabs (`#options-tab`, `#debug-tab`, etc.)

Replace the existing cyan-bordered pills with quiet uppercase mono labels:
- Default state: `--surface-panel` background, `--border-line`, `--text-muted` text, 11px phosphor icon (▸ / ▣ / ≡ / ♪ / ↻).
- Hover: `--surface-raised` background, `--text-primary` text, phosphor icon text-shadow glow.
- Active (when its modal is open): 2px left border in `--accent-phosphor`, `--accent-phosphor` text, `--surface-raised` background.

Stacks vertically with shared border edges (only the last item gets a bottom border).

### Weapon menu (`#weapon-menu`)

Grid of square tiles (5 per row on desktop, 3 on mobile). Each tile:
- 1px `--border-line` default, `--surface-deep` background.
- Hover: `--accent-phosphor` border + `--surface-raised` background.
- Selected: `--accent-phosphor` border + `--surface-raised` background + inset phosphor glow shadow.
- **Locked** (water-only on land map, land-only on ocean map): opacity 0.25, cursor not-allowed, hover does nothing. The restriction icon stays visible — player reads "why" without a tooltip.
- Each tile shows: emoji icon (top-center), mono uppercase name (below), ammo count (top-right corner, mono).

### Diegetic canvas corners

Two small mono readouts overlaid inside the canvas (not in DOM HUD chrome):
- **Top-left**: `RC-9 // SECTOR 04` (sector number = game round counter, formatted 2-digit).
- **Top-right**: `ROUND <NN>` followed by either `/ <limit>` (if a round limit is configured) or `· <ACTIVE-CALLSIGN>` (no round limit — show whose turn it is). Falls back to `ROUND <NN>` alone if neither applies.

These are positioned absolutely inside `#game-container`, 14px from edges, `--accent-phosphor` at 70% opacity, mono 10px, +2px tracking. Hidden in fullscreen / streamer mode (already a toggle).

### Mobile

The existing joystick (`#joystick`) and angle dial (`#angle-dial`) inherit the same visual language: same border tokens, phosphor knob, tick marks on the dial. The floating mobile FIRE button (`#mobile-fire`) becomes the same `--accent-hot` treatment as desktop FIRE.

---

## Section 2 — Title Screen / Main Menu

**Currently:** the game loads directly onto the canvas with no opening moment.
**Now:** a title screen appears on first load (and on explicit "return to command" actions) before gameplay begins.

### Surface

A new full-viewport `<dialog id="title-screen">` (or full-screen `<div>` if `<dialog>` interferes with focus management) rendered before `#game-container` becomes active.

### Layout

- **Background**: `--surface-ink`, `--grid-overlay` background-image at 70% opacity, a low-opacity terrain silhouette at the bottom (clip-path matching one of the existing terrain themes, randomized per load).
- **Top-left**: typed boot sequence (5 lines, ~600ms total typing, terminates at "awaiting operator" with a blinking cursor). Skippable with any key:
  ```
  > CONNECT rc-9.command.net ............... OK
  > UPLINK handshake ........................ OK
  > TELEMETRY bus armed .................... OK
  > SECTOR table loaded ..................... OK
  > awaiting operator_
  ```
- **Top-right**: live block — `● UPLINK · LIVE` (pulsing dot animation), `UTC HH:MM:SS` (updates every second), `OP // <callsign>` (pulled from last-used callsign in localStorage, fallback `OPERATOR`).
- **Center-left**: title block — `CALLSIGN · RC-9` (mono small caps), then `REMOTE` on one line and `COMMAND` glowing phosphor on the next (Saira Condensed 700, 76px, line-height 0.92, +2px tracking), then subtitle `ARTILLERY · DESTRUCTIBLE TERRAIN · 1-8 OPS`.
- **Right side**: vertical menu (260px min-width):
  - `[N] NEW ENGAGEMENT` (primary, phosphor border + inset 3px phosphor left-bar)
  - `[R] RESUME LAST OP` (shown only when a saved game exists in localStorage; meta = saved round number)
  - `[B] BRIEFING` (links to existing `/help`)
  - `[A] ARCHIVE` (disabled / "SOON" — placeholder for future stats)
- **Bottom strip**: 36px tall, `--surface-panel`, mono 9px. Keyboard hints (`↑↓ NAVIGATE · ↵ SELECT · ESC EXIT`) plus build stamp (right-aligned: `RC-9 v<pkg.version> · build <gitHash> · <date>` — pulls from existing `__BUILD_VERSION__`, `__BUILD_HASH__`, `__BUILD_DATE__` injected via Vite).
- **Ambient motion**: a 2px-wide vertical phosphor scan-line drifts left→right every 8 seconds. Plus the cursor blink and the UPLINK dot pulse. That's it — calm, not busy.

### Behaviour

- **Keyboard-first**: N/R/B/A keys directly trigger menu items. Arrow keys + Enter as fallback. Mouse / touch works on everything.
- **Boot lines are skippable** with any key.
- **`RESUME LAST OP` is hidden when no save exists** (current "Resume Last Game" is always shown but disabled — change to fully hide).
- **Existing "Restore last session on launch" toggle** (already in Options modal) **is honored** — if enabled, the title screen is skipped entirely and the saved game state resumes immediately. Title screen is only for first-launch and explicit "return to command" actions from Engagement Report or the Options modal.

---

## Section 3 — Modals

### Modal chrome (shared)

Every modal — Briefing (new game), Engagement Report (game over), Volume, Restart, Options, Game Log, Debug — shares this chrome:

- `--surface-ink` background, 1px `--border-line` outer, `--grid-overlay` background-image at low opacity.
- **Title bar**: 12px × 18px padding, `--surface-panel` background, 1px bottom `--border-line`, four small corner brackets in `--accent-phosphor` (top-left + top-right only — the body's brackets handle the bottom).
  - Title: Saira Condensed 700, 18px, +3px tracking, body color `--text-primary`, the second word in `--accent-phosphor` (e.g., "OPERATIONAL **BRIEFING**", "ENGAGEMENT **REPORT**", "AUDIO **CONTROL**").
  - Subtitle: mono 10px, `--text-muted`, +2px tracking, fills available space.
  - **Close button**: small "ESC" pill (`--surface-deep`, `--border-line`, mono 10px). Hover: `--accent-hot` border + color.
- **Footer actions**: 12px × 18px padding, `--surface-panel` background, 1px top `--border-line`.

### Briefing — full redesign of `#new-game-modal`

The current setup modal is busy (~9 sections in one scroll). Redesign as a 2-column grid of bracketed panels, each labeled and numbered (01 / 06 → 06 / 06).

**Left column (1.4fr):**
1. **MODE** — 4 large tiles (CLASSIC / TEAMS / SOLO / REALTIME), icon + mono name + meta line. Selected tile gets phosphor border + inset bottom bar.
2. **TERRAIN** — 5×2 grid of small tiles, one per environment preset (FOREST, DESERT, CANYON, ARCTIC, OCEAN, CAVE, MOON, MARS, FUTURIST, RANDOM). Emoji icon + mono name. Selected tile gets phosphor border + inset phosphor glow.
3. **ROSTER** — slot stepper at top (`SLOTS [−] 04 [+]` with `MAX 8` hint). Below, a list of slot cards. Each slot: color swatch + callsign name (editable input) + HUMAN/AI radio toggle (pill style) + skill selector when AI is selected. Skill values map to the existing AI tiers: `SKILL · EASY` / `SKILL · MED` / `SKILL · HARD` (from `game-ai.js`).

**Right column (1fr):**
4. **WIND** — pill row: NONE / LOW / HIGH / RANDOM.
5. **TANK HEALTH** — pill row: 100 / 150 / 200 / 300.
6. **AMMO** — primary pill row (UNLIMITED / STANDARD / CUSTOM), secondary row beneath for preset restrictions (NO HEAVY / MISSILE ONLY / LASER ONLY). Custom ammo opens an inline grid below (existing per-weapon counts, restyled).
7. **OPTIONS** (not numbered — auxiliary): DRIVE ANYTIME / HIDE OTHER NAMES / STATIC TIME checkboxes. Checkbox: 12px square, `--border-line` default, `--border-phosphor` + filled checkmark when active.

**Footer:** `RESET ALL` (ghost danger-hover, left) · `[▶ START ENGAGEMENT]` (primary phosphor, right) · `CANCEL` (ghost, right).

**Tank callsigns:** rotating list of military callsigns (JAGUAR, VIPER, RAVEN, HAWK, COBRA, FALCON, GHOST, WOLF, OWL, BEAR — 10 total). New games start with the first N callsigns. Player can rename. Names persist to localStorage per-slot.

### Engagement Report — full redesign of `#game-over-modal`

- **Subtitle**: `ROUND COMPLETE · <N> TURNS · <duration>`.
- **Banner**: `VICTORY · OPERATOR` or `DEFEAT · ENEMY` or `TIE`, phosphor mono +6px tracking.
- **Winner**: Saira Condensed 700, 56px, `<NAME>` in `--accent-phosphor` with phosphor text-shadow + `STANDING` in `--text-primary`.
- **Tag line**: contextual message from existing `victory-messages.js` ("WHAT A NAIL-BITER!", etc.), mono 12px, +3px tracking.
- **Stats grid**: 4 columns (ROUNDS / HITS / DAMAGE / ACCURACY), each cell `--surface-ink` background separated by 1px gaps (looks like a debrief). Mono label + Saira Condensed value.
- **Actions**: `RETURN TO COMMAND` (ghost, goes to title screen) · `[▶ NEW ENGAGEMENT]` (primary, re-opens Briefing with same settings).

### Smaller modals (Volume, Restart, Game Log, Debug, Skip)

Share the title-bar + footer-actions template. Body content keeps its existing controls, restyled with the token system:
- Sliders → tactical tracks (same treatment as HUD angle/power).
- Buttons → ghost / primary variants.
- Lists / log → mono font, `--text-body` color, hairline row separators.

---

## Section 4 — In-Canvas Art

Canvas rendering changes layer the tactical look **on top of existing theme art** without replacing terrain or sky generation.

### Phase 2 (in-canvas overlays — same ship as Phases 1+2)

These are drawn from `js/game.js` render loop / from DOM elements positioned absolutely over `#game-canvas`:

1. **Diegetic corner readouts** (described above in HUD section) — absolutely positioned `<div>`s inside `#game-container`, not canvas-drawn.
2. **Scan-grid overlay** — a CSS `background-image` on a transparent `<div>` over `#game-canvas`, theme-tinted (phosphor for most themes, signal-blue for ocean, hot-red for Mars). Toggleable in Options.
3. **Tank label tags** — replace the current floating `@trooper1` monospace text with proper diegetic tags: 1px theme-tinted border, mono uppercase callsign + ` · ` + live HP, small connector tick to the tank. Rendered as canvas text on a 1-frame-cached layer.
4. **Trajectory restyle** — current trajectory dots become dashed phosphor pattern with opacity ramp (faint→bright→peak→fade). Color uses the same theme tint as the scan grid.
5. **Impact reticle** — when aiming, show a 16px circle + crosshair at the predicted impact point, hot-red, with a mono label above: `IMPACT · <damage-estimate>%`.
6. **Damage numbers** — when a hit lands, render the damage value in Saira Condensed 700, 18px, hot-red (or phosphor for self-damage / healing), drift upward 30px and fade over 600ms.

### Phase 3 (later polish patch)

7. **Tank sprite rewrite** — replace the current flag-style tank silhouette with a schematic-style sprite: 22×9 body + 10×5 turret + 14×2 barrel (canvas-drawn). Friend / foe / underwater coloring via outline color, not fill (color-blind safe because shape is identical).
8. **Explosion FX rewrite** — geometric impact effect: radial-gradient core + 1–2 expanding rings + 6 amber shards on 60° spokes. Reads as "impact" from any distance. Replaces the current GSAP/Pixi explosion.

### Phase 4 (optional final polish)

9. **Theme-tinted scan grids per theme** (Mars = red, Ocean = blue, Cave = dim phosphor, etc.).
10. **Parallax background layers** — 2–3 silhouette layers per theme that parallax with camera/aim.
11. **Sub-depth ocean lighting** — increasing blue darkness with depth.
12. **Day/night atmospheric tinting** — overlay color graded to time-of-day cycle.

---

## Files to Touch

### New files

```
site/styles/tokens.css                    Design token CSS custom properties
site/styles/typography.css                Font @font-face declarations + role classes
site/styles/hud.css                       Bottom controls bar, edge tabs, weapon menu
site/styles/title-screen.css              Title screen styles
site/styles/modals.css                    Shared modal chrome + per-modal variants
site/styles/canvas-overlays.css           Diegetic corner readouts + scan grid + tank tags
site/public/fonts/saira-condensed-{600,700}.woff2
site/public/fonts/jetbrains-mono-{400,500}.woff2
site/js/title-screen.js                   Title-screen show/hide, boot animation, menu wiring
site/js/canvas-overlays.js                Manage canvas-overlay DOM elements (corners, scan)
```

### Modified files

```
site/index.html                           Add title-screen markup, restructure HUD/modal markup
site/styles.css                           Replace inline color values with var(); reduce to glue
site/js/main.js                           Wire title-screen menu actions, weapon-menu tile renderer
site/js/game.js                           Trajectory restyle (Phase 2), tank labels (Phase 2)
site/js/projectile.js                     Damage popup emission (Phase 2)
site/dist/_headers                        No change (font-src 'self' already permits self-hosted fonts)
```

### Untouched

```
site/help.html                            Standalone styling kept (SEO reasons)
site/worker/index.js                      Affiliate cloak — no UI work
site/wrangler.jsonc                       Deploy config
.github/workflows/                        CI unchanged
```

---

## Phasing

| Phase | Scope | Visual impact | Effort estimate |
|---|---|---|---|
| **1** | Tokens + typography + HUD (Section 1) + modals (Section 3) + title screen (Section 2). Pure CSS / HTML / DOM. | ~70% of perceived modernization. | 2–3 days |
| **2** | Canvas overlays (Section 4 items 1–6): corner readouts, scan grid, tank tags, trajectory restyle, impact reticle, damage popups. | Big tactical-feel boost on top of Phase 1, zero risk to game logic. | 2–3 days |
| **3** | Tank sprite rewrite + geometric explosion FX (Section 4 items 7–8). | Game stops looking generic. | 2–4 days |
| **4 (opt)** | Theme-tinted grids, parallax background layers, sub-depth lighting, day/night tinting (Section 4 items 9–12). | Final polish — each theme feels intentional. | 3–5 days |

**Recommended release plan:** Phases 1 + 2 ship together as a single redesign release. That's ~85% of the perceived upgrade and zero risk to game logic (everything is presentation-layer). Phases 3 and 4 ship later as polish patches.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Font loading delays / FOIT | `font-display: swap`. System-stack fallbacks chosen to feel similar enough (`'Saira Condensed', 'Oswald', system-ui, sans-serif`). |
| Self-hosted fonts add bundle weight | Subset to Latin + numerals + key glyphs. WOFF2 only. Two weights per face. Expected total: ~80–100KB. |
| CSP blocks fonts | `font-src 'self' data:` already permits self-hosted. No CSP change needed. |
| Existing inline `style="..."` attributes on game DOM | Audit `site/index.html` for hardcoded colors; replace with var() refs or remove and move to CSS. |
| Mobile reflow breaks | Phase 1 includes a mobile reflow check on every modified surface before merge. |
| Title screen interferes with auto-resume | Honor existing "restore last session on launch" — if on, skip title entirely. Existing toggle, no new setting. |
| Canvas overlay DOM elements steal pointer events | All overlay containers use `pointer-events: none` by default; only interactive controls (none in Phase 2) opt-in. |
| Phase 2 changes (trajectory, tank labels, damage popups) regress AI/physics | All changes are draw-only — no physics or AI code touched. Smoke test passes confirm no regressions. |
| Pixi/GSAP version churn for Phase 3 explosion rewrite | Defer to Phase 3 patch; not in initial release. Existing FX keeps working. |
| Existing localStorage keys may collide with new "callsign per slot" data | Use new namespaced keys (e.g., `rc9.callsign.slot.<n>`); read existing player-name keys as fallback for migration. |

---

## Acceptance Criteria

### Phase 1 + 2 release
- [ ] Every player-visible CSS color value comes from a `var(--...)` token. No hex literals outside `tokens.css` and theme-specific files.
- [ ] HUD bottom controls bar matches the Section 1 mockup at desktop ≥1280px width.
- [ ] Edge tabs match mockup; active state visible when its modal opens.
- [ ] Weapon menu tiles match mockup; locked weapons dim to 25% opacity with their water/land restriction icon still visible.
- [ ] Title screen appears on first load; boot sequence types in ~600ms; menu items keyboard-navigable (N/R/B/A + arrows + Enter); "Restore last session" toggle honored.
- [ ] Briefing modal matches mockup; tank callsigns auto-fill from rotation; settings persist to localStorage.
- [ ] Engagement Report matches mockup; stats grid populated from existing game state.
- [ ] Volume, Restart, Game Log, Debug, Options modals all wear the new chrome.
- [ ] Diegetic corner readouts visible in-canvas at top-left + top-right; hidden in streamer mode.
- [ ] Tank labels render as theme-tinted callsign + HP tags (no more floating `@trooper1`).
- [ ] Trajectory uses dashed phosphor with opacity ramp; impact reticle visible while aiming.
- [ ] Damage numbers pop up on hit using Saira Condensed.
- [ ] Mobile layout (touch joystick + dial + floating FIRE) inherits the new tokens, no regression to touch behavior.
- [ ] Smoke test (`npm run test:smoke`) passes.
- [ ] Manual playtest: Forest + Ocean + Mars themes all visually correct; Classic + Teams + Solo modes all playable end-to-end.
- [ ] Lighthouse: no regression in performance, accessibility (sr-only `<h1>` stays), or SEO.
- [ ] Bundle size: redesign adds ≤120KB gzipped to the page (fonts + new CSS).

### Phase 3 (later)
- [ ] Schematic tank sprite replaces the current sprite across all themes.
- [ ] Geometric explosion FX replaces the current explosion.
- [ ] No regression in 60fps gameplay on a mid-range laptop.

### Phase 4 (later, optional)
- [ ] Theme-tinted scan grids per theme.
- [ ] Parallax background layers visible on at least Forest, Mars, Moon.
- [ ] Sub-depth blue darkening visible on Ocean.

---

## Open Questions

None at design time. All clarifications resolved during brainstorm:
- Scope confirmed: full redesign (HUD + typography + title + canvas).
- Direction confirmed: Tactical Command (A).
- Phasing confirmed: ship Phases 1 + 2 together.
- Self-hosted fonts confirmed (CSP-friendly).
