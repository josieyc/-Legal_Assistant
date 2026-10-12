"""測試法規沿革差異 controller。"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from Backend.controllers.act_change_controller import trigger_act_change_events
from Backend.models import Act, ActChangeEvent, Base


def _write_law_xml(path: Path, history: str, version_id: str, articles: dict[int, str]) -> None:
    """建立測試用法規 XML。

    輸入契約：
        path 位於可寫入目錄；history、version_id 與 articles 為有效測試資料。
    函式效果：
        覆寫 path 指定檔案。
    輸出結果：
        成功時回傳 None；檔案寫入失敗時拋出 OSError。
    """
    article_xml = "".join(
        f"<條文><條號>第 {number} 條</條號><條文內容>{content}</條文內容></條文>"
        for number, content in articles.items()
    )
    path.write_text(
        "<LAWS><法規><法規名稱>測試法</法規名稱>"
        f"<最新異動日期>{version_id}</最新異動日期>"
        f"<沿革內容>{history}</沿革內容><法規內容>{article_xml}</法規內容>"
        "</法規></LAWS>",
        encoding="utf-8",
    )


class ActChangeControllerTests(unittest.TestCase):
    """驗證沿革觸發條件、事件內容與重複執行行為。"""

    def setUp(self) -> None:
        """建立隔離的記憶體資料庫與暫存 XML 目錄。"""
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_path = Path(self.temp_dir.name) / "previous.xml"
        self.current_path = Path(self.temp_dir.name) / "current.xml"

    def tearDown(self) -> None:
        """釋放資料庫與暫存目錄。"""
        self.engine.dispose()
        self.temp_dir.cleanup()

    def test_changed_history_creates_article_events_once(self) -> None:
        """沿革改變時保存修正及刪除事件，重跑不重複新增。"""
        _write_law_xml(self.previous_path, "舊沿革", "20260601", {3: "舊內容", 7: "內容"})
        _write_law_xml(self.current_path, "新沿革", "20261012", {3: "新內容", 7: "（刪除）"})

        with Session(self.engine) as session:
            first = trigger_act_change_events(session, self.previous_path, self.current_path)
            second = trigger_act_change_events(session, self.previous_path, self.current_path)
            events = session.scalars(select(ActChangeEvent).order_by(ActChangeEvent.article)).all()
            act = session.scalar(select(Act))

        self.assertEqual(2, first["created_event_count"])
        self.assertEqual(0, second["created_event_count"])
        self.assertEqual("測試法", act.act_name)
        self.assertEqual([(3, "修正"), (7, "刪除")], [(event.article, event.change_type) for event in events])
        self.assertTrue(all(event.event_date == "2026-10-12" for event in events))

    def test_unchanged_history_does_not_create_event(self) -> None:
        """沿革內容未變時即使條文不同也不建立事件。"""
        _write_law_xml(self.previous_path, "相同沿革", "20260601", {3: "舊內容"})
        _write_law_xml(self.current_path, "相同沿革", "20261012", {3: "新內容"})

        with Session(self.engine) as session:
            result = trigger_act_change_events(session, self.previous_path, self.current_path)
            events = session.scalars(select(ActChangeEvent)).all()

        self.assertEqual(0, result["changed_law_count"])
        self.assertEqual([], events)


if __name__ == "__main__":
    unittest.main()
