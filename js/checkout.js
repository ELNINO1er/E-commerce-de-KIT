(function () {
  'use strict';
  var form = document.getElementById('kic-checkout-form');
  if (!form || !window.KICAPI) return;
  var api = window.KICAPI, pendingKey = 'kic.checkout.pending.v2', formKey = 'kic.checkout.form.v2', cartKey = 'kic.cart.items';
  var feedback = document.getElementById('kic-checkout-feedback'), summary = document.getElementById('kic-summary'), total = document.getElementById('kic-summary-total');
  var zone = document.getElementById('kic-zone'), method = document.getElementById('kic-delivery-method'), country = form.elements.country;
  var button = form.querySelector('[type=submit]'), quote = null, zones = [], config = null, quoteSequence = 0, busy = false, timer;
  function read(key, fallback) { try { return JSON.parse(sessionStorage.getItem(key)) || fallback; } catch (_) { return fallback; } }
  function cart() { try { var value = JSON.parse(localStorage.getItem(cartKey)); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
  function store(key, value) { sessionStorage.setItem(key, JSON.stringify(value)); }
  function items() {
    var rows = {};
    cart().forEach(function (i) { var id = Number(i.variantId); if (!Number.isSafeInteger(id) || id < 1) throw new Error('Actualisez le catalogue puis ajoutez de nouveau « ' + String(i.name || 'ce produit') + ' ».'); rows[id] = (rows[id] || 0) + 1; });
    return Object.keys(rows).sort(function (a, b) { return Number(a) - Number(b); }).map(function (id) { return { variantId: Number(id), quantity: rows[id] }; });
  }
  function payload() {
    var data = Object.fromEntries(new FormData(form)); data.items = items();
    data.deliveryZoneId = method.value === 'PICKUP' ? 0 : Number(zone.value);
    data.termsAccepted = Boolean(form.elements.termsAccepted.checked);
    return data;
  }
  function snapshot(data) { var copy = Object.assign({}, data); delete copy.quoteHash; return JSON.stringify(copy); }
  function message(text) { feedback.textContent = text; }
  function label() {
    var pay = !config || config.paymentsEnabled;
    button.textContent = busy ? 'Traitement en cours…' : pay ? (config && config.paymentMode === 'sandbox' ? 'Tester le paiement Stripe' : 'Payer ma commande') : 'Envoyer ma demande';
    button.disabled = busy;
  }
  function appendLine(name, amount, strong) {
    var row = document.createElement('div'); row.className = 'kic-summary-item';
    var text = document.createElement('span'); text.textContent = name;
    var price = document.createElement(strong ? 'strong' : 'span'); price.textContent = api.money(amount); row.append(text, price); summary.appendChild(row);
  }
  function paintQuote(value) {
    quote = value; summary.replaceChildren();
    value.items.forEach(function (i) { appendLine(i.quantity + ' × ' + i.productName + ' · ' + i.format, i.lineTotal, true); });
    appendLine('Sous-total', value.subtotal); appendLine('Livraison', value.deliveryFee);
    if (value.discountCode) appendLine('Remise ' + value.discountCode, -value.discountAmount);
    total.textContent = api.money(value.total);
    document.getElementById('kic-summary-tax').textContent = config && config.paymentMode === 'sandbox' ? 'Montants de test — aucun encaissement réel.' : value.taxMode === 'TTC' ? 'Prix TTC.' : value.taxMode === 'VAT_EXEMPT' ? 'TVA non applicable selon le régime confirmé par KIC.' : 'Montant indicatif, qualification fiscale et conditions confirmées par devis.';
  }
  function filterZones() {
    var old = zone.value, pickup = method.value === 'PICKUP';
    var corse = /^20\d{3}$/.test(form.elements.postalCode.value.trim());
    var scope = country.value === 'France' ? (corse ? 'FR_CORSE' : 'FR_MAINLAND') : 'EU';
    var rows = zones.filter(function (z) { return z.scope === scope; });
    zone.replaceChildren();
    if (pickup) { zone.add(new Option('Retrait à Nice — gratuit', '')); }
    else rows.forEach(function (z) { zone.add(new Option(z.name + ' — ' + api.money(z.fee), String(z.id))); });
    if (rows.some(function (z) { return String(z.id) === old; })) zone.value = old;
    zone.disabled = pickup; zone.required = !pickup;
    document.getElementById('kic-zone-field').classList.toggle('is-disabled', pickup);
    ['city', 'addressLine', 'postalCode', 'country'].forEach(function (name) { form.elements[name].required = !pickup; });
  }
  async function refreshQuote() {
    var sequence = ++quoteSequence; quote = null;
    try {
      var data = payload();
      if (!data.items.length) { summary.textContent = 'Votre panier est vide. Consultez le catalogue.'; total.textContent = api.money(0); return; }
      if (data.deliveryMethod === 'DELIVERY' && !data.postalCode) { summary.textContent = 'Indiquez votre pays et votre code postal pour calculer la livraison et le total.'; total.textContent = 'À calculer'; return; }
      var value = await api.quote(data);
      if (sequence === quoteSequence) { paintQuote(value); message(''); }
    } catch (error) { if (sequence === quoteSequence) { summary.textContent = error.message; total.textContent = 'À vérifier'; } }
  }
  function saveForm() { var data = Object.fromEntries(new FormData(form)); delete data.termsAccepted; store(formKey, data); }
  function receipt(order) { store('kic.last.order', order); location.assign('confirmation.html?order=' + encodeURIComponent(order.orderNumber)); }
  async function finish(operation) {
    var order = operation.order;
    if (!order) { order = await api.checkout(operation.payload, operation.key); operation.order = order; store(pendingKey, operation); }
    store('kic.last.order', order);
    if (order.mode === 'REQUEST') { receipt(order); return; }
    var fresh = await api.order(order.orderNumber, order.accessToken);
    if (fresh.status !== 'PENDING') { receipt(order); return; }
    var payment = await api.stripeCheckout(order.orderNumber, order.accessToken); location.assign(payment.checkoutUrl);
  }
  async function run(operation) {
    if (busy) return; busy = true; label(); message('');
    try { await finish(operation); }
    catch (error) {
      message(error.message);
      if (error.code === 'ORDER_ALREADY_PAID' && operation.order) receipt(operation.order);
      if (error.status === 422 || error.code === 'QUOTE_CHANGED') { if (!operation.order) { sessionStorage.removeItem(pendingKey); document.getElementById('kic-resume').hidden = true; await refreshQuote(); message(error.message); } }
      document.getElementById('kic-resume').hidden = !read(pendingKey, null);
    } finally { busy = false; label(); }
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    try {
      saveForm(); var data = payload(), operation = read(pendingKey, null);
      if (operation) { if (operation.signature !== snapshot(data)) { message('Une commande précédente doit être reprise ou annulée avant de modifier votre demande. Utilisez les boutons de reprise ci-dessous.'); return; } await run(operation); return; }
      // Une réponse de devis obsolète ne doit jamais être utilisée au clic.
      var requestVersion = ++quoteSequence, value = await api.quote(data);
      if (requestVersion !== quoteSequence || snapshot(payload()) !== snapshot(data)) { message('Les informations ont changé. Vérifiez le récapitulatif puis confirmez de nouveau.'); return; }
      if (!quote || quote.quoteHash !== value.quoteHash) { paintQuote(value); message('Le récapitulatif a changé. Vérifiez le nouveau montant puis confirmez.'); return; }
      paintQuote(value); data.quoteHash = value.quoteHash;
      operation = { key: api.uuid(), payload: data, signature: snapshot(data), cartSnapshot: JSON.stringify(cart()), order: null };
      store(pendingKey, operation); await run(operation);
    } catch (error) { message(error.message); busy = false; label(); }
  });
  document.getElementById('kic-resume-button').addEventListener('click', function () { var op = read(pendingKey, null); if (op) run(op); });
  document.getElementById('kic-cancel-button').addEventListener('click', async function () {
    var op = read(pendingKey, null); if (!op || busy) return; busy = true; label();
    try {
      // Une réponse perdue est résolue avec la même clé avant toute annulation.
      if (!op.order) { op.order = await api.checkout(op.payload, op.key); store(pendingKey, op); }
      await api.cancel(op.order.orderNumber, op.order.accessToken);
      sessionStorage.removeItem(pendingKey); document.getElementById('kic-resume').hidden = true; message('La commande précédente a été annulée. Vous pouvez vérifier votre panier et recommencer.'); await refreshQuote();
    } catch (error) { message(error.message); } finally { busy = false; label(); }
  });
  form.addEventListener('input', function () { quote = null; ++quoteSequence; clearTimeout(timer); saveForm(); filterZones(); timer = setTimeout(refreshQuote, 450); });
  form.addEventListener('change', function () { quote = null; ++quoteSequence; filterZones(); clearTimeout(timer); timer = setTimeout(refreshQuote, 50); });
  async function init() {
    try {
      var values = await Promise.all([api.config(), api.zones()]); config = values[0]; zones = values[1];
      country.replaceChildren(); config.countries.forEach(function (name) { country.add(new Option(name, name)); });
      var saved = read(formKey, {}); Object.keys(saved).forEach(function (key) { if (form.elements[key] && form.elements[key].type !== 'checkbox') form.elements[key].value = saved[key]; });
      document.getElementById('kic-payment-mode').textContent = config.message;
      document.getElementById('kic-payment-mode').classList.toggle('is-sandbox', config.paymentMode === 'sandbox');
      if (config.paymentMode === 'sandbox' && !config.paymentReady) message('Mode test sélectionné. Renseignez les clés de test Stripe sur le serveur pour ouvrir Checkout.');
      filterZones(); label(); document.getElementById('kic-resume').hidden = !read(pendingKey, null); await refreshQuote();
    } catch (error) { message(error.message); button.disabled = true; }
  }
  init();
})();
