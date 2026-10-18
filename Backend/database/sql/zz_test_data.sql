-- 測試情境來源：Backend/legal_data/測試資料*.xml
-- 測試 ID 統一使用 9000 號段，避免與一般匯入資料衝突。

-- user_industry 外鍵所需的產業主檔。
-- 產業別取自公司內規測試資料涵蓋的銀行、保險及證券業務。
INSERT OR IGNORE INTO industry (industry_id, industry_name) VALUES
    (9001, '銀行業'),
    (9002, '保險業'),
    (9003, '證券業');

-- 前端 demo 與公司內規測試資料所使用的權責部門。
INSERT OR IGNORE INTO department (department_id, department_name) VALUES
    (9001, '法遵部'),
    (9002, '營運部'),
    (9003, '資訊部'),
    (9004, '風控部'),
    (9005, '客服部'),
    (9006, '授信部');

INSERT OR IGNORE INTO user (user_id, user_name, department_id) VALUES
    (9001, '法遵測試人員', 9001),
    (9002, '營運測試人員', 9002),
    (9003, '資訊測試人員', 9003),
    (9004, '風控測試人員', 9004),
    (9005, '客服測試人員', 9005),
    (9006, '授信測試人員', 9006);

-- 法遵、資訊與風控涵蓋全部業別，其餘使用者以銀行業作為 demo 的主要產業。
INSERT OR IGNORE INTO user_industry (industry_id, user_id) VALUES
    (9001, 9001),
    (9002, 9001),
    (9003, 9001),
    (9001, 9002),
    (9001, 9003),
    (9002, 9003),
    (9003, 9003),
    (9001, 9004),
    (9002, 9004),
    (9003, 9004),
    (9001, 9005),
    (9001, 9006);