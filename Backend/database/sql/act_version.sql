-- 全域唯一的版本識別碼與 legal_data 來源 XML 對照。
CREATE TABLE IF NOT EXISTS act_version (
    version_id TEXT PRIMARY KEY,
    source_xml TEXT NOT NULL
);
