import { Terrain } from './terrain.js';
import { renderMetaballs } from './metaballs.js';
import { massFromRadius, mergeDroplets } from './liquid.js';
import { Tank } from './tank.js';
import { Submarine, SurfaceShip, UnderwaterBase } from './vehicle.js';
import { Projectile } from './projectile.js';
import { Explosion, MushroomCloudExplosion } from './explosion.js';
import { Particle, ParticleSystem } from './particles.js';
import { DebrisSystem } from './debris.js';
import { toSnapshot as snapshotSerialize, loadSnapshotIntoGame as snapshotLoad } from './snapshot.js';
import { VictoryMessages } from './victory-messages.js';

export class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;
        try {
            globalThis.__se_activeGame = this;
            if (import.meta.env.DEV) {
                globalThis.__SE_TEST_API__ = () => this.getTestAPI();
            }
        } catch {}
        
        this.terrain = null;
        this.tanks = [];
        this.projectiles = [];
        this.explosions = [];
    this.particleSystem = new ParticleSystem();
    this.debrisSystem = new DebrisSystem(this);
    this.supportActors = [];
    // Transient light sources (for cave visibility)
    this.activeLights = [];
    // Lingering hazards like acid pools and napalm fire
    this.hazards = [];
    // Persistent smoke screens that obscure an area across turns
    // Persistent land mines placed by players
    this.mines = [];
    this.smokeScreens = [];
    // Last tracer round trajectory for display on next turn
    this.lastTracerTrail = null;
        // Screen shake effect state
        this.screenShake = { intensity: 0, x: 0, y: 0 };
        
        this.currentTankIndex = 0;
        this.turnCount = 0; // Track number of turns for statistics
        this.wind = 0;
        this.gravity = 0.3;
        this.velocityMultiplier = 0.74; // Matches config.json and constants.js
        this.windEffect = 0.015;
        this.debugMode = false;
        this.windOverride = null;
    this.windMode = 'low'; // 'none' | 'low' | 'high' | 'random-per-turn'
        
        // Cheat/Debug options
        this.fuelMode = 'normal'; // 'normal', 'double', 'unlimited'
        this.healthOverride = null;
        this.gravityOverride = null;
    this.damageMultiplier = 1;
    this.mode = 'classic'; // 'classic' | 'solo' | 'teams' | 'realtime'
    this.teams = null; // array like ['A','B','A', ...] aligned with tanks

        // Realtime mode: track AI cooldowns and shot timestamps
        this.aiCooldowns = new Map(); // Map of tank -> timestamp when they can shoot next
        this.aiCooldownMs = 2000; // Base cooldown between AI shots (2 seconds)

        this.angle = 45;
        this.power = 50;
        this.currentWeapon = 'missile';
    this.aiDifficulty = 'medium';
    // Ammo/modes
    this.ammoMode = 'unlimited'; // 'unlimited' | 'standard' | 'no-heavy' | 'missile-only' | 'custom'
    this.heavyWeapons = new Set(['heavy','nuke','mirv','bunker','funky','cluster','laser','drill','napalm','emp']);
    // Weapons that only make sense on underwater (ocean) maps
    this.waterOnlyWeapons = new Set(['torpedo','homing_torpedo','depth_charge','underwater_mine','navy_seal','sonar_pulse']);
    // Weapons that don't work underwater (air-based or fire-based)
    this.landOnlyWeapons = new Set(['marker_airstrike','marker_airnukes','marker_attack','marker_medic','parachute_flare','napalm','smoke_bomb','flare']);
    // Tracer is not heavy
    this.tracerPreview = null; // optional visual guide from last tracer impact
        
        this.isAnimating = false;
        this.gameOver = false;
        this.driveMode = false;
        this.stars = null;
        this.turnEnding = false;
        this.aiTurnInProgress = false;
        
        this.config = null;
    // Track whether this match started with any human players (used to gate skip prompts)
    this.hadHumansAtStart = false;
        
        this.lastFrameTime = 0;
        this.animationFrameId = null;
    // Pause uses a Set of reasons. `paused` is true iff any reason is active.
    // Reasons: 'user' (default), 'window-blur', 'document-hidden', 'new-game-modal', 'options-modal'.
    this._pauseReasons = new Set();
    this.paused = false;
        this.fireLocked = false; // latch to prevent multiple fire actions per turn
        // Turn scheduling guards

        // Dust debug overrides
        this.dustOverrideEnabled = null; // null = use config, boolean to force on/off
        this.dustAmountMultiplier = 1;   // scales particle count
        this.dustSizeScale = 1;          // scales particle size
        this.dustLifetimeScale = 1;      // scales particle lifetime
    // Air Nukes balance knobs (overridable via config.json\n+        //   game.airNukes = { speed: 70, altitude: 70, spacing: 46, passes: 2, gateInNoHeavy: false } )
    // Air Nukes balance knobs (overridable via config.json)
        this.endTurnTimer = null;
        this.turnToken = 0; // increments each time a new turn begins
    // Land mine defaults (can be overridden via config.game.landMine)
    this.landMineCfg = { radius: 38, damage: 28, triggerRadius: 12, armDelayMs: 600, color: '#ffaa44' };
        // Turn/animation holds for support actors (e.g., paratroopers)
        this.holdingForSupport = false; // when true, block firing/inputs until support completes
        this.deferTurnForParatroopers = false; // when true, wait to end turn until paras finish
        this.paratrooperPostAttackDelayMs = 1500; // configurable cooldown before next turn
        
        // Visual effects
        this.nebulaClouds = [];
        this.clouds = []; // Individual randomized cloud objects
        // Decorative caches
        this.caveStalactites = null; // generated when Cave theme active
        this.nebulaClouds = [];
    this.trajectoryGuide = false; // debug aiming dots
    // Solo mode state
    this.soloActive = false;
    this.soloScore = 0;
    this.soloTarget = null;
    this.soloTargetGoal = 0;
    this.soloTargetsHit = 0;
    this.soloShotsTotal = null; // null = unlimited
    this.soloShotsUsed = 0;

        // Landscape theme state
        this.themeName = 'futuristic'; // default aesthetic similar to existing space look
        this.timeOfDay = 'night'; // 'day' | 'dusk' | 'night'
        this.themeOverride = null; // null = random each new game
        this.timeOfDayOverride = null; // null = auto based on theme/random
        this.starsEnabled = true;
        this.nebulaEnabled = true;
    this.moonEnabled = true;  // Enable moon by default for night scenes
    this.sunEnabled = true;   // Enable sun by default for day scenes
    // Background controls (overridden per theme/time via config backgrounds matrix)
    this.cloudsEnabled = true;
    this.earthEnabled = false;
    this.planetsEnabled = false;
    this.skyObjectsEnabled = true; // can be disabled per theme (e.g., cave)
    this.skyTime = 0; // for sky animations (moon/sun movement, twinkle)
    // Separate, clamped animation clock for purely visual sky effects (prevents big jumps after tab sleep)
    this.skyAnimTime = 0;
    // Celestial cycle (day/dusk/night) and moon phase; active only when timeOfDayOverride is null
    this.celestial = {
        enabled: true,
    cycleSeconds: 480, // slower default in-game full day-night cycle length
        progress: 0,       // 0..1 over a cycle
        starsAlpha: 1,     // computed crossfade factors
        nebulaAlpha: 1,
        sunAlpha: 1,
        moonAlpha: 1,
        blends: { day: 0, dusk: 0, night: 1 },
        // Moon phase over longer cycle (new -> full -> new)
    moonCycleSeconds: 1800,
        moonPhase: 0 // 0 new, 0.5 full, 1 new
    };
    // Much slower default sky movement; configurable via config.json
    this.skySpeeds = { sun: 6, moon: 4 }; // px/sec defaults; overridden by config
    // Global speed scale for celestial progression (day/night and moon phase)
    // 1 = normal, 0.5 = 50% slower
    this.celestialSpeedScale = 0.2;
    // Sky rendering knobs (overridable via config)
    this.skyKnobs = {
        sunRadius: 26,
        moonRadius: 24,
        stars: { count: 200, brightnessScale: 1, twinkleScale: 1, rotationRate: 0.002 },
        nebulaAlphaScale: 1,
        celestial: { blending: { threshold: 0.7, duskBoost: 0.5 } }
    };
    // Theme-specific asset gating and effective knobs
    this.assetForce = null; // { sun?: true|false, moon?: true|false, stars?: bool, nebula?: bool, earth?: bool, planets?: bool, skyObjects?: bool }
    this.effectiveKnobs = null; // merged knob view: base skyKnobs overridden by per-theme/time knobs
    // Background sky objects
    this.skyObjects = [];
    this.skyLastSpawnAt = 0;
    this.skySpawnCooldownMs = 4200; // slow down sky spawns to reduce frequency
    // UFO spawn throttling so they are cool but rare
    this.lastUfoAt = 0;
    this.minUfoIntervalMs = 120000; // at least 120s between UFO spawns (rarer)
    // Configurable sky object defaults (can be overridden by config.json)
    this.skyMaxConcurrent = 1; // only one sky object at a time
    // Remove satellites globally by default
    this.skyPerTypeMax = { meteor: 1, satellite: 0, ufo: 1 };
    this.meteorProbByTod = null; // { day, dusk, night } optional override
    this.ufoChance = 0.015; // ~1.5% when available
    this.meteorCfg = {
        speedMin: 6,
        speedMax: 11.5,
    entryHeightFracMin: 0,
        entryHeightFracMax: 0.35,
        bolideChance: 0.12,
        clusterSpread: 120,
        burst: {
            chance: { day: 0, dusk: 0, night: 0 }, // disable meteor showers
            countMin: 1,
            countMax: 1,
            gapMinMs: 800,
            gapMaxMs: 1200
        },
        burn: {
            gravityVyPerFrame: 0.01,
            atmo: { day: 1.35, dusk: 1.15, night: 0.85 },
            sizeShrinkBase: 0.003,
            sizeShrinkSpeedFactor: 0.0009,
            burnUpSizeThreshold: 0.8,
            burnUpHeightMin: 40,
            burnUpProb: { day: 0.75, dusk: 0.6, night: 0.35 }
        }
    };
    // Persistent wrecks (char + smoke)
    this.wrecks = [];
    this._canyonDustTick = 0;
    // Supply crates spawn timing
    this.lastCrateAt = 0;
    this.minCrateIntervalMs = 30000; // at least 30s between spawns
    this.crateChancePerSec = 0.008; // ~0.8% chance per second when eligible
        // High-altitude projectile boundary ("sky ceiling"): allow shots to travel above the top
        // of the screen up to a configurable multiple of map height before culling.
        this.skyCeilingFactor = 3; // default to 3x map height above top
        this.skyCeilingY = -Math.max(0, Math.round(this.height * this.skyCeilingFactor));
        // Active tank highlight settings
        this.activeHighlightEnabled = true;
        this.activeHighlightIntensity = 1.0; // scales opacity and size subtly
    }
    
    // --- Lightweight persistence (last-game autosave) ---
    toSnapshot() { return snapshotSerialize(this); }

    saveSnapshotToStorage(reason) {
        try {
            const snap = this.toSnapshot();
            if (!snap) return;
            localStorage.setItem('se.lastGame.v1', JSON.stringify(snap));
            if (reason) { try { localStorage.setItem('se.lastGame._lastReason', String(reason)); } catch {} }
        } catch (e) {
            console.warn('[save] Failed to persist last game:', e);
        }
    }

    loadSnapshot(snapshot) { return snapshotLoad(this, snapshot); }

    // --- Testing API for automated gameplay testing ---
    getTestAPI() {
        return {
            // Get simplified game state for assertions
            getState: () => ({
                tanks: this.tanks.map(t => ({
                    x: t.x,
                    y: t.y,
                    health: t.health,
                    isAI: t.isAI,
                    name: t.name
                })),
                projectiles: this.projectiles.length,
                explosions: this.explosions.length,
                gameOver: this.gameOver,
                currentTurn: this.currentTankIndex,
                wind: this.wind,
                paused: this.paused,
                mode: this.mode,
                turnCount: this.turnCount || 0
            }),

            // Fire weapon with specific parameters
            simulateFire: (angle, power, weapon = null) => {
                if (angle !== undefined) { this.angle = angle; }
                if (power !== undefined) { this.power = power; }
                if (weapon) { this.tanks[this.currentTankIndex].weapon = weapon; }
                this.fire();
            },

            // Wait for turn to complete
            waitForTurnComplete: () => {
                return new Promise(resolve => {
                    const check = () => {
                        if (!this.isAnimating && !this.turnEnding && this.projectiles.length === 0) {
                            resolve();
                        } else {
                            setTimeout(check, 100);
                        }
                    };
                    check();
                });
            },

            // Skip to game over for testing victory conditions
            forceGameOver: (winnerIndex = 0) => {
                for (let i = 0; i < this.tanks.length; i++) {
                    if (i !== winnerIndex) {
                        this.tanks[i].health = 0;
                    }
                }
                this.checkVictory();
            },

            // Get console errors
            getErrors: () => {
                if (typeof window !== 'undefined' && window.__GAME_ERRORS__) {
                    return window.__GAME_ERRORS__;
                }
                return [];
            },

            // Check if game is in valid state
            isHealthy: () => {
                const issues = [];
                if (this.tanks.length === 0) { issues.push('No tanks'); }
                if (!this.terrain) { issues.push('No terrain'); }
                if (isNaN(this.wind)) { issues.push('Wind is NaN'); }
                if (this.tanks.some(t => isNaN(t.x) || isNaN(t.y))) { issues.push('Tank position NaN'); }
                return { healthy: issues.length === 0, issues };
            }
        };
    }

    async init() {
        // Load config
        try {
            const response = await fetch('config.json');
            this.config = await response.json();
            this.gravity = this.config.physics.gravity;
            this.velocityMultiplier = this.config.physics.velocityMultiplier || 0.74;
            this.windEffect = this.config.physics.windEffect ?? 0.015;
            // Air Nukes tuning from config if present
            try {
                const gcfg = this.config?.game?.airNukes;
                if (gcfg && typeof gcfg === 'object') {
                    if (typeof gcfg.speed === 'number') this.airNukes.speed = gcfg.speed;
                    if (typeof gcfg.altitude === 'number') this.airNukes.altitude = gcfg.altitude;
                    if (typeof gcfg.spacing === 'number') this.airNukes.spacing = gcfg.spacing;
                    if (typeof gcfg.passes === 'number') this.airNukes.passes = gcfg.passes;
                    if (typeof gcfg.gateInNoHeavy === 'boolean') this.airNukes.gateInNoHeavy = gcfg.gateInNoHeavy;
                }
                const lmc = this.config?.game?.landMine;
                if (lmc && typeof lmc === 'object') {
                    if (typeof lmc.radius === 'number') this.landMineCfg.radius = lmc.radius;
                    if (typeof lmc.damage === 'number') this.landMineCfg.damage = lmc.damage;
                    if (typeof lmc.triggerRadius === 'number') this.landMineCfg.triggerRadius = lmc.triggerRadius;
                    if (typeof lmc.armDelayMs === 'number') this.landMineCfg.armDelayMs = lmc.armDelayMs;
                    if (typeof lmc.color === 'string') this.landMineCfg.color = lmc.color;
                }
            } catch {}
            // Sky speeds (allow slowing down sun/moon)
            const skyCfg = this.config?.graphics?.sky || {};
            // Optional sky ceiling factor from config
            if (typeof skyCfg.ceilingFactor === 'number' && skyCfg.ceilingFactor > 1) {
                this.skyCeilingFactor = skyCfg.ceilingFactor;
            }
            // Recompute ceiling with current canvas height
            this.skyCeilingY = -Math.max(0, Math.round(this.height * this.skyCeilingFactor));
            if (typeof skyCfg.sunSpeed === 'number') this.skySpeeds.sun = skyCfg.sunSpeed;
            if (typeof skyCfg.moonSpeed === 'number') this.skySpeeds.moon = skyCfg.moonSpeed;
            // Sizes
            if (typeof skyCfg.sunRadius === 'number') this.skyKnobs.sunRadius = skyCfg.sunRadius;
            if (typeof skyCfg.moonRadius === 'number') this.skyKnobs.moonRadius = skyCfg.moonRadius;
            // Stars
            const starsCfg = skyCfg.stars || {};
            if (typeof starsCfg.count === 'number') this.skyKnobs.stars.count = starsCfg.count;
            else if (typeof this.config?.graphics?.starCount === 'number') this.skyKnobs.stars.count = this.config.graphics.starCount;
            if (typeof starsCfg.brightnessScale === 'number') this.skyKnobs.stars.brightnessScale = starsCfg.brightnessScale;
            if (typeof starsCfg.twinkleScale === 'number') this.skyKnobs.stars.twinkleScale = starsCfg.twinkleScale;
            if (typeof starsCfg.rotationRate === 'number') this.skyKnobs.stars.rotationRate = starsCfg.rotationRate;
            // Nebula
            if (typeof skyCfg.nebulaAlphaScale === 'number') this.skyKnobs.nebulaAlphaScale = skyCfg.nebulaAlphaScale;
            // Celestial blending tuning
            const blendCfg = skyCfg.celestial?.blending || {};
            if (typeof blendCfg.threshold === 'number') this.celestial._blendThreshold = blendCfg.threshold;
            if (typeof blendCfg.duskBoost === 'number') this.celestial._duskBoost = blendCfg.duskBoost;
            // Celestial knobs
            const celCfg = skyCfg.celestial || {};
            if (typeof celCfg.enabled === 'boolean') this.celestial.enabled = celCfg.enabled;
            if (typeof celCfg.cycleSeconds === 'number') this.celestial.cycleSeconds = celCfg.cycleSeconds;
            if (typeof celCfg.moonCycleSeconds === 'number') this.celestial.moonCycleSeconds = celCfg.moonCycleSeconds;
            if (typeof celCfg.speedScale === 'number') this.celestialSpeedScale = celCfg.speedScale;
            // Sky objects tuning
            const objs = this.config?.graphics?.skyObjects || {};
            if (typeof objs.spawnCooldownMs === 'number') this.skySpawnCooldownMs = objs.spawnCooldownMs;
            if (typeof objs.maxConcurrent === 'number') this.skyMaxConcurrent = objs.maxConcurrent;
            if (objs.perTypeMax && typeof objs.perTypeMax === 'object') this.skyPerTypeMax = { ...this.skyPerTypeMax, ...objs.perTypeMax };
            // Force-disable satellites regardless of config to remove clutter
            if (this.skyPerTypeMax) this.skyPerTypeMax.satellite = 0;
            // Probabilities
            if (objs?.probabilities?.meteor && typeof objs.probabilities.meteor === 'object') this.meteorProbByTod = { ...objs.probabilities.meteor };
            if (objs?.ufo?.chance != null) this.ufoChance = Number(objs.ufo.chance);
            if (objs?.ufo?.minIntervalMs != null) this.minUfoIntervalMs = Number(objs.ufo.minIntervalMs);
            // Support actor tuning (paratroopers)
            const supportCfg = this.config?.support || {};
            if (supportCfg.paratrooperPostAttackDelayMs != null) {
                this.paratrooperPostAttackDelayMs = Number(supportCfg.paratrooperPostAttackDelayMs);
            }
            // Flare defaults (weapons)
            const wcfg = this.config?.weapons || {};
            this.flareCfg = {
                radius: Math.max(60, Number(wcfg?.flare?.radius ?? 220)),
                durationMs: Math.max(500, Number(wcfg?.flare?.durationMs ?? 6000)),
                color: String(wcfg?.flare?.color ?? '#fff6b0')
            };
            this.parachuteFlareCfg = {
                radius: Math.max(60, Number(wcfg?.parachute_flare?.radius ?? 200)),
                durationMs: Math.max(500, Number(wcfg?.parachute_flare?.durationMs ?? 8000)),
                driftWindFactor: Number(wcfg?.parachute_flare?.driftWindFactor ?? 0.02),
                descentAccel: Number(wcfg?.parachute_flare?.descentAccel ?? 0.004),
                vyMax: Number(wcfg?.parachute_flare?.vyMax ?? 0.6),
                color: String(wcfg?.parachute_flare?.color ?? '#fff2a0')
            };
            // Meteor details
            const m = objs?.meteor || {};
            if (m.speed) {
                if (m.speed.min != null) this.meteorCfg.speedMin = Number(m.speed.min);
                if (m.speed.max != null) this.meteorCfg.speedMax = Number(m.speed.max);
            }
            if (m.entryHeightFrac) {
                if (m.entryHeightFrac.min != null) this.meteorCfg.entryHeightFracMin = Number(m.entryHeightFrac.min);
                if (m.entryHeightFrac.max != null) this.meteorCfg.entryHeightFracMax = Number(m.entryHeightFrac.max);
            }
            if (m.bolideChance != null) this.meteorCfg.bolideChance = Number(m.bolideChance);
            if (m.clusterSpread != null) this.meteorCfg.clusterSpread = Number(m.clusterSpread);
            if (m.burst) {
                if (m.burst.chance && typeof m.burst.chance === 'object') this.meteorCfg.burst.chance = { ...this.meteorCfg.burst.chance, ...m.burst.chance };
                if (Array.isArray(m.burst.countRange)) { this.meteorCfg.burst.countMin = Number(m.burst.countRange[0]); this.meteorCfg.burst.countMax = Number(m.burst.countRange[1]); }
                else {
                    if (m.burst.countMin != null) this.meteorCfg.burst.countMin = Number(m.burst.countMin);
                    if (m.burst.countMax != null) this.meteorCfg.burst.countMax = Number(m.burst.countMax);
                }
                if (Array.isArray(m.burst.gapMsRange)) { this.meteorCfg.burst.gapMinMs = Number(m.burst.gapMsRange[0]); this.meteorCfg.burst.gapMaxMs = Number(m.burst.gapMsRange[1]); }
                else {
                    if (m.burst.gapMinMs != null) this.meteorCfg.burst.gapMinMs = Number(m.burst.gapMinMs);
                    if (m.burst.gapMaxMs != null) this.meteorCfg.burst.gapMaxMs = Number(m.burst.gapMaxMs);
                }
            }
            if (m.burn) {
                const b = m.burn;
                if (b.gravityVyPerFrame != null) this.meteorCfg.burn.gravityVyPerFrame = Number(b.gravityVyPerFrame);
                if (b.atmosphere && typeof b.atmosphere === 'object') this.meteorCfg.burn.atmo = { ...this.meteorCfg.burn.atmo, ...b.atmosphere };
                if (b.sizeShrinkBase != null) this.meteorCfg.burn.sizeShrinkBase = Number(b.sizeShrinkBase);
                if (b.sizeShrinkSpeedFactor != null) this.meteorCfg.burn.sizeShrinkSpeedFactor = Number(b.sizeShrinkSpeedFactor);
                if (b.burnUpSizeThreshold != null) this.meteorCfg.burn.burnUpSizeThreshold = Number(b.burnUpSizeThreshold);
                if (b.burnUpHeightMin != null) this.meteorCfg.burn.burnUpHeightMin = Number(b.burnUpHeightMin);
                if (b.burnUpProb && typeof b.burnUpProb === 'object') this.meteorCfg.burn.burnUpProb = { ...this.meteorCfg.burn.burnUpProb, ...b.burnUpProb };
            }
        } catch (error) {
            console.error('Failed to load config:', error);
            this.config = { ai: { medium: { aimError: 8, powerError: 15, thinkTime: 1500 } } };
        }
        
    this.terrain = new Terrain(this.width, this.height);
    // Terrain profile is theme-driven (e.g., Canyon uses custom profile)
    this.terrainProfile = 'auto';
    // Reserve space for bottom controls bar so bedrock never hides behind UI
    try {
        const bottomBar = document.getElementById('bottom-controls');
        const margin = bottomBar ? (bottomBar.offsetHeight + 24) : 120; // fallback margin
        this.terrain.setReservedBottomMargin(margin);
    } catch {}
    // Apply initial theme (override or random) then generate terrain to match profile
    this.applyThemeFromOverrides(true);
    this.terrain.generate(this.terrainProfile || 'auto');
    if (this.terrainProfile === 'flat') {
        this.terrain.flattenSurface(this.terrain.groundLevel);
    }

        this.reseedWindForTurn(true);
        this.updateWindDisplay();

        this.updateUI();
    }

    handleResize() {
        // Store old dimensions for scaling tank positions
        const oldWidth = this.width;
        const oldHeight = this.height;

        // Update internal dimensions
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        // Recompute sky ceiling based on new height
        this.skyCeilingY = -Math.max(0, Math.round(this.height * this.skyCeilingFactor));

        // Calculate scale factors for repositioning
        const scaleX = oldWidth > 0 ? this.width / oldWidth : 1;
        const scaleY = oldHeight > 0 ? this.height / oldHeight : 1;

        // Resize terrain preserving shape
        if (this.terrain) {
            this.terrain.resize(this.width, this.height);
            // Re-apply reserved bottom margin after resize
            const bottomBar = document.getElementById('bottom-controls');
            const margin = bottomBar ? (bottomBar.offsetHeight + 24) : 120;
            this.terrain.setReservedBottomMargin(margin);
        }

        // Scale tank positions proportionally to maintain relative positions on terrain
        for (const t of this.tanks) {
            if (oldWidth > 0) {
                // Scale X position to match new width
                t.x = Math.max(0, Math.min(this.width - 1, Math.floor(t.x * scaleX)));
            }
            // Update tank to snap to new terrain height at scaled X position
            t.update(this.terrain);
        }

        // Ensure wind HUD scales to new width
        this.updateWindDisplay();
        // Reset sky burst state
        this.skyBurst = { remaining: 0, gapMs: 220, clusterX: null };
        // Reset cave decorations on theme change
        this.caveStalactites = null;
    }

    // Configure and start a new game using setup modal options
    startNewGameWithConfig(cfg) {
        // Clear any stale blockers before resetting
        this.cancelEndTurn();
        this.turnEnding = false;
        this.isAnimating = false;
        this.holdingForSupport = false;
        this.deferTurnForParatroopers = false;
        if (this._pauseReasons) this._pauseReasons.clear();
        this.paused = false;
        this.fireLocked = false;
        // Ensure any lingering AI-skip modal is hidden when starting a new game
        try { document.getElementById('skip-modal')?.classList.add('hidden'); } catch {}
        // Hide the no-game overlay when starting a game
        try {
            const overlay = document.getElementById('no-game-overlay');
            if (overlay) overlay.style.display = 'none';
        } catch {}
    // Mode and teams
        this.mode = cfg.mode || 'classic';
        this.teams = Array.isArray(cfg.teams) ? cfg.teams.slice(0) : null;
    // Streamer display option: hide other players' name tags
    this.hideOtherNames = !!cfg.disableNames;
    // Allow all players to drive during other players' turns
    this.allowDriveAnytime = !!cfg.allowDriveAnytime;
        // Theme/time overrides
        this.themeOverride = cfg.theme === 'random' ? null : cfg.theme;
        // Static time toggle: if enabled, use the specified time (or current time if auto)
        // If disabled, allow day/night cycling (timeOfDayOverride = null)
        if (cfg.staticTime) {
            this.timeOfDayOverride = cfg.time === 'auto' ? this.pickRandomTimeOfDay() : cfg.time;
        } else {
            this.timeOfDayOverride = cfg.time === 'auto' ? null : cfg.time;
        }
        // Wind
        this.setWindMode(cfg.windMode || 'low');
        // Players
        let total = Math.max(1, Math.min(8, Number(cfg.totalPlayers || 2)));
        let humans = Math.max(0, Math.min(total, Number(cfg.humanPlayers || 1)));
        const slots = Array.isArray(cfg.slots) ? cfg.slots : null;
        if (Array.isArray(slots) && slots.length > 0) {
            total = Math.min(8, slots.length);
            // Occasional short meteor shower support
            this.skyBurst = { remaining: 0, gapMs: 220, clusterX: null };
            humans = Math.max(0, slots.slice(0, total).filter(s => s?.type === 'human').length);
        }
        if (this.mode === 'solo') { total = 1; humans = 1; this.teams = null; }
        // Record whether any humans were present at the start of this match
        this.hadHumansAtStart = humans > 0;
        // Ensure teams length matches total slots if in teams mode
        if (this.mode === 'teams' && Array.isArray(this.teams)) {
            this.teams = this.teams.slice(0, total);
        }
    const aiDiff = cfg.aiDifficulty || 'medium';
    // Ammo mode from setup
    this.ammoMode = cfg.ammoMode || 'unlimited';
    // Remember custom counts for debug refills
    this.configuredAmmoCounts = (this.ammoMode === 'custom' && cfg?.ammoCounts) ? { ...cfg.ammoCounts } : null;

        // Terrain profile override MUST be set BEFORE reset() so applyThemeFromOverrides doesn't override it
        if (cfg.terrainProfile && cfg.terrainProfile !== 'random') {
            this.terrainProfile = cfg.terrainProfile;
        }

        // Clear lastGameConfig BEFORE calling reset() to prevent infinite recursion
        this.lastGameConfig = null;
        this.reset();

        // Store the config for restart functionality - AFTER reset() completes
        this.lastGameConfig = cfg ? JSON.parse(JSON.stringify(cfg)) : null;

        // Regenerate terrain with the correct profile after reset
        if (cfg.terrainProfile && cfg.terrainProfile !== 'random') {
            if (this.terrain && typeof this.terrain.generate === 'function') {
                this.terrain.generate(this.terrainProfile);
                if (this.terrainProfile === 'flat') {
                    this.terrain.flattenSurface(this.terrain.groundLevel);
                }
            }
        }
        // Rebuild tanks according to players
        this.tanks = [];
        const colors = ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#00ff88'];
        // Randomized, well-separated spawn X positions
        const xs = this.generateSpawnPositions(total);
        let aiCounter = 0;
        for (let i = 0; i < total; i++) {
            const x = xs[i];
            let y = this.terrain.getHeight(x);
            let isAI, skill, name, color, style;
            if (this.mode !== 'solo' && slots && slots[i]) {
                const slot = slots[i];
                if (slot.type === 'human') {
                    isAI = false;
                    skill = 'medium';
                    name = slot.name || `Player ${i + 1}`;
                    color = slot.color || colors[i % colors.length];
                    style = slot.style || 'classic';
                } else {
                    isAI = true;
                    skill = slot.difficulty || aiDiff;
                    aiCounter += 1;
                    name = `AI ${aiCounter} (${skill})`;
                    color = colors[i % colors.length];
                    style = slot.style || 'classic';
                }
            } else {
                // Fallback to counts-based assignment
                isAI = i >= humans;
                skill = isAI ? aiDiff : 'medium';
                const humanIndex = isAI ? -1 : i; // 0..humans-1 when human
                const userMeta = (!isAI && Array.isArray(cfg.humans)) ? cfg.humans[humanIndex] : null;
                name = isAI ? `AI ${i - humans + 1} (${skill})` : (userMeta?.name || `Player ${i + 1}`);
                color = isAI ? colors[i % colors.length] : (userMeta?.color || colors[i % colors.length]);
                style = 'classic';
            }

            // Solo mode forces 1 human player regardless of slots
            if (this.mode === 'solo') {
                isAI = false;
                skill = 'medium';
                name = (slots && slots[0]?.type === 'human' && slots[0]?.name) ? slots[0].name : 'Player 1';
                color = (slots && slots[0]?.type === 'human' && slots[0]?.color) ? slots[0].color : colors[0];
            }

            // Create appropriate vehicle based on terrain type AND theme
            let vehicle;
            // Use underwater vehicles if either terrain is ocean OR theme is ocean
            const shouldUseUnderwaterVehicles = this.terrain?._isOceanTerrain ||
                                                this.themeName === 'ocean' ||
                                                (this.terrain?.profile === 'ocean');

            if (shouldUseUnderwaterVehicles) {
                // Ocean mode: create submarines, ships, or bases
                // Ensure water surface is set
                if (!this.terrain.waterSurfaceY) {
                    // Set a default water surface if not already set
                    this.terrain.waterSurfaceY = this.canvas.height * 0.3;
                    this.terrain._isOceanTerrain = true;
                }
                const vehicleType = (slots && slots[i]?.vehicleType) || 'submarine';
                if (vehicleType === 'ship') {
                    vehicle = new SurfaceShip(x, y, color, name, isAI, skill);
                } else if (vehicleType === 'base') {
                    vehicle = new UnderwaterBase(x, y, color, name);
                } else {
                    // Default to submarine - spawn at various depths
                    const waterSurface = this.terrain.waterSurfaceY || 0;
                    const floorY = this.terrain.getHeight(x);
                    // Randomize depth: between 20% and 80% of the water column
                    const waterDepth = floorY - waterSurface;
                    const minDepth = waterSurface + waterDepth * 0.2;
                    const maxDepth = waterSurface + waterDepth * 0.8;
                    y = minDepth + Math.random() * (maxDepth - minDepth);
                    vehicle = new Submarine(x, y, color, name, isAI, skill);
                }
            } else {
                // Land mode: create regular tank
                vehicle = new Tank(x, y, color, name, isAI, skill, this.config?.tank);
                vehicle.style = style || 'classic';
            }

            // Apply overrides
            if (this.healthOverride !== null) {
                vehicle.health = this.healthOverride;
                vehicle.maxHealth = this.healthOverride;
            }
            // Apply health multiplier from config (100 = normal, 150 = 1.5x, 200 = 2x, etc.)
            if (cfg?.healthMultiplier && cfg.healthMultiplier !== 100) {
                const multiplier = cfg.healthMultiplier / 100;
                vehicle.health = Math.round(vehicle.health * multiplier);
                vehicle.maxHealth = Math.round(vehicle.maxHealth * multiplier);
            }
            if (this.fuelMode === 'double') {
                vehicle.fuel = 400; vehicle.maxFuel = 400;
            } else if (this.fuelMode === 'unlimited') {
                vehicle.fuel = 999999; vehicle.maxFuel = 999999;
            }
            // Initialize ammo inventory according to ammo mode
            this.initializeAmmoForTank(vehicle, cfg);
            this.tanks.push(vehicle);
        }
    this.currentTankIndex = 0;
    // Ensure all tanks are snapped to the current terrain surface
    this.ensureTanksOnSurface();
        // Solo setup
        if (this.mode === 'solo') {
            this.soloActive = true;
            this.soloScore = 0;
            this.soloTargetsHit = 0;
            // Clamp goal from setup (default 10)
            const goal = Number(cfg?.soloTargets ?? 10);
            this.soloTargetGoal = Math.max(1, Math.min(50, Number.isFinite(goal) ? goal : 10));
            // Shots selection: 10, 20, or unlimited
            const shotsVal = cfg?.soloShots;
            if (shotsVal === 'unlimited') {
                this.soloShotsTotal = null; // unlimited
            } else {
                const n = Number.parseInt(shotsVal ?? '10');
                this.soloShotsTotal = Number.isFinite(n) ? Math.max(1, Math.min(999, n)) : 10;
            }
            this.soloShotsUsed = 0;
            this.spawnSoloTarget();
        } else {
            this.soloActive = false;
            this.soloScore = 0;
            this.soloTarget = null;
            this.soloTargetsHit = 0;
            this.soloTargetGoal = 0;
            this.soloShotsTotal = null;
            this.soloShotsUsed = 0;
        }
        // Realtime mode setup: reset AI cooldowns
        if (this.mode === 'realtime') {
            this.aiCooldowns.clear();
        }

        // Initial wind per wind mode
        this.reseedWindForTurn(true);
        this.updateUI();
        // Ensure controls reflect whose turn it is at game start
        this.fireLocked = false;
        const currentTank = this.tanks[this.currentTankIndex];
        if (this.mode === 'realtime') {
            // Realtime mode: always enable controls for human players
            this.enableControls();
        } else if (currentTank?.isAI) {
            // Disable player inputs while AI takes first turn
            this.disableControls();
            const token = this.turnToken;
            setTimeout(() => {
                if (token !== this.turnToken) return; // Game state changed
                this.performAITurn();
            }, 1200);
        } else {
            // Human starts: make sure inputs are enabled
            this.enableControls();
        }
        // Autosave right after a new game is configured
        try { this.saveSnapshotToStorage('newGame'); } catch {}
    }

    initializeAmmoForTank(tank, cfg) {
        const mode = this.ammoMode || 'unlimited';
        tank.unlimitedAmmo = (mode === 'unlimited');
        tank.ammo = {};
        if (tank.unlimitedAmmo) return;
        const standard = {
            missile: 20, homing: 4, heavy: 4, nuke: 1, emp: 2, laser: 3,
            cluster: 3, bunker: 2, mirv: 3, funky: 2, drill: 3, acid: 3,
            napalm: 3, tracer: 5, smoke_bomb: 3, flare: 3, parachute_flare: 2, marker_attack: 2,
            marker_medic: 2, marker_airstrike: 1, marker_airnukes: 1, supply_crate: 1, bouncing_bomb: 3, shield: 2,
            land_mine: 2,
            // Underwater weapons
            torpedo: 15, depth_charge: 10, underwater_mine: 3
        };
        if (mode === 'missile-only') { tank.ammo.missile = 999; return; }
        if (mode === 'standard') { tank.ammo = { ...standard }; return; }
        if (mode === 'no-heavy') {
            const copy = { ...standard };
            for (const w of this.heavyWeapons) copy[w] = 0;
            tank.ammo = copy;
            if (!Number.isFinite(tank.ammo.missile) || tank.ammo.missile <= 0) tank.ammo.missile = 20;
            return;
        }
        if (mode === 'custom') {
            const counts = cfg?.ammoCounts || {};
            for (const [k, v] of Object.entries(counts)) {
                tank.ammo[k] = Math.max(0, Math.trunc(Number(v)));
            }
            if (!Object.keys(tank.ammo).length) tank.ammo.missile = 20;
            return;
        }
    }

    setWindMode(mode) {
        const allowedModes = new Set(['none', 'low', 'high', 'random-per-turn']);
        this.windMode = allowedModes.has(mode) ? mode : 'low';
        if (this.terrain) {
            this.reseedWindForTurn(true);
            this.updateWindDisplay();
        }
    }

    isOceanMap() {
        return !!(this.terrain && (this.terrain._isOceanTerrain || this.terrain.isOcean));
    }

    getWeaponRestrictionReason(weaponKey, tank = this.getCurrentTank(), options = {}) {
        const { ignoreAmmo = false } = options;
        if (!weaponKey) return 'No weapon selected.';

        if (this.ammoMode === 'missile-only' && weaponKey !== 'missile') {
            return 'Missile Only mode is active.';
        }
        if (this.ammoMode === 'no-heavy' && this.heavyWeapons.has(weaponKey)) {
            return 'Heavy weapons are disabled in this mode.';
        }
        if (this.ammoMode === 'laser-only' && weaponKey !== 'laser') {
            return 'Laser Only mode is active.';
        }
        if (this.ammoMode === 'explosive-only') {
            const explosives = new Set(['missile', 'homing', 'heavy', 'nuke', 'cluster', 'bunker', 'mirv', 'funky', 'drill', 'bouncing_bomb']);
            if (!explosives.has(weaponKey)) return 'Explosives Only mode is active.';
        }
        if (this.ammoMode === 'marker-only') {
            const markers = new Set(['marker_attack', 'marker_medic', 'marker_airstrike', 'marker_airnukes']);
            if (!markers.has(weaponKey)) return 'Marker Only mode is active.';
        }
        if (this.ammoMode === 'basic-weapons') {
            const basicWeapons = new Set(['missile', 'homing', 'cluster']);
            if (!basicWeapons.has(weaponKey)) return 'Basic Weapons mode is active.';
        }

        const isOcean = this.isOceanMap();
        if (this.waterOnlyWeapons?.has(weaponKey) && !isOcean) {
            return 'This weapon is only available on underwater maps.';
        }
        if (this.landOnlyWeapons?.has(weaponKey) && isOcean) {
            return 'This weapon does not work underwater.';
        }

        if (!ignoreAmmo && tank && !tank.unlimitedAmmo) {
            const available = tank.getAmmo?.(weaponKey) ?? 0;
            if (available <= 0) return 'Out of ammo for this weapon!';
        }

        return null;
    }

    canUseWeapon(weaponKey, tank = this.getCurrentTank(), options = {}) {
        return !this.getWeaponRestrictionReason(weaponKey, tank, options);
    }

    getFallbackWeapon(tank, options = {}) {
        const order = options.order || [
            'missile','tracer','homing','cluster','heavy','acid','napalm','bouncing_bomb',
            'torpedo','homing_torpedo','depth_charge','smoke_bomb','flare','parachute_flare',
            'shield','land_mine','supply_crate'
        ];
        for (const weaponKey of order) {
            if (this.canUseWeapon(weaponKey, tank)) return weaponKey;
        }
        for (const weaponKey of order) {
            if (this.canUseWeapon(weaponKey, tank, { ignoreAmmo: true })) return weaponKey;
        }
        return tank?.weapon || 'missile';
    }

    ensureTankWeaponSelection(tank = this.getCurrentTank()) {
        if (!tank) return 'missile';
        if (this.canUseWeapon(tank.weapon, tank)) return tank.weapon;
        tank.weapon = this.getFallbackWeapon(tank);
        return tank.weapon;
    }

    getInputBlockedReason(includeFireLock = false) {
        if (this.gameOver) return 'Game is over';
        if (this.paused) return 'Game is paused';
        if (this.turnEnding) return 'Turn is ending...';
        if (this.isAnimating) return 'Animation in progress...';
        if (this.holdingForSupport) return 'Waiting for support action...';
        if (includeFireLock && this.fireLocked) return 'Fire is locked';
        return null;
    }
    
    spawnTanks(count) {
        this.tanks = [];
        const colors = ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const xs = this.generateSpawnPositions(count);
        // Use underwater vehicles if either terrain is ocean OR theme is ocean
        const isOcean = !!(this.terrain && (this.terrain._isOceanTerrain ||
                                            this.themeName === 'ocean' ||
                                            this.terrain.profile === 'ocean'));
        // Ensure water surface is set for ocean maps
        if (isOcean && !this.terrain.waterSurfaceY) {
            this.terrain.waterSurfaceY = this.canvas.height * 0.3;
            this.terrain._isOceanTerrain = true;
        }
        const waterY = (isOcean && Number.isFinite(this.terrain.waterSurfaceY)) ? this.terrain.waterSurfaceY : null;

        for (let i = 0; i < count; i++) {
            let x = xs[i];
            // Clamp to canyon bounds if present
            const bounds = this.terrain?.getMovementBounds?.();
            if (bounds && this.themeName === 'canyon') {
                const [minX, maxX] = bounds;
                const pad = 12;
                x = Math.max(minX + pad, Math.min(maxX - pad, x));
            }
            let y = this.terrain.getHeight(x);
            const isAI = i > 0;
            const aiSkill = isAI ? this.aiDifficulty : 'medium';
            const name = isAI ? `AI ${i} (${aiSkill})` : 'Player 1';

            // On ocean terrain, spawn ocean-appropriate vehicles by default
            let tank;
            if (isOcean) {
                // Alternate between submarines and surface ships for variety
                const useShip = (i % 2 === 1) && (waterY != null);
                if (useShip) {
                    y = Math.max(0, Math.min(this.height - 1, (waterY ?? y) + 2));
                    tank = new SurfaceShip(x, y, colors[i % colors.length], name, isAI, aiSkill);
                } else {
                    // Spawn submarine at a sensible depth between surface and floor
                    const surface = (waterY != null) ? waterY : 0;
                    const floorY = this.terrain.getHeight(x);
                    const waterDepth = Math.max(20, floorY - surface);
                    const minDepth = surface + waterDepth * 0.25;
                    const maxDepth = surface + waterDepth * 0.75;
                    y = Math.max(surface + 15, Math.min(floorY - 15, minDepth + Math.random() * (maxDepth - minDepth)));
                    tank = new Submarine(x, y, colors[i % colors.length], name, isAI, aiSkill);
                }
            } else {
                tank = new Tank(x, y, colors[i % colors.length], name, isAI, aiSkill, this.config?.tank);
            }
            
            // Apply health override if set
            if (this.healthOverride !== null) {
                tank.health = this.healthOverride;
                tank.maxHealth = this.healthOverride;
            }
            
            // Apply fuel mode
            if (this.fuelMode === 'double') {
                tank.fuel = 400;
                tank.maxFuel = 400;
            } else if (this.fuelMode === 'unlimited') {
                tank.fuel = 999999;
                tank.maxFuel = 999999;
            }
            
            // Snap immediately to ensure on-surface placement
            tank.update(this.terrain);
            this.tanks.push(tank);
        }
        // Final pass to guarantee everyone is on the surface
        this.ensureTanksOnSurface();
    }
    
    start() {
        this.generateNebula();
        this.initClouds();
        // Kick off the render/update loop
        this.gameLoop(0);
        
        // Check if AI goes first
        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank?.isAI) {
            setTimeout(() => {
                this.performAITurn();
            }, 1500);
        }
    }
    
    gameLoop(timestamp) {
        const now = timestamp || (performance.now?.() || Date.now());
        const deltaTime = this.lastFrameTime ? (now - this.lastFrameTime) : 16;
        this.lastFrameTime = now;

        if (!this.paused) this.update(deltaTime);
        this.render();

        this.animationFrameId = (globalThis.requestAnimationFrame || requestAnimationFrame)(this.gameLoop.bind(this));
    }

    // Advance simulation state (physics, particles, AI helpers)
    update(deltaTime) {
        const dt = Math.max(1, deltaTime || 16);
        // Advance sky clock for sun/moon/cloud drift
        this.skyTime = (this.skyTime || 0) + dt / 1000;
        // Advance clamped animation clock used for stars/visual-only effects to prevent big jumps after tab sleep
        const maxStep = 0.1; // cap to ~100ms visual step to avoid popping
        this.skyAnimTime = (this.skyAnimTime || 0) + Math.min(dt / 1000, maxStep);

    // Advance celestial cycle when in auto time-of-day mode
    // Note: graphics.sky.sunSpeed and graphics.sky.moonSpeed act as multipliers for
    // cycleSeconds and moonCycleSeconds respectively in celestial mode.
        try {
            const cel = this.celestial || {};
            const autoTime = (this.timeOfDayOverride == null);
            if (cel.enabled && autoTime) {
                // Clamp per-frame progression so the cycle doesn't jump after tab sleep
                const step = Math.min(dt / 1000, 0.1);
                const cyc = Math.max(10, Number(cel.cycleSeconds) || 180);
                const sunRate = Math.max(0, Number(this.skySpeeds?.sun ?? 1)) || 1;
                cel.progress = (cel.progress + (step / cyc) * sunRate * (this.celestialSpeedScale ?? 1)) % 1;
                const mcyc = Math.max(10, Number(cel.moonCycleSeconds) || 600);
                const moonRate = Math.max(0, Number(this.skySpeeds?.moon ?? 1)) || 1;
                cel.moonPhase = (cel.moonPhase + (step / mcyc) * moonRate * (this.celestialSpeedScale ?? 1)) % 1;

                // Compute blend factors for day/dusk/night based on a smooth sun height curve
                const a = cel.progress * Math.PI * 2 - Math.PI / 2; // -90deg sunrise at p≈0
                const k = Math.sin(a); // sun height proxy (-1..1)
                // Smoothstep helper
                const sstep = (x0, x1, x) => {
                    const t = Math.max(0, Math.min(1, (x - x0) / Math.max(1e-6, x1 - x0)));
                    return t * t * (3 - 2 * t);
                };
                // Day/night thresholds are configurable
                const thr = this.celestial?._blendThreshold ?? 0.6; // slightly earlier day onset
                // Day grows from k>=0 to k>=~thr
                const dayF = sstep(0.0, thr, k);
                // Night grows from -k>=0 to -k>=~thr (i.e., k<=0 downwards)
                const nightF = sstep(0.0, thr, -k);
                // Dusk dominates near horizon (|k| small); take a bell around k≈0
                let duskF = 1 - Math.max(dayF, nightF);
                // Optionally boost dusk to make twilight last longer
                const duskBoost = this.celestial?._duskBoost ?? 0.65; // extend twilight brightness a bit
                duskF = Math.min(1, duskF * (1 + duskBoost));
                // Normalize to sum ~1
                const sum = dayF + duskF + nightF || 1;
                cel.blends = { day: dayF / sum, dusk: duskF / sum, night: nightF / sum };

                // Visual alphas
                cel.sunAlpha = Math.max(0, Math.min(1, cel.blends.day + cel.blends.dusk * 0.8));
                cel.moonAlpha = Math.max(0, Math.min(1, cel.blends.night + cel.blends.dusk * 0.6));
                cel.starsAlpha = Math.max(0, Math.min(1, cel.blends.night + cel.blends.dusk * 0.5));
                cel.nebulaAlpha = Math.max(0, Math.min(1, cel.blends.night));
                this.celestial = cel;
            }
        } catch {}

        // Update projectiles and resolve collisions
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            let wind = this.windOverride ?? this.wind;
            const g = this.gravityOverride ?? this.gravity;
            // Napalm stream emission while in flight: spawn falling droplets along trajectory
            if (projectile.type === 'napalm') {
                // Create or reuse a napalm hazard attached to this projectile
                if (!projectile._napalmHazard) {
                    const hx = Math.max(0, Math.min(this.width - 1, Math.floor(projectile.x)));
                    const hy = (this.terrain ? this.terrain.getHeight(hx) : projectile.y) - 2;
                    const hz = {
                        type: 'napalm',
                        mode: 'flow',
                        x: projectile.x,
                        y: hy,
                        ticksEveryMs: 300,
                        dps: 14,
                        lifeMs: 11000,
                        ageMs: 0,
                        nodes: [],
                        seedRadius: 50,
                        noAutoSeed: true // prevent initial seeding at shooter location
                    };
                    this.hazards.push(hz);
                    projectile._napalmHazard = hz;
                    projectile._emitAccum = 0;
                    // Cache owner position at launch for safety checks
                    if (projectile.owner) {
                        hz._ownerId = projectile.owner.id ?? projectile.owner.name ?? 'owner';
                        hz._ownerStartX = projectile.owner.x;
                        hz._ownerStartY = projectile.owner.y;
                    }
                }
                // Only start emission after apex OR a short travel, to avoid sparks near the shooter
                // Track whether it has ascended (vy < 0 at any time). When vy >= 0 afterwards, apex reached.
                projectile._hadNegativeVy = projectile._hadNegativeVy || (projectile.vy < 0);
                if (!projectile._apexReached && projectile._hadNegativeVy && projectile.vy >= 0) {
                    projectile._apexReached = true;
                }
                // Track launch point specifically for napalm emission gating
                if (projectile._napalmStartX == null) {
                    projectile._napalmStartX = projectile.x;
                    projectile._napalmStartY = projectile.y;
                }
                const dxE = (projectile.x - projectile._napalmStartX);
                const dyE = (projectile.y - projectile._napalmStartY);
                const traveledE = Math.hypot(dxE, dyE);
                const minEmitDistance = 80; // pixels away from muzzle before any sparks
                const minEmitFrames = 12; // or a few frames of flight
                const canEmit = projectile._apexReached || (traveledE >= minEmitDistance) || ((projectile.framesAlive || 0) >= minEmitFrames);
                if (canEmit) {
                    // Safety radius around the firing tank to prevent self-damage from newly emitted droplets
                    const hz = projectile._napalmHazard;
                    let nearOwner = false;
                    if (hz && hz._ownerStartX != null) {
                        const dxO = projectile.x - hz._ownerStartX;
                        const dyO = projectile.y - (hz._ownerStartY - 10);
                        const dO = Math.hypot(dxO, dyO);
                        // Require both distance and some descent to start emitting near the owner
                        if (dO < 120) nearOwner = true;
                    }
                    if (!nearOwner) {
                        // Only emit when clear of safety radius
                    // Convert dt to ms via an accumulator stored on game for simplicity
                    projectile._emitAccum = (projectile._emitAccum || 0) + (this._frameDtMs || 16);
                    // Prevent large catch-up bursts after a slow frame
                    if (projectile._emitAccum > 150) projectile._emitAccum = 150;
                    const emitEveryMs = 80; // Performance: reduced from 50ms (12.5 droplets/sec instead of 20)
                    while (projectile._emitAccum >= emitEveryMs) {
                        projectile._emitAccum -= emitEveryMs;
                        const hz = projectile._napalmHazard;
                        if (hz?.nodes && hz.nodes.length < 90) {
                            // Spawn a droplet slightly behind current position for a streak look
                            const ang = Math.atan2(projectile.vy, projectile.vx);
                            const back = 6 + Math.random() * 4;
                            const px = projectile.x - Math.cos(ang) * back + (Math.random() - 0.5) * 2;
                            const py = projectile.y - Math.sin(ang) * back + (Math.random() - 0.5) * 2;
                            const sp = Math.hypot(projectile.vx, projectile.vy);
                            // Droplet initial velocity is a damped continuation of projectile with gravity pull
                            const dv = Math.max(0.55, Math.min(0.95, 0.7 + (Math.random() - 0.5) * 0.16));
                            // Much slower velocities for liquid-like behavior
                            const vx = Math.cos(ang) * sp * 0.04 * dv + (Math.random() - 0.5) * 0.03;
                            const vy = Math.sin(ang) * sp * 0.04 * dv + 0.08 + (Math.random() * 0.03);
                            const rr = 12 + Math.random() * 8; // larger droplets merge better into smooth liquid
                            // Start as falling so they drop to ground, then stick and flow
                            hz.nodes.push({ x: px, y: py, vx, vy, r: rr, m: massFromRadius(rr), falling: true });
                            // Small flame particles for visual streak (downward only) - reduced radius from 6 to 4
                            try { this.particleSystem.createExplosionDownward(px, py, 4, '#ff8a3a'); } catch {}
                        }
                    }
                    } // End of !nearOwner check - allow projectile to continue updating even if near owner
                }
            }
            if (projectile.type === 'homing') {
                const target = this.getNearestEnemyTank(projectile.owner);
                if (target) {
                    // Enable homing only after traveling the gated distance (70% of initial)
                    if (!projectile._homeEnabled) {
                        // Multiple gates to enable homing:
                        // 1) Displacement threshold from launch (conservative, clamped)
                        const dx0 = (projectile.x - (projectile._startX ?? projectile.x));
                        const dy0 = (projectile.y - (projectile._startY ?? projectile.y));
                        const traveled = Math.hypot(dx0, dy0);
                        if (traveled >= (projectile._homeThreshold ?? 0)) {
                            projectile._homeEnabled = true;
                        }
                        // 2) After apex (start descending), it's safe to lock
                        if (!projectile._homeEnabled && projectile.vy > 0) {
                            projectile._homeEnabled = true;
                        }
                        // 3) Frame-based fallback timer
                        if (!projectile._homeEnabled && typeof projectile._homeDelayFrames === 'number') {
                            projectile._homeDelayFrames -= 1;
                            if (projectile._homeDelayFrames <= 0) {
                                projectile._homeEnabled = true;
                            }
                        }
                    }
                    if (!projectile._homeEnabled) {
                        // Before homing is enabled, nudge up if skimming ground and reduce wind to keep arc smooth
                        const ground = this.terrain.getHeight(projectile.x);
                        if (projectile.y >= ground - 10) {
                            projectile.vy -= 0.5;
                        }
                        wind *= 0.6;
                        // Skip guidance until threshold reached
                    } else {
                    const dx = target.x - projectile.x;
                    const dy = (target.y - 10) - projectile.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const desiredSpeed = 8.0; // slightly faster guidance
                    const desiredVx = (dx / dist) * desiredSpeed;
                    const desiredVy = (dy / dist) * desiredSpeed;
                    const steer = 0.14; // stronger steer to correct quickly
                    projectile.vx = projectile.vx * (1 - steer) + desiredVx * steer;
                    projectile.vy = projectile.vy * (1 - steer) + desiredVy * steer;
                    // Clamp resultant speed to keep control
                    const sp = Math.hypot(projectile.vx, projectile.vy);
                    const maxSp = 9;
                    if (sp > maxSp) {
                        projectile.vx = (projectile.vx / sp) * maxSp;
                        projectile.vy = (projectile.vy / sp) * maxSp;
                    }
                    // Ground avoidance: if we're about to skim the ground, add a bit of lift
                    const ground = this.terrain.getHeight(projectile.x);
                    if (projectile.y >= ground - 12) {
                        projectile.vy -= 0.6; // pop up
                        projectile.vx *= 0.97; // slight dampen to aid climb
                    }
                    // Reduce wind effect on homing for more predictable tracking
                    wind *= 0.35;
                    }
                }
            }
            // Detect apex for parachute flare and convert into a parachute support actor
            if (projectile.type === 'parachute_flare' && projectile.vy > 0 && !projectile._deployed) {
                projectile._deployed = true;
                // Spawn a descending parachute flare actor at current position
                const actor = { type: 'flare_chute', x: projectile.x, y: projectile.y, vx: 0, vy: 0.12, state: 'descending', owner: projectile.owner };
                this.supportActors.push(actor);
                try { document.dispatchEvent(new CustomEvent('game:parachute-deploy')); } catch {}
                // Remove the ballistic projectile (no impact)
                this.projectiles.splice(i, 1);
                this.addLog('Parachute flare deployed at apex.', 'info');
                // End the turn shortly; flare will continue descending asynchronously
                this.scheduleEndTurn(400);
                continue;
            }

            // Detect apex for cluster bomb and split into bomblets
            // Only split if projectile has been alive for at least a few frames and is clearly descending past apex
            if (projectile.type === 'cluster' && projectile.vy > 2 && !projectile._split && projectile.framesAlive > 3) {
                projectile._split = true;
                // Spawn bomblets at apex with spread pattern - all moving downward
                const count = 6;
                for (let k = 0; k < count; k++) {
                    const angle = (Math.PI / 6) * (k - (count - 1) / 2);
                    const speed = 5 + Math.random() * 3;
                    const vx = Math.cos(angle) * speed;
                    // Ensure all bomblets have downward velocity (positive vy)
                    const vy = 2 + Math.random() * 4;
                    const bomblet = new Projectile(projectile.x, projectile.y, vx, vy, 'bomblet', this.config?.weapons);
                    bomblet.owner = projectile.owner;
                    bomblet.minFramesBeforeCollision = 2;
                    this.projectiles.push(bomblet);
                }
                // Create visual effect for cluster split
                try {
                    this.particleSystem.createExplosion(projectile.x, projectile.y, 30, '#ffaa00');
                } catch {}
                // Remove the main cluster projectile
                this.projectiles.splice(i, 1);
                this.addLog('Cluster bomb split at apex.', 'info');
                continue;
            }

            // Track per-frame dt for emitters
            const dtForFrame = (this._lastUpdateAt != null) ? ((performance.now?.() || Date.now()) - this._lastUpdateAt) : 16;
            this._frameDtMs = Math.max(1, Math.min(50, dtForFrame));
            this._lastUpdateAt = (performance.now?.() || Date.now());
            projectile.update(wind, g, this.windEffect, this.terrain, this.tanks);

            // Offscreen culling to prevent indefinite flight / frozen turns
            // If a projectile leaves the playable area, remove it immediately.
            // When no projectiles remain (turn-based modes), schedule endTurn so play advances.
            const offMargin = 60; // small margin beyond edges
            const topLimit = (this.skyCeilingY != null) ? this.skyCeilingY : -offMargin;
            if (projectile.x < -offMargin || projectile.x > this.width + offMargin || projectile.y < topLimit || projectile.y > this.height + offMargin) {
                this.projectiles.splice(i, 1);
                if (this.projectiles.length === 0) {
                    // Clear animation gates and advance the turn shortly in non-realtime modes
                    this.isAnimating = false;
                    if (this.mode !== 'realtime') {
                        this.scheduleEndTurn(250);
                    } else {
                        // In realtime, reset firing latch so humans can act again
                        if (this.turnEnding) this.turnEnding = false;
                        if (this.fireLocked) this.fireLocked = false;
                    }
                }
                continue;
            }

            // Create bubble trail for underwater projectiles
            if (this.terrain?._isOceanTerrain && this.terrain.waterSurfaceY != null) {
                if (projectile.y > this.terrain.waterSurfaceY && Math.random() < 0.15) {
                    this.particleSystem.createBubbles(projectile.x, projectile.y, 2);
                }
            }

            if (projectile.canCollide()) {
                // Drill and bunker buster special case
                if (projectile.isDrill || projectile.isBunker) {
                    const terrainHeight = this.terrain.getHeight(projectile.x);
                    if (projectile.y >= terrainHeight - 2) {
                        // Dig through terrain
                        const r = projectile.drillRadius || 6;
                        this.terrain.drill(projectile.x, projectile.y, r);
                        if (projectile.isBunker) {
                            projectile.bunkerPenetrating = true;
                            projectile.bunkerFrames++;
                            // After short penetration, detonate deeper
                            if (projectile.bunkerFrames > 18) {
                                this.handleImpact(projectile);
                                this.projectiles.splice(i, 1);
                                continue;
                            }
                        }
                        // Continue flight while tunneling
                    } else {
                        // Drill a bit when skimming near ground
                        if (projectile.y >= terrainHeight - 20) {
                            const r = projectile.drillRadius || 6;
                            this.terrain.drill(projectile.x, projectile.y, r);
                        }
                    }
                } else {
                    const terrainHeight = this.terrain.getHeight(projectile.x);
                    if (projectile.y >= terrainHeight - 2) {
                        // Special-case: bouncing bomb physics instead of instant explode
                        if (projectile.type === 'bouncing_bomb' && (projectile._bouncesLeft ?? 0) > 0) {
                            // Snap to ground contact and bounce
                            projectile.y = terrainHeight - 2;
                            projectile.vy = -Math.abs(projectile.vy) * (projectile._restitution || 0.6);
                            projectile.vx = projectile.vx * (projectile._friction || 0.88);
                            projectile._bouncesLeft -= 1;
                            // Tiny damp to avoid infinite skittering
                            if (Math.abs(projectile.vy) < 0.8) projectile.vy = -1.2;
                            // Visual feedback: spark puff
                            this.particleSystem.createExplosion(projectile.x, projectile.y, 10, '#ffc94d');
                            // If no bounces remain after this, explode immediately on next contact frame
                            if ((projectile._bouncesLeft || 0) <= 0) {
                                this.handleImpact(projectile);
                                this.projectiles.splice(i, 1);
                                continue;
                            }
                            // Skip impact handling; keep projectile alive
                            continue;
                        } else {
                            this.handleImpact(projectile);
                            this.projectiles.splice(i, 1);
                            continue;
                        }
                    }
                    // Allow UFOs to be shot down
                    if (this.skyObjects?.length) {
                        let hitUfoIndex = -1;
                        for (let si = 0; si < this.skyObjects.length; si++) {
                            const o = this.skyObjects[si];
                            if (o.type !== 'ufo') continue;
                            const dx = projectile.x - o.x;
                            const dy = projectile.y - o.y;
                            const dist = Math.hypot(dx, dy);
                            if (dist <= (10 + (projectile.size || 3))) { hitUfoIndex = si; break; }
                        }
                        if (hitUfoIndex >= 0) {
                            const u = this.skyObjects[hitUfoIndex];
                            this.explosions.push(new Explosion(u.x, u.y, 28, 0, '#66bbff'));
                            this.particleSystem.createExplosion(u.x, u.y, 34, '#99ddff');
                            this.particleSystem.createSmokePuff(u.x, Math.max(10, u.y + 4), 8);
                            this.skyObjects.splice(hitUfoIndex, 1);
                            this.lastUfoAt = (performance.now?.() || Date.now());
                            this.addLog('UFO shot down!', 'hit');
                            this.projectiles.splice(i, 1);
                            continue;
                        }
                    }
                    // Plane collisions (allow support airplanes to be shot down)
                    if (this.supportActors?.length) {
                        let hitPlaneIndex = -1;
                        for (let si = 0; si < this.supportActors.length; si++) {
                            const a = this.supportActors[si];
                            if (a.type !== 'plane') continue;
                            const dx = projectile.x - a.x;
                            const dy = projectile.y - a.y;
                            const dist = Math.hypot(dx, dy);
                            if (dist <= (12 + (projectile.size || 3))) { hitPlaneIndex = si; break; }
                        }
                        if (hitPlaneIndex >= 0) {
                            const p = this.supportActors[hitPlaneIndex];
                            this.explosions.push(new Explosion(p.x, p.y, 28, 0, '#ffaa66'));
                            this.particleSystem.createExplosion(p.x, p.y, 34, '#ffcc99');
                            this.particleSystem.createSmokePuff(p.x, Math.max(10, p.y + 4), 10);
                            this.supportActors.splice(hitPlaneIndex, 1);
                            this.addLog('Plane shot down!', 'hit');
                            this.projectiles.splice(i, 1);
                            continue;
                        }
                    }
                    // Tank collisions
                    for (let tank of this.tanks) {
                        if (tank.health > 0 && this.checkCollision(projectile, tank)) {
                            // For bouncing bomb, collide with tank causes immediate detonation
                            if (projectile.type === 'bouncing_bomb') {
                                this.handleImpact(projectile, tank);
                                this.projectiles.splice(i, 1);
                                break;
                            } else {
                                this.handleImpact(projectile, tank);
                                this.projectiles.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        }

    // Update lingering hazards (acid pools, napalm fires)
    this.updateHazards(dt);
    this.updateMines(dt);
    // Update smoke screens (drift slightly with wind, fade softly)
    this.updateSmokeScreens(dt);
        // Update explosions and scrub finished ones
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].update();
            if (this.explosions[i].isFinished()) this.explosions.splice(i, 1);
        }

        // Provide terrain ground height to particle system so smoke stays above ground
    this.particleSystem.update(dt, x => this.terrain ? this.terrain.getHeight(Math.max(0, Math.min(Math.floor(x), this.width - 1))) : this.height);
    this.debrisSystem.update(dt);
    // Age out temporary lights
    this.pruneExpiredLights();
    // Let wrecks settle to current terrain
    this.updateWrecks(dt);
    // Settle Solo target to new ground level if terrain below is removed
    this.updateSoloTargetPhysics(dt);
    this.updateSupportActors(dt);

        // Update tanks position (but skip submarines/bases - they handle their own positioning)
        for (let tank of this.tanks) {
            if (tank.type === 'submarine' || tank.type === 'base') continue;
            tank.update(this.terrain);
        }

        // Clear firing/turn gates when no projectiles remain (explosions can continue)
        if (this.projectiles.length === 0) {
            if (this.isAnimating) this.isAnimating = false;
            if (this.mode === 'realtime') {
                if (this.turnEnding) this.turnEnding = false;
                // Allow humans to fire again immediately
                if (this.fireLocked) this.fireLocked = false;
            }
        }

        // Ambient dust emitters (theme-configurable)
        const dustCfg = this.config?.graphics?.dust || {};
        this._ambientDustTick = (this._ambientDustTick || 0) + 1;
        const themeCfg = dustCfg[this.themeName];
        // Resolve enabled: override takes precedence if not null
        const dustEnabled = (this.dustOverrideEnabled !== null) ? this.dustOverrideEnabled : !!themeCfg?.enabled;
        if (dustEnabled) {
            const every = Math.max(1, themeCfg.ambientEvery ?? 10);
            if (this._ambientDustTick % every === 0) {
                const t = this.tanks[this.currentTankIndex];
                const nearChance = themeCfg.nearTankChance ?? 0;
                const ambChance = themeCfg.ambientChance ?? 0;
                const baseCount = Math.max(1, themeCfg.count ?? 5);
                const count = Math.max(1, Math.round(baseCount * (this.dustAmountMultiplier || 1)));
                const options = {
                    sizeScale: (themeCfg.sizeScale ?? 1) * (this.dustSizeScale || 1),
                    lifetimeScale: (themeCfg.lifetimeScale ?? 1) * (this.dustLifetimeScale || 1),
                    gravity: themeCfg.gravity,
                    gravityDelta: themeCfg.gravityDelta
                };
                if (t && Math.random() < nearChance) {
                    this.spawnDustForTheme(this.themeName, t.x, t.y - 3, count, options);
                }
                if (ambChance > 0 && Math.random() < ambChance) {
                    const rx = Math.random() * this.width;
                    const ry = this.terrain.getHeight(rx) - 2;
                    this.spawnDustForTheme(this.themeName, rx, ry, count, options);
                }
            }
        }

        // Realtime mode: check if any AI can act
        this.updateRealtimeAI();

        // Opportunistic supply crate drop: rare, spaced out, only when not many projectiles
        const now = (performance.now?.() || Date.now());
        if (!this.gameOver && !this.turnEnding && !this.isAnimating && this.projectiles.length === 0) {
            const since = now - (this.lastCrateAt || 0);
            if (since >= this.minCrateIntervalMs) {
                // Convert per-second chance to per-frame probability
                const p = Math.min(0.25, (this.crateChancePerSec || 0) * (dt / 1000));
                if (Math.random() < p) {
                    const x = Math.random() * this.width * 0.9 + this.width * 0.05;
                    this.spawnSupplyCrate(x);
                    this.lastCrateAt = now;
                    this.addLog('Supply crate inbound!', 'info');
                    try { document.dispatchEvent(new CustomEvent('game:crate-inbound')); } catch {}
                }
            }
        }
    }
    
    render() {
        // Apply screen shake
        this.ctx.save();
        if (this.screenShake?.intensity > 0) {
            this.ctx.translate(this.screenShake.x, this.screenShake.y);
            this.screenShake.intensity *= 0.9;
            if (this.screenShake.intensity < 0.1) this.screenShake.intensity = 0;
        }
        
    // Themed sky background and atmospheric elements
    this.drawSky();
    const celActive = !!(this.celestial?.enabled && this.timeOfDayOverride == null);
    const f = this.assetForce || {};
    // If a force flag is provided, it overrides celestial; otherwise fall back to (celActive || enableFlag)
    const wantSun = (typeof f.sun === 'boolean') ? f.sun : (celActive || this.sunEnabled);
    const wantNebula = (typeof f.nebula === 'boolean') ? f.nebula : (celActive || this.nebulaEnabled);
    const wantStars = (typeof f.stars === 'boolean') ? f.stars : (celActive || this.starsEnabled);
    const wantMoon = (typeof f.moon === 'boolean') ? f.moon : (celActive || this.moonEnabled);
    if (wantSun) this.drawSun();
    if (wantNebula) this.drawNebula();
    if (wantStars) this.drawStars();
    if (wantMoon) this.drawMoon();
    // Configured extras: Earth and other planets
    const wantEarth = (typeof f.earth === 'boolean') ? f.earth : this.earthEnabled;
    const wantPlanets = (typeof f.planets === 'boolean') ? f.planets : this.planetsEnabled;
    if (wantEarth) this.drawEarthPlanet();
    if (wantPlanets) this.drawPlanets?.();
    // Draw sky objects (meteors/satellites/UFOs) after sun/moon to ensure they appear in front
    const wantSkyObjects = (typeof f.skyObjects === 'boolean') ? f.skyObjects : this.skyObjectsEnabled;
    if (wantSkyObjects) this.updateAndDrawSkyObjects(this.timeOfDay);
        
        // Draw terrain with shadow
        this.terrain.render(this.ctx);
        // Draw wreck char and smoke above terrain, below debris/tanks
        this.drawWrecks();
        // Draw debris over terrain (so pieces sit on ground) but under living tanks
    if (this.debrisSystem) this.debrisSystem.render(this.ctx);
    // Draw hazards (acid pools, napalm) as ground effects under tanks
    this.renderHazards(this.ctx);
    this.renderMines(this.ctx);
        
        // Draw tanks with glow
        for (let i = 0; i < this.tanks.length; i++) {
            const tank = this.tanks[i];
            if (tank.health > 0) {
                this.drawTankWithEffects(tank);
                // Team indicator: small dot above turret showing team color
                if (this.mode === 'teams' && Array.isArray(this.teams) && this.teams.length === this.tanks.length) {
                    const team = this.teams[i];
                    const color = team === 'A' ? '#ff00ff' : '#00ffff';
                    this.ctx.save();
                    // Halo glow
                    const g = this.ctx.createRadialGradient(tank.x, tank.y - 24, 0, tank.x, tank.y - 24, 12);
                    g.addColorStop(0, color + '66');
                    g.addColorStop(1, color + '00');
                    this.ctx.fillStyle = g;
                    this.ctx.fillRect(tank.x - 12, tank.y - 36, 24, 24);
                    // Dot
                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    this.ctx.arc(tank.x, tank.y - 24, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
                if (this.tanks[this.currentTankIndex] === tank) {
                    this.drawAimLine(tank);
                }
            }
        }
        
        // Draw projectiles with trails
        for (let projectile of this.projectiles) {
            this.drawProjectileWithTrail(projectile);
        }
        
        // Draw smoke screens on top of tanks/projectiles to obscure silhouettes
        this.renderSmokeScreens?.(this.ctx);

        // Draw explosions with glow
        for (let explosion of this.explosions) {
            this.drawExplosionWithGlow(explosion);
        }
        
    // Draw particles
        this.particleSystem.render(this.ctx);

        // Draw support actors on top of particles but under guides/HUD
        this.renderSupportActors(this.ctx);

        // Optional trajectory guide for current human tank
        this.drawTrajectoryGuide();
        // Draw stored tracer preview (if any) even when guide is off
        try {
            const pv = this.tracerPreview;
            if (pv && Array.isArray(pv.points) && pv.points.length) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.35;
                this.ctx.fillStyle = '#00b3ff';
                this.ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                this.ctx.lineWidth = 1;
                for (const p of pv.points) {
                    this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
                }
                this.ctx.restore();
            }
        } catch {}

        // Cave limited visibility overlay (drawn above world, below HUD)
        if (this.themeName === 'cave') {
            this.drawCaveVisibilityMask();
        }

        // Solo target and HUD on top of world
        if (this.soloActive) {
            this.drawSoloTarget();
            this.drawSoloHUD();
        }
        
        this.ctx.restore();

        // Draw a top-of-screen wind flag indicator (bar hidden); unaffected by screen shake
        try {
            const displayWind = this.windOverride ?? this.wind;
            const configuredMax = Math.abs(this.config?.physics?.windMax ?? 8);
            const maxAbsWind = configuredMax || 8; // Use configured max, fallback to 8
            const ratio = Math.max(-1, Math.min(1, maxAbsWind === 0 ? 0 : displayWind / maxAbsWind));
            this.drawWindFlag(displayWind, ratio);
        } catch {}
    }

    // ----- Turn end scheduling helpers -----
    scheduleEndTurn(delayMs = 0) {
        // Cancel any existing timer for this turn
        if (this.endTurnTimer) {
            clearTimeout(this.endTurnTimer);
            this.endTurnTimer = null;
        }
        const token = this.turnToken;
        this.endTurnTimer = setTimeout(() => {
            if (token !== this.turnToken) return; // stale timer from prior turn
            this.endTurn();
        }, Math.max(0, delayMs));
    }
    cancelEndTurn() {
        if (this.endTurnTimer) {
            clearTimeout(this.endTurnTimer);
            this.endTurnTimer = null;
        }
    }

    updateSupportActors(dtMs) {
        if (!this.supportActors || this.supportActors.length === 0) return;
        const dt = Math.max(1, dtMs);
        for (let i = this.supportActors.length - 1; i >= 0; i--) {
            const a = this.supportActors[i];
            a.age = (a.age || 0) + dt;
            if (a.type === 'paratrooper') {
                if (a.state === 'descending') {
                    // Check if underwater
                    const isUnderwater = this.terrain._isOceanTerrain && this.terrain.waterSurfaceY != null && a.y > this.terrain.waterSurfaceY;

                    if (isUnderwater) {
                        // Paratroopers can't function underwater - drown and mark as done
                        a.hasParachute = false;
                        a.vy = Math.min((a.vy ?? 0.2) + 0.15 * dt * 0.016, 4.0); // Sink fast
                        a.y += a.vy;
                        a.x += (a.vx ?? 0) * 0.2; // Minimal drift

                        // Create bubbles effect
                        if (Math.random() < 0.1) {
                            this.particleSystem.createSmokePuff(a.x, a.y, 4);
                        }

                        // Mark as drowned after a few seconds
                        if ((a.age ?? 0) > 3000) {
                            a.state = 'done';
                        }
                    } else {
                        // Above water: normal parachute descent
                        a.hasParachute = true;
                        a.vy = Math.min((a.vy ?? 0.2) + 0.02 * dt * 0.016, 2.2);
                        a.y += a.vy;
                        a.x += a.vx ?? 0;
                    }

                    const ground = this.terrain.getHeight(a.x);
                    if (a.y >= ground - 10) {
                        a.y = ground - 10;
                        a.state = 'active';
                        a.activeFor = 0;
                        a.nextPulseIn = 250;
                        a.cooldown = this.paratrooperPostAttackDelayMs;
                    }
                } else if (a.state === 'active') {
                    a.activeFor += dt;
                    a.nextPulseIn -= dt;
                    if (a.nextPulseIn <= 0) {
                        a.nextPulseIn = 300;
                        const range = a.range || 110;
                        for (const t of this.tanks) {
                            if (t.health <= 0) continue;
                            const friendly = this.isFriendly(a.owner, t);
                            const dx = t.x - a.x;
                            const dy = (t.y - 10) - a.y;
                            const dist = Math.hypot(dx, dy);
                            if (dist <= range) {
                                if (a.role === 'attack' && !friendly) {
                                    const dmg = 4;
                                    t.takeDamage(dmg);
                                    if (t.health <= 0) {
                                        this.addLog(`${t.name} eliminated by paratroopers!`, 'hit');
                                        this.explosions.push(new Explosion(t.x, t.y - 6, 24, 0, '#ffaa55'));
                                        this.particleSystem.createExplosion(t.x, t.y - 6, 30, '#ffaa55');
                                        this.addWreck(t.x, t.y, t.color);
                                        this.checkGameOver();
                                    }
                                } else if (a.role === 'medic' && friendly) {
                                    const heal = 3;
                                    const before = t.health;
                                    const maxH = t.maxHealth || 100;
                                    if (before < maxH) {
                                        t.health = Math.min(maxH, before + heal);
                                        // Subtle heal effect and one-time log per paratrooper
                                        this.particleSystem.createExplosion(t.x, t.y - 8, 12, '#66ff66');
                                        if (!a._loggedHeal) {
                                            this.addLog(`${t.name} healed by medics. (+${t.health - before})`, 'info');
                                            a._loggedHeal = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (a.activeFor >= (a.durationMs || 2500)) {
                        // Enter cooldown before removal to hold turn for X ms post-attack
                        a.state = 'cooldown';
                    }
                } else if (a.state === 'cooldown') {
                    a.cooldown = Math.max(0, (a.cooldown ?? this.paratrooperPostAttackDelayMs) - dt);
                    if (a.cooldown <= 0) {
                        a.state = 'done';
                    }
                }
            } else if (a.type === 'plane') {
                a.x += (a.vx ?? 0) * dt * 0.01;
                // Bomber behavior: drop bombs when crossing targetX or at spaced intervals
                if (a.subtype === 'bomber') {
                    const targetX = a.targetX ?? (this.width / 2);
                    const spacing = a.bombSpacing ?? 46;
                    if (a.droppedCount == null) a.droppedCount = 0;
                    if (a._bombDropPositions == null) {
                        // Pre-calculate all drop positions once
                        const totalBombs = Math.max(1, Math.min(5, a.bombCount ?? 3));
                        const halfCount = Math.floor(totalBombs / 2);
                        a._bombDropPositions = [];
                        for (let i = 0; i < totalBombs; i++) {
                            const offset = (i - halfCount) * spacing;
                            a._bombDropPositions.push(targetX + offset);
                        }
                        a._lastX = a.x; // Track previous position
                    }

                    const totalBombs = a._bombDropPositions.length;
                    const owner = a.owner;

                    // Check if we've crossed any drop position since last frame
                    if (a.droppedCount < totalBombs) {
                        const nextDropPos = a._bombDropPositions[a.droppedCount];
                        const crossedDropPosition = (a.vx < 0 && a._lastX > nextDropPos && a.x <= nextDropPos) ||
                                                    (a.vx > 0 && a._lastX < nextDropPos && a.x >= nextDropPos);

                        if (crossedDropPosition) {
                            console.log(`[BOMBER DEBUG] Dropping bomb ${a.droppedCount + 1}/${totalBombs} at x=${a.x}, dropPosition=${nextDropPos}`);
                            const p = new Projectile(a.x, a.y + 12, 0, 1.2, a.bombType || 'nuke', this.config?.weapons);
                            p.skin = 'bomb';
                            p.owner = owner;
                            p.minFramesBeforeCollision = 20;
                            this.projectiles.push(p);
                            a.droppedCount++;

                            if (a.droppedCount === 1) {
                                this.addLog(`Bomber dropping ${totalBombs} nukes`, 'info');
                            }
                        }
                    }

                    a._lastX = a.x; // Update last position for next frame
                } else if (a.spawnAtX && !a.dropped && ((a.vx < 0 && a.x <= a.spawnAtX) || (a.vx > 0 && a.x >= a.spawnAtX))) {
                    // Paratrooper transport behavior
                    a.dropped = true;
                    const count = 4;
                    for (let k = 0; k < count; k++) {
                        this.spawnParatrooper(a.spawnAtX + (k - (count - 1) / 2) * 12, a.y + 10, a.role, a.owner);
                    }
                    try { document.dispatchEvent(new CustomEvent('game:paratrooper-drop')); } catch {}
                }
                if (a.x < -100 || a.x > this.width + 100) a.type = 'done';
            } else if (a.type === 'flare_chute') {
                // Check if underwater
                const isUnderwater = this.terrain._isOceanTerrain && this.terrain.waterSurfaceY != null && a.y > this.terrain.waterSurfaceY;

                if (isUnderwater) {
                    // Underwater: flare extinguishes and sinks rapidly
                    a.hasParachute = false;
                    a.vy = Math.min((a.vy ?? 0.1) + 0.12 * dt * 0.016, 3.0); // Sink fast
                    a.x += (a.vx ?? 0) * 0.1; // Minimal drift
                    a.y += a.vy;

                    // Extinguished - just mark as done quickly
                    if ((a.age ?? 0) > 1000) {
                        a.type = 'done';
                    }
                } else {
                    // Above water: slowly descend, drift with wind
                    a.hasParachute = true;
                    const wind = this.windOverride ?? this.wind;
                    const drift = (this.parachuteFlareCfg?.driftWindFactor ?? 0.02) * wind;
                    a.vx = drift;
                    // Gentle descent acceleration with cap
                    a.vy = Math.min((a.vy ?? 0.1) + (this.parachuteFlareCfg?.descentAccel ?? 0.004) * dt * 0.016, (this.parachuteFlareCfg?.vyMax ?? 0.6));
                    a.x += a.vx;
                    a.y += a.vy;

                    const ground = this.terrain.getHeight(Math.max(0, Math.min(this.width - 1, Math.floor(a.x))));
                    if (a.y >= ground - 10) {
                        a.y = ground - 10;
                        // On landing, create a persistent light and mark done
                        const radius = this.parachuteFlareCfg?.radius ?? 200;
                        const duration = this.parachuteFlareCfg?.durationMs ?? 8000;
                        const color = this.parachuteFlareCfg?.color ?? '#fff2a0';
                        this.addLight(a.x, ground - 8, radius, duration, color);
                        a.type = 'done';
                    }
                }
            } else if (a.type === 'supply_crate') {
                if (a.state === 'descending') {
                    // Check if underwater
                    const isUnderwater = this.terrain._isOceanTerrain && this.terrain.waterSurfaceY != null && a.y > this.terrain.waterSurfaceY;

                    if (isUnderwater) {
                        // Underwater: crate loses parachute and sinks faster with drag
                        a.hasParachute = false; // Mark parachute as lost
                        const waterDrag = 0.95; // Heavy drag underwater
                        a.vx *= waterDrag;
                        a.vy = Math.min((a.vy ?? 0.12) + 0.08 * dt * 0.016, 2.5); // Sink faster
                        a.x += a.vx * 0.3; // Reduced horizontal drift
                        a.y += a.vy;
                    } else {
                        // Above water: parachute descent
                        a.hasParachute = true;
                        const wind = this.windOverride ?? this.wind;
                        const drift = (this.parachuteFlareCfg?.driftWindFactor ?? 0.02) * wind;
                        a.vx = drift;
                        a.vy = Math.min((a.vy ?? 0.12) + (this.parachuteFlareCfg?.descentAccel ?? 0.004) * dt * 0.016, (this.parachuteFlareCfg?.vyMax ?? 0.6));
                        a.x += a.vx;
                        a.y += a.vy;
                    }

                    const ground = this.terrain.getHeight(Math.max(0, Math.min(this.width - 1, Math.floor(a.x))));
                    if (a.y >= ground - 8) {
                        a.y = ground - 8;
                        a.state = 'landed';
                        a.landedAt = (performance.now?.() || Date.now());
                    }
                } else if (a.state === 'landed') {
                    // Wait for a nearby tank to collect
                    const t = this.getNearestAliveTank(a.x, a.y, 26);
                    if (t) {
                        // Refill ammo
                        this.refillAmmoForTank(t);
                        // Refill fuel unless tank already has unlimited fuel
                        try {
                            if ((t.maxFuel || 0) < 999999) {
                                t.fuel = t.maxFuel || t.fuel;
                            }
                        } catch {}
                        this.addLog(`${t.name} collected supply crate: ammo & fuel refilled.`, 'info');
                        // Subtle puff
                        this.particleSystem.createSmokePuff(a.x, a.y - 4, 8);
                        try { document.dispatchEvent(new CustomEvent('game:crate-pickup')); } catch {}
                        a.type = 'done';
                    } else {
                        // Despawn after 20s if not collected
                        const age = (performance.now?.() || Date.now()) - (a.landedAt || 0);
                        if (age > 20000) a.type = 'done';
                    }
                }
            }
            if (a.state === 'done' || a.type === 'done') {
                this.supportActors.splice(i, 1);
            }
        }
        // If we're deferring turn for paratroopers, and none remain, start next turn after ensuring cooldown elapsed
        if (this.deferTurnForParatroopers) {
            const anyParas = this.supportActors.some(s => s.type === 'paratrooper');
            const anyPlanes = this.supportActors.some(s => s.type === 'plane');
            if (!anyParas && !anyPlanes) {
                this.deferTurnForParatroopers = false;
                // Release input hold and schedule the turn end via the centralized scheduler
                this.holdingForSupport = false;
                this.scheduleEndTurn(10);
            }
        }
    }

    renderSupportActors(ctx) {
        if (!this.supportActors || this.supportActors.length === 0) return;
        for (const a of this.supportActors) {
            if (a.type === 'paratrooper') {
                ctx.save();
                ctx.translate(a.x, a.y);
                // Only show parachute if hasParachute is true (not underwater)
                if (a.state === 'descending' && a.hasParachute !== false) {
                    ctx.fillStyle = 'rgba(220,220,255,0.8)';
                    ctx.beginPath();
                    ctx.arc(0, -10, 12, Math.PI, 0);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(220,220,255,0.6)';
                    ctx.beginPath();
                    ctx.moveTo(-10, -10); ctx.lineTo(0, -2); ctx.lineTo(10, -10);
                    ctx.stroke();
                }
                // Show paratrooper body (or bubbles if underwater)
                ctx.fillStyle = a.role === 'medic' ? '#66ff66' : '#ff6666';
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.type === 'plane') {
                ctx.save();
                ctx.translate(a.x, a.y);
                // Face the direction of travel
                if ((a.vx ?? 0) < 0) {
                    ctx.scale(-1, 1);
                }
                // Simple side-view airplane (bomber subtype uses heavier styling)
                // Fuselage
                const bomber = a.subtype === 'bomber';
                const fuselageGrad = ctx.createLinearGradient(-26, 0, 26, 0);
                fuselageGrad.addColorStop(0, bomber ? '#7a7a7a' : '#bcbcbc');
                fuselageGrad.addColorStop(0.5, bomber ? '#9a9a9a' : '#e0e0e0');
                fuselageGrad.addColorStop(1, bomber ? '#6a6a6a' : '#b0b0b0');
                ctx.fillStyle = fuselageGrad;
                ctx.beginPath();
                ctx.moveTo(-24, bomber ? -5 : -4);
                ctx.quadraticCurveTo(2, bomber ? -7 : -6, 24, bomber ? -2 : -2); // top contour
                ctx.lineTo(24, bomber ? 3 : 2);
                ctx.quadraticCurveTo(2, bomber ? 7 : 6, -24, bomber ? 5 : 4); // bottom contour
                ctx.closePath();
                ctx.fill();
                // Wing
                ctx.fillStyle = bomber ? '#6e6e6e' : '#9a9a9a';
                ctx.beginPath();
                ctx.moveTo(bomber ? -10 : -6, -2);
                ctx.lineTo(bomber ? 12 : 8, bomber ? -8 : -6);
                ctx.lineTo(bomber ? 4 : 2, 0);
                ctx.lineTo(bomber ? -16 : -12, bomber ? 6 : 4);
                ctx.closePath();
                ctx.fill();
                // Tail fin
                ctx.fillStyle = bomber ? '#5e5e5e' : '#8a8a8a';
                ctx.beginPath();
                ctx.moveTo(-18, -2);
                ctx.lineTo(-14, -8);
                ctx.lineTo(-12, -2);
                ctx.fill();
                // Cockpit
                ctx.beginPath();
                ctx.ellipse(6, -3, bomber ? 5 : 4, bomber ? 3 : 2.4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Propeller hub and blur
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.arc(26, 0, bomber ? 2 : 1.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(80,80,80,0.7)';
                ctx.lineWidth = bomber ? 2.2 : 2;
                ctx.beginPath();
                ctx.moveTo(bomber ? 26 : 22, bomber ? -8 : -6);
                ctx.lineTo(bomber ? 26 : 22, bomber ? 8 : 6);
                ctx.stroke();
                ctx.restore();
            } else if (a.type === 'flare_chute') {
                ctx.save();
                ctx.translate(a.x, a.y);
                // Only show glow and parachute if not underwater (extinguished)
                if (a.hasParachute !== false) {
                    // Soft glow from the flare core
                    const rr = Math.max(60, (this.parachuteFlareCfg?.radius || 200) * 0.6);
                    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * 0.8);
                    glow.addColorStop(0, 'rgba(255,240,160,0.35)');
                    glow.addColorStop(1, 'rgba(255,240,160,0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(0, 0, rr * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                    // Parachute canopy
                    ctx.fillStyle = 'rgba(220,220,255,0.85)';
                    ctx.beginPath();
                    ctx.arc(0, -12, 12, Math.PI, 0);
                    ctx.fill();
                    // Lines
                    ctx.strokeStyle = 'rgba(220,220,255,0.6)';
                    ctx.beginPath();
                    ctx.moveTo(-10, -12); ctx.lineTo(0, -2); ctx.lineTo(10, -12);
                    ctx.stroke();
                    // Flare core
                    ctx.fillStyle = '#ffd966';
                    ctx.beginPath();
                    ctx.arc(0, 0, 3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Underwater - just show a fading dark object
                    ctx.fillStyle = 'rgba(100,100,100,0.5)';
                    ctx.beginPath();
                    ctx.arc(0, 0, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (a.type === 'supply_crate') {
                ctx.save();
                ctx.translate(a.x, a.y);
                // Only show parachute if hasParachute is true (above water)
                if (a.state === 'descending' && a.hasParachute !== false) {
                    // Parachute canopy
                    ctx.fillStyle = 'rgba(220,220,255,0.9)';
                    ctx.beginPath();
                    ctx.arc(0, -12, 12, Math.PI, 0);
                    ctx.fill();
                    // Lines
                    ctx.strokeStyle = 'rgba(220,220,255,0.7)';
                    ctx.beginPath();
                    ctx.moveTo(-10, -12); ctx.lineTo(0, -2); ctx.lineTo(10, -12);
                    ctx.stroke();
                }
                // Crate box
                ctx.fillStyle = '#a36b2b';
                ctx.strokeStyle = '#5e3b16';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.rect(-8, -6, 16, 12);
                ctx.fill();
                ctx.stroke();
                // Cross straps
                ctx.strokeStyle = '#d9b07a';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
                ctx.moveTo(0, -6); ctx.lineTo(0, 6);
                ctx.stroke();
                // Glow when landed
                if (a.state === 'landed') {
                    ctx.fillStyle = 'rgba(255, 230, 150, 0.15)';
                    ctx.beginPath();
                    ctx.arc(0, 0, 18, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
    }

    isFriendly(ownerTank, otherTank) {
        if (!ownerTank || !otherTank) return false;
        if (ownerTank === otherTank) return true;
        if (Array.isArray(this.teams) && this.teams.length === this.tanks.length) {
            const oi = this.tanks.indexOf(ownerTank);
            const ti = this.tanks.indexOf(otherTank);
            if (oi >= 0 && ti >= 0) return this.teams[oi] === this.teams[ti];
        }
        return false;
    }

    // Find nearest enemy tank to the given owner. If owner is null, returns nearest alive tank.
    getNearestEnemyTank(owner) {
        let best = null;
        let bestD = Infinity;
        const ox = owner?.x ?? (this.width / 2);
        const oy = owner ? (owner.y - 10) : (this.height / 2);
        for (const t of this.tanks) {
            if (!t || t.health <= 0) continue;
            if (owner && this.isFriendly(owner, t)) continue;
            const dx = t.x - ox;
            const dy = (t.y - 10) - oy;
            const d = Math.hypot(dx, dy);
            if (d < bestD) { best = t; bestD = d; }
        }
        return best;
    }

    // Find nearest alive tank to (x,y) within maxDist (pixels); returns null if none found
    getNearestAliveTank(x, y, maxDist = 160) {
        let best = null;
        let bestD = (typeof maxDist === 'number') ? Math.max(0, maxDist) : Infinity;
        for (const t of this.tanks) {
            if (!t || t.health <= 0) continue;
            const dx = t.x - x;
            const dy = (t.y - 10) - y; // approximate center
            const d = Math.hypot(dx, dy);
            if (d <= bestD) { best = t; bestD = d; }
        }
        return best;
    }

    spawnParatrooper(x, y, role, owner) {
        this.supportActors.push({ type: 'paratrooper', x, y, vx: (Math.random() * 0.4 - 0.2), vy: 0.2, state: 'descending', role, owner, durationMs: 2800 });
    }

    setTrajectoryGuide(on) {
        this.trajectoryGuide = !!on;
    }

    drawTrajectoryGuide() {
        if (!this.trajectoryGuide) return;
        if (this.gameOver || this.isAnimating) return;
        const tank = this.tanks[this.currentTankIndex];
        if (!tank || tank.isAI || tank.health <= 0) return;

        const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const angleRad = (((tank.angle % 360) + 360) % 360) * Math.PI / 180;
        // Special-case: Homing missile — draw guide only to the apex (pre-homing ballistic arc)
        if (tank.weapon === 'homing') {
            const baseVelocity = (tank.power / 100) * 20 + 10;
            const v0 = baseVelocity * this.velocityMultiplier;
            let vx = Math.cos(angleRad) * v0;
            let vy = -Math.sin(angleRad) * v0;
            const tip = tank.getBarrelWorldTip?.() || { x: tank.x, y: tank.y - 15 };
            let x = tip.x;
            let y = tip.y;
            // Before homing, we reduce wind effect in flight; mirror that here for feel consistency
            const windAccel = (this.windOverride ?? this.wind) * this.windEffect * 0.6;
            const g = this.gravityOverride ?? this.gravity;
            let apex = null;
            const steps = 140;
            for (let i = 0; i < steps; i++) {
                vx += windAccel;
                vy += g;
                x += vx; y += vy;
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
                if (vy >= 0) { apex = { x, y }; break; }
                // Safety: don't draw off-screen too far
                if (x < -50 || x > this.width + 50 || y < -50) break;
            }
            // Mark apex subtly
            if (apex) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,220,0,0.9)';
                ctx.strokeStyle = 'rgba(0,0,0,0.9)';
                ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.arc(apex.x, apex.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Optional: draw a faint dashed estimated homing segment toward nearest target
                try {
                    const target = this.getNearestEnemyTank(tank);
                    if (target) {
                        let hx = apex.x, hy = apex.y;
                        let hvx = vx, hvy = vy; // carry velocity at apex
                        const desiredSpeed = 8.0, steer = 0.14, maxSp = 9;
                        const windPost = (this.windOverride ?? this.wind) * this.windEffect * 0.35;
                        const gg = this.gravityOverride ?? this.gravity;
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
                            const dx = target.x - hx; const dy = (target.y - 10) - hy; const dist = Math.hypot(dx, dy) || 1;
                            const dvx = (dx / dist) * desiredSpeed; const dvy = (dy / dist) * desiredSpeed;
                            hvx = hvx * (1 - steer) + dvx * steer; hvy = hvy * (1 - steer) + dvy * steer;
                            const sp = Math.hypot(hvx, hvy); if (sp > maxSp) { const s = maxSp / sp; hvx *= s; hvy *= s; }
                            // ground avoidance like runtime
                            const gndNow = this.terrain.getHeight(hx);
                            if (hy >= gndNow - 12) { hvy -= 0.6; hvx *= 0.97; }
                            // integrate wind+gravity
                            hvx += windPost; hvy += gg;
                            hx += hvx; hy += hvy;
                            ctx.lineTo(hx, hy);
                            // stop at ground
                            const gnd = this.terrain.getHeight(hx);
                            if (hy >= gnd - 1) break;
                            if (hx < -60 || hx > this.width + 60 || hy < -60 || hy > this.height + 60) break;
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
                const ground = this.terrain.getHeight(Math.max(0, Math.min(Math.floor(bx), this.width - 1)));
                if (by >= ground - 1) { impact = { x: bx, y: Math.max(by, ground) }; break; }
                // tank collision check (skip self)
                for (const t of this.tanks) {
                    if (!t || t === tank || t.health <= 0) continue;
                    const dx = bx - t.x;
                    const dy = by - (t.y - 10);
                    const d = Math.hypot(dx, dy);
                    if (d <= 12) { impact = { x: bx, y: by, hitTank: t }; break; }
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
            ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(impact.x, impact.y); ctx.stroke();
            ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(impact.x, impact.y); ctx.stroke();
            // Impact marker
            ctx.fillStyle = impact.hitTank ? 'rgba(255,0,0,0.95)' : 'rgba(255,120,0,0.95)';
            ctx.beginPath(); ctx.arc(impact.x, impact.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.restore();
            return;
        }
        const baseVelocity = (tank.power / 100) * 20 + 10;
        const v0 = baseVelocity * this.velocityMultiplier;
        let vx = Math.cos(angleRad) * v0;
        let vy = -Math.sin(angleRad) * v0;
        const windAccel = (this.windOverride ?? this.wind) * this.windEffect;
        const g = this.gravityOverride ?? this.gravity;
        const tip = tank.getBarrelWorldTip?.() || { x: tank.x, y: tank.y - 15 };
        let x = tip.x;
        let y = tip.y;

        // Check if ocean mode for underwater physics
        const isOceanMode = this.terrain._isOceanTerrain;
        const waterSurfaceY = this.terrain.waterSurfaceY;
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

            x += vx; y += vy;
            // stop if would hit terrain
            const ground = this.terrain.getHeight(x);
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
            const pv = this.tracerPreview;
            if (pv && pv.owner === tank && Array.isArray(pv.points) && pv.points.length) {
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = '#00b3ff';
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1;
                for (const p of pv.points) {
                    ctx.beginPath(); ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                }
                ctx.restore();
            }
        } catch {}
    }

    // ----- Solo mode helpers -----
    spawnSoloTarget() {
        const margin = 60;
        const x = Math.max(margin, Math.min(this.width - margin, Math.random() * this.width));
        const y = this.terrain.getHeight(x) - 14;
        // Visual radius r; hitR is larger to make hits a bit easier
        // vy used for gravity-based settling when terrain beneath is removed
        this.soloTarget = { x, y, r: 14, hitR: 22, vy: 0 };
    }

    drawSoloTarget() {
        if (!this.soloTarget) return;
        const { x, y, r } = this.soloTarget;
        const ctx = this.ctx;
        ctx.save();
        // Concentric rings target
        const rings = [
            { color: 'rgba(255,255,255,0.9)', radius: r },
            { color: 'rgba(255,0,0,0.9)', radius: r * 0.7 },
            { color: 'rgba(255,255,255,0.9)', radius: r * 0.45 },
            { color: 'rgba(255,0,0,0.9)', radius: r * 0.25 }
        ];
        for (const ring of rings) {
            ctx.fillStyle = ring.color;
            ctx.beginPath();
            ctx.arc(x, y, ring.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 4, y + r + 2, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawSoloHUD() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(12, 12, 300, 48);
        ctx.fillStyle = '#00f5ff';
        ctx.font = 'bold 16px Segoe UI, sans-serif';
        const progress = (this.soloTargetGoal && this.soloTargetGoal > 0)
            ? `  Targets: ${this.soloTargetsHit}/${this.soloTargetGoal}`
            : '';
        const shotsStr = this.soloShotsTotal === null
            ? `  Shots: ${this.soloShotsUsed}/∞`
            : `  Shots: ${this.soloShotsUsed}/${this.soloShotsTotal}`;
        ctx.fillText(`Score: ${this.soloScore}${progress}${shotsStr}`, 20, 36);
        // simple progress bar
        if (this.soloTargetGoal > 0) {
            const pct = Math.max(0, Math.min(1, this.soloTargetsHit / this.soloTargetGoal));
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(20, 40, 200, 6);
            ctx.fillStyle = '#00f5ff';
            ctx.fillRect(20, 40, 200 * pct, 6);
        }
        ctx.restore();
    }

    createSustainedSmoke(x, y, durationMs = 3000, intervalMs = 180) {
        const start = performance.now();
        const id = setInterval(() => {
            const ground = this.terrain ? this.terrain.getHeight(Math.max(0, Math.min(Math.floor(x), this.width - 1))) : this.height;
            const emitY = Math.min(y, ground - 2); // never below ground
            this.particleSystem.createSmokePuff(x, emitY, 8);
            if (performance.now() - start >= durationMs) clearInterval(id);
        }, intervalMs);
    }

    // ---- Theme system ----
    getThemeLibrary() {
        const mk = (stops, edge, glow, bedrock = '#1a1410', bedrockLine = 'rgba(100, 80, 60, 0.3)') => ({
            gradientStops: stops, edgeStrokeColor: edge, edgeGlowColor: glow, bedrockColor: bedrock, bedrockLineColor: bedrockLine
        });
        return {
            canyon: {
                label: 'Desert Canyon',
                skies: {
                    day: ['#cfdaf2', '#ffefc7'],
                    dusk: ['#5a2c1f', '#ffbc63'],
                    night: ['#0a0e27', '#1a1a2e']
                },
                starsAt: new Set(['night']),
                nebulaAt: new Set([]),
                moonAt: new Set(['night', 'dusk']),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#e2c89a' },
                    { offset: 0.25, color: '#d6b783' },
                    { offset: 0.55, color: '#c29a62' },
                    { offset: 0.82, color: '#a97f4a' },
                    { offset: 1, color: '#8b6738' }
                ], '#f2d16b', '#e0b653', '#4a3622', 'rgba(160,120,60,0.3)')
            },
            cave: {
                label: 'Cave',
                skies: {
                    day: ['#121212', '#0a0a0a'],
                    dusk: ['#101010', '#080808'],
                    night: ['#0e0e0e', '#060606']
                },
                starsAt: new Set([]),
                nebulaAt: new Set([]),
                moonAt: new Set([]),
                sunAt: new Set([]),
                palette: mk([
                    { offset: 0, color: '#2b2b2b' },
                    { offset: 0.2, color: '#242424' },
                    { offset: 0.5, color: '#1f1f1f' },
                    { offset: 0.8, color: '#1a1a1a' },
                    { offset: 1, color: '#141414' }
                ], '#505050', '#303030', '#0e0e0e', 'rgba(80,80,80,0.25)')
            },
            dark: {
                label: 'Dark Mode',
                skies: {
                    day: ['#050508', '#000000'],
                    dusk: ['#050508', '#000000'],
                    night: ['#030306', '#000000']
                },
                starsAt: new Set(['night']),  // Very faint stars only at night
                nebulaAt: new Set([]),
                moonAt: new Set([]),
                sunAt: new Set([]),
                palette: mk([
                    { offset: 0, color: '#1a1a1d' },
                    { offset: 0.2, color: '#151515' },
                    { offset: 0.5, color: '#0f0f10' },
                    { offset: 0.8, color: '#0a0a0c' },
                    { offset: 1, color: '#050508' }
                ], '#2a2a2d', '#1a1a1d', '#000000', 'rgba(30,30,35,0.2)')
            },
            futuristic: {
                label: 'Futuristic',
                skies: {
                    day: ['#9ad0ff', '#e4f6ff'],
                    dusk: ['#3b1b5f', '#ff7e5f'],
                    night: ['#0a0e27', '#0f1419']
                },
                starsAt: new Set(['night']),
                nebulaAt: new Set(['night']),
                moonAt: new Set([]),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#334455' },
                    { offset: 0.2, color: '#29384a' },
                    { offset: 0.5, color: '#1e2b3c' },
                    { offset: 0.8, color: '#15202b' },
                    { offset: 1, color: '#0e1620' }
                ], '#66ccff', '#33aadd', '#131722', 'rgba(70,80,100,0.3)')
            },
            forest: {
                label: 'Forest',
                skies: {
                    day: ['#87ceeb', '#d0f0ff'],
                    dusk: ['#3a2e4f', '#feaa6b'],
                    night: ['#08121e', '#0a1622']
                },
                starsAt: new Set(['night']),
                nebulaAt: new Set([]),
                moonAt: new Set(['night', 'dusk']),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#3a5d3a' },
                    { offset: 0.2, color: '#2a4d2a' },
                    { offset: 0.5, color: '#1f3d1f' },
                    { offset: 0.8, color: '#142814' },
                    { offset: 1, color: '#0a1a0a' }
                ], '#4a7d4a', '#3a6d3a')
            },
            desert: {
                label: 'Desert',
                skies: {
                    day: ['#87d8ff', '#fffbcc'],
                    dusk: ['#5a2c1f', '#ffbc63'],
                    night: ['#0a0e27', '#1a1a2e']
                },
                starsAt: new Set(['night']),
                nebulaAt: new Set([]),
                moonAt: new Set(['night', 'dusk']),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#d2b48c' },
                    { offset: 0.3, color: '#c2a476' },
                    { offset: 0.6, color: '#a8875a' },
                    { offset: 0.85, color: '#8c6a3d' },
                    { offset: 1, color: '#6e512b' }
                ], '#f2d16b', '#e0b653', '#4a3622', 'rgba(160,120,60,0.3)')
            },
            moon: {
                label: 'Moon',
                skies: {
                    day: ['#20242b', '#0f1216'],
                    dusk: ['#161922', '#0b0e14'],
                    night: ['#04070c', '#0a0e13']
                },
                starsAt: new Set(['night', 'dusk', 'day']),
                nebulaAt: new Set([]),
                moonAt: new Set(['night', 'dusk', 'day']),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#9aa0a6' },
                    { offset: 0.3, color: '#7f8489' },
                    { offset: 0.6, color: '#6b7278' },
                    { offset: 0.85, color: '#585f66' },
                    { offset: 1, color: '#474d52' }
                ], '#cfd4da', '#aab2b9', '#202329', 'rgba(120,130,140,0.3)')
            },
            mars: {
                label: 'Mars',
                skies: {
                    day: ['#c45c3d', '#ffd3a8'],
                    dusk: ['#5b1e16', '#e56b3b'],
                    night: ['#12080a', '#2a0e10']
                },
                starsAt: new Set(['night']),
                nebulaAt: new Set([]),
                moonAt: new Set([]),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#a94442' },
                    { offset: 0.3, color: '#933833' },
                    { offset: 0.6, color: '#7c2e29' },
                    { offset: 0.85, color: '#612420' },
                    { offset: 1, color: '#4b1b18' }
                ], '#ff7f50', '#ff6347', '#2b1918', 'rgba(120,70,60,0.3)')
            },
            arctic: {
                label: 'Arctic',
                skies: {
                    day: ['#bde5ff', '#eef9ff'],
                    dusk: ['#3c4b6e', '#a8c1ff'],
                    night: ['#07131f', '#0b1b2c']
                },
                starsAt: new Set(['night']),
                nebulaAt: new Set([]),
                moonAt: new Set(['night']),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#8bd3ff' },
                    { offset: 0.3, color: '#6fbbe8' },
                    { offset: 0.6, color: '#579fc9' },
                    { offset: 0.85, color: '#3e82a8' },
                    { offset: 1, color: '#2a688c' }
                ], '#b7ecff', '#9ad7f0', '#1a2a38', 'rgba(120,160,180,0.3)')
            },
            ocean: {
                label: 'Ocean',
                skies: {
                    day: ['#5aa9e6', '#b8dcf5'],
                    dusk: ['#2c4a6e', '#7ea3d1'],
                    night: ['#0a1929', '#1a2f42']
                },
                starsAt: new Set(['night']),
                nebulaAt: new Set([]),
                moonAt: new Set(['night', 'dusk']),
                sunAt: new Set(['day', 'dusk']),
                palette: mk([
                    { offset: 0, color: '#5c7a8f' },
                    { offset: 0.3, color: '#496474' },
                    { offset: 0.6, color: '#3a515f' },
                    { offset: 0.85, color: '#2d3f4d' },
                    { offset: 1, color: '#1f2d38' }
                ], '#6b8fa3', '#5a7d91', '#0e1419', 'rgba(90,120,140,0.35)')
            }
        };
    }

    pickRandomTheme() {
        const keys = Object.keys(this.getThemeLibrary());
        return keys[Math.floor(Math.random() * keys.length)];
    }

    pickRandomTimeOfDay() {
        const opts = ['day', 'dusk', 'night'];
        return opts[Math.floor(Math.random() * opts.length)];
    }

    applyThemeFromOverrides(initial = false) {
    const themeName = this.themeOverride ?? (!initial ? this.themeName : this.pickRandomTheme());
        const tod = this.timeOfDayOverride || this.pickRandomTimeOfDay();
        this.applyTheme(themeName, tod);
    }

    applyTheme(themeName, timeOfDay) {
    const lib = this.getThemeLibrary();
        // If themeName is no longer valid (e.g., desk removed), fall back to forest
        const theme = lib[themeName] ? lib[themeName] : lib['forest'];
        if (!lib[themeName]) this.themeName = 'forest'; else this.themeName = themeName;
        this.timeOfDay = timeOfDay || 'day';
    // Configure atmospheric features
    this.starsEnabled = theme.starsAt.has(this.timeOfDay);
    this.nebulaEnabled = theme.nebulaAt.has(this.timeOfDay);
    this.moonEnabled = theme.moonAt.has(this.timeOfDay);
    this.sunEnabled = theme.sunAt.has(this.timeOfDay);
        // When not in celestial auto mode, enforce exclusivity by time-of-day
        const celActive = !!(this.celestial?.enabled && this.timeOfDayOverride == null);
        if (!celActive) {
            if (this.timeOfDay === 'night') {
                this.sunEnabled = false;
            } else {
                this.moonEnabled = false;
            }
        }
        // Update terrain palette
        this.terrain?.setPalette(theme.palette);
        // Reset starfield so it respawns to fit new sky
        this.stars = null;
        // Apply backgrounds matrix (config-driven sky objects per theme/time) and per-map force/knob overrides
        try {
            const todNow = this.timeOfDay || 'day';
            const g = this.config?.graphics || {};
            const bg = g.backgrounds || {};
            const defaults = (bg.defaults && bg.defaults[todNow]) || { stars: todNow === 'night', clouds: todNow !== 'night', nebula: todNow === 'night', sun: todNow !== 'night', moon: todNow !== 'day', earth: false, planets: todNow === 'night' };
            const overrides = (bg.overrides?.[this.themeName]?.[todNow]) || null;
            const eff = { ...(defaults || {}), ...(overrides || {}) };
            this.starsEnabled = !!eff.stars;
            this.nebulaEnabled = !!eff.nebula;
            this.cloudsEnabled = !!eff.clouds;
            this.sunEnabled = !!eff.sun;
            this.moonEnabled = !!eff.moon;
            this.earthEnabled = !!eff.earth;
            this.planetsEnabled = !!eff.planets;
            this.skyObjectsEnabled = eff.skyObjects !== false;
            // Force asset visibility per theme/time via config.backgrounds.overrides[theme][tod].force
            const force = (bg.overrides?.[this.themeName]?.force) || (bg.overrides?.[this.themeName]?.[todNow]?.force) || (bg.force?.[this.themeName]) || null;
            if (force) {
                this.assetForce = force;
                if (typeof force.stars === 'boolean') this.starsEnabled = force.stars;
                if (typeof force.nebula === 'boolean') this.nebulaEnabled = force.nebula;
                if (typeof force.clouds === 'boolean') this.cloudsEnabled = force.clouds;
                if (typeof force.sun === 'boolean') this.sunEnabled = force.sun;
                if (typeof force.moon === 'boolean') this.moonEnabled = force.moon;
                if (typeof force.earth === 'boolean') this.earthEnabled = force.earth;
                if (typeof force.planets === 'boolean') this.planetsEnabled = force.planets;
                if (typeof force.skyObjects === 'boolean') this.skyObjectsEnabled = force.skyObjects;
            } else {
                this.assetForce = null;
            }
            // Per-theme/time knob overrides under graphics.backgrounds.knobs[theme][tod]
            const knobOverrides = (bg.knobs?.[this.themeName]?.[todNow]) || null;
            if (knobOverrides) {
                // Merge into effectiveKnobs on top of base skyKnobs
                const base = (typeof structuredClone === 'function') ? structuredClone(this.skyKnobs) : JSON.parse(JSON.stringify(this.skyKnobs));
                this.effectiveKnobs = Object.assign(base, knobOverrides);
            } else {
                this.effectiveKnobs = null;
            }
            // If both are enabled, prefer sun on day/dusk and moon on night
            if (this.sunEnabled && this.moonEnabled) {
                if (todNow === 'night') this.sunEnabled = false; else this.moonEnabled = false;
            }
        } catch {}
    // Some themes use custom terrain profiles (but don't override explicit terrain profile settings)
        // Only auto-set terrain profile from theme if no explicit profile was set
        if (!this.terrainProfile || this.terrainProfile === 'auto' || this.terrainProfile === 'random') {
            let nextProfile = 'auto';
            if (this.themeName === 'canyon') nextProfile = 'canyon';
            if (this.themeName === 'ocean') nextProfile = 'ocean';
            const changed = this.terrainProfile !== nextProfile;
            this.terrainProfile = nextProfile;
            if (changed && this.terrain) {
                this.terrain.generate(this.terrainProfile || 'auto');
                if (this.terrainProfile === 'flat') {
                    this.terrain.flattenSurface(this.terrain.groundLevel);
                }
                // Snap tanks to surface after regen (skip submarines/bases)
                for (const t of this.tanks) {
                    if (t.type === 'submarine' || t.type === 'base') continue;
                    t.update?.(this.terrain);
                }
            }
        }
    }

    setThemeOverride(themeNameOrNull) {
        this.themeOverride = themeNameOrNull; // null = random each new game
        const label = themeNameOrNull ? this.getThemeLibrary()[themeNameOrNull]?.label || themeNameOrNull : 'Random';
        this.addLog(`Theme override: ${label}`, 'info');
        // Apply immediately for visual feedback
        this.applyThemeFromOverrides();
    }

    setTimeOfDayOverride(todOrNull) {
        this.timeOfDayOverride = todOrNull; // null = auto/random
    const label = todOrNull ?? 'Auto';
        this.addLog(`Time of day: ${label}`, 'info');
        this.applyThemeFromOverrides();
    }

    // Debug helpers: reroll theme/time without resetting full game
    rerollThemeNow() {
        const newTheme = this.themeOverride ?? this.pickRandomTheme();
        // Keep current time-of-day selection logic
        const tod = this.timeOfDayOverride || this.timeOfDay || this.pickRandomTimeOfDay();
        this.applyTheme(newTheme, tod);
        this.addLog(`Theme refreshed: ${this.getThemeLibrary()[newTheme]?.label || newTheme}`, 'info');
    }

    rerollTimeNow() {
        const newTod = this.timeOfDayOverride || this.pickRandomTimeOfDay();
        const theme = this.themeOverride || this.themeName || this.pickRandomTheme();
        this.applyTheme(theme, newTod);
        this.addLog(`Time of day refreshed: ${newTod}`, 'info');
    }

    drawSky() {
        const lib = this.getThemeLibrary();
        const theme = lib[this.themeName] || lib['forest'];
        const tod = this.timeOfDay;
        const [topD, botD] = theme.skies['day'];
        const [topK, botK] = theme.skies['dusk'];
        const [topN, botN] = theme.skies['night'];
        const cel = this.celestial;
        const celActive = !!(cel?.enabled && this.timeOfDayOverride == null);
        const blends = celActive ? (cel.blends || { day: 0, dusk: 0, night: 1 }) : null;
        // Simple hex color lerp (#rrggbb)
        const lerpHex = (a, b, t) => {
            const pa = [1,3,5].map(i => Number.parseInt(a.slice(i, i+2), 16));
            const pb = [1,3,5].map(i => Number.parseInt(b.slice(i, i+2), 16));
            const pc = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
            return '#' + pc.map(v => v.toString(16).padStart(2, '0')).join('');
        };
        const triBlend = (cD, cK, cN, f) => lerpHex(lerpHex(cN, cK, f.dusk), cD, f.day);
        const top = celActive ? triBlend(topD, topK, topN, blends) : (theme.skies[tod] || theme.skies['day'])[0];
        const bottom = celActive ? triBlend(botD, botK, botN, blends) : (theme.skies[tod] || theme.skies['day'])[1];
        const g = this.ctx.createLinearGradient(0, 0, 0, this.height);
        g.addColorStop(0, top);
        g.addColorStop(1, bottom);
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Clouds per backgrounds matrix
        if (this.cloudsEnabled) {
            this.drawCloudsLayer(tod);
        }
        // (Desk theme removed)
        // Cave overlay elements: ceiling and side-wall vignette
        if (this.themeName === 'cave') {
            const ctx = this.ctx;
            ctx.save();
            // Define a ceiling curve helper so we can reuse for rim shading
            const ceilYAt = (x) => 60 + Math.sin(x * 0.01) * 14 + Math.cos(x * 0.035) * 10;
            // Fill the rock mass above the ceiling curve
            ctx.fillStyle = '#0b0b0b';
            ctx.beginPath();
            ctx.moveTo(0, ceilYAt(0));
            for (let x = 0; x <= this.width; x += 20) {
                ctx.lineTo(x, ceilYAt(x));
            }
            ctx.lineTo(this.width, 0);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();
            // Rim highlight/shadow just below the ceiling to make orientation obvious
            const rimH = Math.max(6, Number(this.config?.graphics?.cave?.rimHeight ?? 24));
            const rimAlpha = Math.max(0, Math.min(1, Number(this.config?.graphics?.cave?.rimAlpha ?? 0.06)));
            const rim = ctx.createLinearGradient(0, 0, 0, rimH);
            rim.addColorStop(0, `rgba(255,255,255,${rimAlpha})`);
            rim.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rim;
            ctx.beginPath();
            ctx.moveTo(0, ceilYAt(0));
            for (let x = 0; x <= this.width; x += 18) ctx.lineTo(x, ceilYAt(x));
            // Extend a thin band downward to apply the gradient
            ctx.lineTo(this.width, Math.min(this.height, ceilYAt(this.width) + rimH));
            ctx.lineTo(0, Math.min(this.height, ceilYAt(0) + rimH));
            ctx.closePath();
            ctx.fill();
            // Side vignette to feel enclosed
            const vg = ctx.createLinearGradient(0, 0, this.width, 0);
            vg.addColorStop(0, 'rgba(0,0,0,0.55)');
            vg.addColorStop(0.12, 'rgba(0,0,0,0)');
            vg.addColorStop(0.88, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(0,0,0,0.55)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, this.width, this.height);
            // Stalactites along the ceiling
            this.ensureCaveStalactites();
            for (const s of this.caveStalactites || []) {
                const cx = s.x;
                const topY = ceilYAt(cx) + s.topOffset;
                const offX = -this.screenShake.x * (1 - s.parallax);
                const offY = -this.screenShake.y * (1 - s.parallax);
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.moveTo(cx + offX, topY + offY);
                ctx.lineTo(cx - s.w * 0.5 + offX, topY + s.len + offY);
                ctx.lineTo(cx + s.w * 0.5 + offX, topY + s.len + offY);
                ctx.closePath();
                ctx.fill();
                // Inner shadow for depth
                const grad = ctx.createLinearGradient(cx + offX, topY + offY, cx + offX, topY + s.len + offY);
                grad.addColorStop(0, 'rgba(0,0,0,0.0)');
                grad.addColorStop(1, 'rgba(0,0,0,0.25)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cx + offX, topY + 2 + offY);
                ctx.lineTo(cx - s.w * 0.4 + offX, topY + s.len - 2 + offY);
                ctx.lineTo(cx + s.w * 0.4 + offX, topY + s.len - 2 + offY);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
        // Note: sky objects (meteors/satellites/UFOs) are drawn later in render()
        // after sun/moon so they always appear in front of them, but still behind terrain.
    }

    updateAndDrawSkyObjects(tod) {
        if (!this.skyObjectsEnabled) return;
        // Enforce concurrency limits and spawn cooldown
        const now = performance.now?.() || Date.now();
        // Defensive: ensure burst state is initialized
    if (!this.skyBurst) this.skyBurst = { remaining: 0, gapMs: 220, clusterX: null };
        const counts = this._skyCounts();
    const total = counts._total;
    const maxTotal = this.skyMaxConcurrent ?? 2; // subtle overall activity
        const activeTypes = Object.keys(counts).filter(k => k !== '_total' && counts[k] > 0);
        const cooldownOk = (now - (this.skyLastSpawnAt || 0)) >= this.skySpawnCooldownMs;
        // Per-type max concurrent items
    const typeMax = this.skyPerTypeMax ?? { meteor: 1, satellite: 0, ufo: 1 };
        // Only spawn if we have room and cooldown passed and either no type active or we keep the same type (and under its cap)
        if (total < maxTotal && cooldownOk) {
            // If a UFO is active, don't spawn anything else (single UFO rule)
            if (counts.ufo >= 1) {
                // wait until UFO leaves
            } else {
            const preferType = activeTypes.length === 1 ? activeTypes[0] : null;
                // If preferType exists but has reached its cap, skip spawning this frame
                if (!preferType || counts[preferType] < (typeMax[preferType] ?? 1)) {
                    // If in a burst, force meteor spawns at a shorter gap
                    if (this.skyBurst.remaining > 0) {
                        const spawned = this.spawnSkyObject(tod, typeMax, 'meteor');
                        if (spawned) {
                            this.skyBurst.remaining--;
                            this.skyLastSpawnAt = now - (this.skySpawnCooldownMs - this.skyBurst.gapMs);
                            if (this.skyBurst.remaining <= 0) {
                                this.skyBurst.clusterX = null;
                            }
                        } else {
                            // If failed to spawn, end the burst to avoid stalls
                            this.skyBurst.remaining = 0;
                            this.skyBurst.clusterX = null;
                        }
                    } else {
                        const spawned = this.spawnSkyObject(tod, typeMax, preferType);
                        if (spawned) this.skyLastSpawnAt = now;
                        // Randomly start a short meteor shower (2–3 streaks), mostly at night/dusk
                        const burstChance = (this.meteorCfg?.burst?.chance?.[tod]) ?? (tod === 'night' ? 0.06 : (tod === 'dusk' ? 0.04 : 0.02));
                        if (spawned && Math.random() < burstChance) {
                            const cmin = Math.max(1, this.meteorCfg?.burst?.countMin ?? 2);
                            const cmax = Math.max(cmin, this.meteorCfg?.burst?.countMax ?? 3);
                            const gapMin = this.meteorCfg?.burst?.gapMinMs ?? 200;
                            const gapMax = Math.max(gapMin, this.meteorCfg?.burst?.gapMaxMs ?? 360);
                            this.skyBurst.remaining = Math.floor(cmin + Math.random() * (cmax - cmin + 1)) - 1; // already spawned one
                            this.skyBurst.gapMs = gapMin + Math.random() * (gapMax - gapMin);
                            // Choose a temporary cluster center across the full terrain width
                            const margin = Math.max(40, this.width * 0.08);
                            this.skyBurst.clusterX = margin + Math.random() * (this.width - margin * 2);
                        }
                    }
                }
            }
        }
        // Update and draw
        const ctx = this.ctx;
        for (let i = this.skyObjects.length - 1; i >= 0; i--) {
            const o = this.skyObjects[i];
            // Motion
            o.x += o.vx; o.y += o.vy;
            // Meteors: add slight gravity and atmospheric burn/shrink with occasional burn-up
            if (o.type === 'meteor') {
                // Gravity for steeper descent over time
                o.vy += (this.meteorCfg?.burn?.gravityVyPerFrame ?? 0.01);
                // Atmospheric thickness: stronger burn during day, weaker at night
                const atmo = (this.meteorCfg?.burn?.atmo?.[tod]) ?? ((tod === 'day') ? 1.35 : (tod === 'dusk') ? 1.15 : 0.85);
                // Burn/shrink proportional to speed and atmospheric density
                const speedMag = Math.hypot(o.vx, o.vy);
                const base = this.meteorCfg?.burn?.sizeShrinkBase ?? 0.003;
                const factor = this.meteorCfg?.burn?.sizeShrinkSpeedFactor ?? 0.0009;
                const burn = (base + factor * speedMag) * atmo;
                o.size = Math.max(0, (o.size || 2) - burn);
                // Chance to burn up before ground if very small and still high above terrain
                const groundY = this.terrain?.getHeight?.(o.x) ?? Number.POSITIVE_INFINITY;
                const heightAbove = groundY - o.y;
                const burnProb = (this.meteorCfg?.burn?.burnUpProb?.[tod]) ?? ((tod === 'day') ? 0.75 : (tod === 'dusk') ? 0.6 : 0.35);
                const sizeThresh = this.meteorCfg?.burn?.burnUpSizeThreshold ?? 0.8;
                const hMin = this.meteorCfg?.burn?.burnUpHeightMin ?? 40;
                if (o.size <= sizeThresh && heightAbove > hMin && Math.random() < burnProb) {
                    this.particleSystem.createSmokePuff(o.x, Math.min(groundY - 2, o.y), 4);
                    this.skyObjects.splice(i, 1);
                    continue;
                }
            }
            // Ground collision (meteors collide)
            if (o.collidesGround) {
                const ground = this.terrain?.getHeight?.(o.x) ?? Number.POSITIVE_INFINITY;
                if (o.y >= ground - 1) {
                    // Impact smoke puff; bolides create a larger puff
                    const puffCount = o.bolide ? 10 : 5;
                    this.particleSystem.createSmokePuff(o.x, ground - 2, puffCount);
                    this.skyObjects.splice(i, 1);
                    continue;
                }
            }
            // Remove when offscreen only (avoid random vanishing)
            if (o.x < -120 || o.x > this.width + 120 || o.y < -120 || o.y > this.height * 0.8 + 120) {
                this.skyObjects.splice(i, 1);
                continue;
            }
            // draw
            ctx.save();
            if (o.type === 'meteor') {
                const size = Math.max(0.6, o.size || 2.2);
                const trailFactor = 4 + Math.min(8, Math.max(0, Math.abs(o.vx)));
                const trailX = o.x - o.vx * trailFactor * 0.8;
                const trailY = o.y - o.vy * trailFactor * 0.8;
                // Time-of-day trail color cues
                let headColor = '#ffffff';
                let trailColor = 'rgba(255,255,255,0.8)';
                if (this.timeOfDay === 'dusk') {
                    trailColor = 'rgba(255,180,120,0.85)';
                    headColor = '#ffd7a8';
                } else if (this.timeOfDay === 'night') {
                    trailColor = 'rgba(180,210,255,0.85)';
                    headColor = '#e4f1ff';
                }
                const grad = ctx.createLinearGradient(trailX, trailY, o.x, o.y);
                grad.addColorStop(0, 'rgba(255,255,255,0)');
                grad.addColorStop(1, trailColor);
                ctx.strokeStyle = grad;
                ctx.lineWidth = Math.max(1.5, size * 0.9);
                ctx.beginPath();
                ctx.moveTo(trailX, trailY);
                ctx.lineTo(o.x, o.y);
                ctx.stroke();
                ctx.fillStyle = headColor;
                ctx.beginPath();
                ctx.arc(o.x, o.y, size, 0, Math.PI * 2);
                ctx.fill();
            } else if (o.type === 'ufo') {
                // Grey flying saucer with glass dome and tiny green alien
                // Soft neutral glow
                const ring = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 16);
                ring.addColorStop(0, 'rgba(200,210,230,0.35)');
                ring.addColorStop(1, 'rgba(200,210,230,0)');
                ctx.fillStyle = ring;
                ctx.beginPath();
                ctx.ellipse(o.x, o.y + 1, 16, 9, 0, 0, Math.PI * 2);
                ctx.fill();
                // Saucer bottom plate (darker)
                const plateGrad = ctx.createLinearGradient(o.x - 14, o.y, o.x + 14, o.y);
                plateGrad.addColorStop(0, '#6b6b6b');
                plateGrad.addColorStop(0.5, '#9a9a9a');
                plateGrad.addColorStop(1, '#5e5e5e');
                ctx.fillStyle = plateGrad;
                ctx.beginPath();
                ctx.ellipse(o.x, o.y + 1, 14, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                // Saucer rim lights
                ctx.fillStyle = '#ffd966';
                for (let k = -6; k <= 6; k += 3) {
                    ctx.beginPath();
                    ctx.arc(o.x + k, o.y + 2.5, 0.9, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Glass dome
                ctx.fillStyle = 'rgba(120,180,255,0.55)';
                ctx.beginPath();
                ctx.ellipse(o.x, o.y - 2, 6.5, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Alien head (simple)
                ctx.fillStyle = '#3ad157';
                ctx.beginPath();
                ctx.arc(o.x, o.y - 2, 2.2, 0, Math.PI * 2);
                ctx.fill();
                // Alien eyes
                ctx.fillStyle = '#1a1a1a';
                ctx.beginPath();
                ctx.ellipse(o.x - 0.8, o.y - 2.1, 0.6, 0.9, -0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(o.x + 0.8, o.y - 2.1, 0.6, 0.9, 0.15, 0, Math.PI * 2);
                ctx.fill();
                // Tiny antenna
                ctx.strokeStyle = '#3ad157';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(o.x, o.y - 4.4);
                ctx.lineTo(o.x, o.y - 6);
                ctx.stroke();
                ctx.fillStyle = '#3ad157';
                ctx.beginPath();
                ctx.arc(o.x, o.y - 6.2, 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    spawnSkyObject(tod, typeMax, preferredType = null) {
    typeMax = typeMax || { meteor: 2, satellite: 0, ufo: 1 };
    // Concurrency rules: avoid mixing types; if UFO present, block spawns
        const counts = this._skyCounts();
        const now = (performance.now?.() || Date.now());
    if (counts.ufo >= 1 && preferredType !== 'ufo') return false;
        const chooseType = () => {
            if (preferredType) return preferredType;
            const r = Math.random();
            const meteorP = this.meteorProbByTod?.[tod] ?? ((tod === 'night' ? 0.36 : 0.18) * 0.24);
            const ufoAvailable = (now - (this.lastUfoAt || 0)) >= (this.minUfoIntervalMs || 90000);
            const ufoP = this.ufoChance ?? 0.03;
            if (r < meteorP) return 'meteor';
            if (ufoAvailable && r > (1 - ufoP)) return 'ufo';
            // With satellites disabled, do not force a meteor spawn; skip spawning this time
            return null;
        };
    let type = chooseType();
    if (!type) { this.skyLastSpawnAt = now; return false; }
    // Enforce single-type activity; if any active type exists, stick to it
        const activeTypes = Object.keys(counts).filter(k => k !== '_total' && counts[k] > 0);
        if (activeTypes.length === 1) type = activeTypes[0];
        // Cap per type
        if (counts[type] >= (typeMax[type] ?? 1)) return false;

        // Spawn from a random edge with a target across sky or near ground
        let x, y, vx, vy;
        if (type === 'meteor') {
            // Always right-to-left; randomize impact across full map (no player targeting)
            x = this.width + 40 + Math.random() * 60;
            const entryMin = Math.max(0, this.meteorCfg?.entryHeightFracMin ?? 0);
            const entryMax = Math.max(entryMin, this.meteorCfg?.entryHeightFracMax ?? 0.35);
            y = 10 + Math.random() * (this.height * entryMax);
            // Choose intended impact X: use burst cluster center if set, otherwise anywhere across terrain
            const margin = Math.max(40, this.width * 0.08);
            let impactX = (this.skyBurst?.clusterX != null)
                ? this.skyBurst.clusterX + (Math.random() - 0.5) * (this.meteorCfg?.clusterSpread ?? 120) // cluster around center
                : margin + Math.random() * (this.width - margin * 2);
            impactX = Math.max(margin, Math.min(this.width - margin, impactX));
            // Aim slightly past the intended impact so the vector crosses ground near impactX
            const targetX = impactX - (30 + Math.random() * 80);
            const groundAtImpact = this.terrain?.getHeight?.(impactX) ?? (this.height * 0.7);
            const targetY = Math.min(this.height * 0.92, groundAtImpact) - (12 + Math.random() * 36);
            // Slightly faster for a steeper track
            const sMin = this.meteorCfg?.speedMin ?? 6;
            const sMax = this.meteorCfg?.speedMax ?? 11.5;
            const speed = sMin + Math.random() * Math.max(0, sMax - sMin);
            const dx = targetX - x;
            const dy = targetY - y;
            const len = Math.hypot(dx, dy) || 1;
            vx = (dx / len) * speed;
            vy = (dy / len) * speed * (0.95 + Math.random() * 0.3);
            // Rare "bolide" meteors: brighter, bigger, survive longer
            const isBolide = Math.random() < (this.meteorCfg?.bolideChance ?? 0.12);
            const size = (isBolide ? 2.6 : 1.6) + Math.random() * (isBolide ? 4.2 : 3.6);
            const lifeBoost = isBolide ? 1.6 : 1.0;
            this.skyObjects.push({ type: 'meteor', x, y, vx, vy, size, collidesGround: true, bolide: isBolide, lifeBoost });
            return true;
        }
        if (type === 'satellite') {
            const dirRight = Math.random() < 0.5; // left -> right or right -> left
            x = dirRight ? -40 : this.width + 40;
            y = 80 + Math.random() * (this.height * 0.25);
            vx = (dirRight ? 1 : -1) * (1.2 + Math.random() * 0.8);
            vy = 0.05 * (Math.random() - 0.5);
            this.skyObjects.push({ type: 'satellite', x, y, vx, vy, collidesGround: false });
            return true;
        }
        if (type === 'ufo') {
            // Single UFO, glide across upper sky (both directions)
            const dirRight = Math.random() < 0.5; // allow both L->R and R->L
            x = dirRight ? -60 : this.width + 60;
            y = 70 + Math.random() * (this.height * 0.2);
            vx = (dirRight ? 1 : -1) * (1.8 * (0.7 + Math.random() * 0.6));
            vy = 0;
            this.skyObjects.push({ type: 'ufo', x, y, vx, vy, collidesGround: false });
            this.lastUfoAt = now;
            return true;
        }
        return false;
    }

    _skyCounts() {
        const c = { meteor: 0, satellite: 0, ufo: 0, _total: 0 };
        for (const o of this.skyObjects) {
            if (o.type in c) {
                c[o.type]++;
            }
            c._total++;
        }
        return c;
    }

    initClouds() {
        this.clouds = [];
        const W = this.width;
        const H = this.height;
        const skyHeight = H * 0.55; // clouds live in top 55% of screen
        const count = 6 + Math.floor(Math.random() * 6); // 6-11 clouds total

        for (let i = 0; i < count; i++) {
            const seed = Math.random() * 10000;
            // Random Y spread across sky, biased toward upper portion
            const yFrac = Math.pow(Math.random(), 0.7); // bias upward
            const y = skyHeight * 0.05 + yFrac * skyHeight * 0.75;

            // Size varies with altitude (higher = bigger/hazier background clouds)
            const altFrac = 1 - (y / skyHeight);
            const baseW = 120 + altFrac * 220 + Math.random() * 120; // 120-460px wide
            const baseH = baseW * (0.28 + Math.random() * 0.18);     // aspect ratio

            // Speed: higher/larger clouds drift slower
            const speed = (0.4 + Math.random() * 1.2) * (1 - altFrac * 0.5);

            // Number and arrangement of lobes varies per cloud
            const lobeCount = 3 + Math.floor(Math.random() * 4); // 3-6 lobes
            const lobes = [];
            for (let l = 0; l < lobeCount; l++) {
                const t = l / (lobeCount - 1); // 0..1 along cloud width
                lobes.push({
                    dx: (t - 0.5) * baseW * (0.85 + Math.random() * 0.2),
                    dy: (Math.random() - 0.5) * baseH * 0.55 - baseH * (0.1 + Math.random() * 0.2),
                    rx: baseW * (0.28 + Math.random() * 0.22),
                    ry: baseH * (0.55 + Math.random() * 0.35),
                    a: Math.random() * 0.4 - 0.2, // slight rotation
                });
            }
            // Always add a dominant center lobe for that puffy look
            lobes.push({
                dx: (Math.random() - 0.5) * baseW * 0.25,
                dy: -baseH * (0.3 + Math.random() * 0.2),
                rx: baseW * (0.35 + Math.random() * 0.15),
                ry: baseH * (0.65 + Math.random() * 0.25),
                a: (Math.random() - 0.5) * 0.3,
            });

            // Alpha: higher = more transparent (background), lower = more opaque
            const alphaBase = altFrac > 0.6 ? (0.07 + Math.random() * 0.05) : (0.12 + Math.random() * 0.1);

            this.clouds.push({
                x: Math.random() * (W + 600) - 300, // start anywhere including offscreen
                y,
                speed,
                baseW,
                baseH,
                lobes,
                alphaBase,
                seed,
            });
        }
    }

    drawCloudsLayer(tod) {
        const ctx = this.ctx;
        const fade = Math.min(1, this.skyTime / 3);
        if (fade <= 0) return;

        if (!this.clouds || this.clouds.length === 0) this.initClouds();

        const W = this.width;
        const dt = (tod === 'day' ? 1.0 : 0.65); // day clouds drift slightly faster

        for (const c of this.clouds) {
            // Advance cloud position
            c.x += c.speed * dt * 0.016; // ~1 frame at 60fps

            // Wrap around: disappear off right edge, reappear from left (or vice versa for negative speeds)
            if (c.x > W + c.baseW * 0.6 + 60) {
                c.x = -c.baseW * 0.6 - 60;
            } else if (c.x < -c.baseW * 0.6 - 60) {
                c.x = W + c.baseW * 0.6 + 60;
            }

            // Night clouds slightly dimmer
            const alphaMult = (tod === 'day' ? 1.0 : 0.75) * fade;
            const alpha = c.alphaBase * alphaMult;

            // Draw each lobe
            for (const lobe of c.lobes) {
                const lx = c.x + lobe.dx;
                const ly = c.y + lobe.dy;
                const rx = lobe.rx;
                const ry = lobe.ry;

                const grad = ctx.createRadialGradient(lx, ly - ry * 0.15, 0, lx, ly, rx * 0.9);
                grad.addColorStop(0,   `rgba(255,255,255,${alpha})`);
                grad.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.55})`);
                grad.addColorStop(1,   'rgba(255,255,255,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(lx, ly, rx, ry, lobe.a, 0, Math.PI * 2);
                ctx.fill();
            }

            // Subtle shadow on underside for depth (day only)
            if (tod === 'day') {
                for (const lobe of c.lobes) {
                    const lx = c.x + lobe.dx;
                    const ly = c.y + lobe.dy + lobe.ry * 0.45;
                    const shadGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, lobe.rx * 0.6);
                    shadGrad.addColorStop(0, `rgba(160,175,195,${alpha * 0.28})`);
                    shadGrad.addColorStop(1, 'rgba(160,175,195,0)');
                    ctx.fillStyle = shadGrad;
                    ctx.beginPath();
                    ctx.ellipse(lx, ly, lobe.rx * 0.65, lobe.ry * 0.35, lobe.a, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    // Draws a flag pole anchored to terrain and a wind bar HUD indicating direction/strength
    drawWindIndicators() {
        const displayWind = this.windOverride ?? this.wind;
        // Normalize against configured windMax
        const configuredMax = Math.abs(this.config?.physics?.windMax ?? 8);
        const maxAbsWind = configuredMax || 8; // Use configured max, fallback to 8
        const ratio = Math.max(-1, Math.min(1, maxAbsWind === 0 ? 0 : displayWind / maxAbsWind));

        if (this.config?.ui?.windBar?.enabled !== false) {
            this.drawWindBar(displayWind, ratio);
        }
        if (this.config?.ui?.windFlag?.enabled !== false) {
            this.drawWindFlag(displayWind, ratio);
        }
    }

    drawWindBar(displayWind, ratio) {
        const ctx = this.ctx;
        const wbCfg = this.config?.ui?.windBar || {};
        const barWidth = Math.max(120, Number(wbCfg.width ?? 260));
        const centerX = this.width / 2;
        const position = String(wbCfg.position || 'top');
        const y = position === 'bottom' ? (this.height - 48) : 24;
        const half = barWidth / 2;

        // Background
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.fillRect(centerX - half - 10, y - 14, barWidth + 20, 36);
        ctx.strokeRect(centerX - half - 10, y - 14, barWidth + 20, 36);
        ctx.restore();

        // Title and value
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Wind', centerX, y - 2);
        ctx.fillText(Math.abs(displayWind).toFixed(1), centerX, y + 26);

        // Bar baseline
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX - half, y + 8);
        ctx.lineTo(centerX + half, y + 8);
        ctx.stroke();

        // Center tick
        ctx.beginPath();
        ctx.moveTo(centerX, y + 2);
        ctx.lineTo(centerX, y + 14);
        ctx.stroke();

        // Fill left/right according to sign
        const magnitude = Math.abs(ratio) * half;
        if (ratio > 0) {
            // Right (magenta)
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(centerX, y + 2, magnitude, 12);
            // Arrow
            ctx.beginPath();
            ctx.moveTo(centerX + magnitude, y + 8);
            ctx.lineTo(centerX + magnitude - 8, y + 2);
            ctx.lineTo(centerX + magnitude - 8, y + 14);
            ctx.closePath();
            ctx.fill();
        } else if (ratio < 0) {
            // Left (cyan)
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(centerX - magnitude, y + 2, magnitude, 12);
            // Arrow
            ctx.beginPath();
            ctx.moveTo(centerX - magnitude, y + 8);
            ctx.lineTo(centerX - magnitude + 8, y + 2);
            ctx.lineTo(centerX - magnitude + 8, y + 14);
            ctx.closePath();
            ctx.fill();
        } else {
            // Calm dot
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(centerX, y + 8, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawWindFlag(displayWind, ratio) {
        const ctx = this.ctx;
        // Determine placement from config
        const mode = this.config?.ui?.windFlag?.mode ?? 'terrain';
        const baseX = Math.max(10, Math.min(this.width - 10, this.config?.ui?.windFlag?.x ?? 50));
        const poleHeight = this.config?.ui?.windFlag?.poleHeight ?? 90;

        // Compute ground position if terrain mode; otherwise use HUD corner
        let groundY;
        if (mode === 'terrain' && this.terrain) {
            const clampX = Math.max(0, Math.min(this.width - 1, baseX));
            groundY = this.terrain.getHeight(clampX);
            // Fallback: if terrain height suggests offscreen (e.g., sky), place pole at safe HUD position
            if (!Number.isFinite(groundY) || groundY < 60 || groundY > this.height - 5) {
                groundY = Math.min(this.height - 10, this.height - 60);
            }
        } else {
            groundY = 100; // HUD mode baseline
        }
        const topX = baseX;
        const topY = groundY - poleHeight;

        // Pole
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#8b8b8b';
        ctx.beginPath();
        ctx.moveTo(baseX, groundY);
        ctx.lineTo(topX, topY);
        ctx.stroke();

        // Base support
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.moveTo(baseX - 10, groundY + 2);
        ctx.lineTo(baseX + 10, groundY + 2);
        ctx.stroke();

        // Flag cloth
        const flagLen = 42 + Math.abs(ratio) * 42; // 42-84
        const flagH = 18;
        const droop = 4 + Math.abs(ratio) * 6; // slight droop with strength
        const dir = ratio >= 0 ? 1 : -1; // 1 right, -1 left
        const flagColor = dir > 0 ? '#ff00ff' : '#00ffff';

        // Attachment point slightly below pole top
        const attachX = topX;
        const attachY = topY + 16;

        ctx.fillStyle = flagColor;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.2;

        // Draw a simple 4-point cloth with a slight curved bottom via poly approx
        ctx.beginPath();
        ctx.moveTo(attachX, attachY);
        ctx.lineTo(attachX + dir * flagLen, attachY - 2);
        ctx.lineTo(attachX + dir * flagLen, attachY + flagH - droop);
        ctx.lineTo(attachX, attachY + flagH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

    // Small flag trim/stripe for style
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.moveTo(attachX, attachY + flagH * 0.5);
        ctx.lineTo(attachX + dir * flagLen, attachY + flagH * 0.5 - droop * 0.5);
        ctx.stroke();

        // Wind text near pole
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
    let label;
    if (dir > 0) label = '→';
    else if (dir < 0) label = '←';
    else label = '';
    ctx.fillText(`${label} ${Math.abs(displayWind).toFixed(1)}`, attachX + 8, attachY - 8);

        ctx.restore();
    }
    
    generateNebula() {
        this.nebulaClouds = [];
        this._nebulaGradientCache = []; // Cache gradients to avoid recreating each frame
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height * 0.6;
            const radius = Math.random() * 150 + 100;
            const color = ['#0a1428', '#1a0a28', '#0a1a28', '#1a2808'][Math.floor(Math.random() * 4)];
            const alpha = Math.random() * 0.15 + 0.05;

            this.nebulaClouds.push({ x, y, radius, color, alpha });

            // Pre-create gradient for this nebula cloud
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.5, `${color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${color}00`);
            this._nebulaGradientCache.push(gradient);
        }
    }
    
    drawNebula() {
        const cel = this.celestial;
        const celActive = !!(cel?.enabled && this.timeOfDayOverride == null);
    const alphaMul = (celActive ? (cel.nebulaAlpha ?? 1) : 1) * ((this.effectiveKnobs?.nebulaAlphaScale ?? this.skyKnobs?.nebulaAlphaScale) ?? 1);
        if (!this.nebulaEnabled && !celActive) return;
        if (this.nebulaClouds.length === 0) {
            this.generateNebula();
        }
        this.ctx.save();
        this.ctx.globalAlpha *= Math.max(0, Math.min(1, alphaMul));
        // Use cached gradients instead of recreating each frame
        for (let i = 0; i < this.nebulaClouds.length; i++) {
            const cachedGradient = this._nebulaGradientCache?.[i];
            if (cachedGradient) {
                this.ctx.fillStyle = cachedGradient;
                this.ctx.fillRect(0, 0, this.width, this.height);
            }
        }
        this.ctx.restore();
    }
    
    drawStars() {
        const cel = this.celestial;
        const celActive = !!(cel?.enabled && this.timeOfDayOverride == null);
        const alphaMul = celActive ? (cel.starsAlpha ?? 1) : 1;
        if (!this.starsEnabled && !celActive) return;
        if (!this.stars) {
            this.stars = [];
            this._starGradientCache = []; // Cache for gradients to avoid recreating each frame
            const starCount = Math.max(0, Math.floor((this.effectiveKnobs?.stars?.count ?? this.skyKnobs?.stars?.count) ?? 200));
            for (let i = 0; i < starCount; i++) {
                // Bias sizes toward smaller crisp points: square a 0..1 rand to weight small sizes
                const r = Math.random();
                const size = 0.25 + Math.pow(r, 2) * 2.2; // 0.25 .. ~2.45, mostly small
                const x = Math.random() * this.width;
                const y = Math.random() * (this.height * 0.6);

                this.stars.push({
                    x,
                    y,
                    size,
                    brightness: (Math.random() * 0.8 + 0.2) * ((this.effectiveKnobs?.stars?.brightnessScale ?? this.skyKnobs?.stars?.brightnessScale) ?? 1),
                    twinkleSpeed: (Math.random() * 0.03 + 0.01) * ((this.effectiveKnobs?.stars?.twinkleScale ?? this.skyKnobs?.stars?.twinkleScale) ?? 1),
                    twinkleVar: Math.random() * 0.6 + 0.4,
                    twinkleSpeed2: (Math.random() * 0.06 + 0.02),
                    color: Math.random() > 0.88 ? '#aaffff' : '#ffffff',
                    flare: Math.random() < 0.08 // slightly rarer subtle spikes
                });

                // Pre-create gradient for stars with glow (size > 1.2)
                if (size > 1.2) {
                    const radius = size * 1.6;
                    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
                    gradient.addColorStop(0.45, 'rgba(200, 220, 255, 0.25)');
                    gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
                    this._starGradientCache.push(gradient);
                } else {
                    this._starGradientCache.push(null);
                }
            }
        }
    // Compute a dedicated animation clock that advances even when the simulation is paused.
    // This ensures stars twinkle/rotate on menus or when the game is paused, while clamping
    // the per-frame step to avoid jumps after tab sleep.
    // Tweaks:
    // - twinkleSpeed and twinkleSpeed2 control the twinkle rate (per-star randomized)
    // - brightness scales overall star intensity (configurable via graphics.backgrounds.knobs)
    // - rotationAngle rate controls sky rotation speed; lower = slower rotation
    // - flare intensity is governed by spikeAlpha and the flare probability when generating stars
    const nowSec = ((performance.now?.()) || Date.now()) * 0.001;
    if (this._twinkleTime == null) { this._twinkleTime = 0; this._twinkleLast = nowSec; }
    const dtTw = Math.min(Math.max(0, nowSec - (this._twinkleLast || nowSec)), 0.1);
    this._twinkleTime += dtTw;
    this._twinkleLast = nowSec;
    const time = this._twinkleTime;
        this.ctx.save();
        this.ctx.globalAlpha *= Math.max(0, Math.min(1, alphaMul));

        // Rotate stars slowly over time to simulate Earth's rotation
    // Rotation speed is configurable; default to a subtle rate if not set
    const rotRate = (this.effectiveKnobs?.stars?.rotationRate ?? this.skyKnobs?.stars?.rotationRate) ?? 0.0005;
    const rotationAngle = time * rotRate;
        const centerX = this.width / 2;
        const centerY = this.height * 0.3; // Rotate around upper-middle of sky
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(rotationAngle);
        this.ctx.translate(-centerX, -centerY);

        // Use additive-like blending for sparkle without washing out sky
        const prevOp = this.ctx.globalCompositeOperation;
        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            // Dual-frequency twinkle with per-star variance
            const t1 = Math.sin(time * star.twinkleSpeed + star.x * 0.37);
            const t2 = Math.sin(time * (star.twinkleSpeed2 || (star.twinkleSpeed * 1.7)) + star.y * 0.19 + 1.3);
            const twinkle = (0.5 + 0.5 * (0.65 * t1 + 0.35 * t2)) * (star.twinkleVar || 1);
            const alpha = star.brightness * Math.max(0.25, Math.min(1, twinkle));

            // Star glow - use cached gradient with dynamic alpha
            const cachedGradient = this._starGradientCache?.[i];
            if (cachedGradient) {
                const radius = star.size * 1.6;
                this.ctx.globalAlpha = alpha * alphaMul;
                this.ctx.fillStyle = cachedGradient;
                this.ctx.fillRect(star.x - radius, star.y - radius, radius * 2, radius * 2);
                this.ctx.globalAlpha = alphaMul; // Reset for star core
            }
            
            // Star itself (modulate size slightly with twinkle to make shimmer noticeable)
            const col = (star.color === '#ffffff')
                ? `rgba(255, 255, 255, ${alpha})`
                : `rgba(170, 255, 255, ${alpha})`;
            this.ctx.fillStyle = col;
            const sizeNow = star.size * (1 + 0.18 * (twinkle - 0.5));
            // Sharper core: for very small stars, draw a crisp pixel or tiny plus
            if (sizeNow <= 0.6) {
                // Crisp pixel core with a faint tiny cross for visibility
                const ix = Math.round(star.x) + 0.5;
                const iy = Math.round(star.y) + 0.5;
                this.ctx.fillRect(ix, iy, 1, 1);
                // Tiny cross shimmer (very faint)
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath(); this.ctx.moveTo(ix - 0.8, iy); this.ctx.lineTo(ix + 0.8, iy); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(ix, iy - 0.8); this.ctx.lineTo(ix, iy + 0.8); this.ctx.stroke();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, sizeNow * 0.9, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Subtle lens flare spikes for a few bright stars
            if (star.flare && star.size > 1.0 && alpha > 0.35) {
                const spikeAlpha = alpha * 0.18; // a touch softer
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${spikeAlpha})`;
                this.ctx.lineWidth = Math.max(0.6, star.size * 0.18);
                const len = 3 + star.size * 2.2;
                // Horizontal
                this.ctx.beginPath();
                this.ctx.moveTo(star.x - len, star.y);
                this.ctx.lineTo(star.x + len, star.y);
                this.ctx.stroke();
                // Vertical
                this.ctx.beginPath();
                this.ctx.moveTo(star.x, star.y - len);
                this.ctx.lineTo(star.x, star.y + len);
                this.ctx.stroke();
                // Diagonals (fainter)
                this.ctx.strokeStyle = `rgba(220, 235, 255, ${spikeAlpha * 0.55})`;
                const d = len * 0.7;
                this.ctx.beginPath();
                this.ctx.moveTo(star.x - d, star.y - d);
                this.ctx.lineTo(star.x + d, star.y + d);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(star.x - d, star.y + d);
                this.ctx.lineTo(star.x + d, star.y - d);
                this.ctx.stroke();
            }
        }
        this.ctx.globalCompositeOperation = prevOp;
        this.ctx.restore();
    }

    drawMoon() {
        const cel = this.celestial;
        const celActive = !!(cel?.enabled && this.timeOfDayOverride == null);
        // Smooth arc across the sky from left to right (moon opposite sun by phase)
    const radius = (this.effectiveKnobs?.moonRadius ?? this.skyKnobs?.moonRadius) ?? 24;
        let progress;
        if (celActive) {
            // Moon lags the sun by half a cycle for separation
            progress = (cel.progress + 0.5) % 1;
        } else {
            const speedPxPerSec = this.skySpeeds.moon; // legacy fallback
            progress = ((this.skyTime * speedPxPerSec) / Math.max(1, this.width)) % 1;
        }
        const x = progress * this.width;
        // Parabolic arc: minimal y (highest point) at center, higher near edges
        const apexY = this.height * 0.14;
        const edgeRise = this.height * 0.1;
        const centered = 2 * progress - 1;
        const y = apexY + edgeRise * (centered * centered);
        const ctx = this.ctx;
        ctx.save();
        const alpha = celActive ? (cel.moonAlpha ?? 1) : 1;
        // If moon is fully invisible (e.g., bright daytime), avoid any compositing that could punch a hole
        // in the sky due to destination-out later. This prevents a dark/transparent circle artifact.
        if (alpha <= 0) { ctx.restore(); return; }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        // Glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        grad.addColorStop(0, 'rgba(255,255,230,0.3)');
        grad.addColorStop(1, 'rgba(255,255,230,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6);
        // Draw moon body and phase on an offscreen to avoid punching holes into the main canvas
        // when using destination-out for the terminator.
        const offSize = Math.ceil(radius * 2 + 4);
        const off = (typeof OffscreenCanvas !== 'undefined')
            ? new OffscreenCanvas(offSize, offSize)
            : (() => { const c = document.createElement('canvas'); c.width = offSize; c.height = offSize; return c; })();
        const octx = off.getContext('2d');
        octx.clearRect(0, 0, off.width, off.height);
        const cx = off.width / 2;
        const cy = off.height / 2;
        // Base disk on offscreen
        octx.fillStyle = '#f0f0da';
        octx.beginPath();
        octx.arc(cx, cy, radius, 0, Math.PI * 2);
        octx.fill();
        // Phase shading via gradient shadow (more realistic than solid black circle)
        if (celActive) {
            const phase = cel.moonPhase || 0; // 0 new, 0.5 full, 1 new
            const f = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
            const sunX = (cel.progress) * this.width;
            const litOnRight = sunX >= x;
            const side = litOnRight ? 1 : -1;
            const m = 2 * radius * f;
            const cxDark = cx - side * m;
            octx.save();
            octx.beginPath();
            octx.arc(cx, cy, radius, 0, Math.PI * 2);
            octx.clip();

            // Use gradient overlay for smoother shadow transition
            // Shadow opacity varies by time of day (more transparent during day, more opaque at night)
            const nightBlend = cel.blends?.night || 0;
            const baseOpacity = Math.max(0.5, 0.5 + nightBlend * 0.3); // 0.5 day, 0.8 night

            // Draw shadow using source-atop for better browser compatibility
            octx.globalCompositeOperation = 'source-atop';

            // Create a more realistic crescent shadow
            const shadowGrad = octx.createRadialGradient(cxDark, cy, 0, cxDark, cy, radius * 1.5);
            shadowGrad.addColorStop(0, `rgba(20, 20, 30, ${baseOpacity})`); // Dark center
            shadowGrad.addColorStop(0.5, `rgba(30, 30, 40, ${baseOpacity * 0.8})`); // Mid fade
            shadowGrad.addColorStop(0.8, `rgba(40, 40, 50, ${baseOpacity * 0.4})`); // Lighter edge
            shadowGrad.addColorStop(1, `rgba(50, 50, 60, 0)`); // Transparent edge

            octx.fillStyle = shadowGrad;
            octx.beginPath();
            octx.arc(cxDark, cy, radius * 1.5, 0, Math.PI * 2);
            octx.fill();

            // Add a secondary shadow for depth
            const edgeGrad = octx.createLinearGradient(cx - radius * side, cy, cx + radius * side, cy);
            edgeGrad.addColorStop(0, `rgba(10, 10, 20, ${litOnRight ? 0 : baseOpacity * 0.6})`);
            edgeGrad.addColorStop(0.5, `rgba(20, 20, 30, ${baseOpacity * 0.3})`);
            edgeGrad.addColorStop(1, `rgba(10, 10, 20, ${litOnRight ? baseOpacity * 0.6 : 0})`);

            octx.fillStyle = edgeGrad;
            octx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

            octx.globalCompositeOperation = 'source-over';
            octx.restore();
        }
        // Enhanced craters for more realistic moon surface
        octx.globalCompositeOperation = 'source-over';

        // Large craters with depth
        const craterPositions = [
            { x: 0.3, y: 0.2, size: 0.12 },
            { x: -0.2, y: -0.3, size: 0.08 },
            { x: 0.4, y: -0.4, size: 0.06 },
            { x: -0.35, y: 0.15, size: 0.09 },
            { x: 0.1, y: 0.35, size: 0.07 },
            { x: -0.15, y: -0.05, size: 0.05 },
            { x: 0.25, y: -0.15, size: 0.04 }
        ];

        for (const crater of craterPositions) {
            const craterX = cx + crater.x * radius;
            const craterY = cy + crater.y * radius;
            const craterRadius = crater.size * radius;

            // Crater shadow (darker inner ring)
            octx.globalAlpha = 0.3;
            octx.fillStyle = '#888888';
            octx.beginPath();
            octx.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
            octx.fill();

            // Crater highlight (lighter rim)
            octx.globalAlpha = 0.2;
            octx.strokeStyle = '#e0e0d0';
            octx.lineWidth = 1;
            octx.beginPath();
            octx.arc(craterX - 1, craterY - 1, craterRadius, -Math.PI * 0.3, Math.PI * 0.7);
            octx.stroke();
        }

        // Small surface details
        octx.globalAlpha = 0.15;
        octx.fillStyle = '#b0b0a0';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + 0.5;
            const r = radius * (0.3 + Math.random() * 0.4);
            const rx = cx + Math.cos(a) * r;
            const ry = cy + Math.sin(a) * r;
            octx.beginPath();
            octx.arc(rx, ry, 1 + Math.random() * 2, 0, Math.PI * 2);
            octx.fill();
        }
        // Composite offscreen moon onto main canvas
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(off, Math.round(x - cx), Math.round(y - cy));
        ctx.restore();
    }

    drawSun() {
        const cel = this.celestial;
        const celActive = !!(cel?.enabled && this.timeOfDayOverride == null);
        // Golden sun moving on a smooth arc similar to the moon
    const radius = (this.effectiveKnobs?.sunRadius ?? this.skyKnobs?.sunRadius) ?? 26;
        let progress;
        if (celActive) {
            progress = cel.progress;
        } else {
            const speedPxPerSec = this.skySpeeds.sun;
            progress = ((this.skyTime * speedPxPerSec) / Math.max(1, this.width)) % 1;
        }
        const x = progress * this.width;
        const apexY = this.height * 0.18; // slightly lower apex than moon
        const edgeRise = this.height * 0.12;
        const centered = 2 * progress - 1;
        const y = apexY + edgeRise * (centered * centered);
        const ctx = this.ctx;
        ctx.save();
        const alpha = celActive ? (cel.sunAlpha ?? 1) : 1;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        // Warm glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.5);
        grad.addColorStop(0, 'rgba(255,220,120,0.45)');
        grad.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);
        // Disk
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        // Subtle highlight
        const hi = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        hi.addColorStop(0, 'rgba(255,255,255,0.4)');
        hi.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hi;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawEarthPlanet() {
        // Earth-like planet slowly moving opposite the moon to avoid overlap
        const radius = 30;
        const speedPxPerSec = this.skySpeeds.moon * 0.6;
        const progress = ((this.skyTime * speedPxPerSec) / Math.max(1, this.width)) % 1;
        // Place on opposite phase
        const x = (1 - progress) * this.width * 0.85 + this.width * 0.075;
        const apexY = this.height * 0.2;
        const edgeRise = this.height * 0.1;
        const centered = (2 * progress - 1);
        const y = apexY + edgeRise * (centered * centered);
        const ctx = this.ctx;

        // Blue glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.2);
        glow.addColorStop(0, 'rgba(80,170,255,0.25)');
        glow.addColorStop(1, 'rgba(80,170,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius * 3.5, y - radius * 3.5, radius * 7, radius * 7);

        // Blue/green earth disc
        ctx.fillStyle = '#3aa7ff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Simple pseudo-continents: a few overlapping green shapes
        ctx.fillStyle = '#48d07a';
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2 + (this.skyTime * 0.05);
            const rx = x + Math.cos(ang) * radius * 0.35;
            const ry = y + Math.sin(ang * 1.3) * radius * 0.25;
            ctx.beginPath();
            ctx.ellipse(rx, ry, radius * 0.22, radius * 0.12, ang * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Specular highlight
        const hi = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 0, x, y, radius);
        hi.addColorStop(0, 'rgba(255,255,255,0.18)');
        hi.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hi;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPlanets() {
        // Animate a couple of faint distant planets on slow arcs; minimal, non-intrusive
        const ctx = this.ctx;
        const cel = this.celestial;
        const celActive = !!(cel?.enabled && this.timeOfDayOverride == null);
        // Define planet tracks: speed is fraction of sun's cycle
        const tracks = [
            { r: 10, color: '#c7b299', speedMul: 0.25, phase: 0.15, apexY: 0.18, edgeRise: 0.10 },
            { r: 14, color: '#99c7ff', speedMul: 0.35, phase: 0.65, apexY: 0.22, edgeRise: 0.12 }
        ];
        for (const t of tracks) {
            let prog;
            if (celActive) {
                prog = (cel.progress * t.speedMul + t.phase) % 1;
            } else {
                const pxPerSec = (this.skySpeeds.sun || 6) * t.speedMul;
                prog = ((this.skyTime * pxPerSec) / Math.max(1, this.width) + t.phase) % 1;
            }
            const x = prog * this.width;
            const apexY = this.height * t.apexY;
            const edgeRise = this.height * t.edgeRise;
            const centered = 2 * prog - 1;
            const y = apexY + edgeRise * (centered * centered);
            // Soft glow
            const glow = ctx.createRadialGradient(x, y, 0, x, y, t.r * 2.4);
            glow.addColorStop(0, t.color.replace('#', '#') + '55');
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x - t.r * 2.4, y - t.r * 2.4, t.r * 4.8, t.r * 4.8);
            // Disc
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(x, y, t.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ensureCaveStalactites() {
        if (this.caveStalactites && this.caveStalactites.length) return;
        const count = Math.max(10, Math.floor(this.width / 60));
        const cols = ['#1a1a1a', '#161616', '#141414', '#121212'];
        const arr = [];
        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.width;
            const len = 24 + Math.random() * 60;
            const w = 8 + Math.random() * 16;
            const parallax = 0.5 + Math.random() * 0.3;
            const topOffset = -6 + Math.random() * 6;
            const color = cols[Math.floor(Math.random() * cols.length)];
            arr.push({ x, len, w, parallax, topOffset, color });
        }
        for (let k = 0; k < 2; k++) {
            const base = (k === 0) ? this.width * 0.15 : this.width * 0.85;
            for (let j = 0; j < 5; j++) {
                const x = base + (Math.random() - 0.5) * 80;
                const len = 30 + Math.random() * 50;
                arr.push({ x, len, w: 6 + Math.random() * 12, parallax: 0.55, topOffset: -4 + Math.random() * 4, color: '#151515' });
            }
        }
        this.caveStalactites = arr.sort((a, b) => a.parallax - b.parallax);
    }

    // Cave theme: dim screen with soft light around actors/projectiles/explosions
    drawCaveVisibilityMask() {
        // Render the dark overlay with cut-out light holes on an offscreen canvas
        // and then composite it over the scene. This prevents destination-out
        // from erasing the main scene content (which caused darker flare circles).
        if (!this._caveMaskCanvas) {
            this._caveMaskCanvas = document.createElement('canvas');
            this._caveMaskCtx = this._caveMaskCanvas.getContext('2d');
        }

        const off = this._caveMaskCanvas;
        const octx = this._caveMaskCtx;
        if (off.width !== this.width || off.height !== this.height) {
            off.width = this.width;
            off.height = this.height;
        }

        // Clear previous mask
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.globalCompositeOperation = 'source-over';
        octx.clearRect(0, 0, off.width, off.height);

        // Draw dark overlay
        const maskAlpha = Math.max(0, Math.min(1, Number(this.config?.graphics?.cave?.maskAlpha ?? 0.55)));
        octx.fillStyle = `rgba(0,0,0,${maskAlpha})`;
        octx.fillRect(0, 0, off.width, off.height);

        // Prepare to cut soft holes where light sources are
        octx.globalCompositeOperation = 'destination-out';

        const cut = (x, y, r) => {
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || r <= 0) return;
            const g = octx.createRadialGradient(x, y, 0, x, y, r);
            // Fully erase in the center, feather to edge
            g.addColorStop(0, 'rgba(0,0,0,1)');
            g.addColorStop(0.55, 'rgba(0,0,0,0.82)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            octx.fillStyle = g;
            octx.beginPath();
            octx.arc(x, y, r, 0, Math.PI * 2);
            octx.fill();
        };

        // Current tank: widest light
        const current = this.tanks[this.currentTankIndex];
        if (current && current.health > 0) {
            cut(current.x, current.y - 6, 220);
        }
        // Other living tanks
        for (const t of this.tanks) {
            if (!t || t === current || t.health <= 0) continue;
            cut(t.x, t.y - 6, 170);
        }
        // Projectiles provide a smaller moving light
        for (const p of this.projectiles) {
            const base = 100;
            const extra = Math.min(80, (p.radius || 4) * 6);
            cut(p.x, p.y, base + extra);
        }
        // Active explosions illuminate a larger area
        for (const ex of this.explosions) {
            let r = 0;
            if (typeof ex.currentRadius === 'number') {
                r = ex.currentRadius * 1.9;
            } else if (ex.scale) {
                r = 120 * (ex.scale || 1);
            }
            if (r > 0) cut(ex.x, ex.y, r);
        }

        // Static/temporary light sources (e.g., flares)
        const now = performance.now?.() || Date.now();
        for (const L of this.activeLights) {
            const age = now - (L.created || now);
            if (age >= (L.durationMs || 0)) continue;
            // Soft falloff over time
            const t = Math.max(0, 1 - age / Math.max(1, L.durationMs));
            const rr = Math.max(10, (L.radius || 140) * (0.7 + 0.3 * t));
            cut(L.x, L.y, rr);
        }

        // Parachute flare in-air lighting
        for (const a of this.supportActors) {
            if (a.type === 'flare_chute') {
                const rr = Math.max(60, (this.parachuteFlareCfg?.radius || 200) * 0.8);
                cut(a.x, a.y, rr);
            }
        }

        // Subtle ambient near ground center to avoid complete blackouts (configurable)
        const ambX = this.width * 0.5;
        const ambY = this.height * 0.7;
        const ambFrac = Math.max(0.1, Math.min(0.8, Number(this.config?.graphics?.cave?.ambientRadiusFrac ?? 0.3)));
        const ambR = Math.max(260, this.width * ambFrac);
        const ambientAlpha = Math.max(0, Math.min(1, Number(this.config?.graphics?.cave?.ambientAlpha ?? 0.16)));
        const amb = octx.createRadialGradient(ambX, ambY, 0, ambX, ambY, ambR);
        amb.addColorStop(0, `rgba(0,0,0,${ambientAlpha})`);
        amb.addColorStop(1, 'rgba(0,0,0,0)');
        octx.fillStyle = amb;
        octx.beginPath();
        octx.arc(ambX, ambY, ambR, 0, Math.PI * 2);
        octx.fill();

        // Composite the mask back onto the main canvas
        this.ctx.drawImage(off, 0, 0);
    }

    // --- Light helpers ---
    addLight(x, y, radius, durationMs, color = '#fff6b0') {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const now = performance.now?.() || Date.now();
        this.activeLights.push({ x, y, radius: Math.max(10, radius || 140), created: now, durationMs: Math.max(200, durationMs || 4000), color });
    }
    pruneExpiredLights() {
        const now = performance.now?.() || Date.now();
        if (!Array.isArray(this.activeLights) || this.activeLights.length === 0) return;
        this.activeLights = this.activeLights.filter(L => (now - (L.created || now)) < (L.durationMs || 0));
    }
    
    drawTankWithEffects(tank) {
        // Tank shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.beginPath();
        this.ctx.ellipse(tank.x, tank.y + 5, 18, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Dark mode: disable highlights and glows for stealth gameplay
        const isDarkMode = this.themeName === 'dark';

        // Tank highlight for current player (pulsing glow + soft ring) - disabled in dark mode
        if (!isDarkMode && this.activeHighlightEnabled && this.tanks[this.currentTankIndex] === tank) {
            const now = (globalThis.performance?.now?.() || Date.now());
            const phase = (now * 0.006) % (Math.PI * 2);
            const centerX = tank.x;
            const centerY = tank.y - 12;
            const baseR = 24 + (this.activeHighlightIntensity - 1) * 6; // gentle size scale
            const pulse = (Math.sin(phase) * 0.5 + 0.5); // 0..1
            const outerR = baseR + 10 + pulse * (6 + 4 * this.activeHighlightIntensity); // widen slightly with intensity
            const innerR = Math.max(4, outerR * 0.25);

            // Soft additive glow
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.globalAlpha = 0.5 * Math.max(0, Math.min(2, this.activeHighlightIntensity));
            let g = this.ctx.createRadialGradient(centerX, centerY, innerR, centerX, centerY, outerR);
            g.addColorStop(0, `${tank.color}55`);
            g.addColorStop(0.55, `${tank.color}33`);
            g.addColorStop(1, `${tank.color}00`);
            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2);
            this.ctx.fill();

            // Subtle pulsing ring
            this.ctx.lineWidth = 2 + pulse * 2; // 2..4
            this.ctx.strokeStyle = `${tank.color}${this.activeHighlightIntensity >= 1.5 ? 'dd' : 'aa'}`;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, baseR + 6 + pulse * 4, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Shield visual aura if active
        try {
            if (tank._shield && (tank._shield.turnsLeft ?? 0) > 0) {
                const r = 26;
                this.ctx.save();
                this.ctx.globalAlpha = 0.75;
                const g = this.ctx.createRadialGradient(tank.x, tank.y - 10, 4, tank.x, tank.y - 10, r);
                g.addColorStop(0, 'rgba(120,200,255,0.5)');
                g.addColorStop(0.6, 'rgba(100,180,255,0.25)');
                g.addColorStop(1, 'rgba(100,180,255,0)');
                this.ctx.fillStyle = g;
                this.ctx.beginPath(); this.ctx.arc(tank.x, tank.y - 10, r, 0, Math.PI * 2); this.ctx.fill();
                // Subtle rim
                this.ctx.strokeStyle = 'rgba(150,220,255,0.8)';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath(); this.ctx.arc(tank.x, tank.y - 10, r - 1, 0, Math.PI * 2); this.ctx.stroke();
                this.ctx.restore();
            }
        } catch {}
        
        tank.render(this.ctx);
    }
    
    drawProjectileWithTrail(projectile) {
        // Safety check for valid radius
    if (!projectile.radius || projectile.radius <= 0 || !Number.isFinite(projectile.radius)) {
            projectile.render(this.ctx);
            return;
        }
        
        // Trail effect (two-layer: dark base for contrast + bright core)
        const trailLength = 6;
        for (let i = 0; i < trailLength; i++) {
            const alpha = (1 - i / trailLength) * 0.6;
            const offsetX = -projectile.vx * i * 0.3;
            const offsetY = -projectile.vy * i * 0.3;
            const trailRadius = projectile.radius * (1 - i / trailLength * 0.5);

            if (trailRadius > 0) {
                // Dark blurred base to provide contrast on light backgrounds
                this.ctx.save();
                this.ctx.globalAlpha = Math.min(0.6, alpha * 0.7);
                this.ctx.fillStyle = 'rgba(0,0,0,0.34)';
                this.ctx.beginPath();
                this.ctx.arc(
                    projectile.x + offsetX,
                    projectile.y + offsetY,
                    Math.max(1, trailRadius + 1.4),
                    0, Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.restore();

                // Bright core
                this.ctx.save();
                this.ctx.globalAlpha = Math.min(1, alpha);
                this.ctx.fillStyle = projectile.color || 'rgba(255,200,100,1)';
                this.ctx.beginPath();
                this.ctx.arc(
                    projectile.x + offsetX,
                    projectile.y + offsetY,
                    Math.max(0.8, trailRadius * 0.78),
                    0, Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.restore();
            }
        }
        
        // Projectile glow
        const glowRadius = projectile.radius * 3;
    if (glowRadius > 0 && Number.isFinite(glowRadius)) {
            const gradient = this.ctx.createRadialGradient(
                projectile.x, projectile.y, 0,
                projectile.x, projectile.y, glowRadius
            );
            // Stronger inner color stops and fade to transparent for better contrast
            gradient.addColorStop(0, `${projectile.color}FF`);
            gradient.addColorStop(0.35, `${projectile.color}C0`);
            gradient.addColorStop(0.6, `${projectile.color}80`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                projectile.x - glowRadius,
                projectile.y - glowRadius,
                glowRadius * 2,
                glowRadius * 2
            );
        }
        
        projectile.render(this.ctx);
    }
    
    drawExplosionWithGlow(explosion) {
        // Explosion outer glow
        let glowRadius;
        if (typeof explosion.currentRadius === 'number' && typeof explosion.maxRadius === 'number') {
            glowRadius = Math.max(10, explosion.currentRadius * 2);
        } else {
            // Mushroom cloud or other custom type: base on scale
            const base = (explosion.scale ? 120 * explosion.scale : 80);
            glowRadius = base;
        }
        const gradient = this.ctx.createRadialGradient(
            explosion.x, explosion.y, 0,
            explosion.x, explosion.y, glowRadius
        );
        
        const alpha = (typeof explosion.currentRadius === 'number' && typeof explosion.maxRadius === 'number')
            ? Math.max(0, Math.min(1, explosion.currentRadius / (explosion.maxRadius || 1)))
            : 0.6;
        gradient.addColorStop(0, `rgba(255, 150, 50, ${alpha * 0.6})`);
        gradient.addColorStop(0.4, `rgba(255, 80, 0, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            explosion.x - glowRadius,
            explosion.y - glowRadius,
            glowRadius * 2,
            glowRadius * 2
        );
        
        explosion.render(this.ctx);
    }
    
    addScreenShake(intensity) {
        this.screenShake.intensity = intensity;
        this.screenShake.x = (Math.random() - 0.5) * intensity;
        this.screenShake.y = (Math.random() - 0.5) * intensity;
    }
    
    drawAimLine(tank) {
        const ang = (((tank.angle % 360) + 360) % 360);
        const angleRad = (ang * Math.PI) / 180;
    const length = (tank.power / 100) * 80 + 20;
    const tip = tank.getBarrelWorldTip?.() || { x: tank.x, y: tank.y - 15 };
    const endX = tip.x + Math.cos(angleRad) * length;
    const endY = tip.y - Math.sin(angleRad) * length;
        
        // Glowing aim line
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#ffff00';
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(tip.x, tip.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.shadowBlur = 0;
        
        // Aim point indicator
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Crosshair at aim point
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(endX - 8, endY);
        this.ctx.lineTo(endX + 8, endY);
        this.ctx.moveTo(endX, endY - 8);
        this.ctx.lineTo(endX, endY + 8);
        this.ctx.stroke();
    }
    
    checkCollision(projectile, tank) {
        const dx = projectile.x - tank.x;
        const dy = projectile.y - (tank.y - 10);
    const distance = Math.hypot(dx, dy);
        return distance < 12;
    }
    
    handleImpact(projectile, directHitTank = null) {
        // Tracer: compute and store a path preview for the owner's current settings; no damage/explosion
        if (projectile.type === 'tracer') {
            const owner = projectile.owner;
            if (owner && owner.health > 0) {
                const angleRad = (((owner.angle % 360) + 360) % 360) * Math.PI / 180;
                const baseVelocity = (owner.power / 100) * 20 + 10;
                const v0 = baseVelocity * this.velocityMultiplier;
                let vx = Math.cos(angleRad) * v0;
                let vy = -Math.sin(angleRad) * v0;
                const windAccel = (this.windOverride ?? this.wind) * this.windEffect;
                const g = this.gravityOverride ?? this.gravity;
                const tip = owner.getBarrelWorldTip?.() || { x: owner.x, y: owner.y - 15 };
                let x = tip.x;
                let y = tip.y;
                const points = [];
                const steps = 120;
                for (let i = 0; i < steps; i++) {
                    vx += windAccel;
                    vy += g;
                    x += vx; y += vy;
                    points.push({ x, y });
                    const ground = this.terrain.getHeight(x);
                    if (y >= ground - 1) break;
                }
                this.tracerPreview = { owner, points, createdAt: performance.now?.() || Date.now(), turnsShown: 0 };
                this.addLog('Tracer path plotted for your next shot.', 'info');
            }
            // End turn quickly without explosion effects
            this.scheduleEndTurn(350);
            return;
        }
        // console.log('handleImpact called, type:', projectile.type, 'isMirvlet:', projectile.isMirvlet, 'isFunkylet:', projectile.isFunkylet);
        
        // Solo mode: check target hit first
        if (this.soloActive && this.soloTarget) {
            const dxT = projectile.x - this.soloTarget.x;
            const dyT = projectile.y - this.soloTarget.y;
            const distT = Math.hypot(dxT, dyT);
            const hitR = (this.soloTarget.hitR ?? this.soloTarget.r) + projectile.explosionRadius * 0.4;
            if (distT <= hitR) {
                // Score more for closer hits
                const visR = this.soloTarget.r;
                const score = Math.max(10, Math.round(50 * (1 - Math.min(1, distT / (visR + 10)))));
                this.soloScore += score;
                this.addLog(`Target hit! +${score} points`, 'hit');
                // Fun pop without terrain damage
                this.explosions.push(new Explosion(projectile.x, projectile.y, Math.max(20, projectile.explosionRadius * 0.6), 0, '#44ddff'));
                this.particleSystem.createExplosion(projectile.x, projectile.y, Math.max(25, projectile.explosionRadius * 0.8), '#44ddff');
                // Progress solo goal
                if (this.soloTargetGoal > 0) {
                    this.soloTargetsHit = Math.min(this.soloTargetGoal, this.soloTargetsHit + 1);
                }
                // If goal reached, finish Solo round with a summary
                if (this.soloTargetGoal > 0 && this.soloTargetsHit >= this.soloTargetGoal) {
                    this.finishSoloRound();
                } else {
                    this.spawnSoloTarget();
                }
                // End turn after short delay
                this.scheduleEndTurn(400);
                return;
            }
        }

        // Flare: no explosion or terrain damage; place a light at impact
        if (projectile.type === 'flare' || projectile.type === 'parachute_flare') {
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = this.terrain ? (this.terrain.getHeight(gx) - 6) : projectile.y;
            const r = (projectile.type === 'parachute_flare' ? (this.parachuteFlareCfg?.radius ?? 200) : (this.flareCfg?.radius ?? 220));
            const d = (projectile.type === 'parachute_flare' ? (this.parachuteFlareCfg?.durationMs ?? 8000) : (this.flareCfg?.durationMs ?? 6000));
            const color = (projectile.type === 'parachute_flare' ? (this.parachuteFlareCfg?.color ?? '#fff2a0') : (this.flareCfg?.color ?? '#fff6b0'));
            this.addLight(projectile.x, gy, r, d, color);
            // Small spark puff
            this.particleSystem.createExplosion(projectile.x, gy, 18, '#ffd966');
            this.addLog(projectile.type === 'parachute_flare' ? 'Parachute flare deployed.' : 'Flare deployed.', 'info');
            this.scheduleEndTurn(500);
            return;
        }

        // EMP: no terrain damage; stun enemy tanks in radius for one turn
        if (projectile.type === 'emp') {
            const r = Math.max(30, projectile.explosionRadius || 70);
            this.explosions.push(new Explosion(projectile.x, projectile.y, Math.max(24, r * 0.6), 0, '#77e5ff'));
            this.particleSystem.createExplosion(projectile.x, projectile.y, Math.max(26, r * 0.8), '#99f0ff');
            let stunned = 0;
            for (const t of this.tanks) {
                if (t.health <= 0) continue;
                const dx = t.x - projectile.x;
                const dy = (t.y - 10) - projectile.y;
                const d = Math.hypot(dx, dy);
                if (d <= r && !this.isFriendly(projectile.owner, t)) {
                    t._stunnedTurns = Math.max(1, (t._stunnedTurns || 0) + 1);
                    stunned++;
                    this.particleSystem.createExplosion(t.x, t.y - 8, 12, '#77e5ff');
                }
            }
            this.addLog(stunned > 0 ? `EMP detonation: ${stunned} stunned.` : 'EMP discharged.', 'info');
            this.scheduleEndTurn(500);
            return;
        }

        // Smoke bomb: spawn a persistent smoke screen; no terrain damage
        if (projectile.type === 'smoke_bomb') {
            const gx = Math.max(0, Math.min(this.width - 1, Math.floor(projectile.x)));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 2;
            const radius = 100; // LARGER coverage area for better concealment
            const turns = 3;   // persists across a few turns
            this.addSmokeScreen(gx, gy, radius, turns);
            this.addLog('Smoke screen deployed.', 'info');
            // THICK initial poof visual
            this.particleSystem.createExplosionSmoke(gx, gy, Math.max(40, radius * 0.9), '#b8b8b8');
            this.scheduleEndTurn(500);
            return;
        }

        // Acid/Napalm: lingering hazards; both can flow downhill over time
        if (projectile.type === 'acid' || projectile.type === 'napalm') {
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 2;
            if (projectile.type === 'acid') {
                // Flowing acid: behaves like a more viscous liquid that pools in low areas
                const hz = {
                    type: 'acid',
                    mode: 'flow',
                    x: projectile.x,
                    y: gy,
                    ticksEveryMs: 400,
                    dps: 10,
                    lifeMs: 8000,
                    ageMs: 0,
                    nodes: [], // pre-seeded for splash volume; will skip auto-seed when not empty
                    seedRadius: 36
                };
                // Create initial splash droplets that will fall and then pool
                try {
                    const baseSeeds = 12;
                    for (let si = 0; si < baseSeeds; si++) {
                        const ang = (Math.PI * 2 * (si / baseSeeds)) + (Math.random() * 0.4 - 0.2);
                        const speed = 0.6 + Math.random() * 0.8;
                        const rr = 14 + Math.random() * 10; // volume proxy
                        const vx = Math.cos(ang) * speed * 0.6;
                        const vy = -Math.abs(Math.sin(ang)) * (0.5 + Math.random() * 0.4); // slight upward kick
                        hz.nodes.push({ x: projectile.x + Math.cos(ang) * 4, y: gy - 4, vx, vy, r: rr, m: massFromRadius(rr), falling: true });
                    }
                } catch {}
                this.hazards.push(hz);
                const c = '#66ff66';
                this.explosions.push(new Explosion(projectile.x, gy, 30, 0, c));
                this.particleSystem.createExplosion(projectile.x, gy, 36, c);
            } else {
                // Flowing napalm - behaves like liquid fire that pools and flows downhill
                // If a stream hazard already exists for this projectile, reuse it
                let hz = projectile._napalmHazard;
                if (!hz) {
                    hz = {
                        type: 'napalm',
                        mode: 'flow',
                        x: projectile.x,
                        y: gy,
                        ticksEveryMs: 300,
                        dps: 14,
                        lifeMs: 11000,
                        ageMs: 0,
                        nodes: [],
                        seedRadius: 50
                    };
                    this.hazards.push(hz);
                }
                // Add a few larger splash droplets at the impact site to thicken the pool
                try {
                    const baseSeeds = 8;
                    for (let si = 0; si < baseSeeds; si++) {
                        const ang = (Math.PI * 2 * (si / baseSeeds)) + (Math.random() * 0.6 - 0.3);
                        const speed = 0.55 + Math.random() * 1.0;
                        const rr = 16 + Math.random() * 12; // slightly smaller to reduce outlines
                        const vx = Math.cos(ang) * speed * 0.6;
                        const vy = -Math.abs(Math.sin(ang)) * (0.35 + Math.random() * 0.45);
                        hz.nodes.push({ x: projectile.x + Math.cos(ang) * 5, y: gy - 6, vx, vy, r: rr, m: massFromRadius(rr), falling: true });
                    }
                    // Extend life a bit on impact
                    hz.lifeMs = Math.max(hz.lifeMs || 0, 11500);
                } catch (error) {
                    console.error('[napalm] Failed to create impact splash droplets:', error);
                }
                const c = '#ff6b2d';
                this.explosions.push(new Explosion(projectile.x, gy, 36, 0, c));
                this.particleSystem.createExplosionDownward(projectile.x, gy, 48, c); // larger particle explosion, downward sparks
            }
            this.scheduleEndTurn(500);
            return;
        }

        // Toxic Gas: Creates a gas cloud that slowly sinks and damages tanks
        if (projectile.type === 'toxic_gas') {
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 2;

            // Create toxic gas hazard with floating cloud that slowly sinks
            const hz = {
                type: 'toxic_gas',
                mode: 'gas_cloud',
                x: projectile.x,
                y: gy - 40, // Start above ground
                ticksEveryMs: 500,
                dps: 6, // Lower DPS than napalm, but larger area
                lifeMs: 15000, // Lasts 15 seconds
                ageMs: 0,
                radius: 60, // Larger area of effect
                sinkRate: 0.3, // Slow sinking speed (pixels per frame)
                windDrift: true // Affected by wind
            };

            this.hazards.push(hz);

            // Create green gas cloud visual effect
            const c = '#88ff44';
            this.explosions.push(new Explosion(projectile.x, gy - 20, 50, 0, c));
            this.particleSystem.createExplosion(projectile.x, gy - 20, 80, c);

            // Add some upward-floating gas particles
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed - 2; // Slight upward bias initially
                const px = projectile.x + (Math.random() - 0.5) * 30;
                const py = gy - 20 + (Math.random() - 0.5) * 20;
                const lifetime = 3 + Math.random() * 2;
                const p = new Particle(px, py, vx, vy, c, lifetime, 'smoke');
                p.size = 4 + Math.random() * 6;
                p.alpha = 0.6;
                this.particleSystem.particles.push(p);
            }

            this.addLog('Toxic gas deployed!', 'info');
            this.scheduleEndTurn(500);
            return;
        }

        // Healing Bomb: Heals friendly tanks within blast radius
        if (projectile.type === 'healing_bomb') {
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 2;
            const healRadius = 80;
            const healAmount = 40; // Heal 40 HP

            // Create healing visual effect
            const c = '#44ff88';
            this.explosions.push(new Explosion(projectile.x, gy, 70, 0, c));
            this.particleSystem.createExplosion(projectile.x, gy, 100, c);

            // Add healing particle effects
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed - 1;
                this.particleSystem.particles.push({
                    x: projectile.x + (Math.random() - 0.5) * 40,
                    y: gy + (Math.random() - 0.5) * 30,
                    vx: vx,
                    vy: vy,
                    life: 2 + Math.random() * 1.5,
                    maxLife: 2 + Math.random() * 1.5,
                    color: c,
                    size: 3 + Math.random() * 5,
                    alpha: 0.8
                });
            }

            // Heal friendly tanks within radius
            let healsApplied = 0;
            for (const t of this.tanks) {
                if (t.health <= 0) continue;

                const dx = t.x - projectile.x;
                const dy = (t.y - 10) - gy;
                const dist = Math.hypot(dx, dy);

                if (dist <= healRadius) {
                    // Check if friendly: same tank, same team, or in classic mode
                    const isFriendly = (
                        t === projectile.owner ||
                        (this.gameMode === 'teams' && t.team === projectile.owner?.team) ||
                        (this.gameMode === 'classic')
                    );

                    if (isFriendly && t.health < t.maxHealth) {
                        const oldHealth = t.health;
                        t.health = Math.min(t.maxHealth, t.health + healAmount);
                        const actualHeal = t.health - oldHealth;

                        if (actualHeal > 0) {
                            healsApplied++;
                            this.addLog(`${t.name} healed for ${actualHeal} HP`, 'info');

                            // Visual feedback: green healing particles rising from tank
                            for (let i = 0; i < 20; i++) {
                                this.particleSystem.particles.push({
                                    x: t.x + (Math.random() - 0.5) * 20,
                                    y: t.y - 10 + (Math.random() - 0.5) * 15,
                                    vx: (Math.random() - 0.5) * 0.5,
                                    vy: -(Math.random() * 2 + 1),
                                    life: 1.5 + Math.random(),
                                    maxLife: 1.5 + Math.random(),
                                    color: '#44ff88',
                                    size: 3 + Math.random() * 3,
                                    alpha: 0.9
                                });
                            }
                        }
                    }
                }
            }

            if (healsApplied > 0) {
                this.addLog(`Healing bomb restored ${healsApplied} tank${healsApplied > 1 ? 's' : ''}!`, 'info');
            } else {
                this.addLog('Healing bomb deployed (no targets affected)', 'info');
            }

            this.scheduleEndTurn(500);
            return;
        }

        // Shockwave: Pushes tanks away from impact point with physics-based knockback
        if (projectile.type === 'shockwave') {
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 2;
            const shockwaveRadius = 120;
            const maxPushForce = 15; // Maximum push velocity
            const damage = 15; // Small damage from shockwave

            // Create shockwave visual effect
            const c = '#88ccff';
            this.explosions.push(new Explosion(projectile.x, gy, 100, damage, c));
            this.particleSystem.createExplosion(projectile.x, gy, 150, c);

            // Create expanding ring effect
            for (let ring = 0; ring < 3; ring++) {
                const delay = ring * 100;
                setTimeout(() => {
                    const ringRadius = 40 + ring * 30;
                    const ringParticles = 30;
                    for (let i = 0; i < ringParticles; i++) {
                        const angle = (i / ringParticles) * Math.PI * 2;
                        const px = projectile.x + Math.cos(angle) * ringRadius;
                        const py = gy + Math.sin(angle) * ringRadius * 0.5;
                        this.particleSystem.particles.push({
                            x: px,
                            y: py,
                            vx: Math.cos(angle) * 2,
                            vy: Math.sin(angle) * 1,
                            life: 0.8,
                            maxLife: 0.8,
                            color: c,
                            size: 4,
                            alpha: 0.7
                        });
                    }
                }, delay);
            }

            // Apply knockback to all tanks within radius
            let tanksAffected = 0;
            for (const t of this.tanks) {
                if (t.health <= 0) continue;

                const dx = t.x - projectile.x;
                const dy = (t.y - 10) - gy;
                const dist = Math.hypot(dx, dy);

                if (dist <= shockwaveRadius && dist > 1) {
                    tanksAffected++;

                    // Apply damage (less at edges)
                    const distanceFalloff = 1 - (dist / shockwaveRadius);
                    const actualDamage = Math.round(damage * distanceFalloff);
                    if (actualDamage > 0) {
                        t.takeDamage(actualDamage);
                        this.addLog(`${t.name} took ${actualDamage} shockwave damage`, 'hit');
                    }

                    // Calculate knockback force (stronger closer to center)
                    const pushForce = maxPushForce * distanceFalloff;
                    const angle = Math.atan2(dy, dx);

                    // Apply horizontal and vertical velocity to tank
                    const pushVx = Math.cos(angle) * pushForce;
                    const pushVy = Math.sin(angle) * pushForce - 3; // Extra upward boost

                    // Initialize tank velocity if needed
                    if (!t.vx) t.vx = 0;
                    if (!t.vy) t.vy = 0;

                    // Add knockback velocity
                    t.vx += pushVx;
                    t.vy += pushVy;

                    // Mark tank as airborne for physics simulation
                    t.isAirborne = true;
                    t.isMoving = true;

                    this.addLog(`${t.name} knocked back by shockwave!`, 'info');

                    // Visual feedback: dust/debris particles
                    for (let i = 0; i < 15; i++) {
                        this.particleSystem.particles.push({
                            x: t.x + (Math.random() - 0.5) * 15,
                            y: t.y - 5,
                            vx: pushVx * 0.5 + (Math.random() - 0.5) * 2,
                            vy: pushVy * 0.5 - Math.random() * 2,
                            life: 1 + Math.random(),
                            maxLife: 1 + Math.random(),
                            color: '#aaaaaa',
                            size: 2 + Math.random() * 3,
                            alpha: 0.6
                        });
                    }

                    // Check if tank died from shockwave damage
                    if (t.health <= 0) {
                        this.addLog(`${t.name} was destroyed by the shockwave`, 'hit');
                        this.addWreck(t.x, t.y, t.color);
                        this.checkGameOver();
                    }
                }
            }

            this.addLog(`Shockwave affected ${tanksAffected} tank${tanksAffected !== 1 ? 's' : ''}!`, 'info');
            this.scheduleEndTurn(800); // Longer delay to see knockback effects
            return;
        }

    // Smoke marker call-ins
        if (projectile.type === 'marker_attack' || projectile.type === 'marker_medic' || projectile.type === 'marker_airstrike' || projectile.type === 'marker_airnukes') {
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = this.terrain ? (this.terrain.getHeight(gx) - 2) : projectile.y;
            this.createSustainedSmoke(gx, gy, 3000);
            // For medic drops, retarget the "owner" to the nearest tank at the marker
            // so medics will heal that tank in classic mode (self-friendly) and
            // that tank's team in teams mode. If none are near, fall back to shooter.
            const nearestAtMarker = (type) => {
                const maxDist = type === 'marker_medic' ? 200 : 120;
                return this.getNearestAliveTank(projectile.x, gy, maxDist);
            };
            const owner = (projectile.type === 'marker_medic' ? (nearestAtMarker('marker_medic') || projectile.owner) : projectile.owner);
            if (projectile.type === 'marker_attack') {
                this.addLog('Paratroopers inbound!', 'info');
                const dirLeft = Math.random() < 0.5;
                this.supportActors.push({ type: 'plane', x: dirLeft ? this.width + 60 : -60, y: 80, vx: dirLeft ? -60 : 60, spawnAtX: projectile.x, dropped: false, role: 'attack', owner });
                try {
                    document.dispatchEvent(new CustomEvent('game:plane-flyby'));
                    document.dispatchEvent(new CustomEvent('game:bomber-inbound'));
                } catch {}
                // Defer next turn: wait until paratroopers finish + cooldown
                this.deferTurnForParatroopers = true;
                this.holdingForSupport = true;
                // In realtime, don't disable controls during support actions
                if (this.mode !== 'realtime') this.disableControls();
                return;
            }
            if (projectile.type === 'marker_medic') {
                this.addLog('Medic team inbound!', 'info');
                const dirLeft = Math.random() < 0.5;
                this.supportActors.push({ type: 'plane', x: dirLeft ? this.width + 60 : -60, y: 80, vx: dirLeft ? -60 : 60, spawnAtX: projectile.x, dropped: false, role: 'medic', owner });
                try { document.dispatchEvent(new CustomEvent('game:plane-flyby')); } catch {}
                this.deferTurnForParatroopers = true;
                this.holdingForSupport = true;
                if (this.mode !== 'realtime') this.disableControls();
                return;
            }
            if (projectile.type === 'marker_airstrike') {
                this.addLog('Airstrike marked. Missiles inbound in ~2.5s!', 'info');
                setTimeout(() => {
                    const count = 5;
                    for (let i = 0; i < count; i++) {
                        const x = projectile.x + (Math.random() * 60 - 30);
                        const p = new Projectile(x, -20, (Math.random() * 0.6 - 0.3), 4 + Math.random() * 1.5, 'icbm', this.config?.weapons);
                        p.owner = owner;
                        p.minFramesBeforeCollision = 1;
                        this.projectiles.push(p);
                    }
                }, 2500);
                this.scheduleEndTurn(3200);
                return;
            }
            if (projectile.type === 'marker_airnukes') {
                // Optional mode gating
                if (this.ammoMode === 'no-heavy' && (this.airNukes?.gateInNoHeavy === true)) {
                    this.addLog('Air Nukes are disabled in No Heavy mode.', 'warn');
                    this.scheduleEndTurn(300);
                    return;
                }
                this.addLog('Air Nukes marked. Bombers inbound!', 'info');
                try { document.dispatchEvent(new CustomEvent('game:bomber-inbound')); } catch {}
                const dirLeft = Math.random() < 0.5;
                const bomberCount = Math.max(1, Math.min(4, this.airNukes?.passes ?? 1));
                const speed = Math.max(30, Math.min(140, this.airNukes?.speed ?? 40)); // Reduced from 70 to 40 for slower, more realistic bomber speed
                const altitude = Math.max(50, Math.min(140, this.airNukes?.altitude ?? 70));
                const spacing = Math.max(24, Math.min(120, this.airNukes?.spacing ?? 46));
                for (let b = 0; b < bomberCount; b++) {
                    const offset = b * 140; // stagger entries
                    this.supportActors.push({
                        type: 'plane',
                        subtype: 'bomber',
                        x: dirLeft ? (this.width + 60 + offset) : (-60 - offset),
                        y: altitude + b * 12,
                        vx: dirLeft ? -speed : speed,
                        targetX: projectile.x,
                        droppedCount: 0,
                        owner,
                        bombType: 'nuke',
                        bombCount: 3,
                        bombSpacing: spacing // pixels between drops
                    });
                }
                try { document.dispatchEvent(new CustomEvent('game:plane-flyby')); } catch {}
                this.deferTurnForParatroopers = true; // reuse hold gate
                this.holdingForSupport = true;
                if (this.mode !== 'realtime') this.disableControls();
                return;
            }
        }

        // Supply crate projectile: spawn a supply crate support actor that descends under parachute
        if (projectile.type === 'supply_crate') {
            const spawnX = Math.max(10, Math.min(this.width - 10, Math.floor(projectile.x)));
            const y = Math.max(8, projectile.y - 30);
            this.supportActors.push({ type: 'supply_crate', x: spawnX, y: y, vx: 0, vy: 0.12, state: 'descending', owner: projectile.owner });
            this.addLog('Supply crate incoming!', 'info');
            try { document.dispatchEvent(new CustomEvent('game:crate-inbound')); } catch {}
            // End turn shortly; crate arrives asynchronously
            this.scheduleEndTurn(400);
            return;
        }

        // Choose explosion visual: mushroom cloud for nukes
        if (projectile.type === 'nuke') {
            const scale = Math.max(1, projectile.explosionRadius / 100);
            this.explosions.push(new MushroomCloudExplosion(projectile.x, projectile.y, scale));

            // Delay terrain explosion for nuke to show mushroom cloud first
            setTimeout(() => {
                try {
                    this.terrain.applyExplosion(projectile.x, projectile.y, projectile.explosionRadius);
                    // Add debris/dirt particles when ground explodes
                    this.particleSystem.createExplosion(projectile.x, projectile.y, projectile.explosionRadius * 0.8, '#8b7355');

                    // Create radiation hazard zone after blast
                    const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
                    const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 2;
                    const radiationRadius = Math.max(60, projectile.explosionRadius * 0.7);
                    this.hazards.push({
                        type: 'radiation',
                        mode: 'area',
                        x: gx,
                        y: gy,
                        radius: radiationRadius,
                        dps: 8, // damage per second (2 damage per tick at 250ms intervals)
                        ticksEveryMs: 250,
                        lifeMs: 12000, // 12 seconds = ~4 turns at 3s per turn
                        ageMs: 0,
                        _tickAcc: 0,
                        _pulsePhase: 0 // for animated visual pulse
                    });
                } catch (error) {
                    console.error('[nuke] Failed to apply delayed terrain explosion:', error);
                }
            }, 1000); // 1 second delay so mushroom cloud appears first
        } else {
            const explosion = new Explosion(
                projectile.x,
                projectile.y,
                projectile.explosionRadius,
                projectile.damage,
                projectile.color
            );
            this.explosions.push(explosion);
            // Apply terrain damage immediately for non-nuke weapons
            this.terrain.applyExplosion(projectile.x, projectile.y, projectile.explosionRadius);
        }

        // Notify AV layer
        try {
            const ev = new CustomEvent('game:explosion', { detail: { type: projectile.type, radius: projectile.explosionRadius } });
            document.dispatchEvent(ev);
        } catch {}

        // Screen shake: disabled for nuke per request
        if (projectile.type !== 'nuke') {
            const shakeIntensity = Math.min(projectile.explosionRadius / 3, 15);
            this.addScreenShake(shakeIntensity);
        }
        
        // Richer particles for nuke
        if (projectile.type === 'nuke') {
            this.particleSystem.createExplosion(projectile.x, projectile.y, projectile.explosionRadius * 1.4, '#ffaa55');
            // ash cloud: emit just above the ground and make it buoyant
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 4;
            this.particleSystem.createExplosionSmoke(projectile.x, gy, projectile.explosionRadius, '#dddddd');
        } else {
            this.particleSystem.createExplosion(
                projectile.x,
                projectile.y,
                projectile.explosionRadius,
                projectile.color
            );
            // light smoke plume above ground for regular explosions
            const gx = Math.max(0, Math.min(Math.floor(projectile.x), this.width - 1));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : projectile.y) - 3;
            this.particleSystem.createExplosionSmoke(projectile.x, gy, Math.max(18, projectile.explosionRadius * 0.7), '#bbbbbb');
        }

        // Cluster splitting now happens at apex (see update loop), not on impact
        // This code block removed to prevent double-splitting

        if (projectile.type === 'mirv' && !projectile.isMirvlet) {
            this.spawnMirvlets(projectile);
        }
        
        if (projectile.type === 'funky' && !projectile.isFunkylet) {
            this.spawnFunkyBombs(projectile);
        }
        
        let hitAny = false;
        for (let tank of this.tanks) {
            if (tank.health > 0) {
                const dx = tank.x - projectile.x;
                const dy = (tank.y - 10) - projectile.y;
                const distance = Math.hypot(dx, dy);
                
                if (distance < projectile.explosionRadius) {
                    const damageRatio = 1 - (distance / projectile.explosionRadius);
                    const baseDamage = Math.floor(projectile.damage * damageRatio);
                    const actualDamage = Math.floor(baseDamage * this.damageMultiplier);
                    
                    if (actualDamage > 0) {
                        tank.takeDamage(actualDamage);
                        hitAny = true;
                        
                        if (directHitTank === tank) {
                            this.addLog(`Direct hit on ${tank.name}! Damage: ${actualDamage}`, 'hit');
                        } else {
                            this.addLog(`${tank.name} hit! Damage: ${actualDamage}`, 'hit');
                        }
                        
                        if (tank.health <= 0) {
                            this.addLog(`${tank.name} destroyed!`, 'hit');
                            // Final pop and debris with oriented barrel and turret piece
                            this.explosions.push(
                                new Explosion(tank.x, tank.y - 6, 28, 0, '#ffaa33'),
                                // A brief white flash accent
                                new Explosion(tank.x, tank.y - 8, 18, 0, '#ffffff')
                            );
                            this.particleSystem.createExplosion(tank.x, tank.y - 6, 40, '#ffaa33');
                            this.debrisSystem?.createTankDebris?.(tank.x, tank.y, tank.color, tank.angle);
                            this.addWreck(tank.x, tank.y, tank.color);
                            // Avoid extra shake if this came from a nuke
                            if (projectile.type !== 'nuke') {
                                this.addScreenShake(4);
                            }
                            this.checkGameOver();
                        }
                    }
                    // Mild radial shockwave push on nuke
                    if (projectile.type === 'nuke') {
                        const push = Math.max(0, (projectile.explosionRadius - distance) / projectile.explosionRadius) * 6;
                        const nx = dx / (distance || 1);
                        tank.x += nx * push;
                        // Nudge upward slightly for dramatic effect
                        tank.y -= Math.max(0, push * 0.5);
                    }
                }
            }
        }
        
        if (!hitAny && !projectile.isMirvlet && !projectile.isFunkylet) {
            this.addLog('Projectile hit terrain.', 'miss');
        }
        
        if (projectile.type !== 'mirv' && projectile.type !== 'funky') {
            // console.log('Regular weapon impact, ending turn in 500ms');
            this.scheduleEndTurn(500);
        } else if (projectile.isMirvlet || projectile.isFunkylet) {
            if (!this.hasActiveMirvOrFunky()) {
                // console.log('Last MIRV/Funky bomblet impact, ending turn in 500ms');
                this.scheduleEndTurn(500);
            }
        }
    }

    
    
    spawnMirvlets(parentProjectile) {
        const mirvCount = 5;
        const baseVelocity = 8;
        
        for (let i = 0; i < mirvCount; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * (i / (mirvCount - 1));
            const vx = Math.cos(angle) * baseVelocity;
            const vy = -Math.sin(angle) * baseVelocity;
            
            const mirvlet = new Projectile(
                parentProjectile.x,
                parentProjectile.y,
                vx,
                vy,
                'mirv',
                this.config?.weapons
            );
            mirvlet.isMirvlet = true;
            mirvlet.explosionRadius = 30;
            mirvlet.damage = 20;
            mirvlet.minFramesBeforeCollision = 2;
            
            this.projectiles.push(mirvlet);
        }
    }
    
    spawnFunkyBombs(parentProjectile) {
        const funkyCount = 8;
        const baseVelocity = 6;
        
        for (let i = 0; i < funkyCount; i++) {
            const angle = (Math.PI * 2 * i) / funkyCount;
            const vx = Math.cos(angle) * baseVelocity;
            const vy = Math.sin(angle) * baseVelocity - 5;
            
            const funkylet = new Projectile(
                parentProjectile.x,
                parentProjectile.y,
                vx,
                vy,
                'funky',
                this.config?.weapons
            );
            funkylet.isFunkylet = true;
            funkylet.explosionRadius = 25;
            funkylet.damage = 15;
            funkylet.minFramesBeforeCollision = 2;
            
            this.projectiles.push(funkylet);
        }
    }
    
    hasActiveMirvOrFunky() {
        return this.projectiles.some(p =>
            (p.type === 'mirv' || p.type === 'funky') && !p.isMirvlet && !p.isFunkylet
        );
    }

    // Realtime mode: continuously check if any AI can act
    updateRealtimeAI() {
        if (this.mode !== 'realtime') return;
        if (this.gameOver) return;
        if (this.isAnimating && this.projectiles.length > 0) return;

        const now = performance.now?.() || Date.now();

        // Check each AI tank to see if it can act
        for (const tank of this.tanks) {
            if (!tank.isAI || tank.health <= 0) continue;

            // Check if AI is on cooldown
            const lastShotTime = this.aiCooldowns.get(tank) || 0;
            if (now - lastShotTime < this.aiCooldownMs) continue;

            // Check if stunned
            if (tank._stunnedTurns && tank._stunnedTurns > 0) {
                tank._stunnedTurns -= 1;
                this.aiCooldowns.set(tank, now); // Set cooldown to prevent checking again immediately
                continue;
            }

            // AI can act! Set it as current and perform its turn
            this.currentTankIndex = this.tanks.indexOf(tank);
            this.aiCooldowns.set(tank, now);
            this.performAITurn();
            break; // Only one AI acts per frame
        }
    }

    endTurn() {
        if (this.turnEnding) {
            // console.log('Turn already ending, skipping duplicate endTurn call');
            return;
        }

        // Increment turn counter for statistics
        this.turnCount++;

        if (this.isAnimating && this.projectiles.length > 0) {
            return;
        }

        if (this.gameOver) {
            return;
        }

        // Realtime mode: don't advance turns, just clear animation state
        if (this.mode === 'realtime') {
            this.isAnimating = false;
            this.fireLocked = false;
            this.turnEnding = false;
            // Check win condition
            this.checkGameOver();
            return;
        }

    this.turnEnding = true;
        // console.log(`Ending turn ${this.currentTankIndex}`);
        
    // Preserve tracer preview across turns so the shooter can see their last plotted path.
    // Increment turn count and clear if the owner is no longer valid or has had 2 full turns.
    try {
        if (this.tracerPreview && this.tracerPreview.owner) {
            const owner = this.tracerPreview.owner;
            // Clear if owner is dead/removed
            if (!this.tanks.includes(owner) || owner.health <= 0) {
                this.tracerPreview = null;
            } else {
                // Increment turn counter if this is the owner's turn ending
                const nextIndex = (this.currentTankIndex + 1) % this.tanks.length;
                const nextTank = this.tanks[nextIndex];
                if (nextTank === owner) {
                    // Owner's turn is about to start - increment counter
                    this.tracerPreview.turnsShown = (this.tracerPreview.turnsShown || 0) + 1;
                    // Clear after owner has seen it for one full turn (counter reaches 2)
                    if (this.tracerPreview.turnsShown >= 2) {
                        this.tracerPreview = null;
                    }
                }
            }
        }
    } catch {}

    // Check if any tanks are still alive before advancing turn
    const aliveTanks = this.tanks.filter(t => t.health > 0);
    if (aliveTanks.length === 0) {
        // All tanks dead simultaneously - trigger game over immediately
        this.gameOver = true;
        this.checkGameOver();
        return;
    }

    // Advance to next living tank
    let next = this.currentTankIndex;
    for (let step = 0; step < this.tanks.length; step++) {
        next = (next + 1) % this.tanks.length;
        if (this.tanks[next].health > 0) { break; }
    }
    this.currentTankIndex = next;
    // New turn token invalidates any pending old endTurn timers
    this.turnToken++;
    this.cancelEndTurn();
        
    this.reseedWindForTurn();
    this.updateWindDisplay();
        
    this.updateUI();
    this.checkTeamsOrHumansState();
        
        const currentTank = this.tanks[this.currentTankIndex];
        // Expire shield when your own turn begins
        try {
            if (currentTank && currentTank._shield) {
                currentTank._shield = null;
                this.addLog(`${currentTank.name}'s shield faded.`, 'info');
            }
        } catch {}

        // Underwater base repair/refuel mechanics (ocean mode)
        try {
            if (this.terrain?._isOceanTerrain) {
                // Find all underwater bases
                const bases = this.tanks.filter(t => t.type === 'underwater_base' && t.health > 0);
                for (const base of bases) {
                    // Find nearby allies within base's repair radius
                    for (const tank of this.tanks) {
                        if (tank === base || tank.health <= 0) continue;

                        // Check if tank is within repair/refuel radius
                        const dx = tank.x - base.x;
                        const dy = tank.y - base.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= (base.repairRadius || 80)) {
                            // In team mode, only repair teammates
                            if (this.mode === 'teams' && this.teams) {
                                const baseTeam = this.teams[this.tanks.indexOf(base)];
                                const tankTeam = this.teams[this.tanks.indexOf(tank)];
                                if (baseTeam !== tankTeam) continue;
                            }

                            // Repair health
                            if (tank.health < tank.maxHealth) {
                                const healAmount = Math.min(base.repairRate || 2, tank.maxHealth - tank.health);
                                tank.health += healAmount;
                                if (tank === currentTank) {
                                    this.addLog(`${tank.name} repaired ${healAmount} HP at ${base.name}`, 'success');
                                }
                            }

                            // Refuel
                            if (tank.fuel < tank.maxFuel && tank.maxFuel < 999999) {
                                const fuelAmount = Math.min(base.refuelRate || 10, tank.maxFuel - tank.fuel);
                                tank.fuel += fuelAmount;
                                if (tank === currentTank) {
                                    this.addLog(`${tank.name} refueled ${fuelAmount} at ${base.name}`, 'success');
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error in underwater base repair/refuel:', e);
        }

        // console.log(`New turn: ${currentTank.name} (isAI: ${currentTank.isAI})`);
        // Skip stunned tanks: consume one stun turn and immediately end the turn
        if (currentTank._stunnedTurns && currentTank._stunnedTurns > 0) {
            currentTank._stunnedTurns -= 1;
            this.addLog(`${currentTank.name} is stunned and loses their turn!`, 'warn');
            this.isAnimating = false;
            this.turnEnding = false;
            this.fireLocked = false;
            this.aiTurnInProgress = false;
            this.scheduleEndTurn(200);
            return;
        }
        
    // Clear gates for the new shooter's turn
        this.isAnimating = false;
        this.turnEnding = false;
        this.fireLocked = false;
        this.aiTurnInProgress = false;

        // Realtime mode: controls are always enabled for human players
        if (this.mode === 'realtime') {
            this.enableControls();
        } else if (currentTank.isAI) {
            this.disableControls();
            this.addLog(`${currentTank.name}'s turn...`, 'info');
            setTimeout(() => {
                this.performAITurn();
            }, 1500);
        } else {
            this.enableControls();
            // Solo: if shots are exhausted after completing the turn, finish round
            if (this.mode === 'solo' && this.soloActive && this.soloShotsTotal !== null && this.soloShotsUsed >= this.soloShotsTotal) {
                setTimeout(() => this.finishSoloRound(), 300);
            }
        }
        // Decay smoke screens each full turn
        try {
            if (Array.isArray(this.smokeScreens)) {
                for (const s of this.smokeScreens) {
                    if (s.turnsLeft != null) s.turnsLeft = Math.max(0, (s.turnsLeft || 0) - 1);
                }
            }
        } catch {}
        // Autosave at natural turn boundaries
        try { this.saveSnapshotToStorage('endTurn'); } catch {}
    }

    addWreck(x, y, color) {
        // Basic char and smoke state
        this.wrecks = this.wrecks || [];
        const now = performance.now?.() || Date.now();
        // y is anchored to surface; add simple physics state for settling
        this.wrecks.push({ x, y, vy: 0, color, created: now, nextSmoke: now + 200, char: true });
    }

    drawWrecks(onlyChar = false) {
        if (!this.wrecks || this.wrecks.length === 0) return;
        const ctx = this.ctx;
        const now = performance.now?.() || Date.now();
        for (const w of this.wrecks) {
            // Char mark blended on terrain
            if (w.char) {
                ctx.save();
                ctx.globalCompositeOperation = 'multiply';
                const r = 18;
                const g = ctx.createRadialGradient(w.x, w.y - 4, 0, w.x, w.y - 4, r);
                g.addColorStop(0, 'rgba(40,30,20,0.55)');
                g.addColorStop(1, 'rgba(40,30,20,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(w.x, w.y - 2, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            if (onlyChar) continue;
            // Occasional smoke puff
            if (now >= (w.nextSmoke || 0)) {
                this.spawnSmokePuff(w.x, w.y - 12);
                w.nextSmoke = now + 600 + Math.random() * 1000;
            }
            // Little wreck nub silhouette (smoldering)
            ctx.save();
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#00000055';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(w.x, w.y - 8, 8, 6, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    // Apply simple gravity so wrecks fall to the ground if terrain beneath is removed
    updateWrecks(dtMs) {
        if (!this.wrecks || this.wrecks.length === 0) return;
        const dt = Math.max(1, dtMs || 16);
        const g = 0.01; // px per ms^2
        for (const w of this.wrecks) {
            const gx = Math.max(0, Math.min(Math.floor(w.x), this.width - 1));
            const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
            const targetY = ground; // keep wreck anchored to surface
            // If above ground, fall down with gravity
            if (w.y < targetY - 0.1) {
                w.vy = Math.min(4, (w.vy || 0) + g * dt);
                w.y = Math.min(targetY, w.y + w.vy);
                if (w.y >= targetY - 0.01) { w.y = targetY; w.vy = 0; }
            } else if (w.y > targetY + 0.1) {
                // If terrain rose below wreck (or rounding drift), snap to surface
                w.y = targetY;
                w.vy = 0;
            }
        }
    }

    spawnSmokePuff(x, y) {
        const gx = Math.max(0, Math.min(Math.floor(x), this.width - 1));
        const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
        const emitY = Math.min(y, ground - 2);
        this.particleSystem.createSmokePuff(x, emitY, 12);
    }

    // Canyon dust: uses ParticleSystem dust puff if available
    spawnCanyonDust(x, y, count = 8) {
        const gx = Math.max(0, Math.min(Math.floor(x), this.width - 1));
        const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
        const emitY = Math.min(y, ground - 1);
        if (typeof this.particleSystem.createDustPuff === 'function') {
            this.particleSystem.createDustPuff(x, emitY, count);
        }
    }

    // Desert dust reuses tan dust puff
    spawnDesertDust(x, y, count = 8, options = {}) {
        const gx = Math.max(0, Math.min(Math.floor(x), this.width - 1));
        const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
        const emitY = Math.min(y, ground - 1);
        if (typeof this.particleSystem.createDustPuff === 'function') {
            this.particleSystem.createDustPuff(x, emitY, count, options);
        }
    }

    // Moon dust uses pale, low-gravity particles
    spawnMoonDust(x, y, count = 6, options = {}) {
        const gx = Math.max(0, Math.min(Math.floor(x), this.width - 1));
        const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
        const emitY = Math.min(y, ground - 1);
        if (typeof this.particleSystem.createMoonDustPuff === 'function') {
            this.particleSystem.createMoonDustPuff(x, emitY, count, options);
        }
    }

    // Make Solo target obey gravity: if the ground below is destroyed, it falls until resting on ground
    updateSoloTargetPhysics(dtMs) {
        if (!this.soloActive || !this.soloTarget) return;
        const t = this.soloTarget;
        const dt = Math.max(1, dtMs || 16);
        const g = 0.01; // px per ms^2, similar to wrecks
        // Determine ground directly beneath the target's x
        const gx = Math.max(0, Math.min(Math.floor(t.x), this.width - 1));
        const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
        const targetY = Math.max(0, ground - t.r); // keep the ring resting on surface (center is r above ground)
        if (t.y < targetY - 0.1) {
            // Falling: accelerate and move toward targetY
            t.vy = Math.min(4, (t.vy || 0) + g * dt);
            t.y = Math.min(targetY, t.y + t.vy);
            if (t.y >= targetY - 0.01) {
                // Landed: slight bounce and dust puff
                t.y = targetY;
                // Bounce up a bit if we hit with speed; then damp heavily
                if ((t.vy || 0) > 0.6) {
                    t.vy = -0.35 * t.vy; // invert and damp
                    // Emit a tiny dust puff where it landed
                    try { this.spawnDustForTheme?.(this.themeName, t.x, targetY, 4, { sizeScale: 0.6 }); } catch {}
                } else {
                    t.vy = 0;
                }
            }
        } else if (t.y > targetY + 0.1) {
            // If terrain rose (rare), snap back onto the surface
            t.y = targetY;
            t.vy = 0;
        } else {
            // At rest on surface
            t.vy = 0;
            t.y = targetY;
        }
    }

    // Mars dust uses reddish tones
    spawnMarsDust(x, y, count = 6, options = {}) {
        const gx = Math.max(0, Math.min(Math.floor(x), this.width - 1));
        const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
        const emitY = Math.min(y, ground - 1);
        if (typeof this.particleSystem.createMarsDustPuff === 'function') {
            this.particleSystem.createMarsDustPuff(x, emitY, count, options);
        }
    }

    spawnDustForTheme(themeName, x, y, count, options) {
        if (themeName === 'desert' || themeName === 'canyon') return this.spawnDesertDust(x, y, count, options);
        if (themeName === 'moon') return this.spawnMoonDust(x, y, count, options);
        if (themeName === 'mars') return this.spawnMarsDust(x, y, count, options);
    }

    // --- Smoke screens ---
    addSmokeScreen(x, y, radius = 70, turns = 2) {
        const gx = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
        const gy = this.terrain ? (this.terrain.getHeight(gx) - 2) : y;
        const s = { x: gx, y: gy, radius, turnsLeft: turns, initialTurns: turns, _emitTick: 0, _graceMs: 800 };
        this.smokeScreens.push(s);
        // MUCH thicker initial puff for better feedback
        try {
            this.particleSystem.createSmokePuff(gx, gy, 20);
            // Add multiple smoke puffs for initial thickness
            for (let i = 0; i < 8; i++) {
                const rx = (Math.random() * 2 - 1) * radius * 0.5;
                const ry = (Math.random() * 2 - 1) * radius * 0.3;
                this.particleSystem.createSmokePuff(gx + rx, gy + ry, 15 + Math.random() * 10);
            }
        } catch (error) {
            console.error('[smokeScreen] Failed to create initial puff:', error);
        }
    }

    updateSmokeScreens(dtMs) {
        if (!this.smokeScreens || this.smokeScreens.length === 0) return;
        const wind = this.windOverride ?? this.wind ?? 0;
        for (const s of this.smokeScreens) {
            s._graceMs = Math.max(0, (s._graceMs || 0) - dtMs);
            // Gentle horizontal drift with wind; clamp to playfield
            s.x = Math.max(0, Math.min(this.width - 1, s.x + wind * 0.04));
            const gx = Math.max(0, Math.min(this.width - 1, Math.floor(s.x)));
            const ground = this.terrain ? this.terrain.getHeight(gx) : this.height;
            s.y = Math.min(s.y, ground - 2);
            // Emit MUCH MORE smoke particles to maintain VERY THICK cloud
            s._emitTick = (s._emitTick || 0) - dtMs;
            if (s._emitTick <= 0) {
                // Emit 5 puffs instead of 3 for extremely thick coverage
                for (let i = 0; i < 5; i++) {
                    const rx = (Math.random() * 2 - 1) * (s.radius * 0.7);
                    const ry = (Math.random() * 2 - 1) * (s.radius * 0.4);
                    this.particleSystem.createSmokePuff(s.x + rx, s.y - 4 + ry, 10 + Math.floor(Math.random() * 12));
                }
                s._emitTick = 80 + Math.random() * 100; // Even more frequent emission
            }
        }
        this.smokeScreens = this.smokeScreens.filter(s => (s.turnsLeft || 0) > 0 || (s._graceMs || 0) > 0);
    }

    renderSmokeScreens(ctx) {
        if (!this.smokeScreens || this.smokeScreens.length === 0) return;
        for (const s of this.smokeScreens) {
            const lifeFrac = (s.initialTurns && s.initialTurns > 0) ? ((s.turnsLeft || 0) / s.initialTurns) : 0;
            // VERY THICK: increased from 0.75 to 0.95 base alpha for near-total obscuration
            const alpha = 0.95 * Math.max(0.5, Math.min(1, lifeFrac + 0.5));
            const r = s.radius || 70;
            ctx.save();

            // Layer 1: Dense core - very opaque center
            const g1 = ctx.createRadialGradient(s.x, s.y - r * 0.4, r * 0.1, s.x, s.y - r * 0.4, r * 0.6);
            g1.addColorStop(0, `rgba(180,180,180, ${alpha * 1.0})`);
            g1.addColorStop(0.5, `rgba(150,150,150, ${alpha * 0.85})`);
            g1.addColorStop(1, `rgba(140,140,140, ${alpha * 0.5})`);
            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y - r * 0.35, r * 1.0, r * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();

            // Layer 2: Main fog patch - thick and opaque
            const g2 = ctx.createRadialGradient(s.x, s.y - r * 0.4, r * 0.2, s.x, s.y - r * 0.4, r * 1.1);
            g2.addColorStop(0, `rgba(160,160,160, ${alpha * 0.9})`);
            g2.addColorStop(0.5, `rgba(130,130,130, ${alpha * 0.75})`);
            g2.addColorStop(0.8, `rgba(120,120,120, ${alpha * 0.4})`);
            g2.addColorStop(1, 'rgba(110,110,110, 0)');
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y - r * 0.35, r * 1.25, r * 0.95, 0, 0, Math.PI * 2);
            ctx.fill();

            // Layer 3: Multiple thick wisps for complete obscuration
            ctx.globalAlpha = alpha * 0.85;
            // Top-left wisp
            ctx.beginPath();
            ctx.ellipse(s.x + r * 0.35, s.y - r * 0.5, r * 0.65, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Top-right wisp
            ctx.beginPath();
            ctx.ellipse(s.x - r * 0.4, s.y - r * 0.45, r * 0.7, r * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            // Bottom wisp for ground coverage
            ctx.globalAlpha = alpha * 0.9;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y - r * 0.15, r * 0.9, r * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Layer 4: Side wisps for width
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.ellipse(s.x + r * 0.6, s.y - r * 0.3, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(s.x - r * 0.65, s.y - r * 0.35, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    checkTeamsOrHumansState() {
        // In Solo mode, do not run generic game-over checks; the Solo flow
        // controls round completion based on shots used and target goal.
        if (this.mode === 'solo') {
            return;
        }
        // If no humans left AND there were humans at the start, prompt to skip.
        // For all-AI matches from the outset, do not show the prompt; just auto-play.
        try {
            const anyHumanAlive = this.tanks.some((t) => t.health > 0 && !t.isAI);
            const skip = !anyHumanAlive && !!this.hadHumansAtStart;
            const el = document.getElementById('skip-modal');
            if (el) {
                if (skip) el.classList.remove('hidden'); else el.classList.add('hidden');
            }
        } catch {}
        if (this.mode === 'teams' && this.teams && this.teams.length === this.tanks.length) {
            const alive = this.tanks.map((t) => t.health > 0);
            const aliveA = alive.some((alive, i) => alive && this.teams[i] === 'A');
            const aliveB = alive.some((alive, i) => alive && this.teams[i] === 'B');
            if (aliveA && !aliveB) {
                this.gameOver = true; this.showWinnerTeam('A');
            } else if (!aliveA && aliveB) {
                this.gameOver = true; this.showWinnerTeam('B');
            }
        } else {
            this.checkGameOver();
        }
    }

    showWinnerTeam(team) {
        const label = team === 'A' ? 'Team A' : 'Team B';

        // Check if auto-restart is enabled
        const autoRestartEnabled = localStorage.getItem('auto-restart-enabled') === 'true';
        if (autoRestartEnabled && typeof globalThis.startAutoRestartCountdown === 'function') {
            try { globalThis.startAutoRestartCountdown(); return; }
            catch (e) { console.error('[showWinnerTeam] Auto-restart failed:', e); }
        }

        // Use toast instead of modal
        const victoryMessage = "Teamwork makes the dream work!";
        this.showVictoryToast(label, victoryMessage, null);
    }

    finishAIGameImmediately() {
        // Simple auto-resolve: count remaining HP by team or per-tank
        if (this.mode === 'teams' && this.teams) {
            let hpA = 0, hpB = 0;
            for (let i = 0; i < this.tanks.length; i++) {
                if (this.tanks[i].health > 0) {
                    if (this.teams[i] === 'A') hpA += this.tanks[i].health; else hpB += this.tanks[i].health;
                }
            }
            const winner = hpA >= hpB ? 'A' : 'B';
            this.showWinnerTeam(winner);
        } else {
            // FFA: highest HP tank wins
            let best = -1, idx = -1;
            for (let i = 0; i < this.tanks.length; i++) {
                if (this.tanks[i].health > best) { best = this.tanks[i].health; idx = i; }
            }
            if (idx >= 0) this.showGameOver(this.tanks[idx]);
        }
        this.gameOver = true;
    }

    reseedWindForTurn(initial = false) {
        // Determine wind depending on mode
        const baseMax = Math.abs(this.config?.physics?.windMax ?? 6);
        let max = baseMax;
        switch (this.windMode) {
            case 'none':
                this.wind = 0;
                return;
            case 'low':
                // Low wind: keep calmer than the original implementation.
                max = baseMax * 0.35;
                break;
            case 'high':
                max = baseMax;
                break;
            case 'random-per-turn':
                // Use full configured range each turn
                max = baseMax;
                break;
        }
        // If not random-per-turn and not initial reseed, keep wind stable
        if (!initial && (this.windMode === 'low' || this.windMode === 'high')) {
            // Small drift rather than full reroll
            const drift = (Math.random() - 0.5) * (this.windMode === 'low' ? 1.2 : 3.5);
            this.wind = Math.max(-max, Math.min(max, (this.wind ?? 0) + drift));
            return;
        }
        this.wind = (Math.random() - 0.5) * 2 * max;
    }
    
    // Centralized predicate for whether player input should be blocked
    isInputBlocked() {
        // In realtime mode, allow continuous control except when paused or game over
        if (this.mode === 'realtime') {
            return this.gameOver || this.paused;
        }
        return this.isAnimating || this.gameOver || this.turnEnding || this.paused || this.holdingForSupport;
    }

    fire() {
        if (this.isInputBlocked() || this.fireLocked) {
            const reason = this.getInputBlockedReason(true);

            if (reason) {
                try {
                    this.addLog(reason, 'info');
                } catch (e) {
                    console.log('[fire] blocked:', reason);
                }
            }
            return;
        }
        
        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank.health <= 0) return;

        // Solo mode: prevent firing if out of shots; only count after a projectile is successfully spawned
        if (this.mode === 'solo' && this.soloActive) {
            if (this.soloShotsTotal !== null && this.soloShotsUsed >= this.soloShotsTotal) {
                this.addLog('No shots remaining!', 'warn');
                return;
            }
        }
        // Ammo/mode constraints
        const weaponKey = currentTank.weapon;
        const restrictionReason = this.getWeaponRestrictionReason(weaponKey, currentTank);
        if (restrictionReason) {
            this.addLog(restrictionReason, 'warn');
            return;
        }
        // Special handling for shield and land_mine - check ammo but don't consume yet
        if (weaponKey === 'shield' || weaponKey === 'land_mine') {
            if (!currentTank.unlimitedAmmo) {
                const available = currentTank.getAmmo(weaponKey);
                if (available <= 0) {
                    this.addLog('Out of ammo for this weapon!', 'warn');
                    return;
                }
                // Don't consume yet - will consume after action is validated
            }
        } else {
            // Normal weapons consume ammo immediately
            if (!currentTank.unlimitedAmmo) {
                const available = currentTank.getAmmo(weaponKey);
                if (available <= 0) {
                    this.addLog('Out of ammo for this weapon!', 'warn');
                    return;
                }
                if (!currentTank.consumeAmmo(weaponKey)) {
                    this.addLog('Out of ammo for this weapon!', 'warn');
                    return;
                }
            }
        }

    // Latch immediately to avoid double-firing via rapid inputs
    this.fireLocked = true;
    // In realtime mode, keep controls enabled for human players
    if (this.mode !== 'realtime') {
        this.disableControls();
    }
        this.isAnimating = true;
        
        // Angle is world angle for tanks, but relative to submarine rotation for subs
    let angleRad = ((((currentTank.angle % 360) + 360) % 360) * Math.PI) / 180;

        // For submarines, add the rotation offset to fire relative to submarine direction
        if (currentTank.type === 'submarine' && typeof currentTank.rotation === 'number') {
            const rotationRad = (currentTank.rotation * Math.PI) / 180;
            angleRad += rotationRad;
        }

        const baseVelocity = (currentTank.power / 100) * 20 + 10;
        const velocity = baseVelocity * this.velocityMultiplier;

        const vx = Math.cos(angleRad) * velocity;
        const vy = -Math.sin(angleRad) * velocity;
        // Spawn from barrel tip accounting for tank body rotation
        const tip = currentTank.getBarrelWorldTip?.() || { x: currentTank.x, y: currentTank.y - 15 };
        // Shield Generator: apply defensive buff and end turn; no projectile
        if (currentTank.weapon === 'shield') {
            const duration = 1; // lasts until this tank's next turn
            const factor = 0.5; // 50% damage reduction
            currentTank._shield = { turnsLeft: duration, factor };
            // Consume ammo now that shield is successfully applied
            if (!currentTank.unlimitedAmmo) {
                currentTank.consumeAmmo('shield');
            }
            this.addLog(`${currentTank.name} activated a shield! (-${Math.round((1-factor)*100)}% damage until next turn)`, 'info');
            try {
                // Small visual pop
                this.particleSystem.createExplosion(currentTank.x, currentTank.y - 10, 16, '#66ccff');
                this.addLight(currentTank.x, currentTank.y - 10, 120, 900, '#66ccff');
            } catch {}
            // Re-enable controls latch for UX then end turn shortly
            this.isAnimating = false;
            this.fireLocked = false;
            this.enableControls();
            this.scheduleEndTurn(450);
            // Update UI so ammo counts refresh
            try { this.updateUI(); } catch {}
            return;
        }
        // Special-case: land mine placement at current position
        if (currentTank.weapon === 'land_mine') {
            const gx = Math.max(0, Math.min(this.width - 1, Math.floor(currentTank.x)));
            const gy = (this.terrain ? this.terrain.getHeight(gx) : currentTank.y) - 2;
            // Prevent stacking too many mines at the exact same spot: limit 1 per 10px radius per owner
            const tooClose = this.mines.some(m => m.owner === currentTank && Math.hypot(m.x - gx, m.y - gy) < 10);
            if (tooClose) {
                this.addLog('Mine already placed here.', 'warn');
                // No need to refund ammo since we haven't consumed it yet
                this.isAnimating = false;
                this.fireLocked = false;
                this.enableControls();
                return;
            }
            // Consume ammo now that placement is validated
            if (!currentTank.unlimitedAmmo) {
                currentTank.consumeAmmo('land_mine');
            }
            this.mines.push({ x: gx, y: gy, owner: currentTank, armedAt: (performance.now?.() || Date.now()) + (this.landMineCfg.armDelayMs || 600), radius: this.landMineCfg.radius, damage: this.landMineCfg.damage, triggerRadius: this.landMineCfg.triggerRadius, color: this.landMineCfg.color });
            this.addLog(`${currentTank.name} planted a land mine.`, 'info');
            try { this.particleSystem.createSmokePuff(gx, gy - 4, 8); } catch {}
            // End turn shortly; no projectile spawned
            this.isAnimating = false;
            this.fireLocked = false;
            this.enableControls();
            this.scheduleEndTurn(450);
            try { this.updateUI(); } catch {}
            return;
        }
        // Special-case: smoke bomb self-deploy when aiming near straight down and very low power
        if (currentTank.weapon === 'smoke_bomb') {
            const angDeg = (((currentTank.angle % 360) + 360) % 360);
            const nearDown = (angDeg >= 170 || angDeg <= 10);
            const veryLowPower = currentTank.power <= 20;
            if (nearDown && veryLowPower) {
                const gx = Math.max(0, Math.min(this.width - 1, Math.floor(currentTank.x)));
                const gy = (this.terrain ? this.terrain.getHeight(gx) : currentTank.y) - 2;
                this.addSmokeScreen(gx, gy, 85, 3);
                this.addLog('Smoke screen deployed at your position.', 'info');
                try { this.particleSystem.createExplosionSmoke(gx, gy, 60, '#c8c8c8'); } catch {}
                // End turn shortly, no projectile spawned
                this.scheduleEndTurn(400);
                return;
            }
        }

    // Clear any previous tracer preview for this tank when firing a new shot
    try { if (this.tracerPreview && this.tracerPreview.owner === currentTank) this.tracerPreview = null; } catch {}
    // Spawn projectile (including parachute_flare which now flies ballistically until apex)
        {
            const projectile = new Projectile(
                tip.x,
                tip.y,
                vx,
                vy,
                currentTank.weapon,
                this.config?.weapons // Pass weapon config from config.json
            );
            // Track who fired this projectile
            projectile.owner = currentTank;
            // Homing: delay guidance until 70% of initial distance is traveled to help clear hills
            if (currentTank.weapon === 'homing') {
                try {
                    projectile._startX = tip.x;
                    projectile._startY = tip.y;
                    const tgt = this.getNearestEnemyTank(currentTank);
                    const tx = tgt ? tgt.x : (currentTank.x + Math.cos(angleRad) * 300);
                    const ty = tgt ? (tgt.y - 10) : (currentTank.y - 10 - Math.sin(angleRad) * 300);
                    const straightDist = Math.hypot(tx - projectile._startX, ty - projectile._startY) || 1;

                    // Use a clamped displacement threshold so homing reliably engages
                    const minDisplacement = Math.max(100, Math.min(420, straightDist * 0.45));
                    projectile._homeThreshold = minDisplacement;
                    // Add a frame-based fallback timer (e.g., ~300ms at 60fps)
                    projectile._homeDelayFrames = 18;
                    projectile._homeEnabled = false;

                } catch (error) {
                    console.error('[homing] Failed to set up homing threshold:', error);
                }
            }
            this.projectiles.push(projectile);
            // Count the shot for Solo only after a projectile is spawned successfully
            if (this.mode === 'solo' && this.soloActive) {
                this.soloShotsUsed += 1;
            }
        }
        // Notify AV layer (fire)
        try {
            const ev = new CustomEvent('game:fire', { detail: { weapon: currentTank.weapon } });
            document.dispatchEvent(ev);
        } catch {}
        
        const weaponNames = {
            'missile': 'Missile',
            'homing': 'Homing Missile',
            'heavy': 'Heavy Shell',
            'nuke': 'Nuclear Bomb',
            'emp': 'EMP',
            'mirv': 'MIRV',
            'funky': 'Funky Bomb',
            'drill': 'Ground Remover',
            'laser': 'Laser Beam',
            'cluster': 'Cluster Bomb',
            'bunker': 'Bunker Buster',
            'smoke_bomb': 'Smoke Bomb',
            'tracer': 'Tracer Round',
            'marker_attack': 'Smoke Marker: Paratroopers',
            'marker_medic': 'Smoke Marker: Medics',
            'marker_airstrike': 'Smoke Marker: Airstrike',
            'marker_airnukes': 'Smoke Marker: Air Nukes',
            'icbm': 'ICBM Missile',
            'acid': 'Acid Bomb',
            'napalm': 'Napalm',
            'toxic_gas': 'Toxic Gas',
            'healing_bomb': 'Healing Bomb',
            'shockwave': 'Shockwave',
            'flare': 'Flare',
            'parachute_flare': 'Parachute Flare'
        };
        weaponNames['bouncing_bomb'] = 'Bouncing Bomb';
        weaponNames['supply_crate'] = weaponNames['supply_crate'] || 'Supply Crate';
        weaponNames['shield'] = 'Shield';
        this.addLog(`${currentTank.name} fired ${weaponNames[currentTank.weapon] || 'Unknown'}!`, 'info');
        // Update HUD ammo display after consuming
        try { this.updateUI(); } catch {}
    }

    finishSoloRound() {
        this.soloActive = false;
        this.soloTarget = null;

        // Summary details with validation
        const hits = Math.max(0, Math.min(this.soloTargetsHit || 0, this.soloShotsUsed || 0));
        const used = Math.max(0, this.soloShotsUsed || 0);
        const total = this.soloShotsTotal === null ? '∞' : String(this.soloShotsTotal);

        // Calculate misses: total shots used minus hits
        const misses = Math.max(0, used - hits);

        // Validate the math
        if (used !== hits + misses) {
            console.error('[solo] Score calculation mismatch:', {
                used,
                hits,
                misses,
                expected: hits + misses,
                score: this.soloScore
            });
        }

                const winnerText = document.getElementById('winner-text');
                if (winnerText) {
                        winnerText.textContent = 'Solo Complete!';
                }
                const statsEl = document.getElementById('game-over-stats');
                if (statsEl) {
                        const accuracy = (used > 0) ? Math.round((hits / used) * 100) : 0;
                        statsEl.innerHTML = `
                                <table class="score-table" role="table" aria-label="Solo results">
                                    <tbody>
                                        <tr><th scope="row">Score</th><td>${this.soloScore}</td></tr>
                                        <tr><th scope="row">Hits</th><td>${hits}</td></tr>
                                        <tr><th scope="row">Misses</th><td>${misses}</td></tr>
                                        <tr><th scope="row">Shots Used</th><td>${used}</td></tr>
                                        <tr><th scope="row">Accuracy</th><td>${accuracy}%</td></tr>
                                    </tbody>
                                </table>`;
                }
        // Always use the shared helper so close handlers (ESC/click-outside/X) are attached
        if (typeof globalThis.openGameOverModal === 'function') {
            try { globalThis.openGameOverModal(); return; } catch {}
        }
        // Fallbacks
        const modal = document.getElementById('game-over-modal');
        if (modal && 'showModal' in modal) {
            try { if (!modal.open) modal.showModal(); } catch {}
        }
        modal?.classList.remove('hidden');
        this.gameOver = true;
    }
    
    getWeaponName() {
        const names = {
            'missile': 'Missile',
            'homing': 'Homing Missile',
            'heavy': 'Heavy Shell',
            'nuke': 'Nuclear Bomb',
            'emp': 'EMP',
            'laser': 'Laser Beam',
            'cluster': 'Cluster Bomb',
            'bunker': 'Bunker Buster',
            'mirv': 'MIRV',
            'funky': 'Funky Bomb',
            'drill': 'Ground Remover',
            'acid': 'Acid Bomb',
            'tracer': 'Tracer Round',
            'napalm': 'Napalm',
            'toxic_gas': 'Toxic Gas',
            'healing_bomb': 'Healing Bomb',
            'shockwave': 'Shockwave',
            'flare': 'Flare',
            'parachute_flare': 'Parachute Flare',
            'smoke_bomb': 'Smoke Bomb'
        };
        names['bouncing_bomb'] = 'Bouncing Bomb';
        names['supply_crate'] = names['supply_crate'] || 'Supply Crate';
        names['shield'] = 'Shield';
        return names[this.currentWeapon] || 'Unknown';
    }
    
    setAngle(angle) {
        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank && !currentTank.isAI) {
            currentTank.angle = ((angle % 360) + 360) % 360;
        }
    }
    
    setPower(power) {
        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank && !currentTank.isAI) {
            currentTank.power = Math.max(0, Math.min(100, power));
        }
    }
    
    setWeapon(weapon) {
        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank && !currentTank.isAI) {
            const restrictionReason = this.getWeaponRestrictionReason(weapon, currentTank, { ignoreAmmo: true });
            if (restrictionReason) {
                this.addLog(restrictionReason, 'warn');
                currentTank.weapon = this.getFallbackWeapon(currentTank, { order: [currentTank.weapon, 'missile', 'tracer', 'homing', 'cluster', 'heavy'] });
            } else {
                currentTank.weapon = weapon;
            }
            this.ensureTankWeaponSelection(currentTank);
            // Keep UI in sync
            this.updateUI();
        }
    }
    
    setDifficulty(difficulty) {
        // Store difficulty; applied when starting a new game
        this.aiDifficulty = difficulty;
        this.addLog(`AI difficulty set to ${difficulty} (applies on next New Game)`, 'info');
    }
    
    clearLog() {
        const logMessages = document.getElementById('log-messages');
        logMessages.innerHTML = '';
    }
    
    setWindOverride(value) {
        this.windOverride = value;
        this.updateWindDisplay();
        if (value ?? null) {
            this.addLog(`Wind override set to ${value.toFixed(1)}`, 'info');
        } else {
            this.addLog('Wind override disabled', 'info');
        }
    }
    
    setFuelMode(mode) {
        this.fuelMode = mode;
        // Update existing tanks
        for (let tank of this.tanks) {
            if (mode === 'normal') {
                tank.maxFuel = 200;  // Updated base fuel
                tank.fuel = Math.min(tank.fuel, 200);
            } else if (mode === 'double') {
                tank.maxFuel = 400;  // Double the new base
                if (tank.fuel < 400) tank.fuel = 400;
            } else if (mode === 'unlimited') {
                tank.maxFuel = 999999;
                tank.fuel = 999999;
            }
        }
        this.updateUI();
        this.addLog(`Fuel mode set to ${mode}`, 'info');
    }
    
    setCustomFuel(value) {
        // Set custom fuel amount
        for (let tank of this.tanks) {
            tank.maxFuel = value;
            tank.fuel = value;
        }
        this.updateUI();
        this.addLog(`Custom fuel set to ${value}`, 'info');
    }
    
    setHealthOverride(value) {
        this.healthOverride = value;
        if (value ?? null) {
            this.addLog(`Health override set to ${value} (applies to new games)`, 'info');
        } else {
            this.addLog('Health override disabled', 'info');
        }
    }
    
    setGravityOverride(value) {
        this.gravityOverride = value;
        if (value ?? null) {
            this.addLog(`Gravity override set to ${value.toFixed(2)}`, 'info');
        } else {
            this.addLog('Gravity override disabled', 'info');
        }
    }
    
    setTerrainSmoothness(value) {
        // Store terrain smoothness (1-100, where higher = smoother)
        this.terrainSmoothness = value;
        this.terrain.smoothness = value;
        this.addLog(`Terrain smoothness set to ${value}`, 'info');
        // Regenerate terrain with new smoothness
        this.terrain.generate();
        // Reposition tanks (but skip submarines/bases)
        for (let tank of this.tanks) {
            if (tank.health > 0 && tank.type !== 'submarine' && tank.type !== 'base') {
                tank.update(this.terrain);
            }
        }
    }
    
    setDamageMultiplier(value) {
        this.damageMultiplier = value;
        this.addLog(`Damage multiplier set to ${value.toFixed(1)}x`, 'info');
    }

    // --- Dust debug override APIs ---
    setDustEnabledOverride(onOrNull) {
        this.dustOverrideEnabled = (onOrNull === null) ? null : !!onOrNull;
        const label = this.dustOverrideEnabled === null ? 'Auto' : (this.dustOverrideEnabled ? 'On' : 'Off');
        this.addLog(`Ambient dust: ${label}`, 'info');
    }
    setDustAmountMultiplier(v) {
        this.dustAmountMultiplier = Math.max(0, Number(v) || 1);
        this.addLog(`Dust amount: ${this.dustAmountMultiplier.toFixed(1)}x`, 'info');
    }
    setDustSizeScale(v) {
        this.dustSizeScale = Math.max(0.1, Number(v) || 1);
        this.addLog(`Dust size: ${this.dustSizeScale.toFixed(1)}x`, 'info');
    }
    setDustLifetimeScale(v) {
        this.dustLifetimeScale = Math.max(0.1, Number(v) || 1);
        this.addLog(`Dust lifetime: ${this.dustLifetimeScale.toFixed(1)}x`, 'info');
    }
    // Active tank highlight controls
    setActiveHighlightEnabled(on) {
        this.activeHighlightEnabled = !!on;
        this.addLog(`Active highlight: ${this.activeHighlightEnabled ? 'On' : 'Off'}`, 'info');
    }
    setActiveHighlightIntensity(v) {
        if (!Number.isFinite(v)) return;
        this.activeHighlightIntensity = Math.max(0, Math.min(2, v));
        this.addLog(`Highlight intensity: ${this.activeHighlightIntensity.toFixed(1)}x`, 'info');
    }
    
    resetAllCheats() {
        this.windOverride = null;
        this.fuelMode = 'normal';
        this.healthOverride = null;
        this.gravityOverride = null;
    this.damageMultiplier = 1;
        // Dust overrides
        this.dustOverrideEnabled = null;
        this.dustAmountMultiplier = 1;
        this.dustSizeScale = 1;
        this.dustLifetimeScale = 1;
        
        // Reset tanks to normal fuel
        for (let tank of this.tanks) {
            tank.maxFuel = 200;
            tank.fuel = Math.min(tank.fuel, 200);
        }
        
        this.updateWindDisplay();
        this.updateUI();
        this.addLog('All cheats reset to default', 'info');
    }
    
    adjustAngle(delta) {
        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank && !currentTank.isAI) {
            const next = (currentTank.angle + delta);
            currentTank.angle = ((next % 360) + 360) % 360;
        }
    }
    
    adjustPower(delta) {
        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank && !currentTank.isAI) {
            currentTank.power = Math.max(0, Math.min(100, currentTank.power + delta));
        }
    }
    
    getCurrentTank() {
        return this.tanks[this.currentTankIndex];
    }
    
    performAITurn() {
        if (this.gameOver || this.isAnimating || this.turnEnding) return;

        const aiTank = this.tanks[this.currentTankIndex];
        if (!aiTank?.isAI || aiTank.health <= 0) return;

        // Prevent multiple AI turns - check if current tank is actually AI
        if (this.aiTurnInProgress) {
            // console.log('AI turn already in progress, skipping');
            return;
        }

        this.aiTurnInProgress = true;

        try {
        
        const targets = this.tanks.filter(t => t !== aiTank && t.health > 0);
        if (targets.length === 0) {
            this.aiTurnInProgress = false;
            return;
        }
        
        const target = targets[Math.floor(Math.random() * targets.length)];
        const initialDx = target.x - aiTank.x;
        const initialDy = aiTank.y - target.y;
        const initialDistance = Math.hypot(initialDx, initialDy);

        const plan = this.planAIMovement(aiTank, target, initialDistance);
        const afterMove = () => {
            if (this.gameOver) { this.aiTurnInProgress = false; return; }
            // Recompute distance after movement
            const dx = target.x - aiTank.x;
            const dy = aiTank.y - target.y;
            const distance = Math.hypot(dx, dy);
            const { angle: bestAngle, power: bestPower, weapon: bestWeapon } = this.calculateAIShot(distance, dx, dy, target);
            // Defensive check: consider using shield instead of attacking
            const aiTargets = this.tanks.filter(t => t && t.health > 0 && t !== aiTank && !this.isFriendly(aiTank, t));
            const useShield = this.shouldAIUseShield(aiTank, aiTargets);
            if (useShield) {
                aiTank.weapon = 'shield';
                // Angle/power irrelevant for shield; set reasonable defaults
                aiTank.angle = 90; aiTank.power = 50;
            } else {
                aiTank.angle = Math.round(bestAngle);
                aiTank.power = Math.round(bestPower);
                aiTank.weapon = bestWeapon;
            }
            this.updateUI();
            const thinkTime = this.config?.ai?.[aiTank.aiSkill]?.thinkTime || 1500;
            setTimeout(() => {
                const tryFire = (retries = 25) => {
                    if (this.gameOver) { this.aiTurnInProgress = false; return; }
                    // While paused (blur, modal, etc.), wait without consuming retries. Once
                    // resumed, the poll naturally fires. Prevents the AI from "giving up" when
                    // the user briefly switches away during its think window.
                    if (this.paused) {
                        setTimeout(() => tryFire(retries), 250);
                        return;
                    }
                    if (!this.isAnimating && !this.turnEnding) {
                        this.aiTurnInProgress = false;
                        this.fire();
                    } else if (retries > 0) {
                        setTimeout(() => tryFire(retries - 1), 120);
                    } else {
                        // Force through stuck animation/turn-ending gates after retry budget.
                        this.isAnimating = false;
                        this.turnEnding = false;
                        this.aiTurnInProgress = false;
                        this.fire();
                    }
                };
                tryFire();
            }, thinkTime);
        };

        if (plan && plan.shouldMove && plan.steps > 0) {
            this.executeAIMove(aiTank, plan, afterMove);
        } else {
            afterMove();
        }
        } catch (error) {
            console.error('[performAITurn] Error during AI turn:', error);
            this.aiTurnInProgress = false;
            this.enableControls();
        }
    }

    // Decide if AI should use Shield this turn based on health and exposure
    shouldAIUseShield(aiTank, enemyTargets) {
        try {
            if (!aiTank || !aiTank.isAI || aiTank.health <= 0) return false;
            // Already shielded? Don't re-apply
            if (aiTank._shield && (aiTank._shield.turnsLeft ?? 0) > 0) return false;
            // Check if shield is allowed by mode and ammo
            const canUse = () => {
                if (this.ammoMode === 'missile-only') return false;
                if (aiTank.unlimitedAmmo) return true;
                const n = aiTank.getAmmo?.('shield') ?? 0;
                return n > 0;
            };
            if (!canUse()) return false;

            const maxH = aiTank.maxHealth || 100;
            const hpFrac = maxH > 0 ? (aiTank.health / maxH) : 0;
            const lowHealth = hpFrac <= 0.35; // <= 35%

            // Exposure: count nearby enemies; evaluate nearest enemy distance
            let nearCount = 0;
            let nearest = Infinity;
            for (const t of enemyTargets || []) {
                const d = Math.hypot((t.x - aiTank.x), ((t.y - 10) - (aiTank.y - 10)));
                if (d < nearest) nearest = d;
                if (d <= 220) nearCount++;
            }
            const veryCloseEnemy = nearest < 160;
            const manyNearby = nearCount >= 2;

            // Edge/slope exposure: edges are risky; steep slope increases hit chance
            const nearEdge = (aiTank.x < 60) || (aiTank.x > this.width - 60);
            const slopeDeg = Math.abs((this.terrain?.getSlopeAngle?.(aiTank.x) || 0) * 180 / Math.PI);
            const steep = slopeDeg > 14;

            // Difficulty-based willingness
            const skill = aiTank.aiSkill || 'medium';
            let baseProb = 0.0;
            if (skill === 'easy') baseProb = 0.25; else if (skill === 'hard' || skill === 'expert' || skill === 'insane') baseProb = 0.75; else baseProb = 0.5;

            // Compose triggers
            const trigger = lowHealth || veryCloseEnemy || manyNearby || (nearEdge && (veryCloseEnemy || steep));
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
    planAIMovement(aiTank, target, distance) {
        try {
            const skill = aiTank.aiSkill || 'medium';
            let baseProb = (skill === 'easy') ? 0.25 : (skill === 'hard' || skill === 'expert' || skill === 'insane') ? 0.65 : 0.45;
            // Edges are dangerous
            if (aiTank.x < 60 || aiTank.x > this.width - 60) baseProb += 0.25;
            // Steep slope: prefer flatter ground
            const slopeDeg = Math.abs((this.terrain?.getSlopeAngle?.(aiTank.x) || 0) * 180 / Math.PI);
            if (slopeDeg > 12) baseProb += 0.2;
            // Too close or too far from target
            if (distance < 180) baseProb += 0.15; else if (distance > 620) baseProb += 0.2;
            // Clamp probability
            baseProb = Math.max(0, Math.min(0.9, baseProb));
            if (Math.random() >= baseProb) return { shouldMove: false, dir: 0, steps: 0, delay: 0 };

            // Choose direction
            let dir = 0;
            // If near edge, move inward
            if (aiTank.x < 60) dir = +1; else if (aiTank.x > this.width - 60) dir = -1;
            // If on steep slope, sample both sides and pick lower absolute slope
            if (dir === 0 && slopeDeg > 12) {
                const sl = Math.abs((this.terrain?.getSlopeAngle?.(aiTank.x - 12) || 0) * 180 / Math.PI);
                const sr = Math.abs((this.terrain?.getSlopeAngle?.(aiTank.x + 12) || 0) * 180 / Math.PI);
                dir = (sl < sr) ? -1 : +1;
            }
            // Distance bias: far -> move toward, too close -> move away
            if (dir === 0) {
                const toward = (target.x > aiTank.x) ? +1 : -1;
                if (distance > 620) dir = toward; else if (distance < 180) dir = -toward; else dir = (Math.random() < 0.5 ? toward : -toward);
            }
            // Steps: small reposition; scale by skill and fuel
            const fuelSteps = Math.max(0, Math.min(40, Math.floor((aiTank.fuel || 0) / 2))); // rough cap by fuel
            let steps = 6 + Math.floor(Math.random() * 8);
            if (distance > 620) steps += 5;
            if (skill === 'easy') steps = Math.floor(steps * 0.8);
            if (skill === 'hard' || skill === 'expert' || skill === 'insane') steps = Math.floor(steps * 1.25);
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
    executeAIMove(aiTank, plan, onDone) {
        try {
            let remaining = plan.steps;
            const dir = plan.dir;
            const delay = plan.delay;
            const canyonBounds = this.terrain?.getMovementBounds?.();
            const step = () => {
                if (this.gameOver || remaining <= 0 || aiTank.health <= 0) {
                    try { onDone?.(); } catch {}
                    return;
                }
                // Respect canyon movement bounds if present
                if (canyonBounds && this.themeName === 'canyon') {
                    const [minX, maxX] = canyonBounds;
                    if ((dir < 0 && aiTank.x <= minX + 2) || (dir > 0 && aiTank.x >= maxX - 2)) {
                        remaining = 0;
                        try { onDone?.(); } catch {}
                        return;
                    }
                }
                const moved = aiTank.move(dir, this.terrain);
                if (moved) {
                    // Occasional dust for flavor on dusty themes
                    if (this.themeName === 'desert' || this.themeName === 'moon' || this.themeName === 'mars' || this.themeName === 'canyon') {
                        try { this.spawnDustForTheme(this.themeName, aiTank.x - dir * 6, aiTank.y - 2, 6); } catch {}
                    }
                    this.updateUI();
                    remaining -= 1;
                    // Continue moving if steps remain
                    if (remaining > 0) {
                        setTimeout(step, delay);
                    } else {
                        // Movement complete, proceed with shot
                        try { onDone?.(); } catch {}
                    }
                } else {
                    // Could not move (fuel or bounds); stop early and proceed
                    try { onDone?.(); } catch {}
                }
            };
            setTimeout(step, delay);
        } catch (e) {
            // console.warn('executeAIMove failed', e);
            try { onDone?.(); } catch {}
        }
    }
    
    calculateAIShot(distance, dx, dy, target) {
        const aiTank = this.tanks[this.currentTankIndex];

        // Get AI difficulty settings with proper fallbacks
        const defaultConfigs = {
            easy: { aimError: 15, powerError: 25 },
            medium: { aimError: 8, powerError: 15 },
            hard: { aimError: 3, powerError: 8 }
        };

        const aiSkill = aiTank.aiSkill || 'medium';
        const skillConfig = this.config?.ai?.[aiSkill] || defaultConfigs[aiSkill] || defaultConfigs.medium;

        let angle, power, weapon;
        
        // Determine if target is to the left or right
        const shootLeft = dx < 0;
        const targetDx = Math.abs(dx); // Distance to target (always positive)
        const targetDy = dy;
        
        // console.log(`AI calculating shot: dx=${dx.toFixed(1)}, shootLeft=${shootLeft}, targetDx=${targetDx.toFixed(1)}, distance=${distance.toFixed(1)}`);
        
        // Select weapon using distance + clustering heuristics
    weapon = this.chooseAIWeapon(aiTank, target, distance);
        
        // Calculate trajectory to hit target
    const g = this.gravityOverride ?? this.gravity;
        
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
                const v = baseVelocity * this.velocityMultiplier;
                
                // For angles 90-180, cos is negative (shoots left)
                // For angles 0-90, cos is positive (shoots right)
                const vx0 = Math.cos(angleRad) * v;
                const vy0 = -Math.sin(angleRad) * v;
                
                // Account for wind
                const currentWind = this.windOverride ?? this.wind;
                const windAccel = currentWind * this.windEffect;
                
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
                        const maxDx = this.width; // clamp by canvas width as rough bound
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
        const explosiveSet = new Set(['heavy','nuke','cluster','bunker','mirv','funky']);
        let safeMinAngle = 10;
        if (explosiveSet.has(weapon)) {
            if (distance < 220) safeMinAngle = 60; else if (distance < 340) safeMinAngle = 52; else safeMinAngle = 45;
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
            const windCompensation = this.wind * 3;
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
            const g = this.gravityOverride ?? this.gravity;
            const angleRad = (angle * Math.PI) / 180;
            const v0 = ((power / 100) * 20 + 10) * this.velocityMultiplier;
            let vx = Math.cos(angleRad) * v0;
            let vy = -Math.sin(angleRad) * v0;
            let x = 0, y = 0; // relative to muzzle
            const windAccel = (this.windOverride ?? this.wind) * this.windEffect;
            let bad = false;
            for (let t = 0; t < 18; t++) { vx += windAccel; vy += g; x += vx; y += vy; if (y >= 0 && Math.abs(x) < 28) { bad = true; break; } }
            if (bad) angle = Math.min(shootLeft ? 170 : 90, angle + 10);
        } catch {}
        
        // In realtime, nudge away from clearly off-map solutions
        try {
            const angR = (angle * Math.PI) / 180;
            let vx = Math.cos(angR) * (((power / 100) * 20 + 10) * this.velocityMultiplier);
            let vy = -Math.sin(angR) * (((power / 100) * 20 + 10) * this.velocityMultiplier);
            let x = 0, y = 0;
            const windA = (this.windOverride ?? this.wind) * this.windEffect;
            let fallX = 0;
            for (let t = 0; t < 220; t++) { vx += windA; vy += (this.gravityOverride ?? this.gravity); x += vx; y += vy; if (y >= targetDy) { fallX = x; break; } }
            const worldX = aiTank.x + fallX;
            if (worldX < -80 || worldX > this.width + 80) {
                // Pull back within bounds by reducing power a bit and biasing angle toward center
                power = Math.max(30, Math.min(100, power * 0.9));
                const towardCenter = (target.x > aiTank.x) ? 45 : 135;
                angle = Math.round((angle * 0.7) + (towardCenter * 0.3));
            }
        } catch {}
        // console.log(`AI final shot: angle=${angle.toFixed(1)}, power=${power.toFixed(1)}, weapon=${weapon}`);
        
        return { angle, power, weapon };
    }
    
    // Heuristic weapon picker for AI, considering distance and enemy clustering
    chooseAIWeapon(aiTank, target, distance) {
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
        for (const t of this.tanks) {
            if (!t || t.health <= 0 || this.isFriendly(aiTank, t)) continue;
            const d = Math.hypot(t.x - target.x, (t.y - 10) - (target.y - 10));
            if (d <= nearRadius) clustered++;
        }

        // Prefer simple weapons on easy; unlock smarter picks on higher difficulty
        const isEasy = skill === 'easy';
        const isHard = skill === 'hard' || skill === 'insane' || skill === 'expert';

        // Check if on ocean map for underwater weapon preferences
        const isOceanMap = this.isOceanMap();

        // Helper to check if AI can use a weapon given ammo/mode
        const canUse = (w) => this.canUseWeapon(w, aiTank);

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
            if (!isEasy && clustered >= 2 && Math.random() < 0.6 && (target._stunnedTurns <= 0 || !target._stunnedTurns) && canUse('emp')) {
                return 'emp';
            }
            const r = Math.random();
            if (r < 0.4 && canUse('missile')) return 'missile';
            if (r < 0.7 && canUse('heavy')) return 'heavy';
            if (canUse('cluster')) return 'cluster';
            const fallbacks = ['missile','heavy','cluster'];
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
            const options = ['missile','heavy','cluster','napalm','acid','emp','bunker','laser','drill','torpedo','homing_torpedo','depth_charge'];
            for (const opt of options) if (canUse(opt)) return opt;
            return 'missile';
        }
    }
    
    selectMidRangeWeapon() {
        const weaponChoice = Math.random();
        if (weaponChoice < 0.3) return 'heavy';
        if (weaponChoice < 0.5) return 'mirv';
        if (weaponChoice < 0.7) return 'funky';
        return 'missile';
    }
    
    updateUI() {
        // Debounce frequent UI updates into rAF to reduce layout thrash
        if (this._uiScheduled) return; 
        this._uiScheduled = true;
        const cb = () => { this._uiScheduled = false; try { this._updateUIImmediate(); } catch (e) { console.warn('UI update failed', e); } };
        (globalThis.requestAnimationFrame || setTimeout)(cb);
    }

    _updateUIImmediate() {
        const currentTank = this.tanks[this.currentTankIndex];
        const nameEl = document.getElementById('player-name');
        const healthEl = document.getElementById('player-health');
    const fuelEl = document.getElementById('fuel-value');
    const angleInput = document.getElementById('angle-input');
        const powerInput = document.getElementById('power-input');
    const ammoBadge = document.getElementById('ammo-badge');
    const weaponIcon = document.getElementById('weapon-current-icon');
    const weaponName = document.getElementById('weapon-current-name');
    const ammoBadgeModal = document.getElementById('ammo-badge-modal');
        const angleVal = document.getElementById('angle-value');
        const powerVal = document.getElementById('power-value');
        const soloShotsStat = document.getElementById('solo-shots-stat');
        const soloShotsValue = document.getElementById('solo-shots-value');

        // Player name indicator removed from bottom bar; keep this guard for any future placements
        if (nameEl) {
            nameEl.textContent = currentTank.name;
            nameEl.style.color = currentTank.color;
        }
        if (healthEl) healthEl.textContent = `Health: ${currentTank.health}`;
        if (fuelEl) {
            const pct = currentTank.maxFuel > 0 ? Math.round((currentTank.fuel / currentTank.maxFuel) * 100) : 0;
            fuelEl.textContent = String(Math.max(0, Math.min(100, pct)));
        }

        // Drive button state: disabled if not a human player's turn or inputs are blocked
        const notHumanTurn = !currentTank || currentTank.isAI;
        const blocked = this.isInputBlocked();
        const drv = document.getElementById('drive-toggle');
        const drvM = document.getElementById('drive-toggle-modal');
        if (drv) drv.disabled = notHumanTurn || blocked;
        if (drvM) drvM.disabled = notHumanTurn || blocked;

        // Solo shots indicator: show only in Solo mode when active
        if (soloShotsStat && soloShotsValue) {
            if (this.mode === 'solo' && this.soloActive) {
                soloShotsStat.hidden = false;
                const used = this.soloShotsUsed || 0;
                const total = this.soloShotsTotal === null ? '∞' : String(this.soloShotsTotal);
                soloShotsValue.textContent = `${used}/${total}`;
            } else {
                soloShotsStat.hidden = true;
            }
        }

        // Update controls to match tank's sticky settings
    if (angleInput) { angleInput.value = String(((currentTank.angle % 360) + 360) % 360); }
        if (powerInput) { powerInput.value = currentTank.power; }
        // Coerce current weapon if disallowed by ammo mode or terrain
        try {
            this.ensureTankWeaponSelection(currentTank);
        } catch {}
        // Update current weapon label/icon on the graphical toggle
        try {
            const meta = {
                missile: { name: 'Missile', icon: '🛰️' },
                homing: { name: 'Homing', icon: '🎯' },
                heavy: { name: 'Heavy', icon: '💥' },
                nuke: { name: 'Nuke', icon: '☢️' },
                emp: { name: 'EMP', icon: '⚡' },
                laser: { name: 'Laser', icon: '🔦' },
                cluster: { name: 'Cluster', icon: '🌬️' },
                bunker: { name: 'Bunker', icon: '🪓' },
                mirv: { name: 'MIRV', icon: '🌟' },
                funky: { name: 'Funky', icon: '🌀' },
                drill: { name: 'Drill', icon: '🛠️' },
                acid: { name: 'Acid', icon: '🧪' },
                napalm: { name: 'Napalm', icon: '🔥' },
                tracer: { name: 'Tracer', icon: '🧭' },
                smoke_bomb: { name: 'Smoke', icon: '💨' },
                flare: { name: 'Flare', icon: '📍' },
                parachute_flare: { name: 'Para Flare', icon: '🪂' },
                marker_attack: { name: 'Paratroopers', icon: '🟧' },
                marker_medic: { name: 'Medics', icon: '🟩' },
                marker_airstrike: { name: 'Airstrike', icon: '🟥' },
                marker_airnukes: { name: 'Air Nukes', icon: '🟪' },
                bouncing_bomb: { name: 'Bouncer', icon: '🏀' },
                supply_crate: { name: 'Supply', icon: '🎁' },
                shield: { name: 'Shield', icon: '🛡️' },
                land_mine: { name: 'Land Mine', icon: '💣' }
            };
            const m = meta[currentTank.weapon] || { name: currentTank.weapon, icon: '❔' };
            if (weaponIcon) weaponIcon.textContent = m.icon;
            if (weaponName) weaponName.textContent = m.name;
        } catch {}
        // Update ammo badges
        const setAmmoBadge = (el) => {
            if (!el) return;
            let txt = '∞';
            el.classList.remove('low','empty');
            if (!currentTank.unlimitedAmmo) {
                const n = currentTank.getAmmo(currentTank.weapon);
                txt = String(n);
                if (n <= 0) el.classList.add('empty'); else if (n <= 2) el.classList.add('low');
            }
            el.textContent = txt;
        };
        setAmmoBadge(ammoBadge);
        setAmmoBadge(ammoBadgeModal);
    if (angleVal) { angleVal.textContent = (((currentTank.angle % 360) + 360) % 360) + '°'; }
        if (powerVal) { powerVal.textContent = currentTank.power + '%'; }
    }

    // Refill logic extracted for reuse (debug and supply crates)
    refillAmmoForTank(tank) {
        if (!tank || tank.unlimitedAmmo) return;
        const mode = this.ammoMode || 'unlimited';
        if (mode === 'unlimited') { tank.unlimitedAmmo = true; return; }
        if (mode === 'missile-only') { tank.ammo.missile = Math.max(tank.ammo.missile || 0, 999); return; }
        if (mode === 'standard' || mode === 'no-heavy') {
            const standard = {
                missile: 20, homing: 4, heavy: 4, nuke: 1, emp: 2, laser: 3,
                cluster: 3, bunker: 2, mirv: 3, funky: 2, drill: 3, acid: 3,
                    napalm: 3, tracer: 5, smoke_bomb: 3, flare: 3, parachute_flare: 2, marker_attack: 2,
                    marker_medic: 2, marker_airstrike: 1, marker_airnukes: 1, supply_crate: 1, bouncing_bomb: 3, shield: 2,
                    land_mine: 2
            };
            for (const [k, v] of Object.entries(standard)) {
                if (mode === 'no-heavy' && this.heavyWeapons.has(k)) { tank.ammo[k] = 0; continue; }
                tank.ammo[k] = Math.max(tank.ammo[k] || 0, v);
            }
            return;
        }
        if (mode === 'custom') {
            const counts = this.configuredAmmoCounts || {};
            for (const [k, v] of Object.entries(counts)) {
                tank.ammo[k] = Math.max(tank.ammo[k] || 0, Math.trunc(Number(v)) || 0);
            }
            if (!Object.keys(tank.ammo).length) tank.ammo.missile = Math.max(tank.ammo.missile || 0, 20);
        }
    }

    spawnSupplyCrate(x) {
        const spawnX = Math.max(10, Math.min(this.width - 10, Math.floor(x)));
        const y = 10; // from top
        this.supportActors.push({ type: 'supply_crate', x: spawnX, y, vx: 0, vy: 0.1, state: 'descending' });
    }

    // --- Ammo debug helpers ---
    setUnlimitedAmmoForAll(on) {
        const enable = !!on;
        for (const t of this.tanks) {
            t.unlimitedAmmo = enable;
        }
        this.updateUI();
        this.addLog(`Unlimited ammo ${enable ? 'enabled' : 'disabled'} for all tanks.`, 'info');
    }
    refillAmmo(allTanks = false) {
        if (allTanks) {
            for (const t of this.tanks) this.refillAmmoForTank(t);
            this.addLog('Refilled ammo for all tanks.', 'info');
        } else {
            const t = this.tanks[this.currentTankIndex];
            this.refillAmmoForTank(t);
            this.addLog(`Refilled ammo for ${t.name}.`, 'info');
        }
        this.updateUI();
    }
    
    toggleDriveMode() {
        this.driveMode = !this.driveMode;
        const button = document.getElementById('drive-toggle');
        if (this.driveMode) {
            button.textContent = 'Drive Mode: ON';
            button.classList.add('active');
        } else {
            button.textContent = 'Drive Mode: OFF';
            button.classList.remove('active');
        }
    }
    
    moveTank(direction) {
        if (!this.driveMode || this.isAnimating || this.gameOver || this.turnEnding) return;

        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank.isAI) return;

        // Enforce canyon traversal limits - prevent crossing the canyon
        if (this.themeName === 'canyon' && this.terrain) {
            const leftSafe = this.terrain._canyonLeftSafeZone;
            const rightSafe = this.terrain._canyonRightSafeZone;
            const leftCliff = this.terrain._canyonLeftCliffStart;
            const rightCliff = this.terrain._canyonRightCliffStart;

            if (leftSafe != null && rightSafe != null) {
                // Determine which side of canyon the tank is on
                const isOnLeftSide = currentTank.x < (leftCliff + rightCliff) / 2;

                // Prevent movement into restricted zones
                if (isOnLeftSide) {
                    // Tank on left side - cannot go past left safe zone
                    if (direction > 0 && currentTank.x >= leftSafe) {
                        this.spawnCanyonDust(currentTank.x, currentTank.y - 3, 12);
                        this.addLog('Cannot cross the canyon!', 'warning');
                        return;
                    }
                } else {
                    // Tank on right side - cannot go before right safe zone
                    if (direction < 0 && currentTank.x <= rightSafe) {
                        this.spawnCanyonDust(currentTank.x, currentTank.y - 3, 12);
                        this.addLog('Cannot cross the canyon!', 'warning');
                        return;
                    }
                }

                // Also enforce global bounds
                const bounds = this.terrain?.getMovementBounds?.();
                if (bounds) {
                    const [minX, maxX] = bounds;
                    if ((direction < 0 && currentTank.x <= minX) || (direction > 0 && currentTank.x >= maxX)) {
                        this.spawnCanyonDust(currentTank.x, currentTank.y - 3, 8);
                        return;
                    }
                }
            }
        }

        if (currentTank.move(direction, this.terrain)) {
            this.updateUI();
            try { document.dispatchEvent(new CustomEvent('game:engine-ping')); } catch {}
            if (this.themeName === 'canyon') {
                this._canyonDustTick = (this._canyonDustTick || 0) + 1;
                if (this._canyonDustTick % 2 === 0) {
                    this.spawnCanyonDust(currentTank.x - direction * 6, currentTank.y - 2, 10);
                }
            } else if (this.themeName === 'desert' || this.themeName === 'moon' || this.themeName === 'mars') {
                const themeCfg = this.config?.graphics?.dust?.[this.themeName] || {};
                const dustEnabled = (this.dustOverrideEnabled !== null) ? this.dustOverrideEnabled : !!themeCfg.enabled;
                if (!dustEnabled) return;
                const cadence = Math.max(1, themeCfg.moveEvery ?? (this.themeName === 'moon' ? 3 : 2));
                const baseCount = Math.max(1, themeCfg.count ?? (this.themeName === 'moon' ? 8 : 10));
                const count = Math.max(1, Math.round(baseCount * (this.dustAmountMultiplier || 1)));
                const options = {
                    sizeScale: (themeCfg.sizeScale ?? 1) * (this.dustSizeScale || 1),
                    lifetimeScale: (themeCfg.lifetimeScale ?? 1) * (this.dustLifetimeScale || 1),
                    gravity: themeCfg.gravity,
                    gravityDelta: themeCfg.gravityDelta
                };
                this._canyonDustTick = (this._canyonDustTick || 0) + 1;
                if (this._canyonDustTick % cadence === 0) {
                    this.spawnDustForTheme(this.themeName, currentTank.x - direction * 6, currentTank.y - 2, count, options);
                }
            }
        }
    }

    moveTankVertical(direction) {
        if (!this.driveMode || this.isAnimating || this.gameOver || this.turnEnding) return;

        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank.isAI) return;

        // Only submarines can move vertically
        if (currentTank.type !== 'submarine' || !currentTank.canMoveVertical) return;

        if (currentTank.moveVertical(direction, this.terrain)) {
            this.updateUI();
            try { document.dispatchEvent(new CustomEvent('game:engine-ping')); } catch {}

            // Create bubbles when moving underwater
            if (Math.random() < 0.3) {
                this.particleSystem.createBubbles(currentTank.x, currentTank.y + 5, 2);
            }
        }
    }

    rotateTank(direction) {
        if (this.isAnimating || this.gameOver || this.turnEnding) return;

        const currentTank = this.tanks[this.currentTankIndex];
        if (currentTank.isAI) return;

        // Only submarines can rotate
        if (currentTank.type !== 'submarine' || typeof currentTank.rotate !== 'function') return;

        if (currentTank.rotate(direction)) {
            this.updateUI();
            try { document.dispatchEvent(new CustomEvent('game:engine-ping')); } catch {}
        }
    }

    // Randomized, well-separated spawn generator
    generateSpawnPositions(count) {
        const n = Math.max(1, Math.min(8, Number(count || 2)));
        const width = this.width;
        const margin = Math.max(40, Math.floor(width * 0.06));
        // Increased minimum separation to prevent overlapping spawns (was 80, now 150)
        const minSep = Math.max(150, Math.floor(width / (n + 2))); // ensure broad separation
        const xs = [];
        const attemptsMax = 800;

        // Canyon: prefer outside plateaus (left of valley left, right of valley right)
        const isCanyon = this.themeName === 'canyon' && typeof this.terrain?._canyonValleyLeft === 'number' && typeof this.terrain?._canyonValleyRight === 'number';

        let leftMax, rightMin;
        if (isCanyon) {
            // Validate canyon valley bounds
            const valleyLeft = this.terrain._canyonValleyLeft;
            const valleyRight = this.terrain._canyonValleyRight;

            if (valleyLeft >= valleyRight) {
                console.error('[spawn] Invalid canyon valley bounds:', { valleyLeft, valleyRight });
                // Fallback to non-canyon logic
                leftMax = width * 0.45;
                rightMin = width * 0.55;
            } else {
                // Create buffer zone of 8px from valley edges
                leftMax = Math.max(margin, Math.min(valleyLeft - 8, width - margin));
                rightMin = Math.min(width - margin, Math.max(valleyRight + 8, margin));

                // Ensure plateaus are wide enough for spawning
                if (leftMax - margin < 20) {
                    // console.warn('[spawn] Left plateau too narrow, adjusting bounds');
                    leftMax = Math.max(margin + 20, leftMax);
                }
                if ((width - margin) - rightMin < 20) {
                    // console.warn('[spawn] Right plateau too narrow, adjusting bounds');
                    rightMin = Math.min(width - margin - 20, rightMin);
                }
            }
        } else {
            leftMax = width * 0.45;
            rightMin = width * 0.55;
        }

        let tries = 0;
        while (xs.length < n && tries < attemptsMax) {
            tries++;
            // Alternate sides when canyon to spread across plateaus; otherwise full width
            const pickLeft = isCanyon ? (xs.length % 2 === 0) : (Math.random() < 0.5);
            const rx = isCanyon
                ? (pickLeft ? (margin + Math.random() * Math.max(1, leftMax - margin))
                            : (rightMin + Math.random() * Math.max(1, (width - margin) - rightMin)))
                : (margin + Math.random() * (width - margin * 2));

            // Enforce separation from existing picks
            if (xs.some(x => Math.abs(x - rx) < minSep)) continue;
            // Avoid very steep slopes
            const slope = Math.abs(this.terrain.getSlopeAngle(rx));
            if (slope > 0.7) continue; // about 40 degrees
            xs.push(Math.max(margin, Math.min(width - margin, Math.floor(rx))));
        }
        // Fallback to even spacing if we couldn't find enough
        if (xs.length < n) {
            const fallback = [];
            if (isCanyon) {
                // Canyon fallback: distribute evenly across plateaus only
                const leftPlateauWidth = leftMax - margin;
                const rightPlateauWidth = (width - margin) - rightMin;
                const half = Math.ceil(n / 2);

                // Spawn half on left plateau
                if (leftPlateauWidth > 20) {
                    const leftSpacing = leftPlateauWidth / (half + 1);
                    for (let i = 0; i < half && fallback.length < n; i++) {
                        fallback.push(Math.floor(margin + leftSpacing * (i + 1)));
                    }
                }

                // Spawn remaining on right plateau
                if (rightPlateauWidth > 20) {
                    const remaining = n - fallback.length;
                    const rightSpacing = rightPlateauWidth / (remaining + 1);
                    for (let i = 0; i < remaining; i++) {
                        fallback.push(Math.floor(rightMin + rightSpacing * (i + 1)));
                    }
                }

                // If still not enough spots, just put them on the plateaus edges
                while (fallback.length < n) {
                    if (fallback.length % 2 === 0) {
                        fallback.push(Math.floor(margin + leftPlateauWidth / 2));
                    } else {
                        fallback.push(Math.floor(rightMin + rightPlateauWidth / 2));
                    }
                }
            } else {
                // Non-canyon: even spacing across full width
                const spacing = (width - margin * 2) / (n + 1);
                for (let i = 0; i < n; i++) {
                    fallback.push(Math.floor(margin + spacing * (i + 1)));
                }
            }
            return fallback;
        }
        // Sort for left-to-right ordering
        xs.sort((a, b) => a - b);
        return xs;
    }
    
    updateWindDisplay() {
        const displayWind = this.windOverride ?? this.wind;
        const windValue = document.getElementById('wind-value');
        const windArrow = document.getElementById('wind-arrow');
        if (!windValue) return;

        // Protect against NaN values
        const safeWind = (typeof displayWind === 'number' && Number.isFinite(displayWind)) ? displayWind : 0;

        // Update numeric mph text
        windValue.textContent = `${Math.abs(safeWind).toFixed(1)} mph`;

        // Update arrow direction and color emphasis (more visible on all backgrounds)
        if (windArrow) {
            const absWind = Math.abs(safeWind);
            let arrowChar = '';

            // Use double arrows for strong wind, single for moderate, bullet for calm
            if (safeWind < -3) arrowChar = '⇐'; // Strong left
            else if (safeWind < -0.5) arrowChar = '←'; // Moderate left
            else if (safeWind > 3) arrowChar = '⇒'; // Strong right
            else if (safeWind > 0.5) arrowChar = '→'; // Moderate right
            else arrowChar = '●'; // Calm (larger bullet)

            windArrow.textContent = arrowChar;

            // Enhanced visibility with stronger colors and better contrast
            if (safeWind < 0) {
                windArrow.style.color = '#00ffff'; // Cyan for left
                windArrow.style.textShadow = '0 0 8px #00ffff, 0 0 16px rgba(0,255,255,0.8), 0 2px 4px rgba(0,0,0,0.8)';
            } else if (safeWind > 0) {
                windArrow.style.color = '#ff00ff'; // Magenta for right
                windArrow.style.textShadow = '0 0 8px #ff00ff, 0 0 16px rgba(255,0,255,0.8), 0 2px 4px rgba(0,0,0,0.8)';
            } else {
                windArrow.style.color = '#ffd700'; // Gold for calm
                windArrow.style.textShadow = '0 0 6px #ffd700, 0 0 12px rgba(255,215,0,0.6), 0 2px 4px rgba(0,0,0,0.8)';
            }
        }

        // Also tint the mph value lightly with improved contrast
        if (safeWind < 0) windValue.style.color = '#a8ffff';
        else if (safeWind > 0) windValue.style.color = '#ff99ff';
        else windValue.style.color = '#ffffaa';

        // Notify AV layer (wind change)
        try {
            const ev = new CustomEvent('game:wind-change', { detail: { value: displayWind } });
            document.dispatchEvent(ev);
        } catch {}
    }
    
    disableControls() {
        // In realtime mode, never disable player controls globally; keep interactive
        if (this.mode === 'realtime') return;
        const fb = document.getElementById('fire-button'); if (fb) fb.disabled = true;
        const mobileFire = document.getElementById('mobile-fire'); if (mobileFire) mobileFire.disabled = true;
        const ai = document.getElementById('angle-input'); if (ai) ai.disabled = true;
        const pi = document.getElementById('power-input'); if (pi) pi.disabled = true;
        // Disable weapon picker toggle (graphical menu)
        const wgt = document.getElementById('weapon-grid-toggle'); if (wgt) wgt.disabled = true;
        const drv = document.getElementById('drive-toggle'); if (drv) drv.disabled = true;
        const drvM = document.getElementById('drive-toggle-modal'); if (drvM) drvM.disabled = true;
    }
    
    enableControls() {
        // Always ensure controls are enabled in realtime
        // (no-op here but keeps symmetry and future-proofing)
        const fb = document.getElementById('fire-button'); if (fb) fb.disabled = false;
        const mobileFire = document.getElementById('mobile-fire'); if (mobileFire) mobileFire.disabled = false;
        const ai = document.getElementById('angle-input'); if (ai) ai.disabled = false;
        const pi = document.getElementById('power-input'); if (pi) pi.disabled = false;
        // Enable weapon picker toggle (graphical menu)
        const wgt = document.getElementById('weapon-grid-toggle'); if (wgt) wgt.disabled = false;
        const drv = document.getElementById('drive-toggle'); if (drv) drv.disabled = false;
        const drvM = document.getElementById('drive-toggle-modal'); if (drvM) drvM.disabled = false;
    }

    // --- Pause controls ---
    // Pause is reason-tracked: each caller (blur, visibility, modals, user) adds or removes a
    // reason tag; `paused` is true iff any reason is active. This prevents overlapping pause
    // sources (e.g. window blur during an open modal) from racing each other.
    setPaused(on, reason = 'user') {
        if (!this._pauseReasons) this._pauseReasons = new Set();
        const wasPaused = this.paused;
        if (on) this._pauseReasons.add(reason);
        else this._pauseReasons.delete(reason);
        this.paused = this._pauseReasons.size > 0;

        if (this.paused && !wasPaused) {
            if (this.mode !== 'realtime') this.disableControls();
        } else if (!this.paused && wasPaused && !this.gameOver && !this.holdingForSupport) {
            if (this.mode !== 'realtime') {
                const ct = this.tanks[this.currentTankIndex];
                if (ct && ct.isAI) this.disableControls(); else this.enableControls();
            } else {
                this.enableControls();
            }
            this._resumeAITurnIfStuck();
        }
    }
    pause(reason = 'user') { this.setPaused(true, reason); }
    resume(reason = 'user') { this.setPaused(false, reason); }
    togglePause(reason = 'user') { this.setPaused(!this.paused, reason); }
    clearAllPauseReasons() {
        if (!this._pauseReasons) this._pauseReasons = new Set();
        if (this._pauseReasons.size === 0 && !this.paused) return;
        this._pauseReasons.clear();
        this.paused = false;
        if (!this.gameOver && !this.holdingForSupport) {
            if (this.mode !== 'realtime') {
                const ct = this.tanks[this.currentTankIndex];
                if (ct && ct.isAI) this.disableControls(); else this.enableControls();
            } else {
                this.enableControls();
            }
            this._resumeAITurnIfStuck();
        }
    }

    // If the current tank is AI and its turn was interrupted by a pause (leaving no active
    // timer/animation to call fire), re-kick performAITurn. Otherwise the AI would be stuck.
    _resumeAITurnIfStuck() {
        try {
            if (this.gameOver || this.paused) return;
            const ct = this.tanks?.[this.currentTankIndex];
            if (!ct || !ct.isAI || ct.health <= 0) return;
            if (this.aiTurnInProgress) return;
            if (this.isAnimating || this.turnEnding) return;
            if (this.projectiles && this.projectiles.length > 0) return;
            setTimeout(() => {
                if (this.paused || this.gameOver || this.aiTurnInProgress) return;
                const ct2 = this.tanks?.[this.currentTankIndex];
                if (!ct2 || !ct2.isAI || ct2.health <= 0) return;
                try { this.performAITurn(); }
                catch (e) { console.warn('[resume] performAITurn failed', e); }
            }, 250);
        } catch (e) {
            console.warn('[_resumeAITurnIfStuck] error', e);
        }
    }
    
    addLog(message, type = 'info') {
        const logMessages = document.getElementById('log-messages');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        logMessages.insertBefore(entry, logMessages.firstChild);
        
        while (logMessages.children.length > 20) {
            logMessages.lastChild?.remove();
        }
    }
    
    checkGameOver() {
        const aliveTanks = this.tanks.filter(t => t.health > 0);

        if (aliveTanks.length === 0) {
            // All tanks dead simultaneously - draw/mutual destruction
            this.gameOver = true;
            const token = this.turnToken;
            setTimeout(() => {
                if (token !== this.turnToken) return; // Game state changed
                this.showGameOver(null); // null = draw, no winner
            }, 2000);
        } else if (aliveTanks.length === 1) {
            this.gameOver = true;
            const token = this.turnToken;
            setTimeout(() => {
                if (token !== this.turnToken) return; // Game state changed
                this.showGameOver(aliveTanks[0]);
            }, 2000);
        }
    }
    
    showGameOver(winner) {
        // Calculate stats for victory message
        let victoryMessage, winnerName;

        if (!winner) {
            // Draw case
            victoryMessage = "Mutual Destruction!";
            winnerName = "Draw";
        } else {
            // Calculate game stats for contextual victory message
            const stats = {
                turnCount: this.turnCount || 0,
                isAI: winner.isAI,
                isTeamGame: this.mode === 'teams',
                damageDealt: winner.damageDealt || 0,
                damageTaken: (winner.maxHealth || 100) - winner.health,
                closeMatch: this.tanks.filter(t => t.health > 0).length <= 2
            };

            // Get contextual victory message
            victoryMessage = VictoryMessages.getVictoryMessage(winner.name, stats);
            winnerName = winner.name;
        }

        // Check if auto-restart is enabled
        const autoRestartEnabled = localStorage.getItem('auto-restart-enabled') === 'true';

        if (autoRestartEnabled) {
            // Show countdown modal for auto-restart
            if (typeof globalThis.startAutoRestartCountdown === 'function') {
                try {
                    globalThis.startAutoRestartCountdown();
                    return;
                } catch (e) {
                    console.error('[showGameOver] Auto-restart failed:', e);
                }
            }
        }

        // Create single victory toast with message and New Game button
        this.showVictoryToast(winnerName, victoryMessage, winner);
    }

    showVictoryToast(winnerName, victoryMessage, winner) {
        // Create toast container
        const toast = document.createElement('div');
        toast.className = 'victory-toast';
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            text-align: center;
            background: linear-gradient(135deg, rgba(0,50,0,0.95), rgba(0,0,0,0.9));
            border: 3px solid #00ff00;
            border-radius: 15px;
            padding: 30px 40px;
            box-shadow: 0 0 40px rgba(0,255,0,0.3);
            animation: victoryToastAppear 0.5s ease-out;
            min-width: 400px;
        `;

        // Winner text
        const winnerText = document.createElement('h1');
        winnerText.textContent = winnerName === "Draw" ? "Draw!" : `${winnerName} Wins!`;
        winnerText.style.cssText = `
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 42px;
            font-weight: bold;
            color: #00ff00;
            text-shadow:
                2px 2px 4px rgba(0,0,0,0.8),
                0 0 20px rgba(0,255,0,0.5);
            margin: 0 0 15px 0;
        `;

        // Victory message text
        const messageText = document.createElement('p');
        messageText.textContent = victoryMessage;
        messageText.style.cssText = `
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 24px;
            color: #aaffaa;
            margin: 0 0 25px 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        `;

        // Stats text (if winner exists)
        let statsText;
        if (winner) {
            statsText = document.createElement('p');
            statsText.textContent = `Turns: ${this.turnCount || 0} | Health Remaining: ${winner.health}%`;
            statsText.style.cssText = `
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 16px;
                color: #888;
                margin: 0 0 25px 0;
            `;
        }

        // New Game button
        const newGameButton = document.createElement('button');
        newGameButton.textContent = 'New Game';
        newGameButton.style.cssText = `
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 18px;
            font-weight: bold;
            color: #000;
            background: linear-gradient(135deg, #00ff00, #00cc00);
            border: none;
            border-radius: 8px;
            padding: 12px 30px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: all 0.2s;
        `;

        // Button hover effect
        newGameButton.addEventListener('mouseenter', () => {
            newGameButton.style.background = 'linear-gradient(135deg, #00ff33, #00dd00)';
            newGameButton.style.transform = 'scale(1.05)';
        });
        newGameButton.addEventListener('mouseleave', () => {
            newGameButton.style.background = 'linear-gradient(135deg, #00ff00, #00cc00)';
            newGameButton.style.transform = 'scale(1)';
        });

        // Button click handler
        newGameButton.addEventListener('click', () => {
            toast.remove();
            if (typeof globalThis.openNewGameModal === 'function') {
                globalThis.openNewGameModal();
            }
        });

        // Build toast
        toast.appendChild(winnerText);
        toast.appendChild(messageText);
        if (statsText) toast.appendChild(statsText);
        toast.appendChild(newGameButton);

        // Add CSS animation if not already present
        if (!document.querySelector('#victory-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'victory-toast-styles';
            style.textContent = `
                @keyframes victoryToastAppear {
                    0% {
                        transform: translate(-50%, -50%) scale(0.5);
                        opacity: 0;
                    }
                    60% {
                        transform: translate(-50%, -50%) scale(1.05);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Add to page
        document.body.appendChild(toast);

        // Allow closing with ESC key — opens setup modal after dismissal
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                toast.remove();
                document.removeEventListener('keydown', handleEscape);
                if (typeof globalThis.openNewGameModal === 'function') {
                    globalThis.openNewGameModal();
                }
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    reset() {
        // If we have a saved game config, use it to restart properly
        if (this.lastGameConfig) {
            try {
                console.info('[game] reset() using saved config');
                this.startNewGameWithConfig(this.lastGameConfig);
                return;
            } catch (e) {
                console.error('[game] reset() failed to use saved config, falling back to basic reset', e);
            }
        }

        // Fallback: basic reset without proper config (legacy behavior)
        // console.warn('[game] reset() called without saved config, using fallback');
        this.projectiles = [];
        this.explosions = [];
        this.wrecks = [];
        this.supportActors = [];
        this.activeLights = [];
        this.hazards = [];
        this.mines = [];
        this.smokeScreens = [];
        this.skyObjects = [];
        this.skyLastSpawnAt = 0;
        this.lastUfoAt = 0;
        this._canyonDustTick = 0;
        this._ambientDustTick = 0;

        try {
            this.particleSystem = new ParticleSystem();
            this.debrisSystem?.clear();
        } catch (error) {
            console.error('[reset] Failed to reset particle/debris systems:', error);
        }

        // Cancel any pending end-turn timer and reset token
        if (this.endTurnTimer) {
            try {
                clearTimeout(this.endTurnTimer);
            } catch (error) {
                console.error('[reset] Failed to clear endTurnTimer:', error);
            }
            this.endTurnTimer = null;
        }

        this.turnToken = 0;
        this.holdingForSupport = false;
        this.deferTurnForParatroopers = false;
        this.currentTankIndex = 0;
        this.gameOver = false;
        if (this._pauseReasons) this._pauseReasons.clear();
        this.paused = false;
        this.fireLocked = false;
        this.isAnimating = false;
        this.turnEnding = false;
        this.aiTurnInProgress = false;

        // Ensure bedrock sits above bottom controls before terrain regeneration
        try {
            const bottomBar = document.getElementById('bottom-controls');
            const margin = bottomBar ? (bottomBar.offsetHeight + 24) : 120;
            if (this.terrain && typeof this.terrain.setReservedBottomMargin === 'function') {
                this.terrain.setReservedBottomMargin(margin);
            }
        } catch (error) {
            console.error('[reset] Failed to set reserved bottom margin:', error);
        }

        // Apply/roll theme for this new game and regenerate terrain
        try {
            this.applyThemeFromOverrides(true);
            if (this.terrain && typeof this.terrain.generate === 'function') {
                this.terrain.generate(this.terrainProfile || 'auto');
            }
        } catch (error) {
            console.error('[reset] Failed to regenerate terrain:', error);
        }

        try {
            this.spawnTanks(2);
        } catch (error) {
            console.error('[reset] Failed to spawn tanks:', error);
        }
        // After respawn, initialize ammo inventories based on current ammo mode
        try {
            const cfg = (this.ammoMode === 'custom') ? { ammoCounts: this.configuredAmmoCounts || {} } : null;
            for (const t of this.tanks) {
                this.initializeAmmoForTank(t, cfg);
            }
        } catch {}
        // Snap tanks to the surface and within canvas bounds
        this.ensureTanksOnSurface();

        this.wind = (Math.random() - 0.5) * 20;
        this.updateWindDisplay();

        this.angle = 45;
        this.power = 50;
        this.driveMode = false;
        this.stars = null; // force starfield to regenerate under new sky

    document.getElementById('angle-input').value = String(180 - 45);
        document.getElementById('power-input').value = 50;
        document.getElementById('angle-value').textContent = '45°';
        document.getElementById('power-value').textContent = '50%';

        const driveButton = document.getElementById('drive-toggle');
        if (driveButton) {
            driveButton.textContent = 'Drive Mode: OFF';
            driveButton.classList.remove('active');
        }

        // Set control state according to whose turn it is post-reset
        try {
            const currentTank = this.tanks[this.currentTankIndex];
            if (currentTank && currentTank.isAI) {
                // Disable controls and let AI take the first turn shortly
                this.disableControls();
                const token = this.turnToken;
                setTimeout(() => {
                    if (token !== this.turnToken) return; // Game state changed
                    try { this.performAITurn(); } catch (e) { console.warn('performAITurn failed after reset', e); }
                }, 700);
            } else {
                this.enableControls();
            }
        } catch {}

        this.updateUI();
        this.addLog('Game restarted!', 'info');
    }

    // Update hazards aging and apply DoT to overlapping tanks
    updateHazards(dtMs) {
        if (!this.hazards || this.hazards.length === 0) return;
        const dt = Math.max(1, dtMs || 16);
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.ageMs = (h.ageMs || 0) + dt;
            h._tickAcc = (h._tickAcc || 0) + dt;
            const tickEvery = Math.max(60, h.ticksEveryMs || 400);
            // Initialize flow nodes on first update (seed droplets around impact)
            if ((h.type === 'napalm' || h.type === 'acid') && h.mode === 'flow' && (!h.nodes || h.nodes.length === 0) && !h.noAutoSeed) {
                const seeds = 8;
                h.nodes = [];
                const baseR = h.seedRadius || 40;
                for (let si = 0; si < seeds; si++) {
                    const ang = (Math.PI * 2 * si) / seeds;
                    const rx = h.x + Math.cos(ang) * (Math.random() * baseR);
                    const gx = Math.max(0, Math.min(Math.floor(rx), this.width - 1));
                    const gy = this.terrain ? (this.terrain.getHeight(gx) - 2) : h.y;
                    const r0 = (h.type === 'acid') ? (18 + Math.random() * 9) : (20 + Math.random() * 10);
                    const m0 = massFromRadius(r0);
                    h.nodes.push({ x: rx, y: gy, vx: 0, vy: 0, r: r0, m: m0 });
                }
            }
            // Flow update for liquid hazards: slide nodes downhill; acids are a bit more viscous than napalm
            if ((h.type === 'napalm' || h.type === 'acid') && h.mode === 'flow' && h.nodes && h.nodes.length) {
                const isAcid = h.type === 'acid';
                const gravitySlide = (isAcid ? 0.018 : 0.035) * (dt / 16); // napalm flows faster downhill
                const maxSpeed = isAcid ? 1.2 : 2.5; // napalm can flow faster
                for (const n of h.nodes) {
                    const x = Math.max(0, Math.min(this.width - 2, Math.floor(n.x)));
                    // Sample terrain heights around node to infer slope
                    const hL = this.terrain.getHeight(Math.max(0, x - 1));
                    const hC = this.terrain.getHeight(x);
                    const hR = this.terrain.getHeight(Math.min(this.width - 1, x + 1));
                    // Determine downhill direction (toward lower height)
                    const slopeX = (hR - hL) * 0.5; // positive = uphill to right
                    const ground = hC;

                    // Two states: ground-hugging vs. falling off a drop
                    if (n.falling) {
                        // Falling: stronger downward accel, slight wind drift
                        const wind = this.windOverride ?? this.wind;
                        n.vx += (wind * this.windEffect) * 0.02; // tiny drift in air
                        n.vy += 0.08 * (dt / 16);
                    } else {
                        // Flow downhill like liquid - stronger gravity influence
                        const desiredVx = (-slopeX) * gravitySlide;
                        const movingRight = (n.vx + desiredVx) > 0;
                        const sampleAheadX = Math.max(0, Math.min(this.width - 1, x + (movingRight ? 1 : -1)));
                        const hAheadSimple = this.terrain.getHeight(sampleAheadX);
                        const downhill = hAheadSimple < ground;
                        if (downhill) {
                            // Accelerate downhill
                            n.vx += desiredVx * 1.5;
                        } else {
                            // Stop uphill movement - liquid doesn't flow uphill
                            n.vx *= 0.5;
                        }
                        // Dribble downwards a bit to hug ground
                        if (n.y < ground - 1) {
                            n.vy += (isAcid ? 0.015 : 0.02) * (dt / 16);
                        } else {
                            // Keep near ground
                            n.vy *= 0.7;
                            n.y = ground - 1;
                        }
                        // If at an edge with a notable drop ahead, transition to falling
                        if (!isNaN(slopeX)) {
                            const dir = Math.sign(n.vx || -slopeX) || 1;
                            const xAhead = Math.max(0, Math.min(this.width - 1, x + dir * 2));
                            const hAhead = this.terrain.getHeight(xAhead);
                            const drop = ground - hAhead;
                            if (n.y >= ground - 1 && drop > 7 && Math.abs(n.vx) > 0.18) {
                                n.falling = true;
                                n.vy = Math.max(n.vy, 0.5);
                                // Step slightly over the lip to start the drop
                                n.x += dir * 0.5;
                                // Create a small dripping droplet on big cliffs
                                if (drop > 14 && n.r > 16 && h.nodes.length < 42) {
                                    const rr = Math.max(6, n.r * 0.32);
                                    h.nodes.push({ x: n.x + dir * 1.2, y: n.y + 1, vx: dir * 0.05, vy: 0.24, r: rr, m: massFromRadius(rr), falling: true });
                                    n.r = Math.min(60, n.r * 0.88);
                                    n.m = massFromRadius(n.r);
                                }
                            }
                        }
                    }
                    // NO random lateral spread - liquid flows in ONE direction (downhill)
                    // Clamp speeds
                    const sp = Math.hypot(n.vx, n.vy);
                    if (sp > maxSpeed) {
                        n.vx = (n.vx / sp) * maxSpeed;
                        n.vy = (n.vy / sp) * maxSpeed;
                    }
                    // Stronger damping to prevent oscillation - liquid flows smoothly
                    n.vx *= 0.92;
                    n.vy *= 0.95;
                    n.x = Math.max(0, Math.min(this.width - 1, n.x + n.vx));
                    n.y = n.y + n.vy;
                    // Ground collision/attachment when falling
                    if (n.falling) {
                        const gNow = this.terrain.getHeight(Math.max(0, Math.min(this.width - 1, Math.floor(n.x))));
                        if (n.y >= gNow - 1) {
                            n.y = gNow - 1;
                            n.vy = 0;
                            // Napalm sticks very aggressively - liquid pools don't bounce
                            n.vx *= (isAcid ? 0.6 : 0.3);
                            n.falling = false;
                            // Minimal splash for napalm - just absorbs into the pool
                            // No random splashing - liquid doesn't bounce around
                        }
                    } else {
                        // Non-falling: keep glued above ground
                        n.y = Math.min(this.terrain.getHeight(Math.floor(n.x)) - 1, n.y);
                    }
                    // Very slow radius decay over time (cooling). Acid cools a bit slower.
                    const decay = isAcid ? 0.002 : 0.003;
                    n.r = Math.max(8, n.r - decay * dt);
                    n.m = massFromRadius(n.r);
                }
                // Merge nearby nodes for performance and continuity
                // More aggressive merging for grounded nodes to create better liquid pools
                for (let a = 0; a < h.nodes.length; a++) {
                    for (let b = a + 1; b < h.nodes.length; b++) {
                        const na = h.nodes[a], nb = h.nodes[b];
                        const dx = na.x - nb.x; const dy = na.y - nb.y;
                        const d2 = dx * dx + dy * dy;
                        const rSum = Math.min(60, na.r + nb.r);
                        // More aggressive merging when both nodes are grounded (pooling behavior)
                        const mergeThreshold = (!na.falling && !nb.falling) ? 0.55 : 0.42;
                        if (d2 < (rSum * mergeThreshold) * (rSum * mergeThreshold)) {
                            const merged = mergeDroplets(na, nb);
                            merged.r = Math.min(60, merged.r);
                            h.nodes[a] = merged;
                            h.nodes.splice(b, 1);
                            b--;
                        }
                    }
                }

                // Surface wetting: spread out grounded napalm on flat terrain
                if (h.type === 'napalm') {
                    for (const n of h.nodes) {
                        if (!n.falling && Math.abs(n.vx) < 0.1) {
                            const x = Math.floor(n.x);
                            // Sample terrain around to check flatness
                            const hL = this.terrain.getHeight(Math.max(0, x - 3));
                            const hC = this.terrain.getHeight(x);
                            const hR = this.terrain.getHeight(Math.min(this.width - 1, x + 3));
                            const flatness = Math.abs(hL - hC) + Math.abs(hR - hC);
                            // On flat surfaces, slowly spread outward to wet the surface
                            if (flatness < 2 && n.r < 28) {
                                n.r += 0.08 * (dt / 16); // Grow radius to spread
                                n.m = massFromRadius(n.r);
                            }
                        }
                    }
                }
            }
            // Update pulse animation for radiation zones
            if (h.type === 'radiation') {
                h._pulsePhase = (h._pulsePhase || 0) + (dt * 0.003);
                if (h._pulsePhase >= Math.PI * 2) h._pulsePhase -= Math.PI * 2;
            }

            // Update toxic gas cloud: slowly sinks to ground and drifts with wind
            if (h.type === 'toxic_gas' && h.mode === 'gas_cloud') {
                const sinkSpeed = (h.sinkRate || 0.3) * (dt / 16);
                h.y += sinkSpeed;

                // Stop sinking when close to ground
                const gx = Math.max(0, Math.min(Math.floor(h.x), this.width - 1));
                const groundY = this.terrain ? this.terrain.getHeight(gx) : this.height;
                if (h.y >= groundY - h.radius * 0.5) {
                    h.y = groundY - h.radius * 0.5;
                    h.sinkRate = 0; // Stop sinking once settled
                }

                // Wind drift effect
                if (h.windDrift) {
                    const wind = this.windOverride ?? this.wind;
                    h.x += (wind * this.windEffect) * 0.15 * (dt / 16);
                    h.x = Math.max(h.radius, Math.min(this.width - h.radius, h.x));
                }

                // Slowly expand and dissipate
                h.radius = (h.radius || 60) + 0.01 * (dt / 16);
            }

            while (h._tickAcc >= tickEvery) {
                h._tickAcc -= tickEvery;
                for (const t of this.tanks) {
                    if (t.health <= 0) continue;
                    // Owner grace period for newly created napalm hazards to avoid immediate self damage
                    if (h.type === 'napalm' && h._ownerId != null) {
                        const ownerMatch = (t.id != null && String(t.id) === String(h._ownerId)) || (t.name && String(t.name) === String(h._ownerId));
                        if (ownerMatch && (h.ageMs || 0) < 800) {
                            continue;
                        }
                    }
                    let inside = false;
                    if ((h.type === 'napalm' || h.type === 'acid') && h.mode === 'flow' && h.nodes && h.nodes.length) {
                        // Check against flow nodes
                        for (const n of h.nodes) {
                            const dx = t.x - n.x;
                            const dy = (t.y - 10) - n.y;
                            if ((dx * dx + dy * dy) <= (n.r * n.r)) { inside = true; break; }
                        }
                    } else {
                        const dx = t.x - h.x;
                        const dy = (t.y - 10) - h.y;
                        inside = Math.hypot(dx, dy) <= (h.radius || 48);
                    }
                    if (inside) {
                        const perTick = Math.max(1, Math.round((h.dps || 10) * (tickEvery / 1000)));
                        t.takeDamage(perTick);
                        let col = '#ff6b2d';
                        if (h.type === 'acid') col = '#66ff66';
                        else if (h.type === 'radiation') col = '#88ff00';
                        else if (h.type === 'toxic_gas') col = '#88ff44';
                        this.particleSystem.createExplosion(t.x, t.y - 8, 10, col);
                        if (t.health <= 0) {
                            let deathMsg = `${t.name} perished in ${h.type}.`;
                            if (h.type === 'radiation') {
                                deathMsg = `${t.name} succumbed to radiation poisoning.`;
                            } else if (h.type === 'toxic_gas') {
                                deathMsg = `${t.name} was overcome by toxic gas.`;
                            }
                            this.addLog(deathMsg, 'hit');
                            this.addWreck(t.x, t.y, t.color);
                            this.checkGameOver();
                        }
                    }
                }
            }
            if (h.ageMs >= (h.lifeMs || 5000)) {
                this.hazards.splice(i, 1);
            }
        }
    }

    renderHazards(ctx) {
        if (!this.hazards || this.hazards.length === 0) return;
        for (const h of this.hazards) {
            if ((h.type === 'napalm' || h.type === 'acid') && h.mode === 'flow' && h.nodes && h.nodes.length) {
                // Use marching-squares metaballs for crisp liquid shapes
                const nodes = h.nodes.map(n => ({ x: n.x, y: n.y, r: n.r }));
                // Determine bounds (reuse logic from renderNapalmLiquid)
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxR = 0;
                for (const n of nodes) {
                    const r = n.r;
                    minX = Math.min(minX, n.x - r);
                    maxX = Math.max(maxX, n.x + r);
                    minY = Math.min(minY, n.y - r);
                    maxY = Math.max(maxY, n.y + r);
                    maxR = Math.max(maxR, r);
                }
                const pad = Math.max(8, Math.min(40, Math.round(maxR * 0.4)));
                minX = Math.max(0, Math.floor(minX - pad));
                minY = Math.max(0, Math.floor(minY - pad));
                maxX = Math.min(this.width, Math.ceil(maxX + pad));
                maxY = Math.min(this.height, Math.ceil(maxY + pad));
                const bounds = { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
                // Draw core shape: fire (napalm) uses default orange fill; acid uses greenish fill
                if (h.type === 'acid') {
                    renderMetaballs(ctx, nodes, bounds, { cell: 5, threshold: 1.0, fillStyle: 'rgba(90,255,90,0.9)', strokeStyle: 'rgba(20,80,20,0.6)' });
                    // Toxic glow
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.22;
                    for (const n of nodes) {
                        const r = Math.max(4, n.r * 0.55);
                        const g2 = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
                        g2.addColorStop(0, 'rgba(120,255,120,0.9)');
                        g2.addColorStop(1, 'rgba(120,255,120,0)');
                        ctx.fillStyle = g2;
                        ctx.beginPath();
                        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                    // Soft surface sheen (hint of liquid reflectivity)
                    ctx.save();
                    ctx.globalAlpha = 0.15;
                    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                    ctx.lineWidth = 1;
                    for (const n of nodes) {
                        ctx.beginPath();
                        ctx.ellipse(n.x, n.y - n.r * 0.25, n.r * 0.6, n.r * 0.2, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.restore();
                    // Subtle acidic fog above the liquid body
                    ctx.save();
                    ctx.globalAlpha = 0.1;
                    for (const n of nodes) {
                        const fr = Math.max(10, n.r * 0.75);
                        const gy = Math.max(0, n.y - Math.max(8, n.r * 0.3));
                        const fog = ctx.createRadialGradient(n.x, gy, 0, n.x, gy, fr);
                        fog.addColorStop(0, 'rgba(140,255,140,0.35)');
                        fog.addColorStop(1, 'rgba(140,255,140,0)');
                        ctx.fillStyle = fog;
                        ctx.beginPath();
                        ctx.ellipse(n.x, gy, fr, fr * 0.45, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                } else {
                    // Napalm: draw as liquid burning fire pool with orange/red base
                    // Lower threshold (0.5) makes droplets merge more easily for smoother liquid appearance
                    // Smaller cell size (3) gives smoother edges
                    // No strokeStyle - clean smooth edges without lines connecting vertices
                    renderMetaballs(ctx, nodes, bounds, { cell: 3, threshold: 0.5, fillStyle: 'rgba(255,95,35,0.98)' });

                    // Surface sheen handled by animated overlay below
                    // Note: Removed polygon path clipping to eliminate connecting lines between napalm droplets

                    // Add warm fire glow on top - enhanced molten appearance
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.5;
                    for (const n of nodes) {
                        const r = Math.max(10, n.r * 1.0); // larger glow radius for better coverage
                        const g2 = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
                        g2.addColorStop(0, 'rgba(255,240,180,0.95)');   // Brighter hot center
                        g2.addColorStop(0.35, 'rgba(255,160,70,0.8)');  // Molten orange
                        g2.addColorStop(0.65, 'rgba(255,90,35,0.5)');   // Deep orange
                        g2.addColorStop(0.85, 'rgba(255,60,20,0.2)');   // Edge glow
                        g2.addColorStop(1, 'rgba(255,40,0,0)');
                        ctx.fillStyle = g2;
                        ctx.beginPath();
                        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();

                    // Add flickering flames above the napalm pool - enhanced dancing flames
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.4;
                    const time = (performance.now?.() || Date.now()) * 0.001;
                    for (const n of nodes) {
                        const flicker = Math.sin(time * 3 + n.x * 0.1) * 0.3 + 0.7;
                        const flicker2 = Math.sin(time * 4.5 + n.x * 0.15) * 0.2 + 0.8; // Secondary flicker
                        const fr = Math.max(12, n.r * 0.85); // larger flames
                        const fy = Math.max(0, n.y - Math.max(14, n.r * 0.75)); // taller flames
                        const flame = ctx.createRadialGradient(n.x, fy, 0, n.x, fy, fr);
                        flame.addColorStop(0, `rgba(255,230,120,${0.8 * flicker * flicker2})`);  // Bright yellow core
                        flame.addColorStop(0.25, `rgba(255,160,50,${0.65 * flicker})`);           // Orange mid
                        flame.addColorStop(0.55, `rgba(255,90,25,${0.4 * flicker})`);             // Deep orange
                        flame.addColorStop(0.8, `rgba(255,60,15,${0.2 * flicker2})`);             // Red edge
                        flame.addColorStop(1, 'rgba(255,40,0,0)');
                        ctx.fillStyle = flame;
                        ctx.beginPath();
                        ctx.ellipse(n.x, fy, fr * 0.7, fr * 1.5, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            } else if (h.type === 'radiation') {
                // Radiation zone: animated pulsing green glow with hazard symbol
                ctx.save();
                const r = h.radius || 60;
                const lifeFrac = Math.max(0, Math.min(1, 1 - (h.ageMs / (h.lifeMs || 12000))));
                const pulse = Math.sin(h._pulsePhase || 0) * 0.3 + 0.7; // 0.4 to 1.0

                // Multi-layer radioactive glow
                ctx.globalCompositeOperation = 'lighter';

                // Layer 1: Outer soft green glow
                ctx.globalAlpha = 0.15 * lifeFrac * pulse;
                const grad1 = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 1.2);
                grad1.addColorStop(0, 'rgba(136,255,0,0.6)');
                grad1.addColorStop(0.5, 'rgba(136,255,0,0.3)');
                grad1.addColorStop(1, 'rgba(136,255,0,0)');
                ctx.fillStyle = grad1;
                ctx.beginPath();
                ctx.arc(h.x, h.y, r * 1.2, 0, Math.PI * 2);
                ctx.fill();

                // Layer 2: Main radiation zone
                ctx.globalAlpha = 0.25 * lifeFrac * pulse;
                const grad2 = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
                grad2.addColorStop(0, 'rgba(100,255,0,0.8)');
                grad2.addColorStop(0.6, 'rgba(136,255,0,0.5)');
                grad2.addColorStop(1, 'rgba(136,255,0,0)');
                ctx.fillStyle = grad2;
                ctx.beginPath();
                ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
                ctx.fill();

                // Layer 3: Inner hot spot
                ctx.globalAlpha = 0.35 * lifeFrac * pulse;
                const grad3 = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 0.4);
                grad3.addColorStop(0, 'rgba(200,255,100,0.9)');
                grad3.addColorStop(1, 'rgba(100,255,0,0)');
                ctx.fillStyle = grad3;
                ctx.beginPath();
                ctx.arc(h.x, h.y, r * 0.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalCompositeOperation = 'source-over';

                // Draw radiation hazard symbol (trefoil)
                ctx.globalAlpha = 0.6 * lifeFrac * pulse;
                ctx.strokeStyle = '#88ff00';
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.lineWidth = 2;

                const symbolSize = Math.min(20, r * 0.3);
                const centerX = h.x;
                const centerY = h.y;

                // Central circle
                ctx.beginPath();
                ctx.arc(centerX, centerY, symbolSize * 0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Three radiation blades
                for (let i = 0; i < 3; i++) {
                    const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
                    const bladeX = centerX + Math.cos(angle) * symbolSize * 0.7;
                    const bladeY = centerY + Math.sin(angle) * symbolSize * 0.7;

                    ctx.beginPath();
                    ctx.arc(bladeX, bladeY, symbolSize * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Connector line from center to blade
                    ctx.beginPath();
                    ctx.moveTo(centerX + Math.cos(angle) * symbolSize * 0.25,
                              centerY + Math.sin(angle) * symbolSize * 0.25);
                    ctx.lineTo(bladeX, bladeY);
                    ctx.stroke();
                }

                ctx.restore();
            } else if (h.type === 'toxic_gas' && h.mode === 'gas_cloud') {
                // Toxic gas: billowing green cloud that sinks and spreads
                ctx.save();
                const r = h.radius || 60;
                const lifeFrac = Math.max(0, 1 - (h.ageMs || 0) / (h.lifeMs || 15000));
                const time = (performance.now?.() || Date.now()) * 0.001;
                const pulse = 0.85 + Math.sin(time * 1.5) * 0.15; // Slow pulsing

                // Layer 1: Outer diffuse cloud
                ctx.globalAlpha = 0.15 * lifeFrac * pulse;
                const grad1 = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 1.3);
                grad1.addColorStop(0, 'rgba(136,255,68,0.5)');
                grad1.addColorStop(0.5, 'rgba(136,255,68,0.25)');
                grad1.addColorStop(1, 'rgba(136,255,68,0)');
                ctx.fillStyle = grad1;
                ctx.beginPath();
                ctx.arc(h.x, h.y, r * 1.3, 0, Math.PI * 2);
                ctx.fill();

                // Layer 2: Main cloud body with some turbulence
                ctx.globalAlpha = 0.25 * lifeFrac * pulse;
                for (let i = 0; i < 3; i++) {
                    const offsetX = Math.sin(time * 0.8 + i * 2) * (r * 0.2);
                    const offsetY = Math.cos(time * 0.6 + i * 2) * (r * 0.15);
                    const grad2 = ctx.createRadialGradient(
                        h.x + offsetX, h.y + offsetY, 0,
                        h.x + offsetX, h.y + offsetY, r * 0.7
                    );
                    grad2.addColorStop(0, 'rgba(120,255,80,0.7)');
                    grad2.addColorStop(0.6, 'rgba(136,255,68,0.4)');
                    grad2.addColorStop(1, 'rgba(136,255,68,0)');
                    ctx.fillStyle = grad2;
                    ctx.beginPath();
                    ctx.arc(h.x + offsetX, h.y + offsetY, r * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Layer 3: Toxic core
                ctx.globalAlpha = 0.35 * lifeFrac * pulse;
                const grad3 = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 0.4);
                grad3.addColorStop(0, 'rgba(180,255,120,0.8)');
                grad3.addColorStop(1, 'rgba(100,255,60,0)');
                ctx.fillStyle = grad3;
                ctx.beginPath();
                ctx.arc(h.x, h.y, r * 0.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            } else {
                // Acid and legacy hazards: simple radial pool
                ctx.save();
                const r = h.radius || 50;
                const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
                if (h.type === 'acid') {
                    grad.addColorStop(0, 'rgba(70,255,70,0.35)');
                    grad.addColorStop(1, 'rgba(70,255,70,0)');
                } else {
                    grad.addColorStop(0, 'rgba(255,120,60,0.35)');
                    grad.addColorStop(1, 'rgba(255,120,60,0)');
                }
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // Land mines: tick for arming and trigger on enemy proximity; render small indicator
    updateMines(dtMs) {
        if (!this.mines || this.mines.length === 0) return;
        const now = (performance.now?.() || Date.now());
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const m = this.mines[i];
            // Keep mine glued to ground if terrain changed
            const gx = Math.max(0, Math.min(this.width - 1, Math.floor(m.x)));
            m.y = (this.terrain ? this.terrain.getHeight(gx) : m.y);
            // Trigger only when armed
            const armed = now >= (m.armedAt || 0);
            if (!armed) continue;
            // Check tanks
            for (const t of this.tanks) {
                if (!t || t.health <= 0) continue;
                if (this.isFriendly(m.owner, t)) continue;
                const dx = t.x - m.x;
                const dy = (t.y - 8) - m.y;
                if (Math.hypot(dx, dy) <= (m.triggerRadius || this.landMineCfg.triggerRadius)) {
                    // Detonate
                    const r = Math.max(10, m.radius || this.landMineCfg.radius);
                    const d = Math.max(0, m.damage || this.landMineCfg.damage);
                    this.explosions.push(new Explosion(m.x, m.y, r, 0, m.color || this.landMineCfg.color));
                    this.terrain.applyExplosion(m.x, m.y, r);
                    this.particleSystem.createExplosion(m.x, m.y, r, m.color || this.landMineCfg.color);
                    for (const tank of this.tanks) {
                        if (tank.health <= 0) continue;
                        const ddx = tank.x - m.x;
                        const ddy = (tank.y - 10) - m.y;
                        const dist = Math.hypot(ddx, ddy);
                        if (dist < r) {
                            const ratio = 1 - (dist / r);
                            const actual = Math.floor(d * ratio * this.damageMultiplier);
                            if (actual > 0) tank.takeDamage(actual);
                            if (actual > 0) this.addLog(`${tank.name} hit by land mine! Damage: ${actual}`, 'hit');
                            if (tank.health <= 0) { this.addWreck(tank.x, tank.y, tank.color); this.checkGameOver(); }
                        }
                    }
                    // Screen shake light
                    this.addScreenShake(Math.min(r / 4, 8));
                    // Remove mine
                    this.mines.splice(i, 1);
                    break;
                }
            }
        }
    }

    renderMines(ctx) {
        if (!this.mines || this.mines.length === 0) return;
        for (const m of this.mines) {
            ctx.save();
            ctx.translate(m.x, m.y - 1);
            // Small embedded disc; armed mines blink a subtle halo
            ctx.fillStyle = '#2f2f2f';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            // Top marker
            ctx.fillStyle = '#444';
            ctx.fillRect(-2, -1.5, 4, 1);
            // Halo when armed
            const now = (performance.now?.() || Date.now());
            const armed = now >= (m.armedAt || 0);
            if (armed) {
                const pulse = (Math.sin(now / 250) + 1) * 0.5; // 0..1
                ctx.globalAlpha = 0.25 + 0.25 * pulse;
                ctx.fillStyle = (m.color || this.landMineCfg.color) + '55';
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(8, (m.triggerRadius || this.landMineCfg.triggerRadius) + 2), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // Render napalm as a liquid blob using offscreen additive blending + blur for a metaball effect
    renderNapalmLiquid(ctx, h) {
        if (!h.nodes || h.nodes.length === 0) return;
        // Compute tight bounds around nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxR = 0;
        for (const n of h.nodes) {
            const r = n.r;
            minX = Math.min(minX, n.x - r);
            maxX = Math.max(maxX, n.x + r);
            minY = Math.min(minY, n.y - r);
            maxY = Math.max(maxY, n.y + r);
            maxR = Math.max(maxR, r);
        }
        const pad = Math.max(8, Math.min(40, Math.round(maxR * 0.4)));
        minX = Math.max(0, Math.floor(minX - pad));
        minY = Math.max(0, Math.floor(minY - pad));
        maxX = Math.min(this.width, Math.ceil(maxX + pad));
        maxY = Math.min(this.height, Math.ceil(maxY + pad));
        const w = Math.max(1, maxX - minX);
        const hgt = Math.max(1, maxY - minY);
        if (w <= 1 || hgt <= 1) return;
        // Create/reuse offscreens
        const makeCanvas = (c, w, h) => {
            if (!c) { c = document.createElement('canvas'); }
            if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
            return c;
        };
        h._blobCanvas = makeCanvas(h._blobCanvas, w, hgt);
        h._blurCanvas = makeCanvas(h._blurCanvas, w, hgt);
        const bctx = h._blobCanvas.getContext('2d');
        const blr = h._blurCanvas.getContext('2d');
        // Draw additive soft circles for each node
        bctx.clearRect(0, 0, w, hgt);
        bctx.globalCompositeOperation = 'lighter';
        for (const n of h.nodes) {
            const r = n.r;
            const cx = n.x - minX;
            const cy = n.y - minY;
            const g = bctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, 'rgba(255,180,90,0.5)');
            g.addColorStop(1, 'rgba(255,180,90,0)');
            bctx.fillStyle = g;
            // Slight ellipse to imply flow direction
            bctx.beginPath();
            bctx.ellipse(cx, cy, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
            bctx.fill();
        }
        // Blur the additive field to unify blobs
        blr.clearRect(0, 0, w, hgt);
        blr.save();
        blr.filter = 'blur(6px)';
        blr.drawImage(h._blobCanvas, 0, 0);
        blr.restore();
        // Tint with napalm color via source-in
        blr.save();
        blr.globalCompositeOperation = 'source-in';
        blr.fillStyle = '#ff6b2d';
        blr.globalAlpha = 0.9;
        blr.fillRect(0, 0, w, hgt);
        blr.restore();
        // Optional inner hot core highlight
        blr.save();
        blr.globalCompositeOperation = 'lighter';
        blr.globalAlpha = 0.25;
        for (const n of h.nodes) {
            const r = Math.max(4, n.r * 0.5);
            const cx = n.x - minX;
            const cy = n.y - minY;
            const g2 = blr.createRadialGradient(cx, cy, 0, cx, cy, r);
            g2.addColorStop(0, 'rgba(255,230,160,0.8)');
            g2.addColorStop(1, 'rgba(255,230,160,0)');
            blr.fillStyle = g2;
            blr.beginPath();
            blr.arc(cx, cy, r, 0, Math.PI * 2);
            blr.fill();
        }
        blr.restore();
        // Draw to main canvas with subtle flicker
        const flicker = 0.92 + Math.random() * 0.08;
        ctx.save();
        ctx.globalAlpha = flicker;
        ctx.drawImage(h._blurCanvas, minX, minY);
        ctx.restore();
    }
    
    // (old handleResize removed; see new handleResize earlier in class)
    
    getCurrentTankForUI() {
        return this.tanks[this.currentTankIndex];
    }

    // Ensure all tanks are positioned on top of the terrain surface (never below UI bedrock)
    ensureTanksOnSurface() {
        if (!this.terrain || !Array.isArray(this.tanks)) return;
        const w = this.width;
        const minX = 0, maxX = Math.max(0, w - 1);
        const maxY = Math.max(0, Math.min(this.height - 1, Math.floor(this.terrain.bedrockLevel - 2)));
        for (const t of this.tanks) {
            if (!t) continue;
            // Skip submarines and other vehicles that don't need surface snapping
            if (t.type === 'submarine' || t.type === 'base' || t.type === 'ship') {
                // Just clamp X to canvas bounds, leave Y alone
                t.x = Math.max(minX, Math.min(maxX, Math.floor(t.x)));
                continue;
            }
            // Clamp X to canvas and sample height
            const x = Math.max(minX, Math.min(maxX, Math.floor(t.x)));
            const y = this.terrain.getHeight(x);
            t.x = x;
            t.y = Math.min(y, maxY);
            t.update?.(this.terrain);
            // Debug warning if anything ends up too low
            if (t.y >= this.terrain.bedrockLevel - 1) {
                try { console.warn('[ensureTanksOnSurface] Tank at/under bedrock after snap', { x: t.x, y: t.y, bedrock: this.terrain.bedrockLevel }); } catch {}
            }
        }
    }
}
