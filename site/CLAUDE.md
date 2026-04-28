# Scorched Earth - Project Context for AI Agents & Engineers

## Project Overview

**Scorched Earth** is a browser-based artillery tank game inspired by the classic DOS game. Players control tanks and fire weapons at each other across destructible terrain with realistic physics.

**Tech Stack:**
- Vanilla JavaScript (ES6+)
- HTML5 Canvas for rendering
- Vite for development/build
- CSS3 for UI styling
- No frameworks - pure JS implementation

**Dev Server:** `npm run dev` runs on `http://localhost:5600`

---

## Architecture Overview

### Core Files Structure

```
/home/jesse/projects/scorched_earth/
├── index.html              # Main HTML entry point
├── styles.css              # Global styles, modal styles, UI components
├── js/
│   ├── main.js            # Entry point, UI controls, game setup
│   ├── game.js            # Main game loop, turn management, victory logic
│   ├── terrain.js         # Terrain generation and rendering
│   ├── tank.js            # Tank class, movement, health, weapons
│   ├── projectile.js      # Projectile physics, trajectories, explosions
│   ├── weapon-meta.js     # Weapon definitions and metadata
│   ├── victory-messages.js # Contextual victory/defeat messages
│   ├── constants.js       # Game constants and configuration
│   └── ...other modules
└── vite.config.js         # Vite configuration
```

### Key Game Systems

#### 1. Physics System (`projectile.js`)
- **Air Physics**: Full gravity, full wind effect
- **Underwater Physics**:
  - Water drag: 98.5% retention for torpedoes, 92% for others
  - Reduced gravity: 5% for torpedoes, 50% for others
  - Reduced wind: 30% of normal
  - Water surface detection at `waterSurfaceY`

#### 2. Terrain System (`terrain.js`)
- **Terrain Types**: flat, hilly, mountain, valley, ocean
- **Themes**: forest, desert, canyon, arctic, ocean, cave, moon, mars, futuristic
- **Ocean Maps**: Special underwater mode with `_isOceanTerrain` flag and `waterSurfaceY` property
- **Destructible**: Explosions carve craters using circular/elliptical algorithms

#### 3. Weapon System (`weapon-meta.js`, `tank.js`)
- **Water-Only Weapons**: torpedo, homing_torpedo, depth_charge, underwater_mine, navy_seal, sonar_pulse
- **Land-Only Weapons**: marker_airstrike, marker_airnukes, marker_attack, marker_medic, parachute_flare, napalm, smoke_bomb, flare
- **Universal Weapons**: missile, heavy, nuke, cluster, laser, etc.
- **Restriction Logic**:
  - `game.waterOnlyWeapons` Set (defined in game.js)
  - `game.landOnlyWeapons` Set (defined in game.js:73-78)
  - `isAllowedWeapon()` in main.js:1875-1912

#### 4. AI System (`game.js:6444-6505`)
- **AI Weapon Selection**: `chooseAIWeapon()` function
- **Map-Aware**: Checks for ocean maps and restricts weapons appropriately
- **Underwater Preferences**:
  - Short range (<180px): depth_charge (70%)
  - Mid range (<400px): torpedo (60%)
  - Long range (≥400px): homing_torpedo (75%)
- **Skill Levels**: easy, medium, hard (affects aim accuracy and decisions)

#### 5. Victory System (`game.js:7106-7286`)
- **Victory Toast**: Single unified message displayed on game end
- **Components**: Winner name, contextual message, stats, "New Game" button
- **Victory Messages**: Contextual based on game state (see `victory-messages.js`)
  - Quick victory (<5 turns)
  - Marathon (>20 turns)
  - Close match
  - Perfect game (no damage taken)
  - AI victory
  - Team victory

---

## Recent Major Changes & Fixes

### 1. Underwater Trajectory Guide Fix (v2.0.3)
**File:** `js/game.js:2154-2210`

**Problem:** Trajectory dots showed air physics on ocean maps, completely inaccurate for torpedoes.

**Solution:** Added full underwater physics simulation to `drawTrajectoryGuide()`:
- Water surface detection: `isUnderwater = isOceanMode && y > waterSurfaceY`
- Apply water drag, reduced wind (30%), reduced gravity
- Visual distinction: black dots = air, cyan dots = underwater, red dot = impact

**Code Pattern:**
```javascript
if (isUnderwater) {
    const waterDrag = isTorpedo ? 0.985 : 0.92;
    vx *= waterDrag;
    vy *= waterDrag;
    vx += windAccel * 0.3;
    let effectiveGravity = g * (isTorpedo ? 0.05 : 0.5);
    vy += effectiveGravity;
}
```

### 2. Weapon Restrictions for Ocean Maps (v2.0.3)
**Files:**
- `js/game.js:6448-6462` (AI weapon selection)
- `js/main.js:1905-1909` (Player UI filtering)

**Problem:** AI and players could select land-only weapons (airstrikes, napalm) on underwater maps.

