# Board Report

## 2026-09-25 — Deploy (21:30 ET)

✅ **Deploy succeeded** — AdSense SDK deferred to window.load: removes adsbygoogle.js execution from TBT window. Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray: a40d221b9b5e8c7b-EWR).

## 2026-09-25 — Deploy

✅ **Deploy succeeded** — npm audit fix in site/: upgraded @xmldom/xmldom 0.8.13→0.8.15 in package-lock.json, clearing 10 high-severity CVEs. Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray: a4069c33df968dd6-EWR).

## 2026-09-22 — Deploy

✅ **Deploy succeeded** — Perf task: moved main.js (pixi.js 968KB) to dynamic import for LCP improvement. Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray verified).
