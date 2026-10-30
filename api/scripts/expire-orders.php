<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/src/bootstrap.php';
require dirname(__DIR__).'/src/commerce.php';
require dirname(__DIR__).'/src/payment.php';
$q=db()->query("SELECT order_number FROM orders WHERE status='PENDING' AND order_mode='PAYMENT' AND expires_at IS NOT NULL AND expires_at<=UTC_TIMESTAMP() ORDER BY id LIMIT 100");
$count=0;$pending=0;
foreach($q->fetchAll() as $row){
    try{cancel_order_safe(find_order($row['order_number'],true));$count++;}
    catch(Throwable $e){$pending++;error_log('KIC expiration différée '.$row['order_number'].' : '.$e->getMessage());}
}
echo "$count réservation(s) libérée(s), $pending vérification(s) à reprendre.\n";
if($pending)exit(2);
