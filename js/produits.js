(function () {
  'use strict';

  var CART_KEY = 'kic.cart.count';
  var FAVORITES_KEY = 'kic.favorites';
  var grid = document.querySelector('.kic-grid');
  if (!grid) return;

  function readCart() {
    try { return parseInt(localStorage.getItem(CART_KEY), 10) || 0; }
    catch (error) { return 0; }
  }

  function writeCart(count) {
    try { localStorage.setItem(CART_KEY, String(count)); }
    catch (error) { /* Le catalogue reste utilisable sans stockage local. */ }
  }

  function paintCart(count) {
    Array.prototype.forEach.call(document.querySelectorAll('.kic-cart__count'), function (element) {
      element.textContent = String(count);
    });
  }

  function readFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
    catch (error) { return []; }
  }

  function writeFavorites(favorites) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }
    catch (error) { /* Les favoris restent utilisables pendant la session. */ }
  }

  function paintFavorite(button, selected) {
    button.classList.toggle('is-favorite', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('span').textContent = selected ? '♥' : '♡';
  }

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.kic-card'));
  var initialOrder = cards.slice();
  var chips = Array.prototype.slice.call(document.querySelectorAll('.kic-chip'));
  var sortSelect = document.getElementById('kic-sort-select');
  var results = document.querySelector('.kic-results');
  var empty = document.querySelector('.kic-empty');
  var activeFilter = 'all';

  paintCart(readCart());
  var favorites = readFavorites();
  cards.forEach(function (card) {
    var button = card.querySelector('.kic-favorite');
    if (button) paintFavorite(button, favorites.indexOf(card.dataset.name) !== -1);
  });

  grid.addEventListener('click', function (event) {
    var favoriteButton = event.target.closest('.kic-favorite');
    if (favoriteButton) {
      var favoriteCard = favoriteButton.closest('.kic-card');
      var favoriteName = favoriteCard.dataset.name;
      var favoriteIndex = favorites.indexOf(favoriteName);
      if (favoriteIndex === -1) {
        favorites.push(favoriteName);
        paintFavorite(favoriteButton, true);
      } else {
        favorites.splice(favoriteIndex, 1);
        paintFavorite(favoriteButton, false);
      }
      writeFavorites(favorites);
      return;
    }

    var button = event.target.closest('.kic-card__add');
    if (!button) return;

    var nextCount = readCart() + 1;
    writeCart(nextCount);
    paintCart(nextCount);

    var initialLabel = button.dataset.label || button.textContent;
    button.dataset.label = initialLabel;
    button.textContent = 'Ajouté ✓';
    button.classList.add('is-added');
    window.setTimeout(function () {
      button.textContent = initialLabel;
      button.classList.remove('is-added');
    }, 1600);
  });

  function applyCatalogue() {
    var visible = 0;

    cards.forEach(function (card) {
      var matches = activeFilter === 'all' || card.dataset.category === activeFilter;
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    var mode = sortSelect ? sortSelect.value : 'default';
    var ordered = initialOrder.slice();
    if (mode === 'price-asc' || mode === 'price-desc') {
      ordered.sort(function (first, second) {
        var firstHasPrice = first.dataset.price !== '';
        var secondHasPrice = second.dataset.price !== '';
        if (firstHasPrice !== secondHasPrice) return firstHasPrice ? -1 : 1;
        if (!firstHasPrice) return 0;
        var firstPrice = Number(first.dataset.price);
        var secondPrice = Number(second.dataset.price);
        var difference = firstPrice - secondPrice;
        return mode === 'price-asc' ? difference : -difference;
      });
    } else if (mode === 'name') {
      ordered.sort(function (first, second) {
        return first.dataset.name.localeCompare(second.dataset.name, 'fr');
      });
    }
    ordered.forEach(function (card) { grid.appendChild(card); });

    if (results) results.textContent = visible + (visible > 1 ? ' produits' : ' produit');
    if (empty) empty.hidden = visible !== 0;
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeFilter = chip.dataset.filter;
      chips.forEach(function (other) {
        var selected = other === chip;
        other.classList.toggle('is-active', selected);
        other.setAttribute('aria-pressed', String(selected));
      });
      applyCatalogue();
    });
  });

  if (sortSelect) sortSelect.addEventListener('change', applyCatalogue);

  var requestedFilter = window.location.hash.replace('#', '');
  var targetChip = chips.filter(function (chip) {
    return chip.dataset.filter === requestedFilter;
  })[0];
  if (targetChip) targetChip.click();
})();
