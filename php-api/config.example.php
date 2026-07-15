<?php
$env = static function (string $key, string $default = ''): string {
    $value = getenv($key);
    if ($value !== false && $value !== '') return $value;

    $file = getenv($key . '_FILE');
    if ($file !== false && is_readable($file)) return trim((string)file_get_contents($file));

    return $default;
};

return [
    'dsn' => $env('GD_DB_DSN', 'mysql:host=db;port=3306;dbname=gratulationsdienst;charset=utf8mb4'),
    'user' => $env('GD_DB_USER', 'wp_user'),
    'password' => $env('GD_DB_PASSWORD'),
    'connect_timeout' => 5,
    'options' => [],
    'app_url' => $env('GD_APP_URL', 'http://localhost:5173/gratulationsdienst/'),
    'mail_from' => $env('GD_MAIL_FROM', 'noreply@example.test'),
    'mail_from_name' => $env('GD_MAIL_FROM_NAME', 'Gratulationsdienst Reinickendorf'),
];
