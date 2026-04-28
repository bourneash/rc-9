// ============================================================================
// GLOBAL ERROR HANDLING & RECOVERY
// ============================================================================

import { getMemoryManager, resetMemoryManager } from './memory-manager.js';
import mobileFixes from './mobile-fixes.js';

// Global cleanup function for game restarts
function cleanupGameResources() {
    console.log('[Main] Cleaning up game resources...');

    // Clean up AV resources
    if (globalThis.av) {
        try {
            globalThis.av.dispose();
        } catch (e) {
            console.warn('[Main] Failed to dispose AV resources:', e);
        }
    }

    // Reset memory manager to clean up all tracked resources
    try {
        resetMemoryManager();
    } catch (e) {
        console.warn('[Main] Failed to reset memory manager:', e);
    }

    console.log('[Main] Cleanup complete');
}

// Setup global error handlers BEFORE any other code
globalThis.addEventListener('error', (event) => {
    console.error('[Global Error]:', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
    showErrorNotification(event.error || new Error(event.message), 'Application Error');
    // Don't prevent default to allow debugging, but in production you might want to
});

globalThis.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]:', event.reason);
    showErrorNotification(event.reason, 'Promise Error');
    event.preventDefault();
});

function showErrorNotification(error, title = 'Error') {
    const errorMessage = error?.message || String(error) || 'An unknown error occurred';

    // Create error notification
    let notification = document.getElementById('error-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            padding: 16px 20px;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        document.body.appendChild(notification);
    }

    const sanitize = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // Create notification content using DOM methods (safe from XSS)
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: start; gap: 12px;';

    const icon = document.createElement('div');
    icon.style.fontSize = '24px';
    icon.textContent = '⚠️';
    container.appendChild(icon);

    const content = document.createElement('div');
    content.style.flex = '1';

    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'font-weight: bold; margin-bottom: 4px;';
    titleDiv.textContent = title; // Safe - uses textContent
    content.appendChild(titleDiv);

    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = 'opacity: 0.9; font-size: 13px; line-height: 1.4;';
    messageDiv.textContent = errorMessage; // Safe - uses textContent
    content.appendChild(messageDiv);

    const reloadBtn = document.createElement('button');
    reloadBtn.style.cssText = 'margin-top: 12px; padding: 6px 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; color: white; cursor: pointer; font-size: 12px;';
    reloadBtn.textContent = 'Reload Page';
    reloadBtn.addEventListener('click', () => location.reload());
    content.appendChild(reloadBtn);

    container.appendChild(content);

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => notification.remove());
    container.appendChild(closeBtn);

    notification.appendChild(container);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (notification && notification.parentElement) {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 10000);
}

