"""測試 SQLite 資料庫初始化流程。"""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from Backend.database.init_db import initialize_database


class InitializeDatabaseTests(unittest.TestCase):
    """驗證資料庫會依 SQL 檔完整重建。"""

    def test_existing_database_is_overwritten(self) -> None:
        """確認初始化會移除既有結構與資料，而非更新原資料庫。"""
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            db_path = root / "existing.db"
            sql_dir = root / "sql"
            sql_dir.mkdir()
            (sql_dir / "schema.sql").write_text(
                "CREATE TABLE current_data (id INTEGER PRIMARY KEY, value TEXT);",
                encoding="utf-8",
            )

            with closing(sqlite3.connect(db_path)) as connection:
                with connection:
                    connection.execute("CREATE TABLE legacy_data (value TEXT)")
                    connection.execute("INSERT INTO legacy_data VALUES ('舊資料')")

            applied_files = initialize_database(db_path, sql_dir)

            self.assertEqual(applied_files, [sql_dir.resolve() / "schema.sql"])
            with closing(sqlite3.connect(db_path)) as connection:
                table_names = {
                    row[0]
                    for row in connection.execute(
                        "SELECT name FROM sqlite_master WHERE type = 'table'"
                    )
                }
            self.assertIn("current_data", table_names)
            self.assertNotIn("legacy_data", table_names)


if __name__ == "__main__":
    unittest.main()
