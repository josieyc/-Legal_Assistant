"""測試 ORM 模型與 SQL schema 的關鍵契約。"""

from __future__ import annotations

import unittest

from sqlalchemy import LargeBinary, Text, create_engine, inspect
from sqlalchemy.orm import Session

from Backend.models import (
    Act,
    ActChangeEvent,
    ActIndustry,
    Base,
    Department,
    FirmPolicy,
    FirmPolicyArticle,
    FirmPolicyChangeRecord,
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
        """確認 ORM metadata 包含 SQL schema 定義的十一張表。"""
        expected_tables = {
            "act",
            "act_change_event",
            "act_industry",
            "department",
            "firm_policy",
            "firm_policy_article",
            "firm_policy_change_record",
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

    def test_policy_risk_event_foreign_keys_match_sql_schema(self) -> None:
        """確認政策風險事件的可空外鍵與 SQL schema 一致。"""
        expected_targets = {
            "policy_id": "firm_policy.policy_id",
            "policy_article_id": "firm_policy_article.policy_article_id",
            "department_id": "department.department_id",
        }
        for column_name, expected_target in expected_targets.items():
            column = PolicyRiskEvent.__table__.c[column_name]
            self.assertTrue(column.nullable)
            self.assertEqual(
                {expected_target},
                {foreign_key.target_fullname for foreign_key in column.foreign_keys},
            )

    def test_policy_article_embedding_uses_blob_column(self) -> None:
        """確認條文向量欄位與 SQL schema 同為可空 BLOB。"""
        embedding = FirmPolicyArticle.__table__.c.embedding
        self.assertIsInstance(embedding.type, LargeBinary)
        self.assertTrue(embedding.nullable)

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
        policy = FirmPolicy(policy_id=1, policy_name="洗錢防制政策")
        policy_article = FirmPolicyArticle(
            policy_article_id=1,
            policy=policy,
            article=1,
            context="應執行客戶身分確認。",
            embedding=b"vector",
        )
        risk_event = PolicyRiskEvent(
            risk_event_id=1,
            policy=policy,
            policy_article=policy_article,
            department=department,
            topic="客戶身分確認",
            state="pending",
        )
        risk_event.policy_change_records.append(
            FirmPolicyChangeRecord(
                policy_change_id=1,
                policy=policy,
                policy_article=policy_article,
                old_context="舊條文",
                new_context="新條文",
            )
        )
        change_event.risk_events.append(risk_event)

        with Session(self.engine) as session:
            session.add(change_event)
            session.commit()
            stored = session.get(PolicyRiskEvent, 1)
            self.assertIsNotNone(stored)
            self.assertEqual("法遵部", stored.department.department_name)
            self.assertEqual("洗錢防制政策", stored.policy.policy_name)
            self.assertEqual("應執行客戶身分確認。", stored.policy_article.context)
            self.assertEqual("新條文", stored.policy_change_records[0].new_context)


if __name__ == "__main__":
    unittest.main()