// Add CSS animations
if (!document.getElementById('error-boundary-styles')) {
    const style = document.createElement('style');
    style.id = 'error-boundary-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

console.info('[ErrorBoundary] Global error handlers initialized');

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

import { Game } from './game.js';
import { validatePlayerName } from './validation.js';
import errorLogger from './errors.js';
import { LoadingScreen } from './loading-screen.js';
// Imports kept minimal here; specific vehicle classes are referenced via game APIs

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    // Sidebar is floating and should not reduce canvas height
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

globalThis.addEventListener('resize', () => {
    resizeCanvas();
    if (game) {
        game.handleResize();
    }
});

resizeCanvas();

const game = new Game(canvas, ctx);
// Expose the active game instance for renderer modules (e.g., streamer mode name-tag suppression)
try {
    globalThis.__SE_GAME__ = game;
} catch (error) {
    errorLogger.log(error, 'GlobalState:SetGame', { reason: 'Failed to set global game instance' });
}

// Diagnostic: log pointerdown/up targets to help debug click intercepts for Fire button.
// Remove or comment out once debugging completes.
(function attachPointerDiagnostics() {
    try {
        const dbg = (ev) => {
            try {
                const pt = { x: ev.clientX, y: ev.clientY };
                // diagnostic only; intentionally not using elementFromPoint result
                void pt;
            } catch {
                // swallow diagnostics errors intentionally
            }
        };
        document.addEventListener('pointerdown', dbg, { capture: true });
        document.addEventListener('pointerup', dbg, { capture: true });
        // Expose a helper to remove diagnostics from console if needed
        globalThis.__removePointerDiag = () => { document.removeEventListener('pointerdown', dbg, { capture: true }); document.removeEventListener('pointerup', dbg, { capture: true }); console.info('[diag] pointer diagnostics removed'); };
        console.info('[diag] pointer diagnostics attached — call globalThis.__removePointerDiag() to remove');
    } catch (e) { console.warn('[diag] failed to attach pointer diagnostics', e); }
})();

// Prevent accidental re-opening of Options immediately after starting a game (click-through guards)
let suppressOptionsUntil = 0;

// Initialize game asynchronously with loading screen
console.info('[main] initializing game...');
let gameInitialized = false;

// Create and show loading screen
const loadingScreen = new LoadingScreen();
loadingScreen.setProgress(0, 'Loading configuration...');

try {
    // Load game config
    await game.init();
    loadingScreen.setProgress(50, 'Loading assets...');

    // Give game time to fully initialize
    await new Promise(resolve => setTimeout(resolve, 300));
    loadingScreen.setProgress(100, 'Ready!');

    console.info('[main] game initialized');
    gameInitialized = true;

    // Complete loading screen with fade-out
    await loadingScreen.complete();
} catch (err) {
    console.error('[main] init error', err);
    errorLogger.log(err, 'Game:InitFailed', { critical: true });

    // Hide loading screen and show error
    loadingScreen.hide();
    showErrorNotification(err, 'Game Initialization Failed');
}

// Only start the game if initialization was successful
if (gameInitialized) {
    game.start();
} else {
    console.error('[main] Game not started due to initialization failure');
    // Show fallback UI or error state
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background: #333;
        color: #fff;
        border: 2px solid #f00;
        border-radius: 8px;
        text-align: center;
        z-index: 10000;
    `;
    const h2 = document.createElement('h2');
    h2.textContent = 'Game Failed to Initialize';
    errorDiv.appendChild(h2);

    const p = document.createElement('p');
    p.textContent = 'Please refresh the page to try again.';
    errorDiv.appendChild(p);

    const refreshBtn = document.createElement('button');
    refreshBtn.style.cssText = 'padding: 8px 16px; margin-top: 10px;';
    refreshBtn.textContent = 'Refresh Page';
    refreshBtn.addEventListener('click', () => location.reload());
    errorDiv.appendChild(refreshBtn);

    document.body.appendChild(errorDiv);
}

// ----------------------------------------------------------------------------
// UI State persistence (restore last session: gameplay/options/new-game)
// ----------------------------------------------------------------------------
const UI_RESTORE_PREF_KEY = 'se.ui.restoreEnabled';
const UI_LAST_STATE_KEY = 'se.ui.lastState.v1';

function getRestoreEnabled() {
    const v = errorLogger.safeLocalStorage('get', UI_RESTORE_PREF_KEY);
    return v === null ? true : v === 'true'; // default ON
}
function setRestoreEnabled(on) {
    errorLogger.safeLocalStorage('set', UI_RESTORE_PREF_KEY, String(!!on));
}
function saveLastUIState(state) {
    errorLogger.safeLocalStorage('set', UI_LAST_STATE_KEY, JSON.stringify({ state, t: Date.now() }));
}
function getLastUIState() {
    const raw = errorLogger.safeLocalStorage('get', UI_LAST_STATE_KEY);
    if (!raw) return null;
    try {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj.state !== 'string') return null;
        // optional: expire after 7 days
        if (obj.t && Date.now() - obj.t > 7 * 24 * 60 * 60 * 1000) return null;
        return obj.state; // 'playing' | 'options' | 'new-game'
    } catch (error) {
        errorLogger.log(error, 'UIState:ParseError', { raw });
        return null;
    }
}

// Show a "No Game" overlay with a Start Game button
// This is a fallback UI when no game is in progress
function showNoGameOverlay() {
    let overlay = document.getElementById('no-game-overlay');

    // Create overlay if it doesn't exist
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'no-game-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 2000;
            animation: fadeIn 0.3s ease-out;
        `;

        overlay.innerHTML = `
            <div style="text-align: center; max-width: 600px; padding: 40px;">
                <h1 style="color: #00ffff; font-size: 3em; margin: 0 0 20px 0; text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);">
                    Scorched Earth
                </h1>
                <p style="color: #aaa; font-size: 1.2em; margin: 0 0 40px 0; line-height: 1.6;">
                    No game in progress. Start a new game to begin playing.
                </p>
                <button id="no-game-start-btn" style="
                    padding: 16px 48px;
                    font-size: 1.4em;
                    background: linear-gradient(135deg, #00ffff, #00aaff);
                    color: #000;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.4);
                    transition: all 0.2s ease;
                " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 16px rgba(0, 255, 255, 0.6)';"
                   onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0, 255, 255, 0.4)';">
                    START NEW GAME
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add event listener for the start button
        const startBtn = document.getElementById('no-game-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                hideNoGameOverlay();
                try {
                    openNewGameModal();
                } catch (err) {
                    console.error('[no-game-overlay] Failed to open New Game modal:', err);
                }
            });
        }
    }

    // Show the overlay
    overlay.style.display = 'flex';
}

function hideNoGameOverlay() {
    const overlay = document.getElementById('no-game-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.animation = 'fadeIn 0.3s ease-out';
        }, 300);
    }
}

// Make these functions globally available so they can be called from other parts of the code
globalThis.showNoGameOverlay = showNoGameOverlay;
globalThis.hideNoGameOverlay = hideNoGameOverlay;

// Bootstrap: restore last session or open New Game setup (default behavior)
(function bootstrapSessionRestore() {
    try {
        // Ensure preference key exists (default ON)
        if (localStorage.getItem(UI_RESTORE_PREF_KEY) === null) {
            try { localStorage.setItem(UI_RESTORE_PREF_KEY, 'true'); } catch {}
        }

        // Mirror preference checkbox state once DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            try {
                const cb = document.getElementById('restore-state-toggle');
                if (cb) {
                    cb.checked = getRestoreEnabled();
                    cb.addEventListener('change', () => setRestoreEnabled(cb.checked));
                }
            } catch {}
        });

        // Always open New Game setup on page load — snapshot restore is too fragile
        // (AI timers, animation state, event listeners don't survive page reload)
        const openNewGameSetup = () => {
            try {
                const modal = document.getElementById('new-game-modal');
                if (!modal) {
                    console.warn('[bootstrap] New Game modal element not found, retrying...');
                    // Retry after a short delay if modal doesn't exist yet
                    setTimeout(openNewGameSetup, 100);
                    return;
                }

                openNewGameModal();
                console.info('[bootstrap] Opened New Game setup modal');
            } catch (err) {
                console.error('[bootstrap] Failed to open New Game modal:', err);
                // Fallback: show a simple start screen overlay
                showNoGameOverlay();
            }
        };

        // Always open the New Game modal on first visit or when no game exists
        // This provides a clear, intentional start to gameplay
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', openNewGameSetup);
        } else {
            openNewGameSetup();
        }

    } catch (e) {
        console.error('[main] bootstrapSessionRestore failed:', e);
        // Show fallback UI
        showNoGameOverlay();
    }
})();


// Save a snapshot during navigation away for safety
window.addEventListener('beforeunload', () => {
    try { game.saveSnapshotToStorage('beforeunload'); } catch {}
});

// Also autosave periodically and when the tab is hidden
try {
    const memoryManager = getMemoryManager();
    const intervalMs = 45000; // 45s

    // Use memory-managed interval that will be cleaned up
    memoryManager.setInterval(() => {
        try { game.saveSnapshotToStorage('interval'); } catch {}
    }, intervalMs);

    memoryManager.addEventListener(document, 'visibilitychange', () => {
        if (document.hidden) {
            try { game.saveSnapshotToStorage('hidden'); } catch {}
        }
    });
} catch {}

// Pause/resume based on window/tab focus and visibility. Each source uses its own pause
// reason, so one source resuming (e.g. window refocus) does not unpause another that is
// still active (e.g. an open modal).
try {
    const memoryManager = getMemoryManager();

    memoryManager.addEventListener(globalThis, 'blur', () => {
        try { game.setPaused(true, 'window-blur'); } catch {}
    });

    memoryManager.addEventListener(globalThis, 'focus', () => {
        try { game.setPaused(false, 'window-blur'); } catch {}
        // Defensively clear document-hidden reason too: some browsers fire `focus` without a
        // matching `visibilitychange` when returning from backgrounded state.
        try { if (!document.hidden) game.setPaused(false, 'document-hidden'); } catch {}
    });

    memoryManager.addEventListener(document, 'visibilitychange', () => {
        if (document.hidden) {
            try { game.setPaused(true, 'document-hidden'); } catch {}
        } else {
            try { game.setPaused(false, 'document-hidden'); } catch {}
            // If the tab becomes visible, treat the window as focused for our purposes.
            try { if (document.hasFocus?.()) game.setPaused(false, 'window-blur'); } catch {}
        }
    });
} catch {}

// --- AV overlay (Pixi + Howler + GSAP) wiring ---
let av = null;
let avInitStarted = false;
let avVisualsLoadPromise = null;
async function initAVOverlay() {
    if (avInitStarted || av) return;
    avInitStarted = true;
    try {
        await import('./deps-audio.js');
        const { createAV } = await import('./av.js');

        av = createAV(canvas);
        const pump = () => { av?.updateFromCanvas(canvas); globalThis.requestAnimationFrame(pump); };
        globalThis.requestAnimationFrame(pump);

        let audioUnlocked = false;
        const memoryManager = getMemoryManager();

        const unlock = () => {
            if (!audioUnlocked) {
                console.log('[Audio] Unlocking audio context on user interaction');
                av?.unlockAudio?.();
                audioUnlocked = true;
                const btn = document.getElementById('audio-unlock');
                if (btn) btn.remove();
                memoryManager.setTimeout(cleanup, 100);
            }
        };

        const cleanup = () => {
            console.log('[Audio] Audio unlock complete, cleanup handled by memory manager');
        };

        memoryManager.addEventListener(globalThis, 'pointerdown', unlock, { capture: true });
        memoryManager.addEventListener(globalThis, 'touchstart', unlock, { capture: true, passive: true });
        memoryManager.addEventListener(globalThis, 'keydown', unlock, { capture: true });
        memoryManager.addEventListener(globalThis, 'mousedown', unlock, { capture: true });
        memoryManager.addEventListener(globalThis, 'click', unlock, { capture: true });

        try {
            const ac = globalThis.Howler?.ctx;
            const needsUnlock = !ac || (ac.state && ac.state !== 'running');
            if (needsUnlock) {
                const btn = document.createElement('button');
                btn.id = 'audio-unlock';
                btn.textContent = 'Enable Sound';
                btn.style.cssText = 'position:fixed; right:14px; bottom:60px; z-index:1200; padding:8px 12px; border-radius:8px; background:#333; color:#fff; border:1px solid #666; box-shadow:0 2px 6px rgba(0,0,0,0.25)';
                btn.addEventListener('click', () => { try { av?.unlockAudio?.(); } catch {}; try { btn.remove(); } catch {} });
                document.body.appendChild(btn);
            }
        } catch {}
    } catch (e) {
        console.warn('[main] AV overlay unavailable:', e);
    }
}

async function ensureAVVisuals() {
    if (!av) return;
    if (av.app && globalThis.gsap) return;
    if (!avVisualsLoadPromise) {
        avVisualsLoadPromise = import('./deps-visual.js')
            .then(() => {
                try { av?.enableVisuals?.(canvas); } catch (error) { console.warn('[main] Failed enabling AV visuals:', error); }
            })
            .catch((error) => {
                console.warn('[main] AV visual dependencies unavailable:', error);
            });
    }
    await avVisualsLoadPromise;
}

(() => {
    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        void initAVOverlay();
    };

    const onceOpts = { capture: true, once: true };
    globalThis.addEventListener('pointerdown', start, onceOpts);
    globalThis.addEventListener('keydown', start, onceOpts);
    globalThis.addEventListener('mousedown', start, onceOpts);
    globalThis.addEventListener('touchstart', start, { capture: true, once: true, passive: true });
    globalThis.addEventListener('click', start, onceOpts);

    // Fallback: still initialize eventually for non-interactive sessions
    globalThis.setTimeout(start, 5000);
})();

// Gameplay-driven AV hooks via CustomEvents
document.addEventListener('game:fire', (ev) => {
    av?.unlockAudio?.();
    const weapon = ev?.detail?.weapon;
    av?.playFire(weapon);
    if (weapon === 'nuke') {
        // Subtle pre-blast charge
        av?.playNukeCharge?.();
    }
});
document.addEventListener('game:explosion', (ev) => {
    void ensureAVVisuals();
    av?.unlockAudio?.();
    const { type, radius } = ev?.detail || {};
    const magnitude = Math.max(0.6, Math.min(2, (radius || 30) / 60));
    av?.playExplosion(type, magnitude);
    if (type === 'nuke') {
        av?.playNukeBlast?.();
        av?.flash?.('#ffffff', 0.35);
    }
});
document.addEventListener('game:wind-change', (ev) => {
    av?.unlockAudio?.();
    const value = Math.abs(ev?.detail?.value ?? 0);
    av?.setWindVolume(value);
});
// New audio hooks
document.addEventListener('game:engine-ping', () => { av?.unlockAudio?.(); av?.enginePing?.(); });
document.addEventListener('game:plane-flyby', () => { av?.unlockAudio?.(); av?.playPlaneFlyby?.(); });
document.addEventListener('game:bomber-inbound', () => { av?.unlockAudio?.(); av?.playBomberSiren?.(); });
document.addEventListener('game:ufo-flyby', () => { av?.unlockAudio?.(); av?.playUfoFlyby?.(); });
document.addEventListener('game:paratrooper-drop', () => { av?.unlockAudio?.(); av?.playParatrooperDrop?.(); });
document.addEventListener('game:parachute-deploy', () => { av?.unlockAudio?.(); av?.playParachuteDeploy?.(); });
document.addEventListener('game:crate-inbound', () => { av?.unlockAudio?.(); av?.playCrateInbound?.(); });
document.addEventListener('game:crate-pickup', () => { av?.unlockAudio?.(); av?.playCratePickup?.(); });

const MODAL_FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function activateModalA11y(modal, initialFocusSelector) {
    if (!modal) return;
    try {
        modal.setAttribute('aria-modal', 'true');
        if (!modal.getAttribute('role')) modal.setAttribute('role', 'dialog');
    } catch {}

    modal._restoreFocusEl = (document.activeElement instanceof HTMLElement) ? document.activeElement : null;

    if (!modal._focusTrapHandler) {
        modal._focusTrapHandler = (event) => {
            if (event.key !== 'Tab') return;
            const focusables = Array.from(modal.querySelectorAll(MODAL_FOCUSABLE_SELECTOR))
                .filter((el) => el instanceof HTMLElement && !el.hasAttribute('disabled') && el.tabIndex !== -1);

            if (!focusables.length) {
                event.preventDefault();
                modal.focus?.();
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || active === modal) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                event.preventDefault();
                first.focus();
            }
        };
        modal.addEventListener('keydown', modal._focusTrapHandler);
    }

    globalThis.setTimeout(() => {
        if (modal.classList.contains('hidden')) return;
        const preferred = initialFocusSelector ? modal.querySelector(initialFocusSelector) : null;
        const fallback = modal.querySelector(MODAL_FOCUSABLE_SELECTOR);
        if (preferred instanceof HTMLElement) preferred.focus();
        else if (fallback instanceof HTMLElement) fallback.focus();
        else modal.focus?.();
    }, 0);
}

function deactivateModalA11y(modal) {
    if (!modal) return;
    if (modal._focusTrapHandler) {
        try { modal.removeEventListener('keydown', modal._focusTrapHandler); } catch {}
        try { delete modal._focusTrapHandler; } catch {}
    }
    const restore = modal._restoreFocusEl;
    if (restore && typeof restore.focus === 'function' && document.contains(restore)) {
        try { restore.focus(); } catch {}
    }
    try { delete modal._restoreFocusEl; } catch {}
}

// --- Game Over modal helpers ---
function openGameOverModal() {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;
    try { if ('showModal' in modal && !modal.open) modal.showModal(); } catch {}
    modal.classList.remove('hidden');
    activateModalA11y(modal, '#new-game-button');
    ensureGameOverModalHandlers();
    try { saveLastUIState('options'); } catch {}
}
function closeGameOverModal() {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;
    try { modal.close?.(); } catch {}
    modal.classList.add('hidden');
    deactivateModalA11y(modal);
    try { saveLastUIState('playing'); } catch {}
}
function ensureGameOverModalHandlers() {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;
    if (modal.dataset.handlers === '1') return;
    // Close button
    document.getElementById('game-over-close')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeGameOverModal();
    });
    // Escape key
    const esc = (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            e.preventDefault?.();
            closeGameOverModal();
        }
    };
    modal._escHandler = esc;
    globalThis.addEventListener('keydown', esc);
    // Click outside content closes
    modal.addEventListener('click', (e) => {
        const content = modal.querySelector('.modal-content');
        if (!content) return;
        const r = content.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) closeGameOverModal();
    });
    modal.dataset.handlers = '1';
}

// Restart game helper function
function hideOptionsModalShell() {
    const modal = document.getElementById('options-modal');
    if (!modal) return;
    try { modal.close?.(); } catch {}
    modal.classList.add('hidden');
    deactivateModalA11y(modal);
    try { saveLastUIState('playing'); } catch {}
}

function restartGame() {
    // Close any open modals
    try { hideOptionsModalShell(); } catch {}
    try { closeRestartModal(); } catch {}
    try { closeGameOverModal(); } catch {}

    performGameReset();
}

function performGameReset() {
    // Clean up resources before resetting
    cleanupGameResources();

    // Reset game state
    game.reset();

    // Defensive: clear any input gates and enable controls
    try { game.fireLocked = false; } catch {}
    try { game.isAnimating = false; } catch {}
    try { game.turnEnding = false; } catch {}
    try { game.holdingForSupport = false; } catch {}
    try { game.clearAllPauseReasons(); } catch {}
    try { game.enableControls(); } catch {}

    // Focus the canvas so keyboard/controls feel immediate
    try { document.getElementById('game-canvas')?.focus(); } catch {}
}

// Expose minimal helpers for non-module files to call
globalThis.openGameOverModal = openGameOverModal;
globalThis.closeGameOverModal = closeGameOverModal;
globalThis.restartGame = restartGame;

// --- Auto-restart functionality ---
let autoRestartTimer = null;
let autoRestartCountdown = null;

function syncAutoRestartCheckboxes(checked, checkbox1 = document.getElementById('auto-restart-toggle'), checkbox2 = document.getElementById('auto-restart-checkbox')) {
    if (checkbox1) checkbox1.checked = checked;
    if (checkbox2) checkbox2.checked = checked;
}

function checkAutoRestart() {
    // Check both checkboxes (old one in options modal and new one in restart modal)
    const checkbox1 = document.getElementById('auto-restart-toggle');
    const checkbox2 = document.getElementById('auto-restart-checkbox');

    // Load saved preference
    let saved = null;
    try {
        saved = localStorage.getItem('auto-restart-enabled');
        if (saved === null) saved = localStorage.getItem('se.autoRestart'); // fallback to old key
    } catch {}

    const isEnabled = saved === 'true';

    syncAutoRestartCheckboxes(isEnabled, checkbox1, checkbox2);

    return isEnabled;
}

function startAutoRestartCountdown() {
    if (!checkAutoRestart()) return;

    // Close game over modal
    closeGameOverModal();

    // Open countdown modal
    const modal = document.getElementById('auto-restart-modal');
    if (!modal) return;

    const countdownEl = document.getElementById('auto-restart-countdown');
    let seconds = 5;

    if (countdownEl) countdownEl.textContent = seconds;

    try { if ('showModal' in modal && !modal.open) modal.showModal(); } catch {}
    modal.classList.remove('hidden');
    activateModalA11y(modal, '#cancel-auto-restart');

    // Countdown timer using memoryManager to prevent leaks
    autoRestartCountdown = memoryManager.setInterval(() => {
        seconds--;
        if (countdownEl) countdownEl.textContent = seconds;

        if (seconds <= 0) {
            if (autoRestartCountdown) {
                memoryManager.clearInterval(autoRestartCountdown);
                autoRestartCountdown = null;
            }
            closeAutoRestartModal();
            // Trigger restart
            const restartBtn = document.getElementById('restart-button');
            if (restartBtn) restartBtn.click();
        }
    }, 1000);
}

function closeAutoRestartModal() {
    const modal = document.getElementById('auto-restart-modal');
    if (!modal) return;

    if (autoRestartCountdown) {
        memoryManager.clearInterval(autoRestartCountdown);
        autoRestartCountdown = null;
    }

    try { modal.close?.(); } catch {}
    modal.classList.add('hidden');
    deactivateModalA11y(modal);
}

function setupAutoRestartHandlers() {
    const checkbox1 = document.getElementById('auto-restart-toggle');
    const checkbox2 = document.getElementById('auto-restart-checkbox');
    const cancelBtn = document.getElementById('cancel-auto-restart');

    // Save preference when either checkbox changes
    const savePreference = (checked) => {
        try {
            localStorage.setItem('auto-restart-enabled', String(checked));
            syncAutoRestartCheckboxes(checked, checkbox1, checkbox2);
        } catch {}
    };

    checkbox1?.addEventListener('change', (e) => savePreference(e.target.checked));
    checkbox2?.addEventListener('change', (e) => savePreference(e.target.checked));

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
        closeAutoRestartModal();
        // Uncheck the auto-restart option
        savePreference(false);
    });

    // Load saved preference on page load
    checkAutoRestart();
}

// Initialize auto-restart handlers on page load
document.addEventListener('DOMContentLoaded', setupAutoRestartHandlers);

// Expose auto-restart function globally for game.js to call
globalThis.startAutoRestartCountdown = startAutoRestartCountdown;
// Expose openNewGameModal globally so victory toast can call it
globalThis.openNewGameModal = function() { openNewGameModal(); };

// --- New Game setup modal wiring ---
function openNewGameModal() {
    const modal = document.getElementById('new-game-modal');
    if (!modal) return;
    // If the Game Options modal is open, close it first so it doesn't pop back up
    try {
        const opt = document.getElementById('options-modal');
        if (opt && !opt.classList.contains('hidden')) {
            hideOptionsModalShell();
        }
    } catch {}
    // Ensure close handlers are attached once
    ensureNewGameModalHandlers();
    // Remove hidden BEFORE showModal — dialog must be visible for showModal() to work
    modal.classList.remove('hidden');
    // Use dialog API when available
    try {
        if ('showModal' in modal) {
            if (!modal.open) modal.showModal();
        }
    } catch {}
    activateModalA11y(modal, '#setup-start');
    // Hide Cancel button if no game is in progress (modal is mandatory)
    const cancelBtn = document.getElementById('setup-cancel');
    if (cancelBtn) cancelBtn.style.display = hasActiveGame() ? '' : 'none';
    // Pause gameplay while New Game setup is open
    try { game.setPaused(true, 'new-game-modal'); } catch {}
    try { saveLastUIState('new-game'); } catch {}
    // Apply saved setup choices before rendering dependent UI
    applySavedSetupFromStorage();
    renderThemePreviews();
    // Apply mode-driven UI (Solo clamps players) before building slots
    renderTeamsUI();
    renderSlotsUI();
}

function hasActiveGame() {
    return !!(game?.tanks && Array.isArray(game.tanks) && game.tanks.length > 0 && !game.gameOver);
}

function closeNewGameModal() {
    // Don't allow closing if no game is in progress — user must start a game
    if (!hasActiveGame()) return;

    const modal = document.getElementById('new-game-modal');
    try { modal?.close?.(); } catch {}
    modal?.classList.add('hidden');
    if (modal) deactivateModalA11y(modal);

    // Clear the new-game pause reason; blur/visibility reasons (if still active) keep the
    // game paused on their own until the window refocuses.
    try { game.setPaused(false, 'new-game-modal'); } catch {}
    try { saveLastUIState('playing'); } catch {}
}

function renderThemePreviews() {
    const container = document.getElementById('theme-previews');
    if (!container) return;
    const themes = ['forest','desert','cave','moon','mars','arctic','canyon','futuristic'];
    container.innerHTML = '';
    const selected = document.getElementById('setup-theme')?.value;
    for (const name of themes) {
        const tile = document.createElement('div');
        tile.className = 'theme-tile' + (selected === name ? ' selected' : '');
        tile.dataset.theme = name;
        // simple gradient approximations for thumbnails
        const gradients = {
            forest: 'linear-gradient(#87ceeb, #d0f0ff), linear-gradient(0deg, #1f3d1f, #0a1a0a)',
            desert: 'linear-gradient(#87d8ff, #fffbcc), linear-gradient(0deg, #a8875a, #6e512b)',
            cave: 'linear-gradient(#121212, #060606), linear-gradient(0deg, #2b2b2b, #141414)',
            moon: 'linear-gradient(#20242b, #0f1216), linear-gradient(0deg, #7f8489, #474d52)',
            mars: 'linear-gradient(#c45c3d, #ffd3a8), linear-gradient(0deg, #933833, #4b1b18)',
            arctic: 'linear-gradient(#bde5ff, #eef9ff), linear-gradient(0deg, #6fbbe8, #2a688c)',
            futuristic: 'linear-gradient(#9ad0ff, #e4f6ff), linear-gradient(0deg, #29384a, #0e1620)',
            canyon: 'linear-gradient(#9ad0ff, #fff1c1), linear-gradient(0deg, #caa06f, #8b5f32)'
        };
        tile.style.backgroundImage = gradients[name];
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = name[0].toUpperCase() + name.slice(1);
        tile.appendChild(label);
        tile.addEventListener('click', () => {
            document.getElementById('setup-theme').value = name;
            renderThemePreviews();
            // Persist after choosing a theme via tile
            try { persistSetupSelection(); } catch {}
        });
        container.appendChild(tile);
    }
}

function bindNewGameModalEvents() {
    // Open from game over modal
    document.getElementById('new-game-button')?.addEventListener('click', (e) => {
        e.preventDefault();
        // Fully close the Game Over modal (removes open state and ESC handler)
        try { closeGameOverModal(); } catch { document.getElementById('game-over-modal')?.classList.add('hidden'); }
        openNewGameModal();
    });
    // Additional launch points are wired elsewhere; keep setup buttons local here.
    document.getElementById('setup-cancel')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeNewGameModal(); });
    document.getElementById('setup-reset')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Show styled confirmation toast instead of native confirm()
        const existing = document.getElementById('reset-confirm-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'reset-confirm-toast';
        toast.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9);
            z-index: 20000; text-align: center;
            background: linear-gradient(135deg, rgba(50,0,0,0.95), rgba(0,0,0,0.92));
            border: 2px solid #ff4d4d; border-radius: 15px;
            padding: 24px 32px; min-width: 340px;
            box-shadow: 0 0 30px rgba(255,77,77,0.3);
            animation: victoryToastAppear 0.3s ease-out forwards;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Reset All Settings?';
        title.style.cssText = 'color: #ff6b6b; margin: 0 0 12px; font-size: 22px;';

        const msg = document.createElement('p');
        msg.textContent = 'This clears saved games, volume, and all preferences.';
        msg.style.cssText = 'color: #ccc; margin: 0 0 20px; font-size: 14px;';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 12px; justify-content: center;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;
            background: rgba(255,255,255,0.1); color: #ccc; border: 1px solid rgba(255,255,255,0.2);
        `;

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Reset Everything';
        confirmBtn.style.cssText = `
            padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;
            background: linear-gradient(135deg, #ff4d4d, #cc0000); color: #fff; border: none;
        `;

        const dismiss = () => {
            toast.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => toast.remove(), 200);
        };

        cancelBtn.addEventListener('click', dismiss);
        confirmBtn.addEventListener('click', () => {
            dismiss();
            performFullReset();
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        toast.appendChild(title);
        toast.appendChild(msg);
        toast.appendChild(btnRow);
        document.body.appendChild(toast);
    });

    function performFullReset() {
        // Clear all se.* keys and known legacy keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('se.') || key === 'auto-restart-enabled')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // Reset form to defaults
        const setRadio = (name, value) => {
            const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (el) el.checked = true;
        };
        setRadio('mode', 'classic');
        setRadio('wind', 'low');
        setRadio('health', '100');

        const envEl = document.getElementById('setup-environment');
        if (envEl) envEl.value = 'random';
        const terrainEl = document.getElementById('setup-terrain');
        if (terrainEl) terrainEl.value = 'random';
        const themeEl = document.getElementById('setup-theme');
        if (themeEl) themeEl.value = 'random';
        const timeEl = document.getElementById('setup-time');
        if (timeEl) timeEl.value = 'auto';
        const totalPlayersEl = document.getElementById('setup-total-players');
        if (totalPlayersEl) totalPlayersEl.value = '2';
        const soloTargetsEl = document.getElementById('setup-solo-targets');
        if (soloTargetsEl) soloTargetsEl.value = '10';
        const soloShotsEl = document.getElementById('setup-solo-shots');
        if (soloShotsEl) soloShotsEl.value = '10';
        const ammoEl = document.getElementById('setup-ammo-mode');
        if (ammoEl) ammoEl.value = 'unlimited';
        const ammoCustomEl = document.getElementById('setup-ammo-custom');
        if (ammoCustomEl) ammoCustomEl.style.display = 'none';
        const advancedDiv = document.getElementById('advanced-environment');
        if (advancedDiv) advancedDiv.style.display = 'none';

        // Reset checkboxes
        const staticTime = document.getElementById('setup-static-time');
        if (staticTime) staticTime.checked = false;
        const disableNames = document.getElementById('setup-disable-names');
        if (disableNames) disableNames.checked = false;
        const allowDrive = document.getElementById('setup-allow-drive-anytime');
        if (allowDrive) allowDrive.checked = false;

        // Clear custom ammo inputs
        document.querySelectorAll('#setup-ammo-custom input[type="number"]').forEach(el => { el.value = ''; });

        // Re-render slots with defaults (no saved data)
        renderSlotsUI();
    }
    document.getElementById('setup-start')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cfg = collectSetupConfig();
        // Persist slots to localStorage for next time
        try {
            if (cfg?.slots && Array.isArray(cfg.slots)) {
                localStorage.setItem('se.slots.v1', JSON.stringify(cfg.slots));
            }
            // Persist high-level setup choices as sticky defaults
            persistSetupSelection(cfg);
        } catch (err) {
            console.warn('[setup] failed to persist slots', err);
        }
        // Start the game first (so hasActiveGame() is true), then close the modal
        game.startNewGameWithConfig(cfg);
        closeNewGameModal();
        // Guard against any stray clicks opening Options right after we close
        suppressOptionsUntil = Date.now() + 800; // ~0.8s
    });
    // Environment preset handler
    document.getElementById('setup-environment')?.addEventListener('change', () => {
        const envEl = document.getElementById('setup-environment');
        const envValue = envEl?.value;
        const advancedDiv = document.getElementById('advanced-environment');
        const terrainEl = document.getElementById('setup-terrain');
        const themeEl = document.getElementById('setup-theme');
        const timeEl = document.getElementById('setup-time');

        // Show/hide advanced options
        if (advancedDiv) {
            advancedDiv.style.display = (envValue === 'custom') ? '' : 'none';
        }

        // Apply preset if not custom or random
        if (envValue !== 'custom' && envValue !== 'random') {
            const presets = {
                forest: { terrain: 'hilly', theme: 'forest', time: 'day' },
                desert: { terrain: 'flat', theme: 'desert', time: 'day' },
                canyon: { terrain: 'canyon', theme: 'canyon', time: 'dusk' },
                arctic: { terrain: 'hilly', theme: 'arctic', time: 'day' },
                ocean: { terrain: 'ocean', theme: 'ocean', time: 'day' },
                cave: { terrain: 'mountain', theme: 'cave', time: 'night' },
                moon: { terrain: 'hilly', theme: 'moon', time: 'night' },
                mars: { terrain: 'mountain', theme: 'mars', time: 'dusk' },
                futuristic: { terrain: 'flat', theme: 'futuristic', time: 'night' }
            };
            const preset = presets[envValue];
            if (preset) {
                if (terrainEl) terrainEl.value = preset.terrain;
                if (themeEl) themeEl.value = preset.theme;
                if (timeEl) timeEl.value = preset.time;
                renderThemePreviews();
            }
        }
        persistSetupSelection();
    });

    document.getElementById('setup-terrain')?.addEventListener('change', () => {
        const terrainEl = document.getElementById('setup-terrain');
        const themeEl = document.getElementById('setup-theme');
        // Auto-select matching theme for ocean terrain
        if (terrainEl?.value === 'ocean' && themeEl) {
            themeEl.value = 'ocean';
            renderThemePreviews();
        }
    persistSetupSelection();
    });
    document.getElementById('setup-theme')?.addEventListener('change', () => { renderThemePreviews(); persistSetupSelection(); });
    document.getElementById('setup-time')?.addEventListener('change', () => { persistSetupSelection(); });
    document.getElementById('setup-static-time')?.addEventListener('change', () => { persistSetupSelection(); });
    document.getElementById('setup-human-players')?.addEventListener('input', () => {
        renderSlotsUI();
        persistSetupSelection();
    });
    document.getElementById('setup-total-players')?.addEventListener('input', () => {
        const totalEl = document.getElementById('setup-total-players');
        const humanEl = document.getElementById('setup-human-players');
        let total = Number.parseInt(totalEl?.value || '2');
        const mode = (document.querySelector('input[name="mode"]:checked')?.value) || 'classic';
        if (mode === 'teams' && (!Number.isFinite(total) || total < 3)) {
            total = 3;
            if (totalEl) totalEl.value = '3';
            const count = document.getElementById('players-count');
            if (count) count.textContent = '3';
        }
        const humans = Math.max(0, Math.min(total, Number.parseInt(humanEl?.value || '1')));
        if (humanEl) {
            humanEl.max = String(total);
            if (Number.parseInt(humanEl.value || '0') !== humans) humanEl.value = String(humans);
        }
        renderSlotsUI();
        renderTeamsUI();
        persistSetupSelection();
    });
    // Global AI difficulty removed; per-slot difficulty only
    document.getElementById('setup-solo-targets')?.addEventListener('input', () => { persistSetupSelection(); });
    document.getElementById('setup-solo-shots')?.addEventListener('change', () => { persistSetupSelection(); });
    document.getElementById('setup-disable-names')?.addEventListener('change', () => { persistSetupSelection(); });
    document.getElementById('setup-allow-drive-anytime')?.addEventListener('change', () => { persistSetupSelection(); });
    // Ammo mode and custom counts
    const ammoModeSel = document.getElementById('setup-ammo-mode');
    const ammoCustom = document.getElementById('setup-ammo-custom');
    ammoModeSel?.addEventListener('change', () => {
        if (ammoCustom) ammoCustom.style.display = ammoModeSel.value === 'custom' ? '' : 'none';
        persistSetupSelection();
    });
    const ammoIds = ['missile','homing','heavy','nuke','emp','laser','cluster','bunker','mirv','funky','drill','acid','napalm','tracer','smoke_bomb','bouncing_bomb','flare','parachute_flare','marker_attack','marker_medic','marker_airstrike','marker_airnukes','supply_crate','shield','land_mine','toxic_gas'];

    for (const id of ammoIds) {
        document.getElementById(`ammo-${id}`)?.addEventListener('input', () => { persistSetupSelection(); });
    }
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    for (const r of modeRadios) {
        r.addEventListener('change', () => { renderTeamsUI(); persistSetupSelection(); });
    }
    const windRadios = document.querySelectorAll('input[name="wind"]');
    for (const w of windRadios) {
        w.addEventListener('change', () => { persistSetupSelection(); });
    }
    document.getElementById('skip-continue')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('skip-modal')?.classList.add('hidden'); });
    document.getElementById('skip-to-result')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('skip-modal')?.classList.add('hidden'); game.finishAIGameImmediately(); });
}

