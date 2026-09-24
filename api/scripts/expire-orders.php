<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
require dirname(__DIR__).'/src/security.php';
require dirname(__DIR__).'/src/commerce.php';
// Annule les demandes professionnelles non confirmées depuis plus de 7 jours.
$query=db()->query("SELECT * FROM orders WHERE status='PENDING' AND created_at<DATE_SUB(NOW(),INTERVAL 7 DAY) ORDER BY id LIMIT 100");
$count=0;foreach($query->fetchAll() as $order){admin_change_order_status($order,'CANCELLED');$count++;}
echo $count." commande(s) expirée(s).\n";
