<?php
declare(strict_types=1);

const COLLECTIONS = ['citizens', 'sokoGroups', 'sokoMembers', 'streets', 'senders', 'templates', 'importLog'];
const ADMIN_COLLECTIONS = ['sokoGroups', 'sokoMembers', 'streets', 'senders', 'templates'];
const SESSION_TTL_SECONDS = 604800;
const MFA_TICKET_TTL_SECONDS = 300;
const PASSWORD_RESET_TTL_SECONDS = 900;
const PASSWORD_RESET_RATE_LIMIT_SECONDS = 3600;
const PASSWORD_RESET_RATE_LIMIT_MAX = 5;
const MFA_ISSUER = 'Gratulationsdienst Reinickendorf';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $db = db();
    initSchema($db);
    migrateLegacyCollections($db);
    dispatch($db);
} catch (Throwable $error) {
    respond(['error' => $error->getMessage()], 500);
}

function collectionConfig(string $collection): array
{
    $configs = [
        'citizens' => [
            'table' => 'gd_citizens',
            'order' => 'last_name, first_name, id',
            'columns' => [
                'id' => ['id', 'string'],
                'salutation' => ['salutation', 'string'],
                'firstName' => ['first_name', 'string'],
                'lastName' => ['last_name', 'string'],
                'street' => ['street', 'string'],
                'houseNo' => ['house_no', 'string'],
                'postalCode' => ['postal_code', 'string'],
                'district' => ['district', 'string'],
                'birthDate' => ['birth_date', 'date'],
                'phone' => ['phone', 'string'],
                'email' => ['email', 'string'],
                'wish' => ['wish', 'string'],
                'notes' => ['notes', 'string'],
                'source' => ['source', 'string'],
                'updatedAt' => ['updated_at_date', 'date'],
                'status' => ['status', 'string'],
                'printedAt' => ['printed_at_date', 'date'],
                'printedAge' => ['printed_age', 'int'],
                'printedYear' => ['printed_year', 'int'],
                'pressPublication' => ['press_publication', 'bool'],
                'weddingAnniversary' => ['wedding_anniversary', 'string'],
                'weddingDate' => ['wedding_date', 'date'],
                'spouseName' => ['spouse_name', 'string'],
            ],
        ],
        'sokoGroups' => [
            'table' => 'gd_soko_groups',
            'order' => 'id',
            'columns' => [
                'id' => ['id', 'string'],
                'name' => ['name', 'string'],
                'region' => ['region', 'string'],
                'leaderId' => ['leader_id', 'string'],
            ],
        ],
        'sokoMembers' => [
            'table' => 'gd_soko_members',
            'order' => 'group_id, last_name, first_name, id',
            'columns' => [
                'id' => ['id', 'string'],
                'salutation' => ['salutation', 'string'],
                'firstName' => ['first_name', 'string'],
                'lastName' => ['last_name', 'string'],
                'groupId' => ['group_id', 'string'],
                'street' => ['street', 'string'],
                'postalCode' => ['postal_code', 'string'],
                'city' => ['city', 'string'],
                'phone' => ['phone', 'string'],
                'mobile' => ['mobile', 'string'],
                'email' => ['email', 'string'],
                'bank' => ['bank', 'string'],
                'allowance' => ['allowance', 'string'],
                'termFrom' => ['term_from', 'date'],
                'termTo' => ['term_to', 'date'],
                'billingAmount' => ['billing_amount', 'string'],
                'isLeader' => ['is_leader', 'bool'],
            ],
        ],
        'streets' => [
            'table' => 'gd_streets',
            'order' => 'name, id',
            'columns' => [
                'id' => ['id', 'string'],
                'name' => ['name', 'string'],
                'district' => ['district', 'string'],
                'rules' => ['rules', 'json'],
                'area' => ['area', 'string'],
                'groupId' => ['group_id', 'string'],
            ],
        ],
        'senders' => [
            'table' => 'gd_senders',
            'order' => 'role, id',
            'columns' => [
                'id' => ['id', 'string'],
                'role' => ['role', 'string'],
                'name' => ['name', 'string'],
                'department' => ['department', 'string'],
                'address' => ['address', 'string'],
                'phone' => ['phone', 'string'],
                'email' => ['email', 'string'],
                'logo' => ['logo', 'string'],
                'signature' => ['signature', 'string'],
                'color' => ['color', 'string'],
            ],
        ],
        'templates' => [
            'table' => 'gd_templates',
            'order' => 'name, id',
            'columns' => [
                'id' => ['id', 'string'],
                'name' => ['name', 'string'],
                'occasion' => ['occasion', 'string'],
                'format' => ['format', 'string'],
                'senderId' => ['sender_id', 'string'],
                'subject' => ['subject', 'string'],
                'body' => ['body', 'string'],
                'updatedAt' => ['updated_at_date', 'date'],
            ],
        ],
        'importLog' => [
            'table' => 'gd_import_log',
            'order' => 'created_at DESC, id DESC',
            'columns' => [
                'id' => ['id', 'string'],
                'time' => ['entry_time', 'string'],
                'name' => ['name', 'string'],
                'address' => ['address', 'string'],
                'birthDate' => ['birth_date', 'date'],
                'age' => ['age', 'int'],
                'groupId' => ['group_id', 'string'],
                'type' => ['entry_type', 'string'],
                'message' => ['message', 'string'],
            ],
        ],
    ];

    if (!isset($configs[$collection])) {
        throw new RuntimeException('Unbekannte Collection.');
    }
    return $configs[$collection];
}

