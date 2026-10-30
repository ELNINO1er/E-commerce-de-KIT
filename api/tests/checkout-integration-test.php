<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$name='kic_test_'.gmdate('YmdHis').'_'.bin2hex(random_bytes(3));
$server=new PDO('mysql:host=127.0.0.1;port=3306;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if(!preg_match('/^kic_test_[a-zA-Z0-9_]+$/',$name))exit(1);
$server->exec('CREATE DATABASE `'.$name.'` CHARACTER SET utf8mb4');
foreach(['DB_HOST'=>'127.0.0.1','DB_NAME'=>$name,'DB_USER'=>'root','DB_PASSWORD'=>'','APP_ENV'=>'development','APP_URL'=>'http://localhost/kic-main','APP_KEY'=>bin2hex(random_bytes(32)),'PAYMENT_MODE'=>'sandbox','PAYMENTS_ENABLED'=>'true','STRIPE_SECRET_KEY'=>'sk_test_'.str_repeat('x',24),'STRIPE_WEBHOOK_SECRET'=>'whsec_local_test_only','PRICE_TAX_MODE'=>'UNCONFIRMED'] as $k=>$v)putenv($k.'='.$v);
require dirname(__DIR__).'/src/bootstrap.php';
require dirname(__DIR__).'/src/catalog.php';
require dirname(__DIR__).'/src/commerce.php';
require dirname(__DIR__).'/src/payment.php';
require dirname(__DIR__).'/src/seed.php';
require dirname(__DIR__).'/src/customer-services.php';
$checks=0;
function ok(bool $value,string $label): void {global $checks;if(!$value)throw new RuntimeException('Échec : '.$label);$checks++;}
function rejects(callable $fn,string $code): void {try{$fn();}catch(ApiException $e){ok($e->errorCode===$code,'rejet '.$code);return;}throw new RuntimeException('Rejet attendu : '.$code);}
function prepared(array $body): array {$body['quoteHash']=quote_order($body)['quoteHash'];return $body;}
$sessions=[];$requests=[];$networkCalls=0;
$GLOBALS['kic_test_stripe_transport']=function($path,$fields,$method,$key)use(&$sessions,&$requests,&$networkCalls){
    if($path==='checkout/sessions'&&$method==='POST'){
        if(isset($requests[$key])){ok($requests[$key]['fields']===$fields,'paramètres de reprise Stripe identiques');return $sessions[$requests[$key]['id']];}
        $networkCalls++;$id='cs_test_'.bin2hex(random_bytes(5));
        $sessions[$id]=['id'=>$id,'url'=>'https://checkout.stripe.com/c/pay/'.$id,'status'=>'open','payment_status'=>'unpaid','amount_total'=>$fields['line_items[0][price_data][unit_amount]'],'currency'=>'eur','livemode'=>false,'payment_intent'=>'pi_'.$id,'metadata'=>['order_number'=>$fields['metadata[order_number]'],'attempt_key'=>$fields['metadata[attempt_key]']]];
        $requests[$key]=['fields'=>$fields,'id'=>$id];return $sessions[$id];
    }
    $id=explode('/',$path)[2]??'';
    if(!isset($sessions[$id]))throw new RuntimeException('Session simulée inconnue');
    if(str_ends_with($path,'/expire'))$sessions[$id]['status']='expired';
    return $sessions[$id];
};
function event_for(array $session,string $type,?string $id=null): array {return ['id'=>$id??'evt_'.bin2hex(random_bytes(6)),'type'=>$type,'livemode'=>false,'data'=>['object'=>$session]];}
try{
    db()->exec(file_get_contents(dirname(__DIR__).'/schema.sql'));seed_catalogue();
    $body=['items'=>[['variantId'=>1,'quantity'=>1]],'recipientName'=>'Test KIC','contactEmail'=>'test@example.invalid','phone'=>'+33000000000','city'=>'Paris','postalCode'=>'75001','addressLine'=>'1 rue de Test','country'=>'France','deliveryMethod'=>'DELIVERY','deliveryZoneId'=>2,'discountCode'=>'','termsAccepted'=>true];
    $quote=quote_order($body);ok($quote['total']===5200,'40 euros + livraison 12 euros');ok($quote['paymentEnvironment']==='sandbox','sandbox par défaut');
    rejects(fn()=>quote_order(array_merge($body,['deliveryZoneId'=>1])),'INVALID_DELIVERY_ZONE');
    rejects(fn()=>quote_order(array_merge($body,['country'=>'Suisse'])),'INVALID_DELIVERY_ZONE');
    rejects(fn()=>quote_order(array_merge($body,['postalCode'=>'20000'])),'INVALID_DELIVERY_ZONE');
    ok(quote_order(array_merge($body,['postalCode'=>'20000','deliveryZoneId'=>3]))['deliveryFee']===2200,'tarif Corse');
    rejects(fn()=>quote_order(array_merge($body,['discountCode'=>'INCONNU'])),'INVALID_DISCOUNT');
    $config['stripe_secret_key']='sk_live_'.str_repeat('x',24);
    rejects(fn()=>create_order_data(prepared($body),bin2hex(random_bytes(16))),'PAYMENT_CONFIGURATION_ERROR');
    ok((int)db()->query('SELECT COUNT(*) FROM orders')->fetchColumn()===0,'clé live refusée avant création');
    $config['stripe_secret_key']='sk_test_'.str_repeat('x',24);
    $initial=(int)db()->query('SELECT stock FROM product_variants WHERE id=1')->fetchColumn();
    $key=bin2hex(random_bytes(16));$input=prepared($body);$order=create_order_data($input,$key);$again=create_order_data($input,$key);
    ok($order['orderNumber']===$again['orderNumber'],'commande idempotente');
    ok((int)db()->query('SELECT stock FROM product_variants WHERE id=1')->fetchColumn()===$initial-1,'réservation une seule fois');
    rejects(fn()=>create_order_data(array_merge($input,['recipientName'=>'Autre']),$key),'IDEMPOTENCY_CONFLICT');
    $row=find_order($order['orderNumber'],true);$p=checkout_payment_data($row);$againPayment=checkout_payment_data($row);
    ok($p['reference']===$againPayment['reference']&&$networkCalls===1,'session Stripe réutilisée');
    $paid=$sessions[$p['reference']];$paid['payment_status']='paid';$paid['status']='complete';
    $bad=$paid;$bad['amount_total']++;
    rejects(fn()=>apply_stripe_event(event_for($bad,'checkout.session.completed')),'PAYMENT_MISMATCH');
    $event=event_for($paid,'checkout.session.completed');apply_stripe_event($event);$duplicate=apply_stripe_event($event);
    ok(!empty($duplicate['duplicate']),'webhook répété dédupliqué');
    ok(find_order($order['orderNumber'],true)['status']==='PAID','encaissement confirmé');
    rejects(fn()=>cancel_order_safe(find_order($order['orderNumber'],true)),'INVALID_ORDER_STATE');
    rejects(fn()=>admin_change_order_status(find_order($order['orderNumber'],true),'PAID'),'PAYMENT_CONFIRMATION_REQUIRED');
    $next=create_order_data(prepared($body),bin2hex(random_bytes(16)));$nextRow=find_order($next['orderNumber'],true);$nextPayment=checkout_payment_data($nextRow);
    cancel_order_safe($nextRow);cancel_order_safe($nextRow);
    ok(find_order($next['orderNumber'],true)['status']==='CANCELLED','annulation confirmée');
    ok($sessions[$nextPayment['reference']]['status']==='expired','session expirée avant restitution');
    ok((int)db()->query('SELECT stock FROM product_variants WHERE id=1')->fetchColumn()===$initial-1,'restitution une seule fois');
    $late=$sessions[$nextPayment['reference']];$late['payment_status']='paid';apply_stripe_event(event_for($late,'checkout.session.async_payment_succeeded'));
    $r=order_response(find_order($next['orderNumber'],true));ok($r['status']==='CANCELLED'&&$r['payment']['requiresReview'],'paiement tardif signalé');
    $refund=['id'=>'ch_test','payment_intent'=>$paid['payment_intent'],'currency'=>'eur','amount_refunded'=>1000];apply_stripe_event(event_for($refund,'charge.refunded'));
    ok(order_response(find_order($order['orderNumber'],true))['payment']['refundedAmount']===1000,'remboursement partiel rapproché');
    $refund['amount_refunded']=500;apply_stripe_event(event_for($refund,'charge.refunded'));
    ok(order_response(find_order($order['orderNumber'],true))['payment']['refundedAmount']===1000,'ancien événement ne diminue pas le remboursement');
    rejects(fn()=>apply_stripe_event(event_for(['id'=>'cs_unknown'],'checkout.session.completed')),'PAYMENT_RECONCILIATION_PENDING');
    $config['payments_enabled']=false;$requestStock=(int)db()->query('SELECT stock FROM product_variants WHERE id=1')->fetchColumn();
    $request=create_order_data(prepared($body),bin2hex(random_bytes(16)));ok($request['mode']==='REQUEST'&&$request['reservationStatus']==='NONE','mode devis sans réservation');
    ok((int)db()->query('SELECT stock FROM product_variants WHERE id=1')->fetchColumn()===$requestStock,'devis ne bloque pas le stock');
    $message=['name'=>'Test','email'=>'test@example.invalid','subject'=>'devis','message'=>'Demande de test sans transmission','consent'=>true];$messageKey=bin2hex(random_bytes(16));
    $a=contact_request_data($message,$messageKey);$b=contact_request_data($message,$messageKey);ok($a===$b,'contact enregistré sans doublon');
    ok(str_starts_with(summary_pdf(find_order($order['orderNumber'],true)),'%PDF-1.4'),'récapitulatif PDF généré');
    echo "$checks contrôles métier réussis. Stripe simulé, aucune donnée réelle.\n";
}catch(Throwable $e){fwrite(STDERR,(string)$e."\n");$failed=true;}
finally{$server->exec('DROP DATABASE `'.$name.'`');}
if(!empty($failed))exit(1);
