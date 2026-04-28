export class Projectile {
    constructor(x, y, vx, vy, type = 'missile', weaponConfig = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        // Optional alternate visual skin for the projectile (e.g., 'bomb')
        this.skin = null;
        this.trail = [];
        this.maxTrailLength = 20;

        this.isMirvlet = false;
        this.isFunkylet = false;

        this.framesAlive = 0;
        this.minFramesBeforeCollision = 3;

        this.setupWeaponProperties(weaponConfig);
    }
    
    setupWeaponProperties(weaponConfig = null) {
        // Default weapon stats (fallback if config not provided)
        const weaponStats = {
            'missile': {
                radius: 40,
                damage: 30, // Matches config.json
                color: '#ff6600',
                size: 4
            },
            'emp': {
                radius: 70,
                damage: 0,
                color: '#00e5ff',
                size: 5
            },
            'homing': {
                radius: 40,
                damage: 32,
                color: '#66aaff',
                size: 4,
                gravityFactor: 0.25
            },
            'acid': {
                radius: 20,
                damage: 5,
                color: '#66ff66',
                size: 4
            },
            'napalm': {
                radius: 28,
                damage: 8,
                color: '#ff6b2d',
                size: 5
            },
            'toxic_gas': {
                radius: 25,
                damage: 5,
                color: '#88ff44',
                size: 5
            },
            'heavy': {
                radius: 60,
                damage: 50,
                color: '#ff0000',
                size: 6
            },
            'nuke': {
                radius: 120,
                damage: 80,
                color: '#00ff00',
                size: 8
            },
            'laser': {
                radius: 35,
                damage: 40,
                color: '#00f5ff',
                size: 3,
                gravityFactor: 0
            },
            'cluster': {
                radius: 25,
                damage: 10,
                color: '#ffaa00',
                size: 5
            },
            'bomblet': {
                radius: 30,
                damage: 20,
                color: '#ffcc33',
                size: 4
            },
            'bunker': {
                radius: 70,
                damage: 60,
                color: '#ff5522',
                size: 5,
                drillRadius: 6,
                gravityFactor: 1
            },
            'mirv': {
                radius: 50,
                damage: 35,
                color: '#ffff00',
                size: 5
            },
            'funky': {
                radius: 45,
                damage: 25,
                color: '#ff00ff',
                size: 5
            },
            'drill': {
                radius: 15,
                damage: 0,
                color: '#00ffff',
                size: 3,
                drillRadius: 8
            },
            'marker_attack': {
                radius: 0,
                damage: 0,
                color: '#cccccc',
                size: 3
            },
            'marker_medic': {
                radius: 0,
                damage: 0,
                color: '#99ff99',
                size: 3
            },
            'marker_airstrike': {
                radius: 0,
                damage: 0,
                color: '#ffcc66',
                size: 3
            },
            'marker_airnukes': {
                radius: 0,
                damage: 0,
                color: '#cf88ff',
                size: 3
            },
            'icbm': {
                radius: 45,
                damage: 35,
                color: '#ff8844',
                size: 4
            },
            'flare': {
                radius: 0,
                damage: 0,
                color: '#ffd966',
                size: 3,
                gravityFactor: 1
            }
            ,
            'parachute_flare': {
                radius: 0,
                damage: 0,
                color: '#ffe08a',
                size: 3,
                gravityFactor: 1
            },
            'supply_crate': {
                radius: 0,
                damage: 0,
                color: '#a36b2b',
                size: 5,
                gravityFactor: 1
            },
            'smoke_bomb': {
                radius: 0,
                damage: 0,
                color: '#b0b0b0',
                size: 4,
                gravityFactor: 1
            },
            'tracer': {
                radius: 0,
                damage: 0,
                color: '#a0d8ff',
                size: 3,
                gravityFactor: 1
            },
            'bouncing_bomb': {
                radius: 45,
                damage: 28,
                color: '#ffd24d',
                size: 5,
                gravityFactor: 1,
                restitution: 0.6,
                friction: 0.88,
                bounces: 3
            },
            'torpedo': {
                radius: 35,
                damage: 40,
                color: '#4db8ff',
                size: 5,
                gravityFactor: 0.2, // Less affected by gravity underwater
                waterWeapon: true
            },
            'depth_charge': {
                radius: 50,
                damage: 45,
                color: '#ff9933',
                size: 6,
                gravityFactor: 1.2, // Sinks faster
                waterWeapon: true
            },
            'underwater_mine': {
                radius: 40,
                damage: 50,
                color: '#666666',
                size: 5,
                gravityFactor: 0.1, // Floats slowly
                waterWeapon: true
            },
            'homing_torpedo': {
                radius: 38,
                damage: 42,
                color: '#ffaa00',
                size: 5,
                gravityFactor: 0.15, // Less affected by gravity
                waterWeapon: true,
                homing: true
            },
            'navy_seal': {
                radius: 25,
                damage: 60,
                color: '#003366',
                size: 4,
                gravityFactor: 0.3,
                waterWeapon: true,
                proximityWeapon: true
            },
            'sonar_pulse': {
                radius: 60,
                damage: 15,
                color: '#00ffcc',
                size: 3,
                gravityFactor: 0,
                waterWeapon: true
            }
        };

        // Merge config with defaults (config takes precedence)
        let stats = weaponStats[this.type] || weaponStats['missile'];
        if (weaponConfig && weaponConfig[this.type]) {
            stats = { ...stats, ...weaponConfig[this.type] };
        }

        this.explosionRadius = stats.radius;
        this.damage = stats.damage;
        this.color = stats.color;
        this.size = stats.size;
        this.drillRadius = stats.drillRadius || 0;
        this.isDrill = this.type === 'drill';
        this.gravityFactor = (stats.gravityFactor === 0) ? 0 : 1;
        this.isBunker = this.type === 'bunker';
        this.bunkerPenetrating = false;
        this.bunkerFrames = 0;
        // Bouncing bomb custom properties
        if (this.type === 'bouncing_bomb') {
            this._restitution = weaponStats['bouncing_bomb'].restitution;
            this._friction = weaponStats['bouncing_bomb'].friction;
            this._bouncesLeft = weaponStats['bouncing_bomb'].bounces;
        }
    }
    
    update(wind, gravity, windEffect = 0.015, terrain = null, targets = null) {
        this.framesAlive++;

        this.trail.push({ x: this.x, y: this.y });
        const maxTrail = (this.type === 'napalm') ? 10 : this.maxTrailLength;
        if (this.trail.length > maxTrail) {
            this.trail.shift();
        }

        // Check if underwater (ocean mode)
        let isUnderwater = false;
        if (terrain && terrain._isOceanTerrain && terrain.waterSurfaceY != null) {
            isUnderwater = this.y > terrain.waterSurfaceY;
        }

        // Homing behavior for homing_torpedo
        if (this.type === 'homing_torpedo' && targets && this.framesAlive > 10) {
            // Find nearest enemy target
            let nearestTarget = null;
            let nearestDist = Infinity;
            for (const t of targets) {
                if (t.health <= 0) continue;
                const dx = t.x - this.x;
                const dy = t.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist && dist < 400) { // Only track within 400 pixels
                    nearestDist = dist;
                    nearestTarget = t;
                }
            }

            if (nearestTarget) {
                // Steer toward target
                const dx = nearestTarget.x - this.x;
                const dy = nearestTarget.y - this.y;
                const targetAngle = Math.atan2(dy, dx);
                const currentAngle = Math.atan2(this.vy, this.vx);
                let angleDiff = targetAngle - currentAngle;
                // Normalize angle difference to -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                // Turn rate
                const maxTurn = 0.08; // radians per frame
                const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                const newAngle = currentAngle + turn;
                this.vx = Math.cos(newAngle) * speed;
                this.vy = Math.sin(newAngle) * speed;
            }
        }

        // Apply water resistance when underwater
        if (isUnderwater) {
            // Different drag for torpedoes vs other projectiles
            const isTorpedo = this.type === 'torpedo' || this.type === 'homing_torpedo';
            const waterDrag = isTorpedo ? 0.985 : 0.92; // Torpedoes have less drag (1.5% vs 8%)

            this.vx *= waterDrag;
            this.vy *= waterDrag;

            // Reduced wind effect underwater
            this.vx += wind * windEffect * 0.3;

            // Torpedoes are nearly neutrally buoyant, other weapons sink/float
            let effectiveGravity = gravity * this.gravityFactor;
            if (isTorpedo) {
                effectiveGravity *= 0.05; // Almost no gravity effect on torpedoes
            } else if (this.type === 'underwater_mine') {
                effectiveGravity *= 0.3; // Mines are buoyant
            } else if (this.type === 'depth_charge') {
                effectiveGravity *= 1.5; // Depth charges sink faster
            } else {
                effectiveGravity *= 0.5; // Default underwater buoyancy
            }
            this.vy += effectiveGravity;
        } else {
            // Normal air physics
            this.vx += wind * windEffect;
            this.vy += gravity * this.gravityFactor;
        }

        this.x += this.vx;
        this.y += this.vy;
    }
    
    canCollide() {
        return this.framesAlive >= this.minFramesBeforeCollision;
    }
    
    render(ctx) {
        // Specialized trail rendering
        if (this.type === 'napalm') {
            // Flame streak: short, hot core with orange/yellow gradient
            const len = 18;
            const angle = Math.atan2(this.vy, this.vx);
            const x2 = this.x - Math.cos(angle) * len;
            const y2 = this.y - Math.sin(angle) * len;
            const grad = ctx.createLinearGradient(this.x, this.y, x2, y2);
            grad.addColorStop(0, 'rgba(255,230,160,0.95)');
            grad.addColorStop(0.4, 'rgba(255,160,60,0.8)');
            grad.addColorStop(1, 'rgba(255,100,30,0)');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = grad;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.restore();
            // Small droplet pips along recent trail points to imply liquid splatter
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < this.trail.length; i++) {
                const point = this.trail[i];
                const a = i / this.trail.length;
                ctx.fillStyle = `rgba(255,160,60,${0.35 * a})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, Math.max(1, this.size * 0.4 * a), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } else {
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < this.trail.length; i++) {
                const point = this.trail[i];
                const alpha = i / this.trail.length;
                ctx.globalAlpha = alpha * 0.5;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
    if (this.type === 'laser') {
            // Draw a short glowing beam segment
            const len = 18;
            const angle = Math.atan2(this.vy, this.vx);
            const x2 = this.x - Math.cos(angle) * len;
            const y2 = this.y - Math.sin(angle) * len;
            const grad = ctx.createLinearGradient(this.x, this.y, x2, y2);
            grad.addColorStop(0, '#a0ffff');
            grad.addColorStop(1, 'rgba(0, 245, 255, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#fff';
        } else if (this.skin === 'bomb') {
                // Stylized bomb sprite (for airdropped nukes): small body with fins, oriented to velocity
                const angle = Math.atan2(this.vy, this.vx);
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(angle);
                // Subtle halo for contrast
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.beginPath();
                ctx.ellipse(0, 0, Math.max(2, this.size + 2), Math.max(2, this.size + 1.4), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                // Body
                const bodyLen = Math.max(10, this.size * 3);
                const bodyRad = Math.max(3, this.size * 0.9);
                const noseRad = Math.max(2.4, this.size * 0.8);
                // Cylinder body
                const grad = ctx.createLinearGradient(-bodyLen * 0.2, -bodyRad, bodyLen * 0.6, bodyRad);
                grad.addColorStop(0, '#4b4e52');
                grad.addColorStop(0.5, '#6b7076');
                grad.addColorStop(1, '#3d4145');
                ctx.fillStyle = grad;
                if (typeof ctx.roundRect === 'function') {
                    ctx.beginPath();
                    ctx.roundRect(-bodyLen * 0.2, -bodyRad, bodyLen * 0.6, bodyRad * 2, bodyRad * 0.6);
                    ctx.fill();
                } else {
                    // Fallback simple rectangle body if roundRect is unavailable
                    ctx.beginPath();
                    ctx.rect(-bodyLen * 0.2, -bodyRad, bodyLen * 0.6, bodyRad * 2);
                    ctx.fill();
                }
                // Nose cone (slight green tint for nukes)
                ctx.fillStyle = (this.type === 'nuke') ? '#5aff5a' : '#c0c0c0';
                ctx.beginPath();
                ctx.ellipse(bodyLen * 0.4, 0, noseRad, noseRad * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();
                // Tail fins
                ctx.fillStyle = '#2f3336';
                ctx.beginPath();
                ctx.moveTo(-bodyLen * 0.25, -bodyRad);
                ctx.lineTo(-bodyLen * 0.5, -bodyRad * 1.5);
                ctx.lineTo(-bodyLen * 0.15, -bodyRad * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-bodyLen * 0.25, bodyRad);
                ctx.lineTo(-bodyLen * 0.5, bodyRad * 1.5);
                ctx.lineTo(-bodyLen * 0.15, bodyRad * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
    } else if (this.type !== 'napalm') {
                // Draw a subtle dark halo for contrast on light backgrounds
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, Math.max(1, this.size + 2.2), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Core projectile
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Soft light stroke for separation (use semi-transparent dark/white depending on background)
                ctx.strokeStyle = 'rgba(255,255,255,0.85)';
                ctx.lineWidth = 0.9;
                ctx.stroke();
            }
        
        if (this.type === 'nuke' && this.skin !== 'bomb') {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
