#!/usr/bin/env bash
# Entrypoint: run-role.sh <role-name>
# Runs one autonomous role via `claude -p` headless.
# Cron-safe: explicit PATH, lockfile, timestamped logs, no inherited env assumptions.
#
# Roles: planner | news-writer | social-media | newsletter-editor | seo-analyst | engineer | deployer

set -euo pipefail

# --- Environment (cron has almost nothing by default) ---
# Container-aware: inside the worker container the project lives at /work
# and HOME is /home/ops (Dockerfile.worker sets USER ops / ENV HOME=/home/ops).
# On the host it's /home/jesse/projects/... and /home/jesse.
if [ -d /work/ops ] && [ -f /work/ops/scripts/run-role.sh ]; then
  REPO_ROOT="/work"
  export HOME="${HOME:-/home/ops}"
  export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  # Shared creds bind-mounted by docker-compose
  if [ -f /work/.env.shared ]; then
    set -a; . /work/.env.shared; set +a
  fi
else
  REPO_ROOT="/home/jesse/projects/domains/sites/rc-9.com"
  export HOME="/home/jesse"
  export PATH="/home/jesse/.local/bin:/home/jesse/.local/share/claude-code:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  # Node 23 for build/preview on the host
  if [ -d /home/jesse/.nvm/versions/node/v23.7.0/bin ]; then
    export PATH="/home/jesse/.nvm/versions/node/v23.7.0/bin:$PATH"
  fi
  if [ -f /home/jesse/projects/domains/.env ]; then
    set -a; . /home/jesse/projects/domains/.env; set +a
  fi
fi

ROLE="${1:-}"
if [[ -z "$ROLE" ]]; then
  echo "usage: $0 <update|planner|news-writer|social-media|newsletter-editor|seo-analyst|engineer|deployer>"
  exit 2
fi

# Kill-switch (defense-in-depth): honor ops/.<role>-disabled even if run-role.sh
# is reached by a path that bypasses run-worker.sh (e.g. a direct
# `docker compose run --rm worker <role>`). Mirrors run-worker.sh's check.
if [[ -f "$REPO_ROOT/ops/.${ROLE}-disabled" ]]; then
  echo "[$(date -Iseconds)] $ROLE is DISABLED (ops/.${ROLE}-disabled present) — skipping"
  exit 0
fi

ROLE_FILE="$REPO_ROOT/ops/roles/$ROLE.md"
LOG_DIR="$REPO_ROOT/ops/logs"
LOCK_DIR="$REPO_ROOT/ops/.locks"
TS="$(date +%Y-%m-%d-%H%M)"
LOG="$LOG_DIR/$ROLE-$TS.log"
LOCK="$LOCK_DIR/$ROLE.lock"

mkdir -p "$LOG_DIR" "$LOCK_DIR"

if [[ ! -f "$ROLE_FILE" ]]; then
  echo "role file not found: $ROLE_FILE" >&2
  exit 3
fi

# Lock — prevents overlap if previous run still going
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$TS] another $ROLE run is still in progress — skipping" >> "$LOG_DIR/$ROLE-skipped.log"

  # Alert if a role has been skipped too many times (locked out)
  SKIP_LOG="$LOG_DIR/$ROLE-skipped.log"
  SKIP_COUNT=$(wc -l < "$SKIP_LOG" 2>/dev/null || echo 0)
  if [ "$SKIP_COUNT" -ge 5 ]; then
    NOTIFY="$REPO_ROOT/ops/scripts/notify-slack.sh"
    CHANNEL="${SLACK_CHANNEL_RC9:-domain-rc-9-com}"
    if [[ -x "$NOTIFY" ]]; then
      "$NOTIFY" "$CHANNEL" \
        ":warning: *rc-9.com* \`$ROLE\` has been skipped $SKIP_COUNT times — possible stale lock. Check \`ops/.locks/$ROLE.lock\`" \
        "warning" 2>/dev/null || true
    fi
  fi
  exit 0
fi

cd "$REPO_ROOT"

