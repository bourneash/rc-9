---
task_id: ecc83666-6742-44e6-a8cb-7c7d24a8ca4a
title: "Failure diagnosis: Fix PERFORMANCE, TBT_MS performance budgets"
priority: 3
type: engineering
estimated_turns: 12
created: 2026-09-25
assigned_role: engineer
source: fleet-dashboard
source_id: f4804e0c-a586-4829-9a8a-f2a961ad05cc
correlation_id: change-request:f4804e0c-a586-4829-9a8a-f2a961ad05cc
---

## Human request

Diagnose the failed implementation request 7a568b26-f07a-4e90-a3c1-a75397548be3: Fix PERFORMANCE, TBT_MS performance budgets.
Original request: Evidence-backed candidate from the executive intelligence snapshot: "performance 70 · TBT 1831ms (mobile lab run)"
Recommendation: Inspect the existing site report and select the smallest reversible improvement.
Primary metric: site-specific attributable outcome. Record the baseline before changing anything and measure for 14 days or 100 new impressions.
Acceptance: preserve existing behavior outside the requested change, run focused tests and the site build, and record the exact files or report artifact produced.
Rollback: revert only this bounded change if validation gates fail or the measured metric materially declines.
Durable failure case: The worker produced output, but a deterministic validation gate did not pass. Failure: quality gates did not pass quality gates did not pass
Required next action: Principal Engineer must inspect the failed gate and prepare the smallest correction or mark the request not actionable; do not retry the unchanged checkout.
Do not retry or modify the original implementation, production checkout, credentials, schedules, or spending.
Acceptance: produce a timestamped report identifying the failure class, exact evidence, whether the original task remains actionable, the smallest corrected task if applicable, validation gates, and rollback notes.

change-request: f4804e0c-a586-4829-9a8a-f2a961ad05cc
