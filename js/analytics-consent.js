(function () {
  'use strict';

  var measurementId = 'G-92WFM8XF0H';
  var consentKey = 'kic_analytics_consent';
  var existing = window.localStorage.getItem(consentKey);

  function loadAnalytics() {
    if (window.__kicAnalyticsLoaded) return;
    window.__kicAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function closeBanner(banner) {
    banner.classList.add('is-closing');
    window.setTimeout(function () { banner.remove(); }, 180);
  }

  function saveChoice(value, banner) {
    window.localStorage.setItem(consentKey, value);
    if (value === 'accepted') loadAnalytics();
    closeBanner(banner);
  }

  function showBanner() {
    var style = document.createElement('style');
    style.textContent = '.kic-consent{position:fixed;z-index:99999;left:16px;right:16px;bottom:16px;max-width:760px;margin:auto;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:18px 20px;background:#fffaf3;color:#24130d;border:1px solid rgba(86,45,24,.22);border-radius:18px;box-shadow:0 18px 55px rgba(20,9,4,.28);font-family:"Plus Jakarta Sans",sans-serif;transition:opacity .18s ease,transform .18s ease}.kic-consent.is-closing{opacity:0;transform:translateY(10px)}.kic-consent__copy{margin:0;font-size:14px;line-height:1.55}.kic-consent__copy strong{display:block;margin-bottom:3px;font-family:Montserrat,sans-serif;font-size:15px}.kic-consent__copy a{color:#6b351d;text-decoration:underline;text-underline-offset:3px}.kic-consent__actions{display:flex;gap:9px}.kic-consent__button{min-height:44px;padding:0 16px;border:1px solid #4a2517;border-radius:999px;background:transparent;color:#32180f;font:700 13px Montserrat,sans-serif;cursor:pointer}.kic-consent__button--accept{background:#f7bf22;border-color:#f7bf22;color:#1b0e09}.kic-consent__button:focus-visible{outline:3px solid #f7bf22;outline-offset:3px}@media(max-width:680px){.kic-consent{grid-template-columns:1fr;padding:17px}.kic-consent__actions{display:grid;grid-template-columns:1fr 1fr}.kic-consent__button{width:100%}}';
    document.head.appendChild(style);

    var banner = document.createElement('section');
    banner.className = 'kic-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Préférences de mesure d’audience');
    banner.innerHTML = '<p class="kic-consent__copy"><strong>Votre confidentialité compte</strong>Avec votre accord, KIC utilise Google Analytics pour mesurer la fréquentation et améliorer le site. <a href="confidentialite.html#mesure-audience">En savoir plus</a></p><div class="kic-consent__actions"><button class="kic-consent__button" type="button" data-consent="declined">Refuser</button><button class="kic-consent__button kic-consent__button--accept" type="button" data-consent="accepted">Accepter</button></div>';
    banner.addEventListener('click', function (event) {
      var button = event.target.closest('[data-consent]');
      if (button) saveChoice(button.getAttribute('data-consent'), banner);
    });
    document.body.appendChild(banner);
  }

  if (existing === 'accepted') {
    loadAnalytics();
  } else if (existing !== 'declined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner, { once: true });
    } else {
      showBanner();
    }
  }
})();
