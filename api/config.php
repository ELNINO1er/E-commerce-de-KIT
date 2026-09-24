<?php
declare(strict_types=1);

/**
 * Configuration sans dependance externe, compatible avec l'hebergement Hostinger.
 * Les secrets sont lus depuis api/.env (jamais versionne).
 */
function load_env(string $file): array
{
    if (!is_file($file)) {
        return [];
    }
    $values = [];
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $values[$key] = trim($value, "\"'");
    }
    return $values;
}

$env = load_env(__DIR__ . '/.env');
function env_value(string $key, ?string $default = null): ?string
{
    global $env;
    $serverValue = $_SERVER[$key] ?? getenv($key);
    return ($serverValue !== false && $serverValue !== null) ? (string) $serverValue : ($env[$key] ?? $default);
}

return [
    'app_env' => env_value('APP_ENV', 'production'),
    'app_url' => rtrim((string) env_value('APP_URL', 'http://localhost/kic-main'), '/'),
    'app_key' => (string) env_value('APP_KEY', ''),
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env_value('ALLOWED_ORIGINS', 'http://localhost'))))),
    'db' => [
        'host' => env_value('DB_HOST', 'localhost'),
        'port' => env_value('DB_PORT', '3306'),
        'name' => env_value('DB_NAME', 'kic'),
        'user' => env_value('DB_USER', 'root'),
        'password' => env_value('DB_PASSWORD', ''),
    ],
];
