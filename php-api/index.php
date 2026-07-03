<?php
declare(strict_types=1);

// Bei jeder Schema-Aenderung (neue ensureColumn/ensureIndex-Zeile in initSchema) erhoehen,
// damit die Migration nach dem Deployment einmal laeuft; danach ueberspringt sie jeder Request.
const SCHEMA_VERSION = '4';
const COLLECTIONS = ['citizens', 'sokoGroups', 'sokoMembers', 'streets', 'senders', 'templates'];
const ADMIN_COLLECTIONS = ['sokoGroups', 'sokoMembers', 'streets', 'senders', 'templates'];
const SESSION_TTL_SECONDS = 28800;
const MFA_TICKET_TTL_SECONDS = 300;
const PASSWORD_RESET_TTL_SECONDS = 900;
const PASSWORD_RESET_RATE_LIMIT_SECONDS = 3600;
const PASSWORD_RESET_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_SECONDS = 900;
const LOGIN_RATE_LIMIT_MAX = 10;
// Fester Bcrypt-Hash (cost 10, wie PASSWORD_DEFAULT), gegen den bei unbekannter E-Mail
// verifiziert wird, damit die Antwortzeit keine Konten verraet (User-Enumeration).
const LOGIN_DUMMY_HASH = '$2y$10$LMkJZ/MwWMBzkrchox2mzOoW4AXQQTkViWY9JE7NjBJRgeIKpFkrq';
const MFA_VERIFY_MAX_ATTEMPTS = 5;
// Aufbewahrung muss das größte Fenster abdecken, sonst unterläuft das Aufräumen längere Limits.
const RATE_LIMIT_RETENTION_SECONDS = PASSWORD_RESET_RATE_LIMIT_SECONDS;
const MFA_ISSUER = 'Gratulationsdienst Reinickendorf';
const RECEIPT_SETTINGS_NAME = 'receipt';
const VERSION_FIELD = '_version';
const DEFAULT_RECEIPT_SETTINGS = [
    'quittungBetrag' => '8,50',
    'quittungTelefon' => '90294 4055',
    'quittungKapitel' => '3930',
    'quittungTitel' => '68154',
];

class ApiError extends RuntimeException
{
    public function __construct(public int $status, string $message, public array $details = [])
    {
        parent::__construct($message);
    }

