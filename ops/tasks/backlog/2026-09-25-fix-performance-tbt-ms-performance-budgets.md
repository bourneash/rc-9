---
task_id: 96f91f25-6aa2-4827-9cc0-1dbdb5fb30be
title: Fix PERFORMANCE, TBT_MS performance budgets
priority: 3
type: engineering
estimated_turns: 12
created: 2026-09-25
assigned_role: engineer
source: fleet-dashboard
source_id: 7a568b26-f07a-4e90-a3c1-a75397548be3
correlation_id: change-request:7a568b26-f07a-4e90-a3c1-a75397548be3
---

## Human request

Evidence-backed candidate from the executive intelligence snapshot: "performance 70 · TBT 1831ms (mobile lab run)"
Recommendation: Inspect the existing site report and select the smallest reversible improvement.
Primary metric: site-specific attributable outcome. Record the baseline before changing anything and measure for 14 days or 100 new impressions.
Acceptance: preserve existing behavior outside the requested change, run focused tests and the site build, and record the exact files or report artifact produced.
Rollback: revert only this bounded change if validation gates fail or the measured metric materially declines.

change-request: 7a568b26-f07a-4e90-a3c1-a75397548be3
