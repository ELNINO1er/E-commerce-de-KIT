(function () {
  'use strict';
  var tries = 0, timer, api = window.KICAPI;
  var title = document.getElementById('confirmation-title'), message = document.getElementById('confirmation-message');
  function read(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch (_) { return null; } }
  var saved = read('kic.last.order'), pending = read('kic.checkout.pending.v2');
  if (!saved && pending) saved = pending.order;
  var number = new URLSearchParams(location.search).get('order') || saved && saved.orderNumber;
  function received(order) {
    if (pending && pending.order && pending.order.orderNumber === order.orderNumber) {
      if (localStorage.getItem('kic.cart.items') === pending.cartSnapshot) localStorage.removeItem('kic.cart.items');
      sessionStorage.removeItem('kic.checkout.pending.v2'); sessionStorage.removeItem('kic.checkout.form.v2');
    }
    document.getElementById('confirmation-resume').hidden = true;
  }
  function purchase(order) {
    if (order.paymentEnvironment !== 'live' || order.mode !== 'PAYMENT') return;
    function send() {
      var key = 'kic.purchase.' + order.orderNumber;
      if (window.gtag && localStorage.getItem('kic_analytics_consent') === 'accepted' && !localStorage.getItem(key)) {
        window.gtag('event', 'purchase', { transaction_id: order.orderNumber, value: order.total / 100, currency: order.currency }); localStorage.setItem(key, 'sent');
      }
    }
    send(); window.addEventListener('kic:analytics-ready', send, { once: true });
  }
  async function check() {
    try {
      if (!saved || !number || saved.orderNumber !== number || !saved.accessToken) throw new Error('Aucune commande vérifiable dans ce navigateur. Reprenez votre commande ou contactez KIC avec sa référence.');
      var order = await api.order(number, saved.accessToken);
      document.getElementById('confirmation-number').textContent = 'Référence : ' + order.orderNumber;
      document.getElementById('confirmation-total').textContent = 'Total : ' + api.money(order.total);
      document.getElementById('confirmation-mode').textContent = order.paymentEnvironment === 'sandbox' ? 'Environnement de test — aucun encaissement réel' : 'Commande KIC';
      if (order.payment && order.payment.requiresReview) { title.textContent = 'Vérification complémentaire'; message.textContent = 'KIC doit rapprocher cette transaction avant de confirmer votre commande. Ne payez pas de nouveau.'; return; }
      if (order.status === 'CANCELLED') { title.textContent = 'Commande annulée'; message.textContent = 'Cette commande est annulée. Son statut ne confirme aucun encaissement. Contactez KIC si vous constatez un débit.'; return; }
      if (order.mode === 'REQUEST') { title.textContent = 'Demande enregistrée'; message.textContent = 'KIC a enregistré votre demande. Aucun paiement n’a été effectué. Les conditions seront confirmées par devis.'; received(order); return; }
      if (order.payment && order.payment.status === 'SUCCESS' && ['PAID', 'SHIPPED', 'DELIVERED'].indexOf(order.status) !== -1) {
        title.textContent = order.paymentEnvironment === 'sandbox' ? 'Test de paiement réussi' : 'Paiement confirmé';
        message.textContent = order.paymentEnvironment === 'sandbox' ? 'Stripe a confirmé le paiement de test au serveur KIC. Aucun montant réel n’a été encaissé.' : 'Votre paiement est confirmé par le serveur KIC. Votre commande peut être préparée.';
        received(order); purchase(order); return;
      }
      if (order.payment && ['REFUNDED', 'PARTIALLY_REFUNDED'].indexOf(order.payment.status) !== -1) { title.textContent = 'Remboursement enregistré'; message.textContent = 'Montant remboursé confirmé par Stripe : ' + api.money(order.payment.refundedAmount) + '. Contactez KIC pour le détail.'; return; }
      title.textContent = 'Paiement en cours de vérification'; message.textContent = 'Le serveur n’a pas encore confirmé le paiement. Ne payez pas une seconde fois.';
      if (++tries < 12) timer = setTimeout(check, 2500); else message.textContent += ' Reprenez cette page plus tard ou contactez KIC avec votre référence.';
    } catch (error) { title.textContent = 'Confirmation indisponible'; message.textContent = error.message; }
  }
  window.addEventListener('pagehide', function () { clearTimeout(timer); }); check();
})();
