<?php
declare(strict_types=1);

function new_refresh_token(int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $query = db()->prepare('INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 30 DAY))');
    $query->execute([$userId, hash('sha256',$token)]);
    return $token;
}

function session_response(array $user): array
{
    $refresh=new_refresh_token((int)$user['id']);
    setcookie('kic_refresh',$refresh,session_cookie_options(time()+2592000));
    return ['accessToken'=>issue_access_token($user),'refreshToken'=>'cookie',
        'tokenType'=>'Bearer','expiresIn'=>900,'user'=>user_response($user)];
}

function login(): never
{
    security_rate_limit('login', 15, 300);
    require_session_origin();
    $body=json_body(); require_fields($body,['email','password']);
    $query=db()->prepare('SELECT * FROM users WHERE email=?'); $query->execute([strtolower(trim($body['email']))]); $user=$query->fetch();
    if (!$user || !password_verify((string)$body['password'],$user['password_hash'])) fail(401,'INVALID_CREDENTIALS','Adresse e-mail ou mot de passe incorrect.');
    if (!(bool)$user['enabled']) fail(403,'ACCOUNT_DISABLED','Ce compte a ete desactive.');
    respond(session_response($user));
}

function register_user(): never
{
    security_rate_limit('register', 5, 300);
    $body=json_body(); require_fields($body,['email','password','firstName','lastName']);
    $email=strtolower(trim($body['email']));
    if (!filter_var($email,FILTER_VALIDATE_EMAIL)) fail(422,'VALIDATION_ERROR','Adresse e-mail invalide.',['email'=>['Adresse e-mail invalide.']]);
    if (strlen((string)$body['password'])<8) fail(422,'VALIDATION_ERROR','Le mot de passe doit contenir au moins 8 caracteres.',['password'=>['8 caracteres minimum.']]);
    try {
        $query=db()->prepare("INSERT INTO users(email,password_hash,first_name,last_name,phone,role) VALUES(?,?,?,?,?,'USER')");
        $query->execute([$email,password_hash((string)$body['password'],PASSWORD_DEFAULT),trim($body['firstName']),trim($body['lastName']),$body['phone']??null]);
    } catch (PDOException $e) { if ((int)$e->errorInfo[1]===1062) fail(409,'EMAIL_EXISTS','Cette adresse e-mail est deja utilisee.'); throw $e; }
    $query=db()->prepare('SELECT * FROM users WHERE id=?'); $query->execute([(int)db()->lastInsertId()]);
    respond(session_response($query->fetch()),201);
}

function refresh_session(): never
{
    require_session_origin();
    $body=json_body(); $refresh=(string)($_COOKIE['kic_refresh']??'');if(!$refresh)fail(401,'INVALID_REFRESH_TOKEN','Session absente.');$hash=hash('sha256',$refresh);
    $query=db()->prepare('SELECT u.*,rt.id token_id FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id WHERE rt.token_hash=? AND rt.revoked_at IS NULL AND rt.expires_at>NOW()');
    $query->execute([$hash]); $user=$query->fetch();
    if (!$user || !(bool)$user['enabled']) fail(401,'INVALID_REFRESH_TOKEN','La session ne peut pas etre renouvelee.');
    $revoke=db()->prepare('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=? AND revoked_at IS NULL');$revoke->execute([$user['token_id']]);
    if(!$revoke->rowCount())fail(401,'INVALID_REFRESH_TOKEN','Session deja renouvelee.');
    respond(session_response($user));
}
