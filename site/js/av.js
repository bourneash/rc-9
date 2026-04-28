// AV layer: Howler.js (audio), GSAP (tweens), PixiJS + pixi-filters (post FX)
// This module assumes globals: Howl (from howler), gsap, PIXI, PIXI.filters

import { getMemoryManager } from './memory-manager.js';

export class AV {
  app = null; // Pixi Application
  stage = null;
  sprite = null; // Sprite that shows the main canvas
  flashEl = null;
  sounds = {};
  windLoop = null;
  engineLoop = null;
  enginePingAt = 0;
  engineActive = false;
  music = null;
  musicOn = false;
  masterVolume = 0.7; // 0..1
  muted = false;
  // Synth audio
  _ac = null; // AudioContext
  _master = null; // GainNode
  _windGain = null; _windNode = null; // wind noise
  _engineGain = null; _engineOsc = null; _engineTimer = null;
  _musicTimer = null; _musicGain = null; _musicOsc = null;

  init(canvas) {
    // Build overlay and flash elements via helpers
    this._setupPixiOverlay(canvas);
    this._setupFlashEl();

    this._setupAudioBank();

    return this;
  }

  enableVisuals(canvas) {
    this._setupPixiOverlay(canvas);
    this._setupFlashEl();
  }

  _setupAudioBank() {
    // Decide whether to use remote audio (CDN) or local synthesized audio only
    const USE_CDN_AUDIO = true; // default to full SFX via CDN when available
    if (USE_CDN_AUDIO && globalThis.Howl && globalThis.Howler) {
      this._setupCdnAudio();
    } else {
      this._ensureContext();
      this._initSynthAudio();
    }
  }