function dispatch(array $db): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '', '/');
    $parts = array_values(array_filter(explode('/', $path), static fn ($part) => $part !== ''));
    $baseIndex = array_search(basename(__DIR__), $parts, true);
    $route = $baseIndex === false ? $parts : array_slice($parts, $baseIndex + 1);
    $route = ($route[0] ?? '') === 'index.php' ? array_slice($route, 1) : $route;

    if (!$route && $method === 'GET') {
        respond(['service' => 'gratulationsdienst-api', 'routes' => routes()]);
    }

    if (($route[0] ?? '') === 'health' && $method === 'GET') {
        respond(['ok' => true, 'driver' => $db['driver'], 'collections' => COLLECTIONS, 'schema' => 'relational']);
    }

    if (($route[0] ?? '') === 'auth') {
        handleAuth($db, $method, array_slice($route, 1));
        return;
    }

    $user = requireAuthenticatedUser($db);

    if (($route[0] ?? '') === 'users') {
        handleUsers($db, $method, array_slice($route, 1), $user);
        return;
    }

    if (($route[0] ?? '') === 'data') {
        handleData($db, $method, $user);
        return;
    }

    $collection = $route[0] ?? '';
    $id = $route[1] ?? null;
    if (!in_array($collection, COLLECTIONS, true)) {
        respond(['error' => 'Unbekannte Route.'], 404);
    }

    handleCollection($db, $method, $collection, $id, $user);
}

function handleData(array $db, string $method, array $user): void
{
    if ($method === 'GET') {
        respond(readAll($db));
    }

    if ($method === 'PUT' || $method === 'POST') {
        $data = requireObject(readJson());
        if (($user['role'] ?? '') !== 'admin') {
            foreach (ADMIN_COLLECTIONS as $collection) {
                if (array_key_exists($collection, $data)) respond(['error' => 'Admin-Rechte fuer Stammdaten erforderlich.'], 403);
            }
        }
        transaction($db, static function () use ($db, $data): void {
            foreach (COLLECTIONS as $collection) {
                if (array_key_exists($collection, $data)) {
                    replaceCollection($db, $collection, requireList($data[$collection], $collection));
                }
            }
        });
        respond(readAll($db));
    }

    respond(['error' => 'Methode nicht erlaubt.'], 405);
}

function handleCollection(array $db, string $method, string $collection, ?string $id, array $user): void
{
    if ($method === 'GET' && $id === null) {
        respond(readCollection($db, $collection));
    }

    if ($method === 'GET' && $id !== null) {
        $item = readItem($db, $collection, $id);
        $item ? respond($item) : respond(['error' => 'Datensatz nicht gefunden.'], 404);
    }

    if ($method !== 'GET' && in_array($collection, ADMIN_COLLECTIONS, true)) requireAdmin($user);

    if ($method === 'PUT' && $id === null) {
        replaceCollection($db, $collection, requireList(readJson(), $collection));
        respond(readCollection($db, $collection));
    }

    if ($method === 'POST') {
        $item = requireObject(readJson());
        $itemId = itemId($item, $collection, 0);
        if ($itemId === '') respond(['error' => 'Datensatz braucht ein id-Feld.'], 422);
        upsertItem($db, $collection, $itemId, $item);
        respond(readItem($db, $collection, $itemId), 201);
    }

    if ($method === 'PUT' && $id !== null) {
        $item = requireObject(readJson());
        $item['id'] = $id;
        upsertItem($db, $collection, $id, $item);
        respond(readItem($db, $collection, $id));
    }

    if ($method === 'DELETE' && $id !== null) {
        respond(['deleted' => deleteItem($db, $collection, $id)]);
    }

    respond(['error' => 'Methode nicht erlaubt.'], 405);
}

