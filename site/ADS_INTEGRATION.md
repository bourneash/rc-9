# Rewarded Ad Integration Points

The Ad SDK (`js/ads.js`) is loaded globally as `window.__RC9_ADS__`. Three gameplay hooks are planned — wiring pending a test session.

---

## Global API

```js
// Preroll (one-time per session, on first match start)
window.__RC9_ADS__.showPreroll();

// Rewarded (callback fires after user watches ad OR if SDK unavailable in dev)
window.__RC9_ADS__.showRewarded(() => {
  // Grant the reward here
});
```

## Hook Points to Wire

### 1. Preroll — First Game Start
**File:** `js/main.js` → `startGame()` function (or equivalent setup handler)
**Code:**
```js
async function startGame(config) {
  await window.__RC9_ADS__?.showPreroll();
  // ... existing startGame body
}
```

### 2. Revive — Tank Death
**File:** `js/game.js` → where `checkGameOver()` fires, before game-over modal shows
**Code:**
```js
if (tank.isDead() && !tank._reviveOffered) {
  tank._reviveOffered = true;
  showReviveModal({
    onAccept: () => window.__RC9_ADS__.showRewarded(() => {
      tank.health = 25;
      tank._dead = false;
      // refresh UI
    }),
    onDecline: () => continueGameOver()
  });
}
```
**UI:** Add a small modal: "Watch ad to revive with 25 HP" with Accept/Decline buttons.

### 3. Weapon Unlock — Premium Weapon Mid-Match
**File:** `js/main.js` → `renderWeaponMenu()` where locked weapons render
**Code:**
```js
// When user clicks a locked weapon:
window.__RC9_ADS__.showRewarded(() => {
  tank.unlockWeapon('nuke'); // one-round unlock
  refreshWeaponMenu();
});
```
**UI:** Gray out nuke/MIRV by default, show "▶ Watch ad" icon instead of normal select.

### 4. Fuel Refill
**File:** `js/tank.js` → fuel exhaustion handler
**Code:**
```js
if (tank.fuel <= 0 && !tank._fuelAdOffered) {
  tank._fuelAdOffered = true;
  showFuelAdOffer(() => {
    window.__RC9_ADS__.showRewarded(() => {
      tank.fuel = tank.fuelCapacity;
    });
  });
}
```

---

## Dev vs Portal Behavior

- **Dev (`npm run dev`)**: Ads disabled. `showRewarded(cb)` immediately calls `cb()`. No SDK load.
- **rc-9.com production**: Ads enabled, GameDistribution SDK loads.
- **Inside portal iframe (CrazyGames, Poki, etc.)**: Ads enabled.
- **`?ads=1` URL param**: Force-enable ads for testing.

---

## Session Cap

Max 3 rewarded ads per session (plus 1 preroll). Prevents churn. Configurable in `ads.js`.

---

## Wire-Up Plan

Pending: 1 focused coding session (~2 hrs) to wire the 4 hooks + build 3 lightweight UI modals (revive offer, weapon unlock, fuel refill). Safe to ship portal v1.0 without these — ads still serve via preroll on session start and core monetization still works via portal ad frames.

**Next step:** Complete this wire-up in Week 2 after first portal submissions land.
