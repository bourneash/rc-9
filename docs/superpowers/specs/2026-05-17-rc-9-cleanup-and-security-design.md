# rc-9.com — Code Cleanup & Security Design

**Date:** 2026-05-17
**Status:** Approved (pending user review of this written spec)
**Author:** Jesse (with Claude)
**Repo:** `bourneash/rc-9` (private), deployed via Cloudflare Workers + static-assets

---

## Context

`rc-9.com` is a vanilla-JS browser artillery tank game ("Scorched Earth", v2.0.3) built on Vite 7, PixiJS 8, GSAP, and Howler. Deployment is Cloudflare Workers with a static-assets binding; a small Worker handles `/go/*` affiliate redirects and blocks `/admin/*` + `/api/*`.

The codebase has accumulated rough edges:

- `site/js/game.js` is **8,180 lines** — game loop, AI, physics, victory logic all in one file.
- `site/js/main.js` is **3,342 lines**.
- No unit tests; one Playwright smoke spec (`site/tests/smoke/gameplay.smoke.spec.js`).
- Console logs ship to production (`vite.config.js:51` — `drop_console: false`).
- Howler audio instances are not cleaned up in `site/js/av.js` dispose path.
- Dual game-instance naming pattern: `window.game` and `window.mainGame` used interchangeably.
- Known canyon-map collision bug (`site/TODO.md:46`) — tanks pass through canyon walls.
- Outdated dependencies (PixiJS, GSAP, ESLint, Playwright at minor/patch behind; Vite at major behind).
- No automated security scanning.

What's already good and stays untouched:

- CSP and security headers in `site/dist/_headers` (strict `default-src 'self'`, COOP/CORP, Permissions-Policy locked down).
- `npm audit` is clean (0 vulnerabilities on prod deps).
- CI gates `npm audit` before `npm run build` (`.github/workflows/security-and-build.yml`).
- Global error handlers + safe localStorage wrappers in `site/js/errors.js` and `site/js/validation.js`.
- `CREDENTIALS.md` and `CREDENTIALS_NEEDED.md` are **already gitignored and have never been committed** — verified via `git log --all --full-history`. No history scrub needed.

---

## Goals

1. **Install automated security scanning** so issues surface continuously, not just during big cleanup passes.
2. **Eliminate the safest, highest-value quick wins** (production console-log strip, dep patches, audio cleanup, naming unification).
3. **Fix two known bugs** that affect player experience (canyon collision, silent network-fetch failures).
4. **Break up `game.js`** into focused modules so future edits are reliable and the file is small enough to reason about.
5. **Keep the game working at every checkpoint** — no wave lands without smoke test + manual playtest passing.

## Non-Goals (explicit out-of-scope)

- Vite 7 → 8 major upgrade (separate evaluation; breaking-change surface area is large).
- TypeScript migration.
- Adding Vitest or any new test framework.
- Splitting `main.js` (deferred until after Wave 3 is proven stable).
- Refactoring the global state pattern (`window.game`, weapon Sets on game instance) — only normalizing names, not changing the architecture.
- New gameplay features from `TODO.md` (drive-during-opponent-turn, defend-the-base mode, network multiplayer).
- Replacing the Worker / `/go/*` affiliate cloak (currently empty, structurally fine).

---

## Architecture

Single spec, **three sequential waves**, each a discrete commit set. Each wave ends at a checkpoint requiring:

1. `npm run ci:verify` (audit + build) passes
2. `npm run test:smoke` passes
3. Manual playtest checklist (below) passes

If a checkpoint fails, revert to the previous green commit and re-plan that wave's remaining work. Subsequent waves do not start until the prior wave's checkpoint passes.

### Manual Playtest Checklist (used at every checkpoint)

- [ ] Forest preset, 2-player vs AI (medium) — play to victory
- [ ] Ocean preset, 2-player vs AI — fire torpedo, fire homing torpedo, verify weapon menu grays out land-only weapons
- [ ] Canyon preset — drive tank along walls; **Wave 2+ only**: verify tank cannot pass through walls
- [ ] Victory toast displays correctly, "New Game" button works, ESC dismisses
- [ ] Trajectory guide: black dots in air, cyan underwater, red impact dot
- [ ] No console errors during a full game

---

## Wave 1 — Safety Net & Quick Wins

**Goal:** stop the slow bleeding, install the scanner, land safe improvements that don't change game behavior.

### Tasks

1. **Install Security Dashboard V2** via `skill-security_v2-install`.
   - Run from `/home/jesse/projects/domains/sites/rc-9.com`.
   - Let it detect the JS stack and configure scanners.
   - Run first scan, commit baseline (scan config + any baseline files it produces).
   - Add scan invocation to the CI workflow (`.github/workflows/security-and-build.yml`) gated to PRs and `main` push, non-blocking initially so we can triage findings.

