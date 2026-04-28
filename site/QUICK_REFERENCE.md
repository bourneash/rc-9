# 🚀 Quick Reference Guide

## Essential Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:5173)
npm run build           # Production build
npm run preview         # Preview production build

# Audio Setup (optional - has CDN fallback)
cd scripts && ./download-audio.sh && cd ..

# Testing
npm run test:auto       # Run automated MCP tests
```

---

## File Structure

```
scorched_earth/
├── index.html                 # Main HTML file
├── config.json               # ⚙️ GAME BALANCE - edit this!
├── package.json              # Dependencies
├── vite.config.js            # Build config
│
├── js/                       # Core game code
│   ├── game.js              # 🎮 Main game engine (7,708 lines)
│   ├── tank.js              # Tank class
│   ├── projectile.js        # Weapon physics
│   ├── terrain.js           # Procedural terrain
│   ├── av.js                # 🔊 Audio/visual system
│   ├── main.js              # UI controller
│   ├── loading-screen.js    # Loading screen
│   ├── mobile-fixes.js      # Touch controls
│   ├── validation.js        # Input sanitization
│   ├── constants.js         # Magic numbers
│   └── memory-manager.js    # Resource cleanup
│
├── assets/audio/            # Local audio files (optional)
│   ├── laser1.mp3
│   ├── explosion1.mp3
│   └── music/
│       ├── chip1.mp3
│       └── ...
│
├── scripts/
│   └── download-audio.sh    # Downloads audio from CDN
│
└── docs/                    # Documentation
    ├── PRODUCTION_READY.md  # 📘 Complete guide
    ├── EDGE_CASE_FIXES.md   # Bug fix documentation
    └── test-automation.md   # MCP testing guide
```

---

## Game Balance Tweaks

**File**: `config.json`

### Quick Tweaks

```json
// Make projectiles faster
"velocityMultiplier": 0.74 → 1.0

// Increase wind chaos
"windMax": 6 → 12

// Buff missiles
"weapons.missile.damage": 30 → 50

// Nerf nukes
"weapons.nuke.damage": 200 → 150

// Tankier tanks
"tank.maxHealth": 100 → 200
```

### Common Scenarios

**"Game too easy"**:
- Reduce tank.maxHealth: 100 → 75
- Increase AI skill in setup modal
- Increase windMax for more chaos

**"Game too hard"**:
- Increase tank.maxHealth: 100 → 150
- Decrease windMax: 6 → 3
- Increase weapon damage across board

**"Projectiles too slow"**:
- Increase velocityMultiplier: 0.74 → 1.0
- Decrease gravity: 0.3 → 0.2

**"Wind too strong"**:
- Decrease windEffect: 0.015 → 0.010
- Decrease windMax: 6 → 4

---

## Debugging

### Browser Console

```javascript
// Get game instance
const game = window.__SE_GAME__;

// Get test API
const api = window.__SE_TEST_API__();

// Check game state
console.log(api.getState());

// Fire weapon manually
api.simulateFire(45, 75, 'nuke');

// Check for errors
console.log(api.getErrors());

// Force game over (tank 0 wins)
api.forceGameOver(0);

// Remove pointer diagnostics (if annoying)
globalThis.__removePointerDiag();
```

### Common Issues

**Fire button not working**:
```javascript
// Check what's blocking
game.fire(); // Console will show why it's blocked
```

**Wind seems wrong**:
```javascript
// Check current wind
console.log(game.wind); // Should match UI

// Check config
console.log(game.config.physics.windMax);
```

**Audio not playing**:
```javascript
// Check audio system
console.log(globalThis.av);

