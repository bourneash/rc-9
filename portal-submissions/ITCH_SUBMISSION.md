# Itch.io Submission Walkthrough — Remote Command

**Status:** Account live, ready to publish.
**Estimated time:** 10-15 min

---

## Step 1: Go to Create Page

https://itch.io/game/new

---

## Step 2: Fill Out Form (copy-paste exactly)

### Title
```
Remote Command
```

### Project URL
Itch auto-generates from title: `rc-9-games.itch.io/remote-command`
- Username (set if prompted): `rc-9-games` (or `rc-9` if available)
- **IMPORTANT:** Do NOT set your personal name as the dev handle. Use `rc-9-games` or `RC-9 Games`.

### Short description / tagline (80 chars)
```
Classic artillery combat. 20+ weapons, destructible terrain, smart AI. Free.
```

### Classification
Select: **Games**

### Kind of project
Select: **HTML** — You can play it in the browser

### Release status
Select: **Released**

### Pricing
Select: **$0 or donate** → Recommended price: `$0` (leave donations open for voluntary tips)

### Uploads
1. Click **Upload files**
2. Select: `/home/jesse/projects/domains/rc-9.com/portal-submissions/builds/itch-remote-command-v1.0.0.zip`
3. After upload, check the box: **☑ This file will be played in the browser**

### Embed options (appears after checking browser play)
- **Embed width:** `1280`
- **Embed height:** `720`
- **☑ Mobile friendly**
- **☑ Automatically start on page load** (check)
- **☑ Fullscreen button** (check)
- **☑ Enable scrollbars** (uncheck — game handles its own layout)
- **Orientation:** `Default`

### Description (paste in the rich text editor)

```
Remote Command is a modern browser reboot of the legendary Scorched Earth tank-artillery genre. Pick your angle, dial in your power, account for wind — then launch missiles, nukes, MIRVs, torpedoes, homing shells, lasers, and more across fully destructible terrain.

## Features
- **20+ unique weapons** — Missiles, Nuclear Bombs, MIRVs, Cluster Bombs, Homing Shells, Lasers, Railguns, Napalm, Torpedoes, Underwater Mines, Airstrikes, and more
- **9 themed environments** — Forest, Desert, Canyon, Arctic, Ocean (underwater physics!), Cave, Moon, Mars, Futuristic
- **Fully destructible terrain** — every explosion carves a crater
- **Realistic physics** — gravity, wind (5 modes from calm to chaotic), projectile trajectories
- **3 AI difficulty levels** with smart weapon selection and wind compensation
- **2-8 players** — mix of humans and AI
- **Multiple game modes** — Classic, Quick Battle, Chaos, Target Practice, Teams (2x4), Realtime
- **Mobile-optimized** — joystick, angle dial, power slider, haptic feedback
- **24 sound effects, 3 music tracks**

## Controls
**Desktop:** Arrow Keys / WASD (angle + power), Q/E (cycle weapons), Space or Enter (fire), P (pause)
**Mobile:** Joystick for movement, angle dial + power slider, tap FIRE

## Tips
- Wind changes every turn — watch the arrow
- Drive mode lets you reposition between shots (costs fuel)
- Underwater maps require torpedoes/depth charges — land weapons won't work
- Try Chaos mode for random wind every turn

No downloads. No signup. Instant play. Play on desktop, tablet, or phone.

---

Made by **RC-9 Games**. More at https://rc-9.com
```

### Genre (dropdown)
Select: **Action**

### Tags (type and press Enter for each)
```
artillery
tanks
strategy
turn-based
physics
retro
classic
destructible
scorched-earth
worms
multiplayer
singleplayer
2d
html5
browser
mobile
```

### App store links
Leave blank (none yet).

### Custom noun
```
game
```

### Community
Select: **Comments** (simplest, lightest-moderation)

### Visibility & access
Select: **Public** — Anyone can view

### Metadata: Platforms
**☑ Web (HTML5)** — should auto-check since you selected browser play

### Release date
Set to today: `2026-04-24`

---

## Step 3: Cover Image (REQUIRED)

Itch needs a cover image **(630 x 500 px preferred, up to 2MB)**.

### Fast path — use existing logo
If no custom cover art yet, upload the game's favicon scaled up, or a screenshot of gameplay.

**Temp option:** Take a screenshot of the game running at 1280x720 in a desert or ocean scene. Crop to 630x500. Upload.

**Better option:** I can generate a marketing screenshot via Playwright if you start the dev server. Or hire a $25 Fiverr designer.

**Placeholder that works today:**
1. `npm run dev` in `scorched_earth/`
2. Start a game on Desert preset, wait for action
3. Screenshot browser window at ~1280x720
4. Crop to 630x500 (any tool)
5. Upload to itch cover image field

---

## Step 4: Screenshots (recommended, not required)

Add 3-5 screenshots (any size, max 3MB each):
- Gameplay desert
- Gameplay ocean
- Explosion aftermath
- Weapon menu open
- Mobile view

Same source as cover image — take via browser + crop.

---

## Step 5: Publish

Scroll to bottom → **Save** → then click **View page** → verify everything looks right → click **Edit** → change visibility from Draft to Public → **Save**.

URL will be: `https://rc-9-games.itch.io/remote-command` (or similar based on your username).

---

## After Publish

Drop me the URL — I'll:
- Add it to `STATUS.md`
- Add itch.io link to the in-game help page
- Add itch.io link to rc-9.com footer
- Track plays/revenue in `BOARD_REPORT.md`

---

## Open Questions / Decisions Made

- **Donations:** left enabled at $0 minimum (free with tip option) — optimal for discoverability + upside
- **Rating:** game is already E10+ equivalent (cartoon violence only, no blood/gore/language) — itch lets you tag but doesn't require formal rating
- **Price tier:** free-to-play, consistent with portal strategy
- **Ads:** GameDistribution SDK is present but only activates on rc-9.com production or inside portal iframes. Itch embed won't trigger ads (good — itch frowns on ads in embedded games)

---

## File to Upload

**Path:** `/home/jesse/projects/domains/rc-9.com/portal-submissions/builds/itch-remote-command-v1.0.0.zip`
**Size:** 1.1MB