2. **Strip production console logs.**
   - `site/vite.config.js` — change `drop_console: false` → `drop_console: true`.
   - Keep `pure_funcs` list as-is.
   - Dev builds keep logs (Vite's terser config only applies to production builds).

3. **Patch-bump safe dependencies** (`site/package.json`):
   - `pixi.js` ^8.14.0 → ^8.18.x
   - `gsap` ^3.13.0 → ^3.15.x
   - `eslint` ^9.39.1 → latest 9.x patch
   - `@playwright/test` ^1.58.2 → latest 1.x minor
   - **Do NOT** bump `vite` past 7.x (major bump out of scope).
   - After each bump: `npm install`, `npm run lint`, `npm run build`, `npm run test:smoke`.

4. **Rename PII-bearing local files** for clarity:
   - `CREDENTIALS.md` → `CREDENTIALS.local.md`
   - `CREDENTIALS_NEEDED.md` → `CREDENTIALS_NEEDED.local.md`
   - Update `.gitignore` patterns to `*.local.md` so future similar files are auto-ignored.
   - Update any internal docs that reference these filenames (`site/CLAUDE.md`).

5. **Howler cleanup in `site/js/av.js` dispose.**
   - Audit `site/js/av.js` for all Howl instance creation sites.
   - Add explicit `.unload()` calls in the dispose path so Howler buffers free correctly.
   - Verify no audio glitches in playtest.

6. **Unify game instance naming.**
   - Pick `window.game` as canonical (already documented as such in `site/CLAUDE.md`).
   - Remove all `window.mainGame` references (or alias `window.mainGame = window.game` as a one-line compatibility shim with a removal-target comment, if external code depends on it — verify first).
   - Update the `game = window.game || window.mainGame` pattern in `site/CLAUDE.md`'s "Common Gotchas" section.

7. **Lint + format pass:** `npm run lint:fix` and `npm run format` over all of `site/js/`.

### Wave 1 Checkpoint

Standard checklist above. Wave 1 is the lowest-risk wave; failures here likely mean a dep bump regressed something — bisect by reverting individual bumps.

---

## Wave 2 — Bugs & UX

**Goal:** fix concrete bugs that affect player experience. Scope is narrow and well-defined.

### Tasks

1. **Fix canyon-map collision** (`site/TODO.md:46-49`).
   - Investigate canyon terrain generation in `site/js/terrain.js` — confirm whether canyon walls produce a collision mask the tank movement code actually consults.
   - Locate tank movement code (likely `site/js/tank.js` movement update + `site/js/game.js` per-tick driving).
   - Add collision boundary check against canyon walls so tanks cannot pass through.
   - Test on canyon preset specifically; do not regress other maps.

2. **User-facing network error UI.**
   - Audit `fetch()` call sites across `site/js/`.
   - For each, wrap in try/catch and surface a small dismissible toast/banner on failure (reuse the existing toast pattern from `showVictoryToast` if practical, or a new lightweight component).
   - Console logging stays for debugging; this adds a player-visible surface.

3. **(Optional, defer-able)** Render-loop error boundary.
   - Wrap `game.update()` / `game.render()` invocation in a top-level try/catch so a single bad frame doesn't freeze the canvas indefinitely.
   - Display a "Something went wrong — refresh to continue" recovery UI.
   - Only include this if Wave 2 has room; otherwise punt to follow-up.

### Wave 2 Checkpoint

Standard checklist, with special emphasis on the canyon preset playthrough and a manual offline-fetch test (DevTools → Network → Offline → trigger any in-game fetch path).

---

## Wave 3 — `game.js` Split (8,180 → ~5 modules)

**Goal:** make `game.js` reasonable to read and edit. Pure mechanical extraction — no behavior change.

### Proposed Module Boundaries

| Module | Contents | Approx. lines (est.) |
|---|---|---|
| `site/js/game.js` (slimmed) | `Game` class shell, constructor, main `update()` / `render()` loop, turn orchestration | ~2,500 |
| `site/js/game-state.js` | Current tank/turn state helpers, turn token logic, weapon Sets (`landOnlyWeapons`, `waterOnlyWeapons`) | ~800 |
| `site/js/game-physics.js` | `drawTrajectoryGuide()`, trajectory simulation, gravity/wind/water helpers | ~1,200 |
| `site/js/game-ai.js` | `chooseAIWeapon()`, `performAITurn()`, AI difficulty + targeting | ~1,500 |
| `site/js/game-victory.js` | `checkGameOver()`, `showGameOver()`, `showVictoryToast()`, glue with `victory-messages.js` | ~700 |
| `site/js/game-ui.js` (if needed) | DOM helpers, debug overlay rendering | ~1,200 |

Exact boundaries finalized when the work begins; the goal is each new module ≤ 1,500 lines.

### Extraction Protocol

**One module per commit.** Steps for each extraction:

1. Identify the function set to extract.
2. Move them verbatim into the new file.
3. Add named exports for everything the rest of `game.js` and other modules still call.
4. Add named imports back into `game.js`.
5. Build (`npm run build`) — if it fails, the import graph is wrong; fix and retry.
6. Smoke test (`npm run test:smoke`).
7. Manual playtest checklist.
8. Commit. If any step fails, revert the commit and re-plan that extraction.

Module order (lowest-coupling first):

1. `game-victory.js` — leaf, called by main loop only
2. `game-physics.js` — pure functions, well-isolated
3. `game-state.js` — touches Game class state but no external systems
4. `game-ai.js` — depends on physics + state; extract after both land
5. `game-ui.js` — last, if there's remaining UI cruft worth pulling

### Wave 3 Checkpoint

Standard checklist after EACH module extraction commit, not just at end of wave. This wave is where regressions are most likely.

---

## Data Flow

No data-flow changes in any wave. All splits are pure module extractions:

- Same global access pattern (`window.game`, `window.mainGame` removed in Wave 1).
- Same DOM manipulation call sites.
- Same Sets (`game.landOnlyWeapons`, `game.waterOnlyWeapons`) on the Game instance.
- Same `_isOceanTerrain` / `waterSurfaceY` detection pattern documented in `site/CLAUDE.md`.

The Worker (`worker/index.js`) and Cloudflare deploy pipeline are not touched.

---

## Error Handling & Testing Strategy

### Existing safety nets

- Global `unhandledrejection` + `error` listeners in `site/js/errors.js`.
- Safe localStorage helpers in `site/js/validation.js:171-210`.
- `turnToken` cancellation pattern in `site/js/game.js:2144-2220` (preserved across split).
- `npm audit --audit-level=high` in CI.

### Added in this work

- Wave 1: Security Dashboard V2 baseline + CI scan invocation (non-blocking initially).
- Wave 2: User-facing network error UI; optional render-loop error boundary.
- All waves: smoke + manual playtest checkpoints between commits.

### No new test framework

Vitest / unit tests are explicitly out of scope. The existing Playwright smoke spec plus manual playtest is the safety net. If a wave breaks playtest, revert to the previous green commit.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wave 3 module extraction breaks a subtle game.js coupling | Medium | High | One module per commit; revert cleanly if smoke/playtest fails |
| Dep bump (PixiJS minor, GSAP minor) regresses rendering | Low | Medium | Test each bump in isolation; revert that specific bump if needed |
| Security scanner produces too much noise on first run | Medium | Low | Baseline initial findings, triage in follow-up; keep CI non-blocking for scanner findings until triaged |
| Canyon collision fix breaks other map collision behavior | Low | Medium | Verify all other map presets in playtest, not just canyon |
| Console-log strip removes log a future developer needs | Low | Low | Logs still present in dev builds; production strip is reversible |
| `window.mainGame` removal breaks something external (e.g., bookmarklet, ad SDK hook) | Low | Medium | Audit references before removal; if external dep found, leave as one-line alias with removal-target comment |
| Wave 2 fetch-error UI introduces XSS via error message interpolation | Low | High | Use `textContent` for error message rendering, never `innerHTML` |

---

## Acceptance Criteria

Project is complete when:

- [ ] Security Dashboard V2 installed; baseline scan committed; CI runs the scanner on every PR and `main` push.
- [ ] Production builds contain no `console.log/debug/info/warn` from game code.
- [ ] PixiJS, GSAP, ESLint, Playwright bumped to current minor/patch; `npm audit --audit-level=high` clean.
- [ ] `CREDENTIALS.local.md` naming pattern in place; `.gitignore` covers `*.local.md`.
- [ ] Howler instances unload cleanly in `av.js` dispose path.
- [ ] Single `window.game` instance reference across codebase; `window.mainGame` removed or aliased.
- [ ] Canyon-map collision works — tanks cannot pass through canyon walls.
- [ ] Network fetch failures show a user-visible error surface, not just console.
- [ ] `game.js` is ≤ 3,000 lines, with extracted modules each ≤ 1,500 lines.
- [ ] All extraction commits pass smoke + manual playtest.
- [ ] No file in `site/js/` has grown without justification.

---

## Open Questions

None at spec time. Will surface during implementation if any specific function extraction is more coupled than expected and resists clean splitting — in that case, stop, document the coupling, and bring the question back.

---

## Follow-up Work (after this spec lands)

- Split `main.js` (3,342 lines) using the same protocol as Wave 3.
- Evaluate Vite 7 → 8 major upgrade in isolation.
- Consider adding Vitest for the most refactor-vulnerable modules (`game-physics.js`, `game-ai.js`) — would have been Approach C in brainstorming.
- Address Security Dashboard V2 findings from baseline scan.
- Implement deferred `TODO.md` features (drive-during-opponent-turn, defend-the-base, network multiplayer) — separate specs each.
