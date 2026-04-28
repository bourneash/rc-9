export class DebrisPiece {
    constructor({ x, y, vx, vy, angle = 0, omega = 0, type = 'shard', size = 8, color = '#ccc' }) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.angle = angle;
        this.omega = omega;
        this.type = type; // 'wheel' | 'shard' | 'turret' | 'barrel'
        this.size = size;
        this.color = color;
        this.life = 10000; // ms max safety lifetime
        this.settledFrames = 0;
    }
}

export class DebrisSystem {
    constructor(game) {
        this.game = game;
        this.pieces = [];
        this.enabled = true;
        this.amountMultiplier = 1; // 0..3 typically
        this.lifetimeMs = 10000; // default max lifetime for pieces
    }

    clear() {
        this.pieces = [];
    }

    createTankDebris(x, y, color, barrelAngleDeg = 45) {
        if (!this.enabled) return;
        const mult = Math.max(0, this.amountMultiplier);
        if (mult === 0) return;
        // Two wheels
        for (let i = 0; i < Math.round(2 * mult); i++) {
            const s = 6 + Math.random() * 1.5;
            const vx = (Math.random() * 2 - 1) * 2.5;
            const vy = -6 - Math.random() * 3;
            const omega = (Math.random() * 2 - 1) * 0.2;
            const piece = new DebrisPiece({ x, y: y - 8, vx, vy, omega, type: 'wheel', size: s, color });
            piece.life = this.lifetimeMs;
            this.pieces.push(piece);
        }

        // Turret cap (one chunk)
        {
            const s = 8 + Math.random() * 3;
            const vx = (Math.random() * 2 - 1) * 1.8;
            const vy = -5 - Math.random() * 2.5;
            const omega = (Math.random() * 2 - 1) * 0.2;
            const tint = color;
            const piece = new DebrisPiece({ x, y: y - 12, vx, vy, omega, type: 'turret', size: s, color: tint });
            piece.life = this.lifetimeMs;
            this.pieces.push(piece);
        }

        // Barrel (slender rectangle)
        {
            const len = 16 + Math.random() * 8; // length
            const vxBase = 2 + Math.random() * 2.5;
            const vyBase = -5 - Math.random() * 2.5;
            const angRad = (barrelAngleDeg * Math.PI) / 180;
            const vx = Math.cos(angRad) * vxBase + (Math.random() * 2 - 1) * 0.5;
            const vy = -Math.sin(angRad) * vxBase + vyBase;
            const omega = (Math.random() * 2 - 1) * 0.3;
            const piece = new DebrisPiece({ x, y: y - 14, vx, vy, omega, type: 'barrel', size: len, color: '#666' });
            piece.life = this.lifetimeMs;
            this.pieces.push(piece);
        }

        // Shards of the hull/turret
        const shardCount = Math.round(10 * mult);
        for (let i = 0; i < shardCount; i++) {
            const s = 6 + Math.random() * 8;
            const a = Math.random() * Math.PI * 2;
            const sp = 2 + Math.random() * 4;
            const vx = Math.cos(a) * sp;
            const vy = Math.sin(a) * sp - 4;
            const omega = (Math.random() * 2 - 1) * 0.25;
            const tint = i % 3 === 0 ? '#444' : color;
            const piece = new DebrisPiece({ x, y: y - 10, vx, vy, omega, type: 'shard', size: s, color: tint });
            piece.life = this.lifetimeMs;
            this.pieces.push(piece);
        }
    }

