<?php
declare(strict_types=1);

function require_app_key(): void {
    global $config;
    if(strlen($config['app_key'])<32) fail(503,'CONFIGURATION_ERROR','Le service de commande doit être configuré par KIC.');
}

function eu_countries(): array {
    return ['Allemagne','Autriche','Belgique','Bulgarie','Chypre','Croatie','Danemark','Espagne','Estonie','Finlande','Grèce','Hongrie','Irlande','Italie','Lettonie','Lituanie','Luxembourg','Malte','Pays-Bas','Pologne','Portugal','République tchèque','Roumanie','Slovaquie','Slovénie','Suède'];
}

function requested_items(array $body): array {
    if(!is_array($body['items']??null)||!count($body['items'])||count($body['items'])>100) fail(422,'CART_EMPTY','Ajoutez des produits depuis le catalogue actualisé.');
    $items=[];
    foreach($body['items'] as $item){
        if(!is_array($item)||filter_var($item['variantId']??null,FILTER_VALIDATE_INT)===false||filter_var($item['quantity']??null,FILTER_VALIDATE_INT)===false) fail(422,'VALIDATION_ERROR','Article ou quantité invalide.');
        $id=(int)$item['variantId'];$qty=(int)$item['quantity'];
        if($id<1||$qty<1||$qty>1000) fail(422,'VALIDATION_ERROR','Quantité autorisée : 1 à 1 000 unités.');
        $items[$id]=($items[$id]??0)+$qty;
        if($items[$id]>1000) fail(422,'VALIDATION_ERROR','Quantité trop importante pour une commande en ligne. Contactez KIC.');
    }
    ksort($items,SORT_NUMERIC);return $items;
}

function checkout_body(array $body): array {
    $result=[];
    foreach(['recipientName','contactEmail','phone','city','postalCode','addressLine','country','deliveryMethod','discountCode'] as $field) {if(isset($body[$field])&&!is_string($body[$field]))fail(422,'VALIDATION_ERROR','Champ invalide : '.$field);$result[$field]=trim((string)($body[$field]??''));}
    $result['contactEmail']=strtolower($result['contactEmail']);
    $result['discountCode']=strtoupper($result['discountCode']);
    if($result['country']==='')$result['country']='France';
    $result['deliveryZoneId']=(int)($body['deliveryZoneId']??0);
    $result['items']=requested_items($body);
    $result['termsAccepted']=($body['termsAccepted']??false)===true;
    return $result;
}

function validated_delivery(array $body): ?array {
    if(!in_array($body['deliveryMethod'],['DELIVERY','PICKUP'],true)) fail(422,'VALIDATION_ERROR','Mode de réception invalide.');
    if($body['deliveryMethod']==='PICKUP')return null;
    $q=db()->prepare('SELECT * FROM delivery_zones WHERE id=? AND active=1');$q->execute([$body['deliveryZoneId']]);$zone=$q->fetch();
    if(!$zone)fail(422,'INVALID_DELIVERY_ZONE','Choisissez une zone de livraison disponible.');
    $scope=$zone['scope']??'MANUAL';$country=$body['country'];$postal=$body['postalCode'];
    $corse=$country==='France'&&preg_match('/^20\d{3}$/',$postal);
    if($country==='France'&&!preg_match('/^(?!97|98)\d{5}$/',$postal))fail(422,'INVALID_POSTAL_CODE','Indiquez un code postal métropolitain à cinq chiffres. Autres destinations : demandez un devis.');
    $valid=($scope==='FR_MAINLAND'&&$country==='France'&&!$corse)||($scope==='FR_CORSE'&&$corse)||($scope==='EU'&&in_array($country,eu_countries(),true));
    if(!$valid||$zone['fee']<0)fail(422,'INVALID_DELIVERY_ZONE','La zone ne correspond pas au pays et au code postal. Contactez KIC pour les autres destinations.');
    return $zone;
}

