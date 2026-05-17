# rc-9.com Cleanup & Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land a cleanup pass on rc-9.com — install automated security scanning, strip noise from production builds, patch safe deps, fix the canyon-collision bug, surface fetch errors to users, and split the 8,180-line `game.js` into focused modules — without breaking gameplay.

**Architecture:** Three sequential waves of commits in a single working branch. Each wave ends at a checkpoint (`npm run ci:verify` + `npm run test:smoke` + manual playtest). No wave starts until the prior wave's checkpoint is green. The split in Wave 3 is one-module-per-commit so any regression reverts cleanly.

**Tech Stack:** Vite 7 + vanilla JS (ES modules), PixiJS 8, GSAP 3, Howler 2, ESLint 9, Prettier, Playwright (smoke), Terser, Cloudflare Workers + static-assets binding.

**Working directory:** All commands assume CWD = `/home/jesse/projects/domains/sites/rc-9.com/site` unless noted otherwise.

**Spec corrections discovered during plan-writing:**
- `site/js/av.js:575-654` already implements thorough Howler cleanup (`stop()` + `unload()` on every sound/loop/music, plus Web Audio node disconnect). **Spec's Howler-cleanup task dropped.**
- `window.mainGame` does not exist in code — `grep` shows 0 references. It's only mentioned in `site/CLAUDE.md` as a documented gotcha. **Task simplifies to fixing the doc.**

---

## File Structure

### Files created

- `docs/superpowers/specs/2026-05-17-rc-9-cleanup-and-security-design.md` *(already exists — spec)*
- `docs/superpowers/plans/2026-05-17-rc-9-cleanup-and-security.md` *(this file)*
- `site/js/game-victory.js` — extracted victory logic (Wave 3)
- `site/js/game-physics.js` — extracted physics/trajectory helpers (Wave 3)
- `site/js/game-state.js` — extracted state helpers + weapon Sets (Wave 3)
- `site/js/game-ai.js` — extracted AI weapon/turn logic (Wave 3)

### Files modified

- `site/vite.config.js` — `drop_console: true` for prod
- `site/package.json` + `site/package-lock.json` — dep bumps
- `site/js/game.js` — fetch error toast (Wave 2), canyon collision fix (Wave 2), function extractions + imports (Wave 3); slimmed to ≤ 3,000 lines by end
- `site/js/tank.js` and/or `site/js/terrain.js` — canyon collision fix (location TBD by investigation in Task 10)
- `site/js/main.js` — possible UI integration for fetch-error toast
- `site/CLAUDE.md` — remove stale `window.mainGame` reference; update file references
- `.gitignore` — add `*.local.md` pattern
- `CREDENTIALS.md` → `CREDENTIALS.local.md` (rename, no content change)
- `CREDENTIALS_NEEDED.md` → `CREDENTIALS_NEEDED.local.md` (rename, no content change)
- `.github/workflows/security-and-build.yml` — add scanner step (non-blocking)

---

## Pre-Flight: Working Branch

- [ ] **Step 1: Create a feature branch from main**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git checkout main
git pull --ff-only
git checkout -b cleanup/2026-05-17-cleanup-and-security
```

Expected: branch created, clean working tree.

- [ ] **Step 2: Confirm baseline build is green**

```bash
cd site
npm ci
npm run ci:verify
```

Expected: `npm audit` 0 high+ vulns, build succeeds, no errors. **If this fails, stop and report before continuing.**

- [ ] **Step 3: Confirm smoke test passes on baseline**

```bash
cd site
npm run test:smoke
```

Expected: all smoke specs pass. If it doesn't pass on `main` already, halt and fix that first — we need a green baseline.

---

## Manual Playtest Checklist (referenced at every checkpoint)

Open `http://localhost:5600` after `npm run dev`. Run through:

- [ ] **Forest preset, 2-player vs AI medium** — play to victory or surrender after ~3 turns; verify trajectory dots black, no console errors.
- [ ] **Ocean preset, 2-player vs AI** — fire `torpedo` and `homing_torpedo`; verify weapon menu grays out `marker_airstrike` and `napalm`; verify cyan underwater trajectory dots.
- [ ] **Canyon preset, 2-player** — drive tank along walls; **Wave 2+ only:** verify tank cannot pass through walls.
- [ ] **Victory toast** — when game ends: winner name visible, contextual message present, "New Game" button works, ESC dismisses toast.
- [ ] **No console errors** during any of the above.

If anything in this list regresses at a checkpoint: revert the last commit, re-investigate, do not continue.

---

# WAVE 1 — Safety Net & Quick Wins

Low-risk changes. No behavior changes to the game. Goal: install automated scanning, strip prod noise, bump safe deps, tighten file naming.

---

## Task 1: Install Security Dashboard V2

**Files:**
- Modify: working directory (scanner adds its own config files)
- Modify: `.github/workflows/security-and-build.yml`

- [ ] **Step 1: Invoke the install skill**

