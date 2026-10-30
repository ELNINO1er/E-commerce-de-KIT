<?php
declare(strict_types=1);

function contact_request_data(array $body,string $key): array {
    if(!preg_match('/^[a-f0-9]{32,64}$/',$key))fail(422,'IDEMPOTENCY_REQUIRED','Identifiant de demande manquant.');
    if(!empty($body['website']))fail(422,'INVALID_REQUEST','Demande non acceptée.');
    if(($body['consent']??false)!==true)fail(422,'CONSENT_REQUIRED','Votre accord est nécessaire pour traiter cette demande.');
    $data=[];
    foreach(['name'=>190,'email'=>190,'phone'=>40,'company'=>190,'subject'=>120,'product'=>190,'message'=>8000] as $field=>$max){
        if(isset($body[$field])&&!is_string($body[$field]))fail(422,'VALIDATION_ERROR','Champ invalide : '.$field);
        $data[$field]=trim($body[$field]??'');
        if(strlen($data[$field])>$max)fail(422,'VALIDATION_ERROR','Champ trop long : '.$field);
    }
    foreach(['name','email','subject','message'] as $field)if($data[$field]==='')fail(422,'VALIDATION_ERROR','Champ obligatoire : '.$field);
    if(!filter_var($data['email'],FILTER_VALIDATE_EMAIL))fail(422,'VALIDATION_ERROR','Adresse e-mail invalide.');
    $q=db()->prepare('SELECT * FROM contact_requests WHERE request_key=?');$q->execute([hash('sha256',$key)]);
    if($old=$q->fetch()){
        foreach($data as $field=>$value)if($old[$field]!==$value)fail(409,'IDEMPOTENCY_CONFLICT','Une demande différente utilise déjà cet identifiant.');
        return ['recorded'=>true,'reference'=>'KIC-MSG-'.$old['id']];
    }
    db()->prepare('INSERT INTO contact_requests(request_key,name,email,phone,company,subject,product,message) VALUES(?,?,?,?,?,?,?,?)')->execute([hash('sha256',$key),...array_values($data)]);
    $id=(int)db()->lastInsertId();
    global $config;
    $to=trim($config['contact_notification_email']??'');
    if(filter_var($to,FILTER_VALIDATE_EMAIL)){
        $sent=@mail($to,'Nouvelle demande KIC-MSG-'.$id,'Une demande client est disponible dans le back-office KIC, rubrique Demandes. Référence : KIC-MSG-'.$id,"From: KIC <no-reply@kic-fr.com>\r\nContent-Type: text/plain; charset=UTF-8");
        if(!$sent)error_log('KIC : notification contact non envoyée, demande conservée '.$id);
    }
    return ['recorded'=>true,'reference'=>'KIC-MSG-'.$id];
}
function save_contact_request(): never {
    security_rate_limit('contact',5,300);respond(contact_request_data(json_body(),(string)($_SERVER['HTTP_IDEMPOTENCY_KEY']??'')),201);
}

function csv_safe(string $value): string {return preg_match('/^[\s]*[=+@\-\t\r]/u',$value)?"'".$value:$value;}
function export_orders_csv(): never {
    $where='1=1';$bind=[];
    if($status=$_GET['status']??null){$where.=' AND status=?';$bind[]=$status;}
    if($term=trim($_GET['q']??'')){$where.=' AND (order_number LIKE ? OR recipient_name LIKE ? OR contact_email LIKE ?)';array_push($bind,"%$term%","%$term%","%$term%");}
    $q=db()->prepare('SELECT order_number,order_mode,payment_environment,status,recipient_name,contact_email,total,currency,created_at FROM orders WHERE '.$where.' ORDER BY id DESC LIMIT 10000');$q->execute($bind);
    header('Content-Type: text/csv; charset=UTF-8');header('Content-Disposition: attachment; filename="commandes-kic.csv"');
    $out=fopen('php://output','wb');fwrite($out,"\xEF\xBB\xBF");
    fputcsv($out,['Commande','Type','Environnement','Statut','Client','E-mail','Total EUR','Devise','Création'],';','"','');
    while($row=$q->fetch(PDO::FETCH_NUM)){$row[6]=number_format((int)$row[6]/100,2,',','');fputcsv($out,array_map(fn($v)=>csv_safe((string)$v),$row),';','"','');}
    fclose($out);exit;
}

