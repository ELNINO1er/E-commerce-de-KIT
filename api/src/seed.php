<?php
declare(strict_types=1);

function seed_catalogue(): array
{
    $root = dirname(__DIR__, 2);
    $products = json_decode((string) file_get_contents($root.'/data/products.json'), true, 512, JSON_THROW_ON_ERROR);
    $commerce = json_decode((string) file_get_contents($root.'/data/commerce-config.json'), true, 512, JSON_THROW_ON_ERROR);
    $pdo = db();
    $pdo->beginTransaction();
    try {
        foreach ($products as $product) {
            $categoryName = $product['category'];
            $q = $pdo->prepare('INSERT INTO categories(name,slug) VALUES(?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),id=LAST_INSERT_ID(id)');
            $q->execute([$categoryName, slugify($categoryName)]);
            $categoryId = (int) $pdo->lastInsertId();
            $details = array_intersect_key($product, array_flip(['gallery','badge','popular','ingredients','allergens','nutrition','usage','conservation','similar','rating']));
            $q = $pdo->prepare('INSERT INTO products(legacy_id,name,slug,description,long_description,image_url,details_json,category_id) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),long_description=VALUES(long_description),image_url=VALUES(image_url),details_json=VALUES(details_json),category_id=VALUES(category_id),id=LAST_INSERT_ID(id)');
            $q->execute([$product['id'],$product['name'],$product['slug'],$product['description']??null,$product['longDescription']??null,$product['image']??null,json_encode($details,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$categoryId]);
            $productId = (int) $pdo->lastInsertId();
            foreach ($product['formats'] as $variant) {
                $q = $pdo->prepare('INSERT INTO product_variants(product_id,legacy_id,sku,format,price,promo_price,stock) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE product_id=VALUES(product_id),legacy_id=VALUES(legacy_id),format=VALUES(format),price=VALUES(price),promo_price=VALUES(promo_price),stock=VALUES(stock)');
                $q->execute([$productId,$variant['id'],$variant['sku'],$variant['label'],$variant['price'],$variant['promoPrice']??null,$variant['stock']]);
            }
        }
        foreach (($commerce['deliveryZones'] ?? []) as $zone) {
            preg_match_all('/\d+/', $zone['delay'], $matches);
            $days = $matches[0] ?: [1,2];
            $q = $pdo->prepare('INSERT INTO delivery_zones(code,name,city,fee,express_fee,estimated_days_min,estimated_days_max) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),fee=VALUES(fee),express_fee=VALUES(express_fee),estimated_days_min=VALUES(estimated_days_min),estimated_days_max=VALUES(estimated_days_max)');
            $q->execute([$zone['id'],$zone['label'],$zone['city']??'France',$zone['standard'],$zone['express'],(int)$days[0],(int)($days[1]??$days[0])]);
        }
        $pdo->commit();
        return ['products'=>count($products),'deliveryZones'=>count($commerce['deliveryZones'] ?? [])];
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}
