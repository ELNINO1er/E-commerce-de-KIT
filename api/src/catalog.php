<?php
declare(strict_types=1);

function category_response(array $row): array
{
    return ['id' => (int)$row['id'], 'name' => $row['name'], 'slug' => $row['slug'],
        'parentId' => $row['parent_id'] === null ? null : (int)$row['parent_id']];
}

function variant_response(array $row): array
{
    $stock = (int)$row['stock'];
    $threshold = (int)$row['low_stock_threshold'];
    return ['id' => (int)$row['id'], 'format' => $row['format'], 'price' => (int)$row['price'],
        'stock' => $stock, 'lowStockThreshold' => $threshold,
        'stockStatus' => $stock === 0 ? 'OUT_OF_STOCK' : ($stock <= $threshold ? 'LOW_STOCK' : 'IN_STOCK')];
}

function product_response(array $row, bool $shop = false): array
{
    global $config;
    $query = db()->prepare('SELECT * FROM product_variants WHERE product_id=? ORDER BY price ASC,id ASC');
    $query->execute([(int)$row['id']]);
    $variantsRaw = $query->fetchAll();
    $category = ['id'=>(int)$row['category_id'], 'name'=>$row['category_name'], 'slug'=>$row['category_slug'],
        'parentId'=>$row['category_parent_id'] === null ? null : (int)$row['category_parent_id']];
    $image = $row['image_url'];
    if ($image && !preg_match('#^https?://#i', $image)) $image = $config['app_url'] . '/' . ltrim($image, '/');
    $details = json_decode($row['details_json'] ?? '{}', true) ?: [];
    $base = ['id'=>(int)$row['id'], 'name'=>$row['name'], 'slug'=>$row['slug'],
        'description'=>$row['description'], 'imageUrl'=>$image, 'category'=>$category,
        'priceFrom'=>$variantsRaw ? min(array_map(fn($v)=>(int)($v['promo_price'] ?: $v['price']), $variantsRaw)) : null,
        'variants'=>array_map('variant_response', $variantsRaw)];
    if (!$shop) return $base;
    $base['legacyId'] = $row['legacy_id'];
    $base['longDescription'] = $row['long_description'];
    $base['gallery'] = array_map(function($item) use ($config) {
        return preg_match('#^https?://#i', $item) ? $item : $config['app_url'].'/'.ltrim($item, '/');
    }, $details['gallery'] ?? []);
    foreach (['badge','popular','ingredients','allergens','nutrition','usage','conservation','similar','rating'] as $key) {
        if (array_key_exists($key, $details)) $base[$key] = $details[$key];
    }
    $base['formats'] = array_map(fn($v) => [
        'id'=>$v['legacy_id'] ?: (string)$v['id'], 'variantId'=>(int)$v['id'], 'label'=>$v['format'],
        'price'=>(int)$v['price'], 'promoPrice'=>$v['promo_price'] === null ? null : (int)$v['promo_price'],
        'stock'=>(int)$v['stock'], 'sku'=>$v['sku'],
    ], $variantsRaw);
    return $base;
}

function product_row(string|int $id): array
{
    $field = ctype_digit((string)$id) ? 'p.id' : (str_contains((string)$id, '-') ? 'p.slug' : 'p.legacy_id');
    $query = db()->prepare("SELECT p.*,c.name category_name,c.slug category_slug,c.parent_id category_parent_id FROM products p JOIN categories c ON c.id=p.category_id WHERE $field=? AND p.active=1");
    $query->execute([$id]);
    $row = $query->fetch();
    if (!$row) fail(404, 'NOT_FOUND', 'Produit introuvable.');
    return $row;
}

function list_products(): never
{
    $where = ['p.active=1']; $bind = [];
    if ($q = trim((string)($_GET['q'] ?? $_GET['search'] ?? ''))) { $where[]='(p.name LIKE ? OR p.description LIKE ?)'; $bind[]="%$q%"; $bind[]="%$q%"; }
    if ($id = filter_input(INPUT_GET, 'categoryId', FILTER_VALIDATE_INT)) { $where[]='p.category_id=?'; $bind[]=$id; }
    if ($format = trim((string)($_GET['format'] ?? ''))) { $where[]='EXISTS(SELECT 1 FROM product_variants vf WHERE vf.product_id=p.id AND vf.format=?)'; $bind[]=$format; }
    if (isset($_GET['inStock']) && filter_var($_GET['inStock'], FILTER_VALIDATE_BOOLEAN)) $where[]='EXISTS(SELECT 1 FROM product_variants vs WHERE vs.product_id=p.id AND vs.stock>0)';
    if (isset($_GET['lowStock']) && filter_var($_GET['lowStock'], FILTER_VALIDATE_BOOLEAN)) $where[]='EXISTS(SELECT 1 FROM product_variants vl WHERE vl.product_id=p.id AND vl.stock<=vl.low_stock_threshold)';
    $sqlWhere = implode(' AND ', $where);
    $count = db()->prepare("SELECT COUNT(*) FROM products p WHERE $sqlWhere"); $count->execute($bind); $total=(int)$count->fetchColumn();
    $page=max(0,(int)($_GET['page']??0)); $size=min(200,max(1,(int)($_GET['size']??$_GET['perPage']??20))); $offset=$page*$size;
    $sort = $_GET['sort'] ?? 'id,desc';
    $order = $sort==='priceFrom,asc' ? 'price_from ASC' : ($sort==='priceFrom,desc' ? 'price_from DESC' : 'p.id DESC');
    $sql="SELECT p.*,c.name category_name,c.slug category_slug,c.parent_id category_parent_id,(SELECT MIN(COALESCE(v.promo_price,v.price)) FROM product_variants v WHERE v.product_id=p.id) price_from FROM products p JOIN categories c ON c.id=p.category_id WHERE $sqlWhere ORDER BY $order LIMIT $size OFFSET $offset";
    $query=db()->prepare($sql); $query->execute($bind);
    $items=array_map(fn($row)=>product_response($row, true),$query->fetchAll());
    respond(page_response($items,$page,$size,$total));
}