**Solution:**
- Added map detection to `canUse()` helper in AI weapon selection
- Added land-only weapon filtering to `isAllowedWeapon()` function
- Land-only weapons appear grayed out in weapon menu on ocean maps

**Code Pattern:**
```javascript
const isOcean = !!(game.terrain && (game.terrain._isOceanTerrain || game.terrain.isOcean));
if (isOcean && game.landOnlyWeapons && game.landOnlyWeapons.has(w)) {
    return false; // Can't use on ocean maps
}
```

### 3. Victory Toast Redesign (v2.0.3)
**File:** `js/game.js:7106-7286`

**Problem:** Victory animation + modal were two separate elements that covered each other.

**Solution:** Created single `showVictoryToast()` function that displays:
- Winner name in large green text
- Contextual victory message ("What a nail-biter!", etc.)
- Game stats (turns, health)
- Interactive "New Game" button with hover effects
- Dismissible with ESC key

**Design:** Green gradient background, glowing border, smooth scale-in animation

### 4. Color Picker Fix (v2.0.3)
**File:** `styles.css:1391`

**Problem:** All color swatches showed cyan-to-green gradient instead of actual colors.

**Cause:** `.modal-content button` CSS rule applied gradient to ALL buttons, overriding inline `backgroundColor`.

**Solution:** Added `background: none;` to `.color-chooser .swatch` selector.

### 5. New Game Setup UI Overhaul (v2.0.3)
**Files:**
- `index.html:259-335`
- `js/main.js:954-990, 1175-1180`
- `js/game.js:541-547`

**Changes:**
1. **Environment Presets**: Combined terrain + theme + time into logical presets (Forest, Desert, Ocean, etc.)
2. **Progressive Disclosure**: Advanced terrain/theme options hidden by default, shown when "Custom" selected
3. **Static Time Toggle**: Checkbox to freeze day/night cycle at specific time
4. **Organized Dropdowns**: Presets grouped by category (Earth, Underground, Space, Sci-Fi)

---

## Important Code Patterns & Conventions

### Ocean Map Detection
```javascript
const isOcean = !!(game.terrain && (game.terrain._isOceanTerrain || game.terrain.isOcean));
```

### Weapon Restriction Checking
```javascript
// Check if weapon is allowed on current map
const waterOnly = new Set(['torpedo', 'homing_torpedo', ...]);
if (waterOnly.has(weapon) && !isOcean) return false;

if (isOcean && game.landOnlyWeapons.has(weapon)) return false;
```

### Underwater Physics Application
```javascript
if (isUnderwater) {
    const waterDrag = isTorpedo ? 0.985 : 0.92;
    vx *= waterDrag;
    vy *= waterDrag;
    vx += wind * windEffect * 0.3; // Reduced wind
    let effectiveGravity = gravity * this.gravityFactor;
    if (isTorpedo) effectiveGravity *= 0.05;
    else effectiveGravity *= 0.5;
    vy += effectiveGravity;
}
```

### Victory Toast Creation
```javascript
const toast = document.createElement('div');
toast.style.cssText = `position: fixed; top: 50%; left: 50%; ...`;
// Add winner text, message, stats, button
document.body.appendChild(toast);
// Allow ESC to dismiss
document.addEventListener('keydown', handleEscape);
```

---

## Common Gotchas & Solutions

### 1. CSS Specificity Issues
**Problem:** Inline styles being overridden by CSS rules using shorthand properties.

**Example:** `background: linear-gradient(...)` resets `background-color`.

**Solution:** Use more specific selectors with `background: none;` to clear unwanted styles.

### 2. Water Surface Detection
**Problem:** Need to check if projectile is underwater.

**Solution:**
```javascript
const isUnderwater = isOceanMode && waterSurfaceY != null && y > waterSurfaceY;
```

**Note:** `y` increases downward in canvas coordinates.

### 3. Game Object Access
**Problem:** Game instance stored in different global variables.

**Solution:** Check both:
```javascript
const game = window.game || window.mainGame;
```

### 4. Weapon Filtering
**Problem:** Need to filter weapons in multiple places (AI, UI, firing).

**Solution:** Centralize logic:
- `isAllowedWeapon()` in main.js for UI
- `canUse()` helper in AI weapon selection
- Both check `game.landOnlyWeapons` and `game.waterOnlyWeapons` Sets

### 5. Modal vs Toast UI
**Problem:** Modals can be hidden/shown with `.hidden` class OR `classList.remove('hidden')`.

**Better Approach:** Create dynamic toast elements with `document.createElement()` and `appendChild()` for cleaner state management.

---

## Testing Checklist

### Ocean Map Weapon Restrictions
- [ ] AI only uses underwater weapons on ocean maps
- [ ] Land-only weapons grayed out in player UI on ocean maps
- [ ] Underwater weapons work correctly
- [ ] Regular weapons work on both land and ocean maps

### Trajectory Guide
- [ ] Black dots for air trajectory
- [ ] Cyan dots for underwater trajectory
- [ ] Red dot for impact point
- [ ] Smooth transition at water surface
- [ ] Accurate prediction for torpedoes

