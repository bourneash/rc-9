import { test, expect } from '@playwright/test';

async function waitForGameReady(page) {
  await page.waitForSelector('#game-canvas', { state: 'visible' });
  await page.waitForFunction(() => !!(window.__SE_GAME__ || window.game || window.mainGame));
  await page.waitForSelector('#log-messages', { state: 'attached' });
}

async function startDeterministicGame(page) {
  await page.evaluate(() => {
    const game = window.__SE_GAME__ || window.game || window.mainGame;
    if (!game) throw new Error('Game instance not found');
    game.startNewGameWithConfig({
      mode: 'classic',
      terrainProfile: 'flat',
      theme: 'desert',
      time: 'day',
      staticTime: true,
      totalPlayers: 2,
      humanPlayers: 2,
      slots: [
        { type: 'human', name: 'Player 1', color: '#00ff00', style: 'classic' },
        { type: 'human', name: 'Player 2', color: '#ff0000', style: 'classic' }
      ],
      windMode: 'low',
      healthMultiplier: 100,
      soloTargets: 10,
      soloShots: '10',
      ammoMode: 'unlimited',
      ammoCounts: {},
      disableNames: false,
      allowDriveAnytime: false
    });

    const modal = document.getElementById('new-game-modal');
    if (modal) {
      try { modal.close?.(); } catch {}
      modal.classList.add('hidden');
    }
    try { game.setPaused(false); } catch {}
  });

  await page.waitForFunction(() => {
    const game = window.__SE_GAME__ || window.game || window.mainGame;
    return !!(game && Array.isArray(game.tanks) && game.tanks.length === 2 && !game.gameOver);
  });
}

test.describe('Gameplay smoke', () => {
  test('loads game shell and controls', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await expect(page.locator('#fire-button')).toBeVisible();
    await expect(page.locator('#weapon-grid-toggle')).toBeVisible();
    await expect(page.locator('#options-tab')).toBeVisible();
  });

  test('starts a new deterministic game and can fire', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startDeterministicGame(page);

    const before = await page.evaluate(() => {
      const game = window.__SE_GAME__ || window.game || window.mainGame;
      return {
        currentTankIndex: game.currentTankIndex,
        projectileCount: game.projectiles?.length || 0
      };
    });

    await page.click('#fire-button');

    await page.waitForFunction((prev) => {
      const game = window.__SE_GAME__ || window.game || window.mainGame;
      if (!game) return false;
      const projectileCount = game.projectiles?.length || 0;
      return projectileCount > prev.projectileCount || game.isAnimating;
    }, before);
  });

  test('progresses turn after shot resolves', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startDeterministicGame(page);

    const startTurn = await page.evaluate(() => {
      const game = window.__SE_GAME__ || window.game || window.mainGame;
      return game.currentTankIndex;
    });

    await page.click('#fire-button');

    await page.waitForFunction((initialTurn) => {
      const game = window.__SE_GAME__ || window.game || window.mainGame;
      if (!game) return false;
      const projectilesDone = !game.projectiles || game.projectiles.length === 0;
      return projectilesDone && game.currentTankIndex !== initialTurn;
    }, startTurn, { timeout: 15000 });
  });

  test('reaches game over state when one tank remains', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startDeterministicGame(page);

    await page.evaluate(() => {
      const game = window.__SE_GAME__ || window.game || window.mainGame;
      if (!game || !game.tanks || game.tanks.length < 2) throw new Error('Not enough tanks');
      for (let i = 1; i < game.tanks.length; i++) game.tanks[i].health = 0;
      if (typeof game.checkGameOver === 'function') game.checkGameOver();
      else if (typeof game.showGameOver === 'function') game.showGameOver();
    });

    await page.waitForFunction(() => {
      const game = window.__SE_GAME__ || window.game || window.mainGame;
      return !!game?.gameOver;
    });

    const winnerAlive = await page.evaluate(() => {
      const game = window.__SE_GAME__ || window.game || window.mainGame;
      if (!game || !Array.isArray(game.tanks)) return false;
      return game.tanks.filter(t => (t.health || 0) > 0).length <= 1;
    });
    expect(winnerAlive).toBeTruthy();
  });
});
