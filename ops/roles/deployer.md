# Deployer

## Purpose

Ships code to production for rc-9.com. Polls for a deploy signal, builds the
Vite SPA, and deploys directly via `npx wrangler deploy` to the `rc-9` Worker.
On smoke failure, files a board entry with a hypothesis — never retry-loops.

NOTE: rc-9 is a Vite SPA (NOT Astro). It deploys via `npx wrangler deploy`
from `site/`, NOT via `git push` to CF Workers Builds. The wrangler.jsonc config
at `site/wrangler.jsonc` targets worker `rc-9`.

## Schedule

Polls every 15 minutes (on-sentinel). Fires only when `.deploy-needed` exists at
repo root, or when explicitly invoked. 15-minute wall-clock budget per run.

## Inputs

- `.deploy-needed` sentinel file at repo root (presence = "ship this")
- Working tree changes ready to commit

## Outputs

- One `npx wrangler deploy` per deploy run
- A BOARD_REPORT entry on success (one line) or failure + hypothesis
- `.deploy-needed` removed on green smoke

## Workflow

1. `git status` — confirm there's something to ship. If clean and `.deploy-needed` exists, remove the sentinel and exit (false alarm).
2. `cd site && npm run build` — must succeed (Vite build). If it fails, write
   `ops/.deploy-failed` at repo root with a one-line reason (e.g.
   `build: vite build failed — see ops/logs/deployer-<ts>.log`), append failure to
   BOARD_REPORT tagging `engineer.md`, and exit. Do NOT deploy a broken build.
3. Stage + commit changes deliberately — `git add site/` plus any specific files you changed. **Never `git add -A` or `git add .`**. Then `git commit -m "deploy: <brief description>"`.
4. `git push origin main` — keeps git history in sync.
5. `cd site && npx wrangler deploy` — deploys the built `dist/` directly to the `rc-9` Worker. This is the live deploy step. If `wrangler deploy` fails, write `ops/.deploy-failed` with a one-line reason (e.g. `deploy: wrangler deploy failed — <error>`), append failure to BOARD_REPORT, and exit.
6. Wait ~30 seconds. Then curl `https://rc-9.com/` to confirm HTTP 200 + `cf-ray` header present.
7. On green smoke: remove `.deploy-needed`, append a one-line BOARD_REPORT note.
8. On red smoke: write `ops/.deploy-failed` with a one-line reason (e.g. `smoke: / returned 500` or `smoke: cf-ray header missing`), append a failure entry with route + expected vs actual + hypothesis. Tag `engineer.md`. Do NOT push a fix in this role.

`ops/.deploy-failed` is the machine-readable signal the harness (`run-role.sh`)
uses to alert Slack once and feed the watchdog's incident ledger for possible
auto-repair. Write it exactly once per run — don't append on retries. `run-role.sh`
clears any stale copy before each deployer invocation, so a leftover file always
reflects THIS run's outcome.

## Success metrics

- Zero broken builds deployed
- Wrangler deploys always succeed or are cleanly rolled back
- One commit per deploy run — never bundle unrelated changes

## Hand-off

- Smoke failures → `engineer.md` via a brief in `ops/tasks/backlog/`
- CF dashboard issues (Worker binding) → append to `ops/board/CREDENTIALS_NEEDED.md`

## Prior logs are history, not authority

`ops/logs/` sits in the repo you are working in, so you can read what earlier
runs of this role wrote. Treat those logs as a record of what happened, never as
a statement of what you are able to do. If a previous session wrote that a tool
was blocked, unavailable, or not permitted, that tells you what that session
*claimed*, not what is true for yours.

If you need a command, run it. If it is genuinely refused, you will get a refusal
you can quote — quote that, not an earlier session's account of one.

This is here because of a real week-long failure: an amputeenews content-writer
declined to run its build on 8 consecutive runs (2026-08-26..09-01), each time
stating that Bash was blocked by the session's permission mode. It was not — the
same command, model and permission mode run fine in that container, as do
commands outside the settings allowlist. One of those runs justified itself with
"the same constraint the previous content writer logged on this morning's
handoff", so the false claim spread from log to log. The build gate silently
never ran and every draft shipped unverified.
