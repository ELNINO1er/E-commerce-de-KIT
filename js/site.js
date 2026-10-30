(function () {
  'use strict';
  var nav = document.querySelector('.kic-nav'), header = document.querySelector('.kic-header');
  if (nav && header && !header.querySelector('.kic-burger')) {
    nav.id = 'kic-nav';
    var burger = document.createElement('button'); burger.className = 'kic-burger'; burger.type = 'button'; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-controls', 'kic-nav'); burger.setAttribute('aria-label', 'Ouvrir le menu'); burger.innerHTML = '<span></span><span></span><span></span>'; header.appendChild(burger);
  }
  var privacy = document.createElement('button'); privacy.className = 'kic-privacy-preferences'; privacy.type = 'button'; privacy.textContent = 'Préférences de confidentialité';
  privacy.addEventListener('click', function () { if (window.KICPrivacy) window.KICPrivacy.reopen(); });
  (document.querySelector('.kic-footer__legal') || document.querySelector('footer') || document.body).appendChild(privacy);
  var banner = document.createElement('p'); banner.className = 'kic-environment'; banner.setAttribute('role', 'status'); banner.textContent = 'Paiement de test Stripe — aucun encaissement réel.'; document.body.prepend(banner);
  if (!window.KICAPI) return;
  window.KICShopConfig = KICAPI.config();
  window.KICStripTestOffers = function () {
    window.KICShopConfig.then(function (config) {
      if (config.paymentMode !== 'sandbox') return;
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
        try { var value = JSON.parse(script.textContent); function strip(item) { if (!item || typeof item !== 'object') return; if (item['@type'] === 'Product') delete item.offers; Object.keys(item).forEach(function (key) { if (typeof item[key] === 'object') strip(item[key]); }); } strip(value); script.textContent = JSON.stringify(value); } catch (_) {}
      });
    }).catch(function () {});
  };
  KICStripTestOffers();
  if (document.querySelector('[data-live-price-slug]')) KICAPI.products().then(function (page) {
    document.querySelectorAll('[data-live-price-slug]').forEach(function (node) { var product = page.content.find(function (p) { return p.slug === node.dataset.livePriceSlug; }); if (!product || !product.formats.length) { node.textContent = 'Disponibilité sur demande'; return; } var v = product.formats[0]; node.textContent = v.label + ' · ' + KICAPI.money(v.promoPrice == null ? v.price : v.promoPrice); });
  }).catch(function () { document.querySelectorAll('[data-live-price-slug]').forEach(function (node) { node.textContent = 'Tarif à confirmer avec KIC'; }); });
  window.KICShopConfig.then(function (config) {
    if (config.paymentMode !== 'sandbox') { banner.remove(); return; }
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      try { var schema = JSON.parse(script.textContent); function strip(value) { if (!value || typeof value !== 'object') return; if (value['@type'] === 'Product') delete value.offers; Object.keys(value).forEach(function (key) { if (typeof value[key] === 'object') strip(value[key]); }); } strip(schema); script.textContent = JSON.stringify(schema); } catch (_) {}
    });
  }).catch(function () { banner.textContent = 'Le service de commande est momentanément indisponible. Contactez KIC avant de commander.'; });
})();
