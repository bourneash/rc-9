# Automated Gameplay Testing System

## Concept: MCP-Powered Game Testing

Yes, this is **totally feasible** and actually a brilliant idea! We can use the existing MCP browser tools to automate gameplay testing. Here's how:

## Architecture

### Option 1: Browser Automation (Recommended)
Use the existing `puppeteer` MCP server that's already connected to your project to:
1. Navigate to the game
2. Take screenshots at each step
3. Click UI elements
4. Evaluate JavaScript to read game state
5. Simulate user actions

### Option 2: Direct Game State Access
Add a testing API to the game that exposes internal state for automated testing.

---

## Implementation Plan

### Phase 1: Basic Test Automation (Using MCP)

We can use the existing MCP browser tools you already have:
- `mcp__puppeteer__puppeteer_navigate` - Load the game
- `mcp__puppeteer__puppeteer_click` - Click buttons
- `mcp__puppeteer__puppeteer_evaluate` - Read game state via JavaScript
- `mcp__puppeteer__puppeteer_screenshot` - Capture game state visually
- `mcp__browser-tools__getConsoleErrors` - Check for errors

### Test Scenarios We Can Automate:

#### 1. **Smoke Test** (Game Loads)
```javascript
// Navigate to game
await navigate('http://localhost:5173');

// Check for errors
const errors = await getConsoleErrors();
if (errors.length > 0) FAIL;

// Verify game canvas exists
const hasCanvas = await evaluate(`
  document.getElementById('game-canvas') !== null
`);
```

#### 2. **New Game Flow**
```javascript
// Click New Game button
await click('#new-game-btn');

// Wait for modal
await screenshot('new-game-modal');

// Start game with 2 players
await click('#start-game-btn');

// Verify game started
const gameStarted = await evaluate(`
  window.__SE_GAME__ && window.__SE_GAME__.tanks.length === 2
`);
```

#### 3. **Fire Weapon Test**
```javascript
// Set angle and power
await evaluate(`
  const game = window.__SE_GAME__;
  game.angle = 45;
  game.power = 50;
`);

// Click fire button
await click('#fire-button');

// Wait for projectile
await new Promise(r => setTimeout(r, 100));

// Verify projectile exists
const projectileFired = await evaluate(`
  window.__SE_GAME__.projectiles.length > 0
`);
```

#### 4. **AI Turn Test**
```javascript
// Start game with AI
await evaluate(`
  window.__SE_GAME__.startNewGameWithConfig({
    totalPlayers: 2,
    humanPlayers: 1,
    aiDifficulty: 'medium'
  });
`);

// Wait for AI turn
await new Promise(r => setTimeout(r, 3000));

// Verify AI didn't lock up
const aiLocked = await evaluate(`
  window.__SE_GAME__.aiTurnInProgress
`);
if (aiLocked) FAIL('AI turn never completed');
```

#### 5. **Canyon Map Test**
```javascript
// Start canyon map game
await evaluate(`
  window.__SE_GAME__.startNewGameWithConfig({
    totalPlayers: 2,
    theme: 'canyon',
    terrainProfile: 'canyon'
  });
`);

// Try to move tank into canyon wall
const tank = await evaluate(`
  const game = window.__SE_GAME__;
  const tank = game.tanks[0];
  const startX = tank.x;

  // Try to move toward canyon
  for (let i = 0; i < 100; i++) {
    tank.move(1, game.terrain, 200);
  }

  // Check if tank moved past boundary
  const canMoveTo = game.terrain.canMoveTo(startX, tank.x + 100);
  return { movedPastBoundary: !canMoveTo };
`);
```

---

## Test Suite Structure

### tests/gameplay/
- `smoke-test.js` - Basic loading and initialization
- `new-game-test.js` - New game creation flow
- `fire-weapon-test.js` - Weapon firing mechanics
- `ai-behavior-test.js` - AI turn management
- `canyon-map-test.js` - Terrain boundaries
- `game-modes-test.js` - All game modes (classic, teams, solo, realtime)
- `weapon-balance-test.js` - Test all 31 weapons
- `mobile-controls-test.js` - Touch controls
- `victory-conditions-test.js` - Win/lose scenarios

