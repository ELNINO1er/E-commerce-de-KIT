(function () {
  'use strict';
  var form = document.querySelector('.kic-contact-form');
  if (!form || !window.KICAPI) return;
  var key = null, signature = null, busy = false, api = window.KICAPI;
  var params = new URLSearchParams(location.search), subject = params.get('subject'), product = params.get('product');
  if (subject && Array.from(form.elements.subject.options).some(function (o) { return o.value === subject; })) form.elements.subject.value = subject;
  if (product && Array.from(form.elements.product.options).some(function (o) { return o.value === product; })) form.elements.product.value = product;
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    var feedback = form.querySelector('.kic-contact-feedback'), button = form.querySelector('[type=submit]'), original = button.textContent;
    var data = Object.fromEntries(new FormData(form)); data.consent = form.elements.consent.checked;
    var next = JSON.stringify(data);
    if (signature && signature !== next) { feedback.textContent = 'Une demande est en attente de confirmation. Réessayez avec les mêmes informations pour éviter un doublon.'; return; }
    signature = next; if (!key) key = api.uuid(); busy = true; button.disabled = true; button.textContent = 'Enregistrement…';
    try { var result = await api.contact(data, key); feedback.textContent = 'Votre demande est enregistrée chez KIC. Référence : ' + result.reference + '. Vous pouvez aussi nous joindre au +33 7 45 90 87 78.'; form.reset(); key = null; signature = null; }
    catch (error) { feedback.textContent = error.message; if (error.status === 422) { key = null; signature = null; } }
    finally { busy = false; button.disabled = false; button.textContent = original; }
  });
})();
