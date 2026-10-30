(function (global) {
  'use strict';
  var source = document.currentScript && document.currentScript.src;
  var base = source ? new URL('../api/', source).href.replace(/\/$/, '') : new URL('api/', location.href).href.replace(/\/$/, '');
  var accessToken = '', session = null, restoring = null;
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID().replace(/-/g, '');
    var bytes = new Uint8Array(16); global.crypto.getRandomValues(bytes);
    return Array.from(bytes, function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }
  async function request(path, options) {
    options = options || {};
    var headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
    var response = await fetch(base + path, Object.assign({ credentials: 'include', cache: 'no-store' }, options, { headers: headers }));
    var payload = response.status === 204 ? null : await response.json().catch(function () { return null; });
    if (!response.ok) {
      var error = new Error(payload && (payload.detail || payload.message || payload.title) || 'Le service ne répond pas. Réessayez ou contactez KIC.');
      error.status = response.status; error.code = payload && payload.code; error.fields = payload && payload.errors; throw error;
    }
    return payload;
  }
  function json(method, body, headers) { return { method: method, headers: headers || {}, body: JSON.stringify(body) }; }
  function keepSession(value) { accessToken = value.accessToken; session = value.user; global.dispatchEvent(new CustomEvent('kic:session-change', { detail: session })); return session; }
  async function restore() {
    if (accessToken) return session;
    if (!restoring) restoring = request('/auth/refresh', json('POST', {})).then(keepSession).catch(function () { return null; }).finally(function () { restoring = null; });
    return restoring;
  }
  global.KICAPI = {
    request: request, uuid: uuid,
    config: function () { return request('/config'); },
    products: function () { return request('/products?size=100'); },
    product: function (slug) { return request('/products/slug/' + encodeURIComponent(slug)); },
    zones: function () { return request('/delivery-zones'); },
    quote: function (data) { return request('/orders/quote', json('POST', data)); },
    checkout: async function (data, key) { if (!key) throw new Error('Identifiant de commande manquant.'); await restore(); return request('/orders', json('POST', data, { 'Idempotency-Key': key })); },
    stripeCheckout: function (number, token) { return request('/payments/stripe/checkout', json('POST', { orderNumber: number }, { 'X-Order-Token': token })); },
    order: function (number, token) { return request('/orders/' + encodeURIComponent(number), { headers: { 'X-Order-Token': token } }); },
    cancel: function (number, token) { return request('/orders/' + encodeURIComponent(number) + '/cancel', json('POST', {}, { 'X-Order-Token': token })); },
    contact: function (data, key) { return request('/contact', json('POST', data, { 'Idempotency-Key': key })); },
    login: function (data) { return request('/auth/login', json('POST', data)).then(keepSession); },
    register: function (data) { return request('/auth/register', json('POST', data)).then(keepSession); },
    me: restore,
    logout: async function () { await request('/auth/logout', json('POST', {})); accessToken = ''; session = null; global.dispatchEvent(new CustomEvent('kic:session-change', { detail: null })); },
    money: function (cents) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100); }
  };
})(window);
