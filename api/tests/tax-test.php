<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
function fail(int $status,string $code,string $message,array $errors=[]): never {throw new RuntimeException($code,$status);}
require dirname(__DIR__).'/src/tax.php';
$settings=['price_tax_mode'=>'TTC','vat_rate_bps'=>550,'seller_vat_number'=>'FR_TEST_FIXTURE','delivery_included_france'=>true];$checks=0;
function check_tax(bool $value,string $label): void {global $checks;if(!$value)throw new RuntimeException($label);$checks++;}
$tax=tax_breakdown(4000,$settings);
check_tax($tax['netAmount']===3791&&$tax['vatAmount']===209&&$tax['grossAmount']===4000,'40 EUR TTC = 37,91 HT + 2,09 TVA');
foreach([0,1,49,50,100,999,10000,99999999] as $total){$tax=tax_breakdown($total,$settings);check_tax($tax['netAmount']+$tax['vatAmount']===$total,'Arrondis cohérents '.$total);}
check_tax(tax_breakdown(3600,$settings)['grossAmount']===3600,'Remise appliquée avant ventilation TVA');
check_tax(tax_breakdown(4000,['price_tax_mode'=>'UNCONFIRMED'])===null,'Ancienne commande sans fiscalité inventée');
check_tax(checkout_delivery_fee(['scope'=>'FR_MAINLAND','fee'=>1200],$settings)===0,'Livraison métropole comprise');
check_tax(checkout_delivery_fee(['scope'=>'FR_CORSE','fee'=>2200],$settings)===0,'Livraison Corse comprise');
check_tax(checkout_delivery_fee(['scope'=>'EU','fee'=>2800],$settings)===2800,'Tarif UE conservé');
check_tax(checkout_delivery_fee(null,$settings)===0,'Retrait sans supplément');
check_tax(checkout_delivery_fee(['scope'=>'FR_MAINLAND','fee'=>1200],[])===1200,'Ancienne configuration conservée');
try{tax_breakdown(4000,['price_tax_mode'=>'TTC']);throw new LogicException('Taux manquant accepté');}catch(RuntimeException $e){check_tax($e->getMessage()==='TAX_CONFIGURATION_ERROR','Taux obligatoire');}
echo $checks." contrôles TVA et livraison réussis, sans réseau ni paiement.\n";
