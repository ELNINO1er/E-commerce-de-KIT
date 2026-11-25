<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/src/payment.php';
$secret='whsec_isolated_test_only';$payload='{"id":"evt_fixture","livemode":true}';$now=time();$checks=0;
function verify_signature(bool $value,string $label): void {global $checks;if(!$value)throw new RuntimeException($label);$checks++;}
function signed_header(string $payload,string $secret,int $time): string {return 't='.$time.',v1='.hash_hmac('sha256',$time.'.'.$payload,$secret);}
$header=signed_header($payload,$secret,$now);
verify_signature(stripe_signature_is_valid($payload,$header,$secret),'Signature authentique');
verify_signature(!stripe_signature_is_valid($payload.' ',$header,$secret),'Corps altéré refusé');
verify_signature(!stripe_signature_is_valid($payload,$header,'whsec_wrong'),'Secret incorrect refusé');
verify_signature(!stripe_signature_is_valid($payload,signed_header($payload,$secret,$now-601),$secret),'Événement ancien refusé');
verify_signature(!stripe_signature_is_valid($payload,signed_header($payload,$secret,$now+601),$secret),'Horodatage futur refusé');
verify_signature(!stripe_signature_is_valid($payload,'',$secret),'Signature absente refusée');
verify_signature(!stripe_signature_is_valid($payload,'t=invalid,v1='.str_repeat('a',64),$secret),'Horodatage invalide refusé');
verify_signature(stripe_signature_is_valid($payload,$header.',v1='.str_repeat('0',64),$secret),'Plusieurs signatures acceptées si une est valide');
echo $checks." contrôles de signature Stripe réussis. Aucun réseau ni donnée réelle.\n";
