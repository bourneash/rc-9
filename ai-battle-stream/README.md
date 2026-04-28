# AI Battle Stream — Remote Command

24/7 AI-vs-AI automated gameplay stream. Content flywheel for Twitch + YouTube. Zero-touch once deployed.

---

## Concept

Run Remote Command headlessly on a cheap VPS. AI tanks battle each other continuously. Output streamed to Twitch + YouTube simultaneously via Restream.io. On-stream overlay promotes rc-9.com.

**Why it works:**
- Gameplay is visually distinctive (tanks, explosions, physics) — catches scrollers on Twitch/YouTube
- Turn-based + AI = matches always complete, always dramatic moments
- Search traffic: "scorched earth live," "tank battle stream," "AI vs AI"
- Feeds rc-9.com traffic → portal plays → ad revenue (compounding)
- Twitch subs/donations + YouTube ad revenue on VODs = bonus direct income

---

## Tech Stack

**VPS (minimum):**
- 2 vCPU, 4GB RAM, 50Mbps upload
- ~$6/mo on Hetzner CX21 or DigitalOcean basic droplet
- Ubuntu 22.04

**Components:**
1. **Headless Chrome** (via Puppeteer or Playwright) — runs the game in fullscreen
2. **Xvfb** (virtual framebuffer) — provides a virtual display for Chrome
3. **FFmpeg** — captures X display and encodes to RTMP
4. **Restream.io** — fans out single RTMP stream to Twitch + YouTube simultaneously

**Alternative lighter-weight:**
- Use OBS headless mode on VPS (harder to configure)
- Or stream from a dedicated always-on home machine (zero VPS cost, requires reliable internet)

---

## Automation Layer

Remote Command already supports AI-only mode (Target Practice) and auto-restart. Need to add:

1. **Auto-start on page load** when URL flag `?autostream=1` is present
2. **Random preset rotation** — every match picks a different environment
3. **Auto-restart after game over** with 5-10s intermission (show stats)
4. **Overlay HUD** — corner watermark "RC-9.COM | Play Free" + current match number

These are additions to scorched_earth/, implemented as a feature flag. Not yet built — ready when Jesse greenlights.

---

## Content Enhancements (Stream-Specific)

- **Slower gameplay speed** — more readable for viewers
- **Dramatic camera** — follow projectiles mid-flight
- **Commentary overlay** — "Player 2 charging nuke..." text updates
- **Winner celebrations** — extra effects on game end
- **Viewer vote overlay** (post-MVP) — chat votes pick next map

---

## Stream Deployment Plan (when greenlit)

**Week 1 (setup):**
- Spin up Hetzner VPS
- Install Chromium + Xvfb + FFmpeg
- Install Remote Command autostream build
- Test local RTMP output

**Week 2 (streaming):**
- Create Twitch + YouTube + Restream.io accounts (under Jesse's creds)
- Configure Restream to fan out to both
- Go live, run 24 hrs, monitor for crashes
- Set up systemd auto-restart on failure

**Monetization path:**
- Twitch Affiliate: 50 followers + 500 minutes streamed + 7 unique days + avg 3 viewers (4-8 weeks to hit)
- YouTube ad revenue: eligible when channel hits 1000 subs + 4000 watch hours
- Bits/subs/donations throughout

---

## Cost vs Return

| Item | Cost/mo |
|---|---|
| VPS (Hetzner) | $6 |
| Restream.io (free tier OK for 2 outputs) | $0 |
| **Total** | **$6/mo** |

**Break-even:** ~60 YouTube views or 2-3 Twitch bit cheers per month.
**Upside:** 10k+ concurrent YouTube views = $100-500/day from ad revenue.

---

## Status

⬜ Not yet deployed — awaiting Phase 1.3 greenlight. This scaffold prepares the plan; execution queued once portal submissions are live (Week 2-3).

---

## Credentials Needed (when ready to launch)

- Twitch account (can create under bourneash@gmail.com or existing Jesse account)
- YouTube/Google account for stream channel
- Restream.io account
- VPS provider account (Hetzner, DO, etc.)

Queue in `../CREDENTIALS_NEEDED.md` when approaching launch.
