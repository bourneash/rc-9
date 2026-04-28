import { validatePlayerName, validateColor, validateNumber, validateEnum, validateBoolean } from './validation.js';

/**
 * Submarine - underwater vehicle with 2D movement (up/down/left/right)
 */
export class Submarine {
    constructor(x, y, color, name, isAI = false, aiSkill = 'medium') {
        // Validate and sanitize all inputs
        this.x = validateNumber(x, 0, 10000, 0);
        this.y = validateNumber(y, 0, 10000, 0);
        this.color = validateColor(color, '#00ff00');
        this.name = validatePlayerName(name, 'Player');
        this.isAI = validateBoolean(isAI, false);
        this.aiSkill = validateEnum(aiSkill, ['easy', 'medium', 'hard'], 'medium');

        this.type = 'submarine';
        this.health = 100;
        this.maxHealth = 100;
        this.fuel = 500; // Extra fuel for 2D movement and rotation
        this.maxFuel = 500;
        this.width = 32;
        this.height = 12;
        this.turretAngle = 0;
        this.rotation = 0; // Submarine hull rotation (0-359 degrees)

        // Sticky controls per submarine
        this.angle = 45;
        this.power = 50;
        this.weapon = 'torpedo';
        this.ammo = {};
        this.unlimitedAmmo = false;

        // 2D movement capabilities
        this.canMoveVertical = true;
        this.verticalSpeed = 2;
        this.depthMin = null; // Set by game based on water surface
        this.depthMax = null; // Set by game based on ocean floor
    }

    rotate(direction) {
        // direction: 1 for clockwise, -1 for counter-clockwise
        if (this.fuel <= 0 && this.maxFuel < 999999) return false;

        this.rotation = (this.rotation + direction * 5 + 360) % 360;

        if (this.maxFuel < 999999) {
            this.fuel = Math.max(0, this.fuel - 0.5);
        }
        return true;
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
        if (this.fuel <= 0 && this.maxFuel < 999999) return false;

        const moveSpeed = 2;
        const newX = this.x + (direction * moveSpeed);

        if (newX < 20 || newX > terrain.width - 20) {
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

        return true;
    }

    // Vertical movement for submarines
    moveVertical(direction, terrain) {
        if (!this.canMoveVertical) return false;
        if (this.fuel <= 0 && this.maxFuel < 999999) return false;

        const newY = this.y + (direction * this.verticalSpeed);

        // Check depth limits
        const waterSurface = terrain.waterSurfaceY || 0;
        const floorY = terrain.getHeight(this.x);

        if (newY < waterSurface + 15 || newY > floorY - 15) {
            return false;
        }

        this.y = newY;

        // Consume fuel for vertical movement
        if (this.maxFuel < 999999) {
            this.fuel = Math.max(0, this.fuel - 1);
        }

        return true;
    }

    update(terrain) {
        // Submarines don't auto-settle on terrain like tanks
        // They maintain their depth unless moved
    }

    render(ctx) {
        if (this.health <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Apply submarine rotation
        if (typeof this.rotation === 'number') {
            ctx.rotate((this.rotation * Math.PI) / 180);
        }

        // Draw submarine body
        const gradient = ctx.createLinearGradient(-this.width / 2, -this.height, this.width / 2, 0);
        gradient.addColorStop(0, this.adjustBrightness(this.color, 40));
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, this.adjustBrightness(this.color, -40));
        ctx.fillStyle = gradient;

        // Main hull (elongated ellipse)
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Conning tower
        ctx.fillStyle = this.adjustBrightness(this.color, -20);
        ctx.fillRect(-6, -this.height / 2 - 4, 12, 6);

        // Periscope
        ctx.strokeStyle = this.adjustBrightness(this.color, -40);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, -this.height / 2 - 4);
        ctx.lineTo(2, -this.height / 2 - 10);
        ctx.stroke();

        // Torpedo tubes (dark circles on sides)
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-this.width / 3, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-this.width / 3, 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Propeller indicator
        ctx.fillStyle = this.adjustBrightness(this.color, -30);
        ctx.fillRect(this.width / 2 - 4, -2, 4, 4);

        // Health bar
        const healthBarWidth = 30;
        const healthBarHeight = 4;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-healthBarWidth / 2, -this.height - 14, healthBarWidth, healthBarHeight);

        let healthColor = '#f00';
        if (this.health > 50) healthColor = '#0f0';
        else if (this.health > 25) healthColor = '#ff0';

        ctx.fillStyle = healthColor;
        ctx.fillRect(-healthBarWidth / 2, -this.height - 14, healthBarWidth * healthPercentage, healthBarHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-healthBarWidth / 2, -this.height - 14, healthBarWidth, healthBarHeight);