---

## Automated Test Runner

### Using Task Agent to Run Tests

We can create a specialized testing agent that:
1. Starts the dev server
2. Uses MCP browser tools to interact with game
3. Runs through test scenarios
4. Reports results

### Example Test Runner Flow:

```javascript
// test-runner.js
export async function runGameplayTests() {
  const results = {
    passed: [],
    failed: [],
    errors: []
  };

  // Start dev server
  console.log('Starting dev server...');
  await exec('npm run dev &');
  await sleep(3000);

  // Run each test
  for (const test of TEST_SCENARIOS) {
    try {
      console.log(`Running: ${test.name}`);
      const result = await test.run();

      if (result.passed) {
        results.passed.push(test.name);
      } else {
        results.failed.push({ name: test.name, reason: result.reason });
      }
    } catch (error) {
      results.errors.push({ name: test.name, error: error.message });
    }
  }

  return results;
}
```

---

## Testing API Addition to Game

### Add Testing Hooks to game.js

```javascript
// Add to game.js constructor
if (typeof globalThis !== 'undefined') {
  globalThis.__SE_GAME__ = this;
  globalThis.__SE_TEST_API__ = {
    // Expose test-friendly methods
    getGameState: () => ({
      tanks: this.tanks.map(t => ({ x: t.x, y: t.y, health: t.health })),
      projectiles: this.projectiles.length,
      gameOver: this.gameOver,
      currentTurn: this.currentTankIndex,
      wind: this.wind
    }),

    simulateFire: (angle, power) => {
      this.angle = angle;
      this.power = power;
      this.fire();
    },

    simulateTurn: async () => {
      // Fast-forward through a turn
      return new Promise(resolve => {
        const checkDone = () => {
          if (!this.isAnimating && !this.turnEnding) {
            resolve();
          } else {
            setTimeout(checkDone, 100);
          }
        };
        this.fire();
        checkDone();
      });
    },

    skipToGameOver: () => {
      // Destroy all but one tank for testing
      for (let i = 1; i < this.tanks.length; i++) {
        this.tanks[i].health = 0;
      }
    }
  };
}
```

---

## MCP Testing Agent Example

### How to Use from Claude Code

```javascript
// User can ask: "Test the game"
// Agent would:

1. Start dev server (npm run dev)
2. Navigate to http://localhost:5173
3. Run test scenarios using MCP browser tools
4. Report results

// Example interaction:
"Run smoke test"
→ Agent navigates to game
→ Checks for console errors
→ Verifies canvas exists
→ Takes screenshot
→ Reports: ✓ Smoke test passed

"Test all weapons"
→ Agent starts game
→ Cycles through each weapon
→ Fires at target
→ Verifies damage dealt
→ Reports: ✓ 31/31 weapons working
```

---

## Benefits of MCP-Powered Testing

### 1. **Visual Verification**
- Screenshots show actual game state
- Can detect visual bugs (rendering issues)
- Human-reviewable evidence

### 2. **Real Browser Environment**
- Tests actual user experience
- Catches browser-specific bugs
- Tests actual physics/timing

### 3. **No Test Framework Needed**
- Uses existing MCP tools
- No Jest/Vitest setup required
- Works with production code as-is

### 4. **Interactive Debugging**
- Can pause mid-test
- Inspect game state
- Try different scenarios live

---

## Automated Balance Testing

### Weapon Balance Analysis

