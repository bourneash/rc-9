// Minimal hidden renderer that provides elements the modals move into place
// Vanilla JS version - no React needed

(function () {
  function createDebugMenu() {
    const debugMenu = document.createElement('div');
    debugMenu.id = 'debug-menu';
    debugMenu.className = 'hidden';

    // Header
    const h4 = document.createElement('h4');
    h4.style.position = 'relative';
    h4.textContent = '🔧 Debug/Cheat Menu';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'debug-close';
    closeBtn.className = 'debug-close';
    closeBtn.title = 'Close';
    closeBtn.textContent = '✖';
    h4.appendChild(closeBtn);
    debugMenu.appendChild(h4);

    // Aiming Aid section
    const aimSection = document.createElement('div');
    aimSection.className = 'debug-section';
    const aimLabel = document.createElement('label');
    aimLabel.htmlFor = 'trajectory-guide-toggle';
    aimLabel.textContent = 'Aiming Aid: ';
    const aimInput = document.createElement('input');
    aimInput.id = 'trajectory-guide-toggle';
    aimInput.type = 'checkbox';
    aimLabel.appendChild(aimInput);
    aimLabel.appendChild(document.createTextNode(' Trajectory Guide (dots)'));
    aimSection.appendChild(aimLabel);
    debugMenu.appendChild(aimSection);

    // Debris section
    const debrisSection = document.createElement('div');
    debrisSection.className = 'debug-section';
    debrisSection.innerHTML = `
      <label for="debris-enabled">Debris: </label>
      <input id="debris-enabled" type="checkbox" checked>
      <label for="debris-amount" style="margin-left: 8px"> Amount: <span id="debris-amount-value">1.0</span>x</label>
      <input type="range" id="debris-amount" min="0" max="3" value="1" step="0.1">
      <label for="debris-lifetime" style="margin-left: 8px"> Lifetime: <span id="debris-lifetime-value">10</span>s</label>
      <input type="range" id="debris-lifetime" min="2" max="30" value="10" step="1">
    `;
    debugMenu.appendChild(debrisSection);

    // Wind section
    const windSection = document.createElement('div');
    windSection.className = 'debug-section';
    windSection.innerHTML = `
      <label for="wind-override-slider">Wind Override: <span id="wind-override-value">Off</span></label>
      <input type="range" id="wind-override-slider" min="-15" max="15" value="0" step="0.5">
    `;
    debugMenu.appendChild(windSection);

    // Dust section
    const dustSection = document.createElement('div');
    dustSection.className = 'debug-section';
    dustSection.innerHTML = `
      <label for="dust-enabled">Ambient Dust: </label>
      <input id="dust-enabled" type="checkbox" checked>
      <label for="dust-amount" style="margin-left: 8px"> Amount: <span id="dust-amount-value">1.0</span>x</label>
      <input type="range" id="dust-amount" min="0" max="3" value="1" step="0.1">
      <label for="dust-size" style="margin-left: 8px"> Size: <span id="dust-size-value">1.0</span>x</label>
      <input type="range" id="dust-size" min="0.5" max="2.0" value="1.0" step="0.1">
      <label for="dust-life" style="margin-left: 8px"> Lifetime: <span id="dust-life-value">1.0</span>x</label>
      <input type="range" id="dust-life" min="0.5" max="2.0" value="1.0" step="0.1">
    `;
    debugMenu.appendChild(dustSection);

    // Fuel section
    const fuelSection = document.createElement('div');
    fuelSection.className = 'debug-section';
    fuelSection.innerHTML = `
      <label for="fuel-slider">Fuel Amount: <span id="fuel-value-display">100%</span></label>
      <input type="range" id="fuel-slider" min="0" max="1000" value="200" step="50">
    `;
    debugMenu.appendChild(fuelSection);

    // Health section
    const healthSection = document.createElement('div');
    healthSection.className = 'debug-section';
    healthSection.innerHTML = `
      <label for="health-override-slider">Starting Health: <span id="health-override-value">100</span></label>
      <input type="range" id="health-override-slider" min="10" max="200" value="100" step="10">
    `;
    debugMenu.appendChild(healthSection);

    // Gravity section
    const gravitySection = document.createElement('div');
    gravitySection.className = 'debug-section';
    gravitySection.innerHTML = `
      <label for="gravity-override-slider">Gravity: <span id="gravity-override-value">0.30</span></label>
      <input type="range" id="gravity-override-slider" min="0.1" max="1.0" value="0.3" step="0.05">
    `;
    debugMenu.appendChild(gravitySection);

    // Damage section
    const damageSection = document.createElement('div');
    damageSection.className = 'debug-section';
    damageSection.innerHTML = `
      <label for="damage-override-slider">Damage Multiplier: <span id="damage-override-value">1.0</span>x</label>
      <input type="range" id="damage-override-slider" min="0.1" max="5.0" value="1.0" step="0.1">
    `;
    debugMenu.appendChild(damageSection);

    // Infinite Health section
    const invSection = document.createElement('div');
    invSection.className = 'debug-section';
    invSection.innerHTML = `
      <label for="infinite-health-toggle">
        <input id="infinite-health-toggle" type="checkbox"> Infinite Health (set damage x0)
      </label>
    `;
    debugMenu.appendChild(invSection);

    // Highlight section
    const highlightSection = document.createElement('div');
    highlightSection.className = 'debug-section';
    highlightSection.innerHTML = `
      <label for="highlight-enabled">
        <input id="highlight-enabled" type="checkbox" checked> Highlight Active Tank
      </label>
      <label for="highlight-intensity" style="margin-left: 8px"> Intensity: <span id="highlight-intensity-value">1.0</span>x</label>
      <input type="range" id="highlight-intensity" min="0" max="2" value="1.0" step="0.1">
    `;
    debugMenu.appendChild(highlightSection);

    // Ammo section
    const ammoSection = document.createElement('div');
    ammoSection.className = 'debug-section';
    ammoSection.innerHTML = `
      <label for="unlimited-ammo-toggle">
        <input id="unlimited-ammo-toggle" type="checkbox"> Unlimited Ammo (all tanks)
      </label>
      <div class="ammo-actions" style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="refill-ammo-current" class="secondary">Refill Ammo (Current)</button>
        <button id="refill-ammo-all" class="secondary">Refill Ammo (All Tanks)</button>
      </div>
    `;
    debugMenu.appendChild(ammoSection);

    // Terrain smoothness section
    const smoothSection = document.createElement('div');
    smoothSection.className = 'debug-section';
    smoothSection.innerHTML = `
      <label for="terrain-smoothness-slider">Terrain Smoothness: <span id="terrain-smoothness-value">50</span></label>
      <input type="range" id="terrain-smoothness-slider" min="1" max="100" value="50" step="1">
    `;
    debugMenu.appendChild(smoothSection);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.id = 'reset-cheats';
    resetBtn.className = 'reset-cheats-btn';
    resetBtn.textContent = 'Reset All Cheats';
    debugMenu.appendChild(resetBtn);

    return debugMenu;
  }

  function createGameLog() {
    const gameLog = document.createElement('div');
    gameLog.id = 'game-log';
    gameLog.className = 'collapsible collapsed';

    const header = document.createElement('div');
    header.id = 'game-log-header';
    header.className = 'drag-handle';
    header.title = 'Drag to move';

    const h3 = document.createElement('h3');
    h3.textContent = 'Game Log';
    header.appendChild(h3);

    const actions = document.createElement('div');
    actions.className = 'ui-header-actions';

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-log-button';
    clearBtn.className = 'icon-btn';
    clearBtn.title = 'Clear Log';
    clearBtn.textContent = '🧹';
    actions.appendChild(clearBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-log';
    toggleBtn.className = 'icon-btn';
    toggleBtn.title = 'Expand/Collapse';
    toggleBtn.textContent = '▸';
    actions.appendChild(toggleBtn);

    header.appendChild(actions);
    gameLog.appendChild(header);

    const messages = document.createElement('div');
    messages.id = 'log-messages';
    gameLog.appendChild(messages);

    return gameLog;
  }

  function createAudioControls() {
    const audioRow = document.createElement('div');
    audioRow.id = 'audio-controls-row';
    audioRow.className = 'options-row';
    audioRow.style.display = 'none';

    const muteBtn = document.createElement('button');
    muteBtn.id = 'audio-mute';
    muteBtn.className = 'secondary';
    muteBtn.title = 'Mute/Unmute';
    muteBtn.textContent = 'Mute';
    audioRow.appendChild(muteBtn);

    const musicBtn = document.createElement('button');
    musicBtn.id = 'music-toggle';
    musicBtn.className = 'secondary';
    musicBtn.title = 'Toggle Music';
    musicBtn.textContent = 'Music: ON';
    audioRow.appendChild(musicBtn);

    const volLabel = document.createElement('label');
    volLabel.htmlFor = 'audio-volume';
    volLabel.style.marginLeft = '8px';
    volLabel.textContent = 'Volume';
    audioRow.appendChild(volLabel);

    const volInput = document.createElement('input');
    volInput.id = 'audio-volume';
    volInput.type = 'range';
    volInput.min = '0';
    volInput.max = '100';
    volInput.value = '70';
    volInput.step = '1';
    audioRow.appendChild(volInput);

    return audioRow;
  }

  function mount() {
    const rootEl = document.getElementById('ui-staging');
    if (!rootEl) return;

    // Clear any existing content
    rootEl.innerHTML = '';

    // Append all UI elements
    rootEl.appendChild(createAudioControls());
    rootEl.appendChild(createDebugMenu());
    rootEl.appendChild(createGameLog());

    // Signal to other code that the sidebar is mounted
    const evt = new CustomEvent('sidebar:mounted');
    document.dispatchEvent(evt);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
