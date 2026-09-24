---
task_id: a2faca00-7534-460b-9e20-fd2a91a6d64c
title: Improve rc-9.com mobile performance budgets
priority: 3
type: engineering
estimated_turns: 12
created: 2026-09-24
assigned_role: engineer
source: fleet-dashboard
source_id: b095dec9-979b-41be-a7bc-35f78fc0918c
correlation_id: change-request:b095dec9-979b-41be-a7bc-35f78fc0918c
---

## Human request

Implement a bounded performance improvement for rc-9.com based on the 2026-09-22 SEO snapshot and 2026-09-21 mobile lab measurements: performance 73, LCP 4092ms, and TBT 226ms. Identify the largest above-the-fold assets and blocking JavaScript, then optimize only existing assets and code paths. Do not change content, monetization, navigation, credentials, infrastructure, schedules, dependencies, or analytics. Acceptance criteria: focused tests pass; build succeeds; key routes remain functional; no broken links or functional regressions; document exact changed files and comparable before/after mobile lab measurements for performance, LCP, and TBT. Measure after deployment using the same methodology. Roll back only the performance changes if functional checks fail or any measured performance, LCP, or TBT result worsens.

change-request: b095dec9-979b-41be-a7bc-35f78fc0918c
