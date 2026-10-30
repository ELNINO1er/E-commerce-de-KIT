<?php
declare(strict_types=1);

function return_response(array $row): array {
    return ['id'=>(int)$row['id'],'orderNumber'=>$row['order_number'],'type'=>$row['type'],'status'=>$row['status'],'reason'=>$row['reason'],'createdAt'=>date(DATE_ATOM,strtotime($row['created_at']))];
}
function load_return(int $id): array { $q=db()->prepare('SELECT r.*,o.order_number FROM returns r JOIN orders o ON o.id=r.order_id WHERE r.id=?');$q->execute([$id]);$r=$q->fetch();if(!$r)fail(404,'NOT_FOUND','Demande introuvable.');return $r; }
function load_discount(int $id): array { $q=db()->prepare('SELECT * FROM discount_codes WHERE id=?');$q->execute([$id]);$r=$q->fetch();if(!$r)fail(404,'NOT_FOUND','Code promotionnel introuvable.');return $r; }
function load_zone(int $id): array { $q=db()->prepare('SELECT * FROM delivery_zones WHERE id=?');$q->execute([$id]);$r=$q->fetch();if(!$r)fail(404,'NOT_FOUND','Zone de livraison introuvable.');return $r; }
function save_discount(?int $id=null): never { $b=json_body();require_fields($b,['code','type','value']);if(!in_array($b['type'],['PERCENTAGE','FIXED_AMOUNT'],true))fail(422,'VALIDATION_ERROR','Type de remise invalide.');if(filter_var($b['value'],FILTER_VALIDATE_INT)===false||(int)$b['value']<0||($b['type']==='PERCENTAGE'&&(int)$b['value']>100))fail(422,'VALIDATION_ERROR','Remise invalide.');$values=[strtoupper(trim($b['code'])),$b['type'],(int)$b['value'],array_key_exists('active',$b)?(int)(bool)$b['active']:1,$b['validFrom']??null,$b['validUntil']??null,$b['minOrderAmount']??null,$b['maxUses']??null];if($id){$values[]=$id;db()->prepare('UPDATE discount_codes SET code=?,type=?,value=?,active=?,valid_from=?,valid_until=?,min_order_amount=?,max_uses=? WHERE id=?')->execute($values);}else{db()->prepare('INSERT INTO discount_codes(code,type,value,active,valid_from,valid_until,min_order_amount,max_uses) VALUES(?,?,?,?,?,?,?,?)')->execute($values);$id=(int)db()->lastInsertId();}respond(discount_response(load_discount($id)),$id?200:201); }
function save_zone(?int $id=null): never {
    $b=json_body();require_fields($b,['name','city','fee','estimatedDaysMin','estimatedDaysMax','scope']);
    foreach(['fee','estimatedDaysMin','estimatedDaysMax'] as $field)if(filter_var($b[$field],FILTER_VALIDATE_INT)===false||(int)$b[$field]<0)fail(422,'VALIDATION_ERROR','Valeur invalide : '.$field);
    if((int)$b['estimatedDaysMax']<(int)$b['estimatedDaysMin']||!in_array($b['scope'],['FR_MAINLAND','FR_CORSE','EU','PICKUP','MANUAL'],true))fail(422,'VALIDATION_ERROR','Périmètre ou délais invalides.');
    if($b['scope']==='PICKUP'&&(int)$b['fee']!==0)fail(422,'VALIDATION_ERROR','Le retrait à Nice doit être gratuit.');
    $values=[$b['name'],$b['city'],(int)$b['fee'],(int)$b['estimatedDaysMin'],(int)$b['estimatedDaysMax'],(int)($b['active']??true),$b['scope']];
    if($id){$values[]=$id;db()->prepare('UPDATE delivery_zones SET name=?,city=?,fee=?,estimated_days_min=?,estimated_days_max=?,active=?,scope=? WHERE id=?')->execute($values);}
    else{array_unshift($values,slugify($b['name']).'-'.bin2hex(random_bytes(3)));db()->prepare('INSERT INTO delivery_zones(code,name,city,fee,estimated_days_min,estimated_days_max,active,scope) VALUES(?,?,?,?,?,?,?,?)')->execute($values);$id=(int)db()->lastInsertId();}
    respond(delivery_zone_response(load_zone($id)));
}

