#!/usr/bin/env bash
# Force-kills stray one-shot worker containers that outlive any legitimate
# role run. `docker compose run --rm worker <role>` is supposed to be
# ephemeral, but supercronic's `timeout` only kills the CLIENT process under
# a headless (no-TTY) invocation — it does NOT propagate to the CONTAINER,
# so a hung role (or a manual `docker compose run` debug session someone
# forgot to close) can sit running for days, holding host resources and its
# ops/.locks/<role>.lock flock forever, wedging every later scheduled run.
#
# Pure bash, no Claude — runs cron-direct (like the watchdog) so detection
# and cleanup cost zero tokens. Cron line invokes this every 15 min.
#
# Kill threshold: nothing this project runs legitimately takes anywhere
# close to an hour (roles are turn-capped LLM calls or curl/build sweeps).
# Default 3600s leaves generous headroom; override with REAPER_MAX_AGE_SEC.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

MAX_AGE_SEC="${REAPER_MAX_AGE_SEC:-3600}"
NOTIFY="$REPO_ROOT/ops/scripts/notify-slack.sh"
CHANNEL="${SLACK_CHANNEL_RC9:-domain-rc-9-com}"

# Scope to THIS project's one-shot containers only — the cron container's
# docker.sock is the shared host daemon, so without the working_dir filter a
# reaper here could see (and kill) other sites' containers too. No service-name
# filter: only `docker compose run` invocations ever get oneoff=True (the
# long-running `cron` service never does), so this safely catches every
# one-shot worker service in the project (some sites run more than one, e.g.
# a local-LLM `worker` alongside a `claude-worker`).
mapfile -t IDS < <(docker ps -q \
  --filter "label=com.docker.compose.oneoff=True" \
  --filter "label=com.docker.compose.project.working_dir=${REPO_ROOT}")

for id in "${IDS[@]}"; do
  [[ -z "$id" ]] && continue

  started="$(docker inspect -f '{{.State.StartedAt}}' "$id" 2>/dev/null)" || continue
  # Docker emits RFC3339Nano (fractional seconds); busybox `date` (the cron
  # image is Alpine) can't parse that at all, even with -D. Strip the
  # fraction first, then try GNU `date -d` and fall back to busybox's
  # explicit-format `-D` for the same stripped string.
  started_stripped="${started%%.*}Z"
  started_epoch="$(date -u -d "$started_stripped" +%s 2>/dev/null \
    || date -u -D '%Y-%m-%dT%H:%M:%SZ' -d "$started_stripped" +%s 2>/dev/null)"
  [[ -z "$started_epoch" ]] && continue
  now_epoch="$(date +%s)"
  age_sec=$(( now_epoch - started_epoch ))

  if (( age_sec > MAX_AGE_SEC )); then
    name="$(docker inspect -f '{{.Name}}' "$id" 2>/dev/null | sed 's#^/##')"
    age_human="$(( age_sec / 60 ))m"
    echo "[$(date -Iseconds)] reap-stuck-workers: killing $name (id=$id, age=${age_human}, threshold=$((MAX_AGE_SEC / 60))m)"

    docker kill "$id" >/dev/null 2>&1 || true
    docker rm -f "$id" >/dev/null 2>&1 || true

    if [[ -x "$NOTIFY" ]]; then
      "$NOTIFY" "$CHANNEL" \
        ":wastebasket: Reaper killed stuck worker container \`$name\` — running ${age_human} (threshold $((MAX_AGE_SEC / 60))m). If this was legitimate work, bump REAPER_MAX_AGE_SEC in crontab.docker." \
        "warning" 2>/dev/null || true
    fi
  fi
done

exit 0