// Persist top-level New Game setup (excluding per-slot details which are stored separately)
function persistSetupSelection(explicitCfg) {
    try {
        const cfg = explicitCfg || collectSetupConfig();
        const data = {
            mode: cfg.mode,
            terrainProfile: cfg.terrainProfile,
            theme: cfg.theme,
            time: cfg.time,
            staticTime: !!cfg.staticTime,
            totalPlayers: cfg.totalPlayers,
            humanPlayers: cfg.humanPlayers,
            // aiDifficulty removed (per-slot now)
            windMode: cfg.windMode,
            soloTargets: cfg.soloTargets,
            soloShots: cfg.soloShots,
            ammoMode: cfg.ammoMode,
            ammoCounts: cfg.ammoCounts,
            disableNames: !!cfg.disableNames,
            allowDriveAnytime: !!cfg.allowDriveAnytime,
        };
        localStorage.setItem('se.setup.v1', JSON.stringify(data));
    } catch (e) {
        console.warn('[setup] Failed to persist setup defaults:', e);
    }
}

// Restore sticky New Game selections from localStorage
function applySavedSetupFromStorage() {
    let saved = null;
    try {
        const raw = localStorage.getItem('se.setup.v1');
        if (raw) saved = JSON.parse(raw);
    } catch (e) {
        console.warn('[setup] Failed to load saved setup defaults:', e);
        saved = null;
    }
    if (!saved) return;

    const setRadio = (name, value) => {
        if (value == null) return;
        const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (el) el.checked = true;
    };
    const setValue = (id, value) => {
        if (value == null) return;
        const el = document.getElementById(id);
        if (el) el.value = String(value);
    };

    // Mode and wind
    setRadio('mode', saved.mode);
    setRadio('wind', saved.windMode);
    // Terrain profile, theme, time, players, ai difficulty
    setValue('setup-terrain', saved.terrainProfile);
    setValue('setup-theme', saved.theme);
    setValue('setup-time', saved.time);
    setValue('setup-total-players', saved.totalPlayers);
    setValue('setup-human-players', saved.humanPlayers);
    // aiDifficulty removed (per-slot now)
    // Solo options
    setValue('setup-solo-targets', saved.soloTargets);
    setValue('setup-solo-shots', saved.soloShots);
    // Ammo
    setValue('setup-ammo-mode', saved.ammoMode);
    const ammoCustomEl = document.getElementById('setup-ammo-custom');
    if (ammoCustomEl) ammoCustomEl.style.display = (saved.ammoMode === 'custom') ? '' : 'none';
    if (saved.ammoCounts && typeof saved.ammoCounts === 'object') {
        for (const [k, v] of Object.entries(saved.ammoCounts)) {
            const el = document.getElementById(`ammo-${k}`);
            if (el) el.value = String(v);
        }
    }
    // Display options
    const disableNames = document.getElementById('setup-disable-names');
    if (disableNames) disableNames.checked = !!saved.disableNames;
    const allowDriveAnytime = document.getElementById('setup-allow-drive-anytime');
    if (allowDriveAnytime) allowDriveAnytime.checked = !!saved.allowDriveAnytime;
    const staticTime = document.getElementById('setup-static-time');
    if (staticTime) staticTime.checked = !!saved.staticTime;
}

// Attach click-outside-to-close and Escape-to-close for the New Game modal
function ensureNewGameModalHandlers() {
    const modal = document.getElementById('new-game-modal');
    if (!modal) return;
    if (modal.dataset.handlers === '1') return; // already wired

    // Close when pressing Escape (works even if dialog.showModal isn’t supported)
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            const isHidden = modal.classList.contains('hidden');
            if (!isHidden) {
                e.preventDefault?.();
                closeNewGameModal();
            }
        }
    };
    modal._escHandler = escHandler;
    globalThis.addEventListener('keydown', escHandler);

    // Native dialog cancel event (Esc) — prevent if no active game
    modal.addEventListener('cancel', (e) => {
        if (!hasActiveGame()) {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        closeNewGameModal();
    });

    // Native dialog close event — re-open if no active game
    modal.addEventListener('close', () => {
        if (!hasActiveGame()) {
            // Dialog was closed but no game is running — force it back open
            setTimeout(() => openNewGameModal(), 0);
        }
    });

    // Click outside modal-content closes (only if game is active)
    modal.addEventListener('click', (e) => {
        if (!hasActiveGame()) return;
        const content = modal.querySelector('.modal-content');
        if (!content) return;
        const r = content.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        if (!inside) closeNewGameModal();
    });

    modal.dataset.handlers = '1';
}

function collectSetupConfig() {
    const mode = (document.querySelector('input[name="mode"]:checked')?.value) || 'classic';
    const environment = document.getElementById('setup-environment')?.value || 'random';
    let terrainProfile = document.getElementById('setup-terrain')?.value || 'random';
    const theme = document.getElementById('setup-theme')?.value || 'random';
    const time = document.getElementById('setup-time')?.value || 'auto';

    if (environment === 'canyon') terrainProfile = 'canyon';
    if (environment === 'ocean') terrainProfile = 'ocean';

    const staticTime = !!document.getElementById('setup-static-time')?.checked;
    let totalPlayers = Number.parseInt(document.getElementById('setup-total-players')?.value || '2');
    // Teams mode requires at least 3 players
    if (mode === 'teams' && (!Number.isFinite(totalPlayers) || totalPlayers < 3)) totalPlayers = 3;
    const humanPlayers = null; // removed from UI; derived from per-slot types
    // aiDifficulty removed; per-slot AI difficulty only
    const windMode = (document.querySelector('input[name="wind"]:checked')?.value) || 'low';
    const healthMultiplier = Number.parseInt(document.querySelector('input[name="health"]:checked')?.value || '100');
    const humans = []; // roster removed; names now come from per-slot setup
    // Clamp Solo to a single player
    if (mode === 'solo') totalPlayers = 1;
    const teams = collectTeams(totalPlayers, mode);
    const slots = collectSlots(totalPlayers);
    const soloTargets = Number.parseInt(document.getElementById('setup-solo-targets')?.value || '10');
    const soloShots = (document.getElementById('setup-solo-shots')?.value || '10');
    // Ammo settings
    const ammoMode = document.getElementById('setup-ammo-mode')?.value || 'unlimited';
    const ammoCounts = {};
    if (ammoMode === 'custom') {
    const ids = ['missile','homing','heavy','nuke','emp','laser','cluster','bunker','mirv','funky','drill','acid','napalm','tracer','smoke_bomb','flare','parachute_flare','marker_attack','marker_medic','marker_airstrike','marker_airnukes','bouncing_bomb','supply_crate','shield','land_mine','toxic_gas'];
        for (const id of ids) {
            const el = document.getElementById(`ammo-${id}`);
            if (el && el.value !== '') {
                const n = Math.max(0, Math.trunc(Number(el.value)));
                ammoCounts[id] = Number.isFinite(n) ? n : 0;
            }
        }
    }
    const disableNames = !!document.getElementById('setup-disable-names')?.checked;
    const allowDriveAnytime = !!document.getElementById('setup-allow-drive-anytime')?.checked;
    const config = { mode, terrainProfile, theme, time, staticTime, totalPlayers, humanPlayers, windMode, healthMultiplier, humans, teams, slots, soloTargets, soloShots, ammoMode, ammoCounts, disableNames, allowDriveAnytime };
    // console.log('[collectSetupConfig] Collected config:', config);
    return config;
}

