-- 政策風險事件的狀態與操作歷程。
CREATE TABLE IF NOT EXISTS policy_risk_event_log (
    risk_event_log_id INTEGER PRIMARY KEY,
    risk_event_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    actor_id INTEGER,
    from_state TEXT CHECK (
        from_state IN (
            'Pending',
            'InReview',
            'Reviewed',
            'ReanalysisRequired',
            'Closed'
        )
    ),
    to_state TEXT CHECK (
        to_state IN (
            'Pending',
            'InReview',
            'Reviewed',
            'ReanalysisRequired',
            'Closed'
        )
    ),
    detail TEXT,
    changes TEXT,
    create_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (risk_event_id)
        REFERENCES policy_risk_event (risk_event_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES user (user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_log_risk_event_id
    ON policy_risk_event_log (risk_event_id);

CREATE INDEX IF NOT EXISTS idx_policy_risk_event_log_actor_id
    ON policy_risk_event_log (actor_id);
