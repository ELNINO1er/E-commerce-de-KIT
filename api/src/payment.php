<?php
declare(strict_types=1);

function payment_readiness(): array {
    global $config;
    $key=(string)($config['stripe_secret_key']??'');
    $sandbox=($config['payment_mode']??'sandbox')==='sandbox';
    return [
        'appKey'=>strlen($config['app_key']??'')>=32,
        'stripeKey'=>(bool)preg_match('/^(sk|rk)_(test|live)_[A-Za-z0-9]{16,}$/',$key)&&!str_contains($key,'REMPLACER'),
        'keyMode'=>(bool)preg_match($sandbox?'/^(sk|rk)_test_/':'/^(sk|rk)_live_/',$key),
        'paymentMode'=>in_array($config['payment_mode']??'sandbox',['sandbox','live'],true),
        'webhookSecret'=>str_starts_with($config['stripe_webhook_secret']??'','whsec_')&&!str_contains($config['stripe_webhook_secret'],'REMPLACER'),
        'taxMode'=>$sandbox||in_array($config['price_tax_mode']??'',['TTC','VAT_EXEMPT'],true),
        'sellerRegistration'=>$sandbox||trim($config['seller_registration']??'')!=='',
        'salesTerms'=>$sandbox||(bool)($config['sales_terms_confirmed']??false),
        'https'=>str_starts_with($config['app_url']??'','https://')||($config['app_env']??'production')!=='production',
        'curl'=>function_exists('curl_init'),
    ];
}
function require_payment_ready(): void {
    global $config;
    if(empty($config['payments_enabled']))fail(409,'PAYMENTS_DISABLED','Le paiement en ligne n’est pas encore ouvert. Aucun montant n’a été débité.');
    if(in_array(false,payment_readiness(),true))fail(503,'PAYMENT_CONFIGURATION_ERROR','Le paiement n’est pas disponible. Contactez KIC pour finaliser votre demande.');
}
function shop_config(): array {
    global $config;
    $ready=!in_array(false,payment_readiness(),true);$enabled=!empty($config['payments_enabled']);$sandbox=($config['payment_mode']??'sandbox')==='sandbox';
    return ['currency'=>'EUR','shopName'=>'KIC — Konan Industrie et Chocolaterie','freeDeliveryThreshold'=>null,'paymentsEnabled'=>$enabled,'paymentReady'=>$ready,'paymentMode'=>$sandbox?'sandbox':'live','ordersAvailable'=>!$enabled||$ready,'checkoutMode'=>$enabled?'PAYMENT':'REQUEST','paymentMethods'=>$enabled?['STRIPE']:[],'taxMode'=>$config['price_tax_mode']??'UNCONFIRMED','countries'=>array_merge(['France'],eu_countries()),'message'=>$enabled?($sandbox?'Paiement de test Stripe : aucun encaissement réel.':'Paiement par carte sur la page sécurisée Stripe.'):'Demande de commande sans paiement. KIC vous confirme les conditions par devis.'];
}
function stripe_request(string $path,array $fields=[],string $method='POST',?string $idempotencyKey=null): array {
    global $config;
    // Injection limitée aux tests CLI, jamais sélectionnable depuis une requête HTTP.
    if(PHP_SAPI==='cli'&&isset($GLOBALS['kic_test_stripe_transport']))return ($GLOBALS['kic_test_stripe_transport'])($path,$fields,$method,$idempotencyKey);
    $key=(string)($config['stripe_secret_key']??'');
    if(!preg_match('/^(sk|rk)_(test|live)_/',$key)||str_contains($key,'REMPLACER'))fail(503,'PAYMENT_CONFIGURATION_ERROR','Le prestataire de paiement doit être configuré.');
    if(!preg_match(($config['payment_mode']??'sandbox')==='sandbox'?'/^(sk|rk)_test_/':'/^(sk|rk)_live_/',$key))fail(503,'PAYMENT_MODE_MISMATCH','La clé Stripe ne correspond pas au mode sélectionné.');
    if(!function_exists('curl_init'))fail(503,'PAYMENT_UNAVAILABLE','Le module de paiement est indisponible.');
    $headers=['Content-Type: application/x-www-form-urlencoded','Stripe-Version: 2026-10-28.endive'];
    if($idempotencyKey)$headers[]='Idempotency-Key: '.$idempotencyKey;
    $url='https://api.stripe.com/v1/'.ltrim($path,'/');
    if($method==='GET'&&$fields)$url.='?'.http_build_query($fields);
    $curl=curl_init($url);
    curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>20,CURLOPT_HTTPAUTH=>CURLAUTH_BASIC,CURLOPT_USERPWD=>$key.':',CURLOPT_HTTPHEADER=>$headers,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
    if($method==='POST'){curl_setopt($curl,CURLOPT_POST,true);curl_setopt($curl,CURLOPT_POSTFIELDS,http_build_query($fields));}
    $raw=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);$error=curl_error($curl);curl_close($curl);
    if($raw===false||$error!==''){error_log('KIC Stripe : erreur réseau');fail(502,'PAYMENT_UNAVAILABLE','Le prestataire ne répond pas. Reprenez cette même commande dans quelques instants.');}
    $result=json_decode((string)$raw,true);
    if($status<200||$status>=300||!is_array($result)){error_log('KIC Stripe HTTP '.$status);fail(502,'PAYMENT_PROVIDER_ERROR','Le paiement n’a pas pu être préparé. Reprenez cette même commande ou contactez KIC.');}
    return $result;
}

