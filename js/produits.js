(function () {
  'use strict';

  var CART_KEY = 'kic.cart.items';
  var FAVORITES_KEY = 'kic.favorites';
  var grid = document.querySelector('.kic-grid');
  if (!grid) return;

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (error) { return []; }
  }

  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
    catch (error) { /* Le catalogue reste utilisable sans stockage local. */ }
    window.dispatchEvent(new CustomEvent('kic:cart-change'));
  }

  function paintCart(items) {
    Array.prototype.forEach.call(document.querySelectorAll('.kic-cart__count'), function (element) {
      element.textContent = String(items.length);
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
  var sortTrigger = document.querySelector('.kic-sort__trigger');
  var sortMenu = document.querySelector('.kic-sort__menu');
  var sortValue = document.querySelector('.kic-sort__value');
  var sortOptions = Array.prototype.slice.call(document.querySelectorAll('.kic-sort__option'));
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

    var cartItems = readCart();
    var selectedCard = button.closest('.kic-card');
    cartItems.push({
      name: selectedCard.dataset.name,
      price: selectedCard.dataset.price,
      image: selectedCard.querySelector('.kic-media--card img').getAttribute('src')
    });
    writeCart(cartItems);
    paintCart(cartItems);

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

  function closeSortMenu() {
    if (!sortMenu || !sortTrigger) return;
    sortMenu.hidden = true;
    sortTrigger.setAttribute('aria-expanded', 'false');
  }

  if (sortTrigger && sortMenu) {
    sortTrigger.addEventListener('click', function () {
      var opening = sortMenu.hidden;
      sortMenu.hidden = !opening;
      sortTrigger.setAttribute('aria-expanded', String(opening));
      if (opening) {
        var selectedOption = sortMenu.querySelector('.is-selected');
        if (selectedOption) selectedOption.focus();
      }
    });

    sortOptions.forEach(function (option) {
      option.addEventListener('click', function () {
        sortSelect.value = option.dataset.value;
        sortValue.textContent = option.textContent;
        sortOptions.forEach(function (other) {
          var selected = other === option;
          other.classList.toggle('is-selected', selected);
          other.setAttribute('aria-selected', String(selected));
        });
        closeSortMenu();
        applyCatalogue();
        sortTrigger.focus();
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.kic-select-wrap')) closeSortMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeSortMenu();
        sortTrigger.focus();
      }
    });
  }

  function applySearch(query) {
    var normalizedQuery = query.toLocaleLowerCase('fr');
    var visible = 0;
    cards.forEach(function (card) {
      var matches = card.textContent.toLocaleLowerCase('fr').indexOf(normalizedQuery) !== -1;
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    if (results) results.textContent = visible + (visible > 1 ? ' produits trouvés' : ' produit trouvé');
    if (empty) {
      empty.hidden = visible !== 0;
      empty.textContent = 'Aucun produit ne correspond à « ' + query + ' ».';
    }
  }

  window.addEventListener('kic:search', function (event) {
    applySearch(event.detail.query);
  });

  var queryFromUrl = new URLSearchParams(window.location.search).get('q');
  if (queryFromUrl) applySearch(queryFromUrl);

  var requestedFilter = window.location.hash.replace('#', '');
  var targetChip = chips.filter(function (chip) {
    return chip.dataset.filter === requestedFilter;
  })[0];
  if (targetChip) targetChip.click();
})();
