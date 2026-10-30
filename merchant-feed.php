<?php
declare(strict_types=1);

require __DIR__ . '/api/src/bootstrap.php';
require __DIR__ . '/api/src/catalog.php';
require __DIR__ . '/api/src/commerce.php';
require __DIR__ . '/api/src/payment.php';

header('Content-Type: application/rss+xml; charset=UTF-8');
header('Cache-Control: public, max-age=900');

function xml_value(?string $value): string
{
    return htmlspecialchars((string)$value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

try {
    $query = db()->query(
        "SELECT p.name,p.slug,p.description,p.image_url,v.sku,v.format,v.price,v.promo_price,v.stock
         FROM products p
         JOIN product_variants v ON v.product_id=p.id
         WHERE p.active=1
         ORDER BY p.id,v.price"
    );
    $rows = $query->fetchAll();
 } catch (Throwable $error) {
    error_log('KIC Merchant : catalogue indisponible');
    http_response_code(503);header('Retry-After: 900');
    echo '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Catalogue temporairement indisponible</title></channel></rss>';exit;
}
if(($config['payment_mode']??'sandbox')!=='live'||empty($config['payments_enabled'])||in_array(false,payment_readiness(),true)){
    http_response_code(503);header('Retry-After: 86400');
    echo '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Catalogue en phase de test</title></channel></rss>';exit;
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel>';
echo '<title>Produits KIC France</title><link>https://kic-fr.com/produits</link>';
echo '<description>Catalogue officiel KIC synchronisé avec les stocks de la boutique</description>';
foreach ($rows as $row) {
    $price = ((int)($row['promo_price'] ?? $row['price'])) / 100;
    $image = preg_match('#^https?://#i', (string)$row['image_url'])
        ? $row['image_url']
        : 'https://kic-fr.com/' . ltrim((string)$row['image_url'], '/');
    echo '<item>';
    echo '<g:id>' . xml_value($row['sku']) . '</g:id>';
    echo '<g:title>' . xml_value($row['name'] . ' KIC — ' . $row['format']) . '</g:title>';
    echo '<g:description>' . xml_value($row['description']) . '</g:description>';
    $known=['beurre-de-cacao','poudre-de-cacao','masse-de-cacao','infusion-de-cacao','jus-de-cacao'];
    $target=in_array($row['slug'],$known,true)?$row['slug']:'produit?slug='.rawurlencode($row['slug']);
    echo '<g:link>https://kic-fr.com/' . xml_value($target) . '</g:link>';
    echo '<g:image_link>' . xml_value($image) . '</g:image_link>';
    echo '<g:availability>' . ((int)$row['stock'] > 0 ? 'in_stock' : 'out_of_stock') . '</g:availability>';
    echo '<g:price>' . number_format($price, 2, '.', '') . ' EUR</g:price>';
    echo '<g:condition>new</g:condition><g:brand>KIC</g:brand>';
    echo '<g:mpn>' . xml_value($row['sku']) . '</g:mpn>';
    echo '<g:identifier_exists>false</g:identifier_exists>';
    echo '</item>';
}
echo '</channel></rss>';
