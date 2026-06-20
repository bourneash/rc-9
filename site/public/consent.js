// Consent-gated analytics + cookie banner for rc-9.com.
//
// This logic used to live in two inline <script> blocks plus inline on* handlers
// in index.html. The site's CSP (`script-src 'self' …`, no 'unsafe-inline') blocks
// all inline scripts/handlers, which silently killed the cookie banner and GA4 in
// production. It now lives in this external file (served from 'self', so allowed),
// letting the CSP stay strict while the consent flow actually works.
(function () {
  'use strict';
  var STORAGE_KEY = 'rc9_analytics_consent';
  var TRACKING_ID = 'G-R2H86NCJ2F';
  var gaLoaded = false;

  function loadGa4() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + TRACKING_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', TRACKING_ID, { anonymize_ip: true });
  }

  // Load analytics immediately if previously consented; otherwise wait for the grant.
  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    loadGa4();
  } else {
    window.addEventListener('rc9-consent-granted', loadGa4, { once: true });
  }

  // Footer "Cookie prefs" link: clear the stored choice and re-prompt.
  function wirePrefsLink() {
    var prefs = document.getElementById('rc9-cookie-prefs');
    if (!prefs) return;
    prefs.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
  }

  // Cookie banner reveal + Accept/Decline wiring.
  function wireBanner() {
    var el = document.getElementById('rc9-cookie-banner');
    if (!el) return;
    // Already decided -> never show the banner.
    if (localStorage.getItem(STORAGE_KEY) !== null) {
      el.remove();
      return;
    }

    function hide() {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(function () {
        if (el) el.remove();
      }, 300);
    }

    var accept = document.getElementById('rc9-cookie-accept');
    var decline = document.getElementById('rc9-cookie-decline');
    if (accept) {
      accept.addEventListener('click', function () {
        localStorage.setItem(STORAGE_KEY, 'true');
        window.dispatchEvent(new CustomEvent('rc9-consent-granted'));
        hide();
      });
    }
    if (decline) {
      decline.addEventListener('click', function () {
        localStorage.setItem(STORAGE_KEY, 'false');
        hide();
      });
    }

    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.style.pointerEvents = 'auto';
    });
  }

  function init() {
    wirePrefsLink();
    wireBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
