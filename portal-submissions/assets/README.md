# Marketing Assets — Remote Command

Assets required per portal. Generate once, reuse across all submissions.

---

## Required Asset List

### Thumbnails (MUST CREATE)
- `thumbnail-512x384.png` — CrazyGames primary (square-ish)
- `thumbnail-1280x720.png` — Poki + YouTube primary (16:9 hero shot)
- `thumbnail-244x244.png` — Poki mini icon
- `thumbnail-630x500.png` — GameDistribution primary
- `thumbnail-512x512.png` — Square icon (Y8, Kongregate)

### Screenshots (MUST CREATE — 5 MINIMUM)
Each at 1920x1080 or higher:
- `screenshot-01-gameplay-desert.png` — Desert battle with missile trail
- `screenshot-02-gameplay-ocean.png` — Underwater torpedo combat
- `screenshot-03-gameplay-nuke.png` — Nuclear explosion aftermath
- `screenshot-04-gameplay-night.png` — Moon/night combat
- `screenshot-05-weapon-menu.png` — Weapon selection UI open

### Preview Media
- `preview-10s.gif` — 10-second looping GIF showing core gameplay (required by Poki)
- `preview-30s.mp4` — 30s trailer (Kongregate, Itch, optional for others)

### Logos
- `logo-horizontal.png` — "Remote Command" wordmark + tank silhouette
- `logo-square.png` — Standalone square mark for favicon/avatars

### Cover Art
- `cover-itch.png` — 630x500 Itch.io banner
- `cover-wide.png` — 1200x630 OG/Twitter share card

---

## How to Generate

**Screenshots:**
1. Run `npm run dev` in `scorched_earth/`
2. Start a match on each preset: desert, ocean, moon, forest, mars
3. Use browser devtools to set viewport to 1920x1080
4. Take full-page screenshots at key moments
5. Save to this folder

**Preview GIF:**
1. Record 15-20 seconds of gameplay (OBS or browser extension like Loom)
2. Convert to GIF with `ffmpeg -i gameplay.mp4 -vf "fps=15,scale=720:-1:flags=lanczos" -loop 0 preview-10s.gif`
3. Trim to <10MB

**Logo + cover art:**
1. Use favicon.svg as base
2. Design in Figma/Canva with tank silhouette + "Remote Command" wordmark
3. Export in required sizes

---

## Generation Queue

- [ ] Automated screenshot capture via Playwright (create `scripts/capture-marketing.js`)
- [ ] Manual or AI-generated logo/cover art
- [ ] Preview GIF (needs gameplay recording session)

---

## Budget Option
If assets need pro polish, budget $50-200 on Fiverr for logo + cover art. Screenshots and GIFs can be automated.
