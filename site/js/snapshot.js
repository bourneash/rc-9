import { Terrain } from './terrain.js';
import { Tank } from './tank.js';
import { SnapshotValidator } from './snapshot-validator.js';

// Serialize current game state into a lightweight snapshot object
export function toSnapshot(game) {
    try {
        const terrain = game.terrain || { width: game.width, height: game.height, heightMap: [] };
        const tanks = Array.isArray(game.tanks) ? game.tanks.filter(t => !!t).map(t => ({
            x: Math.max(0, Math.min(game.width - 1, Math.floor(t.x))),
            name: t.name,
            color: t.color,
            style: t.style || 'classic',
            isAI: !!t.isAI,
            aiSkill: t.aiSkill || 'medium',
            health: Math.max(0, Math.min(t.maxHealth || 100, Math.floor(t.health))),
            maxHealth: t.maxHealth || 100,
            fuel: Math.floor(t.fuel),
            maxFuel: t.maxFuel,
            angle: Math.round(t.angle),
            power: Math.round(t.power),
            weapon: t.weapon || 'missile',
            ammo: t.unlimitedAmmo ? {} : (t.ammo || {}),
            unlimitedAmmo: !!t.unlimitedAmmo,
            shield: (t._shield && (t._shield.turnsLeft || 0) > 0) ? { turnsLeft: t._shield.turnsLeft, factor: t._shield.factor } : null
        })) : [];
        const wrecks = (game.wrecks || []).map(w => ({ x: Math.floor(w.x), y: Math.floor(w.y), color: w.color || '#222' }));
        const smokes = (game.smokeScreens || []).map(s => ({ x: Math.floor(s.x), y: Math.floor(s.y), r: Math.floor(s.radius), turnsLeft: s.turnsLeft || 0 }));
        const mines = (game.mines || []).map(m => ({ x: Math.floor(m.x), y: Math.floor(m.y), ownerName: m.owner?.name || null, armedIn: Math.max(0, (m.armedAt || 0) - (performance.now?.() || Date.now())), radius: m.radius, damage: m.damage, triggerRadius: m.triggerRadius, color: m.color }));
        // Minimal snapshot for in-flight bombers to allow resuming an Air Nukes strike
        const support = (game.supportActors || [])
            .filter(a => a?.type === 'plane' && a?.subtype === 'bomber')
            .map(a => ({
                type: 'plane', subtype: 'bomber',
                x: Math.floor(a.x), y: Math.floor(a.y), vx: a.vx, targetX: a.targetX,
                droppedCount: a.droppedCount || 0, ownerName: a.owner?.name || null,
                bombType: a.bombType || 'nuke', bombCount: a.bombCount || 3, bombSpacing: a.bombSpacing || 46
            }));
        return {
            v: 1,
            ts: Date.now(),
            dims: { w: game.width, h: game.height },
            theme: game.themeName,
            timeOfDay: game.timeOfDay,
            wind: game.wind,
            windMode: game.windMode,
            mode: game.mode,
            teams: Array.isArray(game.teams) ? game.teams.slice(0) : null,
            ammoMode: game.ammoMode,
            aiDifficulty: game.aiDifficulty,
            currentTankIndex: Math.max(0, Math.min((tanks.length || 1) - 1, game.currentTankIndex || 0)),
            solo: {
                active: !!game.soloActive,
                score: game.soloScore || 0,
                targetsHit: game.soloTargetsHit || 0,
                targetGoal: game.soloTargetGoal || 0,
                shotsTotal: game.soloShotsTotal,
                shotsUsed: game.soloShotsUsed || 0
            },
            terrain: {
                w: terrain.width,
                h: terrain.height,
                bedrockLevel: Math.floor(terrain.bedrockLevel || (game.height * 0.95)),
                groundLevel: Math.floor(terrain.groundLevel || (game.height * 0.7)),
                smoothness: terrain.smoothness || 50,
                heightMap: Array.isArray(terrain.heightMap) ? terrain.heightMap.slice(0) : []
            },
            tanks,
            wrecks,
            smokes,
            support,
            mines
        };
    } catch (e) {
        console.warn('[save] toSnapshot failed:', e);
        return null;
    }
}

// Restore a snapshot into the provided game instance
function resetVolatile(game) {
    game.cancelEndTurn();
    game.projectiles = [];
    game.explosions = [];
    game.supportActors = [];
    game.mines = [];
    game.activeLights = [];
    game.hazards = [];
    game.smokeScreens = [];
    game.skyObjects = [];
    game.skyLastSpawnAt = 0;
    game.lastUfoAt = 0;
    game.isAnimating = false;
    game.turnEnding = false;
    game.aiTurnInProgress = false;
    game.gameOver = false;
    game.fireLocked = false;
    if (game._pauseReasons) game._pauseReasons.clear();
    game.paused = false;
    game.holdingForSupport = false;
    game.deferTurnForParatroopers = false;
}