    public function response(): array
    {
        return ['error' => $this->getMessage()] + $this->details;
    }
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $db = db();
    ensureSchema($db);
    dispatch($db);
} catch (ApiError $error) {
    respond($error->response(), $error->status);
} catch (Throwable $error) {
    error_log(sprintf('Gratulationsdienst-API: %s in %s:%d', $error->getMessage(), $error->getFile(), $error->getLine()));
    respond(['error' => 'Interner Serverfehler.'], 500);
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
                'createdAt' => ['created_at', 'createdAt'],
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
                'birthDate' => ['birth_date', 'date'],
                'groupId' => ['group_id', 'string'],
                'street' => ['street', 'string'],
                'postalCode' => ['postal_code', 'string'],
                'city' => ['city', 'string'],
                'phone' => ['phone', 'string'],
                'mobile' => ['mobile', 'string'],
                'email' => ['email', 'string'],
                'bank' => ['bank', 'string'],
                'accountHolder' => ['account_holder', 'string'],
                'allowance' => ['allowance', 'string'],
                'termFrom' => ['term_from', 'date'],
                'termTo' => ['term_to', 'date'],
                'billingAmount' => ['billing_amount', 'string'],
                'zpNr' => ['zp_nr', 'string'],
                'kassenzeichen' => ['kassenzeichen', 'string'],
                'misc' => ['misc', 'string'],
                'note' => ['note', 'string'],
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
                'backgroundImage' => ['background_image', 'string'],
                'backBackgroundImage' => ['back_background_image', 'string'],
                'updatedAt' => ['updated_at_date', 'date'],
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

    if (($route[0] ?? '') === 'settings') {
        handleSettings($db, $method, array_slice($route, 1), $user);
        return;
    }

    if (($route[0] ?? '') === 'questionnaire-pages') {
        handleQuestionnairePages($db, $method, array_slice($route, 1), $user);
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
                if (array_key_exists($collection, $data)) respond(['error' => 'Admin-Rechte für Stammdaten erforderlich.'], 403);
            }
        }
        transaction($db, static function () use ($db, $data): void {
            foreach (COLLECTIONS as $collection) {
                if (array_key_exists($collection, $data)) {
                    ['items' => $items, 'knownVersions' => $knownVersions] = collectionPayload($data[$collection], $collection);
                    replaceCollection($db, $collection, $items, $knownVersions);
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
        ['items' => $items, 'knownVersions' => $knownVersions] = collectionPayload(readJson(), $collection);
        replaceCollection($db, $collection, $items, $knownVersions);
        respond(readCollection($db, $collection));
    }

    if ($method === 'POST') {
        $item = requireObject(readJson());
        $itemId = itemId($item);
        if ($itemId === '') respond(['error' => 'Datensatz braucht ein id-Feld.'], 422);
        assertItemVersionAllowsWrite($db, $collection, $itemId, $item);
        upsertItem($db, $collection, $itemId, $item);
        respond(readItem($db, $collection, $itemId), 201);
    }

    if ($method === 'PUT' && $id !== null) {
        $item = requireObject(readJson());
        $item['id'] = $id;
        assertItemVersionAllowsWrite($db, $collection, $id, $item);
        upsertItem($db, $collection, $id, $item);
        respond(readItem($db, $collection, $id));
    }

    if ($method === 'DELETE' && $id !== null) {
        assertItemVersionAllowsDelete($db, $collection, $id, requestExpectedVersion() ?? '');
        respond(['deleted' => deleteItem($db, $collection, $id)]);
    }

    respond(['error' => 'Methode nicht erlaubt.'], 405);
}

function handleSettings(array $db, string $method, array $route, array $user): void
{
    $name = $route[0] ?? '';
    if ($name !== RECEIPT_SETTINGS_NAME) respond(['error' => 'Unbekannte Einstellung.'], 404);

    if ($method === 'GET') {
        respond(readReceiptSettings($db));
    }

    if ($method === 'PUT') {
        requireAdmin($user);
        $settings = receiptSettingsFromPayload(requireObject(readJson()));
        saveReceiptSettings($db, $settings);
        respond(readReceiptSettings($db));
    }

    respond(['error' => 'Methode nicht erlaubt.'], 405);
}

function handleQuestionnairePages(array $db, string $method, array $route, array $user): void
{
    if ($method === 'GET') {
        $citizenId = trim((string)($_GET['citizenId'] ?? ''));
        if ($citizenId === '') respond(['error' => 'citizenId fehlt.'], 422);
        respond(readQuestionnairePages($db, $citizenId));
    }

    if ($method === 'POST') {
        $payload = readJson();
        $pages = array_is_list($payload) ? $payload : requireList(requireObject($payload)['pages'] ?? [], 'pages');
        $saved = [];
        transaction($db, static function () use ($db, $pages, &$saved): void {
            foreach ($pages as $index => $page) {
                $saved[] = saveQuestionnairePage($db, requireObject($page), $index);
            }
        });
        respond($saved, 201);
    }

    if ($method === 'DELETE') {
        requireAdmin($user);
        $payload = readJson();
        $citizenIds = is_array($payload) && !array_is_list($payload) ? array_values(array_filter(array_map(static fn ($id) => trim((string)$id), $payload['citizenIds'] ?? []))) : [];
        if ($citizenIds) {
            deleteQuestionnairePagesForCitizens($db, $citizenIds);
            respond(['ok' => true, 'deletedCitizenIds' => $citizenIds]);
        }
        executeStatement($db, 'DELETE FROM gd_questionnaire_pages', []);
        respond(['ok' => true]);
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
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Gültige E-Mail-Adresse erforderlich.'], 422);
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
        $email = normalizedEmail($data['email'] ?? '');
        $emailLimitKey = 'login-email:' . hash('sha256', $email);
        $allowed = rateLimit($db, $emailLimitKey, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_SECONDS)
            && rateLimit($db, 'login-ip:' . hash('sha256', clientIp()), LOGIN_RATE_LIMIT_MAX * 2, LOGIN_RATE_LIMIT_SECONDS);
        if (!$allowed) respond(['error' => 'Zu viele Anmeldeversuche. Bitte später erneut probieren.'], 429);
        $user = userByEmail($db, $email);
        $active = $user && (bool)$user['active'];
        $passwordOk = password_verify((string)($data['password'] ?? ''), $active ? (string)$user['password_hash'] : LOGIN_DUMMY_HASH);
        if (!$active || !$passwordOk) {
            respond(['error' => 'Anmeldung fehlgeschlagen.'], 401);
        }
        clearRateLimit($db, $emailLimitKey);
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
        $ticket = (string)($data['ticket'] ?? '');
        if (!rateLimit($db, 'mfa-ip:' . hash('sha256', clientIp()), LOGIN_RATE_LIMIT_MAX * 2, LOGIN_RATE_LIMIT_SECONDS)) {
            respond(['error' => 'Zu viele Versuche. Bitte später erneut probieren.'], 429);
        }
        $tokenRow = authTokenRow($db, $ticket, 'mfa');
        $user = $tokenRow ? userById($db, (string)$tokenRow['user_id']) : null;
        if (!$user || !verifyTotp((string)$user['mfa_secret'], (string)($data['code'] ?? ''))) {
            // Nach zu vielen Fehlversuchen das Ticket entwerten, sonst ließe sich der Code durchprobieren.
            if ($tokenRow && !rateLimit($db, 'mfa-ticket:' . tokenHash($ticket), MFA_VERIFY_MAX_ATTEMPTS, MFA_TICKET_TTL_SECONDS)) {
                deleteAuthToken($db, $ticket);
            }
            respond(['error' => 'MFA-Code ist ungültig.'], 401);
        }
        deleteAuthToken($db, $ticket);
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
            'message' => 'Falls der Zugang existiert, wurde ein Rücksetz-Link per E-Mail verschickt.',
        ]);
    }

    if ($method === 'POST' && $action === 'password' && ($route[1] ?? '') === 'reset') {
        $data = requireObject(readJson());
        if (!rateLimit($db, 'reset-apply-ip:' . hash('sha256', clientIp()), 20, PASSWORD_RESET_RATE_LIMIT_SECONDS)) respond(['error' => 'Zu viele Versuche. Bitte später erneut probieren.'], 429);
        $tokenRow = authTokenRow($db, (string)($data['token'] ?? ''), 'reset');
        if (!$tokenRow) respond(['error' => 'Rücksetz-Code ist ungültig oder abgelaufen.'], 401);
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
            if ($secret === '' || !verifyTotp($secret, (string)($data['code'] ?? ''))) respond(['error' => 'MFA-Code ist ungültig.'], 422);
            executeStatement($db, "UPDATE gd_users SET mfa_enabled = 1, mfa_secret = ?, mfa_pending_secret = '' WHERE id = ?", [$secret, $user['id']]);
            respond(['ok' => true, 'user' => publicUser(userById($db, (string)$user['id']))]);
        }

        if ($method === 'POST' && $mfaAction === 'disable') {
            $data = requireObject(readJson());
            $freshUser = userById($db, (string)$user['id']);
            if (!password_verify((string)($data['password'] ?? ''), (string)$freshUser['password_hash'])) respond(['error' => 'Passwort ist ungültig.'], 401);
            if ((bool)$freshUser['mfa_enabled'] && !verifyTotp((string)$freshUser['mfa_secret'], (string)($data['code'] ?? ''))) respond(['error' => 'MFA-Code ist ungültig.'], 401);
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
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Gültige E-Mail-Adresse erforderlich.'], 422);
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
        if ($id === $currentUser['id']) respond(['error' => 'Der eigene Benutzer kann nicht gelöscht werden.'], 422);
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
    $connectTimeout = max(1, (int)($config['connect_timeout'] ?? 5));

    if (str_starts_with($dsn, 'mysql:') && !extension_loaded('pdo_mysql')) {
        if (!extension_loaded('mysqli')) throw new RuntimeException('PHP braucht die Erweiterung pdo_mysql oder mysqli für die MySQL-Verbindung.');
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        $parts = parseDsn($dsn);
        $mysqli = mysqli_init();
        $mysqli->options(MYSQLI_OPT_CONNECT_TIMEOUT, $connectTimeout);
        $mysqli->real_connect(
            $parts['host'] ?? 'localhost',
            $config['user'] ?? '',
            $config['password'] ?? '',
            $parts['dbname'] ?? '',
            (int)($parts['port'] ?? 3306)
        );
        $mysqli->set_charset($parts['charset'] ?? 'utf8mb4');
        return ['driver' => 'mysqli', 'mysqli' => $mysqli, 'config' => $config];
    }

    $options = [PDO::ATTR_TIMEOUT => $connectTimeout] + ($config['options'] ?? []);
    $pdo = new PDO($dsn, $config['user'], $config['password'], $options);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return ['driver' => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME), 'pdo' => $pdo, 'config' => $config];
}

