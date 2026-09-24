(function(global){
  'use strict';
  var base = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname) ? '/kic-main/api' : 'https://kic-fr.com/api';
  var cartKey='kic.api.cart-token';
  function token(){return localStorage.getItem(cartKey)||'';}
  async function request(path,options){
    options=options||{}; var headers=Object.assign({'Accept':'application/json'},options.headers||{});
    if(options.body && !(options.body instanceof FormData)) headers['Content-Type']='application/json';
    if(token()) headers['X-Cart-Token']=token();
    var response=await fetch(base+path,Object.assign({credentials:'include'},options,{headers:headers}));
    var fresh=response.headers.get('X-Cart-Token'); if(fresh)localStorage.setItem(cartKey,fresh);
    var payload=response.status===204?null:await response.json().catch(function(){return null;});
    if(!response.ok){var error=new Error(payload&&payload.detail||'La demande n’a pas pu être traitée.');error.status=response.status;throw error;}
    return payload;
  }
  global.KICAPI={
    products:function(){return request('/products?size=100');},
    zones:function(){return request('/delivery-zones');},
    add:function(variantId,quantity){return request('/cart/items',{method:'POST',body:JSON.stringify({variantId:Number(variantId),quantity:quantity||1})});},
    cart:function(){return request('/cart');},
    checkout:function(data){return request('/orders',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID().replace(/-/g,'')},body:JSON.stringify(data)});},
    token:token,
    money:function(cents){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(cents||0)/100);}
  };
})(window);