function quote_order(array $input,bool $lock=false): array {
    global $config;
    require_app_key();$body=checkout_body($input);
    $enabled=(bool)($config['payments_enabled']??false);
    if($enabled&&$lock)require_payment_ready();
    $zone=validated_delivery($body);
    $ids=array_keys($body['items']);$marks=implode(',',array_fill(0,count($ids),'?'));
    $sql="SELECT v.*,p.name,p.active FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id IN ($marks) ORDER BY v.id".($lock?' FOR UPDATE':'');
    $q=db()->prepare($sql);$q->execute($ids);$rows=$q->fetchAll();
    if(count($rows)!==count($ids))fail(422,'PRODUCT_UNAVAILABLE','Un produit n’est plus disponible. Actualisez votre panier.');
    $items=[];$subtotal=0;
    foreach($rows as $v){
        if(!$v['active'])fail(422,'PRODUCT_UNAVAILABLE','Un produit n’est plus proposé.');
        $qty=$body['items'][(int)$v['id']];$price=(int)($v['promo_price']??$v['price']);
        if($enabled&&($price<1||(int)$v['stock']<$qty))fail(409,'INSUFFICIENT_STOCK','Le stock ou le prix de '.$v['name'].' ne permet pas un paiement immédiat. Contactez KIC.');
        $line=$price*$qty;$subtotal+=$line;
        $items[]=['variantId'=>(int)$v['id'],'productName'=>$v['name'],'format'=>$v['format'],'quantity'=>$qty,'unitPrice'=>$price,'lineTotal'=>$line,'availableStock'=>(int)$v['stock']];
    }
    $discount=null;
    if($body['discountCode']!==''){
        $discount=valid_discount($body['discountCode'],$subtotal);
        if(!$discount)fail(422,'INVALID_DISCOUNT','Code promotionnel invalide, expiré ou non applicable à ce montant.');
    }
    $reduction=$discount?discount_amount($discount,$subtotal):0;$fee=(int)($zone['fee']??0);
    if($subtotal+$fee-$reduction>99999999)fail(422,'AMOUNT_TOO_LARGE','Pour ce montant, contactez KIC afin de recevoir un devis professionnel.');
    $quote=['paymentEnvironment'=>$config['payment_mode']??'sandbox','mode'=>$enabled?'PAYMENT':'REQUEST','currency'=>'EUR','items'=>$items,'subtotal'=>$subtotal,'deliveryFee'=>$fee,'discountAmount'=>$reduction,'discountCode'=>$discount['code']??null,'total'=>$subtotal+$fee-$reduction,'taxMode'=>$config['price_tax_mode']??'UNCONFIRMED','deliveryZoneName'=>$zone['name']??'Retrait à Nice'];
    $quote['quoteHash']=hash_hmac('sha256',json_encode([$quote,$body['deliveryMethod'],$body['country'],$body['postalCode'],$body['deliveryZoneId']],JSON_UNESCAPED_UNICODE),$config['app_key']);
    return $quote;
}

function order_response(array $order): array {
    $base=legacy_order_response($order);
    $base['mode']=$order['order_mode']??'PAYMENT';
    $base['paymentEnvironment']=$order['payment_environment']??'legacy';
    $base['reservationStatus']=$order['reservation_status']??'HELD';
    $base['postalCode']=$order['postal_code']??'';
    $base['taxMode']=$order['tax_mode']??'UNCONFIRMED';
    $base['expiresAt']=$order['expires_at']?gmdate(DATE_ATOM,strtotime($order['expires_at'].' UTC')):null;
    $q=db()->prepare("SELECT refunded_amount,reconciliation_required FROM payments WHERE order_id=? ORDER BY (status IN ('SUCCESS','REFUNDED','PARTIALLY_REFUNDED')) DESC,id DESC LIMIT 1");$q->execute([$order['id']]);
    if($p=$q->fetch())$base['payment']=array_merge($base['payment']??[],['refundedAmount'=>(int)$p['refunded_amount'],'requiresReview'=>(bool)$p['reconciliation_required']]);
    return $base;
}