function handleAuth(array $db, string $method, array $route): void
{
    cleanupAuthTokens($db);
    $action = $route[0] ?? 'status';

    if ($method === 'GET' && $action === 'status') {
        $user = authenticatedUser($db);
        respond([
            'setupRequired' => !usersExist($db),
            'authenticated' => (bool)$user,
            'user' => $user ? publicUser($user) : null,
        ]);
    }

    if ($method === 'POST' && $action === 'setup') {
        if (usersExist($db)) respond(['error' => 'Die Ersteinrichtung ist bereits abgeschlossen.'], 409);
        $data = requireObject(readJson());
        $email = normalizedEmail($data['email'] ?? '');
        $password = (string)($data['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Gueltige E-Mail-Adresse erforderlich.'], 422);
        if (!validPassword($password)) respond(['error' => 'Das Passwort braucht mindestens 10 Zeichen.'], 422);
        $userId = newId('U');
        executeStatement($db, 'INSERT INTO gd_users (id, email, display_name, role, password_hash) VALUES (?, ?, ?, ?, ?)', [
            $userId,
            $email,
            trim((string)($data['displayName'] ?? 'Administration')) ?: 'Administration',
            'admin',
            password_hash($password, PASSWORD_DEFAULT),
        ]);
        respond(authResponse($db, userById($db, $userId)));
    }

    if ($method === 'POST' && $action === 'login') {
        $data = requireObject(readJson());
        $user = userByEmail($db, normalizedEmail($data['email'] ?? ''));
        if (!$user || !(bool)$user['active'] || !password_verify((string)($data['password'] ?? ''), (string)$user['password_hash'])) {
            respond(['error' => 'Anmeldung fehlgeschlagen.'], 401);
        }
        if ((bool)$user['mfa_enabled']) {
            $ticket = createAuthToken($db, $user['id'], 'mfa', MFA_TICKET_TTL_SECONDS);
            respond(['mfaRequired' => true, 'ticket' => $ticket, 'user' => publicUser($user)]);
        }
        respond(authResponse($db, $user));
    }

    if ($method === 'POST' && $action === 'logout') {
        $token = bearerToken();
        if ($token !== '') deleteAuthToken($db, $token);
        respond(['ok' => true]);
    }

    if ($method === 'POST' && $action === 'mfa' && ($route[1] ?? '') === 'verify') {
        $data = requireObject(readJson());
        $tokenRow = authTokenRow($db, (string)($data['ticket'] ?? ''), 'mfa');
        $user = $tokenRow ? userById($db, (string)$tokenRow['user_id']) : null;
        if (!$user || !verifyTotp((string)$user['mfa_secret'], (string)($data['code'] ?? ''))) {
            respond(['error' => 'MFA-Code ist ungueltig.'], 401);
        }
        deleteAuthToken($db, (string)$data['ticket']);
        respond(authResponse($db, $user));
    }

    if ($method === 'POST' && $action === 'password' && ($route[1] ?? '') === 'request') {
        $data = requireObject(readJson());
        $email = normalizedEmail($data['email'] ?? '');
        $allowed = filter_var($email, FILTER_VALIDATE_EMAIL)
            && rateLimit($db, 'reset-email:' . hash('sha256', $email), PASSWORD_RESET_RATE_LIMIT_MAX, PASSWORD_RESET_RATE_LIMIT_SECONDS)
            && rateLimit($db, 'reset-ip:' . hash('sha256', clientIp()), PASSWORD_RESET_RATE_LIMIT_MAX * 2, PASSWORD_RESET_RATE_LIMIT_SECONDS);
        $user = $allowed ? userByEmail($db, $email) : null;
        if ($user && (bool)$user['active']) {
            executeStatement($db, "DELETE FROM gd_auth_tokens WHERE user_id = ? AND token_type = 'reset'", [$user['id']]);
            $token = createAuthToken($db, (string)$user['id'], 'reset', PASSWORD_RESET_TTL_SECONDS);
            sendPasswordResetMail($db, $user, $token);
        }
        respond([
            'ok' => true,
            'message' => 'Falls der Zugang existiert, wurde ein Ruecksetz-Link per E-Mail verschickt.',
        ]);
    }

    if ($method === 'POST' && $action === 'password' && ($route[1] ?? '') === 'reset') {
        $data = requireObject(readJson());
        if (!rateLimit($db, 'reset-apply-ip:' . hash('sha256', clientIp()), 20, PASSWORD_RESET_RATE_LIMIT_SECONDS)) respond(['error' => 'Zu viele Versuche. Bitte spaeter erneut probieren.'], 429);
        $tokenRow = authTokenRow($db, (string)($data['token'] ?? ''), 'reset');
        if (!$tokenRow) respond(['error' => 'Ruecksetz-Code ist ungueltig oder abgelaufen.'], 401);
        $password = (string)($data['password'] ?? '');
        if (!validPassword($password)) respond(['error' => 'Das Passwort braucht mindestens 10 Zeichen.'], 422);
        executeStatement($db, 'UPDATE gd_users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $tokenRow['user_id']]);
        executeStatement($db, 'DELETE FROM gd_auth_tokens WHERE user_id = ?', [$tokenRow['user_id']]);
        respond(['ok' => true]);
    }

    if ($action === 'mfa') {
        $user = requireAuthenticatedUser($db);
        $mfaAction = $route[1] ?? '';

        if ($method === 'POST' && $mfaAction === 'setup') {
            $secret = base32Secret();
            executeStatement($db, 'UPDATE gd_users SET mfa_pending_secret = ? WHERE id = ?', [$secret, $user['id']]);
            respond([
                'secret' => $secret,
                'otpauthUrl' => otpauthUrl((string)$user['email'], $secret),
            ]);
        }

        if ($method === 'POST' && $mfaAction === 'enable') {
            $data = requireObject(readJson());
            $freshUser = userById($db, (string)$user['id']);
            $secret = (string)($freshUser['mfa_pending_secret'] ?? '');
            if ($secret === '' || !verifyTotp($secret, (string)($data['code'] ?? ''))) respond(['error' => 'MFA-Code ist ungueltig.'], 422);
            executeStatement($db, "UPDATE gd_users SET mfa_enabled = 1, mfa_secret = ?, mfa_pending_secret = '' WHERE id = ?", [$secret, $user['id']]);
            respond(['ok' => true, 'user' => publicUser(userById($db, (string)$user['id']))]);
        }

        if ($method === 'POST' && $mfaAction === 'disable') {
            $data = requireObject(readJson());
            $freshUser = userById($db, (string)$user['id']);
            if (!password_verify((string)($data['password'] ?? ''), (string)$freshUser['password_hash'])) respond(['error' => 'Passwort ist ungueltig.'], 401);
            if ((bool)$freshUser['mfa_enabled'] && !verifyTotp((string)$freshUser['mfa_secret'], (string)($data['code'] ?? ''))) respond(['error' => 'MFA-Code ist ungueltig.'], 401);
            executeStatement($db, "UPDATE gd_users SET mfa_enabled = 0, mfa_secret = '', mfa_pending_secret = '' WHERE id = ?", [$user['id']]);
            respond(['ok' => true, 'user' => publicUser(userById($db, (string)$user['id']))]);
        }
    }

    respond(['error' => 'Methode nicht erlaubt.'], 405);
}

function handleUsers(array $db, string $method, array $route, array $currentUser): void
{
    requireAdmin($currentUser);
    $id = $route[0] ?? null;
    $subAction = $route[1] ?? null;

    if ($method === 'GET' && $id === null) {
        respond(array_map('publicUser', users($db)));
    }

    if ($method === 'POST' && $id === null) {
        $data = requireObject(readJson());
        $email = normalizedEmail($data['email'] ?? '');
        $password = (string)($data['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Gueltige E-Mail-Adresse erforderlich.'], 422);
        if (!validPassword($password)) respond(['error' => 'Das Passwort braucht mindestens 10 Zeichen.'], 422);
        if (!validRole((string)($data['role'] ?? 'user'))) respond(['error' => 'Unbekannte Rolle.'], 422);
        $userId = newId('U');
        executeStatement($db, 'INSERT INTO gd_users (id, email, display_name, role, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)', [
            $userId,
            $email,
            trim((string)($data['displayName'] ?? '')),
            (string)($data['role'] ?? 'user'),
            password_hash($password, PASSWORD_DEFAULT),
            !empty($data['active']) ? 1 : 0,
        ]);
        respond(publicUser(userById($db, $userId)), 201);
    }

    if (!$id) respond(['error' => 'Benutzer nicht gefunden.'], 404);

    if ($method === 'PUT' && $subAction === null) {
        $data = requireObject(readJson());
        $existing = userById($db, $id);
        if (!$existing) respond(['error' => 'Benutzer nicht gefunden.'], 404);
        $role = (string)($data['role'] ?? $existing['role']);
        $active = !empty($data['active']) ? 1 : 0;
        if (!validRole($role)) respond(['error' => 'Unbekannte Rolle.'], 422);
        if ($id === $currentUser['id'] && ($role !== 'admin' || !$active)) respond(['error' => 'Der eigene Admin-Zugang darf nicht entzogen werden.'], 422);
        executeStatement($db, 'UPDATE gd_users SET email = ?, display_name = ?, role = ?, active = ? WHERE id = ?', [
            normalizedEmail($data['email'] ?? $existing['email']),
            trim((string)($data['displayName'] ?? $existing['display_name'])),
            $role,
            $active,
            $id,
        ]);
        respond(publicUser(userById($db, $id)));
    }

    if ($method === 'POST' && $subAction === 'reset-password') {
        $existing = userById($db, $id);
        if (!$existing) respond(['error' => 'Benutzer nicht gefunden.'], 404);
        executeStatement($db, "DELETE FROM gd_auth_tokens WHERE user_id = ? AND token_type = 'reset'", [$id]);
        respond(['resetToken' => createAuthToken($db, $id, 'reset', PASSWORD_RESET_TTL_SECONDS)]);
    }

    if ($method === 'POST' && $subAction === 'mfa-reset') {
        $existing = userById($db, $id);
        if (!$existing) respond(['error' => 'Benutzer nicht gefunden.'], 404);
        executeStatement($db, "UPDATE gd_users SET mfa_enabled = 0, mfa_secret = '', mfa_pending_secret = '' WHERE id = ?", [$id]);
        executeStatement($db, "DELETE FROM gd_auth_tokens WHERE user_id = ? AND token_type = 'mfa'", [$id]);
        respond(publicUser(userById($db, $id)));
    }

    if ($method === 'DELETE' && $subAction === null) {
        if ($id === $currentUser['id']) respond(['error' => 'Der eigene Benutzer kann nicht geloescht werden.'], 422);
        executeStatement($db, 'DELETE FROM gd_auth_tokens WHERE user_id = ?', [$id]);
        respond(['deleted' => executeStatement($db, 'DELETE FROM gd_users WHERE id = ?', [$id]) > 0]);
    }

    respond(['error' => 'Methode nicht erlaubt.'], 405);
}

function db(): array
{
    $configFile = __DIR__ . '/config.php';
    $config = file_exists($configFile) ? require $configFile : require __DIR__ . '/config.example.php';
    $dsn = (string)$config['dsn'];

    if (str_starts_with($dsn, 'mysql:') && !extension_loaded('pdo_mysql')) {
        if (!extension_loaded('mysqli')) throw new RuntimeException('PHP braucht die Erweiterung pdo_mysql oder mysqli fuer die MySQL-Verbindung.');
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        $parts = parseDsn($dsn);
        $mysqli = new mysqli(
            $parts['host'] ?? 'localhost',
            $config['user'] ?? '',
            $config['password'] ?? '',
            $parts['dbname'] ?? '',
            (int)($parts['port'] ?? 3306)
        );
        $mysqli->set_charset($parts['charset'] ?? 'utf8mb4');
        return ['driver' => 'mysqli', 'mysqli' => $mysqli, 'config' => $config];
    }

    $pdo = new PDO($dsn, $config['user'], $config['password'], $config['options'] ?? []);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return ['driver' => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME), 'pdo' => $pdo, 'config' => $config];
}