# Clear stale git index.lock ONLY if no live git process holds it.
# Uses a cross-role git mutex (flock fd 8) so concurrent roles don't
# race on the same index.lock.
GIT_LOCK="$REPO_ROOT/.git/index.lock"
GIT_MUTEX="$LOCK_DIR/git-index.lock"
if [[ -f "$GIT_LOCK" ]]; then
  exec 8>"$GIT_MUTEX"
  if flock -n 8; then
    echo "[$TS] stale $GIT_LOCK found — removing before run" >> "$LOG_DIR/$ROLE-skipped.log"
    rm -f "$GIT_LOCK"
  fi
  exec 8>&-
fi

# ---- Pre-flight: snapshot .claude.json for auth self-recovery ----
# Concurrent worker containers share a bind-mounted ~/.claude.json; if two
# containers refresh tokens simultaneously they can corrupt the file (seen
# 2026-06-08 planner, 2026-06-10 seo-analyst).  We snapshot a known-good
# copy here and restore it in the 401-retry path below.
_CLAUDE_CFG="${HOME:-/home/ops}/.claude.json"
_CLAUDE_BAK_DIR="${HOME:-/home/ops}/.claude/backups"
mkdir -p "$_CLAUDE_BAK_DIR" 2>/dev/null || true
if [[ -s "$_CLAUDE_CFG" ]] && python3 -c "import sys,json; json.load(open(sys.argv[1]))" "$_CLAUDE_CFG" 2>/dev/null; then
  cp -f "$_CLAUDE_CFG" "$_CLAUDE_BAK_DIR/claude.json.$(date +%s)" 2>/dev/null || true
  ls -t "$_CLAUDE_BAK_DIR"/claude.json.* 2>/dev/null | tail -n +6 | xargs -r rm -f 2>/dev/null || true
fi

{
  echo "=== role=$ROLE started at $(date -Iseconds) ==="
  echo "cwd=$(pwd)"
  echo "claude=$(command -v claude) ($(claude --version 2>/dev/null || echo unknown))"
  echo "---"
} > "$LOG"

# --- Per-role dispatch ---
# `update` is bash-driven: all scaffolding (freshness check, image fetch, build,
# commit, smoke, IndexNow, social queue, board update) runs as scripts; claude -p
# is called only for creative writing (news scoring, article, briefing).
# All other roles use the original claude -p full-skill path.

if [[ "$ROLE" == "update" ]]; then
  set +e
  bash "$REPO_ROOT/ops/scripts/run-update.sh" "$LOG" 2>&1 | tee -a "$LOG"
  STATUS=$?
  set -e
elif [[ "$ROLE" == "engineer" ]]; then
  # Engineer is bash-driven like update: run-engineer.sh does all checks with zero
  # Claude turns and invokes Sonnet only when there is work. Model is selected
  # inside run-engineer.sh, so no --model flag here.
  set +e
  bash "$REPO_ROOT/ops/scripts/run-engineer.sh" "$LOG" 2>&1 | tee -a "$LOG"
  STATUS=$?
  set -e
elif [[ "$ROLE" == "breaking-news" ]]; then
  # Breaking-news is bash-driven: run-breaking-news.sh checks the cache + dedup
  # gates and invokes claude -p only when a story may have cleared the threshold.
  # Most fires are ~2s no-ops with zero LLM cost.
  set +e
  bash "$REPO_ROOT/ops/scripts/run-breaking-news.sh" "$LOG" 2>&1 | tee -a "$LOG"
  STATUS=$?
  set -e
