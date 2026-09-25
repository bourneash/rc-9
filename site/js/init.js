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
  } else {
    // New visit: let the title screen paint and LCP fire before the game engine
    // blocks the main thread. requestIdleCallback fires after the browser is
    // idle (post-paint); the 3 s timeout ensures the engine is ready well before
    // a typical user clicks "NEW ENGAGEMENT".
    if ('requestIdleCallback' in globalThis) {
      globalThis.requestIdleCallback(() => void loadMain(), { timeout: 3000 });
    } else {
      globalThis.setTimeout(() => void loadMain(), 1000);
    }
  }
}

// Mount title screen after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}
