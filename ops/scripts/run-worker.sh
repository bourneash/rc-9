#!/usr/bin/env bash
# Wrapper: ensure the worker image exists before invoking a role.
# Rebuilds from Dockerfile.worker if the image is absent (e.g. after docker system prune).
set -euo pipefail

ROLE="${1:-}"
if [[ -z "$ROLE" ]]; then
  echo "usage: $0 <role>" >&2
  exit 2
fi

# Hard kill-switch: if ops/.<role>-disabled exists, no-op immediately WITHOUT
# spinning a worker container. Bind-mounted, so this takes effect on the next
# scheduled fire with no rebuild/restart. Re-enable: rm ops/.<role>-disabled
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -f "$SCRIPT_DIR/ops/.${ROLE}-disabled" ]]; then
  echo "[$(date -Iseconds)] $ROLE is DISABLED (ops/.${ROLE}-disabled present) — skipping"
  exit 0
fi

if ! docker image inspect rc-9-worker:latest >/dev/null 2>&1; then
  echo "[$(date -Iseconds)] worker image missing — rebuilding before running $ROLE"
  # Inside the cron container HOME points to the host home but ~/.docker isn't
  # bind-mounted, so docker compose build fails with "mkdir ~/.docker: permission denied".
  # Fall back to a writable temp dir so the build succeeds from any context.
  if [[ -z "${DOCKER_CONFIG:-}" ]] && ! mkdir -p "${HOME}/.docker" 2>/dev/null; then
    export DOCKER_CONFIG=/tmp/.docker-config
    mkdir -p "$DOCKER_CONFIG"
  fi
  docker compose build --build-arg NODE_MAJOR="$(cat site/.nvmrc | tr -d '[:space:]')" worker
fi

# Wall-clock guard + guaranteed container teardown. `timeout` kills the
# `docker compose run` CLIENT, but a headless run (no TTY under supercronic) does
# NOT propagate that to the CONTAINER — it keeps running, reparented under
# containerd-shim, holding the bind-mounted ops/.locks/<role>.lock flock forever
# and wedging every later run. Naming the run + force-removing it on any exit
# (trap) guarantees the flock releases however the client dies. Portable timeout
# flags only (cron is Alpine/BusyBox): `-k <secs> <secs>`, never GNU `--kill-after=`.
RUN_NAME="$(basename "$SCRIPT_DIR" | tr -cd 'A-Za-z0-9._-')-${ROLE}-$$"
cleanup_container() { docker rm -f "$RUN_NAME" >/dev/null 2>&1 || true; }
trap cleanup_container EXIT INT TERM
timeout -k 30 7200 docker compose run --rm --name "$RUN_NAME" worker "$ROLE"
exit $?
