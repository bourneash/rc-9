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
set -uo pipefail

[[ -z "${SLACK_BOT_TOKEN:-}" ]] && exit 0

CHANNEL="${1:-}"
TEXT="${2:-}"
COLOR="${3:-#2eb67d}"

if [[ -z "$CHANNEL" || -z "$TEXT" ]]; then
  echo "[notify-slack] usage: $0 <channel> <text> [color]" >&2
  exit 0
fi

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