  _setupCdnAudio() {
    // Apply persisted audio state
    try {
      const savedVol = Number.parseFloat(localStorage.getItem('se.volume') || '0.7');
      if (Number.isFinite(savedVol)) this.masterVolume = Math.max(0, Math.min(1, savedVol));
      const savedMuted = localStorage.getItem('se.muted');
      this.muted = savedMuted === '1';
      const savedMusic = localStorage.getItem('se.musicOn');
      this.musicOn = savedMusic !== '0';
    } catch {}

    // Global volume/mute
    try { Howler.volume(this.masterVolume); } catch (e) { console.warn('[AV] Failed to set Howler volume:', e.message); }
    try { Howler.mute(this.muted); } catch (e) { console.warn('[AV] Failed to mute Howler:', e.message); }

    // One-shots and loops
    this._sfxDefaults = {
      fire_generic: 0.35,
      fire_laser: 0.35,
      fire_heavy: 0.4,
      fire_nuke: 0.4,
      fire_cluster: 0.35,
      fire_homing: 0.35,
      explosion_small: 0.35,
      explosion_heavy: 0.45,
      explosion_nuke: 0.5,
      ufo_whoosh: 0.25,
      plane_flyby: 0.25,
      paratrooper_drop: 0.25,
      parachute_deploy: 0.25,
      crate_inbound: 0.25,
      crate_pickup: 0.3
    };
    this._sfxVolume = 0.7; // default SFX mix (0..1)
    this._musicVolume = 0.5; // default music mix (0..1)

    // Audio helper: try local first, fallback to CDN
    const audio = (local, cdn) => [local, cdn];

    this.sounds.fire_generic = new Howl({ src: audio('/assets/audio/laser1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/laser1.mp3'), volume: this._sfxDefaults.fire_generic * this._sfxVolume });
    this.sounds.fire_laser = new Howl({ src: audio('/assets/audio/pew1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/pew1.mp3'), volume: this._sfxDefaults.fire_laser * this._sfxVolume });
    this.sounds.fire_heavy = new Howl({ src: audio('/assets/audio/cannon1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/cannon1.mp3'), volume: this._sfxDefaults.fire_heavy * this._sfxVolume });
    this.sounds.fire_nuke = new Howl({ src: audio('/assets/audio/powerup1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/powerup1.mp3'), volume: this._sfxDefaults.fire_nuke * this._sfxVolume });
    this.sounds.fire_cluster = new Howl({ src: audio('/assets/audio/shot_alt1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/shot_alt1.mp3'), volume: this._sfxDefaults.fire_cluster * this._sfxVolume });
    this.sounds.fire_homing = new Howl({ src: audio('/assets/audio/rocket1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/rocket1.mp3'), volume: this._sfxDefaults.fire_homing * this._sfxVolume });

    this.sounds.explosion_small = new Howl({ src: audio('/assets/audio/explosion1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/explosion1.mp3'), volume: this._sfxDefaults.explosion_small * this._sfxVolume });
    this.sounds.explosion_heavy = new Howl({ src: audio('/assets/audio/explosion_heavy1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/explosion_heavy1.mp3'), volume: this._sfxDefaults.explosion_heavy * this._sfxVolume });
    this.sounds.explosion_nuke = new Howl({ src: audio('/assets/audio/explosion_long.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/explosion_long.mp3'), volume: this._sfxDefaults.explosion_nuke * this._sfxVolume });
    this.sounds.nukeCharge = this.sounds.fire_nuke;
    this.sounds.nukeBlast = this.sounds.explosion_nuke;

    this.sounds.ufo_whoosh = new Howl({ src: audio('/assets/audio/ufo1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/ufo1.mp3'), volume: this._sfxDefaults.ufo_whoosh * this._sfxVolume });
    this.sounds.plane_flyby = new Howl({ src: audio('/assets/audio/plane1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/plane1.mp3'), volume: this._sfxDefaults.plane_flyby * this._sfxVolume });
    this.sounds.paratrooper_drop = new Howl({ src: audio('/assets/audio/parachute1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/parachute1.mp3'), volume: this._sfxDefaults.paratrooper_drop * this._sfxVolume });
    this.sounds.parachute_deploy = new Howl({ src: audio('/assets/audio/cloth_pop1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/cloth_pop1.mp3'), volume: this._sfxDefaults.parachute_deploy * this._sfxVolume });
    this.sounds.crate_inbound = new Howl({ src: audio('/assets/audio/radio_ping1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/radio_ping1.mp3'), volume: this._sfxDefaults.crate_inbound * this._sfxVolume });
    this.sounds.crate_pickup = new Howl({ src: audio('/assets/audio/pickup1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/pickup1.mp3'), volume: this._sfxDefaults.crate_pickup * this._sfxVolume });

    this.windLoop = new Howl({ src: audio('/assets/audio/wind_loop.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/wind_loop.mp3'), loop: true, volume: 0 });
    try { this.windLoop.play(); } catch (e) { console.warn('[AV] Failed to play wind loop:', e.message); }
    this.engineLoop = new Howl({ src: audio('/assets/audio/engine_loop1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/engine_loop1.mp3'), loop: true, volume: 0 });

    // Background music (simple playlist) - local first, CDN fallback
    const tracks = [
      audio('/assets/audio/music/chip1.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/music/chip1.mp3'),
      audio('/assets/audio/music/chip2.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/music/chip2.mp3'),
      audio('/assets/audio/music/chip3.mp3', 'https://cdn.jsdelivr.net/gh/AI-UX/sfx/music/chip3.mp3')
    ];
    this._musicBaseVolume = 0.25;
    this.music = new Howl({ src: [tracks[Math.floor(Math.random() * tracks.length)]], loop: true, volume: this._musicBaseVolume * this._musicVolume });
    if (this.musicOn) { try { this.music.play(); } catch (e) { console.warn('[AV] Failed to play music:', e.message); } }
  }

  updateFromCanvas(canvas) {
    // Refresh the sprite texture to reflect the updated main canvas
    if (!this.sprite) return;
    const base = this.sprite.texture?.baseTexture;
    if (base?.resource?.update) {
      base.resource.update();
    } else {
      base?.update?.();
    }
    // Render a frame (Pixi)
    this.app?.render();
  }