function initSchema(array $db): void
{
    executeSqlScript($db, file_get_contents(__DIR__ . '/schema.mysql.sql'));
    ensureColumn($db, 'gd_import_log', 'address', "ALTER TABLE gd_import_log ADD COLUMN address VARCHAR(255) NOT NULL DEFAULT '' AFTER name");
    ensureColumn($db, 'gd_import_log', 'birth_date', 'ALTER TABLE gd_import_log ADD COLUMN birth_date DATE NULL AFTER address');
    ensureColumn($db, 'gd_import_log', 'age', 'ALTER TABLE gd_import_log ADD COLUMN age INT NULL AFTER birth_date');
    ensureColumn($db, 'gd_import_log', 'group_id', "ALTER TABLE gd_import_log ADD COLUMN group_id VARCHAR(32) NOT NULL DEFAULT '' AFTER age");
    ensureIndex($db, 'gd_import_log', 'idx_gd_import_log_group', 'ALTER TABLE gd_import_log ADD INDEX idx_gd_import_log_group (group_id)');
}

function readAll(array $db): array
{
    return array_reduce(COLLECTIONS, static fn ($data, $collection) => [
        ...$data,
        $collection => readCollection($db, $collection),
    ], []);
}

function readCollection(array $db, string $collection): array
{
    $config = collectionConfig($collection);
    $dbColumns = array_map(static fn ($column) => $column[0], $config['columns']);
    $sql = 'SELECT ' . implode(', ', $dbColumns) . ' FROM ' . $config['table'] . ' ORDER BY ' . $config['order'];

    if ($db['driver'] === 'mysqli') {
        $result = $db['mysqli']->query($sql);
        return array_map(static fn ($row) => rowToItem($row, $config), $result->fetch_all(MYSQLI_ASSOC));
    }

    return array_map(static fn ($row) => rowToItem($row, $config), $db['pdo']->query($sql)->fetchAll());
}

