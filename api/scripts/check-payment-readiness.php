<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/src/bootstrap.php';
require dirname(__DIR__).'/src/commerce.php';
require dirname(__DIR__).'/src/payment.php';
$checks=payment_readiness();$schema=false;
try{$schema=(bool)db()->query('SELECT payment_environment,reservation_status,tax_snapshot FROM orders LIMIT 0');db()->query('SELECT attempt_key,refunded_amount FROM payments LIMIT 0');db()->query('SELECT event_id FROM payment_events LIMIT 0');}catch(Throwable $e){$schema=false;}
$checks['schema']=$schema;
$production=in_array('--production',$argv,true);
if($production){
    $checks['productionMode']=$config['payment_mode']==='live';
    $checks['paymentsEnabled']=(bool)$config['payments_enabled'];
}
$account=null;
if(in_array('--stripe',$argv,true)){
    $checks['stripeAccount']=false;
    $checks['chargesEnabled']=false;
    $checks['payoutsEnabled']=false;
    if($checks['stripeKey']&&$checks['keyMode']&&$checks['curl']){
        try{
            // Lecture uniquement : aucune commande, clé ou transaction n'est créée.
            $remote=stripe_request('account',[],'GET');
            $checks['stripeAccount']=($remote['object']??'')==='account';
            $checks['chargesEnabled']=($remote['charges_enabled']??false)===true;
            $checks['payoutsEnabled']=($remote['payouts_enabled']??false)===true;
            $account=['chargesEnabled'=>$checks['chargesEnabled'],'payoutsEnabled'=>$checks['payoutsEnabled'],'detailsSubmitted'=>(bool)($remote['details_submitted']??false),'requirementsDue'=>count($remote['requirements']['currently_due']??[])];
        }catch(Throwable $e){
            // Ne jamais afficher la réponse brute, les secrets ou les données du représentant.
            $account=['verification'=>'failed'];
        }
    }
}
echo json_encode(['mode'=>$config['payment_mode'],'paymentsEnabled'=>$config['payments_enabled'],'configured'=>!in_array(false,$checks,true),'checks'=>$checks,'stripeAccount'=>$account,'note'=>'Le contrôle Stripe est en lecture seule et nécessite --stripe. La réception des webhooks et le parcours complet restent à vérifier séparément.'],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE),"\n";
if(in_array('--strict',$argv,true)&&in_array(false,$checks,true))exit(2);
