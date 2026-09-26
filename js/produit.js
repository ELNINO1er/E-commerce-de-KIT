(function () {
  'use strict';
  var CART_KEY = 'kic.cart.items';
  var params = new URLSearchParams(location.search);
  var slug = params.get('slug');
  var main = document.getElementById('produit');
  var errorBox = document.querySelector('.kic-product-error');

  function textAll(selector, value) {
    document.querySelectorAll(selector).forEach(function (node) { node.textContent = value; });
  }
  function meta(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.setAttribute('content', value);
  }
  function variantPrice(variant) { return Number(variant.promoPrice == null ? variant.price : variant.promoPrice); }
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (error) { return []; }
  }

  if (!slug || !window.KICAPI) return showError();
  window.KICAPI.product(slug).then(render).catch(showError);

  function render(product) {
    var category = product.category || {};
    var variants = product.formats && product.formats.length ? product.formats : (product.variants || []).map(function (item) {
      return { variantId: item.id, label: item.format, price: item.price, stock: item.stock };
    });
    var available = variants.filter(function (item) { return Number(item.stock) > 0; });
    var description = product.longDescription || product.description || 'Produit KIC sélectionné pour les professionnels et les particuliers.';
    var image = product.imageUrl || 'img/logo-kic-transparent.png';
    var canonical = 'https://kic-fr.com/produit?slug=' + encodeURIComponent(product.slug);

    document.title = product.name + ' | KIC France';
    document.querySelector('link[rel="canonical"]').href = canonical;
    meta('meta[name="description"]', description.slice(0, 160));
    meta('meta[property="og:title"]', document.title);
    meta('meta[property="og:description"]', description.slice(0, 200));
    meta('meta[property="og:image"]', image);
    meta('meta[property="og:url"]', canonical);
    textAll('[data-product-name]', product.name);
    textAll('[data-product-category]', 'KIC France · ' + (category.name || 'Produit cacao'));
    textAll('[data-product-description]', product.description || description);
    textAll('[data-product-heading]', product.name + ', la qualité KIC');
    textAll('[data-product-long-description]', description);
    textAll('[data-fact-product]', product.name);
    textAll('[data-fact-category]', category.name || 'Produit KIC');
    textAll('[data-fact-formats]', variants.length ? variants.map(function (item) { return item.label || item.format; }).join(', ') : 'Sur demande');
    var productImage = document.querySelector('[data-product-image]');
    productImage.src = image;
    productImage.alt = product.name + ' KIC';

    var purchase = document.querySelector('.kic-product-purchase');
    var select = document.getElementById('kic-product-format');
    var button = document.getElementById('kic-product-add');
    if (variants.length) {
      purchase.hidden = false;
      select.innerHTML = variants.map(function (item, index) {
        var disabled = Number(item.stock) < 1 ? ' disabled' : '';
        return '<option value="' + index + '"' + disabled + '>' + (item.label || item.format) + (disabled ? ' — Indisponible' : '') + '</option>';
      }).join('');
      var firstAvailable = variants.findIndex(function (item) { return Number(item.stock) > 0; });
      if (firstAvailable >= 0) select.value = String(firstAvailable);
      updatePrice();
      select.addEventListener('change', updatePrice);
      button.disabled = available.length === 0;
      button.textContent = available.length ? 'Ajouter au panier' : 'Indisponible';
      button.addEventListener('click', function () {
        var chosen = variants[Number(select.value)];
        if (!chosen || Number(chosen.stock) < 1) return;
        var cart = readCart();
        cart.push({ name: product.name, price: variantPrice(chosen) / 100, variantId: chosen.variantId || chosen.id, format: chosen.label || chosen.format || '', image: image });
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('kic:cart-change'));
        button.textContent = 'Ajouté ✓';
        window.setTimeout(function () { button.textContent = 'Ajouter au panier'; }, 1600);
      });
      function updatePrice() {
        var chosen = variants[Number(select.value)];
        document.querySelector('[data-product-price]').textContent = chosen ? window.KICAPI.money(variantPrice(chosen)) : '';
      }
    }

    document.getElementById('kic-product-schema').textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: description,
      image: image, category: category.name, brand: { '@type': 'Brand', name: 'KIC' },
      offers: variants.map(function (item) { return { '@type': 'Offer', priceCurrency: 'EUR', price: (variantPrice(item) / 100).toFixed(2), availability: Number(item.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: canonical }; })
    });
  }

  function showError() {
    if (main) main.hidden = true;
    if (errorBox) errorBox.hidden = false;
    document.title = 'Produit introuvable | KIC France';
  }
})();