function readItem(array $db, string $collection, string $id): ?array
{
    $config = collectionConfig($collection);
    $dbColumns = array_map(static fn ($column) => $column[0], $config['columns']);
    $sql = 'SELECT ' . implode(', ', $dbColumns) . ' FROM ' . $config['table'] . ' WHERE id = ?';
    $row = fetchOne($db, $sql, [$id]);
    return $row ? rowToItem($row, $config) : null;
}

function replaceCollection(array $db, string $collection, array $items): void
{
    $config = collectionConfig($collection);
    executeStatement($db, 'DELETE FROM ' . $config['table']);
    foreach ($items as $index => $item) {
        $item = requireObject($item);
        $id = itemId($item, $collection, $index);
        if ($id === '') throw new RuntimeException("Datensatz in {$collection} braucht ein id-Feld.");
        $item['id'] = $id;
        upsertItem($db, $collection, $id, $item);
    }
}

function upsertItem(array $db, string $collection, string $id, array $item): void
{
    $config = collectionConfig($collection);
    $item['id'] = $id;
    $columns = $config['columns'];
    $dbColumns = array_map(static fn ($column) => $column[0], $columns);
    $values = array_map(static fn ($apiField) => valueForDb($item[$apiField] ?? null, $columns[$apiField][1]), array_keys($columns));

    if ($db['driver'] === 'mysqli' || $db['driver'] === 'mysql') {
        $placeholders = implode(', ', array_fill(0, count($dbColumns), '?'));
        $updates = implode(', ', array_map(static fn ($column) => "{$column} = VALUES({$column})", array_filter($dbColumns, static fn ($column) => $column !== 'id')));
        executeStatement($db, 'INSERT INTO ' . $config['table'] . ' (' . implode(', ', $dbColumns) . ') VALUES (' . $placeholders . ') ON DUPLICATE KEY UPDATE ' . $updates, $values);
        return;
    }

    $placeholders = implode(', ', array_fill(0, count($dbColumns), '?'));
    $updates = implode(', ', array_map(static fn ($column) => "{$column} = excluded.{$column}", array_filter($dbColumns, static fn ($column) => $column !== 'id')));
    executeStatement($db, 'INSERT INTO ' . $config['table'] . ' (' . implode(', ', $dbColumns) . ') VALUES (' . $placeholders . ') ON CONFLICT(id) DO UPDATE SET ' . $updates, $values);
}

function deleteItem(array $db, string $collection, string $id): bool
{
    $config = collectionConfig($collection);
    return executeStatement($db, 'DELETE FROM ' . $config['table'] . ' WHERE id = ?', [$id]) > 0;
}

function rowToItem(array $row, array $config): array
{
    $item = [];
    foreach ($config['columns'] as $apiField => [$dbField, $type]) {
        $item[$apiField] = valueFromDb($row[$dbField] ?? null, $type);
    }
    return $item;
}

