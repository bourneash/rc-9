// game-victory.js — extracted from game.js
// Victory detection + game-over UI.

import { VictoryMessages } from './victory-messages.js';

export function checkGameOver(game) {
  const aliveTanks = game.tanks.filter(t => t.health > 0);

  if (aliveTanks.length === 0) {
    // All tanks dead simultaneously - draw/mutual destruction
    game.gameOver = true;
    const token = game.turnToken;
    setTimeout(() => {
      if (token !== game.turnToken) return; // Game state changed
      game.showGameOver(null); // null = draw, no winner
    }, 2000);
  } else if (aliveTanks.length === 1) {
    game.gameOver = true;
    const token = game.turnToken;
    setTimeout(() => {
      if (token !== game.turnToken) return; // Game state changed
      game.showGameOver(aliveTanks[0]);
    }, 2000);
  }
}

export function showGameOver(game, winner) {
  // Calculate stats for victory message
  let victoryMessage, winnerName;

  if (!winner) {
    // Draw case
    victoryMessage = 'Mutual Destruction!';
    winnerName = 'Draw';
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

  // Create single victory toast with message and New Game button
  game.showVictoryToast(winnerName, victoryMessage, winner);
}

export function showVictoryToast(game, winnerName, victoryMessage, winner) {
  // Create toast container
  const toast = document.createElement('div');
  toast.className = 'victory-toast';
  toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            text-align: center;
            background: linear-gradient(135deg, rgba(0,50,0,0.95), rgba(0,0,0,0.9));
            border: 3px solid #00ff00;
            border-radius: 15px;
            padding: 30px 40px;
            box-shadow: 0 0 40px rgba(0,255,0,0.3);
            animation: victoryToastAppear 0.5s ease-out;
            min-width: 400px;
        `;

  // Winner text
  const winnerText = document.createElement('h1');
  winnerText.textContent = winnerName === 'Draw' ? 'Draw!' : `${winnerName} Wins!`;
  winnerText.style.cssText = `
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 42px;
            font-weight: bold;
            color: #00ff00;
            text-shadow:
                2px 2px 4px rgba(0,0,0,0.8),
                0 0 20px rgba(0,255,0,0.5);
            margin: 0 0 15px 0;
        `;

  // Victory message text
  const messageText = document.createElement('p');
  messageText.textContent = victoryMessage;
  messageText.style.cssText = `
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 24px;
            color: #aaffaa;
            margin: 0 0 25px 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        `;

  // Stats text (if winner exists)
  let statsText;
  if (winner) {
    statsText = document.createElement('p');
    statsText.textContent = `Turns: ${game.turnCount || 0} | Health Remaining: ${winner.health}%`;
    statsText.style.cssText = `
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 16px;
                color: #888;
                margin: 0 0 25px 0;
            `;
  }

  // New Game button
  const newGameButton = document.createElement('button');
  newGameButton.textContent = 'New Game';
  newGameButton.style.cssText = `
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 18px;
            font-weight: bold;
            color: #000;
            background: linear-gradient(135deg, #00ff00, #00cc00);
            border: none;
            border-radius: 8px;
            padding: 12px 30px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: all 0.2s;
        `;

  // Button hover effect
  newGameButton.addEventListener('mouseenter', () => {
    newGameButton.style.background = 'linear-gradient(135deg, #00ff33, #00dd00)';
    newGameButton.style.transform = 'scale(1.05)';
  });
  newGameButton.addEventListener('mouseleave', () => {
    newGameButton.style.background = 'linear-gradient(135deg, #00ff00, #00cc00)';
    newGameButton.style.transform = 'scale(1)';
  });

  // Button click handler
  newGameButton.addEventListener('click', () => {
    toast.remove();
    if (typeof globalThis.openNewGameModal === 'function') {
      globalThis.openNewGameModal();
    }
  });

  // Build toast
  toast.appendChild(winnerText);
  toast.appendChild(messageText);
  if (statsText) toast.appendChild(statsText);
  toast.appendChild(newGameButton);

  // Add CSS animation if not already present
  if (!document.querySelector('#victory-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'victory-toast-styles';
    style.textContent = `
                @keyframes victoryToastAppear {
                    0% {
                        transform: translate(-50%, -50%) scale(0.5);
                        opacity: 0;
                    }
                    60% {
                        transform: translate(-50%, -50%) scale(1.05);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
            `;
    document.head.appendChild(style);
  }

  // Add to page
  document.body.appendChild(toast);

  // Allow closing with ESC key — opens setup modal after dismissal
  const handleEscape = e => {
    if (e.key === 'Escape') {
      toast.remove();
      document.removeEventListener('keydown', handleEscape);
      if (typeof globalThis.openNewGameModal === 'function') {
        globalThis.openNewGameModal();
      }
    }
  };
  document.addEventListener('keydown', handleEscape);
}