else
  # --- Per-role turn budgets, wall-clock timeouts, and model selection ---
  case "$ROLE" in
    news-writer)        MAX_TURNS=30;  TIMEOUT=5400;  MODEL=""                          ;;  # 90m
    engineer)           MAX_TURNS=50;  TIMEOUT=9000;  MODEL=""                          ;;  # 2.5h
    newsletter-editor)  MAX_TURNS=35;  TIMEOUT=5400;  MODEL=""                          ;;  # 90m
    planner)            MAX_TURNS=30;  TIMEOUT=5400;  MODEL=""                          ;;  # 90m
    seo-analyst)        MAX_TURNS=30;  TIMEOUT=5400;  MODEL=""                          ;;  # 90m
    deployer)           MAX_TURNS=35;  TIMEOUT=1800;  MODEL="claude-haiku-4-5-20251001" ;;  # 30m
    *)                  MAX_TURNS=40;  TIMEOUT=7200;  MODEL=""                          ;;  # 2h
  esac

  MODEL_FLAG=""
  [[ -n "$MODEL" ]] && MODEL_FLAG="--model $MODEL"

  _run_claude() {
    # shellcheck disable=SC2086
    timeout "$TIMEOUT" claude -p "$(cat "$ROLE_FILE")

Today is $(date -Iseconds). The current working directory is $(pwd). Begin." \
      --max-turns "$MAX_TURNS" \
      --dangerously-skip-permissions \
      $MODEL_FLAG \
      >> "$LOG" 2>&1
  }

  set +e
  _run_claude
  STATUS=$?

  # Retry once on 401 / corrupted config — restore backup then re-run.
  if [[ "$STATUS" -ne 0 ]] && grep -qE "401|Invalid authentication credentials|corrupted" "$LOG" 2>/dev/null; then
    _LATEST_BAK=$(ls -t "$_CLAUDE_BAK_DIR"/claude.json.* 2>/dev/null | head -1 || true)
    if [[ -n "$_LATEST_BAK" ]]; then
      echo "--- auth failure detected — restoring $_CLAUDE_CFG from backup $_LATEST_BAK ---" >> "$LOG"
      cp -f "$_LATEST_BAK" "$_CLAUDE_CFG"
    else
      echo "--- auth failure detected — no backup available, waiting 60s ---" >> "$LOG"
    fi
    sleep 30
    _run_claude
    STATUS=$?
  fi
  set -e
fi

if [[ "$STATUS" -eq 124 ]]; then
  echo "--- TIMEOUT: role=$ROLE exceeded ${TIMEOUT}s wall-clock limit ---" >> "$LOG"
fi
echo "---" >> "$LOG"
echo "=== role=$ROLE finished at $(date -Iseconds) (exit=$STATUS) ===" >> "$LOG"

# Update last-run.json for health-check
STATUS_FILE="$REPO_ROOT/ops/board/last-run.json"
python3 - "$STATUS_FILE" "$ROLE" "$STATUS" "$LOG" <<'PY'
import json, os, sys, datetime
path, role, status, logpath = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
data = {}
if os.path.exists(path):
    try:    data = json.load(open(path))
    except: data = {}
data[role] = {
    "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "exit": status,
    "log": logpath,
}
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(data, open(path, "w"), indent=2, sort_keys=True)
PY

# Slack notifications for update and deployer roles only (high-signal).
# Other roles (planner, seo-analyst, etc.) are low-frequency and post to ops/board/.
if [[ "$ROLE" == "update" || "$ROLE" == "deployer" ]]; then
  NOTIFY="$REPO_ROOT/ops/scripts/notify-slack.sh"
  CHANNEL="${SLACK_CHANNEL_RC9:-domain-rc-9-com}"

  if [[ -x "$NOTIFY" ]]; then
    if [[ "$STATUS" -eq 0 ]]; then
      # Extract the **bold summary line** the role emits at the end of its run
      SUMMARY=$(sed -n '/^\*\*/,$p' "$LOG" | grep -v '^---$' | grep -v '^=== role=' || true)
      if [[ -n "$SUMMARY" ]]; then
        MSG="*rc-9.com* \`${ROLE}\` — ${SUMMARY}"
      else
        MSG="*rc-9.com* \`${ROLE}\` completed"
      fi
      "$NOTIFY" "$CHANNEL" "$MSG" "good" 2>/dev/null || true

    elif [[ "$STATUS" -eq 124 ]]; then
      MSG=":warning: *rc-9.com* \`${ROLE}\` timed out after ${TIMEOUT}s"
      "$NOTIFY" "$CHANNEL" "$MSG" "danger" 2>/dev/null || true

    else
      TAIL=$(tail -5 "$LOG" 2>/dev/null || true)
      if grep -qE "401|Invalid authentication credentials" "$LOG" 2>/dev/null; then
        MSG=$(printf ':key: *rc-9.com* `%s` failed (exit=%d) — OAuth token expired\nFix: open an interactive claude session to refresh, or set ANTHROPIC_API_KEY in .env.shared' "$ROLE" "$STATUS")
      else
        MSG=$(printf ':x: *rc-9.com* `%s` failed (exit=%d)\n```%s```' "$ROLE" "$STATUS" "$TAIL")
      fi
      "$NOTIFY" "$CHANNEL" "$MSG" "danger" 2>/dev/null || true
    fi
  fi
fi

exit "$STATUS"
