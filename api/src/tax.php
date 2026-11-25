<?php
declare(strict_types=1);

/** Montants en centimes ; taux en points de base (550 = 5,5 %). */
function tax_breakdown(int $total,array $settings): ?array {
    if(($settings['price_tax_mode']??'UNCONFIRMED')!=='TTC')return null;
    $rate=$settings['vat_rate_bps']??null;
    if(!is_int($rate)||$rate<0||$rate>10000)fail(503,'TAX_CONFIGURATION_ERROR','Le taux de TVA doit être configuré.');
    if($total<0)fail(422,'INVALID_TOTAL','Montant invalide.');
    // Arrondi au centime sans calcul flottant ; TVA incluse, jamais ajoutée au TTC.
    $denominator=10000+$rate;
    $net=intdiv($total*10000+intdiv($denominator,2),$denominator);
    return ['rateBps'=>$rate,'netAmount'=>$net,'vatAmount'=>$total-$net,'grossAmount'=>$total,'sellerVatNumber'=>$settings['seller_vat_number']??''];
}

function checkout_delivery_fee(?array $zone,array $settings): int {
    $included=!empty($settings['delivery_included_france'])&&in_array($zone['scope']??'',['FR_MAINLAND','FR_CORSE'],true);
    return $included?0:(int)($zone['fee']??0);
}
