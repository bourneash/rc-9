// game-state.js — extracted from game.js
// Shared weapon-category constants. Pure data, no logic.
//
// These Sets are wired onto Game instances in the constructor
// (this.heavyWeapons, this.landOnlyWeapons, this.waterOnlyWeapons)
// so existing call sites continue to work unchanged.

// Heavy weapons (counted against the "no-heavy" ammo mode)
export const HEAVY_WEAPONS = new Set([
  'heavy',
  'nuke',
  'mirv',
  'bunker',
  'funky',
  'cluster',
  'laser',
  'drill',
  'napalm',
  'emp',
]);

// Weapons that only make sense on underwater (ocean) maps
export const WATER_ONLY_WEAPONS = new Set([
  'torpedo',
  'homing_torpedo',
  'depth_charge',
  'underwater_mine',
  'navy_seal',
  'sonar_pulse',
]);

// Weapons that don't work underwater (air-based or fire-based)
export const LAND_ONLY_WEAPONS = new Set([
  'marker_airstrike',
  'marker_airnukes',
  'marker_attack',
  'marker_medic',
  'parachute_flare',
  'napalm',
  'smoke_bomb',
  'flare',
]);
