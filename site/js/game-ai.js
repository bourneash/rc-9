// game-ai.js — extracted from game.js
// AI turn execution: movement planning, shot calculation, weapon selection, and shield decisions.

export function performAITurn(game) {
  if (game.gameOver) return;
  // In realtime mode each tank fires on its own cooldown; don't block on global animation state.
  if (game.mode !== 'realtime' && (game.isAnimating || game.turnEnding)) return;

  const aiTank = game.tanks[game.currentTankIndex];
  if (!aiTank?.isAI || aiTank.health <= 0) return;

  // Prevent multiple AI turns - check if current tank is actually AI
  if (game.aiTurnInProgress) {
    // console.log('AI turn already in progress, skipping');
    return;
  }

  game.aiTurnInProgress = true;

  // Guards against a deferred AI action (think timer / move callback) firing into a
  // *different* game after a fast "New Game". On reset the tanks array is replaced,
  // so an old closure's aiTank is no longer a member. Returns:
  //   'stale' — belongs to a prior game; do nothing, don't touch the new game's flags
  //   'over'  — same game but it ended; clear our in-progress flag and stop
  //   null    — still valid, proceed
  const aiTurnStatus = () => {
    if (!game.tanks.includes(aiTank)) return 'stale';
    if (game.gameOver || aiTank.health <= 0) return 'over';
    return null;
  };

  try {
    const targets = game.tanks.filter(t => t !== aiTank && t.health > 0);
    if (targets.length === 0) {
      game.aiTurnInProgress = false;
      return;
    }

    const target = targets[Math.floor(Math.random() * targets.length)];
    const initialDx = target.x - aiTank.x;
    const initialDy = aiTank.y - target.y;
    const initialDistance = Math.hypot(initialDx, initialDy);

    const plan = planAIMovement(game, aiTank, target, initialDistance);
    const afterMove = () => {
      const st = aiTurnStatus();
      if (st === 'stale') return; // new game started mid-move; leave its state alone
      if (st === 'over') {
        game.aiTurnInProgress = false;
        return;
      }
      // Recompute distance after movement
      const dx = target.x - aiTank.x;
      const dy = aiTank.y - target.y;
      const distance = Math.hypot(dx, dy);
      const {
        angle: bestAngle,
        power: bestPower,
        weapon: bestWeapon,
      } = calculateAIShot(game, distance, dx, dy, target);
      // Defensive check: consider using shield instead of attacking
      const aiTargets = game.tanks.filter(
        t => t && t.health > 0 && t !== aiTank && !game.isFriendly(aiTank, t)
      );
      const useShield = shouldAIUseShield(game, aiTank, aiTargets);
      if (useShield) {
        aiTank.weapon = 'shield';
        // Angle/power irrelevant for shield; set reasonable defaults
        aiTank.angle = 90;
        aiTank.power = 50;
      } else {
        aiTank.angle = Math.round(bestAngle);
        aiTank.power = Math.round(bestPower);
        aiTank.weapon = bestWeapon;
      }
      game.updateUI();
      const thinkTime = game.config?.ai?.[aiTank.aiSkill]?.thinkTime || 1500;
      setTimeout(() => {
        const tryFire = (retries = 25) => {
          const st = aiTurnStatus();
          if (st === 'stale') return; // a new game replaced this one; never fire into it
          if (st === 'over') {
            game.aiTurnInProgress = false;
            return;
          }
          // While paused (blur, modal, etc.), wait without consuming retries. Once
          // resumed, the poll naturally fires. Prevents the AI from "giving up" when
          // the user briefly switches away during its think window.
          if (game.paused) {
            setTimeout(() => tryFire(retries), 250);
            return;
          }
          const readyToFire =
            game.mode === 'realtime' ? !aiTank._fireLocked : !game.isAnimating && !game.turnEnding;
          if (readyToFire) {
            game.aiTurnInProgress = false;
            game.fire(aiTank);
          } else if (retries > 0) {
            setTimeout(() => tryFire(retries - 1), 120);
          } else {
            // Force through stuck gates after retry budget.
            if (game.mode !== 'realtime') {
              game.isAnimating = false;
              game.turnEnding = false;
            }
            game.aiTurnInProgress = false;
            game.fire(aiTank);
          }
        };
        tryFire();
      }, thinkTime);
    };

    if (plan && plan.shouldMove && plan.steps > 0) {
      executeAIMove(game, aiTank, plan, afterMove);
    } else {
      afterMove();
    }
  } catch (error) {
    console.error('[performAITurn] Error during AI turn:', error);
    game.aiTurnInProgress = false;
    game.enableControls();
  }
}

