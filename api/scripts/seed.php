<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
require dirname(__DIR__).'/src/seed.php';
if (PHP_SAPI !== 'cli') fail(403,'FORBIDDEN','Execution en ligne de commande uniquement.');
$result=seed_catalogue();
echo "Catalogue et zones importes ({$result['products']} produits, {$result['deliveryZones']} zones).\n";