In the Claude session, invoke `skill-security_v2-install` with the repo root as the target. From the user's shell that means running the slash command or letting the agent invoke the skill via the Skill tool. The skill will:
- detect the JS stack
- clone/install the Security Dashboard V2 scanner
- configure scanners for JavaScript
- kick off an initial scan

Working dir for the skill: `/home/jesse/projects/domains/sites/rc-9.com`

- [ ] **Step 2: Review what the skill installed**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git status --short
```

Expected: scanner config files staged or untracked. Inspect each new file — confirm none contain secrets or PII.

- [ ] **Step 3: Run the first scan and review output**

Run whatever scan command the skill documents (e.g., `security-dashboard scan` or similar). Save the baseline output to `docs/superpowers/security-baseline-2026-05-17.txt` for reference.

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
# example — replace with actual command the skill provides
security-dashboard scan --output docs/superpowers/security-baseline-2026-05-17.txt
```

If the scanner exits non-zero on the baseline, that's expected (it's reporting findings). Do NOT block on findings here — Wave 1's job is to install scanning, not address every finding. Triage in follow-up.

- [ ] **Step 4: Add scanner step to CI (non-blocking)**

Open `.github/workflows/security-and-build.yml` and add a step after `npm run security:audit` (around line 30, after the existing audit step). The exact command depends on what the skill installed — use what the skill documents. Example shape:

```yaml
      - name: Security Dashboard scan
        run: security-dashboard scan
        continue-on-error: true   # non-blocking until findings are triaged
```

The `continue-on-error: true` is intentional: we want signal in CI without blocking PRs while baseline findings are being triaged.