function valueForDb(mixed $value, string $type): mixed
{
    if ($type === 'bool') return $value ? 1 : 0;
    if ($type === 'json') return json_encode($value ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if ($type === 'date') return trim((string)($value ?? '')) ?: null;
    if ($type === 'int') return trim((string)($value ?? '')) === '' ? null : (int)$value;
    return (string)($value ?? '');
}

function valueFromDb(mixed $value, string $type): mixed
{
    if ($type === 'bool') return (bool)$value;
    if ($type === 'json') return $value ? json_decode((string)$value, true, flags: JSON_THROW_ON_ERROR) : [];
    if ($type === 'int') return $value === null ? null : (int)$value;
    return $value ?? '';
}

function usersExist(array $db): bool
{
    $row = fetchOne($db, 'SELECT COUNT(*) AS count_rows FROM gd_users');
    return (int)($row['count_rows'] ?? 0) > 0;
}

function users(array $db): array
{
    $sql = 'SELECT id, email, display_name, role, mfa_enabled, active, created_at, updated_at FROM gd_users ORDER BY role, email';
    if ($db['driver'] === 'mysqli') return $db['mysqli']->query($sql)->fetch_all(MYSQLI_ASSOC);
    return $db['pdo']->query($sql)->fetchAll();
}

function userById(array $db, string $id): ?array
{
    return fetchOne($db, 'SELECT * FROM gd_users WHERE id = ?', [$id]);
}

function userByEmail(array $db, string $email): ?array
{
    return fetchOne($db, 'SELECT * FROM gd_users WHERE email = ?', [$email]);
}

function publicUser(array $user): array
{
    return [
        'id' => $user['id'],
        'email' => $user['email'],
        'displayName' => $user['display_name'] ?? $user['displayName'] ?? '',
        'role' => $user['role'],
        'mfaEnabled' => (bool)($user['mfa_enabled'] ?? $user['mfaEnabled'] ?? false),
        'active' => (bool)($user['active'] ?? true),
        'createdAt' => $user['created_at'] ?? '',
        'updatedAt' => $user['updated_at'] ?? '',
    ];
}

function authResponse(array $db, array $user): array
{
    return [
        'authenticated' => true,
        'token' => createAuthToken($db, (string)$user['id'], 'session', SESSION_TTL_SECONDS),
        'user' => publicUser($user),
    ];
}

function requireAuthenticatedUser(array $db): array
{
    $user = authenticatedUser($db);
    if (!$user) respond(['error' => 'Anmeldung erforderlich.'], 401);
    return $user;
}

function authenticatedUser(array $db): ?array
{
    $token = bearerToken();
    if ($token === '') return null;
    $hash = tokenHash($token);
    return fetchOne($db, "
        SELECT u.*
        FROM gd_auth_tokens t
        JOIN gd_users u ON u.id = t.user_id
        WHERE t.token_hash = ? AND t.token_type = 'session' AND t.expires_at > CURRENT_TIMESTAMP AND u.active = 1
    ", [$hash]);
}

function requireAdmin(array $user): void
{
    if (($user['role'] ?? '') !== 'admin') respond(['error' => 'Admin-Rechte erforderlich.'], 403);
}

function bearerToken(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    return preg_match('/^Bearer\s+(.+)$/i', (string)$header, $match) ? trim($match[1]) : '';
}

function createAuthToken(array $db, string $userId, string $type, int $ttl): string
{
    $token = bin2hex(random_bytes(32));
    executeStatement($db, 'INSERT INTO gd_auth_tokens (id, user_id, token_hash, token_type, expires_at) VALUES (?, ?, ?, ?, ?)', [
        newId('T'),
        $userId,
        tokenHash($token),
        $type,
        sqlDateTime(time() + $ttl),
    ]);
    return $token;
}

function authTokenRow(array $db, string $token, string $type): ?array
{
    if ($token === '') return null;
    return fetchOne($db, 'SELECT * FROM gd_auth_tokens WHERE token_hash = ? AND token_type = ? AND expires_at > CURRENT_TIMESTAMP', [tokenHash($token), $type]);
}

function deleteAuthToken(array $db, string $token): void
{
    if ($token !== '') executeStatement($db, 'DELETE FROM gd_auth_tokens WHERE token_hash = ?', [tokenHash($token)]);
}

function cleanupAuthTokens(array $db): void
{
    executeStatement($db, 'DELETE FROM gd_auth_tokens WHERE expires_at <= CURRENT_TIMESTAMP');
}

function rateLimit(array $db, string $key, int $maxAttempts, int $windowSeconds): bool
{
    cleanupRateLimits($db, $windowSeconds);
    $now = time();
    $row = fetchOne($db, 'SELECT attempts, first_attempt_at FROM gd_auth_rate_limits WHERE limit_key = ?', [$key]);
    if (!$row || strtotime((string)$row['first_attempt_at']) <= $now - $windowSeconds) {
        upsertRateLimit($db, $key, 1, sqlDateTime($now), sqlDateTime($now));
        return true;
    }
    $attempts = (int)$row['attempts'] + 1;
    upsertRateLimit($db, $key, $attempts, (string)$row['first_attempt_at'], sqlDateTime($now));
    return $attempts <= $maxAttempts;
}

function upsertRateLimit(array $db, string $key, int $attempts, string $firstAttemptAt, string $lastAttemptAt): void
{
    if ($db['driver'] === 'mysqli' || $db['driver'] === 'mysql') {
        executeStatement($db, 'INSERT INTO gd_auth_rate_limits (limit_key, attempts, first_attempt_at, last_attempt_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), first_attempt_at = VALUES(first_attempt_at), last_attempt_at = VALUES(last_attempt_at)', [$key, $attempts, $firstAttemptAt, $lastAttemptAt]);
        return;
    }
    executeStatement($db, 'INSERT INTO gd_auth_rate_limits (limit_key, attempts, first_attempt_at, last_attempt_at) VALUES (?, ?, ?, ?) ON CONFLICT(limit_key) DO UPDATE SET attempts = excluded.attempts, first_attempt_at = excluded.first_attempt_at, last_attempt_at = excluded.last_attempt_at', [$key, $attempts, $firstAttemptAt, $lastAttemptAt]);
}

function cleanupRateLimits(array $db, int $windowSeconds): void
{
    executeStatement($db, 'DELETE FROM gd_auth_rate_limits WHERE last_attempt_at <= ?', [sqlDateTime(time() - $windowSeconds)]);
}

function sendPasswordResetMail(array $db, array $user, string $token): void
{
    $config = appConfig($db);
    if (trim((string)($config['app_url'] ?? '')) === '') {
        error_log('Reset-Mail konnte nicht versendet werden: app_url ist nicht konfiguriert.');
        return;
    }
    $url = resetUrl($config, $token);
    $subject = 'Passwort zuruecksetzen';
    $message = "Hallo " . trim((string)($user['display_name'] ?: $user['email'])) . ",\n\n"
        . "fuer Ihren Zugang zum Gratulationsdienst wurde ein Passwort-Reset angefordert.\n\n"
        . "Bitte oeffnen Sie innerhalb von 15 Minuten diesen Link:\n{$url}\n\n"
        . "Wenn Sie den Reset nicht angefordert haben, ignorieren Sie diese Nachricht.\n";
    $headers = [
        'From: ' . mailFromHeader($config),
        'Content-Type: text/plain; charset=UTF-8',
    ];
    if (!function_exists('mail')) {
        error_log('Reset-Mail konnte nicht versendet werden: PHP mail() ist nicht verfuegbar.');
        return;
    }
    if (!mail((string)$user['email'], $subject, $message, implode("\r\n", $headers))) error_log('Reset-Mail konnte nicht versendet werden.');
}

function resetUrl(array $config, string $token): string
{
    $base = rtrim((string)($config['app_url'] ?? ''), '/') . '/';
    return $base . '?resetToken=' . rawurlencode($token);
}

function mailFromHeader(array $config): string
{
    $email = (string)($config['mail_from'] ?? 'noreply@example.test');
    $name = trim((string)($config['mail_from_name'] ?? ''));
    return $name === '' ? $email : sprintf('"%s" <%s>', addcslashes($name, '"\\'), $email);
}

function appConfig(array $db): array
{
    return $db['config'] ?? [];
}

function clientIp(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function tokenHash(string $token): string
{
    return hash('sha256', $token);
}

function sqlDateTime(int $timestamp): string
{
    return date('Y-m-d H:i:s', $timestamp);
}

function normalizedEmail(mixed $value): string
{
    return strtolower(trim((string)$value));
}

function validPassword(string $password): bool
{
    return strlen($password) >= 10;
}

function validRole(string $role): bool
{
    return in_array($role, ['admin', 'user'], true);
}

function newId(string $prefix): string
{
    return $prefix . '-' . bin2hex(random_bytes(8));
}

function base32Secret(int $length = 20): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bytes = random_bytes($length);
    return implode('', array_map(static fn ($byte) => $alphabet[ord($byte) & 31], str_split($bytes)));
}

function otpauthUrl(string $email, string $secret): string
{
    $label = rawurlencode(MFA_ISSUER . ':' . $email);
    return "otpauth://totp/{$label}?secret={$secret}&issuer=" . rawurlencode(MFA_ISSUER) . '&algorithm=SHA1&digits=6&period=30';
}

function verifyTotp(string $secret, string $code): bool
{
    $code = preg_replace('/\s+/', '', $code);
    if (!preg_match('/^\d{6}$/', $code)) return false;
    $counter = intdiv(time(), 30);
    foreach ([-1, 0, 1] as $offset) {
        if (hash_equals(totpCode($secret, $counter + $offset), $code)) return true;
    }
    return false;
}

function totpCode(string $secret, int $counter): string
{
    $key = base32Decode($secret);
    $binaryCounter = pack('N*', 0) . pack('N*', $counter);
    $hash = hash_hmac('sha1', $binaryCounter, $key, true);
    $offset = ord($hash[19]) & 0xf;
    $value = ((ord($hash[$offset]) & 0x7f) << 24)
        | ((ord($hash[$offset + 1]) & 0xff) << 16)
        | ((ord($hash[$offset + 2]) & 0xff) << 8)
        | (ord($hash[$offset + 3]) & 0xff);
    return str_pad((string)($value % 1000000), 6, '0', STR_PAD_LEFT);
}

function base32Decode(string $secret): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split(strtoupper($secret)) as $char) {
        if ($char === '=') continue;
        $value = strpos($alphabet, $char);
        if ($value === false) return '';
        $bits .= str_pad(decbin($value), 5, '0', STR_PAD_LEFT);
    }
    $bytes = '';
    foreach (str_split($bits, 8) as $chunk) {
        if (strlen($chunk) === 8) $bytes .= chr(bindec($chunk));
    }
    return $bytes;
}

