<?php
declare(strict_types=1);

$config = require dirname(__DIR__) . '/config.php';

final class ApiException extends RuntimeException
{
    public function __construct(public int $status, public string $errorCode, string $message, public array $errors = [])
    {
        parent::__construct($message);
    }
}

function db(): PDO
{
    global $config;
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $db = $config['db'];
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $db['host'], $db['port'], $db['name']);
    $pdo = new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_body(): array
{
    if((int)($_SERVER['CONTENT_LENGTH']??0)>65536)fail(413,'PAYLOAD_TOO_LARGE','Requete trop volumineuse.');
    $raw = file_get_contents('php://input', false, null, 0, 65537);
    if(strlen((string)$raw)>65536)fail(413,'PAYLOAD_TOO_LARGE','Requete trop volumineuse.');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new ApiException(400, 'INVALID_JSON', 'Le contenu JSON est invalide.');
    }
    return $data;
}

function respond(mixed $data = null, int $status = 200): never
{
    http_response_code($status);
    if ($status !== 204) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    exit;
}

function fail(int $status, string $code, string $message, array $errors = []): never
{
    throw new ApiException($status, $code, $message, $errors);
}

function require_fields(array $body, array $fields): void
{
    $errors = [];
    foreach ($fields as $field) {
        if (!isset($body[$field]) || !is_scalar($body[$field]) || (is_string($body[$field]) && trim($body[$field]) === '')) {
            $errors[$field] = ['Ce champ est obligatoire.'];
        }
    }
    if ($errors) {
        fail(422, 'VALIDATION_ERROR', 'Les donnees envoyees sont invalides.', $errors);
    }
}

function base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode(string $value): string|false
{
    return base64_decode(strtr($value, '-_', '+/'));
}

function issue_access_token(array $user, int $ttl = 900): string
{
    global $config;
    if (strlen($config['app_key']) < 32) {
        fail(503, 'CONFIGURATION_ERROR', 'APP_KEY doit contenir au moins 32 caracteres.');
    }
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode([
        'sub' => (int) $user['id'], 'role' => $user['role'],
        'iat' => time(), 'exp' => time() + $ttl,
    ]));
    $signature = base64url_encode(hash_hmac('sha256', "$header.$payload", $config['app_key'], true));
    return "$header.$payload.$signature";
}

function token_payload(string $token): ?array
{
    global $config;
    if(strlen($config['app_key'])<32)return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $signature] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$payload", $config['app_key'], true));
    if (!hash_equals($expected, $signature)) return null;
    $decoded = json_decode((string) base64url_decode($payload), true);
    return is_array($decoded) && ($decoded['exp'] ?? 0) >= time() ? $decoded : null;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    return preg_match('/^Bearer\s+(.+)$/i', $header, $match) ? trim($match[1]) : null;
}

function current_user(bool $required = true, ?string $role = null): ?array
{
    $payload = ($token = bearer_token()) ? token_payload($token) : null;
    if (!$payload) {
        if ($required) fail(401, 'UNAUTHORIZED', 'Votre session est absente ou expiree.');
        return null;
    }
    $statement = db()->prepare('SELECT id,email,first_name,last_name,phone,role,enabled FROM users WHERE id=?');
    $statement->execute([(int) $payload['sub']]);
    $user = $statement->fetch();
    if (!$user || !(bool) $user['enabled']) fail(401, 'UNAUTHORIZED', 'Ce compte est indisponible.');
    if ($role !== null && $user['role'] !== $role) fail(403, 'FORBIDDEN', 'Cette action est reservee aux administrateurs.');
    return $user;
}

function user_response(array $user): array
{
    return [
        'id' => (int) $user['id'], 'email' => $user['email'],
        'firstName' => $user['first_name'], 'lastName' => $user['last_name'],
        'phone' => $user['phone'], 'role' => $user['role'], 'enabled' => (bool) $user['enabled'],
    ];
}

function page_response(array $content, int $page, int $size, int $total): array
{
    $pages = $size > 0 ? (int) ceil($total / $size) : 0;
    return ['content' => $content, 'page' => $page, 'size' => $size, 'totalElements' => $total,
        'totalPages' => $pages, 'first' => $page === 0, 'last' => $pages === 0 || $page >= $pages - 1];
}

function slugify(string $value): string
{
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    return trim(strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $ascii) ?? $ascii), '-');
}

function request_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');
    if ($scriptDir !== '' && str_starts_with($path, $scriptDir)) $path = substr($path, strlen($scriptDir));
    return '/' . trim($path, '/');
}

function route_matches(string $pattern, string $path, array &$params = []): bool
{
    $names = [];
    $regex = preg_replace_callback('/\{([a-zA-Z][a-zA-Z0-9_]*)\}/', function ($m) use (&$names) {
        $names[] = $m[1]; return '([^/]+)';
    }, $pattern);
    if (!preg_match('#^' . $regex . '$#', $path, $matches)) return false;
    array_shift($matches);
    $params = array_combine($names, array_map('urldecode', $matches)) ?: [];
    return true;
}

function cors(): void
{
    global $config;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin && in_array($origin, $config['allowed_origins'], true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Cart-Token, X-Order-Token, Idempotency-Key');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Expose-Headers: Content-Disposition, X-Cart-Token');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') respond(null, 204);
}

set_exception_handler(function (Throwable $error): void {
    if ($error instanceof ApiException) {
        respond(['code' => $error->errorCode, 'message' => $error->getMessage(), 'errors' => $error->errors], $error->status);
    }
    error_log((string) $error);
    respond(['code' => 'INTERNAL_ERROR', 'message' => 'Une erreur interne est survenue.'], 500);
});

require __DIR__.'/security.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
cors();
