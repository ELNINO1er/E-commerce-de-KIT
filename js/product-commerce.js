(function () {
  'use strict';

  var canonical = document.querySelector('link[rel="canonical"]');
  var match = canonical && canonical.href.match(/\/(beurre-de-cacao|poudre-de-cacao|masse-de-cacao|infusion-de-cacao|jus-de-cacao)$/);
  if (!match || !window.KICAPI) return;
  var slug = match[1];

  function escape(value) {
    var node = document.createElement('span');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  }

  function list(items) {
    return (Array.isArray(items) ? items : [items]).filter(Boolean)
      .map(function (item) { return '<li>' + escape(item) + '</li>'; }).join('');
  }

  function updateSchema(product, variant) {
    var script = document.querySelector('script[type="application/ld+json"]');
    if (!script || !variant) return;
    try {
      var data = JSON.parse(script.textContent);
      var graph = data['@graph'] || [data];
      var entity = graph.filter(function (item) { return item['@type'] === 'Product'; })[0];
      if (!entity) return;
      entity.name = product.name + ' KIC — ' + variant.label;
      entity.description = product.description;
      entity.image = [product.imageUrl].concat(product.gallery || []);
      entity.sku = variant.sku;
      entity.brand = { '@type': 'Brand', name: 'KIC' };
      entity.offers = {
        '@type': 'Offer',
        url: canonical.href,
        priceCurrency: 'EUR',
        price: (Number(variant.promoPrice == null ? variant.price : variant.promoPrice) / 100).toFixed(2),
        availability: Number(variant.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'KIC — Konan Industrie et Chocolaterie' },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'FR' },
          deliveryTime: { '@type': 'ShippingDeliveryTime', transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' } }
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'FR',
          merchantReturnDays: 14,
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility'
        }
      };
      script.textContent = JSON.stringify(data);
    } catch (error) { /* Le balisage statique reste disponible. */ }
  }

  function render(product) {
    var formats = product.formats || [];
    var variant = formats[0];
    var heroImage = document.querySelector('.kic-product-hero__visual img');
    if (heroImage && product.imageUrl) heroImage.src = product.imageUrl;
    var heroEyebrow = document.querySelector('.kic-product-hero .kic-eyebrow');
    if (heroEyebrow && variant) heroEyebrow.textContent = variant.label + ' · ' + window.KICAPI.money(variant.promoPrice == null ? variant.price : variant.promoPrice);

    var facts = document.querySelector('.kic-product-facts');
    if (facts) {
      facts.innerHTML =
        '<div><dt>Origine et traçabilité</dt><dd>' + escape(product.origin || 'Informations précisées selon le lot.') + '</dd></div>' +
        '<div><dt>Composition</dt><dd>' + escape(product.ingredients || 'Fiche technique disponible sur demande.') + '</dd></div>' +
        '<div><dt>Allergènes</dt><dd>' + escape(product.allergens || 'Consulter la fiche technique du lot.') + '</dd></div>' +
        '<div><dt>Conservation</dt><dd>' + escape(product.conservation || 'Conserver au sec et à l’abri de la chaleur.') + '</dd></div>';
    }

    var related = document.querySelector('.kic-related');
    var whatsappText = 'Bonjour KIC, je souhaite commander ou recevoir un devis pour ' + product.name + '.';
    var price = variant ? window.KICAPI.money(variant.promoPrice == null ? variant.price : variant.promoPrice) : 'Sur devis';
    var formatOptions = formats.map(function (item) {
      return '<option value="' + escape(item.variantId) + '">' + escape(item.label) + ' — ' +
        window.KICAPI.money(item.promoPrice == null ? item.price : item.promoPrice) +
        (Number(item.stock) > 0 ? ' — en stock' : ' — indisponible') + '</option>';
    }).join('');

    var section = document.createElement('section');
    section.className = 'kic-commerce-detail';
    section.innerHTML =
      '<div class="kic-commerce-detail__inner">' +
        '<div class="kic-commerce-detail__head"><p class="kic-eyebrow">Informations professionnelles</p><h2>Commander avec les bonnes informations</h2><p>Les caractéristiques réglementaires et nutritionnelles définitives sont confirmées par la fiche technique du lot.</p></div>' +
        '<div class="kic-commerce-detail__grid">' +
          '<article class="kic-info-card"><h3>Usages recommandés</h3><p>' + escape(product.usage || product.description) + '</p><h3>Nutrition</h3><ul>' + list(product.nutrition || ['Fiche nutritionnelle disponible sur demande.']) + '</ul></article>' +
          '<article class="kic-info-card"><h3>Tarifs professionnels</h3><ul>' + list(product.professionalPricing || [price, 'Tarifs par volume sur devis']) + '</ul><p class="kic-info-card__note">Les tarifs par volume sont confirmés selon la quantité, la destination et la disponibilité.</p>' +
            ((slug === 'beurre-de-cacao' || slug === 'poudre-de-cacao') ? '<p class="kic-info-card__note"><strong>Conditionnement vendu :</strong> ' + escape(variant ? variant.label : '') + '. La photo illustre la gamme; l’étiquette du colis confirme le poids commandé.</p>' : '') + '</article>' +
        '</div>' +
        '<div class="kic-order-panel"><div><label for="kic-live-format">Format disponible</label><select id="kic-live-format">' + formatOptions + '</select><strong class="kic-order-panel__price">' + escape(price) + '</strong></div>' +
          '<div class="kic-order-panel__actions">' +
            '<a class="kic-btn kic-btn--gold" target="_blank" rel="noopener noreferrer" href="https://wa.me/33745908778?text=' + encodeURIComponent(whatsappText) + '">Commander sur WhatsApp</a>' +
            '<a class="kic-btn kic-btn--dark" href="contact.html?subject=devis&product=' + encodeURIComponent(product.name) + '">Demander un devis</a>' +
            '<a class="kic-btn kic-btn--light" href="contact.html?subject=echantillon&product=' + encodeURIComponent(product.name) + '">Demander un échantillon</a>' +
          '</div></div>' +
        '<div class="kic-faq"><h2>Questions fréquentes</h2>' +
          '<details><summary>Comment commander ce produit ?</summary><p>Choisissez le format puis contactez KIC par WhatsApp ou demandez un devis. Une confirmation récapitulant disponibilité, livraison et montant vous sera envoyée.</p></details>' +
          '<details><summary>Proposez-vous des tarifs par quantité ?</summary><p>Oui. KIC prépare un tarif professionnel selon le volume, la fréquence, la destination et la disponibilité du lot.</p></details>' +
          '<details><summary>Puis-je demander un échantillon ?</summary><p>Oui, selon disponibilité. Indiquez votre activité, l’usage prévu et le volume estimé dans votre demande.</p></details>' +
          '<details><summary>Où trouver les données techniques et allergènes ?</summary><p>La fiche technique correspondant au lot est fournie sur demande avant validation de la commande.</p></details>' +
        '</div>' +
        '<div class="kic-review-invite"><div><p class="kic-eyebrow">Avis authentiques</p><h2>Vous utilisez déjà les produits KIC ?</h2><p>Partagez votre expérience sur la fiche Google KIC. Seuls les avis de clients réels doivent être publiés.</p></div><a class="kic-btn kic-btn--gold" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=KIC+Konan+Industrie+et+Chocolaterie">Voir ou laisser un avis Google</a></div>' +
      '</div>';
    if (related) related.parentNode.insertBefore(section, related);
    else document.querySelector('main').appendChild(section);

    var select = section.querySelector('#kic-live-format');
    select.addEventListener('change', function () {
      var selected = formats.filter(function (item) { return String(item.variantId) === select.value; })[0];
      if (!selected) return;
      section.querySelector('.kic-order-panel__price').textContent =
        window.KICAPI.money(selected.promoPrice == null ? selected.price : selected.promoPrice);
      if (heroEyebrow) heroEyebrow.textContent = selected.label + ' · ' + window.KICAPI.money(selected.promoPrice == null ? selected.price : selected.promoPrice);
      updateSchema(product, selected);
    });
    updateSchema(product, variant);
  }

  window.KICAPI.product(slug).then(render).catch(function () {
    /* La fiche statique reste parfaitement consultable si l’API est indisponible. */
  });
})();