function fetchOne(array $db, string $sql, array $values = []): ?array
{
    if ($db['driver'] === 'mysqli') {
        $stmt = $db['mysqli']->prepare($sql);
        bindValues($stmt, $values);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        return $row ?: null;
    }

    $stmt = $db['pdo']->prepare($sql);
    $stmt->execute($values);
    $row = $stmt->fetch();
    return $row ?: null;
}

function executeStatement(array $db, string $sql, array $values = []): int
{
    if ($db['driver'] === 'mysqli') {
        $stmt = $db['mysqli']->prepare($sql);
        bindValues($stmt, $values);
        $stmt->execute();
        return $stmt->affected_rows;
    }

    $stmt = $db['pdo']->prepare($sql);
    $stmt->execute($values);
    return $stmt->rowCount();
}

function bindValues(mysqli_stmt $stmt, array $values): void
{
    if (!$values) return;
    $types = str_repeat('s', count($values));
    $stmt->bind_param($types, ...$values);
}

function transaction(array $db, callable $callback): void
{
    if ($db['driver'] === 'mysqli') {
        $db['mysqli']->begin_transaction();
        try {
            $callback();
            $db['mysqli']->commit();
        } catch (Throwable $error) {
            $db['mysqli']->rollback();
            throw $error;
        }
        return;
    }

    $db['pdo']->beginTransaction();
    try {
        $callback();
        $db['pdo']->commit();
    } catch (Throwable $error) {
        $db['pdo']->rollBack();
        throw $error;
    }
}

