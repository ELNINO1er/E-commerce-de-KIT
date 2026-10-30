<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/src/bootstrap.php';
$apply=in_array('--apply',$argv,true);
if($apply&&$config['app_env']==='production'&&!in_array('--allow-production',$argv,true)){fwrite(STDERR,"Sauvegardez la base puis ajoutez --allow-production pour une migration de production.\n");exit(1);}
$pdo=db();
$columns=[
 'orders'=>[
  'checkout_key'=>'CHAR(64) NULL UNIQUE','request_hash'=>'CHAR(64) NULL',
  'order_mode'=>"ENUM('REQUEST','PAYMENT') NOT NULL DEFAULT 'PAYMENT'",
  'payment_environment'=>"ENUM('sandbox','live','legacy') NOT NULL DEFAULT 'legacy'",
  'reservation_status'=>"ENUM('NONE','HELD','RELEASED','CONSUMED') NOT NULL DEFAULT 'HELD'",
  'expires_at'=>'DATETIME NULL','postal_code'=>"VARCHAR(20) NOT NULL DEFAULT ''",'tax_mode'=>"VARCHAR(20) NOT NULL DEFAULT 'UNCONFIRMED'",'discount_reserved'=>'TINYINT(1) NOT NULL DEFAULT 0',
 ],
 'payments'=>['attempt_key'=>'CHAR(32) NULL UNIQUE','checkout_expires_at'=>'DATETIME NULL','reconciliation_required'=>'TINYINT(1) NOT NULL DEFAULT 0','refunded_amount'=>'INT UNSIGNED NOT NULL DEFAULT 0'],
 'delivery_zones'=>['scope'=>"VARCHAR(20) NOT NULL DEFAULT 'MANUAL'"],
];
if($apply)$pdo->exec(file_get_contents(dirname(__DIR__).'/schema.sql'));
$missing=[];$added=[];
foreach($columns as $table=>$fields){
    $check=$pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');$check->execute([$table]);$present=$check->fetchAll(PDO::FETCH_COLUMN);
    foreach($fields as $field=>$definition)if(!in_array($field,$present,true)){
        $missing[]="$table.$field";
        if($apply){$pdo->exec("ALTER TABLE `$table` ADD COLUMN `$field` $definition");$added[]="$table.$field";}
    }
}
foreach(['contact_requests','payment_events','payments'] as $table){$q=$pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');$q->execute([$table]);if(!$q->fetchColumn())$missing[]=$table;}
if($apply){
    $type=$pdo->query("SHOW COLUMNS FROM payments LIKE 'status'")->fetch();
    if(!str_contains($type['Type'],'REFUNDED'))$pdo->exec("ALTER TABLE payments MODIFY COLUMN status ENUM('PENDING','SUCCESS','FAILED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED') NOT NULL DEFAULT 'PENDING'");
    if(in_array('orders.reservation_status',$added,true)){
        $pdo->exec("UPDATE orders SET reservation_status='CONSUMED' WHERE status IN ('PAID','SHIPPED','DELIVERED')");
        $pdo->exec("UPDATE orders SET reservation_status='RELEASED' WHERE status='CANCELLED'");
        $pdo->exec("UPDATE orders SET expires_at=DATE_ADD(created_at,INTERVAL 1 HOUR),discount_reserved=IF(discount_code IS NULL,0,1) WHERE status='PENDING'");
    }
    if(in_array('delivery_zones.scope',$added,true))$pdo->exec("UPDATE delivery_zones SET scope=CASE code WHEN 'france-metropolitaine' THEN 'FR_MAINLAND' WHEN 'corse' THEN 'FR_CORSE' WHEN 'europe' THEN 'EU' WHEN 'retrait-nice' THEN 'PICKUP' ELSE 'MANUAL' END");
}
echo json_encode(['applied'=>$apply,'missingBefore'=>$missing,'added'=>$added],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE),"\n";
if(!$apply&&$missing)exit(2);