// Decide if AI should use Shield this turn based on health and exposure
export function shouldAIUseShield(game, aiTank, enemyTargets) {
  try {
    if (!aiTank || !aiTank.isAI || aiTank.health <= 0) return false;
    // Already shielded? Don't re-apply
    if (aiTank._shield && (aiTank._shield.turnsLeft ?? 0) > 0) return false;
    // Check if shield is allowed by mode and ammo
    const canUse = () => {
      if (game.ammoMode === 'missile-only') return false;
      if (aiTank.unlimitedAmmo) return true;
      const n = aiTank.getAmmo?.('shield') ?? 0;
      return n > 0;
    };
    if (!canUse()) return false;

    const maxH = aiTank.maxHealth || 100;
    const hpFrac = maxH > 0 ? aiTank.health / maxH : 0;
    const lowHealth = hpFrac <= 0.35; // <= 35%

    // Exposure: count nearby enemies; evaluate nearest enemy distance
    let nearCount = 0;
    let nearest = Infinity;
    for (const t of enemyTargets || []) {
      const d = Math.hypot(t.x - aiTank.x, t.y - 10 - (aiTank.y - 10));
      if (d < nearest) nearest = d;
      if (d <= 220) nearCount++;
    }
    const veryCloseEnemy = nearest < 160;
    const manyNearby = nearCount >= 2;

    // Edge/slope exposure: edges are risky; steep slope increases hit chance
    const nearEdge = aiTank.x < 60 || aiTank.x > game.width - 60;
    const slopeDeg = Math.abs(((game.terrain?.getSlopeAngle?.(aiTank.x) || 0) * 180) / Math.PI);
    const steep = slopeDeg > 14;

    // Difficulty-based willingness
    const skill = aiTank.aiSkill || 'medium';
    let baseProb = 0.0;
    if (skill === 'easy') baseProb = 0.25;
    else if (skill === 'hard' || skill === 'expert' || skill === 'insane') baseProb = 0.75;
    else baseProb = 0.5;

    // Compose triggers
    const trigger =
      lowHealth || veryCloseEnemy || manyNearby || (nearEdge && (veryCloseEnemy || steep));
    if (!trigger) return false;

    // If overall threat seems modest (all enemies far), avoid wasting shield
    if (nearest > 420 && !lowHealth) return false;

    // Randomize slightly so behavior isn't robotic
    return Math.random() < baseProb;
  } catch (e) {
    // console.warn('shouldAIUseShield failed', e);
    return false;
  }
}

// Decide if AI should move this turn; returns a simple plan { shouldMove, dir, steps, delay }
export function planAIMovement(game, aiTank, target, distance) {
  try {
    const skill = aiTank.aiSkill || 'medium';
    let baseProb =
      skill === 'easy'
        ? 0.25
        : skill === 'hard' || skill === 'expert' || skill === 'insane'
          ? 0.65
          : 0.45;
    // Edges are dangerous
    if (aiTank.x < 60 || aiTank.x > game.width - 60) baseProb += 0.25;
    // Steep slope: prefer flatter ground
    const slopeDeg = Math.abs(((game.terrain?.getSlopeAngle?.(aiTank.x) || 0) * 180) / Math.PI);
    if (slopeDeg > 12) baseProb += 0.2;
    // Too close or too far from target
    if (distance < 180) baseProb += 0.15;
    else if (distance > 620) baseProb += 0.2;
    // Clamp probability
    baseProb = Math.max(0, Math.min(0.9, baseProb));
    if (Math.random() >= baseProb) return { shouldMove: false, dir: 0, steps: 0, delay: 0 };

    // Choose direction
    let dir = 0;
    // If near edge, move inward
    if (aiTank.x < 60) dir = +1;
    else if (aiTank.x > game.width - 60) dir = -1;
    // If on steep slope, sample both sides and pick lower absolute slope
    if (dir === 0 && slopeDeg > 12) {
      const sl = Math.abs(((game.terrain?.getSlopeAngle?.(aiTank.x - 12) || 0) * 180) / Math.PI);
      const sr = Math.abs(((game.terrain?.getSlopeAngle?.(aiTank.x + 12) || 0) * 180) / Math.PI);
      dir = sl < sr ? -1 : +1;
    }
    // Distance bias: far -> move toward, too close -> move away
    if (dir === 0) {
      const toward = target.x > aiTank.x ? +1 : -1;
      if (distance > 620) dir = toward;
      else if (distance < 180) dir = -toward;
      else dir = Math.random() < 0.5 ? toward : -toward;
    }
    // Steps: small reposition; scale by skill and fuel
    const fuelSteps = Math.max(0, Math.min(40, Math.floor((aiTank.fuel || 0) / 2))); // rough cap by fuel
    let steps = 6 + Math.floor(Math.random() * 8);
    if (distance > 620) steps += 5;
    if (skill === 'easy') steps = Math.floor(steps * 0.8);
    if (skill === 'hard' || skill === 'expert' || skill === 'insane')
      steps = Math.floor(steps * 1.25);
    steps = Math.max(0, Math.min(20, Math.min(steps, fuelSteps)));
    const delay = 36 + Math.floor(Math.random() * 30); // ms per step
    if (steps <= 0 || dir === 0) return { shouldMove: false, dir: 0, steps: 0, delay: 0 };
    return { shouldMove: true, dir, steps, delay };
  } catch (e) {
    // console.warn('planAIMovement failed', e);
    return { shouldMove: false, dir: 0, steps: 0, delay: 0 };
  }
}