function renderTeamsUI() {
    const mode = (document.querySelector('input[name="mode"]:checked')?.value) || 'classic';
    const sec = document.getElementById('setup-teams-section');
    if (!sec) return;
    sec.style.display = mode === 'teams' ? '' : 'none';
    // Solo mode: hide/disable non-applicable player controls and force total players to 1
    const totalInput = document.getElementById('setup-total-players');
    const totalLabel = totalInput?.closest('label');
    const humanInput = document.getElementById('setup-human-players');
    const humanLabel = humanInput?.closest('label');
    // Global AI difficulty input removed

    if (mode === 'solo') {
        // Store previous values to restore later if switching back
        if (totalInput && totalInput.dataset.prevValue == null) {
            totalInput.dataset.prevValue = String(totalInput.value || '2');
        }
        if (humanInput && humanInput.dataset.prevValue == null) {
            humanInput.dataset.prevValue = String(humanInput.value || '1');
        }
        // ai diff removed
        // Apply Solo constraints
        if (totalInput) { totalInput.value = '1'; totalInput.disabled = true; }
        if (humanInput) { humanInput.value = '1'; humanInput.disabled = true; }
    // ai diff removed
        if (totalLabel) totalLabel.style.display = 'none';
        if (humanLabel) humanLabel.style.display = 'none';
    // ai diff removed
    } else {
        // Restore in non-solo modes
        if (totalLabel) totalLabel.style.display = '';
        if (humanLabel) humanLabel.style.display = '';
    // ai diff removed
        if (totalInput) {
            if (totalInput.dataset.prevValue != null) {
                totalInput.value = totalInput.dataset.prevValue;
                delete totalInput.dataset.prevValue;
            }
            totalInput.disabled = false;
            // In Teams mode, enforce a minimum of 3 players
            if (mode === 'teams') {
                totalInput.min = '3';
                if (Number.parseInt(totalInput.value || '0') < 3) {
                    totalInput.value = '3';
                    // Keep the stepper display (if present) in sync
                    const count = document.getElementById('players-count');
                    if (count) count.textContent = '3';
                }
            } else {
                // Reset min for other modes
                totalInput.min = '1';
            }
        }
        if (humanInput) {
            if (humanInput.dataset.prevValue != null) {
                humanInput.value = humanInput.dataset.prevValue;
                delete humanInput.dataset.prevValue;
            }
            humanInput.disabled = false;
        }
        // ai diff removed
    }
    // Solo targets/shots visibility for Solo mode
    const soloWrap = document.getElementById('solo-rounds-wrap');
    if (soloWrap) soloWrap.style.display = mode === 'solo' ? '' : 'none';
    const soloShotsWrap = document.getElementById('solo-shots-wrap');
    if (soloShotsWrap) soloShotsWrap.style.display = mode === 'solo' ? '' : 'none';
    // Rebuild slots if total players changed due to mode
    try { renderSlotsUI(); } catch {}
    if (mode !== 'teams') return;
    const total = Number.parseInt(document.getElementById('setup-total-players')?.value || '2');
    const container = document.getElementById('setup-teams');
    if (!container) return;
    const previous = Array.from(container.querySelectorAll('.team-row select')).map(s => s.value);
    container.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const row = document.createElement('div');
        row.className = 'team-row';
        const label = document.createElement('span');
        label.textContent = `Slot ${i + 1}`;
        const select = document.createElement('select');
        select.innerHTML = '<option value="A">Team A</option><option value="B">Team B</option>';
        select.value = previous[i] || (i % 2 === 0 ? 'A' : 'B');
        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
    }
}

function collectTeams(total, mode) {
    if (mode !== 'teams') return null;
    const selects = Array.from(document.querySelectorAll('#setup-teams .team-row select'));
    const teams = [];
    let countA = 0, countB = 0;
    for (let i = 0; i < total; i++) {
        const v = selects[i]?.value || (i % 2 === 0 ? 'A' : 'B');
        if (v === 'A') countA++; else countB++;
        teams.push(v);
    }
    // Clamp to 4 per team by flipping overflow to the other side
    for (let i = 0; i < total && (countA > 4 || countB > 4); i++) {
        if (teams[i] === 'A' && countA > 4) { teams[i] = 'B'; countA--; countB++; }
        else if (teams[i] === 'B' && countB > 4) { teams[i] = 'A'; countB--; countA++; }
    }
    return teams;
}

// Roster UI removed; per-slot setup supplies names/colors

function renderSlotsUI() {
    const container = document.getElementById('setup-slots');
    if (!container) return;
    const total = Number.parseInt(document.getElementById('setup-total-players')?.value || '2');
    const humansDefault = 1; // default first slot human
    const defaultAIDiff = 'medium';
    let stored = null;
    try {
        const raw = localStorage.getItem('se.slots.v1');
        if (raw) stored = JSON.parse(raw);
    } catch (e) {
        console.warn('[setup] Could not read stored slots from localStorage:', e);
        stored = null;
    }

    // Preserve previous state
    const prev = Array.from(container.querySelectorAll('.slot-row')).map(row => {
        return {
            type: row.querySelector('.slot-type')?.value || 'human',
            name: row.querySelector('.slot-name')?.value || '',
            style: row.querySelector('.slot-style')?.value || 'classic',
            color: row.querySelector('.slot-color')?.value || '',
            difficulty: row.querySelector('.slot-difficulty')?.value || defaultAIDiff
        };
    });

    container.innerHTML = '';
    const defaultColors = ['#00ff00','#ff0000','#0000ff','#ffff00','#ff00ff','#00ffff','#ffa500','#00ff88'];
    for (let i = 0; i < total; i++) {
        const row = document.createElement('div');
        row.className = 'slot-row';

        const label = document.createElement('span');
        label.textContent = `Slot ${i + 1}`;

    // Type toggle
    const typeSel = document.createElement('select');
    typeSel.className = 'slot-type';
    typeSel.innerHTML = '<option value="human">Human</option><option value="ai">AI</option>';
        const defaultType = prev[i]?.type || stored?.[i]?.type || (i < humansDefault ? 'human' : 'ai');
        typeSel.value = defaultType;

    // Human controls
        const humanWrap = document.createElement('span');
        humanWrap.className = 'slot-human';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'slot-name';
        nameInput.placeholder = `Player ${i + 1} Name`;
        nameInput.value = prev[i]?.name || stored?.[i]?.name || (i === 0 ? 'Player 1' : '');

        // Tank style with left/right arrows + live preview glyph
        const styleWrap = document.createElement('span');
        styleWrap.className = 'style-chooser';
        const stylePrev = document.createElement('span');
        stylePrev.className = 'style-preview';
        const styleLeft = document.createElement('button'); styleLeft.type = 'button'; styleLeft.textContent = '◀'; styleLeft.title = 'Previous tank style';
        const styleRight = document.createElement('button'); styleRight.type = 'button'; styleRight.textContent = '▶'; styleRight.title = 'Next tank style';
        const styles = ['classic','heavy','sleek'];
        const styleSel = document.createElement('input'); styleSel.type = 'hidden'; styleSel.className = 'slot-style';
        let styleIndex = Math.max(0, styles.indexOf(prev[i]?.style || stored?.[i]?.style || 'classic'));
        styleSel.value = styles[styleIndex];
        // Simple glyph preview by style
        const renderStyle = () => {
            const name = styles[styleIndex][0].toUpperCase() + styles[styleIndex].slice(1);
            // Show a tiny tank glyph next to name for visual representation
            let glyph = '🚜';
            if (styles[styleIndex] === 'heavy') {
                glyph = '🛡️';
            } else if (styles[styleIndex] === 'sleek') {
                glyph = '🏎️';
            }
            stylePrev.textContent = `${glyph} ${name}`;
        };
        styleLeft.addEventListener('click', () => { styleIndex = (styleIndex + styles.length - 1) % styles.length; styleSel.value = styles[styleIndex]; renderStyle(); persist(); });
        styleRight.addEventListener('click', () => { styleIndex = (styleIndex + 1) % styles.length; styleSel.value = styles[styleIndex]; renderStyle(); persist(); });
        renderStyle();
        styleWrap.appendChild(styleLeft);
        styleWrap.appendChild(stylePrev);
        styleWrap.appendChild(styleRight);
        styleWrap.appendChild(styleSel);

        // Color palette: 20 preset swatches
        const swatches = ['#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE','#FF2D55','#A2845E',
                          '#5AC8FA','#4CD964','#FFD60A','#FF9F0A','#BF5AF2','#64D2FF','#30B0C7','#FF6B6B','#51E1A7','#B2B1FF'];
        const colorWrap = document.createElement('span');
        colorWrap.className = 'color-chooser';
        const colorInput = document.createElement('input'); colorInput.type = 'hidden'; colorInput.className = 'slot-color';
        colorInput.value = prev[i]?.color || stored?.[i]?.color || defaultColors[i % defaultColors.length];
        const colorGrid = document.createElement('div'); colorGrid.className = 'color-grid';
        for (const hex of swatches) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'swatch';
            b.style.backgroundColor = hex;
            b.title = hex;
            b.addEventListener('click', () => {
                colorInput.value = hex;
                // update selected color swatch fill
                selectedSwatch.style.backgroundColor = hex;
                persist();
                // highlight selection
                const kids = Array.from(colorGrid.children);
                for (const c of kids) c.classList.remove('selected');
                b.classList.add('selected');
                colorWrap.classList.remove('open');
            });
            if (hex.toLowerCase() === (colorInput.value || '').toLowerCase()) b.classList.add('selected');
            colorGrid.appendChild(b);
        }
        const selectedSwatch = document.createElement('div');
        selectedSwatch.className = 'selected-color';
        selectedSwatch.style.backgroundColor = colorInput.value;
        selectedSwatch.title = 'Choose color';
        selectedSwatch.addEventListener('click', () => {
            colorWrap.classList.toggle('open');
        });
        colorWrap.appendChild(selectedSwatch);
        colorWrap.appendChild(colorGrid);
        colorWrap.appendChild(colorInput);

        humanWrap.appendChild(nameInput);
        humanWrap.appendChild(styleWrap);
        humanWrap.appendChild(colorWrap);

        // AI controls
    const aiWrap = document.createElement('span');
        aiWrap.className = 'slot-ai';
        // AI controls: difficulty selector
        const aiLabel = document.createElement('label');
        aiLabel.textContent = 'Difficulty:';
        aiLabel.style.marginRight = '6px';
        const diffSel = document.createElement('select');
        diffSel.className = 'slot-difficulty';
        diffSel.innerHTML = '<option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>';
        diffSel.value = prev[i]?.difficulty || stored?.[i]?.difficulty || defaultAIDiff;
        diffSel.addEventListener('change', () => { persist(); });
        aiWrap.appendChild(aiLabel);
        aiWrap.appendChild(diffSel);
        // Optional future: AI-specific style preview (hidden for now)
        const aiStyleLabel = document.createElement('span');
        aiStyleLabel.className = 'slot-ai-style';
        aiStyleLabel.textContent = '';
        aiStyleLabel.style.display = 'none';
        aiWrap.appendChild(aiStyleLabel);

        // Toggle visibility based on type
        const syncVisibility = () => {
            const isHuman = typeSel.value === 'human';
            humanWrap.style.display = isHuman ? '' : 'none';
            aiWrap.style.display = isHuman ? 'none' : '';
        };
        const persist = () => {
            try {
                const current = collectSlots(total);
                localStorage.setItem('se.slots.v1', JSON.stringify(current));
            } catch (e) {
                console.warn('[setup] Failed to persist slots to localStorage:', e);
            }
        };
        typeSel.addEventListener('change', () => { syncVisibility(); persist(); });
        nameInput.addEventListener('input', persist);
    // style buttons and palette update persist via their handlers
        syncVisibility();

        row.appendChild(label);
        row.appendChild(typeSel);
        row.appendChild(humanWrap);
        row.appendChild(aiWrap);
        container.appendChild(row);
    }
}

function collectSlots(total) {
    const container = document.getElementById('setup-slots');
    const rows = Array.from(container?.querySelectorAll('.slot-row') || []);
    const slots = [];
    for (let i = 0; i < Math.min(total, rows.length); i++) {
        const row = rows[i];
        const type = row.querySelector('.slot-type')?.value || 'human';
        if (type === 'human') {
            // Validate and sanitize player name to prevent XSS
            const rawName = row.querySelector('.slot-name')?.value || '';
            const name = validatePlayerName(rawName, `Player ${i + 1}`);
            const color = row.querySelector('.slot-color')?.value || '#00ff00';
            const style = row.querySelector('.slot-style')?.value || 'classic';
            slots.push({ type: 'human', name, color, style });
        } else {
            const difficulty = row.querySelector('.slot-difficulty')?.value || 'medium';
            const style = row.querySelector('.slot-style')?.value || 'classic';
            slots.push({ type: 'ai', difficulty, style });
        }
    }
    return slots;
}

// Wire up players stepper
document.addEventListener('DOMContentLoaded', () => {
    const dec = document.getElementById('players-dec');
    const inc = document.getElementById('players-inc');
    const count = document.getElementById('players-count');
    const hidden = document.getElementById('setup-total-players');
    const clamp = (n) => {
        const mode = (document.querySelector('input[name="mode"]:checked')?.value) || 'classic';
        const min = (mode === 'teams') ? 3 : 1;
        return Math.max(min, Math.min(8, Math.trunc(n)));
    };
    const setVal = (n) => {
        const v = clamp(n);
        if (count) count.textContent = String(v);
        if (hidden) hidden.value = String(v);
        renderSlotsUI();
        renderTeamsUI();
        persistSetupSelection();
    };
    if (hidden && count) { count.textContent = String(clamp(Number.parseInt(hidden.value || '2'))); }
    dec?.addEventListener('click', () => setVal((Number.parseInt(hidden?.value || '2') - 1)));
    inc?.addEventListener('click', () => setVal((Number.parseInt(hidden?.value || '2') + 1)));

    // Solo targets stepper (in groups of 5)
    const tDec = document.getElementById('targets-dec');
    const tInc = document.getElementById('targets-inc');
    const tCount = document.getElementById('targets-count');
    const tHidden = document.getElementById('setup-solo-targets');
    const tClamp = (n) => Math.max(5, Math.min(50, Math.trunc(n)));
    const tSet = (n) => {
        const v = tClamp(n);
        if (tCount) tCount.textContent = String(v);
        if (tHidden) tHidden.value = String(v);
        persistSetupSelection();
    };
    if (tHidden && tCount) { tCount.textContent = String(tClamp(Number.parseInt(tHidden.value || '10'))); }
    tDec?.addEventListener('click', () => tSet((Number.parseInt(tHidden?.value || '10') - 5)));
    tInc?.addEventListener('click', () => tSet((Number.parseInt(tHidden?.value || '10') + 5)));

    // Close color palettes when clicking outside
    document.addEventListener('click', (ev) => {
        const target = ev.target;
        if (!(target instanceof Element)) return;
        if (target.closest('#setup-slots .color-chooser')) return;
        const open = document.querySelectorAll('#setup-slots .color-chooser.open');
        for (const el of open) { el.classList.remove('open'); }
    });
    // Weapon select logic consolidated into graphical menu; no plain select to initialize
});

bindNewGameModalEvents();

// Sidebar drag (optional movable UI)
function makeDraggable(element, handle) {
    let offsetX = 0, offsetY = 0, dragging = false;
    handle.addEventListener('mousedown', (e) => {
        // Ignore clicks on interactive controls inside the handle
        if (e.button !== 0) return; // left click only
        if (e.target?.closest?.('button, input, select, textarea, a, [role="button"]')) {
            return;
        }
        dragging = true;
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        document.body.style.userSelect = 'none';
    });
    globalThis.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        element.style.left = `${Math.max(0, Math.min(globalThis.innerWidth - element.offsetWidth, e.clientX - offsetX))}px`;
        element.style.top = `${Math.max(0, Math.min(globalThis.innerHeight - element.offsetHeight, e.clientY - offsetY))}px`;
        element.style.right = 'auto';
        element.style.position = 'absolute';
    });
    globalThis.addEventListener('mouseup', () => {
        dragging = false;
        document.body.style.userSelect = '';
    });
}

