// Dependencies loader - makes libraries available globally for the game
import { Howl, Howler } from 'howler';
import gsap from 'gsap';
import * as PIXI from 'pixi.js';
import * as pixiFilters from 'pixi-filters';

// Attach to global scope for existing code that expects them
window.Howl = Howl;
window.Howler = Howler;
window.gsap = gsap;

// Create a mutable copy of PIXI to add filters to
const pixiWithFilters = { ...PIXI };

// Attach pixi-filters to PIXI.filters
if (!pixiWithFilters.filters) {
  pixiWithFilters.filters = {};
}
Object.assign(pixiWithFilters.filters, pixiFilters);

// Assign to window
window.PIXI = pixiWithFilters;
