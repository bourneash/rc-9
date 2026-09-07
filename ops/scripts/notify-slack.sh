#!/usr/bin/env bash
# Post a message to a Slack channel via the Domain Ops bot token.
#
# Usage: notify-slack.sh <channel> <text> [color]
#   channel — Slack channel name (no #) or channel ID
#   text    — Message body; Slack mrkdwn supported; literal newlines OK
#   color   — Attachment sidebar: good | warning | danger | #rrggbb
#             Default: #2eb67d (green)
#
# Reads SLACK_BOT_TOKEN from environment (set in /home/jesse/projects/domains/.env).
# Silent no-op if SLACK_BOT_TOKEN is unset — never exits non-zero.
#
# Disk logging: every call that reaches Slack (or would have, had a token been
# set) also appends one JSON line to ops/logs/slack-<UTC-date>.jsonl. This is
# the fleet's only durable record of what got posted — the Slack API call
# itself is fire-and-forget and a dropped/rate-limited post previously left no
# trace anywhere. The principal-engineer role reads this log to find real
# errors/warnings without re-deriving them from role scripts. Logging is
# best-effort and must never affect this script's own behavior or exit code.
set -uo pipefail

CHANNEL="${1:-}"
TEXT="${2:-}"
COLOR="${3:-#2eb67d}"

if [[ -z "$CHANNEL" || -z "$TEXT" ]]; then
  echo "[notify-slack] usage: $0 <channel> <text> [color]" >&2
  exit 0
fi

# Severity from the attachment color. Named tokens are what every caller in
# this fleet actually uses (good/warning/danger); a raw #rrggbb is treated as
# "info" since nothing here passes a custom hex for an error today.
case "$COLOR" in
  danger)  SEVERITY="error" ;;
  warning) SEVERITY="warning" ;;
  *)       SEVERITY="info" ;;
esac

log_to_disk() {
  local repo_root log_dir log_file
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)" || return 0
  log_dir="$repo_root/ops/logs"
  mkdir -p "$log_dir" 2>/dev/null || return 0
  log_file="$log_dir/slack-$(date -u +%Y-%m-%d).jsonl"
  python3 -c "
import json, sys, time
ts = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
print(json.dumps({'ts': ts, 'channel': sys.argv[1], 'color': sys.argv[2], 'severity': sys.argv[3], 'text': sys.argv[4]}))
" "$CHANNEL" "$COLOR" "$SEVERITY" "$TEXT" >> "$log_file" 2>/dev/null || true
}
log_to_disk

[[ -z "${SLACK_BOT_TOKEN:-}" ]] && exit 0

# Python builds the JSON payload so arbitrary text (quotes, newlines, etc.) is
# encoded correctly without fragile shell escaping.
PAYLOAD=$(python3 -c "
import json, sys
channel, text, color = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({
    'channel': channel,
    'attachments': [{
        'color': color,
        'text': text,
        'mrkdwn_in': ['text']
    }]
}))
" "$CHANNEL" "$TEXT" "$COLOR" 2>/dev/null) || {
  echo "[notify-slack] could not build JSON payload — skipping" >&2
  exit 0
}

curl -sf -X POST "https://slack.com/api/chat.postMessage" \
  -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  --max-time 10 \
  -o /dev/null \
  2>/dev/null \
|| echo "[notify-slack] warning: Slack API unreachable (notification dropped)" >&2

exit 0