// Collapsible game log
let uiHandlersBound = false;
function bindUI() {
    // Only structural: drag + initial collapsed state
    const gameLog = document.getElementById('game-log');
    if (gameLog) gameLog.classList.add('collapsed');
    const sidebar = document.getElementById('ui-container');
    const sidebarHandle = document.getElementById('ui-header');
    const logHeader = document.getElementById('game-log-header');
    if (sidebar && sidebarHandle) makeDraggable(sidebar, sidebarHandle);
    if (gameLog && logHeader) makeDraggable(gameLog, logHeader);
    // Initialize drive button label
    const driveBtn = document.getElementById('drive-toggle');
    if (driveBtn) {
        driveBtn.classList.toggle('active', game.driveMode);
        driveBtn.textContent = `Drive Mode: ${game.driveMode ? 'ON' : 'OFF'}`;
    }

    if (uiHandlersBound) return;
    // Wire direct event handlers once the HUD and modal controls are present.
    const angleInput = document.getElementById('angle-input');
    const powerInput = document.getElementById('power-input');
    const weaponGridToggle = document.getElementById('weapon-grid-toggle');
    const weaponMenu = document.getElementById('weapon-menu');
    const fireBtn = document.getElementById('fire-button');
    const mobileFireBtn = document.getElementById('mobile-fire');
    const clearLogBtn = document.getElementById('clear-log-button');
    const newGameBtn = document.getElementById('new-game-button');
    const openSetupBtn = document.getElementById('open-setup');
    const debugTab = document.getElementById('debug-tab');
    const restartBtn = document.getElementById('restart-button');
    // Pause button removed
    const resumeSavedBtn = document.getElementById('resume-saved-button');
    const clearSavedBtn = document.getElementById('clear-saved-button');
    // Audio controls
    const muteBtn = document.getElementById('audio-mute');
    const musicBtn = document.getElementById('music-toggle');
    const volSlider = document.getElementById('audio-volume');
    const debugToggle = document.getElementById('debug-toggle'); // sidebar button removed; kept for backward compatibility if present
    const windOverride = document.getElementById('wind-override-slider');
    const fuelSlider = document.getElementById('fuel-slider');
    const healthOverride = document.getElementById('health-override-slider');
    const gravityOverride = document.getElementById('gravity-override-slider');
    const damageOverride = document.getElementById('damage-override-slider');
    const terrainSmoothness = document.getElementById('terrain-smoothness-slider');
    const resetCheats = document.getElementById('reset-cheats');
    const collapseLogBtn = document.getElementById('toggle-log');
    const themeSelect = document.getElementById('theme-select');
    const timeSelect = document.getElementById('time-select');
    const rerollThemeBtn = document.getElementById('reroll-theme-now');
    const rerollTimeBtn = document.getElementById('reroll-time-now');
    const debrisEnabled = document.getElementById('debris-enabled');
    const debrisAmount = document.getElementById('debris-amount');
    const debrisLifetime = document.getElementById('debris-lifetime');
    const dustEnabled = document.getElementById('dust-enabled');
    const dustAmount = document.getElementById('dust-amount');
    const dustSize = document.getElementById('dust-size');
    const dustLife = document.getElementById('dust-life');
    const trajGuideToggle = document.getElementById('trajectory-guide-toggle');
    const infiniteHealthToggle = document.getElementById('infinite-health-toggle');
    const unlimitedAmmoToggle = document.getElementById('unlimited-ammo-toggle');
    const refillAmmoCurrentBtn = document.getElementById('refill-ammo-current');
    const refillAmmoAllBtn = document.getElementById('refill-ammo-all');
    // Active tank highlight controls
    const highlightEnabled = document.getElementById('highlight-enabled');
    const highlightIntensity = document.getElementById('highlight-intensity');

    // --- Debug preferences persistence ---
    const DEBUG_PREFS_KEY = 'se.debug.v1';
    function collectDebugPrefs() {
        try {
            const prefs = {
                trajectoryGuide: !!trajGuideToggle?.checked,
                theme: themeSelect?.value || 'random',
                time: timeSelect?.value || 'auto',
                windOverride: (typeof game.windOverride === 'number') ? game.windOverride : null,
                fuelSlider: fuelSlider ? Number.parseInt(fuelSlider.value) : 200,
                healthOverride: (typeof game.healthOverride === 'number') ? game.healthOverride : null,
                gravityOverride: (typeof game.gravityOverride === 'number') ? game.gravityOverride : null,
                damageMultiplier: (typeof game.damageMultiplier === 'number') ? game.damageMultiplier : 1,
                infiniteHealth: !!infiniteHealthToggle?.checked,
                unlimitedAmmo: !!unlimitedAmmoToggle?.checked,
                terrainSmoothness: terrainSmoothness ? Number.parseInt(terrainSmoothness.value) : 50,
                debris: {
                    enabled: !!debrisEnabled?.checked,
                    amount: debrisAmount ? Number.parseFloat(debrisAmount.value) : 1,
                    lifetimeSec: debrisLifetime ? Number.parseInt(debrisLifetime.value) : 10
                },
                dust: {
                    enabledOverride: (game.dustOverrideEnabled === undefined) ? null : game.dustOverrideEnabled, // null|true|false
                    amount: (typeof game.dustAmountMultiplier === 'number') ? game.dustAmountMultiplier : 1,
                    size: (typeof game.dustSizeScale === 'number') ? game.dustSizeScale : 1,
                    life: (typeof game.dustLifetimeScale === 'number') ? game.dustLifetimeScale : 1
                },
                highlight: {
                    enabled: !!highlightEnabled?.checked,
                    intensity: highlightIntensity ? Number.parseFloat(highlightIntensity.value) : 1
                }
            };
            return prefs;
        } catch { return null; }
    }
    function saveDebugPrefs() {
        try {
            const prefs = collectDebugPrefs();
            if (prefs) localStorage.setItem(DEBUG_PREFS_KEY, JSON.stringify(prefs));
        } catch {}
    }
    function loadDebugPrefs() {
        try {
            const raw = localStorage.getItem(DEBUG_PREFS_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch { return null; }
    }
    function applyDebugPrefs(p) {
        if (!p) return;
        try {
            // Trajectory guide
            if (trajGuideToggle) { trajGuideToggle.checked = !!p.trajectoryGuide; game.setTrajectoryGuide(!!p.trajectoryGuide); }
            // Theme/time
            if (themeSelect) { themeSelect.value = p.theme || 'random'; game.setThemeOverride((p.theme && p.theme !== 'random') ? p.theme : null); }
            if (timeSelect) { timeSelect.value = p.time || 'auto'; game.setTimeOfDayOverride((p.time && p.time !== 'auto') ? p.time : null); }
            // Wind override
            if (windOverride) {
                const val = (typeof p.windOverride === 'number') ? p.windOverride : 0;
                windOverride.value = String(val);
                const wv = document.getElementById('wind-override-value'); if (wv) wv.textContent = (val === 0) ? 'Off' : val.toFixed(1);
                game.setWindOverride(val === 0 ? null : val);
            }
            // Fuel
            if (fuelSlider) {
                const fv = Number.isFinite(p.fuelSlider) ? p.fuelSlider : 200;
                fuelSlider.value = String(fv);
                const label = document.getElementById('fuel-value-display');
                if (fv === 200) { if (label) label.textContent = '100% (Normal)'; game.setFuelMode('normal'); }
                else if (fv === 1000) { if (label) label.textContent = '∞ (Unlimited)'; game.setFuelMode('unlimited'); }
                else {
                    const pct = Math.round((fv / 200) * 100); if (label) label.textContent = `${pct}% (${fv})`;
                    game.setCustomFuel(fv);
                }
            }
            // Health override
            if (healthOverride) {
                const hv = (typeof p.healthOverride === 'number') ? p.healthOverride : 100;
                healthOverride.value = String(hv);
                const lab = document.getElementById('health-override-value'); if (lab) lab.textContent = String(hv);
                game.setHealthOverride(hv);
            }
            // Gravity override
            if (gravityOverride) {
                const gv = (typeof p.gravityOverride === 'number') ? p.gravityOverride : 0.3;
                gravityOverride.value = String(gv);
                const lab = document.getElementById('gravity-override-value'); if (lab) lab.textContent = gv.toFixed(2);
                game.setGravityOverride(gv);
            }
            // Damage multiplier and infinite health
            const ih = !!p.infiniteHealth;
            if (infiniteHealthToggle) infiniteHealthToggle.checked = ih;
            if (ih) { game.setDamageMultiplier(0); }
            else if (damageOverride) {
                const dv = (typeof p.damageMultiplier === 'number') ? Math.max(0.1, p.damageMultiplier) : 1;
                damageOverride.value = String(dv);
                const lab = document.getElementById('damage-override-value'); if (lab) lab.textContent = dv.toFixed(1);
                game.setDamageMultiplier(dv);
            }
            // Terrain smoothness
            if (terrainSmoothness) {
                const tv = Number.isFinite(p.terrainSmoothness) ? p.terrainSmoothness : 50;
                terrainSmoothness.value = String(tv);
                const lab = document.getElementById('terrain-smoothness-value'); if (lab) lab.textContent = String(tv);
                game.setTerrainSmoothness(tv);
            }
            // Debris
            if (debrisEnabled) debrisEnabled.checked = !!p.debris?.enabled;
            if (debrisAmount) debrisAmount.value = String(p.debris?.amount ?? 1);
            if (debrisLifetime) debrisLifetime.value = String(p.debris?.lifetimeSec ?? 10);
            if (p.debris) {
                game.debrisSystem.enabled = !!p.debris.enabled;
                const a = Number.parseFloat(p.debris.amount ?? 1); game.debrisSystem.amountMultiplier = a;
                const lv = Number.parseInt(p.debris.lifetimeSec ?? 10); game.debrisSystem.lifetimeMs = lv * 1000;
                const dav = document.getElementById('debris-amount-value'); if (dav) dav.textContent = a.toFixed(1);
                const dlv = document.getElementById('debris-lifetime-value'); if (dlv) dlv.textContent = String(lv);
            }
            // Dust
            if (dustAmount) { const v = Number.parseFloat(p.dust?.amount ?? 1); dustAmount.value = String(v); const lab = document.getElementById('dust-amount-value'); if (lab) lab.textContent = v.toFixed(1); game.setDustAmountMultiplier(v); }
            if (dustSize) { const v = Number.parseFloat(p.dust?.size ?? 1); dustSize.value = String(v); const lab = document.getElementById('dust-size-value'); if (lab) lab.textContent = v.toFixed(1); game.setDustSizeScale(v); }
            if (dustLife) { const v = Number.parseFloat(p.dust?.life ?? 1); dustLife.value = String(v); const lab = document.getElementById('dust-life-value'); if (lab) lab.textContent = v.toFixed(1); game.setDustLifetimeScale(v); }
            // Dust enabled tri-state: null=auto, true/false = forced
            if (p.dust && 'enabledOverride' in p.dust) {
                game.setDustEnabledOverride(p.dust.enabledOverride);
                // Checkbox can’t represent Auto; keep checked when auto for best UX.
                if (dustEnabled) dustEnabled.checked = (p.dust.enabledOverride !== false);
            }
            // Active tank highlight
            if (p.highlight) {
                if (highlightEnabled) { highlightEnabled.checked = !!p.highlight.enabled; game.setActiveHighlightEnabled(!!p.highlight.enabled); }
                if (highlightIntensity) {
                    const hv = Number.isFinite(p.highlight.intensity) ? p.highlight.intensity : 1;
                    highlightIntensity.value = String(hv);
                    const lab = document.getElementById('highlight-intensity-value'); if (lab) lab.textContent = hv.toFixed(1);
                    game.setActiveHighlightIntensity(hv);
                }
            }
            // Unlimited ammo
            if (unlimitedAmmoToggle) unlimitedAmmoToggle.checked = !!p.unlimitedAmmo;
            if (typeof p.unlimitedAmmo === 'boolean') game.setUnlimitedAmmoForAll(!!p.unlimitedAmmo);
            game.updateUI?.();
        } catch {}
    }

    angleInput?.addEventListener('input', (e) => {
        const raw = Number.parseInt(e.target.value);
        const v = Number.isFinite(raw) ? Math.max(0, Math.min(360, raw)) : 0;
        const valEl = document.getElementById('angle-value');
        if (valEl) valEl.textContent = `${v}°`;
        game.setAngle(v);
    });
    powerInput?.addEventListener('input', (e) => {
        const raw = Number.parseInt(e.target.value);
        const v = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
        const valEl = document.getElementById('power-value');
        if (valEl) valEl.textContent = `${v}%`;
        game.setPower(v);
    });

    // Rotation slider for submarines
    const rotationInput = document.getElementById('rotation-input');
    rotationInput?.addEventListener('input', (e) => {
        const v = Number.parseInt(e.target.value);
        const valEl = document.getElementById('rotation-value');
        if (valEl) valEl.textContent = `${v}°`;
        const currentTank = game.getCurrentTank();
        if (currentTank && currentTank.type === 'submarine' && typeof currentTank.rotation === 'number') {
            currentTank.rotation = v;
            game.updateUI?.();
        }
    });
    // No plain <select> weapon control anymore; use graphical menu only

    // Weapon menu helpers
    const weaponMeta = {
        missile: { name: 'Missile', icon: '🛰️', desc: 'Reliable unguided rocket' },
        homing: { name: 'Homing', icon: '🎯', desc: 'Guided missile (late lock)' },
        heavy: { name: 'Heavy', icon: '💥', desc: 'High-damage shell' },
        nuke: { name: 'Nuke', icon: '☢️', desc: 'Massive blast' },
        emp: { name: 'EMP', icon: '⚡', desc: 'Disables electronics' },
        laser: { name: 'Laser', icon: '🔦', desc: 'Instant beam' },
        cluster: { name: 'Cluster', icon: '🌬️', desc: 'Splits into bomblets' },
        bunker: { name: 'Bunker', icon: '🪓', desc: 'Ground penetrator' },
        mirv: { name: 'MIRV', icon: '🌟', desc: 'Multiple reentry vehicles' },
        funky: { name: 'Funky', icon: '🌀', desc: 'Chaotic path' },
        drill: { name: 'Drill', icon: '🛠️', desc: 'Removes ground' },
        acid: { name: 'Acid', icon: '🧪', desc: 'Damaging pool' },
        napalm: { name: 'Napalm', icon: '🔥', desc: 'Lingering fire' },
        tracer: { name: 'Tracer Round', icon: '🧭', desc: 'No damage; plots next path' },
        smoke_bomb: { name: 'Smoke Bomb', icon: '💨', desc: 'Defensive smoke screen' },
    bouncing_bomb: { name: 'Bouncing Bomb', icon: '🏀', desc: 'Bounces a few times, then explodes' },
    supply_crate: { name: 'Supply Crate', icon: '🎁', desc: 'Call in a supply drop (refills ammo/fuel)' },
        flare: { name: 'Flare', icon: '📍', desc: 'Light up area' },
        parachute_flare: { name: 'Para Flare', icon: '🪂', desc: 'Apex-deploy flare' },
        marker_attack: { name: 'Marker: Paratroopers', icon: '🟧', desc: 'Call paratroopers' },
        marker_medic: { name: 'Marker: Medics', icon: '🟩', desc: 'Call medics' },
        marker_airstrike: { name: 'Marker: Airstrike', icon: '🟥', desc: 'Call airstrike' },
        marker_airnukes: { name: 'Marker: Air Nukes', icon: '🟪', desc: 'Bomber run drops 3 nukes' },
        shield: { name: 'Shield', icon: '🛡️', desc: 'Reduce damage until your next turn' },
    land_mine: { name: 'Land Mine', icon: '💣', desc: 'Place a mine that detonates on enemy contact' },
    toxic_gas: { name: 'Toxic Gas', icon: '☠️', desc: 'Creates toxic cloud that damages tanks over time' },
    };

    function getWeaponRestrictionReason(w, tank, options = {}) {
        if (typeof game.getWeaponRestrictionReason === 'function') {
            return game.getWeaponRestrictionReason(w, tank, options);
        }
        return null;
    }

    function isAllowedWeapon(w, tank, options = {}) {
        return !getWeaponRestrictionReason(w, tank, options);
    }

    function currentAmmoFor(w, tank) {
        if (tank.unlimitedAmmo) return Infinity;
        return tank.getAmmo(w) || 0;
    }

    function renderWeaponMenu() {
        if (!weaponMenu) return;
        const t = game.tanks[game.currentTankIndex];
        if (!t) return;
    const order = [
            'missile','homing','heavy','nuke','emp','laser','cluster','bunker','mirv','funky','drill','acid','napalm','tracer','smoke_bomb','flare','parachute_flare','marker_attack','marker_medic','marker_airstrike','marker_airnukes',
            // Underwater-only (shown only on ocean maps)
            'torpedo','homing_torpedo','navy_seal','depth_charge','underwater_mine','sonar_pulse',
            // Utilities / specials
            'bouncing_bomb','supply_crate','shield','land_mine','toxic_gas'
        ];
        weaponMenu.innerHTML = '';
        const waterOnly = game.waterOnlyWeapons || new Set(['torpedo','homing_torpedo','depth_charge','underwater_mine','navy_seal','sonar_pulse']);
        const isOcean = !!game.isOceanMap?.();
        for (const w of order) {
            if (waterOnly.has(w) && !isOcean) continue;
            const meta = weaponMeta[w] || { name: w, icon: '❔', desc: '' };
            const restrictionReason = getWeaponRestrictionReason(w, t, { ignoreAmmo: true });
            const allowed = !restrictionReason;
            const ammo = currentAmmoFor(w, t);
            const isEmpty = !t.unlimitedAmmo && ammo <= 0;
            const disabled = !allowed || isEmpty;
            const item = document.createElement('div');
            item.className = 'weapon-item' + (disabled ? ' disabled' : '');
            item.setAttribute('role','menuitem');
            item.setAttribute('aria-disabled', disabled ? 'true' : 'false');
            item.dataset.weapon = w;
            const icon = document.createElement('div'); icon.className = 'weapon-icon'; icon.textContent = meta.icon;
            const label = document.createElement('div'); label.className = 'weapon-label';
            const name = document.createElement('div'); name.className = 'name'; name.textContent = meta.name;
            const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = meta.desc;
            label.appendChild(name); label.appendChild(desc);
            const badge = document.createElement('div'); badge.className = 'weapon-ammo';
            if (t.unlimitedAmmo) { badge.textContent = '∞'; }
            else { badge.textContent = String(ammo); if (ammo <= 0) badge.classList.add('empty'); else if (ammo <= 2) badge.classList.add('low'); }
            item.appendChild(icon); item.appendChild(label); item.appendChild(badge);
            item.addEventListener('click', () => {
                if (item.classList.contains('disabled')) return;
                game.setWeapon(w);
                game.updateUI();
                closeWeaponMenu();
                // After selection, the toggle shows current icon/name via game.updateUI
            });
            if (disabled) {
                if (!allowed) {
                    item.title = restrictionReason || 'Unavailable right now';
                } else {
                    item.title = 'Out of ammo';
                }
            }
            // Highlight current selection
            if (t.weapon === w) item.style.outline = '2px solid #00f5ff';
            weaponMenu.appendChild(item);
        }
    }

    function syncWeaponMenuState() {
        if (!weaponMenu) return;
        const t = game.tanks[game.currentTankIndex];
        if (!t) return;
        for (const item of weaponMenu.querySelectorAll('.weapon-item')) {
            const weaponKey = item.dataset.weapon;
            if (!weaponKey) continue;
            const restrictionReason = getWeaponRestrictionReason(weaponKey, t, { ignoreAmmo: true });
            const allowed = !restrictionReason;
            const ammo = currentAmmoFor(weaponKey, t);
            const isEmpty = !t.unlimitedAmmo && ammo <= 0;
            const disabled = !allowed || isEmpty;

            item.classList.toggle('disabled', disabled);
            item.setAttribute('aria-disabled', disabled ? 'true' : 'false');
            item.title = !allowed ? (restrictionReason || 'Unavailable right now') : (isEmpty ? 'Out of ammo' : '');
            item.style.outline = t.weapon === weaponKey ? '2px solid #00f5ff' : '';

            const badge = item.querySelector('.weapon-ammo');
            if (badge) {
                badge.classList.remove('low', 'empty');
                badge.textContent = t.unlimitedAmmo ? '∞' : String(ammo);
                if (!t.unlimitedAmmo) {
                    if (ammo <= 0) badge.classList.add('empty');
                    else if (ammo <= 2) badge.classList.add('low');
                }
            }
        }
    }

    function openWeaponMenu() {
        if (!weaponMenu || !weaponGridToggle) return;
        // Don't open weapon menu during animations or when input is blocked
        if (game && game.isInputBlocked && game.isInputBlocked()) return;
        renderWeaponMenu();
        // Make visible but not interactive to measure size
        weaponMenu.classList.remove('hidden');
        const prevPos = weaponMenu.style.position;
        const prevVis = weaponMenu.style.visibility;
        const prevPe = weaponMenu.style.pointerEvents;
        weaponMenu.style.position = 'fixed';
        weaponMenu.style.visibility = 'hidden';
        weaponMenu.style.pointerEvents = 'none';
        // Compute clamped position within viewport
        const tRect = weaponGridToggle.getBoundingClientRect();
        const mRect = weaponMenu.getBoundingClientRect();
        const margin = 8;
        const vw = globalThis.innerWidth || document.documentElement.clientWidth || 1024;
        const vh = globalThis.innerHeight || document.documentElement.clientHeight || 768;
        const menuW = Math.min(mRect.width || 520, vw - margin * 2);
        const menuH = Math.min(mRect.height || 360, vh - margin * 2);
        let left = Math.max(margin, Math.min(tRect.left, vw - menuW - margin));
        // Prefer placing above; if not enough space, place below
        let top = tRect.top - menuH - margin;
        if (top < margin) top = Math.min(vh - menuH - margin, tRect.bottom + margin);
        weaponMenu.style.left = `${left}px`;
        weaponMenu.style.top = `${top}px`;
        weaponMenu.style.right = 'auto';
        weaponMenu.style.bottom = 'auto';
        // Reveal interactable
        weaponMenu.style.visibility = prevVis || '';
        weaponMenu.style.pointerEvents = prevPe || '';
    weaponGridToggle.setAttribute('aria-expanded','true');
        const chooser = document.querySelector('.weapon-chooser');
        const closeOnOutside = (e) => {
            // Check if click is on the toggle button or any of its children
            const isToggleClick = weaponGridToggle && (e.target === weaponGridToggle || weaponGridToggle.contains(e.target));
            // Check if click is in the chooser container
            const isChooserClick = chooser && chooser.contains(e.target);
            // Check if click is in the menu itself
            const isMenuClick = weaponMenu && weaponMenu.contains(e.target);

            if (!isMenuClick && !isToggleClick && !isChooserClick) {
                closeWeaponMenu();
            }
        };
        weaponMenu._outside = closeOnOutside;
        // Use a small delay to prevent the same click that opened the menu from closing it
        setTimeout(() => {
            document.addEventListener('mousedown', closeOnOutside);
            document.addEventListener('touchstart', closeOnOutside, { passive: true });
        }, 50);
    }
    function closeWeaponMenu() {
        if (!weaponMenu || !weaponGridToggle) return;
        weaponMenu.classList.add('hidden');
        weaponGridToggle.setAttribute('aria-expanded','false');
        // Clear inline positioning to allow re-computation next open
        weaponMenu.style.left = '';
        weaponMenu.style.top = '';
        weaponMenu.style.right = '';
        weaponMenu.style.bottom = '';
        weaponMenu.style.position = '';
        if (weaponMenu._outside) {
            document.removeEventListener('mousedown', weaponMenu._outside);
            document.removeEventListener('touchstart', weaponMenu._outside);
            delete weaponMenu._outside;
        }
    }
    const toggleWeaponMenu = (e) => {
        e.preventDefault(); e.stopPropagation();
        // Block weapon selection during animations, turn endings, or when input is blocked
        if (game && game.isInputBlocked && game.isInputBlocked()) {
            return;
        }
        if (weaponMenu.classList.contains('hidden')) openWeaponMenu(); else closeWeaponMenu();
    };
    // Prevent double-toggle when both pointerdown and click fire on some browsers
    let lastWeaponToggleFromPointerDown = 0;
    weaponGridToggle?.addEventListener('click', (e) => {
        const now = performance.now();
        if (now - lastWeaponToggleFromPointerDown < 400) return;
        toggleWeaponMenu(e);
    });
    weaponGridToggle?.addEventListener('pointerdown', (e) => {
        // On some mobile browsers, click may be delayed or swallowed by other handlers; use pointerdown as a reliable open.
        // Only act for primary pointer (no right/middle clicks)
        if (e.button !== 0) return;
        lastWeaponToggleFromPointerDown = performance.now();
        toggleWeaponMenu(e);
    });
    // Also allow clicking the whole chooser region and ammo badge to open
    const weaponChooser = document.querySelector('.weapon-chooser');
    const ammoBadgeEl = document.getElementById('ammo-badge');
    const chooserMaybeToggle = (e) => {
        const t = e.target;
        // Ignore clicks originating inside the menu itself
        if (weaponMenu && weaponMenu.contains(t)) return;
        const insideButton = weaponGridToggle && (t === weaponGridToggle || weaponGridToggle.contains(t));
        // If inside the button and the button is enabled, let the button's own handler manage it
        if (insideButton && weaponGridToggle && !weaponGridToggle.disabled) return;
        // Otherwise, toggle from the chooser (covers case where button is disabled and swallows click)
        toggleWeaponMenu(e);
    };
    weaponChooser?.addEventListener('click', chooserMaybeToggle);
    weaponChooser?.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        chooserMaybeToggle(e);
    });
    ammoBadgeEl?.addEventListener('click', toggleWeaponMenu);

    // Keep menu in sync when UI updates
    const oldUpdate = game._updateUIImmediate.bind(game);
    game._updateUIImmediate = function() {
        oldUpdate();
        if (weaponMenu && !weaponMenu.classList.contains('hidden')) syncWeaponMenuState();
    };
    fireBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        // try { console.debug('[ui] fire button clicked', { disabled: fireBtn.disabled }); } catch (err) {}
        // Delegate gating to game.fire() for consistency
        game.fire();
    });
    mobileFireBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        // try { console.debug('[ui] mobile fire clicked', { disabled: mobileFireBtn.disabled }); } catch (err) {}
        // Delegate gating to game.fire() for consistency
        game.fire();
    });
    restartBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        // Close modal UI first to remove any overlays/backdrops
        try { closeOptionsModal(); } catch {}
        performGameReset();
    });
    clearLogBtn?.addEventListener('click', (e) => { e.preventDefault(); game.clearLog(); });
    newGameBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('game-over-modal')?.classList.add('hidden');
        openNewGameModal();
    });
    openSetupBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        // Close Options before opening New Game to avoid it resurfacing after Start
        closeOptionsModal();
        openNewGameModal();
    });
    resumeSavedBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            const raw = localStorage.getItem('se.lastGame.v1');
            if (!raw) return;
            const ok = game.loadSnapshot(JSON.parse(raw));
            if (ok) {
                document.getElementById('options-modal')?.classList.add('hidden');
                try { document.getElementById('options-modal')?.close?.(); } catch {}
                try { saveLastUIState('playing'); } catch {}
            }
        } catch (err) { console.warn('[options] resume failed', err); }
    });
    clearSavedBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        try { localStorage.removeItem('se.lastGame.v1'); } catch {}
        // Disable resume until a new save exists
        const btn = document.getElementById('resume-saved-button');
        if (btn) btn.disabled = true;
    });

    // Initialize audio controls from AV state (fallback to storage)
    try {
        const vol = (av?.masterVolume === undefined || av?.masterVolume === null)
            ? Number.parseFloat(localStorage.getItem('se.volume') || '0.7')
            : av.masterVolume;
        if (volSlider && Number.isFinite(vol)) volSlider.value = String(Math.round(vol * 100));
        const muted = (av?.muted === undefined || av?.muted === null)
            ? (localStorage.getItem('se.muted') === '1')
            : !!av.muted;
        if (muteBtn) muteBtn.textContent = muted ? 'Unmute' : 'Mute';
        const musicOn = (av?.musicOn === undefined || av?.musicOn === null)
            ? ((localStorage.getItem('se.musicOn') ?? '1') !== '0')
            : !!av.musicOn;
        if (musicBtn) musicBtn.textContent = `Music: ${musicOn ? 'ON' : 'OFF'}`;
    } catch {}

    muteBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        av?.unlockAudio?.();
        const muted = av?.toggleMute?.();
        if (muteBtn && typeof muted === 'boolean') muteBtn.textContent = muted ? 'Unmute' : 'Mute';
    });
    musicBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        av?.unlockAudio?.();
        const on = av?.toggleMusic?.();
        if (musicBtn && typeof on === 'boolean') musicBtn.textContent = `Music: ${on ? 'ON' : 'OFF'}`;
    });
    volSlider?.addEventListener('input', (e) => {
        const v = Math.max(0, Math.min(100, Number.parseInt(e.target.value || '70')));
        av?.unlockAudio?.();
        av?.setMasterVolume01?.(v / 100);
    });

    // Remote Command 'Game Controls…' button removed; HUD provides controls on main screen.

    // --- Game Options modal wiring ---
    function openOptionsModal() {
        const modal = document.getElementById('options-modal');
        if (!modal) return;
        try { if ('showModal' in modal && !modal.open) modal.showModal(); } catch {}
        modal.classList.remove('hidden');
        activateModalA11y(modal, '#options-close');
        // Pause gameplay while Options is open
        try { game.setPaused(true, 'options-modal'); } catch {}
        attachOptionsModalHandlers();
        try { saveLastUIState('options'); } catch {}
    }
    function closeOptionsModal() {
        const modal = document.getElementById('options-modal');
        if (!modal) return;
        try { modal.close?.(); } catch {}
        modal.classList.add('hidden');
        deactivateModalA11y(modal);
        // Clear the options pause reason. Other active reasons (blur/hidden) stay in effect.
        try { game.setPaused(false, 'options-modal'); } catch {}
        try { saveLastUIState('playing'); } catch {}
    }
    function attachOptionsModalHandlers() {
        const modal = document.getElementById('options-modal');
        if (!modal || modal.dataset.handlers === '1') return;
        attachModalInteractions(modal, closeOptionsModal, { closeButtonId: 'options-close', cancelable: true });
        // Ensure buttons inside the modal are wired even if bindUI hasn't run yet
        const openSetup = document.getElementById('open-setup');
        if (openSetup && openSetup.dataset.bound !== '1') {
            openSetup.addEventListener('click', (e) => {
                e.preventDefault();
                // Close Options before opening New Game to avoid it resurfacing after Start
                closeOptionsModal();
                openNewGameModal();
            });
            openSetup.dataset.bound = '1';
        }
        const restart = document.getElementById('restart-button');
        if (restart && restart.dataset.bound !== '1') {
            restart.addEventListener('click', (e) => {
                e.preventDefault();
                try { closeOptionsModal(); } catch {}
                performGameReset();
            });
            restart.dataset.bound = '1';
        }
        // Resume/Clear saved game
        const resumeSaved = document.getElementById('resume-saved-button');
        if (resumeSaved && resumeSaved.dataset.bound !== '1') {
            resumeSaved.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    const raw = localStorage.getItem('se.lastGame.v1');
                    if (!raw) return;
                    const ok = game.loadSnapshot(JSON.parse(raw));
                    if (ok) { try { modal.close?.(); } catch {}; modal.classList.add('hidden'); }
                } catch (err) { console.warn('[options] resume failed', err); }
            });
            resumeSaved.dataset.bound = '1';
        }
        const clearSaved = document.getElementById('clear-saved-button');
        if (clearSaved && clearSaved.dataset.bound !== '1') {
            clearSaved.addEventListener('click', (e) => {
                e.preventDefault();
                try { localStorage.removeItem('se.lastGame.v1'); } catch {}
                const btn = document.getElementById('resume-saved-button');
                if (btn) btn.disabled = true;
            });
            clearSaved.dataset.bound = '1';
        }
        // Toggle resume button enabled state based on presence of saved snapshot
        try {
            const hasSave = !!localStorage.getItem('se.lastGame.v1');
            const rbtn = document.getElementById('resume-saved-button');
            if (rbtn) rbtn.disabled = !hasSave;
        } catch {}
        // Restore preference toggle
        try {
            const cb = document.getElementById('restore-state-toggle');
            if (cb && cb.dataset.bound !== '1') {
                cb.checked = getRestoreEnabled();
                cb.addEventListener('change', () => setRestoreEnabled(cb.checked));
                cb.dataset.bound = '1';
            }
        } catch {}
        modal.dataset.handlers = '1';
    }
    // Left edge tabs: Game Options and Game Log
    const optionsTab = document.getElementById('options-tab');
    const bindEdgeTabAction = (el, action) => {
        if (!el) return;
        const invoke = (e) => { e.preventDefault?.(); action(); };
        el.addEventListener('click', invoke);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') invoke(e);
        });
    };
    const attachModalInteractions = (modal, closeFn, options = {}) => {
        if (!modal) return;
        const { closeButtonId = null, cancelable = false } = options;
        if (closeButtonId) {
            document.getElementById(closeButtonId)?.addEventListener('click', (e) => {
                e.preventDefault();
                closeFn();
            });
        }
        const esc = (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                e.preventDefault?.();
                closeFn();
            }
        };
        modal._escHandler = esc;
        globalThis.addEventListener('keydown', esc);
        if (cancelable) {
            const cancelHandler = (e) => {
                e.preventDefault();
                closeFn();
            };
            modal.addEventListener('cancel', cancelHandler);
            modal._cancelHandler = cancelHandler;
        }
        modal.addEventListener('click', (e) => {
            const content = modal.querySelector('.modal-content');
            if (!content) return;
            const r = content.getBoundingClientRect();
            const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            if (!inside) closeFn();
        });
    };
    bindEdgeTabAction(optionsTab, () => {
        if (Date.now() < suppressOptionsUntil) return;
        openOptionsModal();
    });
    const logTab = document.getElementById('log-tab');
    bindEdgeTabAction(logTab, () => { openLogModal(); });
    const volumeTab = document.getElementById('volume-tab');
    bindEdgeTabAction(volumeTab, () => { openVolumeModal(); });
    const restartTab = document.getElementById('restart-tab');
    bindEdgeTabAction(restartTab, () => { openRestartModal(); });

    // Global ESC: open Game Options during gameplay when no modal is open
    globalThis.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        // If any modal is open, let its own ESC handler close it instead
        const anyOpen = ['options-modal','debug-modal','log-modal','volume-modal','restart-modal','new-game-modal','game-over-modal','auto-restart-modal']
            .some(id => {
                const m = document.getElementById(id);
                return m && !m.classList.contains('hidden');
            });
        if (anyOpen) return;
        // Don’t open Options immediately after closing to avoid flicker
        if (Date.now() < suppressOptionsUntil) return;
        e.preventDefault();
        openOptionsModal();
    });
    // Debug modal using <dialog>
    let debugMenuOriginalParent = null;
    let debugMenuNextSibling = null;
    function attachDebugModalHandlers() {
        const modal = document.getElementById('debug-modal');
        if (!modal || modal.dataset.handlers === '1') return;
        attachModalInteractions(modal, closeDebugModal, { closeButtonId: 'debug-modal-close' });
        modal.dataset.handlers = '1';
    }
    function openDebugModal() {
        const modal = document.getElementById('debug-modal');
        const body = document.getElementById('debug-modal-body');
        const menu = document.getElementById('debug-menu');
        if (!modal || !body || !menu) return;
        // Move the existing #debug-menu into the dialog body
        if (menu.parentElement !== body) {
            debugMenuOriginalParent = menu.parentElement;
            debugMenuNextSibling = menu.nextSibling;
            body.appendChild(menu);
        }
        menu.classList.remove('hidden');
        try { if ('showModal' in modal && !modal.open) modal.showModal(); } catch {}
        modal.classList.remove('hidden');
        activateModalA11y(modal, '#debug-modal-close');
        attachDebugModalHandlers();
        setTimeout(() => document.getElementById('trajectory-guide-toggle')?.focus(), 0);
    }

    // Game Log modal using <dialog>
    let gameLogOriginalParent = null;
    let gameLogNextSibling = null;
    function attachLogModalHandlers() {
        const modal = document.getElementById('log-modal');
        if (!modal || modal.dataset.handlers === '1') return;
        attachModalInteractions(modal, closeLogModal, { closeButtonId: 'log-modal-close' });
        modal.dataset.handlers = '1';
    }
    function openLogModal() {
        const modal = document.getElementById('log-modal');
        const body = document.getElementById('log-modal-body');
        const log = document.getElementById('game-log');
        if (!modal || !body || !log) return;
        // Move #game-log into the dialog body
        if (log.parentElement !== body) {
            gameLogOriginalParent = log.parentElement;
            gameLogNextSibling = log.nextSibling;
            body.appendChild(log);
            // Expand log by default when modal is open
            try { log.classList.remove('collapsed'); } catch {}
        }
        try { if ('showModal' in modal && !modal.open) modal.showModal(); } catch {}
        modal.classList.remove('hidden');
        activateModalA11y(modal, '#log-modal-close');
        attachLogModalHandlers();
    }
    function closeLogModal() {
        const modal = document.getElementById('log-modal');
        const log = document.getElementById('game-log');
        if (!modal || !log) return;
        // Restore #game-log back to its original sidebar location
        if (gameLogOriginalParent) {
            try {
                if (gameLogNextSibling) {
                    gameLogNextSibling.before(log);
                } else {
                    gameLogOriginalParent.appendChild(log);
                }
            } catch {}
        }
        try { modal.close?.(); } catch {}
        modal.classList.add('hidden');
        deactivateModalA11y(modal);
    }

    // Volume modal using <dialog>
    function attachVolumeModalHandlers() {
        const modal = document.getElementById('volume-modal');
        if (!modal || modal.dataset.handlers === '1') return;
        attachModalInteractions(modal, closeVolumeModal, { closeButtonId: 'volume-modal-close' });

        // Wire up volume controls
        const masterSlider = document.getElementById('master-volume-slider');
        const masterValue = document.getElementById('master-volume-value');
        const sfxSlider = document.getElementById('sfx-volume-slider');
        const sfxValue = document.getElementById('sfx-volume-value');
        const musicSlider = document.getElementById('music-volume-slider');
        const musicValue = document.getElementById('music-volume-value');
        const testSoundBtn = document.getElementById('test-sound-btn');
        const musicToggleBtn = document.getElementById('music-toggle-new');
        const muteAllBtn = document.getElementById('mute-all-btn');
        const unmuteAllBtn = document.getElementById('unmute-all-btn');

        // Load saved values from localStorage
        try {
            const savedMaster = localStorage.getItem('se.volume.master');
            const savedSfx = localStorage.getItem('se.volume.sfx');
            const savedMusic = localStorage.getItem('se.volume.music');
            const savedMusicOn = localStorage.getItem('se.music.enabled');

            if (savedMaster !== null && masterSlider) masterSlider.value = savedMaster;
            if (savedSfx !== null && sfxSlider) sfxSlider.value = savedSfx;
            if (savedMusic !== null && musicSlider) musicSlider.value = savedMusic;
            if (savedMusicOn !== null && musicToggleBtn) {
                const isOn = savedMusicOn === 'true';
                musicToggleBtn.textContent = isOn ? 'Music: ON' : 'Music: OFF';
            }
        } catch {}

        // Master volume slider
        masterSlider?.addEventListener('input', (e) => {
            const val = e.target.value;
            if (masterValue) masterValue.textContent = `${val}%`;
            try { localStorage.setItem('se.volume.master', val); } catch {}
            // Update audio system if available
            if (av && av.setMasterVolume) av.setMasterVolume(val / 100);
        });

        // SFX volume slider
        sfxSlider?.addEventListener('input', (e) => {
            const val = e.target.value;
            if (sfxValue) sfxValue.textContent = `${val}%`;
            try { localStorage.setItem('se.volume.sfx', val); } catch {}
            // Update audio system if available
            if (av && av.setSfxVolume) av.setSfxVolume(val / 100);
        });

        // Music volume slider
        musicSlider?.addEventListener('input', (e) => {
            const val = e.target.value;
            if (musicValue) musicValue.textContent = `${val}%`;
            try { localStorage.setItem('se.volume.music', val); } catch {}
            // Update audio system if available
            if (av && av.setMusicVolume) av.setMusicVolume(val / 100);
        });

        // Test sound button
        testSoundBtn?.addEventListener('click', () => {
            // Play a test explosion sound
            if (av && av.playExplosion) {
                av.playExplosion('missile', 0.8);
            }
        });

        // Music toggle button
        musicToggleBtn?.addEventListener('click', () => {
            const currentText = musicToggleBtn.textContent;
            const isOn = currentText.includes('ON');
            const newState = !isOn;
            musicToggleBtn.textContent = newState ? 'Music: ON' : 'Music: OFF';
            try { localStorage.setItem('se.music.enabled', String(newState)); } catch {}
            // Update audio system if available
            if (av) {
                if (newState && av.playMusic) av.playMusic();
                else if (!newState && av.stopMusic) av.stopMusic();
            }
        });

        // Mute all button
        muteAllBtn?.addEventListener('click', () => {
            if (masterSlider) masterSlider.value = 0;
            if (sfxSlider) sfxSlider.value = 0;
            if (musicSlider) musicSlider.value = 0;
            if (masterValue) masterValue.textContent = '0%';
            if (sfxValue) sfxValue.textContent = '0%';
            if (musicValue) musicValue.textContent = '0%';
            try {
                localStorage.setItem('se.volume.master', '0');
                localStorage.setItem('se.volume.sfx', '0');
                localStorage.setItem('se.volume.music', '0');
            } catch {}
            if (av) {
                if (av.setMasterVolume) av.setMasterVolume(0);
                if (av.setSfxVolume) av.setSfxVolume(0);
                if (av.setMusicVolume) av.setMusicVolume(0);
            }
        });

        // Unmute all button
        unmuteAllBtn?.addEventListener('click', () => {
            if (masterSlider) masterSlider.value = 70;
            if (sfxSlider) sfxSlider.value = 70;
            if (musicSlider) musicSlider.value = 50;
            if (masterValue) masterValue.textContent = '70%';
            if (sfxValue) sfxValue.textContent = '70%';
            if (musicValue) musicValue.textContent = '50%';
            try {
                localStorage.setItem('se.volume.master', '70');
                localStorage.setItem('se.volume.sfx', '70');
                localStorage.setItem('se.volume.music', '50');
            } catch {}
            if (av) {
                if (av.setMasterVolume) av.setMasterVolume(0.7);
                if (av.setSfxVolume) av.setSfxVolume(0.7);
                if (av.setMusicVolume) av.setMusicVolume(0.5);
            }
        });

        modal.dataset.handlers = '1';
    }

    function openVolumeModal() {
        const modal = document.getElementById('volume-modal');
        if (!modal) return;
        try { if ('showModal' in modal && !modal.open) modal.showModal(); } catch {}
        modal.classList.remove('hidden');
        activateModalA11y(modal, '#volume-modal-close');
        attachVolumeModalHandlers();
    }

    function closeVolumeModal() {
        const modal = document.getElementById('volume-modal');
        if (!modal) return;
        try { modal.close?.(); } catch {}
        modal.classList.add('hidden');
        deactivateModalA11y(modal);
    }

    // Restart modal using <dialog>
    function attachRestartModalHandlers() {
        const modal = document.getElementById('restart-modal');
        if (!modal || modal.dataset.handlers === '1') return;
        attachModalInteractions(modal, closeRestartModal, { closeButtonId: 'restart-modal-close' });

        // Restart Now button
        document.getElementById('restart-now-button')?.addEventListener('click', (e) => {
            e.preventDefault();
            closeRestartModal();
            restartGame();
        });

        // Note: Auto-restart checkbox is handled by setupAutoRestartHandlers()

        modal.dataset.handlers = '1';
    }

    function openRestartModal() {
        const modal = document.getElementById('restart-modal');
        if (!modal) return;
        try { if ('showModal' in modal && !modal.open) modal.showModal(); } catch {}
        modal.classList.remove('hidden');
        activateModalA11y(modal, '#restart-modal-close');
        attachRestartModalHandlers();

        // Sync checkbox with current setting
        const checkbox = document.getElementById('auto-restart-checkbox');
        if (checkbox) {
            const saved = localStorage.getItem('auto-restart-enabled');
            checkbox.checked = saved === 'true';
        }
    }

    function closeRestartModal() {
        const modal = document.getElementById('restart-modal');
        if (!modal) return;
        try { modal.close?.(); } catch {}
        modal.classList.add('hidden');
        deactivateModalA11y(modal);
    }

    function closeDebugModal() {
        const modal = document.getElementById('debug-modal');
        const menu = document.getElementById('debug-menu');
        if (!modal || !menu) return;
        try { modal.close?.(); } catch {}
        modal.classList.add('hidden');
        // Restore #debug-menu into sidebar
        if (debugMenuOriginalParent) {
            try {
                if (debugMenuNextSibling && debugMenuNextSibling.parentElement === debugMenuOriginalParent) {
                    debugMenuNextSibling.before(menu);
                } else {
                    debugMenuOriginalParent.appendChild(menu);
                }
            } catch {}
        }
        deactivateModalA11y(modal);
        menu.classList.add('hidden');
    }
    debugToggle?.addEventListener('click', (e) => { e.preventDefault(); openDebugModal(); });
    bindEdgeTabAction(debugTab, () => { openDebugModal(); });
    // Sidebar collapse removed; header remains draggable only
    collapseLogBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const log = document.getElementById('game-log');
        if (log) {
            log.classList.toggle('collapsed');
            collapseLogBtn.textContent = log.classList.contains('collapsed') ? '▸' : '▾';
        }
    });
    // footer toggle removed
    document.getElementById('drive-toggle')?.addEventListener('click', (e) => {
        e.preventDefault();
        game.toggleDriveMode();
        const btn = document.getElementById('drive-toggle');
        if (btn) {
            btn.classList.toggle('active', game.driveMode);
            btn.textContent = `Drive Mode: ${game.driveMode ? 'ON' : 'OFF'}`;
        }
    });
    windOverride?.addEventListener('input', (e) => {
        const value = Number.parseFloat(e.target.value);
        const label = document.getElementById('wind-override-value');
        if (value === 0) {
            if (label) label.textContent = 'Off';
            game.setWindOverride(null);
        } else {
            if (label) label.textContent = value.toFixed(1);
            game.setWindOverride(value);
        }
        saveDebugPrefs();
    });
    fuelSlider?.addEventListener('input', (e) => {
        const value = Number.parseInt(e.target.value);
        const label = document.getElementById('fuel-value-display');
        if (value === 200) {
            if (label) label.textContent = '100% (Normal)';
            game.setFuelMode('normal');
        } else if (value === 1000) {
            if (label) label.textContent = '∞ (Unlimited)';
            game.setFuelMode('unlimited');
        } else {
            // Show both percent equivalent relative to Normal baseline and raw units for clarity
            const pctOfNormal = Math.round((value / 200) * 100);
            if (label) label.textContent = `${pctOfNormal}% (${value})`;
            game.setCustomFuel(value);
        }
        saveDebugPrefs();
    });
    healthOverride?.addEventListener('input', (e) => {
        const value = Number.parseInt(e.target.value);
        const label = document.getElementById('health-override-value');
        if (label) label.textContent = String(value);
        game.setHealthOverride(value);
        saveDebugPrefs();
    });
    gravityOverride?.addEventListener('input', (e) => {
        const value = Number.parseFloat(e.target.value);
        const label = document.getElementById('gravity-override-value');
        if (label) label.textContent = value.toFixed(2);
        game.setGravityOverride(value);
        saveDebugPrefs();
    });
    damageOverride?.addEventListener('input', (e) => {
        const value = Number.parseFloat(e.target.value);
        const label = document.getElementById('damage-override-value');
        if (label) label.textContent = value.toFixed(1);
        game.setDamageMultiplier(value);
        if (infiniteHealthToggle) infiniteHealthToggle.checked = (value === 0);
        saveDebugPrefs();
    });
    terrainSmoothness?.addEventListener('input', (e) => {
        const value = Number.parseInt(e.target.value);
        const label = document.getElementById('terrain-smoothness-value');
        if (label) label.textContent = String(value);
        game.setTerrainSmoothness(value);
        saveDebugPrefs();
    });
    debrisEnabled?.addEventListener('change', (e) => {
        game.debrisSystem.enabled = !!e.target.checked;
        saveDebugPrefs();
    });
    debrisAmount?.addEventListener('input', (e) => {
        const v = Number.parseFloat(e.target.value);
        const label = document.getElementById('debris-amount-value');
        if (label) label.textContent = v.toFixed(1);
        game.debrisSystem.amountMultiplier = v;
        saveDebugPrefs();
    });
    debrisLifetime?.addEventListener('input', (e) => {
        const v = Number.parseInt(e.target.value);
        const label = document.getElementById('debris-lifetime-value');
        if (label) label.textContent = String(v);
        game.debrisSystem.lifetimeMs = v * 1000;
        saveDebugPrefs();
    });
    dustEnabled?.addEventListener('change', (e) => {
        const on = !!e.target.checked;
        // null = auto; checkbox maps to forced on/off; use Shift+click to set Auto
        const auto = e.shiftKey;
        if (auto) {
            game.setDustEnabledOverride(null);
            // Reflect back to checkbox: when Auto, keep checkbox checked but show (Auto) in log
        } else {
            game.setDustEnabledOverride(on);
        }
        saveDebugPrefs();
    });
    dustAmount?.addEventListener('input', (e) => {
        const v = Number.parseFloat(e.target.value);
        const label = document.getElementById('dust-amount-value');
        if (label) label.textContent = v.toFixed(1);
        game.setDustAmountMultiplier(v);
        saveDebugPrefs();
    });
    dustSize?.addEventListener('input', (e) => {
        const v = Number.parseFloat(e.target.value);
        const label = document.getElementById('dust-size-value');
        if (label) label.textContent = v.toFixed(1);
        game.setDustSizeScale(v);
        saveDebugPrefs();
    });
    dustLife?.addEventListener('input', (e) => {
        const v = Number.parseFloat(e.target.value);
        const label = document.getElementById('dust-life-value');
        if (label) label.textContent = v.toFixed(1);
        game.setDustLifetimeScale(v);
        saveDebugPrefs();
    });
    themeSelect?.addEventListener('change', (e) => {
        const v = e.target.value;
        game.setThemeOverride(v === 'random' ? null : v);
        saveDebugPrefs();
    });
    timeSelect?.addEventListener('change', (e) => {
        const v = e.target.value;
        game.setTimeOfDayOverride(v === 'auto' ? null : v);
        saveDebugPrefs();
    });
    rerollThemeBtn?.addEventListener('click', (e) => { e.preventDefault(); game.rerollThemeNow(); });
    rerollTimeBtn?.addEventListener('click', (e) => { e.preventDefault(); game.rerollTimeNow(); });
    trajGuideToggle?.addEventListener('change', (e) => {
        game.setTrajectoryGuide(!!e.target.checked);
        saveDebugPrefs();
    });
    infiniteHealthToggle?.addEventListener('change', (e) => {
        const on = !!e.target.checked;
        game.setDamageMultiplier(on ? 0 : 1);
        if (!on && damageOverride) {
            // keep slider value authoritative when turning infinite off
            const v = Number.parseFloat(damageOverride.value || '1');
            game.setDamageMultiplier(v);
            const lab = document.getElementById('damage-override-value'); if (lab) lab.textContent = v.toFixed(1);
        }
        saveDebugPrefs();
    });
    unlimitedAmmoToggle?.addEventListener('change', (e) => {
        const on = !!e.target.checked;
        game.setUnlimitedAmmoForAll(on);
        saveDebugPrefs();
    });
    refillAmmoCurrentBtn?.addEventListener('click', (e) => { e.preventDefault(); game.refillAmmo(false); });
    refillAmmoAllBtn?.addEventListener('click', (e) => { e.preventDefault(); game.refillAmmo(true); });
    // Highlight controls
    highlightEnabled?.addEventListener('change', (e) => {
        const on = !!e.target.checked;
        game.setActiveHighlightEnabled(on);
        saveDebugPrefs();
    });
    highlightIntensity?.addEventListener('input', (e) => {
        const v = Number.parseFloat(e.target.value);
        const lab = document.getElementById('highlight-intensity-value'); if (lab) lab.textContent = v.toFixed(1);
        game.setActiveHighlightIntensity(v);
        saveDebugPrefs();
    });
    // Pause modal removed; no pause button handlers
    resetCheats?.addEventListener('click', (e) => {
        e.preventDefault();

        // Reset all UI controls to defaults
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        setVal('wind-override-slider', 0);
        const wv = document.getElementById('wind-override-value'); if (wv) wv.textContent = 'Off';
        setVal('fuel-slider', 200);
        const fv = document.getElementById('fuel-value-display'); if (fv) fv.textContent = '100% (Normal)';
        setVal('health-override-slider', 100);
        const hv = document.getElementById('health-override-value'); if (hv) hv.textContent = '100';
        setVal('gravity-override-slider', 0.3);
        const gv = document.getElementById('gravity-override-value'); if (gv) gv.textContent = '0.30';
        setVal('damage-override-slider', 1);
        const dv = document.getElementById('damage-override-value'); if (dv) dv.textContent = '1.0';
        setVal('terrain-smoothness-slider', 50);
        const tv = document.getElementById('terrain-smoothness-value'); if (tv) tv.textContent = '50';
        const de = document.getElementById('debris-enabled'); if (de) de.checked = true;
        setVal('debris-amount', 1);
        const dav = document.getElementById('debris-amount-value'); if (dav) dav.textContent = '1.0';
        setVal('debris-lifetime', 10);
        const dlv = document.getElementById('debris-lifetime-value'); if (dlv) dlv.textContent = '10';
        const dusE = document.getElementById('dust-enabled'); if (dusE) dusE.checked = true;
        setVal('dust-amount', 1);
        const dusA = document.getElementById('dust-amount-value'); if (dusA) dusA.textContent = '1.0';
        setVal('dust-size', 1);
        const dusS = document.getElementById('dust-size-value'); if (dusS) dusS.textContent = '1.0';
        setVal('dust-life', 1);
        const dusL = document.getElementById('dust-life-value'); if (dusL) dusL.textContent = '1.0';
        setVal('theme-select', 'random');
        setVal('time-select', 'auto');

        // Reset trajectory guide and cheat toggles
        if (trajGuideToggle) trajGuideToggle.checked = false;
        if (infiniteHealthToggle) infiniteHealthToggle.checked = false;
        if (unlimitedAmmoToggle) unlimitedAmmoToggle.checked = false;

        // Reset game state
        game.resetAllCheats();

        // Save defaults to localStorage and show confirmation
        saveDebugPrefs();
        game.addLog('Debug settings reset to defaults', 'info');

        // console.log('[Debug] Settings reset to defaults and saved to localStorage');
    });
    uiHandlersBound = true;

    // Touch HUD: joystick and angle dial
    setupTouchControls();

    // Apply any persisted debug preferences after wiring handlers
    try { applyDebugPrefs(loadDebugPrefs()); } catch {}
}

