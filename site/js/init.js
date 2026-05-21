// Initialization script - loads all dependencies in the correct order
// This ensures global variables are set up before other modules load

// Preload JetBrains Mono and Saira Condensed so canvas renders with the correct
// fonts from the very first frame (avoids fallback fonts on first draw).
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('500 10px "JetBrains Mono"'),
    document.fonts.load('700 18px "Saira Condensed"'),
  ]).catch(() => {});
}

import * as TitleScreen from './title-screen.js';

// Portal ads SDK (GameDistribution) — only active in portal/production context
void import('./ads.js');

// Load sidebar (vanilla JS, no React needed) asynchronously
void import('./sidebar.js');

// Finally load main game after all dependencies are ready
import './main.js';

// Mount title screen after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TitleScreen.mount());
} else {
  TitleScreen.mount();
}