function create_order_data(array $input,string $key): array {
    global $config;
    require_app_key();
    if(!preg_match('/^[a-f0-9]{32,64}$/',$key))fail(422,'IDEMPOTENCY_REQUIRED','Identifiant de demande obligatoire.');
    $body=checkout_body($input);validate_checkout($body);
    if(!$body['termsAccepted'])fail(422,'TERMS_REQUIRED','Veuillez lire et accepter les conditions de commande.');
    $hash=hash('sha256',json_encode($body,JSON_UNESCAPED_UNICODE));
    $number='KIC-'.strtoupper(substr(hash_hmac('sha256','checkout:'.$key,$config['app_key']),0,24));
    return with_order_lock($number,function()use($input,$body,$hash,$number,$key){
        $pdo=db();$q=$pdo->prepare('SELECT * FROM orders WHERE order_number=?');$q->execute([$number]);
        if($old=$q->fetch()){
            if(!hash_equals((string)$old['request_hash'],$hash))fail(409,'IDEMPOTENCY_CONFLICT','Cette demande a déjà été transmise avec des informations différentes.');
            return array_merge(order_response(find_order($number,true)),['accessToken'=>order_access_token($old)]);
        }
        $pdo->beginTransaction();
        try{
            $quote=quote_order($input,true);
            if(!hash_equals($quote['quoteHash'],(string)($input['quoteHash']??'')))fail(409,'QUOTE_CHANGED','Les prix ou disponibilités ont changé. Vérifiez le nouveau récapitulatif avant de confirmer.');
            $pay=$quote['mode']==='PAYMENT';
            if($pay&&$quote['total']<50)fail(422,'PAYMENT_AMOUNT_INVALID','Le montant minimum pour un paiement par carte est de 0,50 €.');
            $q=$pdo->prepare('INSERT INTO orders(order_number,checkout_key,request_hash,order_mode,payment_environment,reservation_status,expires_at,tax_mode,discount_reserved,user_id,subtotal,delivery_fee,discount_code,discount_amount,total,contact_email,contact_phone,recipient_name,city,postal_code,address_line,country,delivery_method,delivery_zone_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $u=current_user(false);
            $q->execute([$number,hash('sha256',$key),$hash,$quote['mode'],$quote['paymentEnvironment'],$pay?'HELD':'NONE',$pay?gmdate('Y-m-d H:i:s',time()+3600):null,$quote['taxMode'],$pay&&$quote['discountCode']?1:0,$u['id']??null,$quote['subtotal'],$quote['deliveryFee'],$quote['discountCode'],$quote['discountAmount'],$quote['total'],$body['contactEmail'],$body['phone'],$body['recipientName'],$body['city'],$body['postalCode'],$body['addressLine'],$body['country'],$body['deliveryMethod'],$body['deliveryMethod']==='DELIVERY'?$body['deliveryZoneId']:null]);
            $id=(int)$pdo->lastInsertId();
            foreach($quote['items'] as $item){
                if($pay){$q=$pdo->prepare('UPDATE product_variants SET stock=stock-? WHERE id=? AND stock>=?');$q->execute([$item['quantity'],$item['variantId'],$item['quantity']]);if(!$q->rowCount())fail(409,'INSUFFICIENT_STOCK','Stock insuffisant.');}
                $pdo->prepare('INSERT INTO order_items(order_id,variant_id,product_name,format,unit_price,quantity,line_total) VALUES(?,?,?,?,?,?,?)')->execute([$id,$item['variantId'],$item['productName'],$item['format'],$item['unitPrice'],$item['quantity'],$item['lineTotal']]);
            }
            if($pay&&$quote['discountCode']){
                $q=$pdo->prepare('UPDATE discount_codes SET used_count=used_count+1 WHERE code=? AND (max_uses IS NULL OR used_count<max_uses)');$q->execute([$quote['discountCode']]);
                if(!$q->rowCount())fail(409,'DISCOUNT_EXHAUSTED','Ce code promotionnel vient d’atteindre sa limite.');
            }
            $pdo->commit();$created=find_order($number,true);
            $result=array_merge(order_response($created),['accessToken'=>order_access_token($created)]);
            notify_new_order($result);return $result;
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    });
}

function create_order(): never {
    security_rate_limit('order-create',15,300);
    respond(create_order_data(json_body(),(string)($_SERVER['HTTP_IDEMPOTENCY_KEY']??'')),201);
}

// Called with the order row locked in an existing transaction.
function release_order_locked(array $order): void {
    if($order['status']!=='PENDING')return;
    $pdo=db();
    if(($order['reservation_status']??'HELD')==='HELD'){
        $q=$pdo->prepare('SELECT variant_id,quantity FROM order_items WHERE order_id=? ORDER BY variant_id');$q->execute([$order['id']]);
        foreach($q->fetchAll() as $i)$pdo->prepare('UPDATE product_variants SET stock=stock+? WHERE id=?')->execute([$i['quantity'],$i['variant_id']]);
    }
    if(!empty($order['discount_reserved'])&&$order['discount_code'])$pdo->prepare('UPDATE discount_codes SET used_count=GREATEST(0,used_count-1) WHERE code=?')->execute([$order['discount_code']]);
    $pdo->prepare("UPDATE orders SET status='CANCELLED',reservation_status=IF(reservation_status='HELD','RELEASED',reservation_status),discount_reserved=0 WHERE id=?")->execute([$order['id']]);
}
