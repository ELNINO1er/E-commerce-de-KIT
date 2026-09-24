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
    foreach(['contactEmail'=>190,'recipientName'=>190,'phone'=>40,'city'=>120,'addressLine'=>255,'cartToken'=>64] as $field=>$limit){
        if(!is_string($body[$field]??null)||strlen($body[$field])>$limit)fail(422,'VALIDATION_ERROR','Champ invalide : '.$field);
    }
    if(!filter_var($body['contactEmail'],FILTER_VALIDATE_EMAIL)||!in_array($body['deliveryMethod'],['PICKUP','DELIVERY'],true))fail(422,'VALIDATION_ERROR','Coordonnees ou livraison invalides.');
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
    $pdo=db();$pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT status FROM orders WHERE id=? FOR UPDATE');$q->execute([$order['id']]);$previous=$q->fetchColumn();
        $transitions=['PENDING'=>['PAID','CANCELLED'],'PAID'=>['SHIPPED'],'SHIPPED'=>['DELIVERED'],'DELIVERED'=>[],'CANCELLED'=>[]];
        if($previous===$target){$pdo->commit();return;}
        if(!in_array($target,$transitions[$previous]??[],true))fail(409,'INVALID_ORDER_STATE','Transition de commande interdite.');
        if($target==='CANCELLED'){
            $q=$pdo->prepare('SELECT variant_id,quantity FROM order_items WHERE order_id=?');$q->execute([$order['id']]);
            foreach($q->fetchAll() as $item)$pdo->prepare('UPDATE product_variants SET stock=stock+? WHERE id=?')->execute([$item['quantity'],$item['variant_id']]);
        }
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
