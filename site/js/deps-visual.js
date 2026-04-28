// Visual dependencies loader - deferred until visual FX are actually needed
import gsap from 'gsap';
import * as PIXI from 'pixi.js';
import * as pixiFilters from 'pixi-filters';

window.gsap = gsap;

const pixiWithFilters = { ...PIXI };
if (!pixiWithFilters.filters) {
  pixiWithFilters.filters = {};
}
Object.assign(pixiWithFilters.filters, pixiFilters);

window.PIXI = pixiWithFilters;
