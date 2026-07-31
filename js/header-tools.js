(function () {
  'use strict';

  var CART_KEY = 'kic.cart.items';
  document.body.insertAdjacentHTML('beforeend',
    '<div class="kic-tools-overlay" aria-hidden="true">' +
      '<aside class="kic-tools-panel" role="dialog" aria-modal="true" aria-labelledby="kic-tools-title">' +
        '<div class="kic-tools-head"><h2 class="kic-tools-title" id="kic-tools-title">Espace KIC</h2><button class="kic-tools-close" type="button" aria-label="Fermer">×</button></div>' +
        '<section class="kic-tool-view" data-view="search" hidden>' +
          '<p class="kic-tool-intro">Recherchez rapidement une référence dans le catalogue KIC.</p>' +
          '<form class="kic-tool-form" data-tool-form="search"><label class="kic-tool-field"><span class="kic-tool-label">Votre recherche</span><input class="kic-tool-input" name="query" type="search" required placeholder="Beurre, poudre, infusion…"></label><button class="kic-tool-submit" type="submit">Rechercher</button></form>' +
        '</section>' +
        '<section class="kic-tool-view" data-view="account" hidden>' +
          '<div class="kic-auth-tabs"><button class="kic-auth-tab is-active" type="button" data-auth="login">Connexion</button><button class="kic-auth-tab" type="button" data-auth="register">Inscription</button></div>' +
          '<form class="kic-tool-form" data-auth-form="login"><label class="kic-tool-field"><span class="kic-tool-label">Adresse e-mail</span><input class="kic-tool-input" name="email" type="email" autocomplete="email" required></label><label class="kic-tool-field"><span class="kic-tool-label">Mot de passe</span><input class="kic-tool-input" name="password" type="password" autocomplete="current-password" minlength="8" required></label><button class="kic-tool-submit" type="submit">Se connecter</button></form>' +
          '<form class="kic-tool-form" data-auth-form="register" hidden><label class="kic-tool-field"><span class="kic-tool-label">Nom complet</span><input class="kic-tool-input" name="name" autocomplete="name" required></label><label class="kic-tool-field"><span class="kic-tool-label">E-mail professionnel</span><input class="kic-tool-input" name="email" type="email" autocomplete="email" required></label><label class="kic-tool-field"><span class="kic-tool-label">Mot de passe</span><input class="kic-tool-input" name="password" type="password" autocomplete="new-password" minlength="8" required></label><button class="kic-tool-submit" type="submit">Créer mon compte</button></form>' +
          '<p class="kic-tool-feedback" data-account-feedback role="status"></p>' +
        '</section>' +
        '<section class="kic-tool-view" data-view="cart" hidden><p class="kic-tool-intro">Retrouvez les produits ajoutés à votre panier.</p><div class="kic-cart-items"></div><div class="kic-cart-summary"><span>Total connu</span><span data-cart-total>0 €</span></div></section>' +
      '</aside>' +
    '</div>');

  var overlay = document.querySelector('.kic-tools-overlay');
  var views = Array.prototype.slice.call(document.querySelectorAll('.kic-tool-view'));
  var title = document.querySelector('.kic-tools-title');
  var lastTrigger = null;

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (error) { return []; }
  }

  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (error) { /* non bloquant */ }
    window.dispatchEvent(new CustomEvent('kic:cart-change'));
  }

  function paintCount() {
    var count = readCart().length;
    document.querySelectorAll('.kic-cart__count').forEach(function (element) {
      element.textContent = String(count);
    });
  }

  function renderCart() {
    var items = readCart();
    var total = 0;
    var container = document.querySelector('.kic-cart-items');
    var productImages = {
      'Beurre de cacao': 'img/beurre-cacao-pub.png',
      'Poudre de cacao': 'img/poudre-cacao-pub.png',
      'Masse de cacao': 'img/masse-cacao-pub.png',
      'Infusion de cacao': 'img/infusion-cacao-01.png',
      'Jus de cacao': 'img/jus-cacao.jpg'
    };
    if (!items.length) {
      container.innerHTML = '<p class="kic-cart-empty">Votre panier est vide.<br>Découvrez les produits KIC pour commencer votre sélection.</p>';
    } else {
      container.innerHTML = items.map(function (item, index) {
        if (item.price) total += Number(item.price);
        var image = item.image || productImages[item.name] || 'img/kic-hero-product.png';
        return '<article class="kic-cart-line"><img class="kic-cart-line__image" src="' + image + '" alt=""><div class="kic-cart-line__content"><strong class="kic-cart-line__name">' + item.name + '</strong><span class="kic-cart-line__meta">' + (item.price ? item.price + ' €' : 'Prix sur devis') + ' · Quantité 1</span></div><button class="kic-cart-line__remove" type="button" data-remove-index="' + index + '" aria-label="Retirer ce produit">×</button></article>';
      }).join('');
    }
    document.querySelector('[data-cart-total]').textContent = total.toLocaleString('fr-FR') + ' €';
    paintCount();
  }

  function openTool(name, trigger) {
    lastTrigger = trigger;
    title.textContent = { search: 'Rechercher', account: 'Mon compte', cart: 'Mon panier' }[name];
    views.forEach(function (view) { view.hidden = view.dataset.view !== name; });
    if (name === 'cart') renderCart();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('kic-tools-locked');
  }

  function closeTool() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('kic-tools-locked');
    if (lastTrigger) lastTrigger.focus();
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-kic-open]');
    if (trigger) openTool(trigger.dataset.kicOpen, trigger);
  });
  document.querySelector('.kic-tools-close').addEventListener('click', closeTool);
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) closeTool();
    var remove = event.target.closest('[data-remove-index]');
    if (remove) {
      var items = readCart();
      items.splice(Number(remove.dataset.removeIndex), 1);
      writeCart(items);
      renderCart();
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeTool();
  });

  document.querySelector('[data-tool-form="search"]').addEventListener('submit', function (event) {
    event.preventDefault();
    var query = event.currentTarget.elements.query.value.trim();
    if (!query) return;
    if (document.querySelector('.kic-grid')) {
      window.dispatchEvent(new CustomEvent('kic:search', { detail: { query: query } }));
      closeTool();
      document.getElementById('catalogue').scrollIntoView();
    } else {
      window.location.href = 'produits.html?q=' + encodeURIComponent(query);
    }
  });

  document.querySelectorAll('.kic-auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.kic-auth-tab').forEach(function (other) { other.classList.toggle('is-active', other === tab); });
      document.querySelectorAll('[data-auth-form]').forEach(function (form) { form.hidden = form.dataset.authForm !== tab.dataset.auth; });
      document.querySelector('[data-account-feedback]').textContent = '';
    });
  });
  document.querySelectorAll('[data-auth-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      document.querySelector('[data-account-feedback]').textContent = form.dataset.authForm === 'login'
        ? 'Connexion prête côté interface. Elle sera sécurisée dès le raccordement au serveur.'
        : 'Inscription prête côté interface. La création du compte nécessite le raccordement au serveur.';
    });
  });

  window.addEventListener('kic:cart-change', paintCount);
  paintCount();
})();
