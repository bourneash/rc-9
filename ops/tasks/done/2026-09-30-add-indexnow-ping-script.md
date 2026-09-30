---
title: "Add IndexNow ping script for post-deploy URL submission"
priority: 2
type: engineering
created: 2026-09-30
assigned_role: engineer
source_role: seo-analyst
---
No `site/scripts/indexnow-ping.mjs` exists. The SEO role's workflow step that runs this script after every deploy silently skips because the file is absent. Without it, Bing and other IndexNow-compatible engines receive no proactive notification when pages change or are added — relying solely on crawl scheduling. Create the script (reads `site/dist/sitemap-0.xml`, POSTs each URL to the IndexNow endpoint using an API key stored in a Cloudflare secret or env var) and wire it into the deploy pipeline after a successful build.
