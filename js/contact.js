(function () {
  'use strict';

  var form = document.querySelector('.kic-contact-form');
  if (!form) return;

  var requestedSubject = new URLSearchParams(window.location.search).get('subject');
  if (requestedSubject && form.elements.subject.querySelector('option[value="' + requestedSubject + '"]')) {
    form.elements.subject.value = requestedSubject;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    form.querySelector('.kic-contact-feedback').textContent =
      'Merci. Votre demande est prête à être transmise à KIC. L’envoi réel sera activé lors du raccordement du formulaire au serveur.';
    form.reset();
  });
})();
