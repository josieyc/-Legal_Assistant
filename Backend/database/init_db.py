"""Initialize the application's SQLite database from SQL files.

By default, every ``*.sql`` file in ``database/sql`` is executed in
lexicographical order and the database is created at
``database/data/legal_assistant.db``.
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Sequence


DATABASE_DIR = Path(__file__).resolve().parent
DEFAULT_SQL_DIR = DATABASE_DIR / "sql"
DEFAULT_DB_PATH = DATABASE_DIR / "data" / "legal_assistant.db"


def initialize_database(
    db_path: Path = DEFAULT_DB_PATH,
    sql_dir: Path = DEFAULT_SQL_DIR,
) -> list[Path]:
    """初始化 SQLite 資料庫。

    輸入契約：
        db_path 必須是欲建立或更新的 SQLite 檔案路徑。
        sql_dir 必須是存在的目錄，且至少包含一個副檔名為 .sql 的檔案。
    函式效果：
        建立資料庫的父目錄，並依檔名排序執行 sql_dir 內的 SQL 檔案。
        所有 SQL 會在同一個交易中執行；任一檔案失敗時會回滾全部變更。
    輸出結果：
        回傳依實際執行順序排列的 SQL 檔案 Path 清單。
        路徑或 SQL 不合法時會拋出 FileNotFoundError 或 RuntimeError。
    """
    db_path = Path(db_path).resolve()
    sql_dir = Path(sql_dir).resolve()

    if not sql_dir.is_dir():
        raise FileNotFoundError(f"SQL directory does not exist: {sql_dir}")

    sql_files = sorted(sql_dir.glob("*.sql"), key=lambda path: path.name)
    if not sql_files:
        raise FileNotFoundError(f"No .sql files found in: {sql_dir}")

    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)

    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("BEGIN IMMEDIATE")

        for sql_file in sql_files:
            try:
                sql = sql_file.read_text(encoding="utf-8-sig")
                # sqlite3.executescript commits pending transactions, so run
                # complete statements individually to preserve atomicity.
                _execute_sql(connection, sql)
            except (OSError, sqlite3.Error) as exc:
                raise RuntimeError(
                    f"Failed to apply SQL file '{sql_file.name}': {exc}"
                ) from exc

        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    return sql_files


def _execute_sql(connection: sqlite3.Connection, sql: str) -> None:
    """執行一段包含一個或多個陳述式的 SQLite SQL 文字。

    輸入契約：
        connection 必須是已開啟且可寫入的 sqlite3.Connection。
        sql 必須是 SQLite 可解析的 SQL 字串，可包含多個陳述式。
    函式效果：
        逐一解析並透過既有 connection 執行完整的 SQL 陳述式；不自行提交交易。
    輸出結果：
        成功時回傳 None；SQL 不合法或執行失敗時拋出 sqlite3.Error。
    """
    statement = ""
    for character in sql:
        statement += character
        if character == ";" and sqlite3.complete_statement(statement):
            if statement.strip():
                connection.execute(statement)
            statement = ""

    if statement.strip():
        # SQLite accepts a final statement without a trailing semicolon (and
        # comment-only remainders are harmless).
        connection.execute(statement)


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    """解析命令列參數。

    輸入契約：
        argv 可為命令列參數字串序列；傳入 None 時讀取目前程序的命令列參數。
    函式效果：
        解析 --db 與 --sql-dir，並在未提供時套用預設路徑。
    輸出結果：
        回傳包含 db 與 sql_dir 屬性的 argparse.Namespace。
        參數格式錯誤時 argparse 會顯示錯誤訊息並結束程序。
    """
    parser = argparse.ArgumentParser(
        description="Initialize SQLite from database/sql/*.sql files."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite file path (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--sql-dir",
        type=Path,
        default=DEFAULT_SQL_DIR,
        help=f"Directory containing .sql files (default: {DEFAULT_SQL_DIR})",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    """執行資料庫初始化命令列流程。

    輸入契約：
        argv 可為命令列參數字串序列；傳入 None 時讀取目前程序的命令列參數。
    函式效果：
        解析參數、初始化 SQLite 資料庫，並將成功結果或錯誤訊息輸出至終端機。
    輸出結果：
        初始化成功時回傳 0；可預期的檔案或資料庫錯誤發生時回傳 1。
    """
    args = _parse_args(argv)
    try:
        applied_files = initialize_database(args.db, args.sql_dir)
    except (FileNotFoundError, RuntimeError, sqlite3.Error) as exc:
        print(f"Database initialization failed: {exc}")
        return 1

    print(f"Database initialized: {args.db.resolve()}")
    for sql_file in applied_files:
        print(f"  applied: {sql_file.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
