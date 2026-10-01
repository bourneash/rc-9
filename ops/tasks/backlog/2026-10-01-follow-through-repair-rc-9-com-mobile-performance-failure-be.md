---
task_id: 42ea821c-6170-493f-a380-c71addc12d35
title: "Follow through: Repair rc-9.com mobile performance failure before requeue"
priority: 2
type: engineering
estimated_turns: 20
created: 2026-10-01
assigned_role: engineer
source: fleet-dashboard
source_id: fd901599-b3b8-4397-b245-d635accd6069
correlation_id: change-request:fd901599-b3b8-4397-b245-d635accd6069
---

## Human request

The existing rc-9.com improvement is blocked by a retained implementation failure. Recorded baseline is mobile performance 48, LCP 4,977 ms, and TBT 1,513 ms. Repair the smallest isolated defect, validate it, and either requeue or close the existing work item.

Dependency cleared. Resolve: existing request is failed; automatic retry is disabled.
Acceptance criteria: The requested change is implemented for rc-9.com, deterministic tests pass, and the result is measurable with a rollback path.

Project-manager work_id: executive-proposal:a3634cb3-140d-408a-a89b-4a613395234d

change-request: fd901599-b3b8-4397-b245-d635accd6069
