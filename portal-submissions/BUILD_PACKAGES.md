# Portal Build Packages

Portal-specific build variants. Each portal has slightly different requirements for SDK, file layout, and branding.

---

## Build Command (Generic)

```bash
cd scorched_earth
npm run build
# Output: dist/
```

Produces a 2.3MB self-contained static site.

---

## Per-Portal Packaging

### CrazyGames
```bash
cd scorched_earth
npm run build
cd dist
zip -r ../../portal-submissions/builds/crazygames-remote-command-v1.0.0.zip ./*
```
- Upload ZIP to https://developer.crazygames.com/
- Optional: integrate CrazyGames SDK later for branded CTA + stats (`https://sdk.crazygames.com/crazygames-sdk-v3.js`)

### GameDistribution
```bash
# Game ID injected at build time via env var
GD_GAME_ID=<id-from-dashboard> npm run build
cd dist
zip -r ../../portal-submissions/builds/gamedistribution-v1.0.0.zip ./*
```
- SDK already integrated in `js/ads.js` — just need the game ID from dashboard
- Replace `__GAME_ID_REPLACE_ME__` in ads.js with real ID

### Poki
- Requires Poki SDK (mandatory). Create separate branch: `poki-sdk-branch`
- Replace GameDistribution SDK with Poki's:
  ```html
  <script src="//game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
  ```
- Swap `AdAPI._showAd` implementation to call `PokiSDK.commercialBreak()` and `PokiSDK.rewardedBreak()`
- Upload ZIP to https://developers.poki.com/

### Y8 / Kongregate / Itch.io
- Same as CrazyGames build — portal-agnostic ZIP
- Y8 + Kongregate: upload ZIP
- Itch.io: upload ZIP or link to rc-9.com directly

---

## Build Artifacts Location

All portal ZIPs saved to: `/home/jesse/projects/domains/rc-9.com/portal-submissions/builds/`

---

## Size Budget

Current: 2.3MB total, 385KB gzipped
- CrazyGames limit: 500MB ✅
- Poki limit: 50MB ✅
- GameDistribution limit: 50MB ✅
- Y8 limit: 50MB ✅

Plenty of headroom for adding levels, weapons, music.
