#!/usr/bin/env bash
# Worker entrypoint. Receives <role> as first arg, runs run-role.sh.
# Inside the container, $ROLE drives which role's prompt is loaded.
set -euo pipefail

ROLE="${1:-}"
if [[ -z "$ROLE" ]]; then
  echo "usage: docker compose run --rm worker <role-name>"
  exit 2
fi

# Claude Code needs a writable ~/.claude directory for session files.
# We mount only credentials + settings + one skill, so ensure the
# directory structure exists for Claude to write session/state files.
mkdir -p "$HOME/.claude/projects" 2>/dev/null || true

# Ensure git config is set (cron has none)
git config --global user.name  "${GIT_USER_NAME:-Remote Command Bot}"
git config --global user.email "${GIT_USER_EMAIL:-bot@rc-9.com}"
git config --global --add safe.directory /work

# SSH refuses to use config / key files with group/other read perms (>600).
# The host's ~/.ssh/ is bind-mounted read-only with whatever perms the host
# has, which may be 644/664. We can't chmod a read-only mount, so we copy
# the relevant files into a writable tmpfs with strict 600 perms and point
# git at that. This is idempotent and runs every container start.
if [ -d "$HOME/.ssh" ]; then
  mkdir -p /tmp/ssh
  cp -f "$HOME/.ssh/config" /tmp/ssh/config 2>/dev/null || true
  cp -f "$HOME/.ssh/known_hosts" /tmp/ssh/known_hosts 2>/dev/null || true
  for k in "$HOME/.ssh/"github-* "$HOME/.ssh/"id_*; do
    [ -f "$k" ] && cp -f "$k" "/tmp/ssh/$(basename "$k")"
  done
  chmod 700 /tmp/ssh
  chmod 600 /tmp/ssh/* 2>/dev/null || true
  # Override the GIT_SSH_COMMAND from compose to point at the tmp config
  if [ -f /tmp/ssh/config ]; then
    export GIT_SSH_COMMAND="ssh -F /tmp/ssh/config -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/tmp/ssh/known_hosts"
  fi
fi

# Make sure site/ deps are installed and up-to-date.
# Always run npm ci if node_modules is missing OR if package-lock.json is newer
# than node_modules (deps changed since last install).
if [ -d /work/site ]; then
  if [ ! -d /work/site/node_modules ] || [ /work/site/package-lock.json -nt /work/site/node_modules ]; then
    echo "[entrypoint] Installing site deps..."
    cd /work/site && npm ci --silent && cd /work
  fi
fi

# Hand off to the existing run-role.sh
exec /work/ops/scripts/run-role.sh "$ROLE"