- [ ] **Step 5: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add .
git status
# verify NO CREDENTIALS*.md files are staged before committing
git commit -m "chore(security): install Security Dashboard V2 + baseline scan"
```

---

## Task 2: Strip Production Console Logs

**Files:**
- Modify: `site/vite.config.js:51`

- [ ] **Step 1: Edit `site/vite.config.js`**

Change line 51 from `drop_console: false` to `drop_console: true`. The `pure_funcs` line below stays. Dev builds (`vite` / `vite dev`) are unaffected — terser only runs on production builds.

Before:
```js
    terserOptions: {
      compress: {
        drop_console: false,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },
```

After:
```js
    terserOptions: {
      compress: {
        drop_console: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },
```

- [ ] **Step 2: Build and verify console logs are stripped**

```bash
cd site
npm run build
grep -r "console\.log\|console\.debug\|console\.info" dist/assets/*.js | head -5
```

Expected: empty (no matches). If there are matches, something didn't strip — investigate.

- [ ] **Step 3: Run smoke + manual playtest spot check**

```bash
cd site
npm run test:smoke
```

Expected: PASS. Briefly open `npm run preview` and confirm game loads without errors.

- [ ] **Step 4: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/vite.config.js
git commit -m "build: strip console logs from production builds"
```

---

## Task 3: Bump PixiJS to 8.18.x

**Files:**
- Modify: `site/package.json`
- Modify: `site/package-lock.json` (auto)

- [ ] **Step 1: Install latest PixiJS 8.x**

```bash
cd site
npm install pixi.js@^8.18.0 pixi-filters@latest --save
```

Expected: package.json updated; no peer-dep warnings about Pixi itself.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke + manual playtest**

```bash
npm run test:smoke
```

Then `npm run dev` and run through the Manual Playtest Checklist (Forest + Ocean + Victory toast). Pixi handles the post-FX overlay and filters — if anything visual regresses, this is where it shows.

Expected: smoke pass, no visual regressions, no console errors.

If a Pixi minor break occurs: `git checkout site/package.json site/package-lock.json && npm install` to revert, then pin to a tested earlier 8.x version.

- [ ] **Step 4: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/package.json site/package-lock.json
git commit -m "chore(deps): bump pixi.js to 8.18.x"
```

---

## Task 4: Bump GSAP to 3.15.x

**Files:**
- Modify: `site/package.json`
- Modify: `site/package-lock.json` (auto)

- [ ] **Step 1: Install latest GSAP 3.x**

```bash
cd site
npm install gsap@^3.15.0 --save
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke + manual playtest**

```bash
npm run test:smoke
```

Then `npm run dev` and verify tween-driven animations (victory toast scale-in, screen shake, projectile trails) play correctly.

- [ ] **Step 4: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/package.json site/package-lock.json
git commit -m "chore(deps): bump gsap to 3.15.x"
```

---

## Task 5: Bump ESLint to latest 9.x Patch

**Files:**
- Modify: `site/package.json`
- Modify: `site/package-lock.json` (auto)

- [ ] **Step 1: Install latest ESLint 9.x**

```bash
cd site
npm install eslint@^9.39.4 @eslint/js@^9.39.4 --save-dev
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: ESLint runs without crashing. There may be existing warnings — record the count, do NOT fix style nits in this commit. New errors introduced by the bump itself need investigation; rule-config-related errors that already existed are out of scope here.

- [ ] **Step 3: Build to verify nothing else broke**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/package.json site/package-lock.json
git commit -m "chore(deps): bump eslint to latest 9.x patch"
```

---

## Task 6: Bump Playwright to Latest 1.x Minor

**Files:**
- Modify: `site/package.json`
- Modify: `site/package-lock.json` (auto)

- [ ] **Step 1: Install latest Playwright 1.x**

```bash
cd site
npm install @playwright/test@^1.60.0 --save-dev
```

- [ ] **Step 2: Sync Playwright browser binaries**

```bash
npx playwright install --with-deps chromium
```

Expected: Playwright downloads matching browser if needed.

- [ ] **Step 3: Run smoke test**

```bash
npm run test:smoke
```

Expected: smoke pass on the new version.

- [ ] **Step 4: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/package.json site/package-lock.json
git commit -m "chore(deps): bump @playwright/test to latest 1.x minor"
```

---

## Task 7: Rename Local Credentials Files + Tighten .gitignore

**Files:**
- Rename: `CREDENTIALS.md` → `CREDENTIALS.local.md`
- Rename: `CREDENTIALS_NEEDED.md` → `CREDENTIALS_NEEDED.local.md`
- Modify: `.gitignore`
- Modify: `site/CLAUDE.md`

- [ ] **Step 1: Confirm baseline — neither file is tracked**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git ls-files | grep -i credential
```

Expected: empty (files have never been committed). If output is non-empty, **stop** — the situation is different from what the spec assumed and needs re-investigation.

- [ ] **Step 2: Rename the files**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
mv CREDENTIALS.md CREDENTIALS.local.md
mv CREDENTIALS_NEEDED.md CREDENTIALS_NEEDED.local.md
ls -la CREDENTIALS*
```

Expected: both files now named `*.local.md`, originals gone.

- [ ] **Step 3: Update `.gitignore`**

Open `.gitignore`. Current content (first 8 lines):

```
CREDENTIALS.md
CREDENTIALS_NEEDED.md
.env
.env.local
node_modules/
dist/

.playwright-mcp/
```

Replace the first two lines so the new naming pattern is covered (and is a generic pattern for future local files):

```
*.local.md
.env
.env.local
node_modules/
dist/

.playwright-mcp/
```

- [ ] **Step 4: Verify both renamed files are still ignored**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git check-ignore -v CREDENTIALS.local.md CREDENTIALS_NEEDED.local.md
```

Expected: both files report as ignored by `.gitignore:1:*.local.md`.

- [ ] **Step 5: Update `site/CLAUDE.md` if it references the old filenames**

```bash
grep -n "CREDENTIALS" site/CLAUDE.md
```

If matches exist, update the filenames in place to `CREDENTIALS.local.md` / `CREDENTIALS_NEEDED.local.md`. If no matches, skip this step.

- [ ] **Step 6: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add .gitignore site/CLAUDE.md 2>/dev/null
# the CREDENTIALS files themselves stay untracked - git status should NOT show them
git status
git commit -m "chore: rename local-only credentials files to *.local.md pattern"
```

Verify the credentials files do NOT appear in `git status` output — they should be ignored.

---

## Task 8: Remove Stale `window.mainGame` Reference from site/CLAUDE.md

**Files:**
- Modify: `site/CLAUDE.md`

Reason: the code already uses only `window.game`. `window.mainGame` was never present (verified by `grep` returning 0 hits). The stale "Common Gotcha" entry in the docs misleads future agents into writing the `window.game || window.mainGame` defensive pattern when it's not needed.

- [ ] **Step 1: Locate the stale reference**

```bash
cd site
grep -n "mainGame\|window.game" CLAUDE.md
```

Expected: matches in the "Common Gotchas" section and possibly in "Key Takeaways".

- [ ] **Step 2: Edit `site/CLAUDE.md` — section "Game Object Access"**

Find this passage in `site/CLAUDE.md`:

```markdown
### 3. Game Object Access
**Problem:** Game instance stored in different global variables.

**Solution:** Check both:
```javascript
const game = window.game || window.mainGame;
```
```

Replace with:

```markdown
### 3. Game Object Access
**Solution:** The game instance is accessible as `window.game`. (Older docs mentioned a `window.mainGame` fallback — that alias no longer exists; use `window.game` directly.)

```javascript
const game = window.game;
```
```

- [ ] **Step 3: Edit the "Debugging Tips" section if it mentions the dual access**

Find:

```markdown
- `game` object accessible in console: `window.game` or `window.mainGame`
```

Replace with:

```markdown
- `game` object accessible in console: `window.game`
```

- [ ] **Step 4: Verify no other stale references**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
grep -rn "mainGame" site/ 2>/dev/null
```

Expected: empty.

- [ ] **Step 5: Commit**

```bash
git add site/CLAUDE.md
git commit -m "docs: remove stale window.mainGame reference from CLAUDE.md"
```

---

## Task 9: Lint + Format Pass

**Files:**
- Modify: any file ESLint or Prettier touches in `site/js/`

- [ ] **Step 1: Run lint with auto-fix**

```bash
cd site
npm run lint:fix
```

Expected: ESLint applies safe auto-fixes (semicolons, indentation, etc.). Any remaining manual-fix warnings are logged but do NOT block commit.

- [ ] **Step 2: Run Prettier**

```bash
npm run format
```

- [ ] **Step 3: Review the diff**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git diff --stat site/js/
git diff site/js/ | head -80
```

Sanity-check: changes should be whitespace, quoting, and trailing commas only. If anything semantic changed (logic, function signatures), revert that specific change before committing.

- [ ] **Step 4: Build + smoke**

```bash
cd site
npm run build
npm run test:smoke
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/js/
git commit -m "style: lint + format pass across site/js"
```

---

## Wave 1 Checkpoint

- [ ] **Run full CI verify**

```bash
cd site
npm run ci:verify
```

Expected: PASS.

- [ ] **Run smoke test**

```bash
npm run test:smoke
```

Expected: PASS.

- [ ] **Run manual playtest checklist** (top of this doc)

Expected: all 5 items pass. If anything fails, do NOT continue to Wave 2 — bisect Wave 1 commits and revert the offender.

---

# WAVE 2 — Bugs & UX

Concrete behavior changes. Scope kept narrow.

---

## Task 10: Investigate Canyon Collision Bug

**Files:**
- Read-only: `site/js/terrain.js`, `site/js/tank.js`, `site/js/game.js`

No code changes in this task. Produce a short investigation note that informs Task 11.

- [ ] **Step 1: Reproduce the bug locally**

```bash
cd site
npm run dev
```

Open `http://localhost:5600`. Start a 2-player game with Canyon preset. Drive a tank toward the canyon walls — confirm the tank passes through them.

- [ ] **Step 2: Find the canyon terrain profile**

```bash
grep -n "canyon" js/terrain.js | head -30
grep -n "canyon" js/main.js | head -10
```

Identify:
- Where the canyon profile is generated (terrain shape, wall coordinates)
- Whether it exposes a collision mask or just a render path

- [ ] **Step 3: Find tank movement collision logic**

```bash
grep -n "moveLeft\|moveRight\|move(\|terrain\.heightAt\|terrain\.isWall\|collision" js/tank.js js/game.js | head -40
```

Identify:
- How tank movement consults terrain
- What terrain API exists for "is this point solid?"
- Where the gap is — likely tanks check ground-height-at-X but not lateral-wall-at-X-Y

- [ ] **Step 4: Write a 3–5 line investigation note**

Write to `docs/superpowers/canyon-collision-investigation.md`:

```markdown
# Canyon Collision Investigation (2026-05-17)

- Bug repro: Canyon preset, tanks pass through walls.
- Terrain generation: `site/js/terrain.js:<line>` defines canyon walls as <describe what kind of structure>.
- Tank movement: `site/js/tank.js:<line>` updates X position and calls `terrain.heightAt(x)` for ground but does NOT check lateral walls.
- Proposed fix in Task 11: <one-sentence approach, e.g., add `terrain.isSolidAt(x, y)` check in tank lateral movement>.
```

This note exists so Task 11 has concrete file:line targets.

- [ ] **Step 5: Commit the investigation note**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add docs/superpowers/canyon-collision-investigation.md
git commit -m "docs: canyon collision investigation notes"
```

---

## Task 11: Implement Canyon Collision Fix

**Files:**
- Modify: `site/js/tank.js` and/or `site/js/terrain.js` (exact targets from Task 10)
- Modify: `site/TODO.md` — strike through the canyon item

- [ ] **Step 1: Reproduce the bug one more time as a "failing test"**

Open `npm run dev` → Canyon preset → drive tank into wall. Confirm pass-through. This is the manual failing test the fix must turn into a pass.

- [ ] **Step 2: Implement the collision check**

Based on the investigation note from Task 10, modify the relevant file(s). Two likely shapes:

**Shape A — add a query method to terrain:**

In `site/js/terrain.js`, add a method like:

```js
isSolidAt(x, y) {
  // Returns true if the terrain blocks at (x, y).
  // For canyon walls: check if x falls within a wall column at the given y.
  // Implementation depends on how canyon walls are stored.
  // ...
}
```

Then in `site/js/tank.js` movement, before applying the new X, gate on:

```js
if (this.terrain.isSolidAt(proposedX, this.y)) {
  // blocked - do not move
  return;
}
this.x = proposedX;
```

**Shape B — extend the existing height check:**

If walls are tall stacks of terrain pixels in the heightmap, the existing `terrain.heightAt(x)` may already report the wall top — adjust tank movement to check whether the wall top at the candidate X is above the tank's current Y, and if so, block movement.

Use whichever shape matches what Task 10's investigation found.

- [ ] **Step 3: Verify the bug is fixed**

```bash
cd site
npm run dev
```

Manual test: Canyon preset → drive tank into wall → tank stops at wall. Drive over flat ground inside canyon → tank moves freely. Drive on other map presets (Forest, Ocean) → no regression.

- [ ] **Step 4: Run smoke test**

```bash
npm run test:smoke
```

Expected: PASS.

- [ ] **Step 5: Strike the canyon item in TODO.md**

Open `site/TODO.md`. Find the canyon-broken entry around line 46. Replace with a one-line "fixed" note dated today (2026-05-17), or remove the entry if other entries are removed rather than struck through (match existing TODO.md style).

- [ ] **Step 6: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/js/ site/TODO.md
git commit -m "fix(canyon): tanks no longer pass through canyon walls"
```

---

## Task 12: User-Facing Config Fetch Error Toast

**Files:**
- Modify: `site/js/game.js:324-440` (the `init()` method's catch block at ~line 434)

The single `fetch()` site is `game.js:327` loading `config.json`. The existing catch (lines 434–437) only logs to console and falls back to a hardcoded config — players get silent breakage if the config fetch fails. Add a small user-visible toast.

- [ ] **Step 1: Locate the existing catch block**

```bash
cd site
sed -n '430,445p' js/game.js
```

Expected output around line 434:

```js
        } catch (error) {
            console.error('Failed to load config:', error);
            this.config = { ai: { medium: { aimError: 8, powerError: 15, thinkTime: 1500 } } };
        }
```

- [ ] **Step 2: Add a helper to show a transient error toast**

In `site/js/game.js`, find an appropriate place to add the helper (recommend: just before the `init()` method, or alongside other UI helpers). Add:

```js
    showFetchErrorToast(message) {
        // Lightweight transient toast for non-fatal fetch failures.
        // Uses textContent (not innerHTML) for the message — never interpolate raw errors as HTML.
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(180, 30, 30, 0.95); color: #fff;
            padding: 10px 16px; border-radius: 6px; font-size: 14px;
            font-family: system-ui, sans-serif; z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4); max-width: 80vw;
        `;
        const label = document.createElement('span');
        label.textContent = message;
        toast.appendChild(label);
        document.body.appendChild(toast);
        setTimeout(() => { try { toast.remove(); } catch {} }, 6000);
    }
```

Key safety point: `label.textContent = message` — **never** use `innerHTML` for the error message. The error string could contain anything.

- [ ] **Step 3: Wire the helper into the existing catch block**

Replace the existing catch block (around line 434):

```js
        } catch (error) {
            console.error('Failed to load config:', error);
            this.showFetchErrorToast('Could not load game config — using defaults.');
            this.config = { ai: { medium: { aimError: 8, powerError: 15, thinkTime: 1500 } } };
        }
```

- [ ] **Step 4: Manually test the offline path**

```bash
cd site
npm run dev
```

Open `http://localhost:5600`. Open DevTools → Network → set "Offline". Refresh the page. Verify:
- Toast appears at the top of the screen with "Could not load game config — using defaults."
- Game still loads with defaults.
- Toast disappears after 6 seconds.

Then set Network back to Online and confirm the toast does NOT appear on normal load.

- [ ] **Step 5: Run smoke + standard playtest**

```bash
npm run test:smoke
```

Standard manual playtest (Forest + Ocean + Victory toast). Expected: no regressions; toast does not appear on normal play.

- [ ] **Step 6: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/js/game.js
git commit -m "feat(ui): show error toast when config fetch fails"
```

---

## Wave 2 Checkpoint

- [ ] **CI verify**

```bash
cd site && npm run ci:verify
```

Expected: PASS.

- [ ] **Smoke test**

```bash
npm run test:smoke
```

- [ ] **Manual playtest checklist**, with extra emphasis on:
  - Canyon preset (verify wall collision works)
  - DevTools-offline test of config fetch error toast

If any item fails: revert the failing Wave 2 commit and re-investigate before Wave 3.

---

# WAVE 3 — `game.js` Module Split

`game.js` is currently ~8,180 lines. Goal: ≤ 3,000 lines after this wave, with extracted modules each ≤ 1,500 lines. Each extraction is its own commit so individual extractions can be reverted cleanly.

**Verified line landmarks (as of plan-writing):**
- `drawTrajectoryGuide()` — `site/js/game.js:2092`
- `chooseAIWeapon()` — `site/js/game.js:6487`
- `checkGameOver()` — `site/js/game.js:7145`
- `showGameOver(winner)` — `site/js/game.js:7166`
- `showVictoryToast(...)` — `site/js/game.js:7209`

**Extraction protocol for each module (referenced by every Wave 3 task):**
1. Identify function set + helpers
2. Create new file with named exports
3. Move functions verbatim (cut, not copy)
4. Replace methods on `Game` class with thin wrappers calling imported functions, OR rebind methods at the bottom of the new file via `Game.prototype.X = X` (whichever fits existing pattern — see Task 13 for the worked example)
5. Add named imports at the top of `game.js`
6. `npm run build` — fail = import graph wrong, fix and retry
7. `npm run test:smoke`
8. Manual playtest (full checklist)
9. Commit. Failure = revert and re-plan that extraction.

---

## Task 13: Extract `game-victory.js` (Lowest Coupling — Done First)

**Files:**
- Create: `site/js/game-victory.js`
- Modify: `site/js/game.js`

Target functions (all are methods on the `Game` class in current `game.js`):
- `checkGameOver()` — line ~7145
- `showGameOver(winner)` — line ~7166
- `showVictoryToast(winnerName, victoryMessage, winner)` — line ~7209

These are pure-leaf in the call graph — called by other Game methods but they don't call back into many places (mostly DOM + `victory-messages.js`).

- [ ] **Step 1: Read the target range to understand dependencies**

```bash
cd site
sed -n '7145,7290p' js/game.js | head -200
```

Note any external symbols the functions reference: imports, other `this.*` methods, globals. Common ones likely include `victory-messages.js` imports, `this.tanks`, `this.gameOver`.

- [ ] **Step 2: Create `site/js/game-victory.js`**

Pattern: export pure functions that take `game` as their first arg. Then re-bind onto `Game.prototype` so existing call sites (`this.checkGameOver()`, `this.showVictoryToast(...)`) keep working unchanged.

```js
// game-victory.js — extracted from game.js
// Victory detection + toast/game-over UI.

import { getVictoryMessage } from './victory-messages.js';
// ↑ Adjust imports based on what the original code uses.
// If victory-messages.js exports a different symbol, match the original.

export function checkGameOver(game) {
    // ... paste the BODY of the original checkGameOver method here ...
    // Replace `this.` with `game.` throughout.
}

export function showGameOver(game, winner) {
    // ... paste body, replace `this.` with `game.` ...
}

export function showVictoryToast(game, winnerName, victoryMessage, winner) {
    // ... paste body, replace `this.` with `game.` ...
}
```

- [ ] **Step 3: Rebind to `Game.prototype` in `game.js`**

In `site/js/game.js`, near the top of the file with the other imports:

```js
import {
    checkGameOver as _checkGameOver,
    showGameOver as _showGameOver,
    showVictoryToast as _showVictoryToast,
} from './game-victory.js';
```

At the bottom of `site/js/game.js` (or wherever class-augmentation feels natural — pick the location the codebase already uses, otherwise the bottom is fine):

```js
// Re-bind extracted victory methods onto Game.prototype so call sites
// like `this.checkGameOver()` continue to work unchanged.
Game.prototype.checkGameOver = function () { return _checkGameOver(this); };
Game.prototype.showGameOver = function (winner) { return _showGameOver(this, winner); };
Game.prototype.showVictoryToast = function (winnerName, victoryMessage, winner) {
    return _showVictoryToast(this, winnerName, victoryMessage, winner);
};
```

- [ ] **Step 4: Delete the original methods from the `Game` class in `game.js`**

Remove the original `checkGameOver`, `showGameOver`, `showVictoryToast` method bodies (lines ~7145–7290) from the class definition. The class file shrinks by ~150 lines.

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: SUCCESS. Failure usually = a `this.` was missed when rewriting to `game.`, or an import path is wrong. Fix and retry.

- [ ] **Step 6: Smoke test**

```bash
npm run test:smoke
```

- [ ] **Step 7: Manual playtest — focus on victory path**

```bash
npm run dev
```

- Play a quick game to victory (forest preset, 1 vs AI easy, fire heavy weapons until AI dies)
- Verify victory toast appears with correct winner name
- Verify "New Game" button works
- Verify ESC dismisses toast
- Play an Ocean game, verify victory still works there

- [ ] **Step 8: Commit**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git add site/js/game.js site/js/game-victory.js
git commit -m "refactor(game): extract victory logic to game-victory.js"
```

If anything regressed: `git reset --hard HEAD~1` and re-plan the extraction.

---

## Task 14: Extract `game-physics.js`

**Files:**
- Create: `site/js/game-physics.js`
- Modify: `site/js/game.js`

Target functions (likely starting points — confirm by reading code):
- `drawTrajectoryGuide()` — line ~2092
- Any private physics helpers called only by `drawTrajectoryGuide` and not by other systems

**Important constraint:** Do NOT move physics that lives in `site/js/projectile.js` — that's already extracted. Only move physics that currently lives inside `game.js`.

- [ ] **Step 1: Map dependencies**

```bash
cd site
sed -n '2092,2230p' js/game.js
```

Identify:
- What `this.` properties does `drawTrajectoryGuide` read? (likely `this.terrain`, `this.tanks`, wind/gravity state, `_isOceanTerrain` flag)
- Does it call any other `this.*` methods?

If it calls other `this.*` methods that aren't trivially safe to extract too, leave those alone and keep `drawTrajectoryGuide` calling them via the `game` arg.

- [ ] **Step 2: Create `site/js/game-physics.js`**

```js
// game-physics.js — extracted from game.js
// Trajectory simulation + underwater physics helpers.

export function drawTrajectoryGuide(game) {
    // ... paste body, replace `this.` with `game.` ...
}

// If there are private helpers used only here, include them as non-exported
// functions (or exported if game.js still needs them).
```

- [ ] **Step 3: Re-bind in `game.js`**

Import at top:

```js
import {
    drawTrajectoryGuide as _drawTrajectoryGuide,
} from './game-physics.js';
```

At bottom:

```js
Game.prototype.drawTrajectoryGuide = function () { return _drawTrajectoryGuide(this); };
```

Delete the original method body from the class.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: SUCCESS.

- [ ] **Step 5: Smoke + manual playtest, focused on trajectory**

```bash
npm run test:smoke
```

Manual: forest preset, aim a missile — verify black dots in air; ocean preset, aim a torpedo — verify cyan dots underwater + red impact dot at terrain hit.

- [ ] **Step 6: Commit**

```bash
git add site/js/game.js site/js/game-physics.js
git commit -m "refactor(game): extract trajectory physics to game-physics.js"
```

---

## Task 15: Extract `game-state.js`

**Files:**
- Create: `site/js/game-state.js`
- Modify: `site/js/game.js`

Target: state-helper methods and the static weapon Sets. Likely candidates:
- `landOnlyWeapons` and `waterOnlyWeapons` Set construction (`game.js:73-78` per `site/CLAUDE.md`)
- Turn-token logic helpers (`game.js:2144-2220` per `site/CLAUDE.md`)
- `getCurrentTank()` and similar simple state accessors

This task is more discretionary — extract whatever forms a clean cluster after reading the code. If the cluster doesn't form cleanly, **skip this task and proceed to Task 16**. The wave is still a win without it.

- [ ] **Step 1: Survey candidates**

```bash
cd site
sed -n '70,100p' js/game.js
grep -n "getCurrentTank\|turnToken\|isAllowed" js/game.js | head -20
```

Decide: does a coherent ~500–800 line cluster of state helpers exist that doesn't have heavy coupling to physics/AI/victory? If yes, proceed. If no, skip.

- [ ] **Step 2 (if extracting): Create `site/js/game-state.js`**

Follow the same pattern as Task 13: pure functions taking `game` as first arg, exported by name, re-bound to `Game.prototype` in `game.js`.

For the weapon Sets (which are likely constructed in the Game constructor or as static fields), the cleanest approach is to export them as module constants:

```js
// game-state.js
export const LAND_ONLY_WEAPONS = new Set([
    'marker_airstrike', 'marker_airnukes', 'marker_attack',
    'marker_medic', 'parachute_flare', 'napalm', 'smoke_bomb', 'flare'
]);

export const WATER_ONLY_WEAPONS = new Set([
    'torpedo', 'homing_torpedo', 'depth_charge',
    'underwater_mine', 'navy_seal', 'sonar_pulse'
]);
```

In `game.js` constructor, replace local Set construction with:

```js
import { LAND_ONLY_WEAPONS, WATER_ONLY_WEAPONS } from './game-state.js';
// ...in constructor:
this.landOnlyWeapons = LAND_ONLY_WEAPONS;
this.waterOnlyWeapons = WATER_ONLY_WEAPONS;
```

This preserves the existing `game.landOnlyWeapons.has(weapon)` call pattern — no breakage.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Smoke + manual playtest — focus on weapon filtering**

Forest preset: weapon menu shows all land/universal weapons. Ocean preset: land-only weapons grayed out, water-only available. AI uses appropriate weapons on each map.

- [ ] **Step 5: Commit**

```bash
git add site/js/game.js site/js/game-state.js
git commit -m "refactor(game): extract weapon Sets + state helpers to game-state.js"
```

Or, if skipped: skip to Task 16.

---

## Task 16: Extract `game-ai.js`

**Files:**
- Create: `site/js/game-ai.js`
- Modify: `site/js/game.js`

Target functions:
- `chooseAIWeapon(aiTank, target, distance)` — line ~6487
- `performAITurn()` — line referenced from `game.js:6344`
- AI-only helpers used by these (skill-based aiming error, target selection, etc.)

**Important:** AI depends on physics (`drawTrajectoryGuide`-like simulation) and state (weapon Sets). Doing AI last (Task 16) means those are already extracted, so AI just imports them.

- [ ] **Step 1: Map the AI block**

```bash
cd site
sed -n '6340,6360p' js/game.js  # performAITurn caller context
grep -n "performAITurn\|chooseAIWeapon\|aiSkill\|_aiAim" js/game.js | head -30
```

Identify the contiguous lines that form the AI cluster.

- [ ] **Step 2: Create `site/js/game-ai.js`**

Same pattern as previous extractions:

```js
// game-ai.js — AI weapon selection and turn execution.

export function chooseAIWeapon(game, aiTank, target, distance) {
    // ... body, `this.` → `game.` ...
}

export function performAITurn(game /* + any other args */) {
    // ... body, `this.` → `game.` ...
}

// Plus any private helpers as non-exported functions in this file.
```

If `chooseAIWeapon` references `game.landOnlyWeapons` / `game.waterOnlyWeapons`, that already works because Task 15 kept the same property names on the instance.

- [ ] **Step 3: Re-bind in `game.js`**

```js
import {
    chooseAIWeapon as _chooseAIWeapon,
    performAITurn as _performAITurn,
} from './game-ai.js';

// At bottom:
Game.prototype.chooseAIWeapon = function (aiTank, target, distance) {
    return _chooseAIWeapon(this, aiTank, target, distance);
};
Game.prototype.performAITurn = function (...args) {
    return _performAITurn(this, ...args);
};
```

Delete the original method bodies.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Smoke + manual playtest — full AI cycle**

This is the most failure-prone extraction. Test:
- Forest preset, 1 vs AI medium → AI plays a turn, picks a sensible weapon, fires, hits or misses with appropriate accuracy → eventually one side wins.
- Ocean preset, 1 vs AI medium → AI picks underwater weapons, never picks land-only weapons.
- AI easy / hard → AI accuracy differs noticeably.

- [ ] **Step 6: Commit**

```bash
git add site/js/game.js site/js/game-ai.js
git commit -m "refactor(game): extract AI logic to game-ai.js"
```

---

## Task 17: Final Cleanup & Size Verification

**Files:**
- Modify: `site/js/game.js` (final polish only)

- [ ] **Step 1: Check line counts**

```bash
cd site
wc -l js/game.js js/game-*.js
```

Expected:
- `game.js` ≤ 3,000 lines (down from 8,180)
- Each `game-*.js` ≤ 1,500 lines

If `game.js` is still >3,000, evaluate whether a `game-ui.js` extraction (DOM helpers, debug overlay rendering) is warranted. If extracting feels forced, document the remaining size in a follow-up note rather than forcing a split.

- [ ] **Step 2: Tidy imports + remove any now-unused code**

Check `game.js` for:
- Imports that became unused after extraction (remove them)
- Comments referencing extracted functions that no longer live in the file (update to point at the new module)

- [ ] **Step 3: Update `site/CLAUDE.md` "Architecture" / "File Location Reference" sections**

The "Core Files Structure" tree and "File Location Reference" sections in `site/CLAUDE.md` should reflect the new modules. Update them — keep the writing style consistent with the existing doc.

- [ ] **Step 4: Final lint + format**

```bash
npm run lint:fix
npm run format
```

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add site/
git commit -m "refactor(game): tidy imports + update CLAUDE.md after split"
```

---

## Wave 3 Checkpoint (Final)

- [ ] **CI verify**

```bash
cd site && npm run ci:verify
```

- [ ] **Smoke test**

```bash
npm run test:smoke
```

- [ ] **Full manual playtest checklist** — every item.

- [ ] **Confirm acceptance criteria** (from spec):

```bash
cd site

# game.js ≤ 3,000 lines
wc -l js/game.js

# extracted modules ≤ 1,500 lines each
wc -l js/game-*.js

# production builds have no console logs
npm run build && grep -r "console\.log\|console\.debug\|console\.info" dist/assets/*.js | wc -l   # expect 0

# audit clean
npm audit --audit-level=high   # expect 0 vulnerabilities

# canyon collision works (manual — playtest checklist)
# fetch error toast works (manual — offline test)
```

- [ ] **Open a PR**

```bash
cd /home/jesse/projects/domains/sites/rc-9.com
git push -u origin cleanup/2026-05-17-cleanup-and-security

gh pr create --title "Cleanup + security pass: scanner, dep bumps, canyon fix, game.js split" --body "$(cat <<'EOF'
## Summary
- Wave 1: Security Dashboard V2 installed, console logs stripped from prod, safe dep bumps (PixiJS/GSAP/ESLint/Playwright), local credentials renamed to `*.local.md`, stale doc cleanup, lint+format pass
- Wave 2: Canyon-map collision fix, user-facing toast when config.json fetch fails
- Wave 3: `game.js` split into game-state / game-physics / game-ai / game-victory modules; main file shrunk from 8,180 to ≤3,000 lines

## Test plan
- [ ] `npm run ci:verify` passes
- [ ] `npm run test:smoke` passes
- [ ] Manual playtest: forest, ocean, canyon (collision now works)
- [ ] Offline DevTools test: config fetch error toast appears
- [ ] AI plays sensibly on both land and ocean maps
- [ ] Victory toast still works correctly

See `docs/superpowers/specs/2026-05-17-rc-9-cleanup-and-security-design.md` for design context.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Out-of-Scope Reminders

These are intentionally NOT in this plan (deferred to follow-up):

- Vite 7 → 8 major upgrade
- TypeScript migration
- Vitest unit tests
- `main.js` split (3,342 lines — separate follow-up plan)
- Triaging Security Dashboard V2 findings beyond the baseline (separate follow-up)
- Refactoring the global-state pattern (`window.game`)
- New gameplay features (drive-during-opponent-turn, defend-the-base, network multiplayer)
- Render-loop error boundary (was optional in spec; punt to follow-up)

---

## Self-Review Notes

Run after the implementer (or AI) finishes all 17 tasks:

- Did every Wave 1 acceptance criterion land? Re-read spec section "Acceptance Criteria" against final state.
- Are there any TODO / FIXME / XXX comments newly introduced? `git diff main...HEAD | grep -E '(TODO|FIXME|XXX)'` — none expected from this work.
- Does `git log main..HEAD --oneline` read as a coherent narrative? Each commit should be a single atomic change.
- Are the new `game-*.js` files small enough to hold in your head when reading? If one is over 1,500 lines, that's a code-smell signal worth a follow-up.