function change_user_role(int $id,array $admin): never {
    $b=json_body();if(!in_array($b['role']??'',['USER','ADMIN'],true))fail(422,'VALIDATION_ERROR','Rôle invalide.');
    if($id===(int)$admin['id'])fail(409,'SELF_MODIFICATION','Vous ne pouvez pas modifier votre propre rôle.');
    $pdo=db();$pdo->beginTransaction();
    try{
        $admins=$pdo->query("SELECT id FROM users WHERE role='ADMIN' AND enabled=1 ORDER BY id FOR UPDATE")->fetchAll(PDO::FETCH_COLUMN);
        if($b['role']==='USER'&&count($admins)<=1&&in_array($id,array_map('intval',$admins),true))fail(409,'LAST_ADMIN','Le dernier administrateur actif doit être conservé.');
        $q=$pdo->prepare('SELECT id FROM users WHERE id=? FOR UPDATE');$q->execute([$id]);if(!$q->fetchColumn())fail(404,'NOT_FOUND','Compte introuvable.');
        $pdo->prepare('UPDATE users SET role=? WHERE id=?')->execute([$b['role'],$id]);$pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    $q=$pdo->prepare('SELECT id,email,first_name,last_name,phone,role,enabled FROM users WHERE id=?');$q->execute([$id]);respond(user_response($q->fetch()));
}

function handle_extra_admin_routes(string $method,string $path,array &$params,array $admin): bool {
 if($method==='GET'&&$path==='/admin/discount-codes'){respond(array_map('discount_response',db()->query('SELECT * FROM discount_codes ORDER BY id DESC')->fetchAll()));}
 if($method==='POST'&&$path==='/admin/discount-codes')save_discount();
 if($method==='PUT'&&route_matches('/admin/discount-codes/{id}',$path,$params))save_discount((int)$params['id']);
 if($method==='DELETE'&&route_matches('/admin/discount-codes/{id}',$path,$params)){db()->prepare('DELETE FROM discount_codes WHERE id=?')->execute([(int)$params['id']]);audit_admin($admin,204);respond(null,204);}
 if($method==='GET'&&$path==='/admin/delivery-zones'){respond(array_map('delivery_zone_response',db()->query('SELECT * FROM delivery_zones ORDER BY id DESC')->fetchAll()));}
 if($method==='POST'&&$path==='/admin/delivery-zones')save_zone();
 if($method==='PUT'&&route_matches('/admin/delivery-zones/{id}',$path,$params))save_zone((int)$params['id']);
 if($method==='DELETE'&&route_matches('/admin/delivery-zones/{id}',$path,$params)){db()->prepare('UPDATE delivery_zones SET active=0 WHERE id=?')->execute([(int)$params['id']]);audit_admin($admin,204);respond(null,204);}
 if($method==='GET'&&$path==='/admin/returns'){$where='1=1';$bind=[];if($s=$_GET['status']??null){$where='r.status=?';$bind[]=$s;}$page=max(0,(int)($_GET['page']??0));$size=min(100,max(1,(int)($_GET['size']??20)));$c=db()->prepare("SELECT COUNT(*) FROM returns r WHERE $where");$c->execute($bind);$q=db()->prepare("SELECT r.*,o.order_number FROM returns r JOIN orders o ON o.id=r.order_id WHERE $where ORDER BY r.id DESC LIMIT $size OFFSET ".($page*$size));$q->execute($bind);respond(page_response(array_map('return_response',$q->fetchAll()),$page,$size,(int)$c->fetchColumn()));}
 if($method==='PUT'&&route_matches('/admin/returns/{id}/status',$path,$params)){$b=json_body();require_fields($b,['status']);if(!in_array($b['status'],['PENDING','APPROVED','REJECTED','COMPLETED'],true))fail(422,'VALIDATION_ERROR','Statut invalide.');$r=load_return((int)$params['id']);
 if($r['type']==='REFUND'&&$b['status']==='COMPLETED'){
    $q=db()->prepare('SELECT o.total,COALESCE(MAX(p.refunded_amount),0) refunded FROM orders o LEFT JOIN payments p ON p.order_id=o.id WHERE o.id=? GROUP BY o.id,o.total');$q->execute([$r['order_id']]);$refund=$q->fetch();
    if(!$refund||(int)$refund['refunded']<(int)$refund['total'])fail(409,'REFUND_NOT_CONFIRMED','Le remboursement intégral doit être confirmé par Stripe avant de clôturer cette demande.');
 }
 db()->prepare('UPDATE returns SET status=? WHERE id=?')->execute([$b['status'],(int)$params['id']]);audit_admin($admin);respond(return_response(load_return((int)$params['id'])));}
 if($method==='POST'&&$path==='/admin/uploads/image'){$file=$_FILES['file']??null;if(!$file||$file['error']!==UPLOAD_ERR_OK)fail(400,'INVALID_REQUEST','Image manquante.');if($file['size']>5*1024*1024)fail(413,'FILE_TOO_LARGE','Image trop volumineuse.');$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime]??null;if(!$ext)fail(422,'INVALID_FILE','Format JPEG, PNG ou WEBP requis.');$dir=dirname(__DIR__).'/uploads';if(!is_dir($dir))mkdir($dir,0755,true);$name=bin2hex(random_bytes(16)).'.'.$ext;if(!move_uploaded_file($file['tmp_name'],$dir.'/'.$name))fail(500,'UPLOAD_FAILED','Téléversement impossible.');global $config;respond(['url'=>$config['app_url'].'/api/uploads/'.$name,'filename'=>$name,'contentType'=>$mime,'size'=>(int)$file['size']],201);}
 return false;
}
