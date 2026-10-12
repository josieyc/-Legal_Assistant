-- 政策風險事件。保留可為 NULL 的 policy_id；待 firm_policy 建置後再加入外鍵約束。
CREATE TABLE IF NOT EXISTS policy_risk_event (
    risk_event_id INTEGER PRIMARY KEY,
    act_change_event_id INTEGER NOT NULL,
    policy_id INTEGER,
    person_in_charge INTEGER,
    obligation_intensity TEXT,
    deadline TEXT,
    state TEXT NOT NULL,
    reason TEXT,
    suggest_next_step TEXT,
    suggest_due_date TEXT,
    create_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (act_change_event_id)
        REFERENCES act_change_event (act_change_event_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (person_in_charge) REFERENCES user (user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_act_change_event_id
    ON policy_risk_event (act_change_event_id);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_policy_id
    ON policy_risk_event (policy_id);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_person_in_charge
    ON policy_risk_event (person_in_charge);
