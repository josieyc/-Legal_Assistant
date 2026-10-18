"""測試法規沿革差異 controller。"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from Backend.controllers.act_change_controller import (
    TEST_ACT_INDUSTRIES,
    compare_act_change_event_versions,
    trigger_act_change_events,
)
from Backend.models import Act, ActChangeEvent, ActIndustry, ActVersion, Base, Industry


def _write_law_xml(
    path: Path,
    history: str,
    version_id: str,
    articles: dict[int, str],
    act_name: str = "測試法",
) -> None:
    """建立測試用法規 XML。

    輸入契約：
        path 位於可寫入目錄；history、version_id、articles 與 act_name 為有效測試資料。
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
        f"<LAWS><法規><法規名稱>{act_name}</法規名稱>"
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
            versions = session.scalars(
                select(ActVersion).order_by(ActVersion.version_id)
            ).all()

        self.assertEqual(2, first["created_event_count"])
        self.assertEqual(0, second["created_event_count"])
        self.assertEqual("測試法", act.act_name)
        self.assertEqual([(3, "修正"), (7, "刪除")], [(event.article, event.change_type) for event in events])
        self.assertTrue(all(event.event_date == "2026-10-12" for event in events))
        self.assertEqual(
            [
                ("20260601", "previous.xml"),
                ("20261012", "current.xml"),
            ],
            [(version.version_id, version.source_xml) for version in versions],
        )
        self.assertEqual(2, first["created_version_count"])
        self.assertEqual(0, second["created_version_count"])

    def test_compare_versions_returns_events_without_database(self) -> None:
        """獨立版本 API 流程回傳新舊條文與來源資訊。"""
        _write_law_xml(self.previous_path, "舊沿革", "20260601", {3: "舊內容"})
        _write_law_xml(self.current_path, "新沿革", "20261012", {3: "新內容"})

        result = compare_act_change_event_versions(
            self.previous_path,
            self.current_path,
        )

        self.assertEqual("previous.xml", result["previous_source"])
        self.assertEqual("current.xml", result["current_source"])
        self.assertEqual(1, result["changed_law_count"])
        self.assertEqual(1, result["detected_event_count"])
        self.assertEqual(
            {
                "act_name": "測試法",
                "article": 3,
                "change_type": "修正",
                "last_version": {"version_id": "20260601", "content": "舊內容"},
                "new_version": {"version_id": "20261012", "content": "新內容"},
            },
            result["events"][0],
        )

    def test_unchanged_history_does_not_create_event(self) -> None:
        """沿革內容未變時即使條文不同也不建立事件。"""
        _write_law_xml(self.previous_path, "相同沿革", "20260601", {3: "舊內容"})
        _write_law_xml(self.current_path, "相同沿革", "20261012", {3: "新內容"})

        with Session(self.engine) as session:
            result = trigger_act_change_events(session, self.previous_path, self.current_path)
            events = session.scalars(select(ActChangeEvent)).all()

        self.assertEqual(0, result["changed_law_count"])
        self.assertEqual([], events)

    def test_changed_law_creates_multiple_industry_relations_once(self) -> None:
        """固定對照含多個產業時建立複數關聯，重跑不重複新增。"""
        _write_law_xml(self.previous_path, "舊沿革", "20260601", {1: "舊內容"})
        _write_law_xml(self.current_path, "新沿革", "20261012", {1: "新內容"})

        with patch.dict(
            TEST_ACT_INDUSTRIES,
            {"測試法": ("銀行業", "證券業")},
            clear=False,
        ):
            with Session(self.engine) as session:
                first = trigger_act_change_events(
                    session, self.previous_path, self.current_path
                )
                second = trigger_act_change_events(
                    session, self.previous_path, self.current_path
                )
                relations = session.execute(
                    select(Act.act_name, Industry.industry_name)
                    .join(ActIndustry, ActIndustry.act_id == Act.act_id)
                    .join(Industry, Industry.industry_id == ActIndustry.industry_id)
                    .order_by(Industry.industry_name)
                ).all()

        self.assertEqual(2, first["created_industry_relation_count"])
        self.assertEqual(0, second["created_industry_relation_count"])
        self.assertEqual(
            [("測試法", "證券業"), ("測試法", "銀行業")],
            relations,
        )


if __name__ == "__main__":
    unittest.main()
