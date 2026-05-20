// site/js/title-screen.js — Title screen show/hide, menu wiring

const TITLE_EL_ID = 'title-screen';

function $(id) { return document.getElementById(id); }

export function show() {
  const el = $(TITLE_EL_ID);
  if (!el) return;
  el.removeAttribute('hidden');
  refreshOperator();
  refreshBuild();
  startUtcTick();
  focusMenu();
}

export function hide() {
  const el = $(TITLE_EL_ID);
  if (!el) return;
  el.setAttribute('hidden', '');
  stopUtcTick();
}

function refreshOperator() {
  const opEl = $('ts-op');
  if (!opEl) return;
  let name = 'OPERATOR';
  try {
    const stored = localStorage.getItem('rc9.callsign.slot.0') || localStorage.getItem('rc9.player.name.0');
    if (stored && stored.trim()) name = stored.trim().toUpperCase();
  } catch {}
  opEl.textContent = `OP // ${name}`;
}

function refreshBuild() {
  const el = $('ts-build');
  if (!el) return;
  // Vite injects these at build time via define{} in vite.config.js
  const v = (typeof __BUILD_VERSION__ !== 'undefined') ? __BUILD_VERSION__ : '0.0.0';
  const h = (typeof __BUILD_HASH__ !== 'undefined') ? __BUILD_HASH__ : 'dev';
  const d = (typeof __BUILD_DATE__ !== 'undefined') ? __BUILD_DATE__.slice(0, 10) : '';
  el.textContent = `RC-9 v${v} · build ${h}${d ? ' · ' + d : ''}`;
}

let utcTimer = null;
function startUtcTick() {
  const el = $('ts-utc');
  if (!el) return;
  function tick() {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    el.textContent = `UTC ${hh}:${mm}:${ss}`;
  }
  tick();
  utcTimer = setInterval(tick, 1000);
}
function stopUtcTick() { if (utcTimer) { clearInterval(utcTimer); utcTimer = null; } }

function focusMenu() {
  const first = document.querySelector('#title-screen .ts-item:not([hidden]):not(:disabled)');
  if (first) first.focus({ preventScroll: true });
}

function actionFor(menuItem) {
  return menuItem?.dataset?.action;
}

function handleAction(action) {
  switch (action) {
    case 'new': {
      hide();
      // Go through the full setup-modal init path so slots render, tiles sync,
      // and the .hidden class is removed. Calling dlg.showModal() alone skips
      // all of that and leaves the dialog invisible (display:none from .hidden).
      if (typeof globalThis.openNewGameModal === 'function') {
        globalThis.openNewGameModal();
      } else {
        const dlg = document.getElementById('new-game-modal');
        dlg?.classList.remove('hidden');
        dlg?.showModal?.();
      }
      break;
    }
    case 'briefing': {
      window.location.href = '/help';
      break;
    }
    case 'archive':
    default:
      // disabled / unknown
      break;
  }
}

function bindMenu() {
  document.querySelectorAll('#title-screen .ts-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      handleAction(actionFor(btn));
    });
  });
  document.addEventListener('keydown', (e) => {
    const el = $(TITLE_EL_ID);
    if (!el || el.hasAttribute('hidden')) return;
    const items = Array.from(document.querySelectorAll('#title-screen .ts-item:not([hidden]):not(:disabled)'));
    if (!items.length) return;
    const idx = items.findIndex(i => i === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(idx + 1) % items.length] || items[0];
      next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length] || items[items.length - 1];
      prev.focus();
    } else if (e.key === 'Enter') {
      if (document.activeElement?.classList?.contains('ts-item')) {
        e.preventDefault();
        handleAction(actionFor(document.activeElement));
      }
    } else {
      const k = e.key.toUpperCase();
      const target = items.find(i => i.dataset.key === k);
      if (target) {
        e.preventDefault();
        handleAction(actionFor(target));
      }
    }
  });
}

export function mount() {
  bindMenu();
  // Decide whether to show: honor existing "restore last session" toggle
  let restore = false;
  try {
    const restoreRaw = localStorage.getItem('se.ui.restoreEnabled');
    restore = restoreRaw === null ? true : restoreRaw === 'true';
    // Legacy key fallback
    if (!restore && localStorage.getItem('se.restoreLastSession') === '1') restore = true;
  } catch {}
  let hasSave = false;
  try {
    hasSave = !!(localStorage.getItem('se.lastGame.v1') || localStorage.getItem('rc9.save'));
  } catch {}
  if (restore && hasSave) {
    // Skip title — let existing app boot continue into saved state
    return;
  }
  show();
}
