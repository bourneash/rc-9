import { validatePlayerName, validateColor, validateNumber, validateEnum, validateBoolean } from './validation.js';

export class Tank {
    constructor(x, y, color, name, isAI = false, aiSkill = 'medium', tankConfig = null) {
        // Validate and sanitize all inputs to prevent XSS and invalid data
        this.x = validateNumber(x, 0, 10000, 0);
        this.y = validateNumber(y, 0, 10000, 0);
        this.color = validateColor(color, '#00ff00');
        this.name = validatePlayerName(name, 'Player');
        this.isAI = validateBoolean(isAI, false);
        this.aiSkill = validateEnum(aiSkill, ['easy', 'medium', 'hard'], 'medium');

        // Load tank stats from config or use defaults
        const maxHealth = tankConfig?.maxHealth ?? 100;
        const fuelCapacity = tankConfig?.fuelCapacity ?? 200;

        this.health = maxHealth;
        this.maxHealth = maxHealth;
        this.fuel = fuelCapacity;
        this.maxFuel = fuelCapacity;
        this.width = 24;
        this.height = 12;
        this.turretAngle = 0;

        // Sticky controls per tank
        this.angle = 45; // 0..360 supported
        this.power = 50;
        this.weapon = 'missile';
        // Ammo inventory by weapon key; null/undefined means not yet initialized
        this.ammo = {};
        this.unlimitedAmmo = false; // when true, ammo not consumed and HUD shows ∞
        // Base rotation (degrees) to align with terrain
        this.baseRotation = 0; // degrees; positive = clockwise (down to right)
    }

    getAmmo(weapon) {
        if (this.unlimitedAmmo) return Infinity;
        const v = this.ammo?.[weapon];
        return (v == null) ? 0 : v;
    }

    consumeAmmo(weapon) {
        if (this.unlimitedAmmo) return true;
        if (!this.ammo) this.ammo = {};
        const v = this.ammo[weapon] ?? 0;
        if (v <= 0) return false;
        this.ammo[weapon] = v - 1;
        return true;
    }
    
    takeDamage(amount) {
        let dmg = Number(amount) || 0;
        // Apply shield reduction if active
        if (this._shield && (this._shield.factor ?? null) != null && (this._shield.turnsLeft ?? 0) > 0) {
            const f = Math.max(0, Math.min(1, Number(this._shield.factor)));
            dmg *= f;
        }
        this.health = Math.max(0, this.health - dmg);
    }
    
    move(direction, terrain, maxDistance = 50) {
        if (this.fuel <= 0 && this.maxFuel < 999999) return false; // Unlimited fuel check

        const moveSpeed = 2;
        const newX = this.x + (direction * moveSpeed);

        // Use terrain's canMoveTo method for boundary checking
        if (!terrain.canMoveTo(this.x, newX)) {
            return false;
        }

        const distance = Math.abs(newX - this.x);

        if (distance > maxDistance) {
            return false;
        }

        this.x = newX;

        // Don't consume fuel if unlimited
        if (this.maxFuel < 999999) {
            this.fuel = Math.max(0, this.fuel - 2);
        }

        this.update(terrain);

        return true;
    }
    
    update(terrain) {
        const groundHeight = terrain.getHeight(this.x);
        this.y = groundHeight;
        // Compute slope-aligned rotation, clamp to avoid extreme tilts
    const slopeRad = terrain.getSlopeAngle?.(this.x) || 0;
    const slopeDeg = slopeRad * 180 / Math.PI;
    const maxTilt = 20; // degrees
    const target = Math.max(-maxTilt, Math.min(maxTilt, slopeDeg));
    // Smooth to avoid jitter on noisy heightmap edges
    this.baseRotation = this.baseRotation + (target - this.baseRotation) * 0.3;
    }
    
