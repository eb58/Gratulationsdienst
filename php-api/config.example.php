<?php
$env = static fn (string $key, string $default = '') => ($value = getenv($key)) !== false ? $value : $default;

return [
    'dsn' => $env('GD_DB_DSN', 'mysql:host=db;port=3306;dbname=wordpress;charset=utf8mb4'),
    'user' => $env('GD_DB_USER', 'wp_user'),
    'password' => $env('GD_DB_PASSWORD', 'passwd'),
    'connect_timeout' => 5,
    'options' => [],
    'app_url' => $env('GD_APP_URL', 'http://localhost:5173/gratulationsdienst/'),
    'mail_from' => $env('GD_MAIL_FROM', 'noreply@example.test'),
    'mail_from_name' => $env('GD_MAIL_FROM_NAME', 'Gratulationsdienst Reinickendorf'),
];