// Bind once as soon as the HUD controls exist.
let uiBound = false;
function tryBindOnce() {
    if (uiBound) return;
    const hasEssentialControls = document.getElementById('weapon-grid-toggle')
        || document.getElementById('fire-button')
        || document.getElementById('angle-input')
        || document.getElementById('power-input');
    if (!hasEssentialControls) return; // wait until DOM is ready enough
    uiBound = true;
    try { bindUI(); console.info('[ui] controls bound'); } catch (e) { console.warn('[ui] bind failed:', e); }
}
document.addEventListener('sidebar:mounted', tryBindOnce);
document.addEventListener('DOMContentLoaded', () => {
    // Try immediately after DOM ready, and a couple of retries for late-inserted nodes
    setTimeout(tryBindOnce, 0);
    setTimeout(tryBindOnce, 150);
    setTimeout(tryBindOnce, 500);
});
// Final safety: bind on window load if still not bound
window.addEventListener('load', tryBindOnce);
window.addEventListener('load', () => {
    // If still not bound for any reason, bind directly as a last resort
    if (!uiBound) {
        uiBound = true;
        try { bindUI(); console.info('[ui] bound via final load fallback'); } catch (e) { console.error('[ui] final load bind failed', e); }
    }
});

// Ultra-defensive: if nothing bound yet, bind on first user interaction
function ensureBoundOnInteractionOnce() {
    if (!uiBound) {
        try { tryBindOnce(); } catch (e) { console.warn('[ui] late bind on interaction failed', e); }
    }
}
document.addEventListener('pointerdown', ensureBoundOnInteractionOnce, { capture: true, once: true });
document.addEventListener('click', ensureBoundOnInteractionOnce, { capture: true, once: true });
document.addEventListener('touchstart', ensureBoundOnInteractionOnce, { capture: true, once: true, passive: true });