function restoreHighLevelSettings(game, snap) {
    game.mode = snap.mode || 'classic';
    game.teams = Array.isArray(snap.teams) ? snap.teams.slice(0) : null;
    game.ammoMode = snap.ammoMode || 'unlimited';
    game.aiDifficulty = snap.aiDifficulty || 'medium';
    game.windMode = snap.windMode || 'low';
    game.wind = Number.isFinite(snap.wind) ? snap.wind : game.wind;
    game.themeName = snap.theme || game.themeName;
    game.timeOfDay = snap.timeOfDay || game.timeOfDay;
}

function rebuildTerrain(game, snap) {
    game.terrain = new Terrain(game.width, game.height);
    try {
        const bottomBar = document.getElementById('bottom-controls');
        const margin = bottomBar ? (bottomBar.offsetHeight + 24) : 120;
        game.terrain.setReservedBottomMargin(margin);
    } catch {}
    if (Array.isArray(snap.terrain.heightMap) && snap.terrain.heightMap.length > 0) {
        game.terrain.heightMap = snap.terrain.heightMap.slice(0);
        if (snap.terrain.smoothness) game.terrain.smoothness = snap.terrain.smoothness;
        game.terrain.resize(game.width, game.height);
        try {
            const bottomBar2 = document.getElementById('bottom-controls');
            const margin2 = bottomBar2 ? (bottomBar2.offsetHeight + 24) : 120;
            game.terrain.setReservedBottomMargin(margin2);
        } catch {}
    } else {
        game.terrain.generate('auto');
    }
}

function applySky(game) {
    try {
        const lib = game.getThemeLibrary?.();
        const theme = lib?.[game.themeName] || lib?.['forest'];
        if (theme?.palette) game.terrain.setPalette(theme.palette);
        const todNow = game.timeOfDay || 'day';
        const g = game.config?.graphics || {};
        const bg = g.backgrounds || {};
        const defaults = bg.defaults?.[todNow] || { stars: todNow === 'night', clouds: todNow !== 'night', nebula: todNow === 'night', sun: todNow !== 'night', moon: todNow !== 'day', earth: false, planets: todNow === 'night' };
        const overrides = (bg.overrides?.[game.themeName]?.[todNow]) || null;
        const eff = overrides ? { ...defaults, ...overrides } : defaults;
        game.starsEnabled = !!eff.stars;
        game.nebulaEnabled = !!eff.nebula;
        game.cloudsEnabled = !!eff.clouds;
        game.sunEnabled = !!eff.sun;
        game.moonEnabled = !!eff.moon;
        game.earthEnabled = !!eff.earth;
        game.planetsEnabled = !!eff.planets;
        game.skyObjectsEnabled = eff.skyObjects !== false;
        if (game.sunEnabled && game.moonEnabled) {
            if (todNow === 'night') game.sunEnabled = false; else game.moonEnabled = false;
        }
        game.stars = null;
    } catch {}
}

function restoreTanks(game, snap) {
    game.tanks = [];
    for (const t of (snap.tanks || [])) {
        const tank = new Tank(t.x, game.terrain.getHeight(t.x), t.color || '#00ff00', t.name || 'Player', !!t.isAI, t.aiSkill || 'medium');
        tank.style = t.style || 'classic';
        tank.health = Math.max(0, Math.min(t.maxHealth || 100, t.health || 100));
        tank.maxHealth = t.maxHealth || 100;
        tank.fuel = Number.isFinite(t.fuel) ? t.fuel : 200;
        tank.maxFuel = Number.isFinite(t.maxFuel) ? t.maxFuel : 200;
        tank.angle = Number.isFinite(t.angle) ? t.angle : 45;
        tank.power = Number.isFinite(t.power) ? t.power : 50;
        tank.weapon = t.weapon || 'missile';
        tank.unlimitedAmmo = !!t.unlimitedAmmo;
        tank.ammo = t.unlimitedAmmo ? {} : (t.ammo || {});
        if (t.shield && (t.shield.turnsLeft || 0) > 0) {
            tank._shield = { turnsLeft: t.shield.turnsLeft, factor: t.shield.factor ?? 0.5 };
        }
        tank.update(game.terrain);
        game.tanks.push(tank);
    }
}

function clampCurrentIndex(game, snap) {
    let ci = Math.max(0, Math.min(game.tanks.length - 1, snap.currentTankIndex || 0));
    if (game.tanks[ci] && game.tanks[ci].health <= 0) {
        for (let i = 0; i < game.tanks.length; i++) {
            if (game.tanks[i].health > 0) { ci = i; break; }
        }
    }
    game.currentTankIndex = ci;
}

function restoreWrecks(game, snap) {
    game.wrecks = Array.isArray(snap.wrecks)
        ? snap.wrecks.map(w => ({ x: w.x, y: game.terrain.getHeight(Math.max(0, Math.min(game.width - 1, Math.floor(w.x)))), vy: 0, color: w.color || '#222', created: Date.now(), nextSmoke: Date.now() + 200, char: true }))
        : [];
}

