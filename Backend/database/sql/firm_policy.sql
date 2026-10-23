-- 公司內規主檔。current_version_id 在版本建立後指向目前生效版本。
CREATE TABLE IF NOT EXISTS firm_policy (
    policy_id INTEGER PRIMARY KEY,
    policy_name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_version_id INTEGER,
    FOREIGN KEY (current_version_id)
        REFERENCES firm_policy_version (policy_version_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- 公司內規版本；based_on_version_id 保留版本演進鏈。
CREATE TABLE IF NOT EXISTS firm_policy_version (
    policy_version_id INTEGER PRIMARY KEY,
    policy_id INTEGER NOT NULL,
    version_no TEXT NOT NULL,
    based_on_version_id INTEGER,
    description TEXT,
    status TEXT NOT NULL,
    effective_at TEXT,
    UNIQUE (policy_id, version_no),
    FOREIGN KEY (policy_id) REFERENCES firm_policy (policy_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (based_on_version_id)
        REFERENCES firm_policy_version (policy_version_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_firm_policy_version_policy_id
    ON firm_policy_version (policy_id);

CREATE INDEX IF NOT EXISTS idx_firm_policy_version_based_on_version_id
    ON firm_policy_version (based_on_version_id);

-- 公司內規條文隸屬版本，而不是直接隸屬主檔。
CREATE TABLE IF NOT EXISTS firm_policy_article (
    policy_article_id INTEGER PRIMARY KEY,
    policy_version_id INTEGER NOT NULL,
    article INTEGER,
    paragraph INTEGER,
    subparagraph INTEGER,
    item INTEGER,
    article_key TEXT NOT NULL,
    context TEXT NOT NULL,
    embedding BLOB,
    UNIQUE (policy_version_id, article_key),
    FOREIGN KEY (policy_version_id)
        REFERENCES firm_policy_version (policy_version_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_firm_policy_article_policy_version_id
    ON firm_policy_article (policy_version_id);

-- 內規之間的有向關聯。ER 圖第二個同名 policy_id 以 relative_policy_id 區別。
CREATE TABLE IF NOT EXISTS firm_policy_relative (
    policy_id INTEGER NOT NULL,
    relative_policy_id INTEGER NOT NULL,
    PRIMARY KEY (policy_id, relative_policy_id),
    FOREIGN KEY (policy_id) REFERENCES firm_policy (policy_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (relative_policy_id) REFERENCES firm_policy (policy_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- 公司內規修改紀錄。
CREATE TABLE IF NOT EXISTS firm_policy_change_record (
    policy_change_id INTEGER PRIMARY KEY,
    risk_event_id INTEGER,
    policy_version_id INTEGER NOT NULL,
    policy_article_id INTEGER,
    old_context TEXT,
    new_context TEXT,
    change_reason TEXT,
    change_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (risk_event_id) REFERENCES policy_risk_event (risk_event_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    FOREIGN KEY (policy_version_id)
        REFERENCES firm_policy_version (policy_version_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (policy_article_id)
        REFERENCES firm_policy_article (policy_article_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_firm_policy_change_record_risk_event_id
    ON firm_policy_change_record (risk_event_id);

CREATE INDEX IF NOT EXISTS idx_firm_policy_change_record_policy_version_id
    ON firm_policy_change_record (policy_version_id);

CREATE INDEX IF NOT EXISTS idx_firm_policy_change_record_policy_article_id
    ON firm_policy_change_record (policy_article_id);
