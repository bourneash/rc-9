/**
 * Game Constants - Centralized configuration for magic numbers
 * This makes the codebase more maintainable and easier to balance
 */

export const PHYSICS = {
  GRAVITY: 0.3,
  VELOCITY_MULTIPLIER: 0.74, // Matches config.json - projectile initial velocity multiplier
  WIND_EFFECT: 0.015, // Matches config.json; lower default keeps shots controllable
  TERMINAL_VELOCITY: 15,
  WIND_MAX_DEFAULT: 6, // Default maximum wind speed (overridden by config.json)
};

export const GAME_BALANCE = {
  MIN_TANK_SEPARATION: 150, // Minimum pixels between tank spawns
  SPAWN_MARGIN: 40, // Margin from screen edges
  SPAWN_MAX_ATTEMPTS: 800, // Max attempts to find valid spawn positions
  MAX_SLOPE_ANGLE: 0.7, // Max terrain slope for spawning (radians, ~40 degrees)

  DEFAULT_HEALTH: 100,
  DEFAULT_FUEL: 200,
  FUEL_CONSUMPTION_RATE: 2,

  QUICK_VICTORY_TURNS: 5, // Less than this = "quick victory"
  MARATHON_TURNS: 20, // More than this = "marathon match"
};

export const TERRAIN = {
  GROUND_LEVEL_RATIO: 0.7, // 70% down from top
  BEDROCK_LEVEL_RATIO: 0.95, // 95% down from top
  DEFAULT_SMOOTHNESS: 50, // 1-100 scale

  CANYON_BUFFER: 8, // Pixels from valley edges
  OCEAN_WATER_SURFACE: 0.3, // 30% from top
  OCEAN_FLOOR_BASE: 0.80, // 80% from top
};

export const DISPLAY = {
  SCREEN_SHAKE_THRESHOLD: 0.1, // Stop shake when below this
  SCREEN_SHAKE_DECAY: 0.9, // Multiply intensity by this each frame

  WIND_CALM_THRESHOLD: 0.5, // Wind below this shows calm indicator
  WIND_STRONG_THRESHOLD: 3, // Wind above this shows strong indicator

  FIRE_BUTTON_DEBOUNCE: 400, // ms
  WEAPON_MENU_DEBOUNCE: 500, // ms
};

export const AI = {
  DEFAULT_SKILL: 'medium',
  THINK_TIME: {
    easy: 2000,
    medium: 1500,
    hard: 1000,
  },
  AIM_ERROR: {
    easy: 15,
    medium: 8,
    hard: 3,
  },
  POWER_ERROR: {
    easy: 25,
    medium: 15,
    hard: 8,
  },
};

export const ANIMATIONS = {
  VICTORY_DURATION: 2000, // ms
  EXPLOSION_BASE_DURATION: 500, // ms
  PROJECTILE_TRAIL_LENGTH: 20, // Max trail segments
  PARTICLE_LIFETIME: 10000, // ms
  DEBRIS_LIFETIME: 10000, // ms
};

export const UI = {
  AUTO_SAVE_INTERVAL: 45000, // ms (45 seconds)
  ERROR_NOTIFICATION_DURATION: 10000, // ms
  LOG_MESSAGE_FADE_DELAY: 300, // ms

  MODAL_ANIMATION_DURATION: 300, // ms
  TOOLTIP_DELAY: 500, // ms
};

export const LIMITS = {
  MIN_PLAYERS: 1,
  MAX_PLAYERS: 8,
  MIN_CANVAS_WIDTH: 320,
  MAX_CANVAS_WIDTH: 7680,
  MIN_CANVAS_HEIGHT: 240,
  MAX_CANVAS_HEIGHT: 4320,
};

export const COLORS = {
  TANK_COLORS: ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
  WIND_LEFT: '#00ffff',
  WIND_RIGHT: '#ff00ff',
  WIND_CALM: '#ffd700',
  VICTORY_COLOR: '#00ff00',
  DEFEAT_COLOR: '#ff4444',
};

export const NETWORK = {
  CONNECTION_TIMEOUT: 5000, // ms
  TURN_TIMEOUT_DEFAULT: 30000, // ms (30 seconds per turn)
  HEARTBEAT_INTERVAL: 1000, // ms
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000, // ms
};

// Export all constants as a single object for convenience
export default {
  PHYSICS,
  GAME_BALANCE,
  TERRAIN,
  DISPLAY,
  AI,
  ANIMATIONS,
  UI,
  LIMITS,
  COLORS,
  NETWORK,
};