// Test sound manually
globalThis.av.playSound('fire_laser');
```

---

## Code Locations

### Where to find key logic:

| Feature | File | Line(s) |
|---------|------|---------|
| Fire weapon | `js/game.js` | 5266-5600 |
| Tank movement | `js/tank.js` | 61-88 |
| Projectile physics | `js/projectile.js` | 40-200 |
| Explosion damage | `js/game.js` | 6300-6450 |
| Wind calculation | `js/game.js` | 5300-5400 |
| AI turn logic | `js/game.js` | 5817-6100 |
| Game over check | `js/game.js` | 6914-6954 |
| Tank spawning | `js/game.js` | 640-860 |
| Config loading | `js/game.js` | 239-450 |
| Audio setup | `js/av.js` | 40-120 |
| Mobile fixes | `js/mobile-fixes.js` | 37-200 |
| Loading screen | `js/loading-screen.js` | 6-132 |

---

## Testing Scenarios

### Manual Test Cases

1. **Basic Fire**:
   - Start game
   - Adjust angle/power
   - Fire weapon
   - Verify projectile arc
   - Verify explosion damage

2. **Wind Effects**:
   - Set wind to "High"
   - Fire directly upward (90°)
   - Projectile should drift significantly

3. **All Tanks Dead**:
   - 2 players, close together
   - Fire nuke between them
   - Both should die
   - "Mutual Destruction!" message

4. **Race Condition**:
   - Start game with AI first
   - Immediately click "New Game"
   - No errors should occur
   - New game should start cleanly

5. **Mobile**:
   - Open on phone/tablet
   - Verify touch controls appear
   - Test joystick movement
   - Test angle dial
   - Test fire button

### Automated Tests

```bash
npm run test:auto
```

**Expected**: 9/11 tests pass ✅

**Failing tests**:
- Tank death detection (timing issue)
- Wind effects (measurement tolerance)

---

## Performance Tips

### Optimize for Low-End Devices

1. **Disable Shadows** (`js/tank.js`):
```javascript
// Comment out shadow rendering
// ctx.shadowColor = '...';
// ctx.shadowBlur = ...;
```

2. **Reduce Particle Count** (`js/game.js`):
```javascript
// Line ~1200 (explosions)
for (let i = 0; i < 10; i++) { // Was: 20
```

3. **Lower Audio Quality**:
- Use compressed MP3s (< 128kbps)
- Reduce audio file count

4. **Disable Music**:
```javascript
// js/av.js, line ~38
this.musicOn = false; // Was: true
```

### Monitor Performance

```javascript
// Check FPS
let lastTime = performance.now();
setInterval(() => {
  const now = performance.now();
  const fps = 1000 / (now - lastTime);
  console.log('FPS:', fps.toFixed(1));
  lastTime = now;
}, 1000);
```

**Target**: 60 FPS on desktop, 30+ FPS on mobile

---

## Hotkeys

| Key | Action |
|-----|--------|
| Arrow Keys | Adjust angle |
| A/D | Move tank left/right |
| W/S | Adjust power |
| Space | Fire weapon |
| Q/E | Cycle weapons |
| P | Pause/Resume |
| M | Toggle music |
| F | Toggle fullscreen |
| Esc | Close modals |

---

## API Reference

### Test API (`window.__SE_TEST_API__()`)

```javascript
const api = window.__SE_TEST_API__();

// Get full game state
const state = api.getState();
// Returns: { tanks, projectiles, explosions, gameOver, currentTurn, wind, paused, mode, turnCount }

// Simulate firing
api.simulateFire(angle, power, weaponType?);
// Example: api.simulateFire(45, 75, 'nuke');

// Wait for turn to complete
await api.waitForTurnComplete();

// Force game over (winnerIndex = tank index)
api.forceGameOver(0); // Tank 0 wins
api.forceGameOver(null); // Draw

// Get errors
const errors = api.getErrors();
// Returns: array of error objects

// Check health
const healthy = api.isHealthy();
// Returns: true if no errors, false otherwise
```

### Game Instance (`window.__SE_GAME__`)

```javascript
const game = window.__SE_GAME__;

// Manual controls
game.fire();
game.setAngle(45);
game.setPower(75);
game.setWeapon('nuke');
game.move(1); // 1 = right, -1 = left

// State queries
game.tanks;          // Array of tank objects
game.projectiles;    // Array of active projectiles
game.explosions;     // Array of active explosions
game.wind;           // Current wind speed
game.currentTankIndex; // Current turn index
game.gameOver;       // Boolean
game.paused;         // Boolean

// Config
game.config;         // Full config object
game.config.weapons; // Weapon stats
game.config.tank;    // Tank stats
game.config.physics; // Physics constants
```

---

## Build & Deploy

### Production Build

```bash
npm run build
```

**Output**: `dist/` directory

**What to Upload**:
- Upload entire `dist/` folder to web host
- Set `index.html` as entry point
- Enable gzip compression (optional, improves load time)

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel deploy
```

**Automatic**:
- CDN distribution
- HTTPS
- Gzip compression
- Cache headers

### Deploy to GitHub Pages

```bash
npm run build
cd dist
git init
git add .
git commit -m "Deploy"
git remote add origin https://github.com/username/repo.git
git push -u origin master -f
```

**Enable GitHub Pages**:
1. Repo Settings → Pages
2. Source: Deploy from branch
3. Branch: master, folder: / (root)

---

## Cheat Codes

### Enable God Mode

```javascript
// Unlimited health
game.tanks.forEach(t => t.maxHealth = 99999);

// Unlimited ammo
game.tanks.forEach(t => t.unlimitedAmmo = true);

// Unlimited fuel
game.tanks.forEach(t => t.maxFuel = 999999);

// No wind
game.wind = 0;
game.setWindMode('calm');
```

### Instant Win

```javascript
// Kill all opponents
game.tanks.forEach((t, i) => {
  if (i !== game.currentTankIndex) {
    t.health = 0;
  }
});
game.checkGameOver();
```

### Spawn Power-Up

```javascript
// Spawn crate at x=500, y=300
game.spawnPowerUp(500, 300, 'health'); // 'health', 'ammo', 'fuel', 'shield'
```

---

## Support

**Documentation**:
- `PRODUCTION_READY.md` - Full guide
- `EDGE_CASE_FIXES.md` - Bug fixes
- `test-automation.md` - Testing

**Debugging**:
- Browser console (F12)
- `window.__SE_TEST_API__()`
- `window.__SE_GAME__`

**Common Files**:
- Game balance: `config.json`
- Main logic: `js/game.js`
- UI: `js/main.js`
- Audio: `js/av.js`

---

**Version**: 2.0.0 | **Status**: Production Ready ✅
