export class Particle {
    constructor(x, y, vx, vy, color, lifetime, type = undefined) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.size = Math.random() * 3 + 1;
        this.gravity = 0.2;
        this.type = type; // e.g., 'smoke', 'spark', etc.
    }
    
    update(deltaTime) {
        this.vy += this.gravity;

        // Bubble wobble effect
        if (this.type === 'bubble' && this._wobble != null) {
            this._wobble += this._wobbleSpeed || 0.05;
            this.vx += Math.sin(this._wobble) * 0.05;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.lifetime -= deltaTime * 0.05;
    }
    
    isAlive() {
        return this.lifetime > 0;
    }
    
    render(ctx) {
        const alpha = this.lifetime / this.maxLifetime;

        // Bubbles render differently
        if (this.type === 'bubble') {
            ctx.globalAlpha = alpha * 0.5;
            // Bubble outline
            ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
            // Bubble highlight
            const highlightGrad = ctx.createRadialGradient(
                this.x - this.size * 0.3,
                this.y - this.size * 0.3,
                0,
                this.x,
                this.y,
                this.size
            );
            highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            highlightGrad.addColorStop(0.5, 'rgba(200, 230, 255, 0.2)');
            highlightGrad.addColorStop(1, 'rgba(150, 200, 230, 0)');
            ctx.fillStyle = highlightGrad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            return;
        }

        // Regular particles
        // Particle glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.5, `${this.color}80`);
        gradient.addColorStop(1, `${this.color}00`);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.size * 2, this.y - this.size * 2, this.size * 4, this.size * 4);

        // Particle core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 1000; // Performance: limit total particles
    }
    
    createSmokePuff(x, y, count = 10) {
        // Performance: limit count and check max particles
        count = Math.min(count, 15);
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const angle = Math.random() * Math.PI - Math.PI / 2; // mostly upward
            const speed = 0.5 + Math.random() * 1.2;
            const vx = Math.cos(angle) * speed * 0.4;
            const vy = -Math.abs(Math.sin(angle)) * speed - 0.2;
            const lifetime = 60 + Math.random() * 60;
            const shades = ['#666666', '#777777', '#888888', '#aaaaaa', '#cccccc'];
            const color = shades[Math.floor(Math.random() * shades.length)];
            const p = new Particle(x, y, vx, vy, color, lifetime, 'smoke');
            // Smoke should rise over time (buoyancy), not fall
            p.gravity = -0.02;
            p.size = 2 + Math.random() * 3.5;
            this.particles.push(p);
        }
    }
    
    createExplosion(x, y, radius, color) {
        // Performance: cap particle count and scale down for large explosions
        const particleCount = Math.min(40, Math.floor(radius / 2.5));

        // Early exit if at particle limit
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - Math.random() * 3;
            const lifetime = Math.random() * 50 + 30;
            
            const colors = ['#ff6600', '#ff9900', '#ffcc00', color];
            const particleColor = colors[Math.floor(Math.random() * colors.length)];
            
            this.particles.push(new Particle(x, y, vx, vy, particleColor, lifetime));
        }
    }

    // Explosion variant where all sparks are emitted downward (no upward velocity)
    createExplosionDownward(x, y, radius, color) {
        // Performance: cap particle count
        const particleCount = Math.min(30, Math.floor(radius / 2.5));

        // Early exit if at particle limit
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;
            // Lower hemisphere angles produce vy > 0 (downward in canvas coordinates)
            const angle = Math.random() * Math.PI; // 0..π
            const speed = Math.random() * 5 + 2;
            const vx = Math.cos(angle) * speed;
            // Ensure strictly downward; add slight bias so none stall at apex
            const vy = Math.abs(Math.sin(angle)) * speed + 0.5 + Math.random() * 1.5;
            const lifetime = Math.random() * 50 + 30;

            const colors = ['#ff6600', '#ff9900', '#ffcc00', color];
            const particleColor = colors[Math.floor(Math.random() * colors.length)];

            const p = new Particle(x, y, vx, vy, particleColor, lifetime, 'spark');
            p.size = 1 + Math.random() * 2.5; // slightly smaller, spark-like
            // Keep default gravity (downward) so they fall to ground
            this.particles.push(p);
        }
    }

    // Rising smoke emitted from explosions (ash/cloud)
    createExplosionSmoke(x, y, radius, baseColor = '#bbbbbb') {
        // Performance: cap particle count
        const particleCount = Math.min(25, Math.max(8, Math.floor(radius * 0.6)));

        // Early exit if at particle limit
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;
            // Mostly upward with a little spread
            const angle = (-Math.PI / 2) + (Math.random() * Math.PI * 0.6) - (Math.PI * 0.3);
            const speed = 0.6 + Math.random() * 1.4;
            const vx = Math.cos(angle) * speed * 0.5;
            const vy = Math.sin(angle) * speed * 0.8;
            const lifetime = 80 + Math.random() * 90;
            const shades = [baseColor, '#aaaaaa', '#999999', '#cccccc'];
            const color = shades[Math.floor(Math.random() * shades.length)];
            const p = new Particle(x, y, vx, vy, color, lifetime, 'smoke');
            p.gravity = -0.02; // buoyant
            p.size = 2.5 + Math.random() * 3.5;
            this.particles.push(p);
        }
    }

    // Tan dust that rises slightly then settles back down
    createDustPuff(x, y, count = 8, options = {}) {
        // Performance: limit count
        count = Math.min(count, 12);
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const angle = Math.random() * Math.PI; // upper hemisphere
            const speed = 0.4 + Math.random();
            const vx = Math.cos(angle) * speed * 0.6;
            const vy = -Math.abs(Math.sin(angle)) * speed * 0.4;
            const lifetime = 50 + Math.random() * 40;
            const shades = options.shades || ['#d8c29a', '#caa973', '#b89357', '#e1cc9f'];
            const color = shades[Math.floor(Math.random() * shades.length)];
            const p = new Particle(x, y, vx, vy, color, lifetime, 'dust');
            p.gravity = (options.gravity ?? 0.06); // falls back down gently
            if (options.gravityDelta != null) p.gravity += options.gravityDelta;
            p.size = (1.6 + Math.random() * 2.2) * (options.sizeScale || 1);
            if (options.lifetimeScale) { p.lifetime *= options.lifetimeScale; p.maxLifetime *= options.lifetimeScale; }
            this.particles.push(p);
        }
    }

    // Moon dust: pale gray tones, lower gravity and slightly longer lifetime
    createMoonDustPuff(x, y, count = 6, options = {}) {
        // Performance: limit count
        count = Math.min(count, 10);
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            // Emit with a bit less vertical bias (ballistic feel)
            const angle = Math.random() * Math.PI; // upper hemisphere
            const speed = 0.35 + Math.random() * 0.9;
            const vx = Math.cos(angle) * speed * 0.55;
            const vy = -Math.abs(Math.sin(angle)) * speed * 0.35;
            const lifetime = 60 + Math.random() * 50; // slightly longer
            const shades = options.shades || ['#e0e3e6', '#c9ced3', '#b2b8bf', '#9aa2aa'];
            const color = shades[Math.floor(Math.random() * shades.length)];
            const p = new Particle(x, y, vx, vy, color, lifetime, 'dust');
            p.gravity = (options.gravity ?? 0.02); // low gravity feel
            if (options.gravityDelta != null) p.gravity += options.gravityDelta;
            p.size = (1.4 + Math.random() * 2) * (options.sizeScale || 1);
            if (options.lifetimeScale) { p.lifetime *= options.lifetimeScale; p.maxLifetime *= options.lifetimeScale; }
            this.particles.push(p);
        }
    }

    // Mars dust: reddish tones, moderate gravity, slightly longer lifetime
    createMarsDustPuff(x, y, count = 6, options = {}) {
        // Performance: limit count
        count = Math.min(count, 10);
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const angle = Math.random() * Math.PI;
            const speed = 0.4 + Math.random() * 1;
            const vx = Math.cos(angle) * speed * 0.6;
            const vy = -Math.abs(Math.sin(angle)) * speed * 0.38;
            const lifetime = 60 + Math.random() * 55;
            const shades = options.shades || ['#c45c3d', '#bb5233', '#a6492e', '#8f3f28'];
            const color = shades[Math.floor(Math.random() * shades.length)];
            const p = new Particle(x, y, vx, vy, color, lifetime, 'dust');
            p.gravity = (options.gravity ?? 0.05);
            if (options.gravityDelta != null) p.gravity += options.gravityDelta;
            p.size = (1.5 + Math.random() * 2.1) * (options.sizeScale || 1);
            if (options.lifetimeScale) { p.lifetime *= options.lifetimeScale; p.maxLifetime *= options.lifetimeScale; }
            this.particles.push(p);
        }
    }

    // Bubbles for underwater effects (rise upward with slight wobble)
    createBubbles(x, y, count = 5) {
        // Performance: limit count
        count = Math.min(count, 8);
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const angle = (-Math.PI / 2) + (Math.random() * 0.4 - 0.2); // Mostly upward
            const speed = 0.3 + Math.random() * 0.8;
            const vx = Math.cos(angle) * speed * 0.3;
            const vy = Math.sin(angle) * speed;
            const lifetime = 60 + Math.random() * 40;
            const p = new Particle(x, y, vx, vy, 'rgba(200, 230, 255, 0.6)', lifetime, 'bubble');
            p.gravity = -0.08; // Bubbles float upward
            p.size = 1 + Math.random() * 2.5;
            p._wobble = Math.random() * Math.PI * 2; // Random phase for wobble
            p._wobbleSpeed = 0.05 + Math.random() * 0.05;
            this.particles.push(p);
        }
    }

    update(deltaTime, groundHeightFn = undefined) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(deltaTime);

            // Terrain collision for smoke: don't let smoke go below ground
            if (groundHeightFn && (p.type === 'smoke' || p.type === 'dust')) {
                const groundY = groundHeightFn(Math.round(p.x)) - 1; // just above the surface
                if (p.y > groundY) {
                    p.y = groundY;
                    // If moving downward, nudge upward to keep the flow rising
                    if (p.type === 'smoke') {
                        if (p.vy > 0) p.vy = -Math.abs(p.vy) * 0.25;
                    } else if (p.type === 'dust') {
                        // Dust should settle; dampen lateral movement
                        p.vy = 0;
                        p.vx *= 0.7;
                    }
                }
            }

            if (!p.isAlive()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        // Performance: batch render particles by skipping complex gradients for small/faint particles
        for (let particle of this.particles) {
            const alpha = particle.lifetime / particle.maxLifetime;

            // Skip very faint particles
            if (alpha < 0.05) continue;

            // Use simplified rendering for small particles
            if (particle.size < 2 && particle.type !== 'bubble') {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = particle.color;
                ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
                ctx.globalAlpha = 1;
            } else {
                particle.render(ctx);
            }
        }
    }
}
