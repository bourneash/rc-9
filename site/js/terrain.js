export class Terrain {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.heightMap = [];
        this.groundLevel = height * 0.7;
    this.bedrockLevel = height * 0.95; // Bedrock top Y (from canvas top)
        this.smoothness = 50; // Default smoothness (1-100)
        // Visual palette (colors depend on theme)
        this.palette = {
            bedrockColor: '#1a1410',
            bedrockLineColor: 'rgba(100, 80, 60, 0.3)',
            gradientStops: [
                { offset: 0, color: '#3a5d3a' },
                { offset: 0.2, color: '#2a4d2a' },
                { offset: 0.5, color: '#1f3d1f' },
                { offset: 0.8, color: '#142814' },
                { offset: 1, color: '#0a1a0a' }
            ],
            edgeStrokeColor: '#4a7d4a',
            edgeGlowColor: '#3a6d3a'
        };
    }

    /**
     * Reserve a bottom margin (in pixels) for UI so gameplay never goes under the controls bar.
     * This sets the bedrock level to height - margin and clamps terrain heights accordingly.
     */
    setReservedBottomMargin(marginPx = 0) {
        const margin = Math.max(0, Math.min(this.height - 10, Math.floor(marginPx)));
        this.bedrockLevel = Math.max(0, this.height - margin);
        // Clamp generated terrain to never sink into bedrock
        if (Array.isArray(this.heightMap) && this.heightMap.length > 0) {
            const maxSurfaceY = Math.max(0, this.bedrockLevel - 2);
            for (let i = 0; i < this.heightMap.length; i++) {
                const h = this.heightMap[i];
                if (typeof h === 'number') this.heightMap[i] = Math.min(h, maxSurfaceY);
            }
        }
    }
    
    resize(newWidth, newHeight) {
        // Resample existing height map to new width; keep relative heights
        const oldWidth = this.width;
        const oldHeights = this.heightMap.slice();
        this.width = newWidth;
        this.height = newHeight;
        this.groundLevel = newHeight * 0.7;
        this.bedrockLevel = newHeight * 0.95;
        if (!oldHeights.length) {
            this.generate('auto');
            return;
        }
        const newMap = new Array(newWidth);
        for (let x = 0; x < newWidth; x++) {
            const u = oldWidth <= 1 ? 0 : (x / (newWidth - 1)) * (oldWidth - 1);
            const i0 = Math.floor(u);
            const i1 = Math.min(oldWidth - 1, i0 + 1);
            const t = u - i0;
            const h0 = oldHeights[i0] ?? this.groundLevel;
            const h1 = oldHeights[i1] ?? this.groundLevel;
            newMap[x] = h0 + (h1 - h0) * t;
        }
        this.heightMap = newMap;
        // If movement bounds exist (e.g., canyon), scale them to new width
        if (this._movementMinX != null && this._movementMaxX != null && oldWidth > 0) {
            const scale = newWidth / oldWidth;
            this._movementMinX = Math.max(0, Math.min(newWidth - 1, Math.floor(this._movementMinX * scale)));
            this._movementMaxX = Math.max(0, Math.min(newWidth - 1, Math.floor(this._movementMaxX * scale)));
        }
    }
    
    generate(profile) {
        // profile: 'auto' | 'flat' | 'hilly' | 'mountain' | 'canyon' | 'ocean'
        const p = profile || 'auto';
        const chosen = p === 'auto' ? (Math.random() < 0.4 ? 'flat' : (Math.random() < 0.7 ? 'hilly' : 'mountain')) : p;
        // Reset special per-profile state
        this._movementMinX = null;
        this._movementMaxX = null;
        this.isOcean = (chosen === 'ocean');
        this._isOceanTerrain = false; // Reset ocean flag - will be set to true only for ocean profile
        this.waterSurfaceY = null; // Reset water surface

        // Ocean: underwater terrain with seafloor at bottom, water surface at top
        if (chosen === 'ocean') {
            const w = this.width;
            const h = this.height;
            // Water surface is at ~30% from top
            this.waterSurfaceY = h * 0.3;
            // Ocean floor varies between 70-90% depth
            const floorBase = h * 0.80;
            const floorVariation = h * 0.10;
            const arr = new Array(w);

            // Generate ocean floor with underwater mountains, trenches, and coral formations
            for (let x = 0; x < w; x++) {
                // Multi-frequency noise for natural ocean floor
                const freq1 = Math.sin(x * 0.008) * floorVariation * 0.5;
                const freq2 = Math.sin(x * 0.025) * floorVariation * 0.25;
                const freq3 = Math.cos(x * 0.05) * floorVariation * 0.15;
                let y = floorBase + freq1 + freq2 + freq3;

                // Add occasional underwater mountains (seamounts)
                if (x % 200 < 80 && Math.random() < 0.3) {
                    const peakOffset = Math.sin((x % 200) / 80 * Math.PI) * (h * 0.15);
                    y -= peakOffset;
                }

                arr[x] = Math.max(this.waterSurfaceY + 20, Math.min(this.bedrockLevel - 2, y));
            }

            // Smooth the ocean floor
            for (let pass = 0; pass < 2; pass++) {
                for (let i = 1; i < arr.length - 1; i++) {
                    arr[i] = (arr[i - 1] + arr[i] + arr[i + 1]) / 3;
                }
            }

            this.heightMap = arr;
            // Mark as ocean terrain for special rendering
            this._isOceanTerrain = true;
            this.profile = 'ocean'; // Store profile for terrain-specific logic
            return;
        }

        // Canyon: deep canyon in the middle with steep cliffs and high plateaus on both sides
        // Players cannot cross the canyon - restricted movement zones enforce separation
        if (chosen === 'canyon') {
            const w = this.width;
            const h = this.height;

            // High plateaus on left and right
            const plateauY = Math.min(this.bedrockLevel - 80, h * 0.55); // Higher plateaus

            // Deep canyon parameters
            const canyonDepth = Math.min(180, h * 0.35); // Much deeper canyon
            const canyonFloorWidth = 0.15; // Narrow canyon floor (15% of width)
            const cliffWidth = 0.08; // Steep cliff transition zone (8% of width each side)

            // Calculate canyon boundaries
            const canyonCenter = w / 2;
            const floorHalfWidth = Math.floor(w * canyonFloorWidth / 2);
            const cliffPixels = Math.floor(w * cliffWidth);

            const leftFloor = canyonCenter - floorHalfWidth;
            const rightFloor = canyonCenter + floorHalfWidth;
            const leftCliffStart = leftFloor - cliffPixels;
            const rightCliffStart = rightFloor + cliffPixels;

            const canyonFloorY = plateauY + canyonDepth;

            const arr = new Array(w);
            for (let x = 0; x < w; x++) {
                let y = plateauY;

                if (x < leftCliffStart) {
                    // Left plateau with rocky terrain
                    const noise = Math.sin(x * 0.015) * 3 + Math.cos(x * 0.008) * 2;
                    y = plateauY + noise;
                } else if (x >= leftCliffStart && x < leftFloor) {
                    // Left cliff - steep descent
                    const t = (x - leftCliffStart) / Math.max(1, leftFloor - leftCliffStart);
                    // Steep curve with some jaggedness
                    const cliffCurve = Math.pow(t, 1.5); // Steeper at top
                    const jagged = Math.sin(x * 0.12) * 8 + Math.cos(x * 0.25) * 5;
                    y = plateauY + cliffCurve * canyonDepth + jagged;
                } else if (x >= leftFloor && x <= rightFloor) {
                    // Canyon floor - narrow rocky bottom
                    const noise = Math.sin(x * 0.03) * 4 + Math.cos(x * 0.018) * 3;
                    y = canyonFloorY + noise;
                } else if (x > rightFloor && x <= rightCliffStart) {
                    // Right cliff - steep ascent
                    const t = (x - rightFloor) / Math.max(1, rightCliffStart - rightFloor);
                    const cliffCurve = 1 - Math.pow(1 - t, 1.5); // Steeper at bottom
                    const jagged = Math.sin(x * 0.12) * 8 + Math.cos(x * 0.25) * 5;
                    y = canyonFloorY + (1 - cliffCurve) * canyonDepth + jagged;
                } else {
                    // Right plateau with rocky terrain
                    const noise = Math.sin(x * 0.015) * 3 + Math.cos(x * 0.008) * 2;
                    y = plateauY + noise;
                }

                arr[x] = Math.max(0, Math.min(this.bedrockLevel - 2, y));
            }

            // Light smoothing only on plateaus to keep cliffs steep
            for (let i = 1; i < arr.length - 1; i++) {
                // Only smooth plateau areas, not cliffs
                if (i < leftCliffStart || i > rightCliffStart) {
                    arr[i] = (arr[i - 1] + arr[i] + arr[i + 1]) / 3;
                }
            }

            this.heightMap = arr;

            // Set movement restrictions - players cannot cross the canyon
            // Left side players restricted to left plateau
            // Right side players restricted to right plateau
            this._canyonValleyLeft = leftFloor;
            this._canyonValleyRight = rightFloor;
            this._canyonLeftCliffStart = leftCliffStart;
            this._canyonRightCliffStart = rightCliffStart;

            // Movement boundaries prevent crossing the canyon
            // We'll use the cliff edges as hard boundaries
            this._movementMinX = 20; // Small margin from edge
            this._movementMaxX = w - 20;
            this._canyonLeftSafeZone = leftCliffStart - 10; // Safe zone before cliff
            this._canyonRightSafeZone = rightCliffStart + 10; // Safe zone after cliff

            // CRITICAL: Store the profile so canMoveTo() knows this is a canyon
            this.profile = 'canyon';

            return;
        }

        this.heightMap = [];

        // Segments: more segments for smoother curves overall
        const segments = Math.floor(20 + (this.smoothness / 100) * 80); // 20-100 segments
        const segmentWidth = this.width / segments;

        // Base variation tuned per profile
        let baseVariation = 160 * (1 - this.smoothness / 160);
        if (chosen === 'flat') baseVariation *= 0.5;
        if (chosen === 'mountain') baseVariation *= 1.8;

        // Seed control points
        let heights = [];
        for (let i = 0; i <= segments; i++) {
            let variation = (Math.random() - 0.5) * baseVariation;
            let height = this.groundLevel + variation;
            heights.push(Math.max(this.height * 0.25, Math.min(this.height * 0.92, height)));
        }

        // Impose a larger hill or mountain if requested
        if (chosen === 'hilly' || chosen === 'mountain') {
            const peaks = chosen === 'mountain' ? 2 : 1;
            for (let k = 0; k < peaks; k++) {
                const center = Math.floor(Math.random() * (segments * 0.8)) + Math.floor(segments * 0.1);
                const width = Math.floor((segments / (chosen === 'mountain' ? 3 : 5)) * (0.7 + Math.random() * 0.6));
                const amplitude = (chosen === 'mountain' ? 140 : 80) * (0.7 + Math.random() * 0.6);
                for (let i = Math.max(0, center - width); i <= Math.min(segments, center + width); i++) {
                    const t = (i - center) / width; // -1..1
                    const bump = Math.cos(t * Math.PI) * amplitude; // bell shaped
                    heights[i] = Math.max(this.height * 0.2, Math.min(this.height * 0.95, heights[i] - bump));
                }
            }
        }

        // Smoothing passes based on smoothness
        const smoothPasses = Math.floor(this.smoothness / 25);
        for (let pass = 0; pass < smoothPasses; pass++) {
            for (let i = 1; i < heights.length - 1; i++) {
                heights[i] = (heights[i - 1] + heights[i] + heights[i + 1]) / 3;
            }
        }

        // Interpolate across canvas width
        for (let x = 0; x < this.width; x++) {
            const segment = x / segmentWidth;
            const i = Math.floor(segment);
            const t = segment - i;
            if (i >= heights.length - 1) {
                this.heightMap[x] = heights.at(-1);
            } else {
                const h1 = heights[i];
                const h2 = heights[i + 1];
                this.heightMap[x] = h1 + (h2 - h1) * t;
            }
        }

        // Store the terrain profile for terrain-specific logic (e.g., movement restrictions)
        this.profile = chosen;
    }
    
    getHeight(x) {
        const index = Math.floor(x);
        if (index < 0 || index >= this.heightMap.length) {
            return this.height;
        }
        return this.heightMap[index];
    }

    /**
     * Returns the surface angle (radians) of the terrain at x.
     * Positive angle means the surface falls to the right (clockwise from horizontal).
     */
    getSlopeAngle(x) {
        if (!this.heightMap.length) return 0;
        const xi = Math.max(1, Math.min(this.width - 2, Math.floor(x)));
        const hL = this.heightMap[xi - 1] ?? this.getHeight(xi - 1);
        const hR = this.heightMap[xi + 1] ?? this.getHeight(xi + 1);
        const dy = hR - hL; // screen coords: positive is downward
        const dx = 2; // samples are two pixels apart
        return Math.atan2(dy, dx);
    }

    /**
     * Check if movement from currentX to newX is allowed based on terrain boundaries
     * This includes canyon restrictions and cliff boundaries
     */
    canMoveTo(currentX, newX) {
        // Basic boundary check
        if (newX < 20 || newX > this.width - 20) {
            return false;
        }

        // Canyon-specific movement restrictions
        if (this.profile === 'canyon' && this._canyonLeftCliffStart && this._canyonRightCliffStart) {
            const leftCliff = this._canyonLeftCliffStart;
            const rightCliff = this._canyonRightCliffStart;
            const leftSafe = this._canyonLeftSafeZone || (leftCliff - 10);
            const rightSafe = this._canyonRightSafeZone || (rightCliff + 10);

            // Determine which side the tank is currently on
            const isOnLeftSide = currentX < leftCliff;
            const isOnRightSide = currentX > rightCliff;
            const isInCanyon = currentX >= leftCliff && currentX <= rightCliff;

            // If on left side, can't cross into canyon
            if (isOnLeftSide && newX > leftSafe) {
                return false;
            }

            // If on right side, can't cross into canyon
            if (isOnRightSide && newX < rightSafe) {
                return false;
            }

            // If somehow in the canyon (shouldn't happen), restrict to canyon
            if (isInCanyon) {
                // Can move within canyon but not up the cliffs
                if (newX < leftCliff || newX > rightCliff) {
                    // Check if slope is too steep (cliff)
                    const slope = Math.abs(this.getHeight(newX) - this.getHeight(currentX));
                    if (slope > 50) { // Cliff threshold
                        return false;
                    }
                }
            }
        }

        return true;
    }

    applyExplosion(x, y, radius) {
        const startX = Math.max(0, Math.floor(x - radius));
        const endX = Math.min(this.width - 1, Math.floor(x + radius));
        
        for (let i = startX; i <= endX; i++) {
            const dx = i - x;
            const distance = Math.abs(dx);
            
            if (distance < radius) {
                const craterDepth = Math.sqrt(radius * radius - dx * dx);
                const newHeight = y + craterDepth;
                
                // Don't allow terrain to go below bedrock
                const maxAllowedHeight = Math.min(newHeight, this.bedrockLevel);
                
                if (maxAllowedHeight > this.heightMap[i]) {
                    this.heightMap[i] = maxAllowedHeight;
                }
            }
        }
        
        this.smoothTerrain(startX, endX);
    }
    
    smoothTerrain(startX, endX) {
        const smoothRadius = 5;
        const expandedStart = Math.max(0, startX - smoothRadius);
        const expandedEnd = Math.min(this.width - 1, endX + smoothRadius);
        
        const tempHeights = [...this.heightMap];
        
        for (let i = expandedStart; i <= expandedEnd; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = -2; j <= 2; j++) {
                const index = i + j;
                if (index >= 0 && index < this.width) {
                    sum += tempHeights[index];
                    count++;
                }
            }
            
            this.heightMap[i] = sum / count;
        }
    }
    
    drill(x, y, radius) {
        const startX = Math.max(0, Math.floor(x - radius));
        const endX = Math.min(this.width - 1, Math.floor(x + radius));
        
        // Remove terrain in circular pattern
        for (let i = startX; i <= endX; i++) {
            const dx = i - x;
            const distance = Math.abs(dx);
            
            if (distance < radius) {
                const drillDepth = Math.sqrt(radius * radius - dx * dx);
                const newHeight = y + drillDepth;
                
                // Don't drill below bedrock
                const maxAllowedHeight = Math.min(newHeight, this.bedrockLevel);
                
                if (maxAllowedHeight > this.heightMap[i]) {
                    this.heightMap[i] = maxAllowedHeight;
                }
            }
        }
        
        // Apply settling physics - terrain falls like sand
        this.settleTerrain();
    }
    
    settleTerrain() {
        const maxIterations = 10;
        const fallSpeed = 2;
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let changed = false;
            
            for (let x = 1; x < this.width - 1; x++) {
                const currentHeight = this.heightMap[x];
                const leftHeight = this.heightMap[x - 1];
                const rightHeight = this.heightMap[x + 1];
                
                // If terrain is higher than neighbors, it should fall
                const avgNeighbor = (leftHeight + rightHeight) / 2;
                
                if (currentHeight < avgNeighbor - fallSpeed) {
                    this.heightMap[x] = Math.min(avgNeighbor, currentHeight + fallSpeed);
                    changed = true;
                }
            }
            
            if (!changed) break;
        }
    }
    
    setPalette(palette) {
        // Shallow merge to allow partial overrides
        this.palette = { ...this.palette, ...palette };
    }

    // Force a perfectly flat surface at the given Y (default = groundLevel)
    flattenSurface(y) {
        const level = (y ?? this.groundLevel);
        const target = Math.max(0, Math.min(this.bedrockLevel - 2, level));
        this.heightMap = new Array(this.width).fill(target);
    }

    // Optional movement bounds for special profiles (e.g., canyon)
    getMovementBounds() {
        if (this._movementMinX != null && this._movementMaxX != null) {
            return [this._movementMinX, this._movementMaxX];
        }
        return null;
    }

    render(ctx) {
        // Ocean mode: render water surface and underwater atmosphere
        if (this._isOceanTerrain && this.waterSurfaceY != null) {
            this.renderOcean(ctx);
            return;
        }

        // Draw bedrock layer first (make it darker and clearly separated)
        ctx.fillStyle = this.palette.bedrockColor;
        ctx.fillRect(0, this.bedrockLevel, this.width, this.height - this.bedrockLevel);
        // Darken bedrock for stronger contrast
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, this.bedrockLevel, this.width, this.height - this.bedrockLevel);
        // Strong top edge line for bedrock
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, Math.floor(this.bedrockLevel) + 0.5);
        ctx.lineTo(this.width, Math.floor(this.bedrockLevel) + 0.5);
        ctx.stroke();

        // Bedrock texture lines
        ctx.strokeStyle = this.palette.bedrockLineColor;
        ctx.lineWidth = 1;
        for (let y = Math.floor(this.bedrockLevel) + 6; y < this.height; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
        
        // Create theme-able terrain gradient with depth
        const gradient = ctx.createLinearGradient(0, this.height * 0.4, 0, this.bedrockLevel);
        for (const stop of this.palette.gradientStops) {
            gradient.addColorStop(stop.offset, stop.color);
        }
        
        ctx.fillStyle = gradient;
        
        // Draw terrain with glow outline
        ctx.beginPath();
        ctx.moveTo(0, this.heightMap[0]);
        
        for (let x = 1; x < this.width; x++) {
            ctx.lineTo(x, this.heightMap[x]);
        }
        
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();
        
        // Draw glowing terrain edge
        ctx.strokeStyle = this.palette.edgeStrokeColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.palette.edgeGlowColor;
        
        ctx.beginPath();
        ctx.moveTo(0, this.heightMap[0]);
        for (let x = 1; x < this.width; x++) {
            ctx.lineTo(x, this.heightMap[x]);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    renderOcean(ctx) {
        const time = Date.now() * 0.001;

        // Draw sky/atmosphere above water (lighter blue-gray gradient)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.waterSurfaceY);
        skyGrad.addColorStop(0, '#8ab8d4');
        skyGrad.addColorStop(1, '#b8d4e8');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.waterSurfaceY);

        // Draw water surface with animated waves
        const surfaceY = this.waterSurfaceY;
        ctx.save();
        ctx.strokeStyle = '#4a8eb8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, surfaceY);
        for (let x = 0; x < this.width; x++) {
            const wave1 = Math.sin(x * 0.02 + time * 2) * 2;
            const wave2 = Math.sin(x * 0.05 + time * 1.5) * 1;
            const y = surfaceY + wave1 + wave2;
            ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Water foam/highlights on surface
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, surfaceY - 1);
        for (let x = 0; x < this.width; x++) {
            const wave1 = Math.sin(x * 0.02 + time * 2) * 2;
            const wave2 = Math.sin(x * 0.05 + time * 1.5) * 1;
            const y = surfaceY + wave1 + wave2 - 1;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        // Draw underwater gradient (dark blue gradient from surface to floor)
        const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, this.height);
        waterGrad.addColorStop(0, '#1e5a7a');
        waterGrad.addColorStop(0.5, '#0d3a52');
        waterGrad.addColorStop(1, '#051f30');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, surfaceY, this.width, this.height - surfaceY);

        // Draw caustic light patterns (animated god rays)
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) {
            const x = (i * this.width / 8 + time * 20) % this.width;
            const rayGrad = ctx.createLinearGradient(x, surfaceY, x, this.height);
            rayGrad.addColorStop(0, 'rgba(180,220,255,0.4)');
            rayGrad.addColorStop(0.3, 'rgba(120,180,220,0.2)');
            rayGrad.addColorStop(1, 'rgba(80,140,180,0)');
            ctx.fillStyle = rayGrad;
            ctx.fillRect(x - 30, surfaceY, 60, this.height - surfaceY);
        }
        ctx.restore();

        // Draw ocean floor
        const floorGrad = ctx.createLinearGradient(0, this.height * 0.6, 0, this.bedrockLevel);
        floorGrad.addColorStop(0, '#3a4a52');
        floorGrad.addColorStop(0.4, '#2a3540');
        floorGrad.addColorStop(0.8, '#1a2530');
        floorGrad.addColorStop(1, '#0f1a20');
        ctx.fillStyle = floorGrad;

        ctx.beginPath();
        ctx.moveTo(0, this.heightMap[0]);
        for (let x = 1; x < this.width; x++) {
            ctx.lineTo(x, this.heightMap[x]);
        }
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        // Ocean floor edge highlight
        ctx.strokeStyle = '#557585';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#2a5565';
        ctx.beginPath();
        ctx.moveTo(0, this.heightMap[0]);
        for (let x = 1; x < this.width; x++) {
            ctx.lineTo(x, this.heightMap[x]);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Add some coral/rock formations randomly
        ctx.fillStyle = '#4a5a62';
        for (let x = 0; x < this.width; x += 50) {
            if (Math.random() < 0.3) {
                const floorY = this.heightMap[x];
                const height = 5 + Math.random() * 10;
                ctx.fillRect(x, floorY - height, 3 + Math.random() * 4, height);
            }
        }

        // Bedrock layer at very bottom
        ctx.fillStyle = '#0a1015';
        ctx.fillRect(0, this.bedrockLevel, this.width, this.height - this.bedrockLevel);
    }
}
