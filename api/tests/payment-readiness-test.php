<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
function fail(int $status,string $code,string $message,array $errors=[]): never {throw new RuntimeException($code,$status);}
require dirname(__DIR__).'/src/payment.php';
$config=['app_key'=>str_repeat('x',32),'app_env'=>'production','app_url'=>'https://kic-fr.com','payments_enabled'=>true,'payment_mode'=>'live','stripe_secret_key'=>'sk_live_'.str_repeat('x',24),'stripe_webhook_secret'=>'whsec_test_fixture_only','price_tax_mode'=>'TTC','seller_registration'=>'100105154 RCS Nice','sales_terms_confirmed'=>true,'vat_rate_bps'=>550,'seller_vat_number'=>'FR_TEST_FIXTURE'];
$checks=0;
function verify(bool $value,string $label): void {global $checks;if(!$value)throw new RuntimeException($label);$checks++;}
verify(!in_array(false,payment_readiness(),true),'Configuration live complète');
foreach(['vat_rate_bps'=>false,'seller_vat_number'=>'','stripe_secret_key'=>'sk_test_'.str_repeat('x',24),'stripe_webhook_secret'=>'','price_tax_mode'=>'UNCONFIRMED','seller_registration'=>'','sales_terms_confirmed'=>false,'app_url'=>'http://kic-fr.com'] as $key=>$value){
    $saved=$config[$key];$config[$key]=$value;
    try{require_payment_ready();throw new LogicException('Paiement accepté avec '.$key);}catch(RuntimeException $e){verify($e->getMessage()==='PAYMENT_CONFIGURATION_ERROR','Blocage '.$key);}
    $config[$key]=$saved;
}
$config['payments_enabled']=false;
try{require_payment_ready();throw new LogicException('Paiement désactivé accepté');}catch(RuntimeException $e){verify($e->getMessage()==='PAYMENTS_DISABLED','Fermeture des paiements');}
echo $checks." contrôles de préparation production réussis. Aucun réseau ni paiement utilisé.\n";
