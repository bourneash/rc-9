// site/js/canvas-overlays.js — Manages diegetic in-canvas DOM overlays

const container = () => document.getElementById('canvas-overlays');
const tl = () => document.getElementById('co-corner-tl');
const tr = () => document.getElementById('co-corner-tr');
const grid = () => document.getElementById('co-grid');

export function setTheme(themeName) {
  const c = container();
  if (!c) return;
  if (themeName) c.setAttribute('data-theme', themeName);
  else c.removeAttribute('data-theme');
}

export function setGridVisible(on) {
  const g = grid();
  if (!g) return;
  g.classList.toggle('show', !!on);
}

export function setStreamerMode(on) {
  const c = container();
  if (!c) return;
  c.classList.toggle('streamer-mode', !!on);
}

export function updateCorners({ sector, round, activeCallsign, roundLimit } = {}) {
  const tlEl = tl();
  const trEl = tr();
  if (tlEl) {
    const sectorStr = String(sector ?? 0).padStart(2, '0');
    tlEl.textContent = `RC-9 // SECTOR ${sectorStr}`;
  }
  if (trEl) {
    const roundStr = String(round ?? 0).padStart(2, '0');
    if (roundLimit) {
      trEl.textContent = `ROUND ${roundStr} / ${roundLimit}`;
    } else if (activeCallsign) {
      trEl.textContent = `ROUND ${roundStr} · ${String(activeCallsign).toUpperCase()}`;
    } else {
      trEl.textContent = `ROUND ${roundStr}`;
    }
  }
}
