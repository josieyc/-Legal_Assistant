"""測試 SQLAlchemy SQLite 連線與 FastAPI dependency 生命週期。"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import text
from sqlalchemy.orm import Session

from Backend.database.connect import (
    create_database_engine,
    create_session_factory,
    get_db_session,
)


class DatabaseConnectionTests(unittest.TestCase):
    """驗證 SQLite session 的查詢設定與資源管理。"""

    def setUp(self) -> None:
        """建立每個測試專用的 SQLite 資料庫。

        輸入契約：
            不接受參數，由 unittest 在每個測試前呼叫。
        函式效果：
            建立暫存目錄、SQLite 檔案、資料表與一筆範例資料。
        輸出結果：
            回傳 None；檔案或資料庫操作失敗時傳遞對應例外。
        """
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temporary_directory.name) / "test.db"
        self.db_path.touch()
        self.engine = create_database_engine(self.db_path)
        with self.engine.begin() as connection:
            connection.execute(text("CREATE TABLE laws (id INTEGER PRIMARY KEY, name TEXT)"))
            connection.execute(text("INSERT INTO laws (name) VALUES ('民法')"))
        self.session_factory = create_session_factory(self.engine)

    def tearDown(self) -> None:
        """釋放 Engine 並移除測試建立的暫存資料。

        輸入契約：
            不接受參數，由 unittest 在每個測試後呼叫。
        函式效果：
            關閉 Engine 連線池，並刪除本測試的暫存目錄。
        輸出結果：
            回傳 None。
        """
        self.engine.dispose()
        self.temporary_directory.cleanup()

    def test_session_reads_sqlite_data(self) -> None:
        """確認 Session 可讀取 SQLite 既有資料。"""
        with self.session_factory() as session:
            law_name = session.execute(text("SELECT name FROM laws")).scalar_one()
        self.assertEqual(law_name, "民法")

    def test_create_database_engine_rejects_missing_database(self) -> None:
        """確認不存在的資料庫路徑不會被默默建立。"""
        missing_path = Path(self.temporary_directory.name) / "missing.db"
        with self.assertRaises(FileNotFoundError):
            create_database_engine(missing_path)
        self.assertFalse(missing_path.exists())

    def test_get_db_session_closes_session(self) -> None:
        """確認 dependency 結束後會關閉 SQLAlchemy Session。"""
        session = self.session_factory()
        with patch("Backend.database.connect.SessionLocal", return_value=session):
            dependency = get_db_session()
            self.assertIs(next(dependency), session)
            with patch.object(session, "close", wraps=session.close) as close:
                dependency.close()
                close.assert_called_once_with()

    def test_get_db_session_rolls_back_on_error(self) -> None:
        """確認 request 發生例外時會回滾未提交交易。"""
        with patch("Backend.database.connect.SessionLocal", self.session_factory):
            dependency = get_db_session()
            session = next(dependency)
            session.execute(text("INSERT INTO laws (name) VALUES ('刑法')"))
            with self.assertRaisesRegex(RuntimeError, "request failed"):
                dependency.throw(RuntimeError("request failed"))

        with self.session_factory() as verification_session:
            count = verification_session.execute(
                text("SELECT COUNT(*) FROM laws WHERE name = '刑法'")
            ).scalar_one()
        self.assertEqual(count, 0)

    def test_session_type_is_sqlalchemy_session(self) -> None:
        """確認 dependency 供應 SQLAlchemy Session 實例。"""
        with patch("Backend.database.connect.SessionLocal", self.session_factory):
            dependency = get_db_session()
            session = next(dependency)
            self.assertIsInstance(session, Session)
            dependency.close()


if __name__ == "__main__":
    unittest.main()
