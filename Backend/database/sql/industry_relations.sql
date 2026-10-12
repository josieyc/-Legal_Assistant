-- 法規與產業的多對多關聯。
CREATE TABLE IF NOT EXISTS act_industry (
    act_id INTEGER NOT NULL,
    industry_id INTEGER NOT NULL,
    PRIMARY KEY (act_id, industry_id),
    FOREIGN KEY (act_id) REFERENCES act (act_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (industry_id) REFERENCES industry (industry_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- 使用者與產業的多對多關聯。
CREATE TABLE IF NOT EXISTS user_industry (
    industry_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (industry_id, user_id),
    FOREIGN KEY (industry_id) REFERENCES industry (industry_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user (user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_act_industry_industry_id
    ON act_industry (industry_id);

CREATE INDEX IF NOT EXISTS idx_user_industry_user_id
    ON user_industry (user_id);
