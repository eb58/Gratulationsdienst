CREATE TABLE IF NOT EXISTS gd_soko_groups (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(160) NOT NULL DEFAULT '',
    region VARCHAR(255) NOT NULL DEFAULT '',
    leader_id VARCHAR(32) NOT NULL DEFAULT '',
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_soko_groups_leader (leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_soko_members (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    salutation VARCHAR(32) NOT NULL DEFAULT '',
    first_name VARCHAR(120) NOT NULL DEFAULT '',
    last_name VARCHAR(120) NOT NULL DEFAULT '',
    birth_date DATE NULL,
    group_id VARCHAR(32) NOT NULL DEFAULT '',
    street VARCHAR(255) NOT NULL DEFAULT '',
    postal_code VARCHAR(16) NOT NULL DEFAULT '',
    city VARCHAR(120) NOT NULL DEFAULT '',
    phone VARCHAR(80) NOT NULL DEFAULT '',
    mobile VARCHAR(80) NOT NULL DEFAULT '',
    email VARCHAR(160) NOT NULL DEFAULT '',
    bank VARCHAR(64) NOT NULL DEFAULT '',
    account_holder VARCHAR(180) NOT NULL DEFAULT '',
    allowance VARCHAR(32) NOT NULL DEFAULT '',
    term_from DATE NULL,
    term_to DATE NULL,
    billing_amount VARCHAR(32) NOT NULL DEFAULT '',
    zp_nr VARCHAR(40) NOT NULL DEFAULT '',
    kassenzeichen VARCHAR(40) NOT NULL DEFAULT '',
    misc VARCHAR(255) NOT NULL DEFAULT '',
    note TEXT NULL,
    is_leader TINYINT(1) NOT NULL DEFAULT 0,
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_soko_members_group (group_id),
    INDEX idx_gd_soko_members_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_streets (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(180) NOT NULL DEFAULT '',
    district VARCHAR(120) NOT NULL DEFAULT '',
    rules JSON NULL,
    area VARCHAR(120) NOT NULL DEFAULT '',
    group_id VARCHAR(32) NOT NULL DEFAULT '',
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_streets_name (name),
    INDEX idx_gd_streets_district (district),
    INDEX idx_gd_streets_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_citizens (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    salutation VARCHAR(32) NOT NULL DEFAULT '',
    first_name VARCHAR(120) NOT NULL DEFAULT '',
    last_name VARCHAR(120) NOT NULL DEFAULT '',
    street VARCHAR(180) NOT NULL DEFAULT '',
    house_no VARCHAR(32) NOT NULL DEFAULT '',
    postal_code VARCHAR(16) NOT NULL DEFAULT '',
    district VARCHAR(120) NOT NULL DEFAULT '',
    birth_date DATE NULL,
    phone VARCHAR(80) NOT NULL DEFAULT '',
    email VARCHAR(160) NOT NULL DEFAULT '',
    wish VARCHAR(160) NOT NULL DEFAULT '',
    notes TEXT NULL,
    source VARCHAR(80) NOT NULL DEFAULT '',
    updated_at_date DATE NULL,
    status VARCHAR(32) NOT NULL DEFAULT '',
    printed_at_date DATE NULL,
    printed_age INT NULL,
    printed_year INT NULL,
    press_publication TINYINT(1) NOT NULL DEFAULT 0,
    wedding_anniversary VARCHAR(80) NOT NULL DEFAULT '',
    wedding_date DATE NULL,
    spouse_name VARCHAR(180) NOT NULL DEFAULT '',
    archived TINYINT(1) NOT NULL DEFAULT 0,
    questionnaire_cycle VARCHAR(7) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_citizens_name (last_name, first_name),
    INDEX idx_gd_citizens_birthday (birth_date),
    INDEX idx_gd_citizens_street (street),
    INDEX idx_gd_citizens_status (status),
    INDEX idx_gd_citizens_printed (printed_year, printed_age)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_questionnaire_cases (
    id VARCHAR(80) NOT NULL PRIMARY KEY,
    citizen_id VARCHAR(32) NOT NULL,
    cycle VARCHAR(7) NOT NULL,
    wish VARCHAR(160) NOT NULL DEFAULT 'offen',
    press_publication TINYINT(1) NOT NULL DEFAULT 0,
    wedding_anniversary VARCHAR(80) NOT NULL DEFAULT '',
    wedding_date DATE NULL,
    spouse_name VARCHAR(180) NOT NULL DEFAULT '',
    notes TEXT NULL,
    source VARCHAR(80) NOT NULL DEFAULT '',
    captured_at_date DATE NULL,
    updated_at_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_gd_questionnaire_cases_citizen_cycle (citizen_id, cycle),
    INDEX idx_gd_questionnaire_cases_cycle (cycle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_wedding_anniversaries (
    id VARCHAR(80) NOT NULL PRIMARY KEY,
    citizen_id VARCHAR(32) NOT NULL DEFAULT '',
    salutation VARCHAR(32) NOT NULL DEFAULT '',
    first_name VARCHAR(120) NOT NULL DEFAULT '',
    last_name VARCHAR(120) NOT NULL DEFAULT '',
    birth_date DATE NULL,
    street VARCHAR(180) NOT NULL DEFAULT '',
    house_no VARCHAR(32) NOT NULL DEFAULT '',
    postal_code VARCHAR(16) NOT NULL DEFAULT '',
    district VARCHAR(120) NOT NULL DEFAULT '',
    wedding_date DATE NULL,
    spouse_name VARCHAR(180) NOT NULL DEFAULT '',
    source VARCHAR(80) NOT NULL DEFAULT '',
    captured_at_date DATE NULL,
    updated_at_date DATE NULL,
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_wedding_anniversaries_citizen (citizen_id),
    INDEX idx_gd_wedding_anniversaries_date (wedding_date),
    INDEX idx_gd_wedding_anniversaries_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_senders (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    role VARCHAR(120) NOT NULL DEFAULT '',
    name VARCHAR(180) NOT NULL DEFAULT '',
    department VARCHAR(180) NOT NULL DEFAULT '',
    address VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(80) NOT NULL DEFAULT '',
    email VARCHAR(160) NOT NULL DEFAULT '',
    logo VARCHAR(160) NOT NULL DEFAULT '',
    signature VARCHAR(120) NOT NULL DEFAULT '',
    color VARCHAR(32) NOT NULL DEFAULT '',
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_senders_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_templates (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(160) NOT NULL DEFAULT '',
    occasion VARCHAR(80) NOT NULL DEFAULT '',
    format VARCHAR(80) NOT NULL DEFAULT '',
    sender_id VARCHAR(32) NOT NULL DEFAULT '',
    subject VARCHAR(255) NOT NULL DEFAULT '',
    body TEXT NULL,
    age_texts JSON NULL,
    background_image LONGTEXT NULL,
    back_background_image LONGTEXT NULL,
    updated_at_date DATE NULL,
    row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_templates_sender (sender_id),
    INDEX idx_gd_templates_occasion (occasion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_questionnaire_pages (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    citizen_id VARCHAR(32) NOT NULL,
    import_id VARCHAR(64) NOT NULL DEFAULT '',
    page_no INT NOT NULL DEFAULT 1,
    source VARCHAR(40) NOT NULL DEFAULT '',
    mime_type VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
    image_data LONGBLOB NOT NULL,
    marks JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gd_questionnaire_pages_citizen (citizen_id),
    INDEX idx_gd_questionnaire_pages_import (import_id),
    INDEX idx_gd_questionnaire_pages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_users (
    id VARCHAR(48) NOT NULL PRIMARY KEY,
    email VARCHAR(180) NOT NULL,
    display_name VARCHAR(180) NOT NULL DEFAULT '',
    role VARCHAR(24) NOT NULL DEFAULT 'user',
    password_hash VARCHAR(255) NOT NULL,
    mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
    mfa_secret VARCHAR(80) NOT NULL DEFAULT '',
    mfa_pending_secret VARCHAR(80) NOT NULL DEFAULT '',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_gd_users_email (email),
    INDEX idx_gd_users_role (role),
    INDEX idx_gd_users_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_auth_tokens (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(48) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    token_type VARCHAR(24) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_gd_auth_tokens_hash (token_hash),
    INDEX idx_gd_auth_tokens_user (user_id),
    INDEX idx_gd_auth_tokens_type (token_type),
    INDEX idx_gd_auth_tokens_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_auth_rate_limits (
    limit_key VARCHAR(160) NOT NULL PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 0,
    first_attempt_at DATETIME NOT NULL,
    last_attempt_at DATETIME NOT NULL,
    INDEX idx_gd_auth_rate_limits_last (last_attempt_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_settings (
    name VARCHAR(64) NOT NULL PRIMARY KEY,
    value JSON NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_api_meta (
    name VARCHAR(64) NOT NULL PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_user_id VARCHAR(48) NOT NULL DEFAULT '',
    actor_email VARCHAR(180) NOT NULL DEFAULT '',
    action VARCHAR(32) NOT NULL,
    collection_name VARCHAR(80) NOT NULL,
    record_id VARCHAR(80) NOT NULL DEFAULT '',
    before_json JSON NULL,
    after_json JSON NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    previous_hash CHAR(64) NOT NULL DEFAULT '',
    entry_hash CHAR(64) NOT NULL,
    INDEX idx_gd_audit_record (collection_name, record_id, occurred_at),
    INDEX idx_gd_audit_actor (actor_user_id, occurred_at),
    UNIQUE INDEX idx_gd_audit_hash (entry_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