```javascript
async function testWeaponBalance() {
  const weapons = [
    'missile', 'heavy', 'nuke', 'mirv', 'funky',
    // ... all 31 weapons
  ];

  const results = {};

  for (const weapon of weapons) {
    // Set up test scenario
    await evaluate(`
      const game = window.__SE_GAME__;
      game.startNewGameWithConfig({
        totalPlayers: 2,
        terrainProfile: 'flat'
      });

      // Position tanks at fixed distance
      game.tanks[0].x = 300;
      game.tanks[1].x = 700;

      // Set weapon
      game.tanks[0].weapon = '${weapon}';

      // Fire at optimal angle/power
      game.tanks[0].angle = 45;
      game.tanks[0].power = 70;
      game.fire();
    `);

    // Wait for impact
    await sleep(3000);

    // Check damage dealt
    const damage = await evaluate(`
      const tank = window.__SE_GAME__.tanks[1];
      return 100 - tank.health;
    `);

    results[weapon] = {
      damage,
      balanced: damage >= 20 && damage <= 80
    };
  }

  return results;
}
```

---

## Crash/Bug Detection

### Automated Bug Hunting

```javascript
async function fuzzTestGame() {
  const scenarios = [];

  // Random game configurations
  for (let i = 0; i < 100; i++) {
    const config = {
      totalPlayers: Math.floor(Math.random() * 7) + 2,
      theme: randomChoice(['forest', 'desert', 'canyon', 'ocean']),
      terrainProfile: randomChoice(['random', 'flat', 'hilly', 'mountain']),
      windMode: randomChoice(['none', 'low', 'medium', 'high'])
    };

    try {
      await startGame(config);
      await playRandomTurns(10);
      await screenshot(`fuzz-test-${i}`);
      scenarios.push({ config, passed: true });
    } catch (error) {
      scenarios.push({ config, passed: false, error });
    }
  }

  return scenarios;
}
```

---

## Performance Testing

### FPS and Lag Detection

```javascript
async function testPerformance() {
  await evaluate(`
    const game = window.__SE_GAME__;
    let frameCount = 0;
    let lastTime = performance.now();

    window.__FPS_COUNTER__ = {
      frames: [],
      start: () => {
        const measure = () => {
          const now = performance.now();
          const fps = 1000 / (now - lastTime);
          this.frames.push(fps);
          lastTime = now;
          frameCount++;

          if (frameCount < 600) { // 10 seconds at 60fps
            requestAnimationFrame(measure);
          }
        };
        measure();
      },
      getStats: () => {
        const avg = this.frames.reduce((a,b) => a+b) / this.frames.length;
        const min = Math.min(...this.frames);
        return { avg, min, frames: this.frames.length };
      }
    };

    window.__FPS_COUNTER__.start();
  `);

  // Wait for measurement
  await sleep(10000);

  const stats = await evaluate(`window.__FPS_COUNTER__.getStats()`);
  return stats; // { avg: 59.8, min: 52.3, frames: 598 }
}
```

---

## Next Steps

### 1. Create Test Suite
- Write test scenarios using MCP browser tools
- Create test runner script
- Add testing API to game.js

### 2. Run Initial Tests
- Smoke test
- All game modes
- AI behavior
- Weapon functionality
- Terrain boundaries

### 3. Continuous Testing
- Run tests before each commit
- Automated regression testing
- Performance benchmarks

---

## Feasibility Assessment

### ✅ **Highly Feasible!**

**Why it works:**
- MCP puppeteer tools already connected
- Game exposes `window.__SE_GAME__`
- Can evaluate JavaScript directly
- Can screenshot visual state
- Can check console for errors

**Limitations:**
- Slower than unit tests (real browser)
- Requires dev server running
- Visual tests need interpretation
- Can't test "feel" (only mechanics)

**Best Use Cases:**
- Regression testing
- Game mode verification
- Weapon balance analysis
- Bug reproduction
- Performance monitoring

---

## Would you like me to implement this?

I can:
1. ✅ Add testing API to game.js
2. ✅ Create test scenarios
3. ✅ Build automated test runner
4. ✅ Run tests and report results
5. ✅ Create performance benchmarks

This is actually really cool - automated game testing via MCP! 🎮🤖