function checkout_payment_data(array $authorizedOrder): array {
    require_payment_ready();
    return with_order_lock($authorizedOrder['order_number'],function()use($authorizedOrder){
        global $config;
        $order=find_order($authorizedOrder['order_number'],true);
        if(($order['payment_environment']??'legacy')!==($config['payment_mode']??'sandbox'))fail(409,'PAYMENT_MODE_MISMATCH','Cette commande appartient à un autre environnement de paiement.');
        if($order['status']!=='PENDING'||$order['order_mode']!=='PAYMENT'||$order['reservation_status']!=='HELD')fail(409,'ORDER_NOT_PAYABLE','Cette commande ne peut pas être payée en ligne.');
        $pdo=db();$q=$pdo->prepare("SELECT * FROM payments WHERE order_id=? AND status='PENDING' ORDER BY id DESC LIMIT 1");$q->execute([$order['id']]);$attempt=$q->fetch();
        if($attempt&&!str_starts_with($attempt['reference'],'creating_')){
            $session=stripe_request('checkout/sessions/'.rawurlencode($attempt['reference']),[],'GET');
            if(($session['payment_status']??'')==='paid'){reconcile_session($session);fail(409,'ORDER_ALREADY_PAID','Le paiement a été reçu. Consultez la confirmation de cette commande.');}
            if(($session['status']??'')==='open'&&!empty($session['url']))return ['checkoutUrl'=>$session['url'],'reference'=>$session['id'],'provider'=>'STRIPE'];
            if(($session['status']??'')==='expired'){reconcile_session($session);fail(409,'PAYMENT_EXPIRED','La session a expiré. La commande a été annulée si aucun autre paiement n’est en cours.');}
            fail(409,'PAYMENT_PROCESSING','Le paiement est en cours de vérification. Ne créez pas une nouvelle commande.');
        }
        if(!$attempt){
            if($order['expires_at']&&strtotime($order['expires_at'].' UTC')<=time())fail(409,'PAYMENT_EXPIRED','Cette réservation a expiré. Annulez-la avant de recommencer.');
            $key=bin2hex(random_bytes(16));$expiry=gmdate('Y-m-d H:i:s',time()+3600);
            $pdo->beginTransaction();
            try{
                $q=$pdo->prepare('SELECT status FROM orders WHERE id=? FOR UPDATE');$q->execute([$order['id']]);
                if($q->fetchColumn()!=='PENDING')fail(409,'ORDER_NOT_PAYABLE','La commande a déjà été traitée.');
                $pdo->prepare("INSERT INTO payments(order_id,reference,amount,currency,attempt_key,checkout_expires_at) VALUES(?,?,?,?,?,?)")->execute([$order['id'],'creating_'.$key,$order['total'],$order['currency'],$key,$expiry]);
                $id=(int)$pdo->lastInsertId();$pdo->prepare('UPDATE orders SET expires_at=? WHERE id=?')->execute([$expiry,$order['id']]);$pdo->commit();
                $q=$pdo->prepare('SELECT * FROM payments WHERE id=?');$q->execute([$id]);$attempt=$q->fetch();
            }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        }
        if(strtotime($attempt['checkout_expires_at'].' UTC')<time()+1800)fail(409,'PAYMENT_REVIEW_REQUIRED','La tentative interrompue nécessite une vérification par KIC. Ne recommencez pas avec une autre commande.');
        $base=rtrim($config['app_url'],'/');
        $session=stripe_request('checkout/sessions',[
            'mode'=>'payment','payment_method_types[0]'=>'card',
            'success_url'=>$base.'/confirmation.html?order='.rawurlencode($order['order_number']).'&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url'=>$base.'/commande.html?payment=cancelled',
            'customer_email'=>$order['contact_email'],'client_reference_id'=>$order['order_number'],
            'metadata[order_number]'=>$order['order_number'],'metadata[attempt_key]'=>$attempt['attempt_key'],
            'payment_intent_data[metadata][order_number]'=>$order['order_number'],
            'line_items[0][price_data][currency]'=>strtolower($order['currency']),
            'line_items[0][price_data][product_data][name]'=>'Commande KIC '.$order['order_number'],
            'line_items[0][price_data][unit_amount]'=>(int)$order['total'],'line_items[0][quantity]'=>1,
            'locale'=>'fr','expires_at'=>strtotime($attempt['checkout_expires_at'].' UTC'),
        ],'POST','kic-checkout-'.$attempt['attempt_key']);
        if(empty($session['id'])||!preg_match('#^https://checkout\.stripe\.com/#',(string)($session['url']??'')))fail(502,'PAYMENT_PROVIDER_ERROR','Réponse de paiement incomplète. Reprenez la même commande.');
        $pdo->prepare('UPDATE payments SET reference=?,checkout_url=?,payment_intent=COALESCE(?,payment_intent) WHERE id=?')->execute([$session['id'],$session['url'],$session['payment_intent']??null,$attempt['id']]);
        return ['provider'=>'STRIPE','reference'=>$session['id'],'checkoutUrl'=>$session['url']];
    });
}
function create_stripe_checkout(): never {
    security_rate_limit('stripe-checkout',12,300);$b=json_body();require_fields($b,['orderNumber']);
    respond(checkout_payment_data(find_order((string)$b['orderNumber'])));
}

