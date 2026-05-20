// Initialization script - loads all dependencies in the correct order
// This ensures global variables are set up before other modules load

// Preload JetBrains Mono so canvas tank labels render with the correct font
// from the very first frame (avoids fallback font on first draw).
if (document.fonts && document.fonts.load) {
  document.fonts.load('500 10px "JetBrains Mono"').catch(() => {});
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
