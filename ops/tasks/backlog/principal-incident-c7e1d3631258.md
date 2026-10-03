---
title: "Post-deploy Lighthouse measurement needed for rc-9.com performance repairs"
priority: 1
type: ops
estimated_turns: 1
created: 2026-09-24
updated: 2026-10-03
assigned_role: human-triage
---

## What's needed

Run a Lighthouse / PageSpeed Insights mobile lab test against live rc-9.com and compare results to the pre-repair baseline.

**Pre-repair baseline (mobile lab, 2026-09-21):**
- Performance: 48 · LCP: 4,977 ms · TBT: 1,513 ms

**Repairs shipped (all live as of 2026-10-01 deploy, commit b4e85c5):**
1. 2026-09-22: `site/js/init.js` — `import('./main.js')` made dynamic (pixi.js 968KB off sync render path)
2. 2026-09-24: CSS critical-path split — render-blocking CSS 77KB → 31KB
3. 2026-09-24: `site/public/fonts/sc-700.woff2` + `<link rel=preload>` — Saira Condensed 700 (LCP element font) preloaded
4. 2026-09-25: `site/public/fonts/jb-400.woff2` + `<link rel=preload>` — JetBrains Mono 400 preloaded
5. 2026-09-25: `site/public/adsense.js` — AdSense SDK deferred to `window.load`
6. 2026-10-01: `site/js/init.js` — `import('./ads.js')` deferred behind `_scheduleIdle()` (commit b4e85c5)

**Expected improvement:** LCP ~4,977ms → <1,000ms; TBT ~1,513ms → <300ms; Performance score ~48 → ~85+

## Action

Jesse: run Lighthouse/PSI against https://rc-9.com (mobile, throttled). If results confirm improvement, this task is done. If any metric regressed, open a new task with the measured values.

## History

This escalation has recurred since 2026-09-24 (PE fingerprint c7e1d3631258 exhausted 3 retries; PE fingerprint 64d5fa1e93b5 dispatched 2026-10-03). No automated agent can run a lab measurement against the live site — this requires a human action. PE runs have confirmed the code fixes are in place; the measurement is the only outstanding item.
