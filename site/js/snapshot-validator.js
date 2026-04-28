/**
 * Snapshot Data Validator
 * Ensures saved game data is valid and safe to restore
 */

export class SnapshotValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Validate a complete snapshot
     */
    validateSnapshot(snapshot) {
        this.errors = [];
        this.warnings = [];

        // Check if snapshot exists and has required structure
        if (!snapshot) {
            this.errors.push('Snapshot is null or undefined');
            return false;
        }

        if (typeof snapshot !== 'object') {
            this.errors.push('Snapshot is not an object');
            return false;
        }

        // Validate version
        if (!snapshot.v || snapshot.v !== 1) {
            this.errors.push(`Invalid snapshot version: ${snapshot.v}`);
            return false;
        }

        // Validate timestamp
        if (!Number.isFinite(snapshot.ts)) {
            this.warnings.push('Missing or invalid timestamp');
        }

        // Validate dimensions
        if (!this.validateDimensions(snapshot.dims)) {
            return false;
        }

        // Validate game settings
        this.validateGameSettings(snapshot);

        // Validate terrain
        if (!this.validateTerrain(snapshot.terrain)) {
            return false;
        }

        // Validate tanks
        if (!this.validateTanks(snapshot.tanks)) {
            return false;
        }

        // Validate optional arrays
        this.validateWrecks(snapshot.wrecks);
        this.validateSmokes(snapshot.smokes);
        this.validateMines(snapshot.mines);
        this.validateSupport(snapshot.support);

        // Validate solo mode
        if (snapshot.mode === 'solo') {
            this.validateSolo(snapshot.solo);
        }

        // Return true if no critical errors
        return this.errors.length === 0;
    }

    /**
     * Validate game dimensions
     */
    validateDimensions(dims) {
        if (!dims) {
            this.errors.push('Missing dimensions');
            return false;
        }

        const minWidth = 320;
        const maxWidth = 4096;
        const minHeight = 240;
        const maxHeight = 2160;

        if (!Number.isFinite(dims.w) || dims.w < minWidth || dims.w > maxWidth) {
            this.errors.push(`Invalid width: ${dims.w} (expected ${minWidth}-${maxWidth})`);
            return false;
        }

        if (!Number.isFinite(dims.h) || dims.h < minHeight || dims.h > maxHeight) {
            this.errors.push(`Invalid height: ${dims.h} (expected ${minHeight}-${maxHeight})`);
            return false;
        }

        return true;
    }

    /**
     * Validate game settings
     */
    validateGameSettings(snap) {
        // Validate theme
        const validThemes = ['classic', 'desert', 'arctic', 'volcanic', 'futuristic',
                           'forest', 'ocean', 'canyon', 'alien', 'dark'];
        if (snap.theme && !validThemes.includes(snap.theme)) {
            this.warnings.push(`Unknown theme: ${snap.theme}, will use default`);
            snap.theme = 'futuristic';
        }

        // Validate time of day
        const validTimes = ['day', 'dusk', 'night'];
        if (snap.timeOfDay && !validTimes.includes(snap.timeOfDay)) {
            this.warnings.push(`Unknown time of day: ${snap.timeOfDay}, will use default`);
            snap.timeOfDay = 'night';
        }

        // Validate wind
        if (!Number.isFinite(snap.wind)) {
            snap.wind = 0;
            this.warnings.push('Invalid wind value, reset to 0');
        } else {
            snap.wind = Math.max(-20, Math.min(20, snap.wind));
        }

        // Validate wind mode
        const validWindModes = ['none', 'low', 'medium', 'high', 'extreme'];
        if (snap.windMode && !validWindModes.includes(snap.windMode)) {
            snap.windMode = 'low';
            this.warnings.push('Invalid wind mode, reset to low');
        }

        // Validate game mode
        const validModes = ['classic', 'teams', 'survival', 'solo'];
        if (snap.mode && !validModes.includes(snap.mode)) {
            snap.mode = 'classic';
            this.warnings.push('Invalid game mode, reset to classic');
        }

        // Validate ammo mode
        const validAmmoModes = ['unlimited', 'sparse', 'balanced', 'plentiful'];
        if (snap.ammoMode && !validAmmoModes.includes(snap.ammoMode)) {
            snap.ammoMode = 'unlimited';
            this.warnings.push('Invalid ammo mode, reset to unlimited');
        }

        // Validate AI difficulty
        const validDifficulties = ['easy', 'medium', 'hard'];
        if (snap.aiDifficulty && !validDifficulties.includes(snap.aiDifficulty)) {
            snap.aiDifficulty = 'medium';
            this.warnings.push('Invalid AI difficulty, reset to medium');
        }

        // Validate current tank index
        if (!Number.isFinite(snap.currentTankIndex) || snap.currentTankIndex < 0) {
            snap.currentTankIndex = 0;
            this.warnings.push('Invalid current tank index, reset to 0');
        }
    }

    /**
     * Validate terrain data
     */
    validateTerrain(terrain) {
        if (!terrain) {
            this.errors.push('Missing terrain data');
            return false;
        }

        if (!Number.isFinite(terrain.w) || terrain.w <= 0) {
            this.errors.push('Invalid terrain width');
            return false;
        }

        if (!Number.isFinite(terrain.h) || terrain.h <= 0) {
            this.errors.push('Invalid terrain height');
            return false;
        }

        if (!Array.isArray(terrain.heightMap)) {
            this.errors.push('Terrain heightMap is not an array');
            return false;
        }

        // Validate heightmap values
        const maxHeight = terrain.h;
        for (let i = 0; i < terrain.heightMap.length; i++) {
            const height = terrain.heightMap[i];
            if (!Number.isFinite(height)) {
                terrain.heightMap[i] = maxHeight * 0.7; // Default ground level
                this.warnings.push(`Invalid height at index ${i}, using default`);
            } else {
                terrain.heightMap[i] = Math.max(0, Math.min(maxHeight, height));
            }
        }

        // Ensure heightmap has correct length
        if (terrain.heightMap.length !== terrain.w) {
            this.warnings.push(`Heightmap length ${terrain.heightMap.length} doesn't match width ${terrain.w}`);

            // Resize heightmap
            if (terrain.heightMap.length < terrain.w) {
                // Extend with default values
                const defaultHeight = maxHeight * 0.7;
                while (terrain.heightMap.length < terrain.w) {
                    terrain.heightMap.push(defaultHeight);
                }
            } else {
                // Truncate
                terrain.heightMap = terrain.heightMap.slice(0, terrain.w);
            }
        }

        return true;
    }

    /**
     * Validate tanks array
     */
    validateTanks(tanks) {
        if (!Array.isArray(tanks)) {
            this.errors.push('Tanks is not an array');
            return false;
        }

        if (tanks.length === 0) {
            this.errors.push('No tanks in snapshot');
            return false;
        }

        if (tanks.length > 20) {
            this.warnings.push(`Too many tanks (${tanks.length}), truncating to 20`);
            tanks.length = 20;
        }

        for (let i = 0; i < tanks.length; i++) {
            const tank = tanks[i];
            if (!tank) {
                this.errors.push(`Tank at index ${i} is null`);
                return false;
            }

            // Validate position
            if (!Number.isFinite(tank.x)) {
                this.errors.push(`Tank ${i} has invalid x position`);
                return false;
            }

            // Validate name
            if (!tank.name || typeof tank.name !== 'string') {
                tank.name = `Player ${i + 1}`;
                this.warnings.push(`Tank ${i} missing name, using default`);
            }

            // Sanitize name to prevent XSS
            tank.name = tank.name.replace(/[<>]/g, '').substring(0, 20);

            // Validate color
            if (!tank.color || !/^#[0-9A-Fa-f]{6}$/.test(tank.color)) {
                tank.color = this.getDefaultColor(i);
                this.warnings.push(`Tank ${i} invalid color, using default`);
            }

            // Validate health
            if (!Number.isFinite(tank.health) || tank.health < 0) {
                tank.health = 100;
                this.warnings.push(`Tank ${i} invalid health, reset to 100`);
            }
            tank.health = Math.min(tank.health, tank.maxHealth || 100);

            // Validate fuel
            if (!Number.isFinite(tank.fuel) || tank.fuel < 0) {
                tank.fuel = 200;
                this.warnings.push(`Tank ${i} invalid fuel, reset to 200`);
            }

            // Validate angle and power
            if (!Number.isFinite(tank.angle)) {
                tank.angle = 45;
            }
            tank.angle = ((tank.angle % 360) + 360) % 360;

            if (!Number.isFinite(tank.power) || tank.power < 0 || tank.power > 100) {
                tank.power = 50;
            }

            // Validate weapon
            const validWeapons = ['missile', 'nuke', 'laser', 'teleport', 'cluster',
                                'napalm', 'acid', 'emp', 'sonic', 'freeze'];
            if (!tank.weapon || !validWeapons.includes(tank.weapon)) {
                tank.weapon = 'missile';
            }

            // Validate ammo
            if (tank.ammo && typeof tank.ammo === 'object') {
                for (const [weapon, count] of Object.entries(tank.ammo)) {
                    if (!Number.isFinite(count) || count < 0) {
                        tank.ammo[weapon] = 0;
                    } else {
                        tank.ammo[weapon] = Math.min(count, 99);
                    }
                }
            }

            // Validate AI settings
            tank.isAI = !!tank.isAI;
            const validSkills = ['easy', 'medium', 'hard'];
            if (!validSkills.includes(tank.aiSkill)) {
                tank.aiSkill = 'medium';
            }
        }

        return true;
    }

    /**
     * Validate wrecks array
     */
    validateWrecks(wrecks) {
        if (!wrecks) return;

        if (!Array.isArray(wrecks)) {
            this.warnings.push('Wrecks is not an array, ignoring');
            return;
        }

        for (let i = wrecks.length - 1; i >= 0; i--) {
            const wreck = wrecks[i];
            if (!wreck || !Number.isFinite(wreck.x)) {
                wrecks.splice(i, 1);
                this.warnings.push(`Removed invalid wreck at index ${i}`);
            }
        }
    }

    /**
     * Validate smoke screens
     */
    validateSmokes(smokes) {
        if (!smokes) return;

        if (!Array.isArray(smokes)) {
            this.warnings.push('Smokes is not an array, ignoring');
            return;
        }

        for (let i = smokes.length - 1; i >= 0; i--) {
            const smoke = smokes[i];
            if (!smoke || !Number.isFinite(smoke.x) || !Number.isFinite(smoke.turnsLeft)) {
                smokes.splice(i, 1);
                this.warnings.push(`Removed invalid smoke at index ${i}`);
            }
        }
    }

    /**
     * Validate mines
     */
    validateMines(mines) {
        if (!mines) return;

        if (!Array.isArray(mines)) {
            this.warnings.push('Mines is not an array, ignoring');
            return;
        }

        for (let i = mines.length - 1; i >= 0; i--) {
            const mine = mines[i];
            if (!mine || !Number.isFinite(mine.x)) {
                mines.splice(i, 1);
                this.warnings.push(`Removed invalid mine at index ${i}`);
            }
        }
    }

    /**
     * Validate support actors
     */
    validateSupport(support) {
        if (!support) return;

        if (!Array.isArray(support)) {
            this.warnings.push('Support is not an array, ignoring');
            return;
        }

        for (let i = support.length - 1; i >= 0; i--) {
            const actor = support[i];
            if (!actor || !actor.type) {
                support.splice(i, 1);
                this.warnings.push(`Removed invalid support actor at index ${i}`);
            }
        }
    }

    /**
     * Validate solo mode data
     */
    validateSolo(solo) {
        if (!solo) return;

        if (!Number.isFinite(solo.score) || solo.score < 0) {
            solo.score = 0;
        }

        if (!Number.isFinite(solo.targetsHit) || solo.targetsHit < 0) {
            solo.targetsHit = 0;
        }

        if (!Number.isFinite(solo.targetGoal) || solo.targetGoal <= 0) {
            solo.targetGoal = 10;
        }

        if (!Number.isFinite(solo.shotsUsed) || solo.shotsUsed < 0) {
            solo.shotsUsed = 0;
        }
    }

    /**
     * Get default tank color by index
     */
    getDefaultColor(index) {
        const colors = [
            '#00ff00', '#ff0000', '#0080ff', '#ffff00',
            '#ff00ff', '#00ffff', '#ff8000', '#8000ff'
        ];
        return colors[index % colors.length];
    }

    /**
     * Get validation report
     */
    getReport() {
        return {
            valid: this.errors.length === 0,
            errors: [...this.errors],
            warnings: [...this.warnings]
        };
    }
}

export default SnapshotValidator;