### Victory Toast
- [ ] Shows correct winner name
- [ ] Displays contextual message
- [ ] Shows game stats (turns, health)
- [ ] "New Game" button works
- [ ] ESC key dismisses toast
- [ ] Works for player wins, AI wins, team wins, draws

### New Game Setup
- [ ] Environment presets apply correct terrain/theme/time
- [ ] Custom option shows advanced settings
- [ ] Static time toggle freezes day/night cycle
- [ ] Settings persist to localStorage
- [ ] Theme previews update correctly

---

## File Location Reference

### Game Logic
- **Main game loop**: `js/game.js:update()`, `js/game.js:render()`
- **Turn management**: `js/game.js:nextTurn()`, `js/game.js:endTurn()`
- **Victory checking**: `js/game.js:checkGameOver()`, `js/game.js:showGameOver()`
- **AI logic**: `js/game.js:chooseAIWeapon()`, `js/game.js:performAITurn()`

### Physics
- **Projectile physics**: `js/projectile.js:update()`
- **Underwater physics**: `js/projectile.js:323-346`
- **Trajectory simulation**: `js/game.js:drawTrajectoryGuide()`

### UI Components
- **Weapon menu**: `js/main.js:renderWeaponMenu()`
- **Weapon filtering**: `js/main.js:isAllowedWeapon()`
- **Setup modal**: `index.html:setup-modal`
- **Victory toast**: `js/game.js:showVictoryToast()`

### Configuration
- **Weapon sets**: `js/game.js:73-78` (landOnlyWeapons), weapon-meta.js (all weapons)
- **Environment presets**: `js/main.js:954-990`
- **Game constants**: `js/constants.js`

---

## Development Workflow

### Running the Game
```bash
npm run dev  # Starts dev server on localhost:5600
```

### Making Changes
1. Edit relevant JS/CSS files
2. Vite hot-reloads automatically
3. Test in browser at http://localhost:5600
4. For game logic changes, start a new game to see effects

### Debugging Tips
- Use browser DevTools console for errors
- `game` object accessible in console: `window.game` or `window.mainGame`
- Tank array: `game.tanks`
- Current tank: `game.getCurrentTank()`
- Check ocean mode: `game.terrain._isOceanTerrain`

### Common Test Scenarios
- **Ocean map**: Select "Ocean" preset in New Game Setup
- **Quick victory**: Use Debug panel or console to set tank health to 0
- **Weapon testing**: Open weapon menu, check for grayed-out items
- **Trajectory testing**: Enable "Trajectory Guide" in Game Options

---

## Documentation Files

The project includes detailed documentation for recent fixes:

- **UNDERWATER_TRAJECTORY_FIX.md**: Complete guide to trajectory guide underwater physics
- **COLOR_PICKER_FIX.md**: CSS specificity issue with color swatches
- **NEW_GAME_SETUP_UI.md**: Environment presets and static time toggle
- **CLAUDE.md**: This file - comprehensive project context

---

## Future Considerations

### Potential Improvements
- **Performance**: Large numbers of particles can slow down on mobile
- **Mobile Support**: Touch controls for angle/power adjustment
- **Network Play**: Currently single-player/hotseat only
- **Save/Load**: No game state persistence beyond localStorage settings

### Code Quality
- **No TypeScript**: Pure JavaScript, watch for type errors
- **No Testing**: Manual testing only, no unit tests
- **Global State**: Game instance stored globally, not ideal but works
- **Large Files**: game.js is 7000+ lines, could be split into modules

### Known Quirks
- **Controls Binding Spam**: Console shows many "[ui] controls bound" messages (harmless)
- **Day/Night Cycle**: Very fast by default (unless static time enabled)
- **Wind System**: Wind effect was reduced from 0.08 to 0.015 (too strong before)

---

## Key Takeaways for AI Agents

1. **Always check for ocean maps** when working with weapons or physics
2. **Use Sets for weapon filtering** (`landOnlyWeapons`, `waterOnlyWeapons`)
3. **CSS specificity matters** - use specific selectors, avoid shorthand overrides
4. **Physics must match** - trajectory guide must use same physics as projectiles
5. **Single source of truth** - centralize logic (don't duplicate weapon checks)
6. **Test both modes** - verify changes work on land AND ocean maps
7. **Read existing docs** - check markdown files for context on recent fixes
8. **Preserve user experience** - changes should feel cohesive with existing UI

---

## Contact & Contribution

This is a personal project. For questions or context:
- Check recent markdown documentation files
- Review git history for change context
- Test changes on both land and ocean maps
- Maintain existing code style and patterns

**Version:** 2.0.3
**Last Updated:** 2025-12-01
**Maintained By:** Jesse (with AI assistance)

---

*This document is maintained for AI agents and human engineers to quickly understand the codebase structure, recent changes, and common patterns. Update this file when making significant architectural changes.*