// Execute simple left/right movement for AI before taking the shot
export function executeAIMove(game, aiTank, plan, onDone) {
  try {
    let remaining = plan.steps;
    const dir = plan.dir;
    const delay = plan.delay;
    const step = () => {
      if (game.gameOver || remaining <= 0 || aiTank.health <= 0) {
        try {
          onDone?.();
        } catch {}
        return;
      }
      // Movement bounds (including canyon walls) are enforced by
      // terrain.canMoveTo() inside aiTank.move(). If it returns false the
      // step block below bails and we stop the move loop.
      const moved = aiTank.move(dir, game.terrain);
      if (moved) {
        // Occasional dust for flavor on dusty themes
        if (
          game.themeName === 'desert' ||
          game.themeName === 'moon' ||
          game.themeName === 'mars' ||
          game.themeName === 'canyon'
        ) {
          try {
            game.spawnDustForTheme(game.themeName, aiTank.x - dir * 6, aiTank.y - 2, 6);
          } catch {}
        }
        game.updateUI();
        remaining -= 1;
        // Continue moving if steps remain
        if (remaining > 0) {
          setTimeout(step, delay);
        } else {
          // Movement complete, proceed with shot
          try {
            onDone?.();
          } catch {}
        }
      } else {
        // Could not move (fuel or bounds); stop early and proceed
        try {
          onDone?.();
        } catch {}
      }
    };
    setTimeout(step, delay);
  } catch (e) {
    // console.warn('executeAIMove failed', e);
    try {
      onDone?.();
    } catch {}
  }
}

