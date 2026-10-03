---
task_id: 1d6b436e-0c1b-4841-b9d0-63126958400c
title: Hold rc-9.com web-vitals repair pending capacity
priority: 2
type: engineering
estimated_turns: 20
created: 2026-10-03
assigned_role: engineer
source: fleet-dashboard
source_id: d7f795b1-4edd-4a75-a77a-6deb3ae4e368
delivery_mode: direct
correlation_id: change-request:d7f795b1-4edd-4a75-a77a-6deb3ae4e368
gate_revision: 0f809004-c6aa-4a1b-9399-ef3c680a49d4
---

## Human request

The TBT repair is evidence-backed and low risk, but all delivery slots are occupied. No engineer admission is authorized this cycle.

Dependency cleared. After the 2026-10-01T09:00Z capacity decision, reassess whether a slot is available; escalate unresolved capacity to the owner by that deadline.
Acceptance criteria: The requested change is implemented for rc-9.com, deterministic tests pass, and the result is measurable with a rollback path.

Project-manager work_id: a8cbcde9-350b-470c-a28e-5a38725b12ea

change-request: d7f795b1-4edd-4a75-a77a-6deb3ae4e368

## Resolution — 2026-10-03T03:48Z

- **Status:** Hold overtaken by events. The TBT repair (deferred `ads.js` behind `requestIdleCallback`) was already implemented in `site/js/init.js` by the engineer run on 2026-10-01 (commit `b4e85c5 chore: mark improvement done`), prior to this hold task being queued.
- **Capacity deadline:** 2026-10-01T09:00Z has passed. The fix is in place and the capacity concern is moot.
- **Rollback:** revert `site/js/init.js` to restore eager `void import('./ads.js')`.
- **Next step:** Owner should run a post-deploy Lighthouse check against the pre-repair baseline (Performance 48, LCP 4,977 ms, TBT 1,513 ms) to confirm improvement.
