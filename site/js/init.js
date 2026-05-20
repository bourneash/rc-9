// Initialization script - loads all dependencies in the correct order
// This ensures global variables are set up before other modules load

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