    render(ctx) {
        if (this.health <= 0) return;
        
        ctx.save();
    ctx.translate(this.x, this.y);
    // Draw rotated body on a nested save scope so labels remain upright
    ctx.save();
    ctx.rotate(this.baseRotation * Math.PI / 180);
        
        // Draw ground shadow (already done in game.js, but kept for standalone)
        
        // Draw treads/wheels with metallic look
        const treadGradient = ctx.createLinearGradient(0, -4, 0, 1);
        treadGradient.addColorStop(0, '#2a2a2a');
        treadGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = treadGradient;
        ctx.fillRect(-this.width / 2 - 2, -4, this.width + 4, 5);
        
        // Draw wheels with metallic shine
        for (let i = -8; i <= 8; i += 8) {
            const wheelGrad = ctx.createRadialGradient(i, -2, 0, i, -2, 3);
            wheelGrad.addColorStop(0, '#555');
            wheelGrad.addColorStop(0.6, '#333');
            wheelGrad.addColorStop(1, '#111');
            ctx.fillStyle = wheelGrad;
            ctx.beginPath();
            ctx.arc(i, -2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw main body with visual variants based on this.style
        const style = this.style || 'classic';
        if (style === 'classic') {
            const gradient = ctx.createLinearGradient(-this.width / 2, -this.height, this.width / 2, 0);
            gradient.addColorStop(0, this.adjustBrightness(this.color, 40));
            gradient.addColorStop(0.5, this.color);
            gradient.addColorStop(1, this.adjustBrightness(this.color, -40));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, -4);
            ctx.lineTo(-this.width / 2, -this.height + 3);
            ctx.quadraticCurveTo(-this.width / 2, -this.height, -this.width / 2 + 3, -this.height);
            ctx.lineTo(this.width / 2 - 3, -this.height);
            ctx.quadraticCurveTo(this.width / 2, -this.height, this.width / 2, -this.height + 3);
            ctx.lineTo(this.width / 2, -4);
            ctx.closePath();
            ctx.fill();
        } else if (style === 'heavy') {
            // Bulkier, boxy body with rivets
            ctx.fillStyle = this.adjustBrightness(this.color, -10);
            const w = this.width + 6;
            const h = this.height + 4;
            ctx.fillRect(-w / 2, -h, w, h - 4);
            // Beveled top
            ctx.fillStyle = this.adjustBrightness(this.color, 20);
            ctx.beginPath();
            ctx.moveTo(-w / 2, -h);
            ctx.lineTo(w / 2, -h);
            ctx.lineTo(w / 2 - 4, -h - 4);
            ctx.lineTo(-w / 2 + 4, -h - 4);
            ctx.closePath();
            ctx.fill();
            // Rivets
            ctx.fillStyle = '#555';
            for (let rx = -w / 2 + 6; rx <= w / 2 - 6; rx += 12) {
                ctx.beginPath();
                ctx.arc(rx, -h + 6, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (style === 'sleek') {
            // Sleeker low-profile with curved top
            ctx.fillStyle = this.adjustBrightness(this.color, 10);
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, -6);
            ctx.quadraticCurveTo(0, -this.height - 2, this.width / 2, -6);
            ctx.lineTo(this.width / 2, -4);
            ctx.lineTo(-this.width / 2, -4);
            ctx.closePath();
            ctx.fill();
            // Subtle highlight stripe
            ctx.strokeStyle = this.adjustBrightness(this.color, 50);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-this.width / 2 + 4, -this.height + 1);
            ctx.lineTo(this.width / 2 - 4, -this.height + 1);
            ctx.stroke();
        }
        
        // Add metallic shine highlight
        ctx.strokeStyle = this.adjustBrightness(this.color, 80);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.width / 2 + 3, -this.height + 3);
        ctx.lineTo(this.width / 2 - 3, -this.height + 3);
        ctx.stroke();
        
        // Draw turret base with slight style variation
        if (style === 'heavy') {
            ctx.fillStyle = this.adjustBrightness(this.color, -20);
            ctx.fillRect(-5, -this.height + 4, 10, 6);
        } else if (style === 'sleek') {
            ctx.fillStyle = this.adjustBrightness(this.color, 20);
            ctx.beginPath();
            ctx.ellipse(0, -this.height + 2, 6, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const turretGrad = ctx.createRadialGradient(0, -this.height + 2, 0, 0, -this.height + 2, 7);
            turretGrad.addColorStop(0, this.adjustBrightness(this.color, 20));
            turretGrad.addColorStop(1, this.adjustBrightness(this.color, -40));
            ctx.fillStyle = turretGrad;
            ctx.beginPath();
            ctx.arc(0, -this.height + 2, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw turret barrel with angle and power
    // Barrel angle is relative to base rotation, but aiming UI uses world angle.
    // Interpret this.angle as world angle (CCW positive). Our baseRotation is CW-positive, and the
    // canvas has already been rotated by baseRotation CW. To express the barrel direction in the
    // rotated local frame, add the CW baseRotation to the CCW world angle.
    const localBarrelAngle = (this.angle + this.baseRotation);
    const angleRad = (localBarrelAngle * Math.PI) / 180;
        const barrelLength = 8 + (this.power / 100) * 12; // 8-20 pixels based on power
        const barrelEndX = Math.cos(angleRad) * barrelLength;
        const barrelEndY = -Math.sin(angleRad) * barrelLength;
        
    const barrelGrad = ctx.createLinearGradient(-2, -this.height, 2, -this.height);
        barrelGrad.addColorStop(0, '#333');
        barrelGrad.addColorStop(0.5, '#666');
        barrelGrad.addColorStop(1, '#333');
    ctx.strokeStyle = barrelGrad;
    let barrelWidth = 4;
    if (style === 'heavy') barrelWidth = 5;
    else if (style === 'sleek') barrelWidth = 3;
    ctx.lineWidth = barrelWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -this.height + 2);
        ctx.lineTo(barrelEndX, -this.height + 2 + barrelEndY);
        ctx.stroke();
        
    // Draw turret tip (performance optimized - no shadow)
        ctx.fillStyle = this.color;
        ctx.beginPath();
    let tipR = 2;
    if (style === 'heavy') tipR = 2.2;
    else if (style === 'sleek') tipR = 1.6;
    ctx.arc(barrelEndX, -this.height + 2 + barrelEndY, tipR, 0, Math.PI * 2);
        ctx.fill();
        
    // End rotated scope
    ctx.restore();

    // Modern health bar (upright)
        const healthBarWidth = 30;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;
        
        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-healthBarWidth / 2, -this.height - 16, healthBarWidth, healthBarHeight);
        
        // Health bar with gradient
        let healthColor = '#f00';
        let healthColor2 = '#a00';
        if (this.health > 50) {
            healthColor = '#0f0';
            healthColor2 = '#0a0';
        } else if (this.health > 25) {
            healthColor = '#ff0';
            healthColor2 = '#aa0';
        }
        
        const healthGrad = ctx.createLinearGradient(0, -this.height - 16, 0, -this.height - 11);
        healthGrad.addColorStop(0, healthColor);
        healthGrad.addColorStop(1, healthColor2);
        ctx.fillStyle = healthGrad;
        ctx.fillRect(-healthBarWidth / 2, -this.height - 16, healthBarWidth * healthPercentage, healthBarHeight);
        
        // Health bar border with glow
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        // Performance: removed shadow effect
        ctx.strokeRect(-healthBarWidth / 2, -this.height - 16, healthBarWidth, healthBarHeight);
        
    // Name tag with glow (upright) — respect streamer/disable-names mode
        let showName = true;
        try {
            const game = globalThis.__SE_GAME__;
            if (game?.hideOtherNames) {
                const current = game.getCurrentTank ? game.getCurrentTank() : null;
                const isCurrentHuman = !!current && current === this && !this.isAI;
                showName = isCurrentHuman;
            }
            // In dark mode, only show name for current player
            if (game?.themeName === 'dark') {
                const current = game.getCurrentTank ? game.getCurrentTank() : null;
                showName = current === this;
            }
        } catch {}
        if (showName) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px "Segoe UI"';
            ctx.textAlign = 'center';
            // Performance: removed shadow effect - use outline instead
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(this.name, 0, -this.height - 20);
            ctx.fillText(this.name, 0, -this.height - 20);
        }
        
        ctx.restore();
    }

    /**
     * Compute world coordinates of barrel tip for projectile spawning.
     */
    getBarrelWorldTip() {
        // Convert world (CCW) angle to local by adding CW baseRotation, matching render logic
        const localBarrelAngle = (this.angle + this.baseRotation) * Math.PI / 180;
        const barrelLength = 8 + (this.power / 100) * 12;
        const tipLocalX = Math.cos(localBarrelAngle) * barrelLength;
        const tipLocalY = -Math.sin(localBarrelAngle) * barrelLength - (this.height - 2);
        // Apply body rotation to local tip and translate to world
        const rot = this.baseRotation * Math.PI / 180;
        const rx = tipLocalX * Math.cos(rot) - tipLocalY * Math.sin(rot);
        const ry = tipLocalX * Math.sin(rot) + tipLocalY * Math.cos(rot);
        return { x: this.x + rx, y: this.y + ry };
    }
    
    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, Number.parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, Number.parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, Number.parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
