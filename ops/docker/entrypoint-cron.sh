#!/bin/sh
# Cron container entrypoint.
# 1. Sources .env.shared so SLACK_BOT_TOKEN and other creds are available
#    to run-deployer.sh and notify-slack.sh without a worker container.
# 2. Pre-builds the worker image if missing so the first scheduled run never
#    pays a cold-build penalty (e.g. after docker system prune -a).
set -e

echo "[$(date -Iseconds)] rc-9-cron starting"

# Load shared credentials into the environment so cron-level scripts
# (run-deployer.sh, notify-slack.sh) have access without spawning a worker.
ENV_SHARED="${PWD}/.env.shared"
if [ -f "$ENV_SHARED" ]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV_SHARED"; set +a
  echo "[$(date -Iseconds)] loaded .env.shared"
fi

if ! docker image inspect rc-9-worker:latest >/dev/null 2>&1; then
  echo "[$(date -Iseconds)] worker image missing — building before starting scheduler"
  # HOME points to host home but ~/.docker may not be bind-mounted yet.
  # Fall back to a writable temp dir so docker compose build succeeds.
  if ! mkdir -p "${HOME}/.docker" 2>/dev/null; then
    export DOCKER_CONFIG=/tmp/.docker-config
    mkdir -p "$DOCKER_CONFIG"
  fi
  docker compose build worker
  echo "[$(date -Iseconds)] worker image ready"
else
  echo "[$(date -Iseconds)] worker image already present — skipping build"
fi

exec /usr/local/bin/supercronic -passthrough-logs /etc/crontab.docker
