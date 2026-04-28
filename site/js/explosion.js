export class Explosion {
    constructor(x, y, maxRadius, damage, color) {
        this.x = x;
        this.y = y;
        this.maxRadius = maxRadius;
        this.currentRadius = 0;
        this.damage = damage;
        this.color = color;
        this.duration = 30;
        this.currentFrame = 0;
        this.expandSpeed = maxRadius / 10;
    }
    
    update() {
        this.currentFrame++;
        
        if (this.currentFrame < 10) {
            this.currentRadius += this.expandSpeed;
        } else {
            this.currentRadius = this.maxRadius * (1 - (this.currentFrame - 10) / (this.duration - 10));
        }
    }
    
    isFinished() {
        return this.currentFrame >= this.duration;
    }
    
    render(ctx) {
        const progress = this.currentFrame / this.duration;
        const alpha = 1 - progress;
        
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.currentRadius
        );
        
        // Convert color to rgba with alpha
        let innerColor;
        if (this.color.startsWith('#')) {
            // Convert hex to rgba
            const r = Number.parseInt(this.color.substr(1, 2), 16);
            const g = Number.parseInt(this.color.substr(3, 2), 16);
            const b = Number.parseInt(this.color.substr(5, 2), 16);
            innerColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (this.color.startsWith('rgb(')) {
            // Convert rgb to rgba
            innerColor = this.color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        } else if (this.color.startsWith('rgba(')) {
            // Already rgba, just adjust alpha
            innerColor = this.color.replace(/[\d.]+\)$/, `${alpha})`);
        } else {
            // Fallback
            innerColor = `rgba(255, 100, 0, ${alpha})`;
        }
        
        gradient.addColorStop(0, innerColor);
        gradient.addColorStop(0.5, `rgba(255, 200, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.currentFrame < 5) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(5 - this.currentFrame) / 5})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.currentRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Stylized mushroom cloud for nuclear explosions
export class MushroomCloudExplosion {
    constructor(x, y, scale = 1) {
        this.x = x;
        this.y = y;
        this.scale = scale; // visual scale multiplier
        this.frame = 0;
        this.duration = 90; // slower, grander
        // Cloud growth parameters
        this.stemHeight = 0;
        this.capRadius = 0;
        this.baseGlow = 0;
    }

    update() {
        this.frame++;
        const t = this.frame / this.duration;
        // Ease curves
        const easeOut = (p) => 1 - Math.pow(1 - p, 2);
        const easeIn = (p) => Math.pow(p, 2);
        // Grow stem first, then cap
        this.stemHeight = easeOut(Math.min(1, t * 1.4)) * 120 * this.scale;
        this.capRadius = easeOut(Math.max(0, Math.min(1, (t - 0.15) * 1.2))) * 90 * this.scale;
    this.baseGlow = easeIn(Math.min(1, t * 2)) * 1;
    }

    isFinished() {
        return this.frame >= this.duration;
    }

    render(ctx) {
        const t = this.frame / this.duration;
        const alpha = 1 - t;
        ctx.save();
        // Base flash/glow
        const glowR = 60 * this.scale + this.baseGlow * 40 * this.scale;
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
        g.addColorStop(0, `rgba(255, 240, 180, ${Math.max(0, 0.35 * alpha)})`);
        g.addColorStop(0.6, `rgba(255, 140, 40, ${Math.max(0, 0.25 * alpha)})`);
        g.addColorStop(1, 'rgba(255, 120, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Rising stem (smoke column)
        const stemW = 22 * this.scale;
        const stemH = this.stemHeight;
        const stemTopY = this.y - stemH;
        const smokeGrad = ctx.createLinearGradient(this.x, this.y, this.x, stemTopY);
        smokeGrad.addColorStop(0, `rgba(60,60,60, ${0.35 * alpha})`);
        smokeGrad.addColorStop(1, `rgba(120,120,120, ${0.6 * alpha})`);
        ctx.fillStyle = smokeGrad;
        // Organic column using rounded rectangles
        ctx.beginPath();
        ctx.moveTo(this.x - stemW * 0.6, this.y);
        ctx.lineTo(this.x - stemW * 0.4, stemTopY + 10 * this.scale);
        ctx.quadraticCurveTo(this.x, stemTopY - 6 * this.scale, this.x + stemW * 0.4, stemTopY + 10 * this.scale);
        ctx.lineTo(this.x + stemW * 0.6, this.y);
        ctx.closePath();
        ctx.fill();

        // Cap (mushroom head)
        const capR = this.capRadius;
        const capY = stemTopY - 8 * this.scale;
        const capGrad = ctx.createRadialGradient(this.x, capY, capR * 0.2, this.x, capY, capR);
        capGrad.addColorStop(0, `rgba(200, 200, 200, ${0.7 * alpha})`);
        capGrad.addColorStop(0.5, `rgba(120, 120, 120, ${0.55 * alpha})`);
        capGrad.addColorStop(1, `rgba(80, 80, 80, 0)`);
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.ellipse(this.x, capY, capR, capR * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cap underside shading
        ctx.fillStyle = `rgba(40,40,40, ${0.4 * alpha})`;
        ctx.beginPath();
        ctx.ellipse(this.x, capY + capR * 0.15, capR * 0.75, capR * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
