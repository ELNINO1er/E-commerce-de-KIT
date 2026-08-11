/* ==========================================================================
   KIC — Landing page behaviour
   Progressive enhancement only: the page is fully readable without this file.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Image slots
     Ports the <image-slot> placeholder from the design source. A figure whose
     <img> cannot load is flagged `.is-empty`, which reveals the branded
     placeholder built in CSS instead of a broken-image icon. Drop the real
     photo at the src path in index.html and it takes over on its own.
     ---------------------------------------------------------------------- */
  function markEmpty(img) {
    var figure = img.closest('.kic-media');
    if (figure) figure.classList.add('is-empty');
  }

  // `error` does not bubble, so listen in the capture phase.
  document.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target.tagName === 'IMG') markEmpty(target);
  }, true);

  // This script is deferred, so some images may have failed before it ran.
  Array.prototype.forEach.call(document.querySelectorAll('.kic-media img'), function (img) {
    if (img.complete && img.naturalWidth === 0) markEmpty(img);
  });

  /* ------------------------------------------------------------------------
     2. Mobile navigation
     ---------------------------------------------------------------------- */
  var burger = document.querySelector('.kic-burger');
  var nav = document.getElementById('kic-nav');

  function setNav(open) {
    if (!burger || !nav) return;
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      setNav(burger.getAttribute('aria-expanded') !== 'true');
    });

    // Close after picking a destination, and on Escape.
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setNav(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setNav(false);
        burger.focus();
      }
    });

    // Reset when the layout crosses back above the breakpoint.
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (event) {
      if (event.matches) setNav(false);
    });
  }

  /* ------------------------------------------------------------------------
     3. Active section in the header nav
     ---------------------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.kic-nav a[href^="#"]'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + entry.target.id;
          link.classList.toggle('is-active', active);
          if (active) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ------------------------------------------------------------------------
     4. Newsletter
     No endpoint yet — validate locally and confirm. Wire the fetch() to the
     backend subscription route when it exists, then drop the early return.
     ---------------------------------------------------------------------- */
  var form = document.querySelector('.kic-news__form');
  var feedback = document.querySelector('.kic-news__feedback');

  if (form && feedback) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var input = form.querySelector('.kic-news__input');
      var value = input.value.trim();

      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        feedback.textContent = 'Merci de saisir une adresse e-mail valide.';
        input.focus();
        return;
      }

      feedback.textContent = 'Merci ! Votre demande a bien été enregistrée. KIC vous recontactera prochainement.';
      form.reset();
    });
  }

  /* ------------------------------------------------------------------------
     5. Révélation du footer au scroll
     Le CSS reste visible sans JS ; on n'active l'état masqué que si JS tourne
     et que l'utilisateur n'a pas demandé la réduction des animations.
     ---------------------------------------------------------------------- */
  var footer = document.querySelector('.kic-footer');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (footer && !reduceMotion && 'IntersectionObserver' in window) {
    footer.classList.add('is-reveal-ready');
    var footerObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    footerObserver.observe(footer);
  }
})();