function summary_pdf(array $order): string {
    $r=order_response($order);
    $lines=['KIC - Konan Industrie et Chocolaterie','RECAPITULATIF - NE CONSTITUE PAS UNE FACTURE',
        'Commande : '.$r['orderNumber'],'Environnement : '.strtoupper($r['paymentEnvironment']),
        'Statut : '.$r['status'],'Date : '.$r['createdAt'],'Client : '.$r['recipientName'],
        'E-mail : '.$r['contactEmail'],'Adresse : '.$r['addressLine'].' '.$r['postalCode'].' '.$r['city'].' '.$r['country'],''];
    foreach($r['items'] as $i)$lines[]=$i['quantity'].' x '.$i['productName'].' - '.$i['format'].' : '.number_format($i['lineTotal']/100,2,',',' ').' EUR';
    array_push($lines,'','Sous-total : '.number_format($r['subtotal']/100,2,',',' ').' EUR','Livraison : '.number_format($r['deliveryFee']/100,2,',',' ').' EUR','Remise : '.number_format($r['discountAmount']/100,2,',',' ').' EUR','Total : '.number_format($r['total']/100,2,',',' ').' EUR','Qualification fiscale : '.$r['taxMode'],'','Un paiement de test ne correspond a aucun encaissement reel.','Contact : service@kic-fr.com - +33 7 45 90 87 78');
    $wrapped=[];foreach($lines as $line){$line=iconv('UTF-8','Windows-1252//TRANSLIT',$line)?:'';foreach(explode("\n",wordwrap($line,88,"\n",true)) as $part)$wrapped[]=$part;}
    $pages=array_chunk($wrapped,46);$objects=[1=>'<< /Type /Catalog /Pages 2 0 R >>',3=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];$kids=[];
    foreach($pages as $n=>$page){$pageId=4+$n*2;$streamId=$pageId+1;$kids[]="$pageId 0 R";$stream="BT /F1 10 Tf 44 795 Td 15 TL\n";
        foreach($page as $line){$safe=str_replace(['\\','(',')',"\r"],['\\\\','\\(','\\)',''],$line);$stream.="($safe) Tj T*\n";}$stream.='ET';
        $objects[$pageId]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents $streamId 0 R >>";
        $objects[$streamId]='<< /Length '.strlen($stream)." >>\nstream\n".$stream."\nendstream";
    }
    $objects[2]='<< /Type /Pages /Count '.count($kids).' /Kids ['.implode(' ',$kids).'] >>';ksort($objects);$pdf="%PDF-1.4\n";$offsets=[0];
    foreach($objects as $id=>$object){$offsets[$id]=strlen($pdf);$pdf.="$id 0 obj\n$object\nendobj\n";}
    $xref=strlen($pdf);$count=count($objects)+1;$pdf.="xref\n0 $count\n0000000000 65535 f \n";
    for($i=1;$i<$count;$i++)$pdf.=sprintf("%010d 00000 n \n",$offsets[$i]);
    return $pdf."trailer\n<< /Size $count /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
}

function handle_customer_admin_routes(string $method,string $path,array &$params,array $admin): void {
    if($method==='GET'&&$path==='/admin/orders/export')export_orders_csv();
    if($method==='GET'&&route_matches('/admin/orders/{number}/invoice',$path,$params)){
        $order=find_order($params['number'],true);header('Content-Type: application/pdf');header('Content-Disposition: attachment; filename="recapitulatif-'.$order['order_number'].'.pdf"');echo summary_pdf($order);exit;
    }
    if($method==='GET'&&$path==='/admin/contact-requests'){
        $page=max(0,(int)($_GET['page']??0));$size=min(100,max(1,(int)($_GET['size']??20)));$where='1=1';$bind=[];
        if($status=$_GET['status']??null){$where.=' AND status=?';$bind[]=$status;}
        $q=db()->prepare('SELECT COUNT(*) FROM contact_requests WHERE '.$where);$q->execute($bind);$total=(int)$q->fetchColumn();
        $q=db()->prepare("SELECT id,name,email,phone,company,subject,product,message,status,created_at FROM contact_requests WHERE $where ORDER BY id DESC LIMIT $size OFFSET ".($page*$size));$q->execute($bind);
        respond(page_response($q->fetchAll(),$page,$size,$total));
    }
    if($method==='PUT'&&route_matches('/admin/contact-requests/{id}/status',$path,$params)){
        $b=json_body();if(!in_array($b['status']??'',['NEW','HANDLED'],true))fail(422,'VALIDATION_ERROR','Statut invalide.');
        db()->prepare('UPDATE contact_requests SET status=? WHERE id=?')->execute([$b['status'],(int)$params['id']]);audit_admin($admin);respond(['updated'=>true]);
    }
    if($method==='GET'&&$path==='/admin/payments/readiness')respond(['mode'=>shop_config()['paymentMode'],'enabled'=>shop_config()['paymentsEnabled'],'checks'=>payment_readiness()]);
    if($method==='GET'&&$path==='/admin/payments/review')respond(db()->query('SELECT o.order_number,p.reference,p.status,p.amount,p.currency,p.refunded_amount FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.reconciliation_required=1 ORDER BY p.id DESC LIMIT 100')->fetchAll());
}