        // Name tag (respect streamer/disable-names mode)
        const game = globalThis.__SE_GAME__;
        let canShowName = true;
        if (game && game.hideOtherNames) {
            // Show only for the current human tank when hiding others
            const current = game.getCurrentTank ? game.getCurrentTank() : null;
            const isCurrentHuman = !!current && current === this && !this.isAI;
            canShowName = isCurrentHuman;
        }
        if (canShowName) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px "Segoe UI"';
            ctx.textAlign = 'center';
            // Performance: removed shadow - use outline instead
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(this.name, 0, -this.height - 18);
            ctx.fillText(this.name, 0, -this.height - 18);
        }

        ctx.restore();

        // Bubble trail when moving
        if (Math.random() < 0.1) {
            this.createBubble?.();
        }
    }

    getBarrelWorldTip() {
        // Torpedoes launch from front of submarine, accounting for rotation
        const rotRad = ((this.rotation || 0) * Math.PI) / 180;
        const frontX = -this.width / 2; // Front of submarine in local coords
        const frontY = 0;
        // Rotate the front point
        const rotatedX = frontX * Math.cos(rotRad) - frontY * Math.sin(rotRad);
        const rotatedY = frontX * Math.sin(rotRad) + frontY * Math.cos(rotRad);
        return {
            x: this.x + rotatedX,
            y: this.y + rotatedY
        };
    }

    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, Number.parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, Number.parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, Number.parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}

/**
 * Surface Ship - moves only left/right on water surface
 */
export class SurfaceShip {
    constructor(x, y, color, name, isAI = false, aiSkill = 'medium') {
        this.x = validateNumber(x, 0, 10000, 0);
        this.y = validateNumber(y, 0, 10000, 0);
        this.color = validateColor(color, '#00ff00');
        this.name = validatePlayerName(name, 'Player');
        this.isAI = validateBoolean(isAI, false);
        this.aiSkill = validateEnum(aiSkill, ['easy', 'medium', 'hard'], 'medium');

        this.type = 'ship';
        this.health = 120; // More health than submarine
        this.maxHealth = 120;
        this.fuel = 400; // More fuel than submarine
        this.maxFuel = 400;
        this.width = 40;
        this.height = 20;

        this.angle = 45;
        this.power = 50;
        this.weapon = 'depth_charge';
        this.ammo = {};
        this.unlimitedAmmo = false;

        this.canMoveVertical = false; // Ships stay on surface
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
        if (this._shield && (this._shield.factor ?? null) != null && (this._shield.turnsLeft ?? 0) > 0) {
            const f = Math.max(0, Math.min(1, Number(this._shield.factor)));
            dmg *= f;
        }
        this.health = Math.max(0, this.health - dmg);
    }

    move(direction, terrain, maxDistance = 50) {
        if (this.fuel <= 0 && this.maxFuel < 999999) return false;

        const moveSpeed = 2;
        const newX = this.x + (direction * moveSpeed);

        if (newX < 20 || newX > terrain.width - 20) {
            return false;
        }

        const distance = Math.abs(newX - this.x);
        if (distance > maxDistance) {
            return false;
        }

        this.x = newX;

        if (this.maxFuel < 999999) {
            this.fuel = Math.max(0, this.fuel - 1.5); // Ships use less fuel
        }

        this.update(terrain);
        return true;
    }

    update(terrain) {
        // Ships stay on water surface
        if (terrain.waterSurfaceY != null) {
            this.y = terrain.waterSurfaceY + 2;
        }
    }

    render(ctx) {
        if (this.health <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Ship hull
        const gradient = ctx.createLinearGradient(-this.width / 2, -this.height, this.width / 2, 0);
        gradient.addColorStop(0, this.adjustBrightness(this.color, 40));
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, this.adjustBrightness(this.color, -40));
        ctx.fillStyle = gradient;

        // Hull shape (trapezoid)
        ctx.beginPath();
        ctx.moveTo(-this.width / 2 + 5, 0);
        ctx.lineTo(-this.width / 2 + 2, -this.height / 2);
        ctx.lineTo(this.width / 2 - 2, -this.height / 2);
        ctx.lineTo(this.width / 2 - 5, 0);
        ctx.closePath();
        ctx.fill();

        // Deck structures
        ctx.fillStyle = this.adjustBrightness(this.color, -20);
        ctx.fillRect(-10, -this.height / 2 - 6, 20, 8);
        ctx.fillRect(5, -this.height / 2 - 10, 8, 6);

        // Radar/antenna
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(9, -this.height / 2 - 10);
        ctx.lineTo(9, -this.height / 2 - 16);
        ctx.stroke();

        // Gun turret
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-5, -this.height / 2 - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const healthBarWidth = 35;
        const healthBarHeight = 4;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-healthBarWidth / 2, -this.height - 22, healthBarWidth, healthBarHeight);

        let healthColor = '#f00';
        if (this.health > 60) healthColor = '#0f0';
        else if (this.health > 30) healthColor = '#ff0';

