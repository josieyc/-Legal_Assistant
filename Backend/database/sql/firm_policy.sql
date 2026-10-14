-- 公司內規主檔。
CREATE TABLE IF NOT EXISTS firm_policy (
    policy_id INTEGER PRIMARY KEY,
    policy_name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 公司內規條文。
CREATE TABLE IF NOT EXISTS firm_policy_article (
    policy_article_id INTEGER PRIMARY KEY,
    policy_id INTEGER NOT NULL,
    article INTEGER,
    paragraph INTEGER,
    subparagraph INTEGER,
    item INTEGER,
    context TEXT NOT NULL,
    embedding BLOB,
    FOREIGN KEY (policy_id) REFERENCES firm_policy (policy_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_firm_policy_article_policy_id
    ON firm_policy_article (policy_id);

-- 公司內規修改紀錄。
CREATE TABLE IF NOT EXISTS firm_policy_change_record (
    policy_change_id INTEGER PRIMARY KEY,
    risk_event_id INTEGER,
    policy_id INTEGER NOT NULL,
    policy_article_id INTEGER,
    old_context TEXT,
    new_context TEXT,
    change_reason TEXT,
    change_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (risk_event_id) REFERENCES policy_risk_event (risk_event_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    FOREIGN KEY (policy_id) REFERENCES firm_policy (policy_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (policy_article_id)
        REFERENCES firm_policy_article (policy_article_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_firm_policy_change_record_risk_event_id
    ON firm_policy_change_record (risk_event_id);

CREATE INDEX IF NOT EXISTS idx_firm_policy_change_record_policy_id
    ON firm_policy_change_record (policy_id);

CREATE INDEX IF NOT EXISTS idx_firm_policy_change_record_policy_article_id
    ON firm_policy_change_record (policy_article_id);
