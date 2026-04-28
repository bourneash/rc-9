# rc-9.com Board Report

**For:** Jesse Tamburino (Board Member)
**From:** Claude (Operator)
**Cadence:** Updated weekly, Mondays

---

## Current Status: Phase 1 — Foundation (Week 1)

**Plan approved:** 2026-04-23
**Credentials received:** 2026-04-23 (PayPal + legal name)
**Next milestone:** First portal submission live

---

## This Week

### Done (Week 1, Day 1-2)
- [x] Income strategy approved (Phases 1 + 2 documented)
- [x] PayPal + legal name received
- [x] Created `INCOME_PLAN.md`, `CREDENTIALS.md`, `CREDENTIALS_NEEDED.md`, `BOARD_REPORT.md`
- [x] **Production build verified portal-ready** — 2.3MB, 385KB gzipped, no external URL deps, fits all portal size limits
- [x] **GameDistribution SDK integrated** — `scorched_earth/js/ads.js` with preroll + rewarded API, session cap, dev/portal auto-detection
- [x] **5 portal submission zips packaged** — CrazyGames, Poki (pending Poki-specific SDK swap), GameDistribution, Y8, Kongregate, Itch.io
- [x] **Game metadata doc** — `portal-submissions/GAME_METADATA.md` with descriptions, tags, ratings, monetization disclosures ready to copy/paste per portal
- [x] **Screenshot automation** — `scripts/capture-marketing.js` Playwright script ready to auto-generate thumbnails + gameplay shots
- [x] **Ad integration plan** — `scorched_earth/ADS_INTEGRATION.md` documents the 4 rewarded ad hook points
- [x] **AI battle stream scaffold** — `ai-battle-stream/README.md` with VPS setup, automation plan, cost analysis, launch checklist

### Next (Week 1, Day 3-7)
- [ ] Generate marketing screenshots (needs dev server + Playwright run — can automate once run is triggered)
- [ ] Create logo + thumbnail designs (Fiverr or AI-generated)
- [ ] Record 10s preview GIF (needs gameplay session)
- [ ] **Jesse action: create portal accounts** (see Asks below — ~15 min)
- [ ] Submit to Itch.io first (instant approval, zero-risk test)
- [ ] Submit to GameDistribution (fastest paid portal)
- [ ] Submit to CrazyGames, Y8, Kongregate

### Blocked
- **Account creation for 6 portals** — requires email verification by Jesse (cannot be automated). See "Asks" below.

---

## Assets Ready to Ship
- `portal-submissions/builds/crazygames-remote-command-v1.0.0.zip` (1.1MB)
- `portal-submissions/builds/gamedistribution-remote-command-v1.0.0.zip` (1.1MB)
- `portal-submissions/builds/y8-remote-command-v1.0.0.zip` (1.1MB)
- `portal-submissions/builds/kongregate-remote-command-v1.0.0.zip` (1.1MB)
- `portal-submissions/builds/itch-remote-command-v1.0.0.zip` (1.1MB)
- Poki zip: pending Poki-specific SDK swap (separate build branch)

---

## Revenue (YTD)

| Channel | This Month | YTD | Notes |
|---|---|---|---|
| Portal distribution | $0 | $0 | Pending submissions |
| Rewarded ads (rc-9.com) | $0 | $0 | Pending integration |
| Twitch/YouTube | $0 | $0 | Pending launch |
| **Total** | **$0** | **$0** | Pre-revenue |

---

## Asks

**One action needed from Jesse (~15 min):** Create portal developer accounts. Claude cannot do this autonomously (email verification + CAPTCHA). Once accounts exist, Claude handles all submissions, metadata entry, and tracking end-to-end.

**Steps:**
1. Go to each URL, sign up with `bourneash@gmail.com`
2. Verify email (check inbox)
3. Paste any dashboard URL / API keys into `CREDENTIALS.md`

**Priority order:**
1. https://itch.io/register (instant, zero effort, can go live today)
2. https://gamedistribution.com/partner (fastest to ad revenue)
3. https://developer.crazygames.com/ (highest payouts)
4. https://developers.poki.com/ (highest traffic)
5. https://account.y8.com/developer
6. https://www.kongregate.com/developer

All other items queued in `CREDENTIALS_NEEDED.md`.

---

## Next Report

2026-04-30
