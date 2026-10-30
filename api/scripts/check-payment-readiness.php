<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/src/bootstrap.php';
require dirname(__DIR__).'/src/commerce.php';
require dirname(__DIR__).'/src/payment.php';
$checks=payment_readiness();$schema=false;
try{$schema=(bool)db()->query('SELECT payment_environment,reservation_status FROM orders LIMIT 0');db()->query('SELECT attempt_key,refunded_amount FROM payments LIMIT 0');db()->query('SELECT event_id FROM payment_events LIMIT 0');}catch(Throwable $e){$schema=false;}
$checks['schema']=$schema;
echo json_encode(['mode'=>$config['payment_mode'],'paymentsEnabled'=>$config['payments_enabled'],'configured'=>!in_array(false,$checks,true),'checks'=>$checks,'note'=>'Ce contrôle ne contacte pas Stripe et ne prouve pas la validité du compte ou la réception des webhooks.'],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE),"\n";
if(in_array('--strict',$argv,true)&&in_array(false,$checks,true))exit(2);
