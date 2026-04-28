// Initialization script - loads all dependencies in the correct order
// This ensures global variables are set up before other modules load

// Portal ads SDK (GameDistribution) — only active in portal/production context
void import('./ads.js');

// Load sidebar (vanilla JS, no React needed) asynchronously
void import('./sidebar.js');

// Finally load main game after all dependencies are ready
import './main.js';
