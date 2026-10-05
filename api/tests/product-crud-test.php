<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/catalog.php';

$pdo = db();
$categoryId = (int) $pdo->query('SELECT id FROM categories ORDER BY id LIMIT 1')->fetchColumn();
if (!$categoryId) {
    throw new RuntimeException('Aucune catégorie disponible pour le test.');
}

$pdo->beginTransaction();
try {
    $slug = 'verification-crud-' . bin2hex(random_bytes(4));
    $insert = $pdo->prepare('INSERT INTO products(name,slug,description,image_url,category_id) VALUES(?,?,?,?,?)');
    $insert->execute(['Produit de vérification', $slug, 'Création CRUD', 'img/poudre-cacao-pub.png', $categoryId]);
    $productId = (int) $pdo->lastInsertId();

    $variant = $pdo->prepare('INSERT INTO product_variants(product_id,sku,format,price,stock,low_stock_threshold) VALUES(?,?,?,?,?,?)');
    $variant->execute([$productId, 'TEST-' . strtoupper(bin2hex(random_bytes(4))), '1 kg', 1500, 10, 2]);
    $variantId = (int) $pdo->lastInsertId();

    $created = product_response(product_row($productId), true);
    if ($created['name'] !== 'Produit de vérification' || ($created['variants'][0]['price'] ?? 0) !== 1500) {
        throw new RuntimeException('La création du produit ou de son format a échoué.');
    }

    $pdo->prepare('UPDATE products SET name=?,description=? WHERE id=?')->execute(['Produit vérifié', 'Modification CRUD', $productId]);
    $pdo->prepare('UPDATE product_variants SET price=?,stock=? WHERE id=?')->execute([1750, 18, $variantId]);
    $updated = product_response(product_row($productId), true);
    if ($updated['name'] !== 'Produit vérifié' || ($updated['variants'][0]['price'] ?? 0) !== 1750 || ($updated['variants'][0]['stock'] ?? 0) !== 18) {
        throw new RuntimeException('La modification du produit n’est pas reflétée dans le catalogue.');
    }

    $pdo->prepare('UPDATE products SET active=0 WHERE id=?')->execute([$productId]);
    $visible = $pdo->prepare('SELECT COUNT(*) FROM products WHERE id=? AND active=1');
    $visible->execute([$productId]);
    if ((int) $visible->fetchColumn() !== 0) {
        throw new RuntimeException('La suppression du produit a échoué.');
    }

    $pdo->rollBack();
    echo "CRUD produits vérifié : ajout, modification, prix, stock et suppression.\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}
