# Board Report

## 2026-10-03 — Deploy

✅ **Deploy succeeded** — Board updates + task state reordering (hold → capacity deadline passed). Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray: a44a6a871cde7206-EWR).

## 2026-09-30 — Deploy (10:30 UTC)

✅ **Deploy succeeded** — Created IndexNow ping script + added ContactPage JSON-LD structured data. Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray: a4328e1448ba42ac-EWR).

## 2026-09-30 — SEO Analysis

**GSC unavailable** — `DATAHUB_API` not set in container environment; keyword-gap and CTR analysis blocked until provisioned.

**Schema audit:** `/contact` emits no JSON-LD structured data — all other indexable pages have schema. Engineering task filed.

**IndexNow:** No `site/scripts/indexnow-ping.mjs` found; Bing receives no proactive pings after deploys. Engineering task filed.

**Internal linking:** Footer nav on `privacy.html` and `terms.html` is missing `/help` link present on all other pages. Content task filed.

**Sitemap health:** 4 pages in sitemap-0.xml; single redirect entry valid; canonical tags present on all indexable pages.

Tasks filed: `2026-09-30-add-indexnow-ping-script`, `2026-09-30-contact-page-schema-json-ld`, `2026-09-30-fix-footer-nav-privacy-terms`. See `ops/board/seo-2026-09-30.md` for full report.

## 2026-09-25 — Deploy (21:30 ET)

✅ **Deploy succeeded** — AdSense SDK deferred to window.load: removes adsbygoogle.js execution from TBT window. Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray: a40d221b9b5e8c7b-EWR).

## 2026-09-25 — Deploy

✅ **Deploy succeeded** — npm audit fix in site/: upgraded @xmldom/xmldom 0.8.13→0.8.15 in package-lock.json, clearing 10 high-severity CVEs. Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray: a4069c33df968dd6-EWR).

## 2026-09-22 — Deploy

✅ **Deploy succeeded** — Perf task: moved main.js (pixi.js 968KB) to dynamic import for LCP improvement. Built, tested, and deployed to rc-9 Worker. Smoke test passed (HTTP 200, cf-ray verified).