function ensureSchema(array $db): void
{
    if (storedSchemaVersion($db) === SCHEMA_VERSION) return;
    initSchema($db);
    setSchemaVersion($db, SCHEMA_VERSION);
}

function storedSchemaVersion(array $db): string
{
    try {
        $row = fetchOne($db, 'SELECT value FROM gd_api_meta WHERE name = ?', ['schema_version']);
        return (string)($row['value'] ?? '');
    } catch (Throwable) {
        return ''; // gd_api_meta existiert noch nicht -> initSchema legt sie an.
    }
}

function setSchemaVersion(array $db, string $version): void
{
    if ($db['driver'] === 'mysqli' || $db['driver'] === 'mysql') {
        executeStatement($db, 'INSERT INTO gd_api_meta (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', ['schema_version', $version]);
        return;
    }
    executeStatement($db, 'INSERT INTO gd_api_meta (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value', ['schema_version', $version]);
}

function initSchema(array $db): void
{
    executeSqlScript($db, file_get_contents(__DIR__ . '/schema.mysql.sql'));
    foreach (COLLECTIONS as $collection) {
        $config = collectionConfig($collection);
        ensureColumn($db, $config['table'], 'row_version', 'ALTER TABLE ' . $config['table'] . ' ADD COLUMN row_version BIGINT UNSIGNED NOT NULL DEFAULT 1');
    }
    ensureColumn($db, 'gd_citizens', 'press_publication', 'ALTER TABLE gd_citizens ADD COLUMN press_publication TINYINT(1) NOT NULL DEFAULT 0 AFTER printed_year');
    ensureColumn($db, 'gd_citizens', 'wedding_anniversary', "ALTER TABLE gd_citizens ADD COLUMN wedding_anniversary VARCHAR(80) NOT NULL DEFAULT '' AFTER press_publication");
    ensureColumn($db, 'gd_citizens', 'wedding_date', 'ALTER TABLE gd_citizens ADD COLUMN wedding_date DATE NULL AFTER wedding_anniversary');
    ensureColumn($db, 'gd_citizens', 'spouse_name', "ALTER TABLE gd_citizens ADD COLUMN spouse_name VARCHAR(180) NOT NULL DEFAULT '' AFTER wedding_date");
    ensureColumn($db, 'gd_streets', 'rules', 'ALTER TABLE gd_streets ADD COLUMN rules JSON NULL AFTER district');
    ensureColumn($db, 'gd_streets', 'area', "ALTER TABLE gd_streets ADD COLUMN area VARCHAR(120) NOT NULL DEFAULT '' AFTER rules");
    ensureColumn($db, 'gd_streets', 'group_id', "ALTER TABLE gd_streets ADD COLUMN group_id VARCHAR(32) NOT NULL DEFAULT '' AFTER area");
    ensureIndex($db, 'gd_streets', 'idx_gd_streets_group', 'ALTER TABLE gd_streets ADD INDEX idx_gd_streets_group (group_id)');
    ensureColumn($db, 'gd_templates', 'background_image', 'ALTER TABLE gd_templates ADD COLUMN background_image LONGTEXT NULL AFTER body');
    ensureColumn($db, 'gd_templates', 'back_background_image', 'ALTER TABLE gd_templates ADD COLUMN back_background_image LONGTEXT NULL AFTER background_image');
    ensureColumn($db, 'gd_soko_members', 'account_holder', "ALTER TABLE gd_soko_members ADD COLUMN account_holder VARCHAR(180) NOT NULL DEFAULT '' AFTER bank");
    ensureColumn($db, 'gd_soko_members', 'birth_date', 'ALTER TABLE gd_soko_members ADD COLUMN birth_date DATE NULL AFTER last_name');
    ensureColumn($db, 'gd_soko_members', 'zp_nr', "ALTER TABLE gd_soko_members ADD COLUMN zp_nr VARCHAR(40) NOT NULL DEFAULT '' AFTER billing_amount");
    ensureColumn($db, 'gd_soko_members', 'kassenzeichen', "ALTER TABLE gd_soko_members ADD COLUMN kassenzeichen VARCHAR(40) NOT NULL DEFAULT '' AFTER zp_nr");
    ensureColumn($db, 'gd_soko_members', 'misc', "ALTER TABLE gd_soko_members ADD COLUMN misc VARCHAR(255) NOT NULL DEFAULT '' AFTER kassenzeichen");
    ensureColumn($db, 'gd_soko_members', 'note', 'ALTER TABLE gd_soko_members ADD COLUMN note TEXT NULL AFTER misc');
}