        ctx.fillStyle = healthColor;
        ctx.fillRect(-healthBarWidth / 2, -this.height - 22, healthBarWidth * healthPercentage, healthBarHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-healthBarWidth / 2, -this.height - 22, healthBarWidth, healthBarHeight);

        // Name tag (respect streamer/disable-names mode)
        const game2 = globalThis.__SE_GAME__;
        let show2 = true;
        if (game2 && game2.hideOtherNames) {
            const current = game2.getCurrentTank ? game2.getCurrentTank() : null;
            const isCurrentHuman = !!current && current === this && !this.isAI;
            show2 = isCurrentHuman;
        }
        if (show2) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px "Segoe UI"';
            ctx.textAlign = 'center';
            // Performance: removed shadow - use outline instead
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(this.name, 0, -this.height - 18);
            ctx.fillText(this.name, 0, -this.height - 18);
        }

        ctx.restore();
    }

    getBarrelWorldTip() {
        return { x: this.x, y: this.y - this.height / 2 };
    }

    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, Number.parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, Number.parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, Number.parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}

/**
 * Underwater Base - stationary structure with repair and refueling abilities
 */
export class UnderwaterBase {
    constructor(x, y, color, name) {
        this.x = validateNumber(x, 0, 10000, 0);
        this.y = validateNumber(y, 0, 10000, 0);
        this.color = validateColor(color, '#00ff00');
        this.name = validatePlayerName(name, 'Base');
        this.isAI = false;

        this.type = 'base';
        this.health = 200; // Much more health
        this.maxHealth = 200;
        this.fuel = 0; // Bases don't move
        this.maxFuel = 0;
        this.width = 50;
        this.height = 30;

        this.angle = 45;
        this.power = 50;
        this.weapon = 'torpedo';
        this.ammo = {};
        this.unlimitedAmmo = false;

        this.canMoveVertical = false;
        this.canRepair = true;
        this.repairRate = 2; // HP per turn for nearby allies
        this.repairRadius = 80;
        this.refuelRate = 10; // Fuel per turn for nearby allies
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
        if (this._shield && (this._shield.factor ?? null) != null && (this._shield.turnsLeft ?? 0) > 0) {
            const f = Math.max(0, Math.min(1, Number(this._shield.factor)));
            dmg *= f;
        }
        this.health = Math.max(0, this.health - dmg);
    }

    move() {
        // Bases cannot move
        return false;
    }

    update(terrain) {
        // Bases are stationary
    }

    render(ctx) {
        if (this.health <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Base structure (hexagonal dome)
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
        gradient.addColorStop(0, this.adjustBrightness(this.color, 60));
        gradient.addColorStop(0.6, this.color);
        gradient.addColorStop(1, this.adjustBrightness(this.color, -40));
        ctx.fillStyle = gradient;

        // Dome
        ctx.beginPath();
        const sides = 6;
        for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * this.width / 2;
            const y = Math.sin(angle) * this.height / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.fill();

        // Windows/viewports
        ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI + Math.PI / 6;
            const x = Math.cos(angle) * this.width / 3;
            const y = Math.sin(angle) * this.height / 3;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Antenna array
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 8, -this.height / 2);
            ctx.lineTo(i * 8, -this.height / 2 - 10);
            ctx.stroke();
        }

        // Repair field indicator (pulsing aura when active)
        if (this.canRepair) {
            const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(100, 255, 100, ${pulse * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.repairRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Health bar
        const healthBarWidth = 40;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-healthBarWidth / 2, -this.height - 22, healthBarWidth, healthBarHeight);

        let healthColor = '#f00';
        if (this.health > 100) healthColor = '#0f0';
        else if (this.health > 50) healthColor = '#ff0';

        ctx.fillStyle = healthColor;
        ctx.fillRect(-healthBarWidth / 2, -this.height - 22, healthBarWidth * healthPercentage, healthBarHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-healthBarWidth / 2, -this.height - 22, healthBarWidth, healthBarHeight);

        // Name tag (respect streamer/disable-names mode)
        const game3 = globalThis.__SE_GAME__;
        let show3 = true;
        if (game3 && game3.hideOtherNames) {
            const current = game3.getCurrentTank ? game3.getCurrentTank() : null;
            const isCurrentHuman = !!current && current === this && !this.isAI;
            show3 = isCurrentHuman;
        }
        if (show3) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px "Segoe UI"';
            ctx.textAlign = 'center';
            // Performance: removed shadow - use outline instead
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeText(this.name, 0, -this.height - 26);
            ctx.fillText(this.name, 0, -this.height - 26);
        }

        ctx.restore();
    }

    getBarrelWorldTip() {
        return { x: this.x, y: this.y - this.height / 2 };
    }

    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, Number.parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, Number.parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, Number.parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
