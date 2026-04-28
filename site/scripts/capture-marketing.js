#!/usr/bin/env node
// Automated marketing screenshot capture via Playwright.
// Drives the actual in-game UI: selects environment preset, configures 2 AI tanks,
// starts the match, waits for combat, captures mid-action.
//
// Usage: node scripts/capture-marketing.js
// Requires dev server running on http://localhost:5600

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../portal-submissions/assets/generated');
mkdirSync(OUT_DIR, { recursive: true });

const SCENES = [
  { name: 'desert', preset: 'desert' },
  { name: 'ocean', preset: 'ocean' },
  { name: 'moon', preset: 'moon' },
  { name: 'forest', preset: 'forest' },
  { name: 'mars', preset: 'mars' },
  { name: 'canyon', preset: 'canyon' }
];

// Force all non-current tanks to AI, set both to AI for auto-combat
async function setupAIBattle(page, presetValue) {
  // Wait for setup modal to appear
  await page.waitForSelector('#new-game-modal', { timeout: 10000 });

  // Select environment preset
  await page.selectOption('#setup-environment', presetValue);

  // Set total players to 2
  await page.fill('#setup-total-players', '2');

  // Trigger any change handlers
  await page.evaluate(() => {
    document.getElementById('setup-total-players')?.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('setup-total-players')?.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.waitForTimeout(300);

  // Set both tank slots to AI via the roster/slots UI if present
  await page.evaluate(() => {
    const slotsContainer = document.getElementById('setup-slots') || document.getElementById('setup-roster');
    if (!slotsContainer) return;
    // Find any "AI" / "Human" toggles and set them all to AI
    slotsContainer.querySelectorAll('select').forEach(sel => {
      const opts = [...sel.options].map(o => o.value.toLowerCase());
      const aiVal = opts.find(v => v.includes('ai') || v.includes('cpu') || v.includes('bot'));
      if (aiVal) {
        sel.value = [...sel.options].find(o => o.value.toLowerCase() === aiVal).value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    // Checkboxes/buttons labeled AI
    slotsContainer.querySelectorAll('button, input[type="radio"], input[type="checkbox"]').forEach(el => {
      const label = (el.textContent || el.value || '').toLowerCase();
      if (label.includes('ai') && !el.checked && el.type !== 'button') {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Click Start Game
  await page.click('#setup-start');

  // Wait for setup modal to close
  await page.waitForFunction(() => {
    const m = document.getElementById('new-game-modal');
    return !m || m.classList.contains('hidden') || !m.open;
  }, { timeout: 10000 });
}

async function capture() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // Surface browser console for debugging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') console.log(`[browser:${type}]`, msg.text());
  });

  for (const scene of SCENES) {
    console.log(`\n=== Capturing ${scene.name} ===`);
    await page.goto('http://localhost:5600', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // let loading screen finish

    try {
      await setupAIBattle(page, scene.preset);
      console.log(`  setup complete, waiting for AI combat...`);
      // Wait for AI to take at least one shot — projectiles in flight or explosions
      await page.waitForFunction(() => {
        const api = window.__SE_TEST_API__?.();
        if (!api) return false;
        const s = api.getState();
        return s && s.turnCount >= 1;
      }, { timeout: 30000 });
      await page.waitForTimeout(2000); // let action develop
    } catch (err) {
      console.log(`  ⚠ setup path fell back: ${err.message}`);
    }

    // Hide any overlays/modals for clean shot
    await page.evaluate(() => {
      document.querySelectorAll('dialog[open], .modal:not(.hidden)').forEach(m => {
        if (m.id !== 'game-container') m.style.visibility = 'hidden';
      });
    });

    await page.screenshot({
      path: resolve(OUT_DIR, `${scene.name}-gameplay.png`),
      fullPage: false
    });
    console.log(`  ✓ saved ${scene.name}-gameplay.png`);
  }

  // Generate thumbnail variants from the best (desert) scene
  console.log('\n=== Generating thumbnail sizes from desert ===');
  await page.goto('http://localhost:5600', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  try {
    await setupAIBattle(page, 'desert');
    await page.waitForFunction(() => {
      const api = window.__SE_TEST_API__?.();
      return api && api.getState().turnCount >= 1;
    }, { timeout: 30000 });
    await page.waitForTimeout(2500);
  } catch (err) {
    console.log(`  ⚠ ${err.message}`);
  }
  await page.evaluate(() => {
    document.querySelectorAll('dialog[open], .modal:not(.hidden)').forEach(m => {
      if (m.id !== 'game-container') m.style.visibility = 'hidden';
    });
  });

  const sizes = [
    { name: 'thumb-512x384', w: 512, h: 384 },
    { name: 'thumb-1280x720', w: 1280, h: 720 },
    { name: 'thumb-244x244', w: 244, h: 244 },
    { name: 'thumb-630x500', w: 630, h: 500 },
    { name: 'thumb-512x512', w: 512, h: 512 }
  ];
  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(OUT_DIR, `${size.name}.png`) });
    console.log(`  ✓ ${size.name}.png (${size.w}x${size.h})`);
  }

  await browser.close();
  console.log(`\nAll assets saved to: ${OUT_DIR}`);
}

capture().catch(err => { console.error(err); process.exit(1); });
