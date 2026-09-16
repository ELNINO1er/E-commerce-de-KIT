(function () {
  'use strict';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fallback = window.setTimeout(revealPage, 2500);

  function revealPage() {
    window.clearTimeout(fallback);
    document.body.classList.remove('is-leaving');
    document.body.classList.add('is-loaded');
  }

  if (document.readyState !== 'loading') {
    revealPage();
  } else {
    document.addEventListener('DOMContentLoaded', revealPage, { once: true });
  }

  window.addEventListener('pageshow', revealPage);

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(tel:|mailto:|javascript:)/i.test(href)) return;

    var destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
    if (reducedMotion) return;

    event.preventDefault();
    document.body.classList.remove('is-loaded');
    document.body.classList.add('is-leaving');
    window.setTimeout(function () { window.location.href = destination.href; }, 180);
  });
})();