export function calculateAIShot(game, distance, dx, dy, target) {
  const aiTank = game.tanks[game.currentTankIndex];

  // Get AI difficulty settings with proper fallbacks
  const defaultConfigs = {
    easy: { aimError: 15, powerError: 25 },
    medium: { aimError: 8, powerError: 15 },
    hard: { aimError: 3, powerError: 8 },
  };

  const aiSkill = aiTank.aiSkill || 'medium';
  const skillConfig =
    game.config?.ai?.[aiSkill] || defaultConfigs[aiSkill] || defaultConfigs.medium;

  let angle, power, weapon;

  // Determine if target is to the left or right
  const shootLeft = dx < 0;
  const targetDx = Math.abs(dx); // Distance to target (always positive)
  const targetDy = dy;

  // console.log(`AI calculating shot: dx=${dx.toFixed(1)}, shootLeft=${shootLeft}, targetDx=${targetDx.toFixed(1)}, distance=${distance.toFixed(1)}`);

  // Select weapon using distance + clustering heuristics
  weapon = chooseAIWeapon(game, aiTank, target, distance);

  // Calculate trajectory to hit target
  const g = game.gravityOverride ?? game.gravity;

  // Try to find angle and power that hits target
  let bestAngle = 45;
  let bestPower = 50;
  let minError = Infinity;

  // Adjust angle range based on direction
  const angleMin = shootLeft ? 90 : 10;
  const angleMax = shootLeft ? 170 : 90;

  for (let testAngle = angleMin; testAngle <= angleMax; testAngle += 5) {
    for (let testPower = 30; testPower <= 100; testPower += 10) {
      const angleRad = (testAngle * Math.PI) / 180;
      const baseVelocity = (testPower / 100) * 20 + 10;
      const v = baseVelocity * game.velocityMultiplier;

      // For angles 90-180, cos is negative (shoots left)
      // For angles 0-90, cos is positive (shoots right)
      const vx0 = Math.cos(angleRad) * v;
      const vy0 = -Math.sin(angleRad) * v;

      // Account for wind
      const currentWind = game.windOverride ?? game.wind;
      const windAccel = currentWind * game.windEffect;

      // Simulate trajectory
      let simX = 0;
      let simY = 0;
      let simVx = vx0;
      let simVy = vy0;

      for (let t = 0; t < 200; t++) {
        simVx += windAccel;
        simVy += g;
        simX += simVx;
        simY += simVy;

        // Check if hit ground level
        if (simY >= targetDy) {
          // Compare simulated X to target distance, clamping to map bounds to avoid off-map bias
          let landingDistance = Math.abs(simX);
          const maxDx = game.width; // clamp by canvas width as rough bound
          if (landingDistance > maxDx) landingDistance = maxDx;
          const error = Math.abs(landingDistance - targetDx);

          if (error < minError) {
            minError = error;
            bestAngle = testAngle;
            bestPower = testPower;
          }
          break;
        }
      }
    }
  }

  // Apply safety bias by weapon to reduce self-hits
  const explosiveSet = new Set(['heavy', 'nuke', 'cluster', 'bunker', 'mirv', 'funky']);
  let safeMinAngle = 10;
  if (explosiveSet.has(weapon)) {
    if (distance < 220) safeMinAngle = 60;
    else if (distance < 340) safeMinAngle = 52;
    else safeMinAngle = 45;
  } else if (weapon === 'napalm' || weapon === 'acid') {
    safeMinAngle = 38;
  } else if (weapon === 'homing') {
    safeMinAngle = 28;
  }
  // Clamp the chosen baseline by safety
  bestAngle = Math.max(bestAngle, safeMinAngle);
  // Homing: slightly reduce power for close engagements to avoid overshoot
  if (weapon === 'homing' && distance < 280) bestPower = Math.max(35, bestPower - 10);

  // Apply skill-based error with more differentiation
  angle = bestAngle + (Math.random() - 0.5) * skillConfig.aimError;
  power = bestPower + (Math.random() - 0.5) * skillConfig.powerError;

  // Additional difficulty-specific adjustments
  if (aiSkill === 'easy') {
    // Easy AI has more random variance
    angle += (Math.random() - 0.5) * 8;
    power += (Math.random() - 0.5) * 12;
    // Sometimes picks wrong weapon
    if (Math.random() < 0.2) {
      weapon = ['missile', 'homing', 'cluster'][Math.floor(Math.random() * 3)];
    }
  } else if (aiSkill === 'hard') {
    // Hard AI compensates better for wind
    const windCompensation = game.wind * 3;
    angle -= windCompensation * (shootLeft ? -0.5 : 0.5);
    // More likely to use optimal weapons
    if (distance > 400 && Math.random() < 0.3) {
      weapon = 'homing'; // Use homing for long shots
    }
  }

  // Clamp values based on direction
  if (shootLeft) {
    angle = Math.max(90, Math.min(170, angle));
  } else {
    angle = Math.max(10, Math.min(90, angle));
  }
  power = Math.max(30, Math.min(100, power));

  // Quick early-trajectory ground check; if would hit ground near shooter, bump angle
  try {
    const g = game.gravityOverride ?? game.gravity;
    const angleRad = (angle * Math.PI) / 180;
    const v0 = ((power / 100) * 20 + 10) * game.velocityMultiplier;
    let vx = Math.cos(angleRad) * v0;
    let vy = -Math.sin(angleRad) * v0;
    let x = 0,
      y = 0; // relative to muzzle
    const windAccel = (game.windOverride ?? game.wind) * game.windEffect;
    let bad = false;
    for (let t = 0; t < 18; t++) {
      vx += windAccel;
      vy += g;
      x += vx;
      y += vy;
      if (y >= 0 && Math.abs(x) < 28) {
        bad = true;
        break;
      }
    }
    if (bad) angle = Math.min(shootLeft ? 170 : 90, angle + 10);
  } catch {}

  // In realtime, nudge away from clearly off-map solutions
  try {
    const angR = (angle * Math.PI) / 180;
    let vx = Math.cos(angR) * (((power / 100) * 20 + 10) * game.velocityMultiplier);
    let vy = -Math.sin(angR) * (((power / 100) * 20 + 10) * game.velocityMultiplier);
    let x = 0,
      y = 0;
    const windA = (game.windOverride ?? game.wind) * game.windEffect;
    let fallX = 0;
    for (let t = 0; t < 220; t++) {
      vx += windA;
      vy += game.gravityOverride ?? game.gravity;
      x += vx;
      y += vy;
      if (y >= targetDy) {
        fallX = x;
        break;
      }
    }
    const worldX = aiTank.x + fallX;
    if (worldX < -80 || worldX > game.width + 80) {
      // Pull back within bounds by reducing power a bit and biasing angle toward center
      power = Math.max(30, Math.min(100, power * 0.9));
      const towardCenter = target.x > aiTank.x ? 45 : 135;
      angle = Math.round(angle * 0.7 + towardCenter * 0.3);
    }
  } catch {}
  // console.log(`AI final shot: angle=${angle.toFixed(1)}, power=${power.toFixed(1)}, weapon=${weapon}`);

  return { angle, power, weapon };
}

