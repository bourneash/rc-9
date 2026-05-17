# Canyon Collision Investigation (2026-05-17)

## Bug summary

On the Canyon preset, tank movement is supposed to be restricted to the left
and right plateaus (no crossing the canyon). In practice tanks can drive into
and across the canyon. The "Cannot cross the canyon!" guard works only for
tanks already standing on the correct plateau; tanks that spawn inside the
canyon, or that reach a cliff edge, are not actually held by the cliff because
the slope threshold used as the in-canyon collision check never fires at the
real per-step movement deltas.

## Canyon terrain generation

- Where canyon walls are generated: `site/js/terrain.js:141` (the
  `if (chosen === 'canyon')` branch inside `generate()`).
- How they're represented in memory: a 1-D `heightMap` (`Array<number>` of
  length `width`, one ground-Y per X column). There is no separate collision
  mask, no per-pixel blocked array, and no "wall" object. Canyon "walls" are
  just very steep regions of the same heightmap.
- Side-channel state stored on the Terrain instance when a canyon is generated
  (`site/js/terrain.js:212-225`):
  - `_canyonValleyLeft`, `_canyonValleyRight` — X of the narrow floor edges.
  - `_canyonLeftCliffStart`, `_canyonRightCliffStart` — X of the top-of-cliff
    transitions on each plateau.
  - `_canyonLeftSafeZone`, `_canyonRightSafeZone` — cliff start +/- 10 px.
  - `_movementMinX = 20`, `_movementMaxX = width - 20` — global bounds (NOT
    the canyon edges).
  - `profile = 'canyon'` — marker consumed by `canMoveTo()`.
- APIs terrain exposes to query "is (x, y) blocked":
  - `terrain.canMoveTo(currentX, newX)` — `site/js/terrain.js:318`. Main
    gate. Checks global bounds + canyon side / safe-zone rules.
  - `terrain.getMovementBounds()` — `site/js/terrain.js:474`. Returns
    `[_movementMinX, _movementMaxX]` if set. Note: these are the FULL-WIDTH
    bounds, not the canyon plateau edges.
  - `terrain.getHeight(x)` and `terrain.getSlopeAngle(x)` — surface lookups,
    not gates.
- There is no `isBlocked(x, y)` or `getCollisionMaskAt(x)` API; everything
  flows through `canMoveTo()`.

## Tank movement code

- Where tank lateral movement happens: `site/js/tank.js:71`
  (`Tank.move(direction, terrain, maxDistance = 50)`). One step is
  `moveSpeed = 2` px (`site/js/tank.js:74`).
- Collision check before applying movement: `tank.move()` consults
  `terrain.canMoveTo(this.x, newX)` at `site/js/tank.js:78` and bails if it
  returns false. That is the ONLY collision check the tank does.
- Movement is invoked from:
  - Player drive-mode keyboard handler: `site/js/main.js:3802-3819` calls
    `game.moveTank(-1 | 1)`.
  - Joystick / touch handler: `site/js/main.js:3859-3895` also calls
    `game.moveTank(...)`.
  - Player path: `Game.moveTank(direction)` at `site/js/game.js:7681` runs a
    canyon-specific guard (lines 7687-7728) THEN calls
    `currentTank.move(direction, this.terrain)` at line 7730.
  - AI path: `Game.executeAIMove(...)` at `site/js/game.js:7070` checks
    `getMovementBounds()` (global only) then calls
    `aiTank.move(dir, this.terrain)` at line 7094.
