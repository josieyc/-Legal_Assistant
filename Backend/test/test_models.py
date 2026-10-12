"""測試 ORM 模型與 SQL schema 的關鍵契約。"""

from __future__ import annotations

import unittest

from sqlalchemy import Text, create_engine, inspect
from sqlalchemy.orm import Session

from Backend.models import (
    Act,
    ActChangeEvent,
    ActIndustry,
    Base,
    Department,
    Industry,
    PolicyRiskEvent,
    User,
    UserIndustry,
)


class ModelMappingTests(unittest.TestCase):
    """驗證資料表結構與主要 ORM 關聯。"""

    def setUp(self) -> None:
        """建立啟用外鍵約束的記憶體 SQLite 資料庫。"""
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)

    def tearDown(self) -> None:
        """釋放測試使用的 SQLAlchemy Engine。"""
        self.engine.dispose()

    def test_metadata_contains_every_requested_table(self) -> None:
        """確認 ORM metadata 包含 ER 圖中目前已建置的八張表。"""
        expected_tables = {
            "act",
            "act_change_event",
            "act_industry",
            "department",
            "industry",
            "policy_risk_event",
            "user",
            "user_industry",
        }
        self.assertEqual(expected_tables, set(inspect(self.engine).get_table_names()))

    def test_association_models_use_composite_primary_keys(self) -> None:
        """確認兩個多對多關聯模型皆使用 ER 圖指定的複合主鍵。"""
        self.assertEqual(
            {"act_id", "industry_id"},
            {column.name for column in inspect(ActIndustry).primary_key},
        )
        self.assertEqual(
            {"industry_id", "user_id"},
            {column.name for column in inspect(UserIndustry).primary_key},
        )

    def test_policy_id_is_nullable_without_foreign_key(self) -> None:
        """確認 firm_policy 建置前 policy_id 可為 NULL 且不宣告外鍵。"""
        policy_id = PolicyRiskEvent.__table__.c.policy_id
        self.assertTrue(policy_id.nullable)
        self.assertEqual([], list(policy_id.foreign_keys))

    def test_version_ids_use_nullable_text_columns(self) -> None:
        """確認版本識別碼與更新後的 SQL schema 同為可空文字欄位。"""
        for column_name in ("last_version_id", "new_version_id"):
            column = ActChangeEvent.__table__.c[column_name]
            self.assertIsInstance(column.type, Text)
            self.assertTrue(column.nullable)

    def test_relationships_persist_complete_graph(self) -> None:
        """確認核心、關聯及事件模型可透過 relationship 一次保存。"""
        department = Department(department_id=1, department_name="法遵部")
        user = User(user_id=1, user_name="王小明", department=department)
        industry = Industry(industry_id=1, industry_name="金融業")
        act = Act(act_id=1, act_name="測試法")
        act.industry_links.append(ActIndustry(industry=industry))
        user.industry_links.append(UserIndustry(industry=industry))
        change_event = ActChangeEvent(
            act_change_event_id=1,
            act=act,
            change_type="修正",
            event_date="2026-10-12",
        )
        change_event.risk_events.append(
            PolicyRiskEvent(
                risk_event_id=1,
                policy_id=None,
                person_in_charge_user=user,
                state="pending",
            )
        )

        with Session(self.engine) as session:
            session.add(change_event)
            session.commit()
            stored = session.get(PolicyRiskEvent, 1)
            self.assertIsNotNone(stored)
            self.assertEqual("王小明", stored.person_in_charge_user.user_name)
            self.assertIsNone(stored.policy_id)


if __name__ == "__main__":
    unittest.main()
