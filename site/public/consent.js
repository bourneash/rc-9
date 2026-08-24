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

  // --- Google Consent Mode v2 --------------------------------------------
  // Must run BEFORE any Google tag (GA4, AdSense) so those tags see a denied
  // default and buffer instead of writing cookies. index.html loads this file
  // with `defer` ahead of /adsense.js, and defer preserves document order, so
  // the defaults below are always in the dataLayer first.
  //
  // Note: this is the technical signal only. For EEA/UK ad traffic Google also
  // requires a certified CMP — that is the "Privacy & messaging → GDPR" message
  // enabled in the AdSense console, not this banner.
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  var granted = null;
  try {
    granted = localStorage.getItem(STORAGE_KEY);
  } catch {
    granted = null;
  }
  var initial = granted === 'true' ? 'granted' : 'denied';

  gtag('consent', 'default', {
    ad_storage: initial,
    ad_user_data: initial,
    ad_personalization: initial,
    analytics_storage: initial,
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });

  function updateConsent(state) {
    gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
    });
  }

  function loadGa4() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + TRACKING_ID;
    document.head.appendChild(s);
    // Do NOT redefine window.gtag here — it is already defined above and the
    // consent-mode defaults are queued on the same dataLayer. Replacing it
    // would orphan that queue.
    gtag('js', new Date());
    gtag('config', TRACKING_ID, { anonymize_ip: true });
  }

  // Load analytics immediately if previously consented; otherwise wait for the grant.
  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    loadGa4();
  } else {
    window.addEventListener('rc9-consent-granted', loadGa4, { once: true });
  }

  // Footer "Cookie prefs" link: clear the stored choice and re-prompt.
  function wirePrefsLink() {
    // Footer control plus any in-copy "Cookie prefs" link (privacy.html has one).
    var links = document.querySelectorAll('#rc9-cookie-prefs, #rc9-cookie-prefs-inline');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) {
        e.preventDefault();
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        updateConsent('denied');
        location.reload();
      });
    }
  }

  // Build the banner for pages that don't ship the markup inline.
  // index.html has it hand-written in the document; help/privacy/terms are
  // plain static files with no templating, so rather than copy-pasting the
  // markup four times (and letting the copies drift) we synthesise it here.
  // Every page that loads this script therefore gets the same banner, the same
  // Accept/Decline pair, and the same consent-mode wiring.
  function buildBanner() {
    var el = document.createElement('div');
    el.id = 'rc9-cookie-banner';
    el.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#0a0f08;' +
      'border-top:1px solid rgba(80,220,130,0.3);padding:12px 20px;display:flex;' +
      'align-items:center;justify-content:space-between;gap:12px;font-family:monospace;' +
      'font-size:11px;color:#aaa;opacity:0;transform:translateY(8px);' +
      'transition:opacity 0.3s,transform 0.3s;pointer-events:none;';

    var msg = document.createElement('span');
    msg.appendChild(document.createTextNode('We use cookies for analytics and advertising. '));
    var link = document.createElement('a');
    link.href = '/privacy';
    link.textContent = 'Details';
    link.style.cssText =
      'color:#50dc82;text-decoration:none;border-bottom:1px solid rgba(80,220,130,0.3)';
    msg.appendChild(link);
    msg.appendChild(document.createTextNode('.'));

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px';

    function mkBtn(id, label, primary) {
      var b = document.createElement('button');
      b.id = id;
      b.type = 'button';
      b.textContent = label;
      b.style.cssText =
        'font-family:monospace;font-size:10px;letter-spacing:0.15em;padding:4px 10px;' +
        'cursor:pointer;text-transform:uppercase;' +
        (primary
          ? 'background:#50dc82;border:1px solid #50dc82;color:#0a0f08;'
          : 'background:none;border:1px solid rgba(80,220,130,0.3);color:#777;');
      return b;
    }
    btns.appendChild(mkBtn('rc9-cookie-decline', 'Decline', false));
    btns.appendChild(mkBtn('rc9-cookie-accept', 'Accept', true));

    el.appendChild(msg);
    el.appendChild(btns);
    document.body.appendChild(el);
    return el;
  }

  // Cookie banner reveal + Accept/Decline wiring.
  function wireBanner() {
    var el = document.getElementById('rc9-cookie-banner') || buildBanner();
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
        updateConsent('granted');
        window.dispatchEvent(new CustomEvent('rc9-consent-granted'));
        hide();
      });
    }
    if (decline) {
      decline.addEventListener('click', function () {
        localStorage.setItem(STORAGE_KEY, 'false');
        updateConsent('denied');
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