    update(deltaTime) {
        const g = this.game.gravityOverride ?? this.game.gravity;
        const terrain = this.game.terrain;
        const width = this.game.width;
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const p = this.pieces[i];
            // Lifetime guard
            p.life -= deltaTime;
            if (p.life <= 0) { this.pieces.splice(i, 1); continue; }

            // Integrate
            p.vy += g;
            p.x += p.vx;
            p.y += p.vy;
            p.angle += p.omega;

            // Offscreen cull
            if (p.x < -50 || p.x > width + 50 || p.y > this.game.height + 200) {
                this.pieces.splice(i, 1);
                continue;
            }

            // Terrain collision
            const ground = terrain.getHeight(p.x);
            if (p.y >= ground) {
                // Snap to surface
                p.y = ground;
                // Compute simple slope
                const sample = 3; // wider sample for smoother slope
                const hL = terrain.getHeight(Math.max(0, p.x - sample));
                const hR = terrain.getHeight(Math.min(width - 1, p.x + sample));
                const slope = (hR - hL) / (2 * sample); // dz/dx; >0 means uphill to right

                if (Math.abs(p.vy) > 1.2) {
                    // Bounce
                    p.vy = -p.vy * 0.35;
                    p.vx *= (p.type === 'wheel' ? 0.92 : 0.88);
                    p.omega *= 0.85;
                } else {
                    // Slide along slope with friction
                    const rollFactor = p.type === 'wheel' ? 0.4 : (p.type === 'barrel' ? 0.25 : 0.18);
                    const downhill = -slope * rollFactor; // negative slope -> accelerate right
                    p.vx += downhill;
                    p.vy = 0;
                    const friction = p.type === 'wheel' ? 0.993 : (p.type === 'barrel' ? 0.99 : 0.985);
                    p.vx *= friction; // rolling friction
                    p.omega += p.vx * (p.type === 'wheel' ? 0.06 : 0.02);

                    // Settle when very slow
                    const settleThreshold = p.type === 'wheel' ? 0.01 : 0.02;
                    const minSlopeToMove = 0.02;
                    if (Math.abs(p.vx) < settleThreshold && Math.abs(slope) < minSlopeToMove) {
                        p.settledFrames++;
                        if (p.settledFrames > 180) {
                            this.pieces.splice(i, 1);
                            continue;
                        }
                    } else {
                        p.settledFrames = 0;
                    }
                }
            }
        }
    }

    render(ctx) {
        for (const p of this.pieces) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);

            if (p.type === 'wheel') {
                // Wheel with rim
                const r = p.size;
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, '#666');
                grad.addColorStop(1, '#222');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Axle highlight
                ctx.fillStyle = '#bbb';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'turret') {
                // Circular turret cap
                const r = p.size * 0.7;
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, this._brighten(p.color, 0.2));
                grad.addColorStop(1, this._brighten(p.color, -0.3));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#00000066';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if (p.type === 'barrel') {
                // Slender rectangular barrel
                const len = p.size;
                const w = 4;
                const grad = ctx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
                grad.addColorStop(0, '#222');
                grad.addColorStop(0.5, '#666');
                grad.addColorStop(1, '#222');
                ctx.fillStyle = grad;
                ctx.strokeStyle = '#00000066';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-len * 0.5, -w * 0.5);
                ctx.lineTo(len * 0.5, -w * 0.5);
                ctx.lineTo(len * 0.5, w * 0.5);
                ctx.lineTo(-len * 0.5, w * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Tip
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(len * 0.5, 0, 1.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Triangular shard
                const s = p.size;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = '#00000066';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-s * 0.6, s * 0.4);
                ctx.lineTo(0, -s * 0.6);
                ctx.lineTo(s * 0.7, s * 0.3);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    _brighten(hex, amt) {
        // hex like #rrggbb
        try {
            const h = hex.replace('#', '');
            const r = Math.max(0, Math.min(255, Math.round(Number.parseInt(h.substring(0,2), 16) * (1 + amt))));
            const g = Math.max(0, Math.min(255, Math.round(Number.parseInt(h.substring(2,4), 16) * (1 + amt))));
            const b = Math.max(0, Math.min(255, Math.round(Number.parseInt(h.substring(4,6), 16) * (1 + amt))));
            const toHex = (n) => n.toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        } catch {
            return hex;
        }
    }
}
