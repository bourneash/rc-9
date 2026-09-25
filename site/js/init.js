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

// Lazy singleton — one download of the game engine, ever.
// Exposed globally so the title-screen action handler can await it before
// opening the setup modal, ensuring the engine is ready on first click even
// if the user is faster than the idle-callback window.
let mainPromise = null;
function loadMain() {
  if (!mainPromise) mainPromise = import('./main.js');
  return mainPromise;
}
globalThis.__SE_LOAD_MAIN__ = loadMain;

function onReady() {
  const isRestoreSession = TitleScreen.mount();
  if (isRestoreSession) {
    // Returning user with a saved session: the engine is needed immediately
    // to restore game state, so load it now without deferral.
    void loadMain();
  }
  // A first-time visitor is still on a full-screen title menu. Loading and
  // starting the canvas game here keeps the main thread busy even though none
  // of the work is visible. The New Engagement action loads it on demand.
}

// Mount title screen after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}
