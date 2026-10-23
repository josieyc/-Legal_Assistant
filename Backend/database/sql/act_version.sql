-- 外部法規 XML 與版本識別碼的匯入追蹤資料。
CREATE TABLE IF NOT EXISTS act_version (
    version_id TEXT PRIMARY KEY,
    source_xml TEXT NOT NULL
);
