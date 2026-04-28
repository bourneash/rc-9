// GameDistribution / Portal Ads Integration
// Supports: preroll (on first game start), rewarded (revive/unlock/refuel)
// Portal-agnostic wrapper — abstracts GameDistribution SDK so we can swap in CrazyGames SDK or others later.

const GAME_ID = '__GAME_ID_REPLACE_ME__'; // Set per-portal at build time; GameDistribution assigns on submission

const AdAPI = {
  _ready: false,
  _enabled: false,
  _sessionAdsShown: 0,
  _maxPerSession: 3,
  _prerollShown: false,

  // Detect whether we should load ads at all.
  // Rules: enable if embedded in iframe (portal), OR explicitly opted in via URL param, OR in production on rc-9.com.
  shouldEnable() {
    try {
      const inIframe = window.self !== window.top;
      const urlOptIn = new URLSearchParams(location.search).has('ads');
      const onProd = /rc-9\.com$/.test(location.hostname);
      return inIframe || urlOptIn || onProd;
    } catch {
      return true; // if cross-origin throws, we're in iframe → portal
    }
  },

  init() {
    if (!this.shouldEnable()) {
      console.info('[ads] disabled (dev/non-portal context)');
      return;
    }
    this._enabled = true;
    // GameDistribution SDK bootstrap
    window.GD_OPTIONS = {
      gameId: GAME_ID,
      onEvent: (event) => {
        if (event.name === 'SDK_READY') this._ready = true;
        if (event.name === 'SDK_ERROR') console.warn('[ads]', event);
      }
    };
    const s = document.createElement('script');
    s.src = 'https://html5.api.gamedistribution.com/main.min.js';
    s.async = true;
    s.onerror = () => console.warn('[ads] SDK failed to load — game continues ad-free');
    document.head.appendChild(s);
  },

  // Show preroll ad once per session on first game start
  async showPreroll() {
    if (!this._enabled || this._prerollShown) return;
    this._prerollShown = true;
    return this._showAd('start');
  },

  // Show rewarded ad; callback fires only if user completed the ad
  async showRewarded(onReward) {
    if (!this._enabled) { onReward?.(); return; } // dev → just grant reward
    if (this._sessionAdsShown >= this._maxPerSession) {
      console.info('[ads] session cap reached, granting reward without ad');
      onReward?.();
      return;
    }
    try {
      await this._showAd('rewarded');
      this._sessionAdsShown++;
      onReward?.();
    } catch (err) {
      console.warn('[ads] rewarded failed:', err);
      onReward?.(); // fail-open: grant reward anyway so UX isn't broken
    }
  },

  _showAd(type) {
    return new Promise((resolve, reject) => {
      if (!window.gdsdk?.showAd) {
        return reject(new Error('SDK not ready'));
      }
      const adType = type === 'rewarded'
        ? window.gdsdk.AdType?.Rewarded || 'rewarded'
        : window.gdsdk.AdType?.Interstitial || 'interstitial';
      window.gdsdk.showAd(adType).then(resolve).catch(reject);
    });
  }
};

// Expose globally for game integration
window.__RC9_ADS__ = AdAPI;

// Auto-init on module load
AdAPI.init();

export default AdAPI;