  _setupPixiOverlay(canvas) {
    // Optional Pixi overlay; skip if PIXI or container missing
    const container = document.getElementById('fx-overlay');
    if (!(container && globalThis.PIXI)) return;
    const app = new PIXI.Application({
      width: canvas.width,
      height: canvas.height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    container.innerHTML = '';
    container.appendChild(app.view);
    this.app = app;
    this.stage = app.stage;

    const texture = PIXI.Texture.from(canvas);
    const sprite = new PIXI.Sprite(texture);
    sprite.x = 0;
    sprite.y = 0;
    sprite.width = app.renderer.width;
    sprite.height = app.renderer.height;

    if (PIXI?.filters?.AdvancedBloomFilter) {
      const bloom = new PIXI.filters.AdvancedBloomFilter({
        threshold: 0.4,
        bloomScale: 0.7,
        brightness: 1.05,
        blur: 2
      });
      sprite.filters = [bloom];
    }

    this.sprite = sprite;
    this.stage.addChild(sprite);

    const onResize = () => {
      if (!this.app) return;
      this.app.renderer.resize(canvas.width, canvas.height);
      if (this.sprite) {
        this.sprite.width = this.app.renderer.width;
        this.sprite.height = this.app.renderer.height;
      }
    };
    window.addEventListener('resize', onResize);
  }

  _setupFlashEl() {
    let flash = document.getElementById('screen-flash');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'screen-flash';
      flash.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:#fff;opacity:0;z-index:1200;mix-blend-mode:screen;';
      document.body.appendChild(flash);
    }
    this.flashEl = flash;
  }

  // --- Audio helpers ---
  _ensureContext() {
    try {
      if (this._ac) return;
      const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctor) return;
      this._ac = new Ctor();
      this._master = this._ac.createGain();
      const vol = Math.max(0, Math.min(1, this.masterVolume));
      this._master.gain.value = this.muted ? 0 : vol;
      this._master.connect(this._ac.destination);
    } catch {}
  }
  _initSynthAudio() {
    try {
      this._ensureContext();
      if (!this._ac || !this._master) return;
      // Wind: filtered noise through _windGain (start silent)
      const bufferSize = 2 * this._ac.sampleRate;
      const noiseBuffer = this._ac.createBuffer(1, bufferSize, this._ac.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      const noise = this._ac.createBufferSource();
      noise.buffer = noiseBuffer; noise.loop = true;
      const filter = this._ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
      this._windGain = this._ac.createGain(); this._windGain.gain.value = 0;
      noise.connect(filter); filter.connect(this._windGain); this._windGain.connect(this._master);
      noise.start();
      this._windNode = noise;
      // Engine: oscillator + gain, off by default
      this._engineGain = this._ac.createGain(); this._engineGain.gain.value = 0;
      this._engineOsc = this._ac.createOscillator(); this._engineOsc.type = 'sawtooth'; this._engineOsc.frequency.value = 90;
      this._engineOsc.connect(this._engineGain); this._engineGain.connect(this._master);
      this._engineOsc.start();
  // Music gain (osc created lazily)
  this._musicGain = this._ac.createGain(); this._musicGain.gain.value = 0; this._musicGain.connect(this._master);
    } catch {}
  }

  _playTone({ freq = 440, duration = 0.1, type = 'square', vol = 0.2 }) {
    try {
      this._ensureContext(); if (!this._ac || !this._master) return;
      const now = this._ac.currentTime;
      const osc = this._ac.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, now);
      const g = this._ac.createGain();
      const v = Math.max(0, Math.min(1, vol));
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(this.muted ? 0 : v, now + 0.01);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * 0.001), now + Math.max(0.02, duration));
      osc.connect(g); g.connect(this._master);
      osc.start(now); osc.stop(now + Math.max(0.03, duration + 0.03));
    } catch {}
  }
  _noiseBurst({ duration = 0.18, vol = 0.25, color = 'low' } = {}) {
    try {
      this._ensureContext(); if (!this._ac || !this._master) return;
      const length = Math.max(1, Math.floor(this._ac.sampleRate * duration));
      const buf = this._ac.createBuffer(1, length, this._ac.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < length; i++) ch[i] = (Math.random() * 2 - 1) * (color === 'low' ? 0.6 : 0.4);
      const src = this._ac.createBufferSource(); src.buffer = buf; src.loop = false;
      const filt = this._ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = (color === 'low') ? 800 : 2000;
      const g = this._ac.createGain();
      const v = Math.max(0, Math.min(1, vol));
      const now = this._ac.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(this.muted ? 0 : v, now + 0.01);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * 0.002), now + duration);
      src.connect(filt); filt.connect(g); g.connect(this._master);
      src.start(now); src.stop(now + duration + 0.02);
    } catch {}
  }
  // Attempt to unlock/resume WebAudio after a user gesture
  unlockAudio() {
    try {
      const jobs = this._resumeAudioContexts();
      const onDone = () => {
        console.log('[Audio] Audio contexts resumed successfully');
        this._ensureLoopsAfterUnlock();
        this._playConfirmChirp();
      };
      if (jobs.length) {
        Promise.allSettled(jobs).then(onDone).catch((err) => {
          console.error('[Audio] Failed to resume audio contexts:', err);
          onDone(); // Still try to play loops even if resume failed
        });
      } else {
        onDone();
      }
    } catch (error) {
      console.error('[Audio] Error in unlockAudio:', error);
    }
  }

  _resumeAudioContexts() {
    const tasks = [];
    const p1 = this._resumeHowlerCtx(); if (p1) tasks.push(p1);
    const p2 = this._resumeSynthCtx(); if (p2) tasks.push(p2);
    return tasks;
  }

  _resumeHowlerCtx() {
    try {
      const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!globalThis.Howler?.ctx && typeof Ctor === 'function') {
        globalThis.Howler = globalThis.Howler || {}; globalThis.Howler.ctx = new Ctor();
      }
      const ctx = globalThis.Howler?.ctx;
      if (ctx?.state && ctx.state !== 'running') {
        const p = ctx.resume();
        if (p?.then) return p.catch(() => {});
      }
    } catch {}
    return null;
  }
  _resumeSynthCtx() {
    try {
      if (this._ac?.state && this._ac.state !== 'running') {
        const p = this._ac.resume();
        if (p?.then) return p.catch(() => {});
      }
    } catch {}
    return null;
  }

  _ensureLoopsAfterUnlock() {
    try { this.windLoop?.play?.(); } catch {}
    if (this.musicOn) {
      if (this.music?.play) { try { this.music.play(); } catch {} }
      else { this._startMusicSynth(); }
    }
  }
  _playConfirmChirp() { this._beep({ freq: 660, duration: 0.04, volume: 0.15 }); }

  // Simple beep fallback using WebAudio oscillator
  _beep({ freq = 440, duration = 0.08, volume = 0.2 } = {}) {
    try {
      const ac = globalThis.Howler?.ctx || new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      if (!ac) return;
      const now = ac.currentTime || 0;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const v = Math.max(0, Math.min(1, volume * (this.muted ? 0 : this.masterVolume)));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(v, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * 0.001), now + Math.max(0.01, duration));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + Math.max(0.02, duration + 0.02));
    } catch {}
  }

  // Volume/mute
  setMasterVolume01(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    try { if (globalThis.Howler) Howler.volume(this.masterVolume); } catch {}
    try { if (this._master) this._master.gain.value = this.muted ? 0 : this.masterVolume; } catch {}
    try { localStorage.setItem('se.volume', String(this.masterVolume)); } catch (e) { console.warn('[AV] Failed to save volume to localStorage:', e.message); }
  }
  // Aliases used by UI wiring
  setMasterVolume(v) { this.setMasterVolume01(v); }
  setSfxVolume(v) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    // Update all SFX howl volumes relative to their defaults (music handled separately)
    try {
      if (this.sounds && this._sfxDefaults) {
        for (const [key, howl] of Object.entries(this.sounds)) {
          if (!howl || key === 'nukeCharge' || key === 'nukeBlast') continue;
          const base = this._sfxDefaults[key];
          if (typeof base === 'number' && typeof howl.volume === 'function') {
            howl.volume(base * this._sfxVolume);
          }
        }
      }
    } catch {}
    try { localStorage.setItem('se.volume.sfx', String(this._sfxVolume)); } catch {}
  }
  setMusicVolume(v) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    try { if (this.music?.volume) this.music.volume((this._musicBaseVolume || 0.25) * this._musicVolume); } catch {}
    try { if (this._musicGain) this._musicGain.gain.value = this.muted ? 0 : Math.min(0.4, this._musicVolume * 0.4); } catch {}
    try { localStorage.setItem('se.volume.music', String(this._musicVolume)); } catch {}
  }
  playMusic() {
    this.musicOn = true;
    try { localStorage.setItem('se.musicOn', '1'); localStorage.setItem('se.music.enabled', 'true'); } catch {}
    if (this.music?.play) { try { this.music.play(); } catch {} }
    else { this._startMusicSynth(); }
  }
  stopMusic() {
    this.musicOn = false;
    try { localStorage.setItem('se.musicOn', '0'); localStorage.setItem('se.music.enabled', 'false'); } catch {}
    if (this.music?.stop) { try { this.music.stop(); } catch {} }
    this._stopMusicSynth();
  }
  toggleMute() {
    this.muted = !this.muted;
    try { if (globalThis.Howler) Howler.mute(this.muted); } catch {}
    try { if (this._master) this._master.gain.value = this.muted ? 0 : this.masterVolume; } catch {}
    try { localStorage.setItem('se.muted', this.muted ? '1' : '0'); } catch {}
    return this.muted;
  }
  // Music
  toggleMusic() {
    this.musicOn = !this.musicOn;
    try { localStorage.setItem('se.musicOn', this.musicOn ? '1' : '0'); } catch {}
    if (this.music?.play) {
      if (this.musicOn) { try { this.music.play(); } catch (e) { console.warn('[AV] Failed to play music:', e.message); } }
      else { try { this.music.stop(); } catch {} }
      return this.musicOn;
    }
    // Synth music
    if (!this._ac) this._ensureContext();
    if (this.musicOn) this._startMusicSynth(); else this._stopMusicSynth();
    return this.musicOn;
  }
  _startMusicSynth() {
    try {
      this._ensureContext(); if (!this._ac || !this._master) return;
  const notes = [261.63, 329.63, 392, 523.25]; // C-E-G-C
      const types = ['square','square','triangle','square'];
      let i = 0;
      if (this._musicOsc) { try { this._musicOsc.stop(); } catch {} this._musicOsc.disconnect?.(); this._musicOsc = null; }
      this._musicGain.gain.value = this.muted ? 0 : 0.08;
      const tick = () => {
        try {
          if (!this.musicOn) return;
          const now = this._ac.currentTime;
          const osc = this._ac.createOscillator();
          osc.type = types[i % types.length]; osc.frequency.value = notes[i % notes.length];
          const g = this._ac.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(this.muted ? 0 : 0.12, now + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
          osc.connect(g); g.connect(this._musicGain); this._musicGain.connect(this._master);
          osc.start(now); osc.stop(now + 0.25);
          i++;
        } catch {}
      };
      this._musicTimer = setInterval(tick, 250);
    } catch {}
  }
  _stopMusicSynth() { try { clearInterval(this._musicTimer); } catch {}; this._musicTimer = null; try { this._musicGain && (this._musicGain.gain.value = 0); } catch {} }
  
  // SFX
  playFire(weapon) {
    if (!this.sounds) { this._beep({ freq: 900, duration: 0.05, volume: 0.15 }); return; }
    const map = {
      laser: this.sounds.fire_laser,
      heavy: this.sounds.fire_heavy,
      nuke: this.sounds.fire_nuke,
      cluster: this.sounds.fire_cluster,
      homing: this.sounds.fire_homing,
    };
    const h = (map[weapon] || this.sounds.fire_generic);
    if (h?.state && h.state() !== 'loaded') {
      this._beep({ freq: 900, duration: 0.05, volume: 0.15 });
    } else if (h?.play) {
      try { h.play(); } catch { this._beep({ freq: 900, duration: 0.05, volume: 0.15 }); }
    } else {
      this._beep({ freq: 900, duration: 0.05, volume: 0.15 });
    }
  }
  playExplosion(type, magnitude = 1) {
    if (!this.sounds || Object.keys(this.sounds).length === 0) {
      const color = (type === 'nuke' || type === 'heavy') ? 'low' : 'high';
      this._noiseBurst({ duration: 0.12 + Math.min(0.2, magnitude * 0.08), vol: 0.22 + Math.min(0.2, magnitude * 0.08), color });
      return;
    }
    const h = this._getExplosionSound(type);
    if (!h) { this._fallbackExplosionBeep(type, magnitude); return; }
    if (h?.state && h.state() !== 'loaded') { this._fallbackExplosionBeep(type, magnitude); return; }
    if (h === this.sounds.explosion_small) { h?.volume?.(Math.min(0.6, 0.3 + 0.2 * magnitude)); }
    const played = (() => { try { return h?.play?.(); } catch { return null; } })();
    if (played == null) this._fallbackExplosionBeep(type, magnitude);
  }
  _getExplosionSound(type) {
    const s = this.sounds;
    if (!s) return null;
    if (type === 'nuke') return s.explosion_nuke;
    if (type === 'heavy' || type === 'bunker' || type === 'mirv' || type === 'funky') return s.explosion_heavy;
    return s.explosion_small;
  }
  _fallbackExplosionBeep(type, magnitude) {
    let base;
    if (type === 'nuke') base = 160; else if (type === 'heavy') base = 180; else base = 220;
    this._beep({ freq: Math.max(120, base - magnitude * 40), duration: 0.1 + Math.min(0.25, magnitude * 0.08), volume: 0.25 });
  }
  playNukeCharge() { this.sounds.nukeCharge?.play(); }
  playNukeBlast() { this.sounds.nukeBlast?.play(); }
  setWindVolume(strength) {
    const v = Math.max(0, Math.min(1, strength / 20));
    if (this.windLoop) {
      this.windLoop.volume(v * 0.4);
      return;
    }
    try { if (this._windGain) this._windGain.gain.value = (this.muted ? 0 : v * 0.15); } catch {}
  }
  enginePing() {
    if (!this.engineLoop) {
      // Synth engine: fade in quickly and schedule fade out
      this._ensureContext(); if (!this._engineGain) this._initSynthAudio();
      try {
        if (this._engineTimer) clearTimeout(this._engineTimer);
        const g = this._engineGain.gain;
        const now = this._ac.currentTime;
        g.cancelScheduledValues(now);
        const target = this.muted ? 0 : 0.22;
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(target, now + 0.08);
        this._engineTimer = setTimeout(() => {
          const t = this._ac.currentTime;
          g.cancelScheduledValues(t);
          g.setValueAtTime(g.value, t);
          g.linearRampToValueAtTime(0.0001, t + 0.25);
        }, 420);
      } catch {}
      return;
    }
    this.enginePingAt = performance.now?.() || Date.now();
    if (!this.engineActive) {
      this.engineActive = true;
      try { this.engineLoop.play(); } catch {}
      this.engineLoop.fade(0, 0.28, 120);
    }
    // Schedule decay check
    clearTimeout(this._engineTimer);
    this._engineTimer = setTimeout(() => {
      const now = performance.now?.() || Date.now();
      if (now - this.enginePingAt > 400) {
        this.engineLoop.fade(this.engineLoop.volume(), 0, 200);
        setTimeout(() => { try { this.engineLoop.stop(); } catch {} this.engineActive = false; }, 220);
      }
    }, 450);
  }
  playUfoFlyby() { const h = this.sounds?.ufo_whoosh; if (!h) { this._beep({ freq: 520, duration: 0.08, volume: 0.15 }); return; } if (h?.state && h.state() !== 'loaded') this._beep({ freq: 520, duration: 0.08, volume: 0.15 }); else { const ok = (()=>{ try { return h?.play?.(); } catch { return null; } })(); if (ok == null) this._beep({ freq: 520, duration: 0.08, volume: 0.15 }); } }
  playPlaneFlyby() { const h = this.sounds?.plane_flyby; if (!h) { this._beep({ freq: 300, duration: 0.1, volume: 0.15 }); return; } if (h?.state && h.state() !== 'loaded') this._beep({ freq: 300, duration: 0.1, volume: 0.15 }); else { const ok = (()=>{ try { return h?.play?.(); } catch { return null; } })(); if (ok == null) this._beep({ freq: 300, duration: 0.1, volume: 0.15 }); } }
  playParatrooperDrop() { const h = this.sounds?.paratrooper_drop; if (!h) { this._beep({ freq: 700, duration: 0.05, volume: 0.12 }); return; } if (h?.state && h.state() !== 'loaded') this._beep({ freq: 700, duration: 0.05, volume: 0.12 }); else { const ok = (()=>{ try { return h?.play?.(); } catch { return null; } })(); if (ok == null) this._beep({ freq: 700, duration: 0.05, volume: 0.12 }); } }
  playParachuteDeploy() { const h = this.sounds?.parachute_deploy; if (!h) { this._beep({ freq: 820, duration: 0.05, volume: 0.12 }); return; } if (h?.state && h.state() !== 'loaded') this._beep({ freq: 820, duration: 0.05, volume: 0.12 }); else { const ok = (()=>{ try { return h?.play?.(); } catch { return null; } })(); if (ok == null) this._beep({ freq: 820, duration: 0.05, volume: 0.12 }); } }
  playCrateInbound() { const h = this.sounds?.crate_inbound; if (!h) { this._beep({ freq: 960, duration: 0.04, volume: 0.12 }); return; } if (h?.state && h.state() !== 'loaded') this._beep({ freq: 960, duration: 0.04, volume: 0.12 }); else { const ok = (()=>{ try { return h?.play?.(); } catch { return null; } })(); if (ok == null) this._beep({ freq: 960, duration: 0.04, volume: 0.12 }); } }
  playCratePickup() { const h = this.sounds?.crate_pickup; if (!h) { this._beep({ freq: 640, duration: 0.05, volume: 0.12 }); return; } if (h?.state && h.state() !== 'loaded') this._beep({ freq: 640, duration: 0.05, volume: 0.12 }); else { const ok = (()=>{ try { return h?.play?.(); } catch { return null; } })(); if (ok == null) this._beep({ freq: 640, duration: 0.05, volume: 0.12 }); } }

  // Simple synthesized siren for bomber inbound
  playBomberSiren() {
    try {
      this._ensureContext();
      const ac = this._ac; const master = this._master; if (!ac || !master) { this._beep({ freq: 500, duration: 0.2, volume: 0.2 }); return; }
      const now = ac.currentTime;
      const osc = ac.createOscillator(); osc.type = 'sine';
      const g = ac.createGain(); g.gain.value = 0; osc.connect(g); g.connect(master);
      // Wailing up-down over ~1.2s
      const dur = 1.2; const f1 = 520; const f2 = 880;
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.linearRampToValueAtTime(f2, now + 0.6);
      osc.frequency.linearRampToValueAtTime(f1, now + dur);
      const v = this.muted ? 0 : Math.min(0.18, this.masterVolume * 0.2);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(v, now + 0.08);
      g.gain.linearRampToValueAtTime(0.0001, now + dur);
      osc.start(now); osc.stop(now + dur + 0.05);
    } catch { this._beep({ freq: 500, duration: 0.2, volume: 0.2 }); }
  }

  // --- FX helpers ---
  flash(color = '#fff', duration = 0.25) {
    if (!this.flashEl || !globalThis.gsap) return;
    this.flashEl.style.background = color;
    gsap.killTweensOf(this.flashEl);
    gsap.set(this.flashEl, { opacity: 0.9 });
    gsap.to(this.flashEl, { opacity: 0, duration, ease: 'power2.out' });
  }

  /**
   * Clean up all resources to prevent memory leaks
   */
  dispose() {
    console.log('[AV] Disposing audio/visual resources...');

    // Clean up timers
    if (this._engineTimer) {
      clearTimeout(this._engineTimer);
      this._engineTimer = null;
    }
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }

    // Stop and unload all Howl sounds
    for (const [key, sound] of Object.entries(this.sounds)) {
      if (sound && sound.unload) {
        try {
          sound.stop();
          sound.unload();
        } catch (e) {
          console.warn(`Failed to unload sound ${key}:`, e);
        }
      }
    }
    this.sounds = {};

    // Stop and unload loops
    if (this.windLoop) {
      try {
        this.windLoop.stop();
        this.windLoop.unload();
      } catch {}
      this.windLoop = null;
    }

    if (this.engineLoop) {
      try {
        this.engineLoop.stop();
        this.engineLoop.unload();
      } catch {}
      this.engineLoop = null;
    }

    if (this.music) {
      try {
        this.music.stop();
        this.music.unload();
      } catch {}
      this.music = null;
    }

    // Clean up Web Audio nodes
    if (this._windNode) {
      try { this._windNode.disconnect(); } catch {}
      this._windNode = null;
    }
    if (this._windGain) {
      try { this._windGain.disconnect(); } catch {}
      this._windGain = null;
    }
    if (this._engineOsc) {
      try { this._engineOsc.stop(); this._engineOsc.disconnect(); } catch {}
      this._engineOsc = null;
    }
    if (this._engineGain) {
      try { this._engineGain.disconnect(); } catch {}
      this._engineGain = null;
    }
    if (this._musicOsc) {
      try { this._musicOsc.stop(); this._musicOsc.disconnect(); } catch {}
      this._musicOsc = null;
    }
    if (this._musicGain) {
      try { this._musicGain.disconnect(); } catch {}
      this._musicGain = null;
    }
    if (this._master) {
      try { this._master.disconnect(); } catch {}
      this._master = null;
    }

    // Close AudioContext
    if (this._ac) {
      try { this._ac.close(); } catch {}
      this._ac = null;
    }

    // Clean up Pixi resources
    if (this.sprite) {
      try { this.sprite.destroy(true); } catch {}
      this.sprite = null;
    }

    if (this.stage) {
      try { this.stage.destroy(true); } catch {}
      this.stage = null;
    }

    if (this.app) {
      try {
        this.app.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch (e) {
        console.warn('Failed to destroy Pixi app:', e);
      }
      this.app = null;
    }

    // Clean up DOM elements
    if (this.flashEl && this.flashEl.parentNode) {
      try { this.flashEl.parentNode.removeChild(this.flashEl); } catch {}
      this.flashEl = null;
    }

    console.log('[AV] Cleanup complete');
  }
}

// Convenience factory
export function createAV(canvas) {
  const av = new AV();
  return av.init(canvas);
}