// Heuristic weapon picker for AI, considering distance and enemy clustering
export function chooseAIWeapon(game, aiTank, target, distance) {
  // Defaults if anything is missing
  if (!aiTank || !target || !Number.isFinite(distance)) {
    // Reasonable fallback
    if (distance > 500) {
      return 'mirv';
    }
    if (distance > 320) {
      return 'heavy';
    }
    return 'missile';
  }
  const skill = aiTank.aiSkill || 'medium';
  const nearRadius = 110; // for clustering checks and hazard safety
  // Count enemies near the chosen target (for EMP/cluster effectiveness)
  let clustered = 0;
  for (const t of game.tanks) {
    if (!t || t.health <= 0 || game.isFriendly(aiTank, t)) continue;
    const d = Math.hypot(t.x - target.x, t.y - 10 - (target.y - 10));
    if (d <= nearRadius) clustered++;
  }

  // Prefer simple weapons on easy; unlock smarter picks on higher difficulty
  const isEasy = skill === 'easy';
  const isHard = skill === 'hard' || skill === 'insane' || skill === 'expert';

  // Check if on ocean map for underwater weapon preferences
  const isOceanMap = game.isOceanMap();

  // Helper to check if AI can use a weapon given ammo/mode
  const canUse = w => game.canUseWeapon(w, aiTank);

  // On ocean maps, prioritize underwater weapons
  if (isOceanMap) {
    // Short range: depth charges
    if (distance < 180 && canUse('depth_charge')) {
      if (Math.random() < 0.7) return 'depth_charge';
    }
    // Mid range: torpedoes
    if (distance < 400 && canUse('torpedo')) {
      if (Math.random() < 0.6) return 'torpedo';
    }
    // Long range: homing torpedoes
    if (distance >= 400 && canUse('homing_torpedo')) {
      if (Math.random() < 0.75) return 'homing_torpedo';
    }
    // Fallback to regular torpedo for any range
    if (canUse('torpedo') && Math.random() < 0.4) {
      return 'torpedo';
    }
  }

  // Very close: use area denial (napalm/acid) or heavy
  if (distance < 180) {
    if (!isEasy && Math.random() < 0.6) {
      const pick = Math.random() < 0.55 ? 'napalm' : 'acid';
      if (canUse(pick)) return pick;
    }
    const heavyPick = Math.random() < 0.2 ? 'nuke' : 'heavy';
    if (canUse(heavyPick)) return heavyPick;
    if (canUse('missile')) return 'missile';
  }
  // Short-mid: missiles, heavy, cluster; if clustered enemies, consider EMP
  if (distance < 340) {
    if (
      !isEasy &&
      clustered >= 2 &&
      Math.random() < 0.6 &&
      (target._stunnedTurns <= 0 || !target._stunnedTurns) &&
      canUse('emp')
    ) {
      return 'emp';
    }
    const r = Math.random();
    if (r < 0.4 && canUse('missile')) return 'missile';
    if (r < 0.7 && canUse('heavy')) return 'heavy';
    if (canUse('cluster')) return 'cluster';
    const fallbacks = ['missile', 'heavy', 'cluster'];
    for (const w of fallbacks) if (canUse(w)) return w;
  }
  // Mid-long: introduce homing and mirv
  if (distance < 560) {
    if (isHard) {
      const w = Math.random() < 0.6 ? 'homing' : 'mirv';
      if (canUse(w)) return w;
    } else {
      const w = Math.random() < 0.5 ? 'heavy' : 'mirv';
      if (canUse(w)) return w;
    }
    if (canUse('missile')) return 'missile';
  }
  // Long range: homing or mirv
  {
    const w = Math.random() < 0.65 ? 'homing' : 'mirv';
    if (canUse(w)) return w;
    if (canUse('missile')) return 'missile';
    // Final fallback: any available (including underwater weapons for ocean maps)
    const options = [
      'missile',
      'heavy',
      'cluster',
      'napalm',
      'acid',
      'emp',
      'bunker',
      'laser',
      'drill',
      'torpedo',
      'homing_torpedo',
      'depth_charge',
    ];
    for (const opt of options) if (canUse(opt)) return opt;
    return 'missile';
  }
}
