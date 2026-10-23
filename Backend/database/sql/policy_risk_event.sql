-- 法規異動衍生的政策風險事件。
CREATE TABLE IF NOT EXISTS policy_risk_event (
    risk_event_id INTEGER PRIMARY KEY,
    act_change_event_id INTEGER NOT NULL,
    policy_id INTEGER,
    policy_article_id INTEGER,
    department_id INTEGER,
    obligation_intensity TEXT,
    deadline TEXT,
    topic TEXT,
    state TEXT NOT NULL CHECK (
        state IN (
            'Pending',
            'InReview',
            'Reviewed',
            'ReanalysisRequired',
            'Closed'
        )
    ),
    reason TEXT,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 0 AND 100),
    suggest_next_step TEXT,
    suggest_due_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (act_change_event_id)
        REFERENCES act_change_event (act_change_event_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (policy_id) REFERENCES firm_policy (policy_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    FOREIGN KEY (policy_article_id)
        REFERENCES firm_policy_article (policy_article_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES department (department_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_act_change_event_id
    ON policy_risk_event (act_change_event_id);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_policy_id
    ON policy_risk_event (policy_id);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_policy_article_id
    ON policy_risk_event (policy_article_id);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_department_id
    ON policy_risk_event (department_id);
