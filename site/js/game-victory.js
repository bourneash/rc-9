// game-victory.js — extracted from game.js
// Victory detection + game-over UI.

import { VictoryMessages } from './victory-messages.js';
import * as Overlays from './canvas-overlays.js';

// Neutralize the corner HUD the instant a match ends so it no longer shows the
// stale "· AI 1 MEDIUM" active-turn label over the game-over state (DF-69).
function clearTurnHud(game) {
  try {
    Overlays.updateCorners({
      sector: game.turnCount || 0,
      round: (game.turnCount || 0) + 1,
      activeCallsign: null,
    });
  } catch {}
}

export function checkGameOver(game) {
  const aliveTanks = game.tanks.filter(t => t.health > 0);
  if (aliveTanks.length > 1) return;

  // Winner (or draw) decided. Latch game-over and clear the turn HUD immediately.
  game.gameOver = true;
  clearTurnHud(game);

  const winner = aliveTanks.length === 1 ? aliveTanks[0] : null; // null = draw
  // Reveal the engagement report after a short beat for the death animation.
  // Guard on gameOver (which reset() clears) rather than turnToken so a benign
  // turn advance in the reported napalm self-kill path can't cancel the reveal (DF-68).
  setTimeout(() => {
    if (!game.gameOver) return; // a new game / reset happened in the meantime
    game.showGameOver(winner);
  }, 2000);
}

export function showGameOver(game, winner) {
  // Calculate stats for victory message
  let victoryMessage, winnerName, outcome;

  if (!winner) {
    // Draw case
    victoryMessage = 'Mutual Destruction!';
    winnerName = 'Draw';
    outcome = 'tie';
  } else {
    // Calculate game stats for contextual victory message
    const stats = {
      turnCount: game.turnCount || 0,
      isAI: winner.isAI,
      isTeamGame: game.mode === 'teams',
      damageDealt: winner.damageDealt || 0,
      damageTaken: (winner.maxHealth || 100) - winner.health,
      closeMatch: game.tanks.filter(t => t.health > 0).length <= 2,
    };

    // Get contextual victory message
    victoryMessage = VictoryMessages.getVictoryMessage(winner.name, stats);
    winnerName = winner.name;
    outcome = winner.isAI ? 'defeat' : 'victory';
  }

  // Check if auto-restart is enabled
  const autoRestartEnabled = localStorage.getItem('auto-restart-enabled') === 'true';

  if (autoRestartEnabled) {
    // Show countdown modal for auto-restart
    if (typeof globalThis.startAutoRestartCountdown === 'function') {
      try {
        globalThis.startAutoRestartCountdown();
        return;
      } catch (e) {
        console.error('[showGameOver] Auto-restart failed:', e);
      }
    }
  }

  // Build state object for the engagement report
  const state = {
    outcome,
    winnerName,
    contextualMessage: victoryMessage,
    turns: game.turnCount || 0,
    durationStr: null,
    hits: winner ? (winner.shotsHit ?? null) : null,
    shots: winner ? (winner.shotsFired ?? null) : null,
    damage: winner ? winner.damageDealt || 0 : null,
  };

  fillEngagementReport(state);
  if (typeof globalThis.openGameOverModal === 'function') {
    globalThis.openGameOverModal();
  }
}

function fillEngagementReport(state) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };

  const banner = document.getElementById('er-banner');
  if (banner) {
    banner.textContent =
      state.outcome === 'victory'
        ? 'VICTORY · OPERATOR'
        : state.outcome === 'tie'
          ? 'STALEMATE'
          : 'DEFEAT · ENEMY';
    banner.className = 'er-banner ' + (state.outcome === 'victory' ? '' : state.outcome);
  }

  const subtitleParts = [`ROUND COMPLETE · ${state.turns ?? 0} TURNS`];
  if (state.durationStr) subtitleParts.push(state.durationStr);
  setText('er-subtitle', subtitleParts.join(' · '));

  setText('winner-text', (state.winnerName || '—').toUpperCase());
  setText('er-standing', state.outcome === 'victory' ? ' STANDING' : '');
  setText('er-tag', (state.contextualMessage || '').toUpperCase());
  setText('er-rounds', state.turns ?? '—');
  setText('er-hits', state.hits != null ? state.hits : '—');
  setText('er-shots', state.shots != null ? state.shots : '—');
  setText('er-damage', state.damage != null ? state.damage : '—');
  setText(
    'er-accuracy',
    state.shots != null && state.hits != null
      ? Math.round((state.hits / Math.max(1, state.shots)) * 100)
      : '—'
  );
}

// Kept for backward-compat; no longer primary display path
export function showVictoryToast(game, winnerName, victoryMessage, winner) {
  // Delegate to the engagement report modal
  const outcome = !winner ? 'tie' : winner.isAI ? 'defeat' : 'victory';
  const state = {
    outcome,
    winnerName,
    contextualMessage: victoryMessage,
    turns: game.turnCount || 0,
    durationStr: null,
    hits: winner ? (winner.shotsHit ?? null) : null,
    shots: winner ? (winner.shotsFired ?? null) : null,
    damage: winner ? winner.damageDealt || 0 : null,
  };
  fillEngagementReport(state);
  if (typeof globalThis.openGameOverModal === 'function') {
    globalThis.openGameOverModal();
  }
}
