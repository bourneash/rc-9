# rc-9.com Income Plan

**Project:** Remote Command (scorched_earth) — production-ready browser artillery game
**Domain:** rc-9.com
**Owner:** Jesse Tamburino
**Plan Created:** 2026-04-23
**Operator:** Claude (autonomous)

---

## Strategic Summary

Monetize rc-9.com across 3 phases, stacking 5+ revenue streams off one codebase with zero rewrites. Portal distribution + rewarded ads form the floor; hub expansion and B2B campaigns scale the ceiling.

**Revenue floor target (90 days):** $500–$3,000/mo passive
**Revenue ceiling target (12 months):** $5k–$25k/mo

---

## Phase 1 — Foundation (Weeks 1–2)

Autonomous execution. No blockers from Jesse beyond credentials already provided.

### 1.1 Game Portal Distribution
Submit Remote Command to 6 major HTML5 game portals for 50/50 ad revenue share.

**Portals targeted:**
- CrazyGames (40M+ MAU, best payout)
- Poki (60M+ MAU)
- GameDistribution (30M+ network reach)
- Y8 (10M+ MAU)
- Kongregate (legacy but loyal audience)
- Itch.io (indie-friendly, instant approval)

**Deliverables:**
- Portal-optimized production build (`dist/` with proper base path)
- GameDistribution SDK integration (preroll + rewarded)
- Marketing assets: thumbnails, screenshots, preview GIF, game description, tag list
- `portal-submissions/` tracking folder with status per portal
- Developer accounts created at each portal under Jesse Tamburino
- Tax forms (W-8BEN) submitted where required

**Expected outcome:** 100k–1M plays/month across portals within 60 days of approval. $200–$3,000/mo passive.

### 1.2 Rewarded Video Ads (In-Game)
Integrate rewarded ads at three natural gameplay moments using GameDistribution SDK (works on rc-9.com AND all portals simultaneously).

**Integration points:**
- **Revive:** "Your tank died — watch ad to revive with 25 HP"
- **Weapon unlock:** "Watch ad to unlock Nuke for this round"
- **Fuel refill:** "Out of fuel — watch ad for full tank"

**Caps:** Max 3 rewarded ads per session (prevents churn).

**Expected outcome:** $3–$15 eCPM on rewarded traffic — the single biggest revenue lever once traffic scales.

### 1.3 AI Battle Twitch/YouTube Stream
Launch 24/7 automated AI-vs-AI battle stream as a zero-cost content flywheel.

**Build:**
- Headless battle loop (game runs AI vs AI continuously, maps rotate)
- OBS scene capturing the browser at 1080p
- Stream key to Twitch + YouTube simultaneously (Restream.io)
- Overlay with rc-9.com URL + current match stats
- Server: cheap $5/mo VPS with Chrome + OBS headless

**Monetization:**
- Twitch affiliate/subs (~6 months to qualify)
- YouTube ad revenue on VODs/clips
- Traffic funnel → rc-9.com → portal plays (double-dip revenue)

**Expected outcome:** 100–500 concurrent viewers within 90 days. Traffic compounding into all other monetization layers.

---

## Phase 2 — Scale (Month 2)

Requires Jesse's nod before starting. Higher effort, higher ceiling.

### 2.1 rc-9.com as Retro Game Hub
Turn the domain into a curated retro/artillery game portal itself. Host 10–20 open-source HTML5 classics (Worms clones, Tank Wars, Gorillas, Lunar Lander, Asteroids, Breakout).

**Why:** You keep 100% of ad revenue on rc-9.com (vs 50% on external portals). One domain with SEO authority compounds across many games. Builds a moat — visitors come back for multiple titles.

**Build:**
- Hub landing page at rc-9.com (`/games` route)
- Individual game pages with SEO optimization per title
- Ezoic or Playwire integration ($15–40 RPM for gaming traffic)
- Internal cross-promotion between games
- Featured + recommended sections

**Effort:** 1–2 weeks.
**Expected outcome:** 10x domain traffic floor, $500–5k/mo from direct ad revenue.

### 2.2 Custom Branded Game Campaigns (B2B)
Pitch "Remote Command: [BrandName] Edition" to marketing agencies and brands for campaign/event use. Reskin tanks, weapons, map with brand assets.

**Why:** High-ticket ($5k–$50k per deal). Your engine is built — reskin is a 1-week job. 2–4 deals/year = $20k–$100k.

**Build:**
- Landing page at rc-9.com/enterprise (or b2b.rc-9.com)
- Case study template (mock up 3 example "brand editions" as visual proof)
- Pitch deck (PDF)
- Outbound list: 50 marketing agencies + 50 B2B brands in gaming-adjacent niches
- Cold email sequence (handled via `/cold-email` skill)

**Effort:** 1 week setup, then ongoing outbound.
**Expected outcome:** 2–4 deals year 1, scaling to 8–12 by year 2.

---

## Phase 3 — Long-Term (Month 3+)

Parked until Phases 1 + 2 are stable. Listed for reference.

- **Steam / Itch.io Premium Version** — Tauri wrap, 5 exclusive maps + weapons, $4.99 one-time
- **Level Editor + UGC** — User-generated maps, community/Discord, sticky retention
- **Merchandise** — Print-on-demand store (weapon art, tank designs, "Nuked" memes)
- **SEO Authority Sales** — Once DR20+, sell sponsored reviews/link placements
- **Mobile App (Play Store + iOS)** — PWA wrap via Bubblewrap, AdMob + $2.99 remove-ads IAP

---

## Credentials

Stored in `CREDENTIALS.md` (gitignored). PayPal + legal name confirmed by Jesse 2026-04-23.

---

## Tracking

- **Phase 1 status:** In progress (started 2026-04-23)
- **Weekly board report:** `BOARD_REPORT.md` updated every Monday
- **Portal submissions:** `portal-submissions/STATUS.md`
- **Revenue tracking:** `revenue/` folder with monthly CSVs per channel

---

## Operating Principles

1. Jesse is board member. Strategic oversight only. No interactive questions.
2. All credential needs go to `CREDENTIALS_NEEDED.md` as notes, not interruptions.
3. Async reporting via `BOARD_REPORT.md` — Jesse reads at his pace.
4. Move fast on reversible actions. Pause for confirmation on irreversible ones (domain transfers, legal contracts, >$500 spend).
5. Every revenue stream must be tracked with its own line item.