- The gap (why canyon walls aren't being respected — specifics):
  1. **Slope threshold in `canMoveTo()` never trips.** `site/js/terrain.js:351-355`
     blocks an in-canyon step only when
     `|getHeight(newX) - getHeight(currentX)| > 50`. Movement step is 2 px,
     and the steepest canyon cliff drops `canyonDepth = ~180 px` over
     `cliffPixels = 0.08 * width` (~80-100 px), so the height delta per
     2-pixel step is roughly 4-5 px — far below 50. The check is effectively
     dead code; tanks that find themselves inside the canyon can climb
     either cliff and exit.
  2. **Spawn places tanks inside the canyon.** `site/js/game.js:1066-1073`
     clamps spawn X to `getMovementBounds()` which is `[20, width - 20]`
     (not the cliff edges). Tanks routinely spawn between
     `_canyonLeftCliffStart` and `_canyonRightCliffStart` — i.e., inside the
     canyon. Once inside, neither the `isOnLeftSide` nor `isOnRightSide`
     safe-zone branch applies (both are false), and the only remaining check
     is the broken slope threshold from (1). So in-canyon tanks can roam
     freely.
  3. **Inconsistent "which side am I on" math.** `Game.moveTank` at
     `site/js/game.js:7696` uses
     `isOnLeftSide = currentTank.x < (leftCliff + rightCliff) / 2` (midpoint
     of canyon). `Terrain.canMoveTo` at `site/js/terrain.js:332` uses
     `isOnLeftSide = currentX < leftCliff` (cliff edge). For a tank inside
     the canyon left-of-center, `moveTank` thinks it's "on the left side"
     and blocks rightward moves, while `canMoveTo` treats it as
     `isInCanyon`. This contradiction makes player behavior dependent on
     which guard fires first.
  4. **AI movement only consults full-width bounds.** `executeAIMove`
     (`site/js/game.js:7084`) only checks `getMovementBounds()`
     `[20, width - 20]`. The cliff edges are never enforced there — AI is
     fully dependent on `canMoveTo()`, which suffers from (1).
  5. **Terrain destruction can erase the walls anyway.** `applyExplosion`
     (`site/js/terrain.js:363`) only lowers the surface (raises heightmap)
     and `smoothTerrain` smooths over the cliffs. There's no protection of
     the cliff columns from explosive flattening. Even if everything else
     were fixed, a few well-placed shots would erase the cliffs as visual
     features. (Whether to fix that is a separate question — leave for
     Task 11 to decide whether collision should remain "logical" via stored
     X bands or follow the heightmap.)

## Proposed fix for Task 11

Make collision logical, not heightmap-dependent, and apply it consistently:

1. **Edit `site/js/terrain.js:318` `canMoveTo()`** to treat the cliff X bands
   themselves as hard walls regardless of which side the tank is currently
   on. Pseudocode:

   ```js
   canMoveTo(currentX, newX) {
     if (newX < this._movementMinX || newX > this._movementMaxX) return false;
     if (this.profile === 'canyon') {
       const leftEdge  = this._canyonLeftCliffStart;   // top of left cliff
       const rightEdge = this._canyonRightCliffStart;  // top of right cliff
       // Define the forbidden band as (leftEdge, rightEdge) exclusive.
       const newInForbidden  = newX > leftEdge && newX < rightEdge;
       const currInForbidden = currentX > leftEdge && currentX < rightEdge;
       // Block ANY step that lands in the forbidden band.
       if (newInForbidden) return false;
       // Block crossing the band (e.g. teleport from leftEdge-1 to rightEdge+1).
       if (!currInForbidden &&
           ((currentX <= leftEdge && newX >= rightEdge) ||
            (currentX >= rightEdge && newX <= leftEdge))) return false;
       // If a tank was somehow spawned inside the band, allow it to escape
       // out whichever side is closer, but never cross the midpoint.
       if (currInForbidden) {
         const mid = (leftEdge + rightEdge) / 2;
         const escapingLeft  = newX <= leftEdge  && currentX < mid;
         const escapingRight = newX >= rightEdge && currentX > mid;
         if (!(escapingLeft || escapingRight)) return false;
       }
     }
     return true;
   }
   ```

2. **Edit `site/js/game.js:1066-1073` spawn logic** to clamp tank X to one of
   the two plateaus instead of full-width bounds. Distribute spawns so at
   least one tank is on each side. Concretely, for canyon:
   - left plateau range: `[20, _canyonLeftCliffStart - pad]`
   - right plateau range: `[_canyonRightCliffStart + pad, width - 20]`
   - alternate sides across the tank list (or split by team / index parity).

3. **Delete or simplify the bespoke guard in `Game.moveTank`
   (`site/js/game.js:7687-7728`)** — once `canMoveTo()` is the single source
   of truth, the duplicated midpoint-based logic should go. Keep just the
   "play the dust + log message when blocked" UX hook by checking the return
   value of `tank.move()` and emitting the warning if it was false on a
   canyon map.

4. **Update `Game.executeAIMove` (`site/js/game.js:7083-7093`)** to rely on
   `tank.move()` returning false (same path as the player), or to call
   `terrain.canMoveTo()` directly. Drop the full-width bounds shortcut for
   canyon maps.

5. **Optional / Task 11 author's call:** decide whether the cliff band
   should also be protected from terrain destruction. The minimal-risk
   choice is to leave destruction as-is (cliffs can be eroded visually) but
   keep the logical X-band collision intact, so even if a player blasts a
   gap in the cliff, tanks still can't cross. Note this in the implementation
   commit so it's an intentional choice, not an oversight.

This keeps all collision logic in `Terrain.canMoveTo()` (one place to reason
about), uses stored X bands rather than the fragile heightmap slope, and
fixes the spawn-inside-canyon root cause that defeats every per-step check.
