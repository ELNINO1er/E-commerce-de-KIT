<?php
declare(strict_types=1);

function order_access_token(array $order): string
{
    global $config;
    if(strlen($config['app_key'])<32)fail(503,'CONFIGURATION_ERROR','Cle application insuffisante.');
    return hash_hmac('sha256','order:'.$order['id'].':'.$order['order_number'],$config['app_key']);
}

function require_session_origin(): void
{
    global $config;
    $origin=$_SERVER['HTTP_ORIGIN']??'';
    if($origin&&!in_array($origin,$config['allowed_origins'],true))fail(403,'FORBIDDEN','Origine non autorisee.');
    if(($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site')fail(403,'FORBIDDEN','Requete inter-site interdite.');
}

function session_cookie_options(int $expires): array
{
    global $config;
    $path=rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/api/index.php')),'/').'/auth';
    return ['expires'=>$expires,'path'=>$path,'secure'=>$config['app_env']==='production'||($_SERVER['HTTPS']??'')==='on','httponly'=>true,'samesite'=>'Strict'];
}

function checkout_existing(string $number): ?array
{
    $q=db()->prepare('SELECT id FROM orders WHERE order_number=?');$q->execute([$number]);
    if(!$q->fetchColumn())return null;
    $order=find_order($number,true);return array_merge(order_response($order),['accessToken'=>order_access_token($order)]);
}

function validate_checkout(array $body): void
{
    foreach(['contactEmail'=>190,'recipientName'=>190,'phone'=>40,'city'=>120,'addressLine'=>255,'postalCode'=>20,'country'=>100] as $field=>$limit){
        if(!is_string($body[$field]??null)||strlen($body[$field])>$limit)fail(422,'VALIDATION_ERROR','Champ invalide : '.$field);
    }
    foreach(['contactEmail','recipientName','phone'] as $field)if(trim($body[$field])==='')fail(422,'VALIDATION_ERROR','Champ obligatoire : '.$field);
    if(!filter_var($body['contactEmail'],FILTER_VALIDATE_EMAIL)||!in_array($body['deliveryMethod']??'', ['PICKUP','DELIVERY'],true))fail(422,'VALIDATION_ERROR','Coordonnées ou livraison invalides.');
    if($body['deliveryMethod']==='DELIVERY')foreach(['city','addressLine','postalCode','country'] as $field)if(trim($body[$field])==='')fail(422,'VALIDATION_ERROR','Champ obligatoire : '.$field);
}

function with_order_lock(string $identity,callable $callback): mixed
{
    $pdo=db();$name='kic:'.substr(hash('sha256',$identity),0,50);
    $q=$pdo->prepare('SELECT GET_LOCK(?,5)');$q->execute([$name]);
    if((int)$q->fetchColumn()!==1)fail(409,'ORDER_BUSY','Cette commande est déjà en cours de traitement. Réessayez dans quelques secondes.');
    try{return $callback();}finally{$pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$name]);}
}

function validate_catalog_amounts(array $body): void
{
    foreach(['price','stock','lowStockThreshold'] as $field){
        if(isset($body[$field])&&(filter_var($body[$field],FILTER_VALIDATE_INT)===false||(int)$body[$field]<0))fail(422,'VALIDATION_ERROR','Valeur invalide : '.$field);
    }
    if(isset($body['price'])&&(int)$body['price']<0)fail(422,'VALIDATION_ERROR','Le prix doit être positif (en centimes d’euro).');
}

function admin_change_order_status(array $order,string $target): void
{
    if($target==='CANCELLED'){cancel_order_safe($order);return;}
    if($target==='PAID')fail(409,'PAYMENT_CONFIRMATION_REQUIRED','Le statut Payée est attribué uniquement après confirmation du paiement.');
    $pdo=db();$pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT * FROM orders WHERE id=? FOR UPDATE');$q->execute([$order['id']]);$locked=$q->fetch();
        if(!$locked)fail(404,'NOT_FOUND','Commande introuvable.');
        if($locked['status']===$target){$pdo->commit();return;}
        $allowed=['PAID'=>['SHIPPED'],'SHIPPED'=>['DELIVERED']];
        if(!in_array($target,$allowed[$locked['status']]??[],true))fail(409,'INVALID_ORDER_STATE','Transition de commande interdite.');
        $q=$pdo->prepare("SELECT COUNT(*) FROM payments WHERE order_id=? AND (status<>'SUCCESS' OR reconciliation_required=1) AND status IN ('SUCCESS','REFUNDED','PARTIALLY_REFUNDED')");$q->execute([$order['id']]);
        if($q->fetchColumn())fail(409,'PAYMENT_REVIEW_REQUIRED','Vérifiez le remboursement ou le paiement signalé avant expédition.');
        $pdo->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$target,$order['id']]);$pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

function security_rate_limit(string $scope,int $limit=10,int $window=300): void
{
    global $config;
    $key=hash_hmac('sha256',$scope.':'.($_SERVER['REMOTE_ADDR']??'unknown'),$config['app_key']);
    $file=fopen(sys_get_temp_dir().'/kic-rate-'.$key,'c+');
    if(!$file||!flock($file,LOCK_EX))fail(503,'SECURITY_UNAVAILABLE','Protection temporairement indisponible.');
    $state=json_decode(stream_get_contents($file),true)?:['start'=>time(),'count'=>0];
    if(time()-$state['start']>=$window)$state=['start'=>time(),'count'=>0];
    $blocked=$state['count']>=$limit;
    if(!$blocked){$state['count']++;rewind($file);ftruncate($file,0);fwrite($file,json_encode($state));}
    flock($file,LOCK_UN);fclose($file);
    if($blocked){header('Retry-After: '.max(1,$window-(time()-$state['start'])));fail(429,'TOO_MANY_ATTEMPTS','Trop de tentatives. Reessayez dans quelques minutes.');}
}
