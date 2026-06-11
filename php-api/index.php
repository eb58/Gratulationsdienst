<?php
declare(strict_types=1);

const COLLECTIONS = ['citizens', 'sokoGroups', 'sokoMembers', 'streets', 'senders', 'templates', 'importLog'];

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

    if (($route[0] ?? '') === 'data') {
        handleData($db, $method);
        return;
    }

    $collection = $route[0] ?? '';
    $id = $route[1] ?? null;
    if (!in_array($collection, COLLECTIONS, true)) {
        respond(['error' => 'Unbekannte Route.'], 404);
    }

    handleCollection($db, $method, $collection, $id);
}

function handleData(array $db, string $method): void
{
    if ($method === 'GET') {
        respond(readAll($db));
    }

    if ($method === 'PUT' || $method === 'POST') {
        $data = requireObject(readJson());
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

function handleCollection(array $db, string $method, string $collection, ?string $id): void
{
    if ($method === 'GET' && $id === null) {
        respond(readCollection($db, $collection));
    }

    if ($method === 'GET' && $id !== null) {
        $item = readItem($db, $collection, $id);
        $item ? respond($item) : respond(['error' => 'Datensatz nicht gefunden.'], 404);
    }

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

function db(): array
{
    $configFile = __DIR__ . '/config.php';
    $config = file_exists($configFile) ? require $configFile : require __DIR__ . '/config.example.php';
    $dsn = (string)$config['dsn'];

    if (str_starts_with($dsn, 'mysql:') && !extension_loaded('pdo_mysql')) {
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
        return ['driver' => 'mysqli', 'mysqli' => $mysqli];
    }

    $pdo = new PDO($dsn, $config['user'], $config['password'], $config['options'] ?? []);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return ['driver' => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME), 'pdo' => $pdo];
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
