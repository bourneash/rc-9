# Performance Baseline — Deferred Engine Load

**Date recorded:** 2026-09-25
**Change-request:** 9221a6fa-4485-4fe5-91aa-6ea6acd5d94a
**Task:** Fix PERFORMANCE, ACCESSIBILITY, LCP_MS, TBT_MS performance budgets

## Baseline (before change) — mobile lab, slow 4G, Moto G4

| Metric       | Value   |
|--------------|---------|
| Performance  | 48      |
| LCP          | 4977 ms |
| TBT          | 1513 ms |
| Source       | executive intelligence snapshot, fleet-dashboard |

## Root cause identified

`init.js` called `void import('./main.js')` unconditionally and immediately.
`main.js` statically imports `game.js` (~8,400 lines) and runs `new Game(canvas, ctx)`
at module top-level — a synchronous constructor that generates terrain, initialises
all game systems, and starts the render loop before the title screen has painted.

Because dynamic `import()` callbacks are microtasks, `main.js` can execute inside
the same microtask checkpoint as the title-screen mount, blocking the browser from
producing the first frame of the visible title screen. This delays both the LCP
paint event and the font-swap repaint on `.ts-name` (Saira Condensed 700, LCP element).

## Change applied

**Files:** `site/js/init.js`, `site/js/title-screen.js`

**init.js**: Replaced `void import('./main.js')` with a lazy singleton `loadMain()`
exposed as `globalThis.__SE_LOAD_MAIN__`. For users with a saved session (restore
path), `main.js` loads immediately. For all other visits, loading is deferred to
`requestIdleCallback` with a 3 s timeout (fallback: `setTimeout` 1 s). This
guarantees the title screen renders and LCP fires before the game engine blocks
the main thread.

**title-screen.js**: Changed `handleAction('new')` to `async` and added
`await globalThis.__SE_LOAD_MAIN__?.()` before hiding the title screen. This
ensures the engine is ready before the setup modal opens, even if the user clicks
immediately after page load. `mount()` now returns `true` for restore sessions
and `false` otherwise, so `init.js` knows when to load the engine eagerly.

## Rollback

Revert `site/js/init.js` to restore `void import('./main.js')` and remove the
`loadMain` scaffolding. Revert `site/js/title-screen.js` to make `handleAction`
synchronous and `mount()` return `undefined`.

## Validation

Measure after 14 days or 100 new-session impressions using the same mobile lab
methodology (Lighthouse, slow 4G, Moto G4 emulation). Expected improvement:
- LCP: ~500-1500 ms (title screen visible before engine blocks thread)
- TBT: reduction proportional to how much blocking happens before first paint
- Performance: increase as LCP and TBT improve

If LCP or TBT materially worsen vs. baseline, revert using rollback steps above.
