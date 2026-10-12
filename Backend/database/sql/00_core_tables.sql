CREATE TABLE IF NOT EXISTS act (
    act_id INTEGER PRIMARY KEY,
    act_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS industry (
    industry_id INTEGER PRIMARY KEY,
    industry_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS department (
    department_id INTEGER PRIMARY KEY,
    department_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user (
    user_id INTEGER PRIMARY KEY,
    user_name TEXT NOT NULL,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES department (department_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_department_id
    ON user (department_id);