function restoreSmokes(game, snap) {
    game.smokeScreens = Array.isArray(snap.smokes) ? snap.smokes.map(s => {
        const gx = Math.max(0, Math.min(game.width - 1, Math.floor(s.x)));
        const gy = game.terrain ? (game.terrain.getHeight(gx) - 4) : (s.y || (game.height - 4));
        const turns = Math.max(0, s.turnsLeft || 0);
        return { x: gx, y: gy, radius: Math.max(20, s.r || 60), turnsLeft: turns, initialTurns: Math.max(1, turns), _emitTick: 0, _graceMs: 600 };
    }) : [];
}

function restoreMines(game, snap) {
    if (!Array.isArray(snap.mines)) return;
    const now = (performance.now?.() || Date.now());
    for (const m of snap.mines) {
        const owner = game.tanks.find(t => t.name === m.ownerName) || null;
        const gx = Math.max(0, Math.min(game.width - 1, Math.floor(m.x)));
        const gy = game.terrain ? game.terrain.getHeight(gx) : (m.y || (game.height - 2));
        const armedAt = now + Math.max(0, m.armedIn || 0);
        game.mines.push({ x: gx, y: gy, owner, armedAt, radius: m.radius ?? game.landMineCfg.radius, damage: m.damage ?? game.landMineCfg.damage, triggerRadius: m.triggerRadius ?? game.landMineCfg.triggerRadius, color: m.color || game.landMineCfg.color });
    }
}

function restoreSupport(game, snap) {
    if (!Array.isArray(snap.support)) return;
    for (const a of snap.support) {
        if (a?.type === 'plane' && a?.subtype === 'bomber') {
            const owner = game.tanks.find(t => t.name === a.ownerName) || null;
            game.supportActors.push({
                type: 'plane', subtype: 'bomber',
                x: a.x, y: a.y, vx: a.vx, targetX: a.targetX,
                droppedCount: a.droppedCount || 0, owner,
                bombType: a.bombType || 'nuke', bombCount: a.bombCount || 3, bombSpacing: a.bombSpacing || 46
            });
            const last = game.supportActors[game.supportActors.length - 1];
            if (last.droppedCount > 0) last._firstDropDone = true;
            game.holdingForSupport = true;
            game.deferTurnForParatroopers = true;
            game.disableControls();
        }
    }
}

function restoreSolo(game, snap) {
    if (game.mode === 'solo' && snap.solo) {
        game.soloActive = !!snap.solo.active;
        game.soloScore = snap.solo.score || 0;
        game.soloTargetsHit = snap.solo.targetsHit || 0;
        game.soloTargetGoal = snap.solo.targetGoal || 0;
        game.soloShotsTotal = (snap.solo.shotsTotal == null) ? null : Number(snap.solo.shotsTotal);
        game.soloShotsUsed = snap.solo.shotsUsed || 0;
        if (game.soloActive) game.spawnSoloTarget?.();
    } else {
        game.soloActive = false;
        game.soloScore = 0;
        game.soloTarget = null;
        game.soloTargetsHit = 0;
        game.soloTargetGoal = 0;
        game.soloShotsTotal = null;
        game.soloShotsUsed = 0;
    }
}

function finalizeLoad(game) {
    game.updateWindDisplay();
    game.ensureTanksOnSurface();
    game.updateUI();
    const currentTank = game.tanks[game.currentTankIndex];
    if (currentTank?.isAI) {
        game.disableControls();
        // Trigger AI turn after a brief delay to allow UI to settle
        setTimeout(() => {
            // Double-check the current tank is still AI (in case game state changed)
            const ct = game.tanks[game.currentTankIndex];
            if (ct?.isAI && !game.aiTurnInProgress && !game.isAnimating) {
                game.performAITurn();
            }
        }, 1500);
    } else {
        game.enableControls();
    }
    game.saveSnapshotToStorage('loadSnapshot');
}

export function loadSnapshotIntoGame(game, snapshot) {
    try {
        const snap = snapshot || JSON.parse(localStorage.getItem('se.lastGame.v1') || 'null');
        if (!snap) return false;

        // Validate snapshot before loading
        const validator = new SnapshotValidator();
        const isValid = validator.validateSnapshot(snap);
        const report = validator.getReport();

        // Log validation results
        if (report.errors.length > 0) {
            console.error('[Snapshot] Validation errors:', report.errors);
        }
        if (report.warnings.length > 0) {
            console.warn('[Snapshot] Validation warnings:', report.warnings);
        }

        // Abort if critical errors
        if (!isValid) {
            console.error('[Snapshot] Cannot load invalid snapshot');
            return false;
        }

        // Proceed with validated snapshot
        resetVolatile(game);
        restoreHighLevelSettings(game, snap);
        rebuildTerrain(game, snap);
        applySky(game);
        restoreTanks(game, snap);
        clampCurrentIndex(game, snap);
        restoreWrecks(game, snap);
        restoreSmokes(game, snap);
        restoreMines(game, snap);
        restoreSupport(game, snap);
        restoreSolo(game, snap);
        finalizeLoad(game);
        return true;
    } catch (e) {
        console.warn('[save] loadSnapshot failed:', e);
        return false;
    }
}
