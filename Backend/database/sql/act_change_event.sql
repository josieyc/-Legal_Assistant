-- 法規異動事件；日期時間欄位以 ISO 8601 文字格式儲存。
CREATE TABLE IF NOT EXISTS act_change_event (
    act_change_event_id INTEGER PRIMARY KEY,
    act_id INTEGER NOT NULL,
    article INTEGER,
    paragraph INTEGER,
    subparagraph INTEGER,
    item INTEGER,
    penalty TEXT,
    change_type TEXT NOT NULL,
    last_version_id TEXT,
    new_version_id TEXT,
    event_date TEXT NOT NULL,
    FOREIGN KEY (act_id) REFERENCES act (act_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_act_change_event_act_id
    ON act_change_event (act_id);

CREATE INDEX IF NOT EXISTS idx_act_change_event_event_date
    ON act_change_event (event_date);
