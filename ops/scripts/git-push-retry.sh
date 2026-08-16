#!/usr/bin/env bash
# Shared `git push` retry helper.
#
# Why: the cron container resolves github.com through Docker's embedded resolver
# (127.0.0.11 -> host systemd-resolved). That path intermittently returns
# EAI_AGAIN, and ssh reports it as:
#
#   ssh: Could not resolve hostname github.com: Try again
#   fatal: Could not read from remote repository.
#
# A single-shot push turns a ~1-second DNS hiccup into a skipped deploy: the
# commit stays local, Cloudflare never sees a push, and the site serves stale
# content until some later role happens to push. Retrying with backoff costs
# nothing on the happy path and absorbs the hiccup.
#
# Usage:
#   source "$(dirname "$0")/git-push-retry.sh"
#   git_push_retry >>"$LOG" 2>&1 || { ...failure handling... }
#
# Env overrides: GIT_PUSH_TRIES (default 4), GIT_PUSH_TIMEOUT (default 120s).

git_push_retry() {
  local remote="${1:-origin}" branch="${2:-main}"
  local tries="${GIT_PUSH_TRIES:-4}" to="${GIT_PUSH_TIMEOUT:-120}"
  local n=1 delay=5

  while :; do
    if timeout "$to" git push "$remote" "$branch"; then
      [ "$n" -gt 1 ] && echo "git_push_retry: succeeded on attempt ${n}/${tries}"
      return 0
    fi
    if [ "$n" -ge "$tries" ]; then
      echo "git_push_retry: push to ${remote}/${branch} failed after ${tries} attempts"
      return 1
    fi
    echo "git_push_retry: attempt ${n}/${tries} failed — retrying in ${delay}s"
    # Nudge the resolver so a stale/empty cache isn't reused on the next try.
    getent hosts github.com >/dev/null 2>&1 || true
    sleep "$delay"
    n=$((n + 1))
    delay=$((delay * 3))
  done
}
