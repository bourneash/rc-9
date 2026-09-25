---
task_id: 435e82dc-35bd-41cf-8153-bcaf94911684
title: Fix PERFORMANCE, ACCESSIBILITY, LCP_MS, TBT_MS performance budgets
priority: 3
type: engineering
estimated_turns: 12
created: 2026-09-25
assigned_role: engineer
source: fleet-dashboard
source_id: 9221a6fa-4485-4fe5-91aa-6ea6acd5d94a
correlation_id: change-request:9221a6fa-4485-4fe5-91aa-6ea6acd5d94a
---

## Human request

Evidence-backed candidate from the executive intelligence snapshot: "performance 48 · LCP 4977ms · TBT 1513ms (mobile lab run)"
Recommendation: Inspect the existing site report and select the smallest reversible improvement.
Primary metric: site-specific attributable outcome. Record the baseline before changing anything and measure for 14 days or 100 new impressions.
Acceptance: preserve existing behavior outside the requested change, run focused tests and the site build, and record the exact files or report artifact produced.
Rollback: revert only this bounded change if validation gates fail or the measured metric materially declines.

change-request: 9221a6fa-4485-4fe5-91aa-6ea6acd5d94a