function stripe_signature_is_valid(string $payload,string $header,string $secret): bool {
    $timestamp=null;$signatures=[];
    foreach(explode(',',$header) as $part){[$key,$value]=array_pad(explode('=',trim($part),2),2,'');if($key==='t')$timestamp=ctype_digit($value)?(int)$value:null;if($key==='v1'&&preg_match('/^[a-f0-9]{64}$/',$value))$signatures[]=$value;}
    if($timestamp===null||abs(time()-$timestamp)>300||!$signatures)return false;
    $expected=hash_hmac('sha256',$timestamp.'.'.$payload,$secret);
    foreach($signatures as $signature)if(hash_equals($expected,$signature))return true;
    return false;
}
function reconcile_session(array $session): void {
    $kind=($session['payment_status']??'')==='paid'?'checkout.session.completed':(($session['status']??'')==='expired'?'checkout.session.expired':'');
    if($kind!=='')apply_stripe_event(['id'=>'reconcile-'.$session['id'].'-'.$kind,'type'=>$kind,'livemode'=>$session['livemode']??false,'data'=>['object'=>$session]]);
}

function apply_stripe_event(array $event): array {
    global $config;
    if(empty($event['id'])||empty($event['type'])||strlen((string)$event['id'])>255)fail(400,'INVALID_STRIPE_EVENT','Événement invalide.');
    $type=(string)$event['type'];$object=$event['data']['object']??[];
    if(!is_array($object))fail(400,'INVALID_STRIPE_EVENT','Événement invalide.');
    $supported=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired','checkout.session.async_payment_failed','charge.refunded','charge.dispute.created','charge.dispute.closed'];
    if(!in_array($type,$supported,true))return ['received'=>true,'ignored'=>true];
    $live=($config['payment_mode']??'sandbox')==='live';
    if(!array_key_exists('livemode',$event)||(bool)$event['livemode']!==$live)fail(400,'STRIPE_MODE_MISMATCH','Mode de paiement incohérent.');
    $pdo=db();$sessionEvent=str_starts_with($type,'checkout.session.');
    if($sessionEvent){
        $id=(string)($object['id']??'');$attempt=(string)($object['metadata']['attempt_key']??'');
        $q=$pdo->prepare('SELECT * FROM payments WHERE reference=? OR (attempt_key=? AND reference LIKE ?) LIMIT 1');$q->execute([$id,$attempt,'creating_%']);
    }else{
        $intent=$object['payment_intent']??null;if(is_array($intent))$intent=$intent['id']??null;
        $q=$pdo->prepare('SELECT * FROM payments WHERE payment_intent=? LIMIT 1');$q->execute([$intent]);
    }
    $payment=$q->fetch();
    if(!$payment)fail(503,'PAYMENT_RECONCILIATION_PENDING','Transaction non encore rapprochée. Nouvelle tentative requise.');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT * FROM orders WHERE id=? FOR UPDATE');$q->execute([$payment['order_id']]);$order=$q->fetch();
        if(($order['payment_environment']??'legacy')!=='legacy'&&$order['payment_environment']!==($live?'live':'sandbox'))fail(400,'STRIPE_MODE_MISMATCH','Environnement de commande incohérent.');
        if(($order['payment_environment']??'legacy')==='legacy')$pdo->prepare('UPDATE orders SET payment_environment=? WHERE id=?')->execute([$live?'live':'sandbox',$order['id']]);
        $q=$pdo->prepare('SELECT * FROM payments WHERE id=? FOR UPDATE');$q->execute([$payment['id']]);$payment=$q->fetch();
        $q=$pdo->prepare('INSERT IGNORE INTO payment_events(event_id,event_type) VALUES(?,?)');$q->execute([$event['id'],$type]);
        if(!$q->rowCount()){$pdo->commit();return ['received'=>true,'duplicate'=>true];}
        if($sessionEvent){
            $metadata=$object['metadata']['order_number']??$object['client_reference_id']??$order['order_number'];
            if($metadata!==$order['order_number'])fail(400,'PAYMENT_MISMATCH','Commande incohérente.');
            if(str_starts_with($payment['reference'],'creating_'))$pdo->prepare('UPDATE payments SET reference=?,payment_intent=? WHERE id=?')->execute([$object['id'],$object['payment_intent']??null,$payment['id']]);
        }
        if(in_array($type,['checkout.session.completed','checkout.session.async_payment_succeeded'],true)&&($object['payment_status']??'')==='paid'){
            if((int)($object['amount_total']??-1)!==(int)$payment['amount']||strtoupper($object['currency']??'')!==$payment['currency'])fail(400,'PAYMENT_MISMATCH','Montant ou devise incohérent.');
            $q=$pdo->prepare("SELECT COUNT(*) FROM payments WHERE order_id=? AND id<>? AND status IN ('SUCCESS','REFUNDED','PARTIALLY_REFUNDED')");$q->execute([$order['id'],$payment['id']]);
            $review=(int)$q->fetchColumn()>0||$order['status']==='CANCELLED';
            $status=(int)$payment['refunded_amount']>0?((int)$payment['refunded_amount']>=(int)$payment['amount']?'REFUNDED':'PARTIALLY_REFUNDED'):'SUCCESS';
            $pdo->prepare('UPDATE payments SET status=?,payment_intent=COALESCE(?,payment_intent),paid_at=COALESCE(paid_at,NOW()),reconciliation_required=GREATEST(reconciliation_required,?) WHERE id=?')->execute([$status,$object['payment_intent']??null,$review?1:0,$payment['id']]);
            if(!$review&&$order['status']==='PENDING')$pdo->prepare("UPDATE orders SET status='PAID',reservation_status='CONSUMED' WHERE id=?")->execute([$order['id']]);
        }elseif(in_array($type,['checkout.session.expired','checkout.session.async_payment_failed'],true)){
            $pdo->prepare("UPDATE payments SET status=? WHERE id=? AND status='PENDING'")->execute([$type==='checkout.session.expired'?'CANCELLED':'FAILED',$payment['id']]);
            $q=$pdo->prepare("SELECT COUNT(*) FROM payments WHERE order_id=? AND status IN ('PENDING','SUCCESS','PARTIALLY_REFUNDED','REFUNDED')");$q->execute([$order['id']]);
            if(!(int)$q->fetchColumn())release_order_locked($order);
        }elseif($type==='charge.refunded'){
            if(strtoupper($object['currency']??'')!==$payment['currency']||(int)($object['amount_refunded']??-1)<0||(int)$object['amount_refunded']>(int)$payment['amount'])fail(400,'PAYMENT_MISMATCH','Remboursement incohérent.');
            $refunded=max((int)$payment['refunded_amount'],(int)$object['amount_refunded']);
            $pdo->prepare('UPDATE payments SET refunded_amount=?,status=? WHERE id=?')->execute([$refunded,$refunded>=(int)$payment['amount']?'REFUNDED':'PARTIALLY_REFUNDED',$payment['id']]);
        }elseif(str_starts_with($type,'charge.dispute.')){
            $pdo->prepare('UPDATE payments SET reconciliation_required=1 WHERE id=?')->execute([$payment['id']]);
        }
        $pdo->commit();return ['received'=>true];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

function stripe_webhook(): never {
    global $config;
    if((int)($_SERVER['CONTENT_LENGTH']??0)>1048576)fail(413,'PAYLOAD_TOO_LARGE','Événement trop volumineux.');
    $payload=(string)file_get_contents('php://input',false,null,0,1048577);
    if(strlen($payload)>1048576)fail(413,'PAYLOAD_TOO_LARGE','Événement trop volumineux.');
    $secret=(string)($config['stripe_webhook_secret']??'');
    if($secret===''||!stripe_signature_is_valid($payload,(string)($_SERVER['HTTP_STRIPE_SIGNATURE']??''),$secret))fail(400,'INVALID_STRIPE_SIGNATURE','Signature Stripe invalide.');
    $event=json_decode($payload,true);if(!is_array($event))fail(400,'INVALID_STRIPE_EVENT','Événement invalide.');
    respond(apply_stripe_event($event));
}

function cancel_order_safe(array $authorizedOrder): void {
    with_order_lock($authorizedOrder['order_number'],function()use($authorizedOrder){
        $order=find_order($authorizedOrder['order_number'],true);
        if($order['status']==='CANCELLED')return;
        if($order['status']!=='PENDING')fail(409,'INVALID_ORDER_STATE','Une commande encaissée ne peut pas être annulée sans traitement de remboursement.');
        $pdo=db();$q=$pdo->prepare("SELECT * FROM payments WHERE order_id=? AND status='PENDING' ORDER BY id");$q->execute([$order['id']]);
        foreach($q->fetchAll() as $p){
            if(str_starts_with($p['reference'],'creating_'))fail(409,'PAYMENT_REVIEW_REQUIRED','Une tentative interrompue doit être rapprochée de Stripe avant annulation.');
            $session=stripe_request('checkout/sessions/'.rawurlencode($p['reference']),[],'GET');
            if(($session['payment_status']??'')==='paid'){reconcile_session($session);fail(409,'ORDER_ALREADY_PAID','Le paiement a été reçu. Un remboursement doit être traité séparément.');}
            if(($session['status']??'')==='open'){
                try{$session=stripe_request('checkout/sessions/'.rawurlencode($p['reference']).'/expire',[],'POST','kic-expire-'.$p['reference']);}
                catch(Throwable $e){$session=stripe_request('checkout/sessions/'.rawurlencode($p['reference']),[],'GET');if(($session['status']??'')!=='expired'){if(($session['payment_status']??'')==='paid')reconcile_session($session);throw $e;}}
            }
            if(($session['status']??'')!=='expired')fail(409,'PAYMENT_PROCESSING','Le paiement est en cours de vérification. Annulation différée.');
            reconcile_session($session);
        }
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT * FROM orders WHERE id=? FOR UPDATE');$q->execute([$order['id']]);$locked=$q->fetch();
            if($locked['status']==='CANCELLED'){$pdo->commit();return;}
            if($locked['status']!=='PENDING')fail(409,'ORDER_ALREADY_PAID','Le paiement a été reçu pendant la vérification.');
            release_order_locked($locked);$pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    });
}