// Keyboard controls (robust, ignores typing in inputs)
function isFormTarget(target) {
    if (!target) return false;
    const t = target;
    // When the debug modal is open, treat as if focus is in a form to block game keys
    if (document.getElementById('debug-modal-overlay')?.classList.contains('show')) return true;
    if (t.isContentEditable === true) return true;
    if (t.tagName === 'TEXTAREA') return true;
    if (t.tagName === 'INPUT') {
        const type = (t.getAttribute('type') || '').toLowerCase();
        return type === 'text' || type === 'number' || type === 'email' || type === 'password' || type === 'search';
    }
    return false;
}

function syncAnglePowerUI() {
    const currentTank = game.getCurrentTank();
    if (!currentTank) return;
    const angleEl = document.getElementById('angle-input');
    const angleValEl = document.getElementById('angle-value');
    const powerEl = document.getElementById('power-input');
    const powerValEl = document.getElementById('power-value');
    const rotationEl = document.getElementById('rotation-input');
    const rotationValEl = document.getElementById('rotation-value');
    const rotationWrapEl = document.querySelector('.rotation-slider-wrap');

    if (angleEl) angleEl.value = String(((currentTank.angle % 360) + 360) % 360);
    if (angleValEl) angleValEl.textContent = (((currentTank.angle % 360) + 360) % 360) + '°';
    if (powerEl) powerEl.value = currentTank.power;
    if (powerValEl) powerValEl.textContent = currentTank.power + '%';

    // Show/hide rotation slider for submarines
    if (currentTank.type === 'submarine' && typeof currentTank.rotation === 'number') {
        if (rotationWrapEl) rotationWrapEl.style.display = '';
        if (rotationEl) rotationEl.value = String(currentTank.rotation);
        if (rotationValEl) rotationValEl.textContent = currentTank.rotation + '°';
    } else {
        if (rotationWrapEl) rotationWrapEl.style.display = 'none';
    }
}