function readAll(array $db): array
{
    return array_reduce(COLLECTIONS, static fn ($data, $collection) => [
        ...$data,
        $collection => readCollection($db, $collection),
    ], []);
}

function receiptSettingsFromPayload(array $payload): array
{
    return array_reduce(array_keys(DEFAULT_RECEIPT_SETTINGS), static fn ($settings, $key) => [
        ...$settings,
        $key => trim((string)($payload[$key] ?? DEFAULT_RECEIPT_SETTINGS[$key])),
    ], []);
}

function readReceiptSettings(array $db): array
{
    $row = fetchOne($db, 'SELECT value FROM gd_settings WHERE name = ?', [RECEIPT_SETTINGS_NAME]);
    if (!$row) return DEFAULT_RECEIPT_SETTINGS;
    $payload = json_decode((string)($row['value'] ?? ''), true);
    return receiptSettingsFromPayload(is_array($payload) ? $payload : []);
}

function saveReceiptSettings(array $db, array $settings): void
{
    $payload = json_encode(receiptSettingsFromPayload($settings), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if ($db['driver'] === 'mysqli' || $db['driver'] === 'mysql') {
        executeStatement($db, 'INSERT INTO gd_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [RECEIPT_SETTINGS_NAME, $payload]);
        return;
    }
    executeStatement($db, 'INSERT INTO gd_settings (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value', [RECEIPT_SETTINGS_NAME, $payload]);
}

function readQuestionnairePages(array $db, string $citizenId): array
{
    $sql = 'SELECT id, citizen_id, source, mime_type, image_data, marks, created_at FROM gd_questionnaire_pages WHERE citizen_id = ? ORDER BY created_at DESC';
    if ($db['driver'] === 'mysqli') {
        $stmt = $db['mysqli']->prepare($sql);
        bindValues($stmt, [$citizenId]);
        $stmt->execute();
        return array_map('questionnairePageFromRow', $stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    $stmt = $db['pdo']->prepare($sql);
    $stmt->execute([$citizenId]);
    return array_map('questionnairePageFromRow', $stmt->fetchAll());
}

function deleteQuestionnairePagesForCitizens(array $db, array $citizenIds): int
{
    $ids = array_values(array_unique(array_filter(array_map(static fn ($id) => trim((string)$id), $citizenIds))));
    if (!$ids) return 0;
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    return executeStatement($db, "DELETE FROM gd_questionnaire_pages WHERE citizen_id IN ({$placeholders})", $ids);
}

function saveQuestionnairePage(array $db, array $page, int $index): array
{
    $citizenId = trim((string)($page['citizenId'] ?? $page['citizen_id'] ?? ''));
    if ($citizenId === '') throw new ApiError(422, 'Fragebogen-Seite braucht citizenId.');
    [$mimeType, $imageData] = questionnaireImageFromDataUrl((string)($page['image'] ?? ''));
    $id = trim((string)($page['id'] ?? '')) ?: newId('QP');
    $source = substr(trim((string)($page['source'] ?? 'pdf')), 0, 40);
    $marks = json_encode($page['marks'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $values = [$id, $citizenId, $source, $mimeType, $imageData, $marks];

    if ($db['driver'] === 'mysqli' || $db['driver'] === 'mysql') {
        executeStatement($db, 'INSERT INTO gd_questionnaire_pages (id, citizen_id, source, mime_type, image_data, marks) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE citizen_id = VALUES(citizen_id), source = VALUES(source), mime_type = VALUES(mime_type), image_data = VALUES(image_data), marks = VALUES(marks)', $values);
        return questionnairePageFromRow(fetchOne($db, 'SELECT id, citizen_id, source, mime_type, image_data, marks, created_at FROM gd_questionnaire_pages WHERE id = ?', [$id]) ?? []);
    }

    executeStatement($db, 'INSERT INTO gd_questionnaire_pages (id, citizen_id, source, mime_type, image_data, marks) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET citizen_id = excluded.citizen_id, source = excluded.source, mime_type = excluded.mime_type, image_data = excluded.image_data, marks = excluded.marks', $values);
    return questionnairePageFromRow(fetchOne($db, 'SELECT id, citizen_id, source, mime_type, image_data, marks, created_at FROM gd_questionnaire_pages WHERE id = ?', [$id]) ?? []);
}

function questionnaireImageFromDataUrl(string $image): array
{
    if (!preg_match('/^data:([^;,]+);base64,(.+)$/s', trim($image), $match)) {
        throw new ApiError(422, 'Fragebogen-Bild muss ein Data-URL sein.');
    }
    $data = base64_decode(str_replace(["\r", "\n"], '', $match[2]), true);
    if ($data === false || $data === '') throw new ApiError(422, 'Fragebogen-Bild ist ungültig.');
    return [$match[1], $data];
}

function questionnairePageFromRow(array $row): array
{
    $marks = json_decode((string)($row['marks'] ?? '[]'), true);
    return [
        'id' => (string)($row['id'] ?? ''),
        'citizenId' => (string)($row['citizen_id'] ?? ''),
        'source' => (string)($row['source'] ?? ''),
        'image' => 'data:' . (string)($row['mime_type'] ?? 'image/jpeg') . ';base64,' . base64_encode((string)($row['image_data'] ?? '')),
        'marks' => is_array($marks) ? $marks : [],
        'createdAt' => (string)($row['created_at'] ?? ''),
    ];
}

function versionColumn(array $config): string
{
    return $config['versionColumn'] ?? 'row_version';
}

function selectColumns(array $config): array
{
    return [...array_map(static fn ($column) => $column[0], $config['columns']), versionColumn($config)];
}

function collectionPayload(mixed $payload, string $collection): array
{
    if (is_array($payload) && array_is_list($payload)) {
        return ['items' => requireList($payload, $collection), 'knownVersions' => null];
    }

    $object = requireObject($payload);
    return [
        'items' => requireList($object['items'] ?? [], $collection),
        'knownVersions' => array_key_exists('knownVersions', $object) ? normalizedKnownVersions($object['knownVersions']) : null,
    ];
}

function normalizedKnownVersions(mixed $versions): array
{
    $object = requireObject($versions);
    $normalized = [];
    foreach ($object as $id => $version) {
        $normalized[trim((string)$id)] = trim((string)$version);
    }
    return $normalized;
}

function incomingItemsById(array $items, string $collection): array
{
    $byId = [];
    foreach ($items as $item) {
        $item = requireObject($item);
        $id = itemId($item);
        if ($id === '') throw new ApiError(422, "Datensatz in {$collection} braucht ein id-Feld.");
        if (array_key_exists($id, $byId)) throw new ApiError(422, "Datensatz {$id} ist in {$collection} doppelt enthalten.");
        $item['id'] = $id;
        $byId[$id] = $item;
    }
    return $byId;
}

function itemsById(array $items): array
{
    $byId = [];
    foreach ($items as $item) {
        $id = itemId($item);
        if ($id !== '') $byId[$id] = $item;
    }
    return $byId;
}

function itemVersion(array $item): string
{
    return trim((string)($item[VERSION_FIELD] ?? ''));
}

function expectedVersionForItem(array $item, ?array $knownVersions, string $id): string
{
    $itemVersion = itemVersion($item);
    if ($itemVersion !== '') return $itemVersion;
    return trim((string)($knownVersions[$id] ?? ''));
}

function requestExpectedVersion(): ?string
{
    $header = trim((string)($_SERVER['HTTP_IF_MATCH'] ?? ''));
    if ($header !== '') return trim($header, " \t\n\r\0\x0B\"");
    if (array_key_exists('version', $_GET)) return trim((string)$_GET['version']);
    return null;
}

function assertCollectionVersionsAllowReplace(string $collection, array $incomingById, array $currentById, ?array $knownVersions): void
{
    if ($knownVersions === null && !incomingPayloadHasVersions($incomingById)) {
        if ($currentById) throwConflict($collection, '', '');
        return;
    }

    foreach ($currentById as $id => $currentItem) {
        $currentVersion = itemVersion($currentItem);
        if (array_key_exists($id, $incomingById)) {
            $expectedVersion = expectedVersionForItem($incomingById[$id], $knownVersions, $id);
            if ($expectedVersion === '' || $expectedVersion !== $currentVersion) {
                throwConflict($collection, $id, $currentVersion);
            }
            continue;
        }

        $expectedVersion = trim((string)($knownVersions[$id] ?? ''));
        if ($expectedVersion === '' || $expectedVersion !== $currentVersion) {
            throwConflict($collection, $id, $currentVersion);
        }
    }

    foreach ($incomingById as $id => $item) {
        if (array_key_exists($id, $currentById)) continue;
        if (expectedVersionForItem($item, $knownVersions, $id) !== '') throwConflict($collection, $id, '');
    }
}

function incomingPayloadHasVersions(array $incomingById): bool
{
    foreach ($incomingById as $item) {
        if (itemVersion($item) !== '') return true;
    }
    return false;
}

function assertItemVersionAllowsWrite(array $db, string $collection, string $id, array $item): void
{
    $current = readItem($db, $collection, $id);
    $expectedVersion = itemVersion($item);
    if (!$current) {
        if ($expectedVersion !== '') throwConflict($collection, $id, '');
        return;
    }
    if ($expectedVersion === '' || $expectedVersion !== itemVersion($current)) {
        throwConflict($collection, $id, itemVersion($current));
    }
}

function assertItemVersionAllowsDelete(array $db, string $collection, string $id, string $expectedVersion): void
{
    $current = readItem($db, $collection, $id);
    if (!$current) return;
    if ($expectedVersion === '' || $expectedVersion !== itemVersion($current)) {
        throwConflict($collection, $id, itemVersion($current));
    }
}

function throwConflict(string $collection, string $id, string $currentVersion): never
{
    throw new ApiError(409, 'Der Datensatz wurde parallel geändert. Bitte Daten neu laden und die Änderung erneut prüfen.', [
        'collection' => $collection,
        'id' => $id,
        'currentVersion' => $currentVersion,
    ]);
}

function itemsEqualForPersistence(array $incoming, array $current, array $config): bool
{
    foreach ($config['columns'] as $apiField => [, $type]) {
        if ($type === 'createdAt' && !array_key_exists($apiField, $incoming)) continue;
        if (valueForDb($incoming[$apiField] ?? null, $type) !== valueForDb($current[$apiField] ?? null, $type)) {
            return false;
        }
    }
    return true;
}

function readCollection(array $db, string $collection): array
{
    $config = collectionConfig($collection);
    $dbColumns = selectColumns($config);
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
    $dbColumns = selectColumns($config);
    $sql = 'SELECT ' . implode(', ', $dbColumns) . ' FROM ' . $config['table'] . ' WHERE id = ?';
    $row = fetchOne($db, $sql, [$id]);
    return $row ? rowToItem($row, $config) : null;
}

function replaceCollection(array $db, string $collection, array $items, ?array $knownVersions = null): void
{
    $config = collectionConfig($collection);
    $incomingById = incomingItemsById($items, $collection);
    $currentById = itemsById(readCollection($db, $collection));
    assertCollectionVersionsAllowReplace($collection, $incomingById, $currentById, $knownVersions);

    foreach ($currentById as $id => $currentItem) {
        if (!array_key_exists($id, $incomingById)) deleteItem($db, $collection, $id);
    }

    foreach ($incomingById as $id => $item) {
        if (!array_key_exists($id, $currentById) || !itemsEqualForPersistence($item, $currentById[$id], $config)) {
            upsertItem($db, $collection, $id, $item);
        }
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
        $updates = implode(', ', [
            ...array_map(static fn ($column) => "{$column} = VALUES({$column})", array_filter($dbColumns, static fn ($column) => $column !== 'id')),
            versionColumn($config) . ' = ' . versionColumn($config) . ' + 1',
        ]);
        executeStatement($db, 'INSERT INTO ' . $config['table'] . ' (' . implode(', ', $dbColumns) . ') VALUES (' . $placeholders . ') ON DUPLICATE KEY UPDATE ' . $updates, $values);
        return;
    }

    $placeholders = implode(', ', array_fill(0, count($dbColumns), '?'));
    $updates = implode(', ', [
        ...array_map(static fn ($column) => "{$column} = excluded.{$column}", array_filter($dbColumns, static fn ($column) => $column !== 'id')),
        versionColumn($config) . ' = ' . versionColumn($config) . ' + 1',
    ]);
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
    $versionColumn = versionColumn($config);
    if (array_key_exists($versionColumn, $row)) $item[VERSION_FIELD] = (string)$row[$versionColumn];
    return $item;
}

function valueForDb(mixed $value, string $type): mixed
{
    if ($type === 'bool') return $value ? 1 : 0;
    if ($type === 'json') return json_encode($value ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if ($type === 'createdAt') return trim((string)($value ?? '')) ?: date('Y-m-d H:i:s');
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
    cleanupRateLimits($db, RATE_LIMIT_RETENTION_SECONDS);
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

function clearRateLimit(array $db, string $key): void
{
    executeStatement($db, 'DELETE FROM gd_auth_rate_limits WHERE limit_key = ?', [$key]);
}

function sendPasswordResetMail(array $db, array $user, string $token): void
{
    $config = appConfig($db);
    if (trim((string)($config['app_url'] ?? '')) === '') {
        error_log('Reset-Mail konnte nicht versendet werden: app_url ist nicht konfiguriert.');
        return;
    }
    $url = resetUrl($config, $token);
    $subject = 'Passwort zurücksetzen';
    $message = "Hallo " . trim((string)($user['display_name'] ?: $user['email'])) . ",\n\n"
        . "für Ihren Zugang zum Gratulationsdienst wurde ein Passwort-Reset angefordert.\n\n"
        . "Bitte öffnen Sie innerhalb von 15 Minuten diesen Link:\n{$url}\n\n"
        . "Wenn Sie den Reset nicht angefordert haben, ignorieren Sie diese Nachricht.\n";
    $headers = [
        'From: ' . mailFromHeader($config),
        'Content-Type: text/plain; charset=UTF-8',
    ];
    if (!function_exists('mail')) {
        error_log('Reset-Mail konnte nicht versendet werden: PHP mail() ist nicht verfügbar.');
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
    if (json_last_error() !== JSON_ERROR_NONE) respond(['error' => 'Ungültiges JSON: ' . json_last_error_msg()], 400);
    return $data;
}

function requireObject(mixed $value): array
{
    if (!is_array($value) || array_is_list($value)) throw new ApiError(400, 'JSON-Objekt erwartet.');
    return $value;
}

function requireList(mixed $value, string $name): array
{
    if (!is_array($value) || !array_is_list($value)) throw new ApiError(400, "{$name} muss eine Liste sein.");
    return $value;
}

function itemId(array $item): string
{
    return trim((string)($item['id'] ?? ''));
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
        'GET /questionnaire-pages?citizenId={id}',
        'POST /questionnaire-pages',
        'DELETE /questionnaire-pages',
        'GET /data',
        'PUT /data',
        'GET /settings/receipt',
        'PUT /settings/receipt',
    ];
}
