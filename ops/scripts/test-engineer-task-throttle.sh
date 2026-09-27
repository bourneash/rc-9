#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHECK="$ROOT/ops/scripts/engineer-check.sh"
RUN="$ROOT/ops/scripts/run-engineer.sh"
COMPOSE="$ROOT/docker-compose.yml"

bash -n "$CHECK" "$RUN"
grep -q '^MAX_TASKS=1$' "$CHECK"
grep -q 'ignoring unsafe ENGINEER_MAX_TASKS' "$CHECK"
grep -q 'QUEUE_LIST" == \*,\*' "$RUN"
grep -q 'one task per pass is mandatory' "$RUN"
grep -q 'ENGINEER_MAX_TASKS: \${ENGINEER_MAX_TASKS:-1}' "$COMPOSE"

echo "engineer task throttle hardening: ok"
