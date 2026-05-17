// game-physics.js — extracted from game.js
// Trajectory simulation + underwater physics for the aim guide.

export function drawTrajectoryGuide(game) {
  if (!game.trajectoryGuide) return;
  if (game.gameOver || game.isAnimating) return;
  const tank = game.tanks[game.currentTankIndex];
  if (!tank || tank.isAI || tank.health <= 0) return;

  const ctx = game.ctx;
  ctx.save();
  ctx.globalAlpha = 0.9;
  const angleRad = ((((tank.angle % 360) + 360) % 360) * Math.PI) / 180;
  // Special-case: Homing missile — draw guide only to the apex (pre-homing ballistic arc)
  if (tank.weapon === 'homing') {
    const baseVelocity = (tank.power / 100) * 20 + 10;
    const v0 = baseVelocity * game.velocityMultiplier;
    let vx = Math.cos(angleRad) * v0;
    let vy = -Math.sin(angleRad) * v0;
    const tip = tank.getBarrelWorldTip?.() || { x: tank.x, y: tank.y - 15 };
    let x = tip.x;
    let y = tip.y;
    // Before homing, we reduce wind effect in flight; mirror that here for feel consistency
    const windAccel = (game.windOverride ?? game.wind) * game.windEffect * 0.6;
    const g = game.gravityOverride ?? game.gravity;
    let apex = null;
    const steps = 140;
    for (let i = 0; i < steps; i++) {
      vx += windAccel;
      vy += g;
      x += vx;
      y += vy;
      // draw path dot
      ctx.fillStyle = 'rgba(0,0,0,0.95)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(255,255,255,0.45)';
      ctx.shadowBlur = 2;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Apex when vertical velocity flips to downward (vy >= 0 after integrating g)
      if (vy >= 0) {
        apex = { x, y };
        break;
      }
      // Safety: don't draw off-screen too far
      if (x < -50 || x > game.width + 50 || y < -50) break;
    }
    // Mark apex subtly
    if (apex) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,220,0,0.9)';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(apex.x, apex.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Optional: draw a faint dashed estimated homing segment toward nearest target
      try {
        const target = game.getNearestEnemyTank(tank);
        if (target) {
          let hx = apex.x,
            hy = apex.y;
          let hvx = vx,
            hvy = vy; // carry velocity at apex
          const desiredSpeed = 8.0,
            steer = 0.14,
            maxSp = 9;
          const windPost = (game.windOverride ?? game.wind) * game.windEffect * 0.35;
          const gg = game.gravityOverride ?? game.gravity;
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = '#00cfff';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          const steps2 = 110;
          for (let j = 0; j < steps2; j++) {
            // steer toward target
            const dx = target.x - hx;
            const dy = target.y - 10 - hy;
            const dist = Math.hypot(dx, dy) || 1;
            const dvx = (dx / dist) * desiredSpeed;
            const dvy = (dy / dist) * desiredSpeed;
            hvx = hvx * (1 - steer) + dvx * steer;
            hvy = hvy * (1 - steer) + dvy * steer;
            const sp = Math.hypot(hvx, hvy);
            if (sp > maxSp) {
              const s = maxSp / sp;
              hvx *= s;
              hvy *= s;
            }
            // ground avoidance like runtime
            const gndNow = game.terrain.getHeight(hx);
            if (hy >= gndNow - 12) {
              hvy -= 0.6;
              hvx *= 0.97;
            }
            // integrate wind+gravity
            hvx += windPost;
            hvy += gg;
            hx += hvx;
            hy += hvy;
            ctx.lineTo(hx, hy);
            // stop at ground
            const gnd = game.terrain.getHeight(hx);
            if (hy >= gnd - 1) break;
            if (hx < -60 || hx > game.width + 60 || hy < -60 || hy > game.height + 60) break;
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      } catch {}
    }
    ctx.restore();
    return;
  }

  // If using laser, render straight beam preview instead of ballistic dots
  if (tank.weapon === 'laser') {
    const tip = tank.getBarrelWorldTip?.() || { x: tank.x, y: tank.y - 15 };
    const dirX = Math.cos(angleRad);
    const dirY = -Math.sin(angleRad);
    let bx = tip.x;
    let by = tip.y;
    const stepLen = 6;
    const maxLen = 2000;
    const maxSteps = Math.ceil(maxLen / stepLen);
    let impact = null;
    for (let i = 0; i < maxSteps; i++) {
      bx += dirX * stepLen;
      by += dirY * stepLen;
      // terrain collision
      const ground = game.terrain.getHeight(
        Math.max(0, Math.min(Math.floor(bx), game.width - 1))
      );
      if (by >= ground - 1) {
        impact = { x: bx, y: Math.max(by, ground) };
        break;
      }
      // tank collision check (skip self)
      for (const t of game.tanks) {
        if (!t || t === tank || t.health <= 0) continue;
        const dx = bx - t.x;
        const dy = by - (t.y - 10);
        const d = Math.hypot(dx, dy);
        if (d <= 12) {
          impact = { x: bx, y: by, hitTank: t };
          break;
        }
      }
      if (impact) break;
    }
    if (!impact) impact = { x: tip.x + dirX * 600, y: tip.y + dirY * 600 };
    // Draw beam: outer glow + inner core
    ctx.save();
    ctx.globalAlpha = 0.95;
    const g = ctx.createLinearGradient(tip.x, tip.y, impact.x, impact.y);
    g.addColorStop(0, 'rgba(160,255,255,0.95)');
    g.addColorStop(0.6, 'rgba(0,245,255,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(impact.x, impact.y);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(impact.x, impact.y);
    ctx.stroke();
    // Impact marker
    ctx.fillStyle = impact.hitTank ? 'rgba(255,0,0,0.95)' : 'rgba(255,120,0,0.95)';
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }
  const baseVelocity = (tank.power / 100) * 20 + 10;
  const v0 = baseVelocity * game.velocityMultiplier;
  let vx = Math.cos(angleRad) * v0;
  let vy = -Math.sin(angleRad) * v0;
  const windAccel = (game.windOverride ?? game.wind) * game.windEffect;
  const g = game.gravityOverride ?? game.gravity;
  const tip = tank.getBarrelWorldTip?.() || { x: tank.x, y: tank.y - 15 };
  let x = tip.x;
  let y = tip.y;

  // Check if ocean mode for underwater physics
  const isOceanMode = game.terrain._isOceanTerrain;
  const waterSurfaceY = game.terrain.waterSurfaceY;
  const isTorpedo = tank.weapon === 'torpedo' || tank.weapon === 'homing_torpedo';

  const steps = 90;
  for (let i = 0; i < steps; i++) {
    // Check if projectile is underwater
    const isUnderwater = isOceanMode && waterSurfaceY != null && y > waterSurfaceY;

    if (isUnderwater) {
      // Apply underwater physics
      const waterDrag = isTorpedo ? 0.985 : 0.92;
      vx *= waterDrag;
      vy *= waterDrag;

      // Reduced wind effect underwater
      vx += windAccel * 0.3;

      // Reduced gravity underwater
      let effectiveGravity = g;
      if (isTorpedo) {
        effectiveGravity *= 0.05; // Almost no gravity on torpedoes
      } else {
        effectiveGravity *= 0.5; // Default underwater buoyancy
      }
      vy += effectiveGravity;
    } else {
      // Normal air physics
      vx += windAccel;
      vy += g;
    }

    x += vx;
    y += vy;
    // stop if would hit terrain
    const ground = game.terrain.getHeight(x);
    const onGround = y >= ground - 1;

    // Visual distinction for underwater vs air vs impact
    let size = 2.2;
    let fillColor = 'rgba(0,0,0,0.95)';
    let strokeColor = 'rgba(255,255,255,0.9)';

    if (onGround) {
      // Impact point - red
      size = 2.8;
      fillColor = 'rgba(255,0,0,0.95)';
      strokeColor = 'rgba(0,0,0,0.95)';
    } else if (isUnderwater) {
      // Underwater trajectory - cyan/blue tint
      fillColor = 'rgba(0,180,255,0.85)';
      strokeColor = 'rgba(255,255,255,0.7)';
      size = 2.0;
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    // subtle shadow to stand out on mixed backgrounds
    ctx.shadowColor = onGround ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (onGround) break;
  }
  ctx.restore();
  // If a stored tracer preview exists for this shooter, overlay it faintly
  try {
    const pv = game.tracerPreview;
    if (pv && pv.owner === tank && Array.isArray(pv.points) && pv.points.length) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#00b3ff';
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      for (const p of pv.points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  } catch {}
}