function isGameInputBlocked() {
    if (game.mode === 'realtime') {
        return game.gameOver || game.paused;
    }
    return game.gameOver || game.isAnimating || game.paused || game.turnEnding || game.holdingForSupport;
}
function getCurrentHumanTank() {
    const t = game.getCurrentTank();
    if (!t || t.isAI) return null;
    return t;
}

function onKeyDown(e) {
    // Ignore if typing in UI controls
    if (isFormTarget(e.target)) return;

    // Escape key opens Game Options menu
    if (e.key === 'Escape') {
        const modal = document.getElementById('game-controls-modal');
        if (modal && !modal.open) {
            try { modal.showModal(); } catch {}
            modal?.classList.remove('hidden');
        }
        e.preventDefault();
        return;
    }

    // Prevent page scroll when using game keys
    const scrollKeys = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    if (scrollKeys.has(e.key)) e.preventDefault();

    if (isGameInputBlocked()) return;
    const currentTank = getCurrentHumanTank();
    if (!currentTank) return;

    const key = e.key;
    const isKey = (v) => key === v;
    const isAny = (...vals) => vals.some(isKey);
    const isLeft = isAny('ArrowLeft', 'a', 'A');
    const isRight = isAny('ArrowRight', 'd', 'D');
    const isUp = isAny('ArrowUp', 'w', 'W');
    const isDown = isAny('ArrowDown', 's', 'S');
    const isFire = isAny(' ', 'Enter');
    const isRotateLeft = isAny('q', 'Q');
    const isRotateRight = isAny('e', 'E');

    // Fire is only allowed for the current player's turn
    if (isFire) {
        game.fire();
        return;
    }

    // Submarine rotation controls (Q/E) - only for current player
    if (isRotateLeft) { game.rotateTank?.(-1); return; }
    if (isRotateRight) { game.rotateTank?.(1); return; }

    if (game.driveMode) {
        if (isLeft) { game.moveTank(-1); return; }
        if (isRight) { game.moveTank(1); return; }
        if (isUp) { game.moveTankVertical?.(-1); return; } // Up = move up (negative Y)
        if (isDown) { game.moveTankVertical?.(1); return; } // Down = move down (positive Y)
        return;
    }

    let changed = false;
    // Flip arrows back: Left should increase angle (counter-clockwise), Right should decrease
    if (isLeft) { game.adjustAngle(1); changed = true; }
    else if (isRight) { game.adjustAngle(-1); changed = true; }
    else if (isUp) { game.adjustPower(1); changed = true; }
    else if (isDown) { game.adjustPower(-1); changed = true; }

    if (changed) syncAnglePowerUI();
}

globalThis.addEventListener('keydown', onKeyDown, { passive: false });

// --- Touch and HUD controls ---
function setupTouchControls() {
    const joystick = document.getElementById('joystick');
    const stick = joystick?.querySelector?.('.stick');
    const angleDial = document.getElementById('angle-dial');
    const angleDialInput = document.getElementById('angle-dial-input');

    // Helper to get center and radius
    const getCircle = (el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const rad = Math.min(r.width, r.height) / 2;
        return { cx, cy, rad };
    };

    // Joystick: controls drive left/right when driveMode is on; otherwise ignored
    if (joystick && stick) {
        let active = false;
        let id = null;
        const handleDrive = (nx) => {
            if (nx < -0.3) game.moveTank(-1);
            else if (nx > 0.3) game.moveTank(1);
        };
        const handleAim = (nx, ny) => {
            // Aim with horizontal, Power with vertical
            const angThresh = 0.15; // deadzone
            const powThresh = 0.25; // deadzone
            const angStep = Math.round(nx * 2); // -2..2 degrees per event
            const powStep = Math.round(-ny * 1); // -1..1 per event
            if (Math.abs(nx) > angThresh && angStep !== 0) game.adjustAngle(angStep);
            if (Math.abs(ny) > powThresh && powStep !== 0) game.adjustPower(powStep);
        };
        function start(e) {
            active = true;
            id = e.changedTouches?.[0]?.identifier ?? null;
        }
        function move(e) {
            if (!active) return;
            const touch = e.changedTouches ? Array.from(e.changedTouches).find(t => t.identifier === id) : e;
            const { cx, cy, rad } = getCircle(joystick);
            const dx = (touch.clientX - cx);
            const dy = (touch.clientY - cy);
            const max = rad - 10;
            const nx = Math.max(-1, Math.min(1, dx / max));
            const ny = Math.max(-1, Math.min(1, dy / max));
            // Update stick visual
            stick.style.transform = `translate(calc(-50% + ${nx * max}px), calc(-50% + ${ny * max}px))`;
            // Delegate behavior depending on mode (guarded by common gates)
            if (!game.isAnimating && !game.paused && !game.gameOver) {
                if (game.driveMode) handleDrive(nx); else handleAim(nx, ny);
            }
            e.preventDefault(); // prevent page scroll
        }
        function end() {
            active = false;
            id = null;
            stick.style.transform = 'translate(-50%, -50%)';
        }
        joystick.addEventListener('touchstart', start, { passive: false });
        joystick.addEventListener('touchmove', move, { passive: false });
        joystick.addEventListener('touchend', end);
        joystick.addEventListener('touchcancel', end);
        // Mouse fallback
        joystick.addEventListener('mousedown', (e) => { start(e); });
        globalThis.addEventListener('mousemove', (e) => { if (active) move(e); });
        globalThis.addEventListener('mouseup', end);
    }

    // Angle dial: controls angle continuously
    if (angleDial) {
        let active = false;
        function setAngleFromPoint(x, y) {
            const { cx, cy } = getCircle(angleDial);
            const ang = Math.atan2(y - cy, x - cx); // radians
            // Map atan2 (-180..180] to [0..360)
            let deg = (ang * 180 / Math.PI);
            if (deg < 0) deg += 360;
            const sliderV = Math.max(0, Math.min(359, deg));
            const effective = sliderV;
            const angleText = document.getElementById('angle-value');
            if (angleText) angleText.textContent = `${effective}°`;
            game.setAngle(effective);
            if (angleDialInput) angleDialInput.value = String(sliderV);
            // Update knob visual
            const knob = angleDial.querySelector('.dial-knob');
            if (knob) {
                const radius = (angleDial.getBoundingClientRect().width / 2) - 20;
                const rad = (sliderV) * Math.PI / 180;
                knob.style.left = '50%';
                knob.style.top = '50%';
                knob.style.marginLeft = `${Math.cos(rad) * radius}px`;
                knob.style.marginTop = `${Math.sin(rad) * radius}px`;
            }
        }
        function start(e) {
            active = true;
            const t = e.changedTouches?.[0] || e;
            setAngleFromPoint(t.clientX, t.clientY);
            e.preventDefault();
        }
        function move(e) {
            if (!active) return;
            const t = e.changedTouches?.[0] || e;
            setAngleFromPoint(t.clientX, t.clientY);
            e.preventDefault();
        }
        function end() { active = false; }
        angleDial.addEventListener('touchstart', start, { passive: false });
        angleDial.addEventListener('touchmove', move, { passive: false });
        angleDial.addEventListener('touchend', end);
        angleDial.addEventListener('touchcancel', end);
        angleDial.addEventListener('mousedown', start);
        globalThis.addEventListener('mousemove', move);
        globalThis.addEventListener('mouseup', end);
        // Keep game angle in sync when the hidden input is changed (a11y)
        angleDialInput?.addEventListener('input', (e) => {
            const v = Number.parseInt(e.target.value);
            const effective = Math.max(0, Math.min(360, v));
            const angleText = document.getElementById('angle-value');
            if (angleText) angleText.textContent = `${effective}°`;
            game.setAngle(effective);
        });
    }
}

// --- Production: error report button + version display ---
(function initProductionUI() {
    const copyBtn = document.getElementById('copy-error-report');
    const copyStatus = document.getElementById('copy-report-status');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const success = await window.errorLogger?.copyErrorReport?.();
            if (copyStatus) {
                copyStatus.textContent = success ? 'Copied!' : 'Copy failed';
                setTimeout(() => { copyStatus.textContent = ''; }, 2000);
            }
        });
    }

    const versionEl = document.getElementById('version-display');
    if (versionEl) {
        const version = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
        const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'local';
        versionEl.textContent = `v${version} (${hash})`;
    }
})();

