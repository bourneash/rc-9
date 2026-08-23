// Google AdSense integration for rc-9.com.
//
// Design rules (deliberate — do not "improve" by loosening these):
//   1. NEVER cover the play surface. Units only render into explicit
//      [data-rc9-ad] containers that live on the title screen, inside the
//      end-of-round Engagement Report, or on the static content pages.
//   2. Anchor / vignette / interstitial auto-formats are suppressed. A
//      full-viewport canvas game with a bottom HUD cannot tolerate an anchor
//      ad — it sits directly over the controls bar.
//   3. Unfilled units collapse to zero height so the layout never shows a
//      dead grey rectangle.
//   4. Served from an external file because the site CSP has no
//      'unsafe-inline' for scripts. The loader itself is unconditional (same
//      as the rest of the fleet) — Google's own CMP handles EEA consent for
//      ad personalisation; our banner still gates GA4 in /consent.js.
(function () {
  'use strict';

  var CLIENT = 'ca-pub-9826966557108061';

  // Ad unit slot IDs, keyed by the data-rc9-ad value on the container.
  // Empty string = unit not created in the AdSense console yet; the container
  // stays hidden rather than rendering a broken <ins>.
  var SLOTS = {
    'title-screen': '',
    'engagement-report': '',
    content: '',
  };

  var loaded = false;

  function slotFor(name) {
    return Object.prototype.hasOwnProperty.call(SLOTS, name) ? SLOTS[name] : '';
  }

  function loadSdk() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT;
    s.onerror = function () {
      console.warn('[adsense] SDK blocked or failed to load — game continues ad-free');
    };
    document.head.appendChild(s);

    // Suppress auto-placed overlay formats. Manual units only.
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({
      google_ad_client: CLIENT,
      enable_page_level_ads: false,
      overlays: { bottom: false },
    });

    renderAll();
  }

  // Fill one container. Idempotent — safe to call again when the title screen
  // or Engagement Report is re-shown.
  function render(el) {
    if (!el || el.dataset.rc9AdFilled === '1') return;
    var slot = slotFor(el.dataset.rc9Ad);
    if (!slot) return; // no unit provisioned yet → leave hidden

    // AdSense computes 0 width inside a hidden ancestor and permanently marks
    // the unit as unfillable. The title screen and the Engagement Report are
    // both hidden at load, so defer until their container is actually laid out
    // (refresh() is re-called when each is shown).
    el.hidden = false;
    if (!el.offsetParent && el.offsetWidth === 0) {
      el.hidden = true;
      return;
    }
    el.dataset.rc9AdFilled = '1';

    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', CLIENT);
    ins.setAttribute('data-ad-slot', slot);
    ins.setAttribute('data-ad-format', el.dataset.rc9AdFormat || 'horizontal');
    ins.setAttribute('data-full-width-responsive', 'true');
    el.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn('[adsense] push failed:', err);
      el.hidden = true;
    }

    // Collapse the wrapper if Google reports no fill, so we never leave a
    // reserved blank band on the title screen or in the report modal.
    var tries = 0;
    var poll = setInterval(function () {
      if (++tries > 20) return clearInterval(poll);
      var status = ins.getAttribute('data-ad-status');
      if (!status) return;
      clearInterval(poll);
      if (status === 'unfilled') el.hidden = true;
    }, 500);
  }

  function renderAll() {
    var nodes = document.querySelectorAll('[data-rc9-ad]');
    for (var i = 0; i < nodes.length; i++) render(nodes[i]);
  }

  // Public hook: call after showing a screen that owns an ad container.
  window.__RC9_ADSENSE__ = { refresh: renderAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSdk);
  } else {
    loadSdk();
  }
})();
