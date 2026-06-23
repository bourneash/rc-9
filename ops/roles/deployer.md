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
2. `cd site && npm run build` — must succeed (Vite build). If it fails, append failure to BOARD_REPORT tagging `engineer.md` and exit. Do NOT deploy a broken build.
3. Stage + commit changes deliberately — `git add site/` plus any specific files you changed. **Never `git add -A` or `git add .`**. Then `git commit -m "deploy: <brief description>"`.
4. `git push origin main` — keeps git history in sync.
5. `cd site && npx wrangler deploy` — deploys the built `dist/` directly to the `rc-9` Worker. This is the live deploy step.
6. Wait ~30 seconds. Then curl `https://rc-9.com/` to confirm HTTP 200 + `cf-ray` header present.
7. On green smoke: remove `.deploy-needed`, append a one-line BOARD_REPORT note.
8. On red smoke: append a failure entry with route + expected vs actual + hypothesis. Tag `engineer.md`. Do NOT push a fix in this role.

## Success metrics

- Zero broken builds deployed
- Wrangler deploys always succeed or are cleanly rolled back
- One commit per deploy run — never bundle unrelated changes

## Hand-off

- Smoke failures → `engineer.md` via a brief in `ops/tasks/backlog/`
- CF dashboard issues (Worker binding) → append to `ops/board/CREDENTIALS_NEEDED.md`
