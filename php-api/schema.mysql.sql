CREATE TABLE IF NOT EXISTS gd_soko_groups (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(160) NOT NULL DEFAULT '',
    region VARCHAR(255) NOT NULL DEFAULT '',
    leader_id VARCHAR(32) NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_soko_groups_leader (leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_soko_members (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    salutation VARCHAR(32) NOT NULL DEFAULT '',
    first_name VARCHAR(120) NOT NULL DEFAULT '',
    last_name VARCHAR(120) NOT NULL DEFAULT '',
    group_id VARCHAR(32) NOT NULL DEFAULT '',
    street VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(80) NOT NULL DEFAULT '',
    mobile VARCHAR(80) NOT NULL DEFAULT '',
    email VARCHAR(160) NOT NULL DEFAULT '',
    bank VARCHAR(64) NOT NULL DEFAULT '',
    allowance VARCHAR(32) NOT NULL DEFAULT '',
    term_from DATE NULL,
    term_to DATE NULL,
    billing_amount VARCHAR(32) NOT NULL DEFAULT '',
    is_leader TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_soko_members_group (group_id),
    INDEX idx_gd_soko_members_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_streets (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(180) NOT NULL DEFAULT '',
    district VARCHAR(120) NOT NULL DEFAULT '',
    districts JSON NULL,
    rules JSON NULL,
    area VARCHAR(120) NOT NULL DEFAULT '',
    group_id VARCHAR(32) NOT NULL DEFAULT '',
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_citizens_name (last_name, first_name),
    INDEX idx_gd_citizens_birthday (birth_date),
    INDEX idx_gd_citizens_street (street),
    INDEX idx_gd_citizens_status (status),
    INDEX idx_gd_citizens_printed (printed_year, printed_age)
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
    updated_at_date DATE NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gd_templates_sender (sender_id),
    INDEX idx_gd_templates_occasion (occasion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_import_log (
    id VARCHAR(48) NOT NULL PRIMARY KEY,
    entry_time VARCHAR(80) NOT NULL DEFAULT '',
    name VARCHAR(180) NOT NULL DEFAULT '',
    entry_type VARCHAR(40) NOT NULL DEFAULT '',
    message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gd_import_log_type (entry_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_api_meta (
    name VARCHAR(64) NOT NULL PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO gd_api_meta (name, value) VALUES ('schema_version', '2');
