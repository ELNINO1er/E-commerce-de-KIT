<?php
declare(strict_types=1);

require __DIR__.'/src/bootstrap.php';
require __DIR__.'/src/auth.php';
require __DIR__.'/src/catalog.php';
require __DIR__.'/src/commerce.php';
require __DIR__.'/src/admin.php';
require __DIR__.'/src/admin-extra.php';

$method=$_SERVER['REQUEST_METHOD']??'GET'; $path=request_path(); $params=[];

handle_admin_routes($method,$path,$params);

if ($method==='GET' && $path==='/health') {
    db()->query('SELECT 1'); respond(['status'=>'ok','service'=>'KIC PHP API','time'=>gmdate('c')]);
}
if ($method==='POST' && $path==='/auth/login') login();
if ($method==='POST' && $path==='/auth/register') register_user();
if ($method==='POST' && $path==='/auth/refresh') refresh_session();
if ($method==='POST' && $path==='/auth/logout') {
    require_session_origin();$refresh=(string)($_COOKIE['kic_refresh']??'');if($refresh)db()->prepare('UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=?')->execute([hash('sha256',$refresh)]);setcookie('kic_refresh','',session_cookie_options(time()-3600));respond(null,204);
}
if ($method==='GET' && $path==='/auth/me') respond(user_response(current_user()));
if ($method==='PATCH' && $path==='/auth/me') {
    $user=current_user(); $body=json_body(); $sets=[];$bind=[];
    foreach (['firstName'=>'first_name','lastName'=>'last_name','phone'=>'phone'] as $input=>$column) if (array_key_exists($input,$body)) {$sets[]="$column=?";$bind[]=$body[$input];}
    if ($sets) {$bind[]=$user['id'];db()->prepare('UPDATE users SET '.implode(',',$sets).' WHERE id=?')->execute($bind);}
    $q=db()->prepare('SELECT id,email,first_name,last_name,phone,role,enabled FROM users WHERE id=?');$q->execute([$user['id']]);respond(user_response($q->fetch()));
}

if ($method==='GET' && $path==='/categories') { $rows=db()->query('SELECT * FROM categories ORDER BY name')->fetchAll();respond(array_map('category_response',$rows)); }
if ($method==='GET' && $path==='/products') list_products();
if ($method==='GET' && (route_matches('/products/slug/{slug}',$path,$params)||route_matches('/products/{id}',$path,$params))) respond(product_response(product_row($params['slug']??$params['id']),true));

if ($method==='GET' && $path==='/config') respond(['currency'=>'EUR','shopName'=>'KIC — Konan Industrie et Chocolaterie','freeDeliveryThreshold'=>null,'paymentMethods'=>[]]);
if ($method==='GET' && $path==='/delivery-zones') {$q=db()->query('SELECT * FROM delivery_zones WHERE active=1 ORDER BY fee,name');respond(array_map('delivery_zone_response',$q->fetchAll()));}
if ($method==='GET' && route_matches('/discount-codes/{code}/preview',$path,$params)) {$subtotal=(int)($_GET['subtotal']??0);$d=valid_discount($params['code'],$subtotal);respond($d?['valid'=>true,'code'=>$d['code'],'type'=>$d['type'],'value'=>(int)$d['value'],'discountAmount'=>discount_amount($d,$subtotal)]:['valid'=>false,'reason'=>'Code invalide, expire ou non applicable.']);}
if ($method==='POST' && $path==='/cart/items') add_cart_item();
if ($method==='GET' && $path==='/cart') respond(cart_response((int)cart_id()));
if ($method==='DELETE' && $path==='/cart') {$id=cart_id();db()->prepare('DELETE FROM carts WHERE id=?')->execute([$id]);respond(null,204);}
if ($method==='POST' && $path==='/orders') create_order();
if ($method==='GET' && $path==='/orders/track') {security_rate_limit('tracking',20,300);$q=db()->prepare('SELECT o.*,z.name zone_name,z.estimated_days_min,z.estimated_days_max FROM orders o LEFT JOIN delivery_zones z ON z.id=o.delivery_zone_id WHERE o.order_number=? AND LOWER(o.contact_email)=LOWER(?)');$q->execute([$_GET['number']??'',$_GET['email']??'']);$o=$q->fetch();if(!$o)fail(404,'NOT_FOUND','Commande introuvable.');$tracked=order_response($o);unset($tracked['contactEmail'],$tracked['contactPhone'],$tracked['recipientName'],$tracked['addressLine']);respond($tracked);}
if ($method==='GET' && $path==='/orders') {$u=current_user();$q=db()->prepare('SELECT o.*,z.name zone_name,z.estimated_days_min,z.estimated_days_max FROM orders o LEFT JOIN delivery_zones z ON z.id=o.delivery_zone_id WHERE o.user_id=? ORDER BY o.id DESC');$q->execute([$u['id']]);$rows=array_map('order_response',$q->fetchAll());respond(page_response($rows,0,count($rows)?:1,count($rows)));}
if ($method==='GET' && route_matches('/orders/{number}',$path,$params)) respond(order_response(find_order($params['number'])));
if ($method==='POST' && route_matches('/orders/{number}/cancel',$path,$params)) {$o=find_order($params['number']);$pdo=db();$pdo->beginTransaction();try{$lock=$pdo->prepare('SELECT status FROM orders WHERE id=? FOR UPDATE');$lock->execute([$o['id']]);if($lock->fetchColumn()!=='PENDING')fail(409,'INVALID_ORDER_STATE','Cette commande ne peut plus être annulée.');$q=$pdo->prepare('SELECT variant_id,quantity FROM order_items WHERE order_id=?');$q->execute([$o['id']]);foreach($q->fetchAll() as $i)$pdo->prepare('UPDATE product_variants SET stock=stock+? WHERE id=?')->execute([$i['quantity'],$i['variant_id']]);$pdo->prepare("UPDATE orders SET status='CANCELLED' WHERE id=?")->execute([$o['id']]);$pdo->commit();respond(order_response(find_order($params['number'])));}catch(Throwable $e){$pdo->rollBack();throw $e;}}
if ($method==='POST' && $path==='/newsletter') {$b=json_body();require_fields($b,['email']);if(!filter_var($b['email'],FILTER_VALIDATE_EMAIL))fail(422,'VALIDATION_ERROR','Adresse e-mail invalide.');db()->prepare('INSERT INTO newsletter_subscribers(email) VALUES(?) ON DUPLICATE KEY UPDATE active=1')->execute([strtolower($b['email'])]);respond(['subscribed'=>true],201);}
if ($method==='POST' && $path==='/stock-alerts') {$b=json_body();require_fields($b,['variantId','contact']);try{db()->prepare('INSERT INTO stock_alerts(variant_id,contact) VALUES(?,?)')->execute([(int)$b['variantId'],$b['contact']]);respond(['subscribed'=>true,'duplicate'=>false],201);}catch(PDOException $e){if((int)$e->errorInfo[1]===1062)respond(['subscribed'=>true,'duplicate'=>true]);throw $e;}}

fail(404,'NOT_FOUND','Cette route API n’existe pas.');
