<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$config=['app_key'=>str_repeat('kic-test-',8),'app_env'=>'production','allowed_origins'=>['https://kic-fr.com']];
function fail(int $status,string $code,string $message,array $errors=[]): never { throw new RuntimeException($code,$status); }
require dirname(__DIR__).'/src/security.php';
$checks=0;
function ok(bool $value,string $label): void {global $checks;if(!$value)throw new RuntimeException('Échec : '.$label);$checks++;}
function rejected(callable $fn,string $code): void {try{$fn();}catch(RuntimeException $e){ok($e->getMessage()===$code,$code);return;}throw new RuntimeException('Rejet attendu : '.$code);}
validate_catalog_amounts(['price'=>0,'stock'=>2]);ok(true,'montants euro en centimes');
rejected(fn()=>validate_catalog_amounts(['price'=>-1]),'VALIDATION_ERROR');
$body=['contactEmail'=>'client@example.fr','recipientName'=>'Entreprise Test','phone'=>'+33700000000','city'=>'Nice','addressLine'=>'1 rue Test','cartToken'=>str_repeat('a',64),'deliveryMethod'=>'DELIVERY'];
validate_checkout($body);ok(true,'commande France valide');
rejected(fn()=>validate_checkout(array_merge($body,['contactEmail'=>'invalide'])),'VALIDATION_ERROR');
rejected(fn()=>validate_checkout(array_merge($body,['deliveryMethod'=>'PAYMENT'])),'VALIDATION_ERROR');
$_SERVER['HTTP_ORIGIN']='https://attaque.example';rejected(fn()=>require_session_origin(),'FORBIDDEN');
$_SERVER['HTTP_ORIGIN']='https://kic-fr.com';require_session_origin();ok(true,'origine KIC autorisée');
$_SERVER['SCRIPT_NAME']='/api/index.php';$cookie=session_cookie_options(time()+30);ok($cookie['httponly']&&$cookie['secure']&&$cookie['samesite']==='Strict','cookie sécurisé');
echo $checks." contrôles KIC réussis. Aucun paiement, réseau ou donnée client utilisé.\n";