function executeSqlScript(array $db, string $sql): void
{
    if ($db['driver'] === 'mysqli') {
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
            $db['mysqli']->query($statement);
        }
        return;
    }
    $db['pdo']->exec($sql);
}

function ensureColumn(array $db, string $table, string $column, string $sql): void
{
    if ($db['driver'] === 'mysqli') {
        $stmt = $db['mysqli']->prepare("SHOW COLUMNS FROM {$table} LIKE ?");
        $stmt->bind_param('s', $column);
        $stmt->execute();
        if (!$stmt->get_result()->fetch_assoc()) $db['mysqli']->query($sql);
        return;
    }

    if (!fetchOne($db, "SHOW COLUMNS FROM {$table} LIKE ?", [$column])) executeStatement($db, $sql);
}

function ensureIndex(array $db, string $table, string $index, string $sql): void
{
    if ($db['driver'] === 'mysqli') {
        $stmt = $db['mysqli']->prepare("SHOW INDEX FROM {$table} WHERE Key_name = ?");
        $stmt->bind_param('s', $index);
        $stmt->execute();
        if (!$stmt->get_result()->fetch_assoc()) $db['mysqli']->query($sql);
        return;
    }

    if (!fetchOne($db, "SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index])) executeStatement($db, $sql);
}

function migrateLegacyCollections(array $db): void
{
    if (!legacyTableExists($db) || relationalDataExists($db)) return;

    transaction($db, static function () use ($db): void {
        foreach (COLLECTIONS as $collection) {
            $legacyRows = legacyCollection($db, $collection);
            if ($legacyRows) replaceCollection($db, $collection, $legacyRows);
        }
    });
    dropLegacyTable($db);
}

function legacyTableExists(array $db): bool
{
    if ($db['driver'] === 'mysqli') {
        return (bool)fetchOne($db, "SHOW TABLES LIKE 'gd_data_items'");
    }
    return (bool)fetchOne($db, "SHOW TABLES LIKE 'gd_data_items'");
}

function relationalDataExists(array $db): bool
{
    foreach (COLLECTIONS as $collection) {
        $config = collectionConfig($collection);
        $row = fetchOne($db, 'SELECT COUNT(*) AS count_rows FROM ' . $config['table']);
        if ((int)($row['count_rows'] ?? 0) > 0) return true;
    }
    return false;
}

function legacyCollection(array $db, string $collection): array
{
    if ($db['driver'] === 'mysqli') {
        $stmt = $db['mysqli']->prepare('SELECT payload FROM gd_data_items WHERE collection = ? ORDER BY item_id');
        $stmt->bind_param('s', $collection);
        $stmt->execute();
        return array_map(static fn ($row) => json_decode($row['payload'], true, flags: JSON_THROW_ON_ERROR), $stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    $stmt = $db['pdo']->prepare('SELECT payload FROM gd_data_items WHERE collection = ? ORDER BY item_id');
    $stmt->execute([$collection]);
    return array_map(static fn ($row) => json_decode($row['payload'], true, flags: JSON_THROW_ON_ERROR), $stmt->fetchAll());
}

function dropLegacyTable(array $db): void
{
    executeStatement($db, 'DROP TABLE IF EXISTS gd_data_items');
}

function parseDsn(string $dsn): array
{
    $parts = [];
    foreach (explode(';', substr($dsn, strlen('mysql:'))) as $part) {
        [$key, $value] = array_pad(explode('=', $part, 2), 2, null);
        if ($key && $value !== null) $parts[$key] = $value;
    }
    return $parts;
}

function readJson(): mixed
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: 'null', true);
    if (json_last_error() !== JSON_ERROR_NONE) respond(['error' => 'Ungueltiges JSON: ' . json_last_error_msg()], 400);
    return $data;
}

function requireObject(mixed $value): array
{
    if (!is_array($value) || array_is_list($value)) throw new RuntimeException('JSON-Objekt erwartet.');
    return $value;
}

function requireList(mixed $value, string $name): array
{
    if (!is_array($value) || !array_is_list($value)) throw new RuntimeException("{$name} muss eine Liste sein.");
    return $value;
}

function itemId(array $item, string $collection, int $index): string
{
    $id = trim((string)($item['id'] ?? ''));
    if ($id !== '' || $collection !== 'importLog') return $id;
    return 'LOG-' . substr(sha1(json_encode($item, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . '|' . $index), 0, 12);
}

function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function routes(): array
{
    return [
        'GET /health',
        'GET /{collection}',
        'PUT /{collection}',
        'POST /{collection}',
        'GET /{collection}/{id}',
        'PUT /{collection}/{id}',
        'DELETE /{collection}/{id}',
        'GET /data',
        'PUT /data',
    ];
}
